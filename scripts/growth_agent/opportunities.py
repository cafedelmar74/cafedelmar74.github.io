"""Opportunity candidate detection: course-level, lead_intent, GSC CTR.

Detectors build Opportunity objects with evidence, sample_size, raw_score,
and scope fully populated, but leave confidence_tier / confidence_multiplier
/ final_score / recommendation / rationale as placeholders - scoring.score()
fills those in afterwards.

Two aggregation rules matter here, both deliberate corrections to an
earlier draft of this module:

1. concentration_ratio (true share of activity in the single busiest
   session/day) is NEVER inferred here - the approved input contract has
   no day-level field to compute it from truthfully, so it is always set
   to None by these detectors. A separate, explicitly-named
   repetition_ratio (event_count vs. a conservative user estimate) is
   computed instead, purely as a diagnostic/evidence metric. It is NEVER
   passed to the confidence governor as concentration_ratio and never
   triggers suspected_test_activity suppression.

2. When a course or lead_intent has commercial events from more than one
   GA4 event type (e.g. both booking_submitted and brochure_download),
   the per-event "users" totals are NOT summed across event types - the
   same person can appear in both rows, and GA4 does not offer a
   cross-event dedup at this query shape. Summing would let cross-event
   overlap manufacture a higher apparent unique-user count than really
   exists, directly overstating confidence. Instead the conservative
   rule used here is MAX across contributing rows - a lower bound on
   true unique users that can only ever understate, never overstate,
   confidence.
"""

from . import config
from . import cutover_registry as cutover_mod
from .schema import Opportunity, Scope, PrimaryMetric, Evidence, SampleSize, CutoverMatch

_PENDING_TIER = "pending"
_PENDING_MULTIPLIER = 0.0
_PENDING_SCORE = 0.0

_INTENT_OPPORTUNITY_TYPES = {
    "corporate_training": "corporate_intent_signal",
    "team_training": "team_intent_signal",
}


def _repetition_ratio(users, event_count):
    """Diagnostic-only proxy: how much event volume exceeds a
    conservative user estimate. This is NOT concentration_ratio and must
    never be used as a substitute for it - it measures repeats-per-user,
    not same-session/same-day clustering. Never consulted by confidence
    or suppression logic; exposed only as an Evidence entry for human
    review.
    """
    if event_count <= 0:
        return None
    return max(0.0, 1.0 - (users / event_count))


def _raw_score_from_event_count(event_count):
    if event_count >= 5:
        return 2
    if event_count >= 2:
        return 1
    return 0


def _new_bucket(course_name=None):
    return {
        "course_name": course_name,
        "event_count": 0,
        "key_events": 0,
        "sessions": 0,
        "users": 0,       # conservative MAX across contributing rows, not a sum
        "event_names": set(),
    }


def _accumulate(bucket, row):
    bucket["event_count"] += row.event_count
    bucket["key_events"] += row.key_events
    bucket["sessions"] += row.sessions
    bucket["users"] = max(bucket["users"], row.users)
    bucket["event_names"].add(row.event_name)


def detect_course_opportunities(events_by_course, period_start, period_end):
    grouped = {}
    for row in events_by_course:
        if row.course_id is None or row.period != "current":
            continue
        bucket = grouped.setdefault(row.course_id, _new_bucket(row.course_name))
        _accumulate(bucket, row)

    results = []
    for course_id, agg in grouped.items():
        if agg["event_count"] <= 0:
            continue

        cutover = CutoverMatch(affected=False, cutover_id=None)
        for event_name in agg["event_names"]:
            match = cutover_mod.is_cutover_affected(event_name, "course_id", period_start, period_end)
            if match.affected:
                cutover = match
                break

        results.append(Opportunity(
            opportunity_id="course_momentum:" + course_id,
            opportunity_type="course_momentum",
            scope=Scope(type="course", key=course_id, label=agg["course_name"] or course_id),
            raw_score=_raw_score_from_event_count(agg["event_count"]),
            confidence_tier=_PENDING_TIER,
            confidence_multiplier=_PENDING_MULTIPLIER,
            final_score=_PENDING_SCORE,
            primary_metric=PrimaryMetric(name="commercial_event_count", current_value=agg["event_count"]),
            evidence=[
                Evidence(metric="commercial_event_count", value=agg["event_count"], period="current", source="GA4"),
                Evidence(metric="commercial_key_events", value=agg["key_events"], period="current", source="GA4"),
                Evidence(metric="commercial_sessions", value=agg["sessions"], period="current", source="GA4"),
                Evidence(metric="commercial_users_conservative_max", value=agg["users"], period="current", source="GA4"),
                Evidence(metric="repetition_ratio", value=_repetition_ratio(agg["users"], agg["event_count"]) or 0.0, period="current", source="GA4"),
            ],
            sample_size=SampleSize(
                unique_users=agg["users"],
                distinct_sessions=agg["sessions"],
                concentration_ratio=None,
                repetition_ratio=_repetition_ratio(agg["users"], agg["event_count"]),
            ),
            cutover_affected=cutover,
            business_context_required=True,
            business_context_note="Verify upcoming session availability before promoting this course.",
            recommendation="",
            rationale="",
            course_id=course_id,
            course_name=agg["course_name"],
        ))
    return results


def detect_lead_intent_opportunities(events_by_intent, period_start, period_end):
    grouped = {}
    for row in events_by_intent:
        if row.period != "current":
            continue
        if row.lead_intent not in _INTENT_OPPORTUNITY_TYPES:
            continue
        bucket = grouped.setdefault(row.lead_intent, _new_bucket())
        _accumulate(bucket, row)

    results = []
    for intent, agg in grouped.items():
        if agg["event_count"] <= 0:
            continue

        cutover = CutoverMatch(affected=False, cutover_id=None)
        for event_name in agg["event_names"]:
            match = cutover_mod.is_cutover_affected(event_name, "lead_intent", period_start, period_end)
            if match.affected:
                cutover = match
                break

        results.append(Opportunity(
            opportunity_id="lead_intent:" + intent,
            opportunity_type=_INTENT_OPPORTUNITY_TYPES[intent],
            scope=Scope(type="lead_intent", key=intent, label=intent.replace("_", " ").title()),
            raw_score=_raw_score_from_event_count(agg["event_count"]),
            confidence_tier=_PENDING_TIER,
            confidence_multiplier=_PENDING_MULTIPLIER,
            final_score=_PENDING_SCORE,
            primary_metric=PrimaryMetric(name="event_count", current_value=agg["event_count"]),
            evidence=[
                Evidence(metric="event_count", value=agg["event_count"], period="current", source="GA4"),
                Evidence(metric="key_events", value=agg["key_events"], period="current", source="GA4"),
                Evidence(metric="sessions", value=agg["sessions"], period="current", source="GA4"),
                Evidence(metric="users_conservative_max", value=agg["users"], period="current", source="GA4"),
                Evidence(metric="repetition_ratio", value=_repetition_ratio(agg["users"], agg["event_count"]) or 0.0, period="current", source="GA4"),
            ],
            sample_size=SampleSize(
                unique_users=agg["users"],
                distinct_sessions=agg["sessions"],
                concentration_ratio=None,
                repetition_ratio=_repetition_ratio(agg["users"], agg["event_count"]),
            ),
            cutover_affected=cutover,
            business_context_required=False,
            business_context_note=None,
            recommendation="",
            rationale="",
        ))
    return results


def detect_gsc_ctr_opportunities(gsc_queries):
    max_ctr = config.GSC_CTR_UNDERPERFORMANCE_MAX_CTR
    directional_floor = config.GSC_CONFIDENCE_THRESHOLDS["directional"]["min_impressions"]

    results = []
    for row in gsc_queries:
        if row.period != "current":
            continue
        if row.ctr > max_ctr:
            continue

        raw_score = 2 if row.impressions >= 1000 else (1 if row.impressions >= directional_floor else 0)

        results.append(Opportunity(
            opportunity_id="gsc_ctr:" + row.query,
            opportunity_type="ctr_underperformance",
            scope=Scope(type="gsc_query", key=row.query, label="Search query: " + row.query),
            raw_score=raw_score,
            confidence_tier=_PENDING_TIER,
            confidence_multiplier=_PENDING_MULTIPLIER,
            final_score=_PENDING_SCORE,
            primary_metric=PrimaryMetric(name="ctr", current_value=row.ctr),
            evidence=[
                Evidence(metric="impressions", value=row.impressions, period="current", source="GSC"),
                Evidence(metric="clicks", value=row.clicks, period="current", source="GSC"),
                Evidence(metric="average_position", value=row.average_position, period="current", source="GSC"),
            ],
            sample_size=SampleSize(impressions=row.impressions, clicks=row.clicks),
            cutover_affected=CutoverMatch(affected=False, cutover_id=None),
            business_context_required=False,
            business_context_note=None,
            recommendation="",
            rationale="",
        ))
    return results
