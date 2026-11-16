"""Applies confidence classification to opportunity candidates and computes
final_score, recommendation, and rationale.

This is the ONLY place confidence_tier / confidence_multiplier / final_score
/ recommendation / rationale get filled in - detectors in opportunities.py
never do this themselves. Recommendation and rationale text are built
deterministically from the opportunity's own evidence list; nothing here is
free-form. If evidence is empty, recommendation and rationale stay empty -
no recommendation may exist without structured evidence.
"""

from . import confidence as confidence_mod


def _is_gsc_opportunity(opportunity):
    return opportunity.sample_size.impressions is not None


def _evidence_text(opportunity):
    return "; ".join(e.metric + "=" + str(e.value) for e in opportunity.evidence)


def _build_recommendation(opportunity):
    evidence_text = _evidence_text(opportunity)
    if opportunity.opportunity_type == "course_momentum":
        subject = opportunity.course_name or opportunity.course_id
        return "Review " + subject + " for promotion this week (" + evidence_text + ")."
    if opportunity.opportunity_type in ("corporate_intent_signal", "team_intent_signal"):
        return "Follow up on " + opportunity.scope.label + " enquiries this week (" + evidence_text + ")."
    if opportunity.opportunity_type == "ctr_underperformance":
        return "Review search listing presentation for " + opportunity.scope.label + " (" + evidence_text + ")."
    return "Review " + opportunity.scope.label + " (" + evidence_text + ")."


def _build_rationale(opportunity):
    return (
        "Confidence tier " + opportunity.confidence_tier
        + " based on evidence: " + _evidence_text(opportunity) + "."
    )


def score(opportunity):
    if _is_gsc_opportunity(opportunity):
        result = confidence_mod.classify_gsc_confidence(
            opportunity.sample_size.impressions,
            opportunity.sample_size.clicks,
        )
    else:
        result = confidence_mod.classify_ga4_confidence(
            opportunity.sample_size.unique_users or 0,
            opportunity.sample_size.distinct_sessions or 0,
            opportunity.sample_size.concentration_ratio,
            opportunity.cutover_affected,
        )

    opportunity.confidence_tier = result.tier
    opportunity.confidence_multiplier = result.multiplier
    opportunity.final_score = opportunity.raw_score * result.multiplier

    if opportunity.evidence:
        opportunity.recommendation = _build_recommendation(opportunity)
        opportunity.rationale = _build_rationale(opportunity)
    else:
        opportunity.recommendation = ""
        opportunity.rationale = ""

    return opportunity
