"""Deterministic selection of the top actions for this week's report.

Only DIRECTIONAL or RELIABLE confidence opportunities with non-empty
evidence, a non-empty recommendation, and a positive final_score are
eligible. Ranked by final_score descending. Never pads the list to reach a
minimum count - a run with two eligible opportunities returns two actions,
not three.
"""

from . import config
from .schema import TopAction

ELIGIBLE_TIERS = ("directional", "reliable")


def select_top_actions(opportunities):
    eligible = [
        o for o in opportunities
        if o.confidence_tier in ELIGIBLE_TIERS
        and o.evidence
        and o.final_score > 0
        and o.recommendation
    ]
    eligible.sort(key=lambda o: o.final_score, reverse=True)
    selected = eligible[:config.TOP_ACTIONS_MAX]

    actions = []
    for index, opportunity in enumerate(selected):
        actions.append(TopAction(
            action_id="action_" + str(index + 1),
            opportunity_id=opportunity.opportunity_id,
            headline=opportunity.recommendation,
            rationale=opportunity.rationale,
            confidence_tier=opportunity.confidence_tier,
            priority_rank=index + 1,
        ))
    return actions
