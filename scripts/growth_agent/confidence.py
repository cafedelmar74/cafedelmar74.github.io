"""GA4 and GSC confidence classification.

The two models are intentionally kept separate: GA4 confidence is based on
unique_users, distinct_sessions, and concentration_ratio; GSC confidence is
based on impressions and clicks. Neither model consults the other's inputs.

concentration_ratio semantics: it means ONLY the true share of activity in
the single busiest session/day, and is None whenever that value was not
actually supplied. Missing concentration data is treated conservatively -
it caps the achievable tier at "directional" rather than "reliable" - but
it never by itself triggers suppression. Only an ACTUAL supplied ratio
above the ceiling triggers the suspected_test_activity path.
"""

from . import config
from .schema import ConfidenceResult


def classify_ga4_confidence(unique_users, distinct_sessions, concentration_ratio, cutover):
    thresholds = config.GA4_CONFIDENCE_THRESHOLDS

    if cutover.affected:
        return ConfidenceResult(
            tier="insufficient",
            multiplier=config.CONFIDENCE_MULTIPLIERS["insufficient"],
            reason="cutover_affected:" + str(cutover.cutover_id),
        )

    insufficient = thresholds["insufficient"]
    if concentration_ratio is not None and concentration_ratio > insufficient["concentration_ratio_ceiling"]:
        return ConfidenceResult(
            tier="insufficient",
            multiplier=config.CONFIDENCE_MULTIPLIERS["insufficient"],
            reason="high_concentration_ratio",
        )
    if unique_users <= insufficient["max_unique_users"] or distinct_sessions <= insufficient["max_distinct_sessions"]:
        return ConfidenceResult(
            tier="insufficient",
            multiplier=config.CONFIDENCE_MULTIPLIERS["insufficient"],
            reason="low_sample",
        )

    reliable = thresholds["reliable"]
    if unique_users >= reliable["min_unique_users"]:
        if concentration_ratio is None:
            # Conservative: cannot certify the strongest tier without ever
            # having ruled out a concentrated/test-like pattern. This does
            # NOT suppress the signal - it is downgraded to directional,
            # which is still fully eligible for top_actions.
            return ConfidenceResult(
                tier="directional",
                multiplier=config.CONFIDENCE_MULTIPLIERS["directional"],
                reason="reliable_floor_met_but_concentration_unknown",
            )
        return ConfidenceResult(
            tier="reliable",
            multiplier=config.CONFIDENCE_MULTIPLIERS["reliable"],
            reason="sample_meets_reliable_floor",
        )

    directional = thresholds["directional"]
    if unique_users >= directional["min_unique_users"] and distinct_sessions >= directional["min_distinct_sessions"]:
        return ConfidenceResult(
            tier="directional",
            multiplier=config.CONFIDENCE_MULTIPLIERS["directional"],
            reason="sample_meets_directional_floor",
        )

    return ConfidenceResult(
        tier="early_signal",
        multiplier=config.CONFIDENCE_MULTIPLIERS["early_signal"],
        reason="sample_above_insufficient_below_directional",
    )


def classify_gsc_confidence(impressions, clicks):
    thresholds = config.GSC_CONFIDENCE_THRESHOLDS

    insufficient = thresholds["insufficient"]
    if impressions <= insufficient["max_impressions"]:
        return ConfidenceResult(
            tier="insufficient",
            multiplier=config.CONFIDENCE_MULTIPLIERS["insufficient"],
            reason="low_impressions",
        )

    reliable = thresholds["reliable"]
    if impressions >= reliable["min_impressions"]:
        return ConfidenceResult(
            tier="reliable",
            multiplier=config.CONFIDENCE_MULTIPLIERS["reliable"],
            reason="impressions_meet_reliable_floor",
        )

    directional = thresholds["directional"]
    if impressions >= directional["min_impressions"]:
        return ConfidenceResult(
            tier="directional",
            multiplier=config.CONFIDENCE_MULTIPLIERS["directional"],
            reason="impressions_meet_directional_floor",
        )

    return ConfidenceResult(
        tier="early_signal",
        multiplier=config.CONFIDENCE_MULTIPLIERS["early_signal"],
        reason="impressions_above_insufficient_below_directional",
    )
