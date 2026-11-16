"""Attribution-quality adjunct: raw day-level GA4 rows ->
UnattributedClassificationSummary.

This module is a REPORTING/DATA-QUALITY side channel only. Its output
must NEVER be passed to pipeline.run_intelligence_module() and must
NEVER influence opportunity creation, confidence, suppression, scoring,
or top_actions. It has zero dependency on scoring.py, opportunities.py,
confidence.py, suppression.py, or pipeline.py.

Its only dependency on the rest of the package is a single, read-only
lookup into config.CUTOVER_REGISTRY for the course_identity_migration
entry's cutover_date, so the migration boundary date exists in exactly
one place rather than being copied here as a second hardcoded constant.
This does not touch, and must never touch, that entry's date_certainty
- it stays "approximate", exactly as before this module existed.

Input row shape (a raw GA4 run_report() response, same shape as
ga4_adapter.py, deliberately re-implemented locally rather than
imported, to keep this module a fully standalone, single-purpose file):

    dimensions: [date, eventName, customEvent:course_id,
                 customEvent:form_location]
    metrics:    [eventCount]

Only rows whose course_id is missing (None, empty, whitespace-only, or
the literal "(not set)") are classified at all. Rows with a real
course_id are skipped entirely - this adjunct never touches them.
"""

from dataclasses import dataclass, field
from datetime import date

from . import config

_MIGRATION_CUTOVER_ID = "course_identity_migration"
_ROW_SCOPED_EVENTS = ("booking_submitted", "brochure_download")
_EXPECTED_ENQUIRY_FORM_LOCATIONS = ("homepage", "contact_page")


@dataclass
class EventClassificationCounts:
    expected: int = 0
    cutover: int = 0
    unexpected: int = 0


@dataclass
class UnattributedClassificationSummary:
    expected_unattributed_count: int
    cutover_unattributed_count: int
    unexpected_unattributed_count: int
    by_event_name: dict = field(default_factory=dict)


def _extract_rows(raw):
    """Same generic raw-GA4-row extraction as ga4_adapter._extract_rows,
    duplicated intentionally rather than imported, so this module has no
    import-time dependency on ga4_adapter.py at all.
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


def _is_missing_course_id(value):
    if value is None:
        return True
    stripped = value.strip()
    return stripped == "" or stripped == "(not set)"


def _parse_iso_date(value):
    year, month, day = value.split("-")
    return date(int(year), int(month), int(day))


def _parse_ga4_date(value):
    # GA4's "date" dimension is an 8-digit YYYYMMDD string, e.g. "20260822" -
    # a different format from the registry's ISO "YYYY-MM-DD" cutover_date.
    return date(int(value[0:4]), int(value[4:6]), int(value[6:8]))


def migration_boundary_date():
    """Reads the course_identity_migration cutover_date directly from
    config.CUTOVER_REGISTRY - the single source of truth for this date.
    Raises loudly if that entry ever disappears, rather than silently
    falling back to a guessed value.
    """
    for entry in config.CUTOVER_REGISTRY:
        if entry["cutover_id"] == _MIGRATION_CUTOVER_ID:
            return _parse_iso_date(entry["cutover_date"])
    raise ValueError(_MIGRATION_CUTOVER_ID + " entry not found in CUTOVER_REGISTRY")


def _classify_row(event_name, course_id, form_location, date_str, migration_boundary):
    """Returns "expected" | "cutover" | "unexpected", or None if the row
    has a valid course_id and must not be classified at all.
    """
    if not _is_missing_course_id(course_id):
        return None

    if event_name == "calendar_download":
        return "expected"

    if event_name == "enquiry_submitted":
        if form_location in _EXPECTED_ENQUIRY_FORM_LOCATIONS:
            return "expected"
        return "unexpected"

    if event_name in _ROW_SCOPED_EVENTS:
        try:
            event_date = _parse_ga4_date(date_str)
        except (TypeError, ValueError, IndexError):
            return "unexpected"
        if event_date <= migration_boundary:
            return "cutover"
        return "unexpected"

    # Catch-all: any other event name (including one outside the known
    # four) with a missing course_id is unexplained, not silently
    # discarded.
    return "unexpected"


def classify_attribution_quality(raw):
    """The single public entrypoint. Pure and deterministic given the
    same raw rows. Never reads the system clock; the migration boundary
    comes from config.CUTOVER_REGISTRY, not from wall-clock time.
    """
    migration_boundary = migration_boundary_date()
    rows = _extract_rows(raw)

    by_event = {}
    totals = {"expected": 0, "cutover": 0, "unexpected": 0}

    for dims, metrics in rows:
        event_name = dims.get("eventName")
        course_id = dims.get("customEvent:course_id")
        form_location = dims.get("customEvent:form_location")
        date_str = dims.get("date")
        event_count = int(metrics["eventCount"])

        classification = _classify_row(event_name, course_id, form_location, date_str, migration_boundary)
        if classification is None:
            continue

        bucket = by_event.setdefault(event_name, EventClassificationCounts())
        if classification == "expected":
            bucket.expected += event_count
        elif classification == "cutover":
            bucket.cutover += event_count
        else:
            bucket.unexpected += event_count
        totals[classification] += event_count

    return UnattributedClassificationSummary(
        expected_unattributed_count=totals["expected"],
        cutover_unattributed_count=totals["cutover"],
        unexpected_unattributed_count=totals["unexpected"],
        by_event_name=by_event,
    )
