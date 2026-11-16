"""Routes scored opportunity candidates into opportunities, early_signals,
or suppressed_signals, based on confidence tier.

When more than one suppression condition genuinely applies to the same
signal (for example a known tracking cutover AND a supplied high
concentration_ratio), one PRIMARY reason is still chosen for
suppression_reason, but every other applicable condition is preserved in
secondary_reasons rather than silently discarded. Priority order: a
known tracking cutover is considered the primary reason over a
concentration finding, since a cutover explains why the sample cannot be
trusted at all, whereas concentration is a property of the sample itself.
"""

from . import config
from .schema import SuppressedSignal


def _applicable_reasons(opportunity):
    reasons = []

    if opportunity.cutover_affected.affected:
        reasons.append(("known_tracking_cutover", "Cutover: " + str(opportunity.cutover_affected.cutover_id)))

    ceiling = config.GA4_CONFIDENCE_THRESHOLDS["insufficient"]["concentration_ratio_ceiling"]
    ratio = opportunity.sample_size.concentration_ratio
    if ratio is not None and ratio > ceiling:
        reasons.append(("suspected_test_activity", "concentration_ratio=" + str(ratio)))

    if not reasons:
        reasons.append(("insufficient_sample", "Sample size below the confidence floor."))

    return reasons


def route_opportunity(opportunity):
    if opportunity.confidence_tier == "insufficient":
        reasons = _applicable_reasons(opportunity)
        primary_reason, primary_detail = reasons[0]
        secondary_reasons = [reason for reason, _ in reasons[1:]]
        return "suppressed", SuppressedSignal(
            opportunity_id=opportunity.opportunity_id,
            opportunity_type=opportunity.opportunity_type,
            scope=opportunity.scope,
            suppression_reason=primary_reason,
            suppression_detail=primary_detail,
            sample_size=opportunity.sample_size,
            cutover_affected=opportunity.cutover_affected,
            secondary_reasons=secondary_reasons,
            course_id=opportunity.course_id,
            course_name=opportunity.course_name,
        )
    if opportunity.confidence_tier == "early_signal":
        return "early_signal", opportunity
    return "opportunity", opportunity
