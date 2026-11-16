"""Configuration constants for the Growth Agent intelligence module.

Every threshold in this file is PROVISIONAL. They are starting values
derived from this project's own prior manual investigations (the
booking_submitted test-activity investigation, the course_id/lead_intent
cutover investigations), not from a validated statistical distribution.
They are expected to be recalibrated once several more weeks of clean
post-cutover data exist. Nothing below should be treated as a permanent
business rule.

Per the approved design: GA4 and GSC confidence models are intentionally
separate and must never be merged into one threshold set, since GSC has no
"unique users" concept and GA4 events have no "impressions" concept.
"""

# GA4 confidence thresholds (PROVISIONAL, recalibratable).
# Based on: unique_users, distinct_sessions, concentration_ratio (share of
# occurrences falling inside the single busiest session/day - the same
# signal that flagged the booking_submitted test-activity pattern).
GA4_CONFIDENCE_THRESHOLDS = {
    "insufficient": {
        "max_unique_users": 2,
        "max_distinct_sessions": 1,
        "concentration_ratio_ceiling": 0.7,
    },
    "early_signal": {
        "min_unique_users": 3,
        "max_unique_users": 9,
        "min_distinct_sessions": 2,
    },
    "directional": {
        "min_unique_users": 10,
        "min_distinct_sessions": 5,
    },
    "reliable": {
        "min_unique_users": 30,
    },
}

# GSC confidence thresholds (PROVISIONAL, recalibratable, separate basis).
GSC_CONFIDENCE_THRESHOLDS = {
    "insufficient": {
        "max_impressions": 49,
    },
    "early_signal": {
        "min_impressions": 50,
        "max_impressions": 299,
    },
    "directional": {
        "min_impressions": 300,
    },
    "reliable": {
        "min_impressions": 3000,
    },
}

CONFIDENCE_MULTIPLIERS = {
    "insufficient": 0.0,
    "early_signal": 0.5,
    "directional": 1.0,
    "reliable": 1.0,
}

TOP_ACTIONS_MAX = 5

# A GSC query qualifies for ctr_underperformance consideration if it clears
# the "directional" impressions floor above AND its CTR falls below this
# expectation. Simple, explainable heuristic, not a fitted model.
GSC_CTR_UNDERPERFORMANCE_MAX_CTR = 0.02

# Cutover registry: seeded only with cutovers actually verified during this
# project's own investigations. Do not add speculative entries - an
# "unknown" certainty entry with no date is preferable to a guessed date.
CUTOVER_REGISTRY = [
    {
        "cutover_id": "course_identity_migration",
        "affected_scope": {
            "events": ["booking_submitted", "brochure_download"],
            "dimensions": ["course_id", "course_name"],
        },
        "cutover_date": "2026-08-22",
        "date_certainty": "approximate",
        "date_range": ("2026-08-22", "2026-08-22"),
        "basis": "observed_data_pattern",
        "description": "course_id and course_name enrichment added to booking_submitted and brochure_download; verified via day-by-day eventCount vs course_id breakdown.",
    },
    {
        "cutover_id": "lead_intent_rollout",
        "affected_scope": {
            "events": ["enquiry_submitted"],
            "dimensions": ["lead_intent"],
        },
        "cutover_date": "2026-08-24",
        "date_certainty": "exact",
        "date_range": None,
        "basis": "documented_change",
        "description": "lead_intent field added across all enquiry forms in commit 784968a.",
    },
    {
        "cutover_id": "homepage_enquiry_tracking",
        "affected_scope": {
            "events": ["enquiry_submitted"],
            "dimensions": ["form_location"],
        },
        "cutover_date": "2026-08-24",
        "date_certainty": "exact",
        "date_range": None,
        "basis": "documented_change",
        "description": "Homepage enquiry form had no GA4 tracking at all before this date; commit 784968a added the first tracking call for it.",
    },
    {
        "cutover_id": "key_event_registration_booking_submitted",
        "affected_scope": {
            "events": ["booking_submitted"],
            "dimensions": ["key_events"],
        },
        "cutover_date": "2026-08-03",
        "date_certainty": "approximate",
        "date_range": ("2026-08-01", "2026-08-03"),
        "basis": "observed_data_pattern",
        "description": "booking_submitted marked as a GA4 Key Event; inferred from eventCount versus conversions day-by-day breakdown, not a documented Admin change-log entry.",
    },
    {
        "cutover_id": "key_event_registration_brochure_download",
        "affected_scope": {
            "events": ["brochure_download"],
            "dimensions": ["key_events"],
        },
        "cutover_date": "2026-08-02",
        "date_certainty": "approximate",
        "date_range": ("2026-08-01", "2026-08-02"),
        "basis": "observed_data_pattern",
        "description": "brochure_download marked as a GA4 Key Event; inferred the same way as the booking_submitted entry above.",
    },
    {
        "cutover_id": "key_event_registration_calendar_download",
        "affected_scope": {
            "events": ["calendar_download"],
            "dimensions": ["key_events"],
        },
        "cutover_date": "2026-08-14",
        "date_certainty": "approximate",
        "date_range": ("2026-08-13", "2026-08-14"),
        "basis": "observed_data_pattern",
        "description": "calendar_download marked as a GA4 Key Event; inferred the same way as the booking_submitted entry above.",
    },
    {
        "cutover_id": "key_event_registration_enquiry_submitted",
        "affected_scope": {
            "events": ["enquiry_submitted"],
            "dimensions": ["key_events"],
        },
        "cutover_date": None,
        "date_certainty": "unknown",
        "date_range": ("2026-08-14", "2026-08-23"),
        "basis": "observed_data_pattern",
        "description": "enquiry_submitted marked as a GA4 Key Event sometime in this window; no enquiry_submitted volume existed in the gap to pin an exact day.",
    },
]

# Course alias map: descriptive reconciliation only, NEVER used for scoring.
# Deliberately empty by default. Only add an entry when a course_name
# variant is manually confirmed to refer to the same course_id. This map
# must never be consulted by scoring or opportunity-detection code - only
# by descriptive/reporting helpers.
COURSE_ALIAS_MAP = {}
