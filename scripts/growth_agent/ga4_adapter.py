"""Pure GA4-response -> IntelligenceModuleInput adapter.

This module contains NO scoring, confidence, suppression, opportunity,
or cutover logic, and NEVER reads the system clock. It only reshapes
and type-coerces raw GA4 Data API run_report() responses into the
approved IntelligenceModuleInput contract defined in schema.py.

Explicitly out of scope here (by design, not oversight):
  - summing or otherwise combining totalUsers across rows
  - cross-row deduplication of any kind
  - concentration_ratio / repetition_ratio computation
  - confidence classification
  - unattributed-event classification (a separate, future adjunct)
  - cutover-registry lookups
  - course_id "(not set)" -> None normalisation (pipeline.normalise_input
    already owns that, and duplicating it here would create two sources
    of truth for what counts as unattributed)

Raw response shape assumed (the real shape returned by every GA4
run_report() call used throughout this project):

    {
      "dimension_headers": [{"name": "..."}, ...],
      "metric_headers": [{"name": "...", "type_": "..."}, ...],
      "rows": [
        {"dimension_values": [{"value": "..."}, ...],
         "metric_values": [{"value": "..."}, ...]},
        ...
      ],
      "row_count": N,
      ...
    }
"""

from .schema import (
    ReportMetadata, Totals, CommercialEventRow, CommercialEventByCourseRow,
    CommercialEventByIntentRow, CoursePageViewRow, IntelligenceModuleInput,
)

KNOWN_COMMERCIAL_EVENTS = frozenset([
    "booking_submitted",
    "enquiry_submitted",
    "brochure_download",
    "calendar_download",
])


def _extract_rows(raw):
    """Turns a raw GA4 run_report() response into a list of
    (dimensions_dict, metrics_dict) pairs, keyed by header name. This is
    the one place that understands the raw API shape - every mapper
    below works only with these plain dicts.
    """
    dimension_names = [h["name"] for h in raw.get("dimension_headers", [])]
    metric_names = [h["name"] for h in raw.get("metric_headers", [])]
    pairs = []
    for row in raw.get("rows", []):
        dim_values = row.get("dimension_values", [])
        metric_values = row.get("metric_values", [])
        dims = {name: dim_values[i]["value"] for i, name in enumerate(dimension_names)}
        metrics = {name: metric_values[i]["value"] for i, name in enumerate(metric_names)}
        pairs.append((dims, metrics))
    return pairs


def _coerce_int(value):
    return int(value)


def _coerce_key_events(value):
    # GA4 types "conversions" as a float even when the value is a whole
    # number (e.g. "24.0"). Round, never truncate, per the approved
    # coercion rule.
    return round(float(value))


def _require_known_event(event_name):
    if event_name not in KNOWN_COMMERCIAL_EVENTS:
        raise ValueError("Unknown commercial event name: " + repr(event_name))


def parse_totals(raw):
    """One row (no dimensions) -> Totals. Zero rows -> explicit zeros,
    never an exception."""
    rows = _extract_rows(raw)
    if not rows:
        return Totals(users=0, sessions=0, engaged_sessions=0)
    _dims, metrics = rows[0]
    return Totals(
        users=_coerce_int(metrics["totalUsers"]),
        sessions=_coerce_int(metrics["sessions"]),
        engaged_sessions=_coerce_int(metrics["engagedSessions"]),
    )


def parse_commercial_events(raw, period):
    """dimensions=[eventName], metrics=[eventCount, conversions, sessions,
    totalUsers] -> one CommercialEventRow per known event, always all
    four, synthesizing explicit zero-rows for any event GA4 omitted
    entirely because it had zero occurrences. Raises on any event name
    outside the known set rather than silently including it.
    """
    rows = _extract_rows(raw)
    by_event = {}
    for dims, metrics in rows:
        event_name = dims["eventName"]
        _require_known_event(event_name)
        by_event[event_name] = CommercialEventRow(
            event_name=event_name,
            period=period,
            event_count=_coerce_int(metrics["eventCount"]),
            key_events=_coerce_key_events(metrics["conversions"]),
            sessions=_coerce_int(metrics["sessions"]),
            users=_coerce_int(metrics["totalUsers"]),
        )
    for event_name in KNOWN_COMMERCIAL_EVENTS:
        if event_name not in by_event:
            by_event[event_name] = CommercialEventRow(
                event_name=event_name,
                period=period,
                event_count=0,
                key_events=0,
                sessions=0,
                users=0,
            )
    return [by_event[name] for name in sorted(by_event.keys())]


def parse_commercial_events_by_course(raw):
    """dimensions=[eventName, customEvent:course_id, customEvent:course_name,
    customEvent:course_category], metrics=[eventCount, conversions,
    sessions, totalUsers] -> one CommercialEventByCourseRow per row,
    course_id/course_name/course_category preserved RAW - including the
    literal "(not set)" string. Normalisation to None is
    pipeline.normalise_input's job, not this adapter's.
    """
    rows = _extract_rows(raw)
    result = []
    for dims, metrics in rows:
        event_name = dims["eventName"]
        _require_known_event(event_name)
        result.append(CommercialEventByCourseRow(
            event_name=event_name,
            course_id=dims["customEvent:course_id"],
            course_name=dims["customEvent:course_name"],
            course_category=dims["customEvent:course_category"],
            event_count=_coerce_int(metrics["eventCount"]),
            key_events=_coerce_key_events(metrics["conversions"]),
            sessions=_coerce_int(metrics["sessions"]),
            users=_coerce_int(metrics["totalUsers"]),
            period="current",
        ))
    return result


def parse_lead_intent(raw):
    """dimensions=[customEvent:lead_intent], metrics=[eventCount,
    conversions, sessions, totalUsers] -> one CommercialEventByIntentRow
    per row. event_name is hardcoded to "enquiry_submitted" (guaranteed
    by the query filter, never read from a dimension). lead_intent is
    preserved raw, including "(not set)".
    """
    rows = _extract_rows(raw)
    result = []
    for dims, metrics in rows:
        result.append(CommercialEventByIntentRow(
            event_name="enquiry_submitted",
            lead_intent=dims["customEvent:lead_intent"],
            event_count=_coerce_int(metrics["eventCount"]),
            key_events=_coerce_key_events(metrics["conversions"]),
            sessions=_coerce_int(metrics["sessions"]),
            users=_coerce_int(metrics["totalUsers"]),
            period="current",
        ))
    return result


def parse_course_page_views(raw):
    """dimensions=[customEvent:course_id, customEvent:course_name],
    metrics=[eventCount, sessions, totalUsers] -> one CoursePageViewRow
    per row, course_id/course_name preserved raw.
    """
    rows = _extract_rows(raw)
    result = []
    for dims, metrics in rows:
        result.append(CoursePageViewRow(
            course_id=dims["customEvent:course_id"],
            course_name=dims["customEvent:course_name"],
            event_count=_coerce_int(metrics["eventCount"]),
            sessions=_coerce_int(metrics["sessions"]),
            users=_coerce_int(metrics["totalUsers"]),
            period="current",
        ))
    return result


def build_intelligence_input(
    current_period_start,
    current_period_end,
    previous_period_start,
    previous_period_end,
    totals_current_raw,
    totals_previous_raw,
    commercial_events_current_raw,
    commercial_events_previous_raw,
    commercial_events_by_course_raw,
    lead_intent_raw,
    course_page_views_raw,
    gsc_queries=None,
    property_id="303311854",
    gsc_property="londonpetroacademy.co.uk",
):
    """The single public entrypoint. Pure and deterministic: given the
    same raw GA4 responses and the same explicit period strings, always
    returns the same IntelligenceModuleInput. Never reads the system
    clock - period dates are supplied by the caller.

    gsc_queries: an already-built list[GscQueryRow], or None (default
    empty list). This adapter does not implement Search Console
    retrieval or fabricate GSC data - that is out of scope for this step.
    """
    report_metadata = ReportMetadata(
        current_period_start=current_period_start,
        current_period_end=current_period_end,
        previous_period_start=previous_period_start,
        previous_period_end=previous_period_end,
        property_id=property_id,
        gsc_property=gsc_property,
    )

    totals_current = parse_totals(totals_current_raw)
    totals_previous = parse_totals(totals_previous_raw)

    commercial_events = (
        parse_commercial_events(commercial_events_current_raw, "current")
        + parse_commercial_events(commercial_events_previous_raw, "previous")
    )

    commercial_events_by_course = parse_commercial_events_by_course(commercial_events_by_course_raw)
    commercial_events_by_intent = parse_lead_intent(lead_intent_raw)
    course_page_views_by_course = parse_course_page_views(course_page_views_raw)

    return IntelligenceModuleInput(
        report_metadata=report_metadata,
        totals_current=totals_current,
        totals_previous=totals_previous,
        commercial_events=commercial_events,
        commercial_events_by_course=commercial_events_by_course,
        commercial_events_by_intent=commercial_events_by_intent,
        course_page_views_by_course=course_page_views_by_course,
        gsc_queries=gsc_queries if gsc_queries is not None else [],
    )
