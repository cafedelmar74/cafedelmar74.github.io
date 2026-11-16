import unittest

from growth_agent import top_actions
from growth_agent.schema import Opportunity, Scope, PrimaryMetric, Evidence, SampleSize, CutoverMatch


def make_opportunity(opportunity_id, final_score, confidence_tier="directional", recommendation="Do something."):
    return Opportunity(
        opportunity_id=opportunity_id,
        opportunity_type="course_momentum",
        scope=Scope(type="course", key=opportunity_id, label=opportunity_id),
        raw_score=final_score,
        confidence_tier=confidence_tier,
        confidence_multiplier=1.0,
        final_score=final_score,
        primary_metric=PrimaryMetric(name="commercial_event_count", current_value=final_score),
        evidence=[Evidence(metric="commercial_event_count", value=final_score, period="current", source="GA4")],
        sample_size=SampleSize(unique_users=15, distinct_sessions=8, concentration_ratio=0.05),
        cutover_affected=CutoverMatch(affected=False, cutover_id=None),
        business_context_required=False,
        business_context_note=None,
        recommendation=recommendation,
        rationale="Because reasons.",
        course_id=opportunity_id,
        course_name=opportunity_id,
    )


class TopActionsTests(unittest.TestCase):
    def test_max_five_cap(self):
        opps = [make_opportunity("c" + str(i), final_score=10 - i) for i in range(8)]
        actions = top_actions.select_top_actions(opps)
        self.assertEqual(len(actions), 5)

    def test_no_padding_with_two_eligible(self):
        opps = [make_opportunity("c1", final_score=5), make_opportunity("c2", final_score=3)]
        actions = top_actions.select_top_actions(opps)
        self.assertEqual(len(actions), 2)

    def test_no_padding_with_zero_eligible(self):
        actions = top_actions.select_top_actions([])
        self.assertEqual(actions, [])

    def test_early_signal_and_insufficient_never_eligible(self):
        opps = [
            make_opportunity("c1", final_score=5, confidence_tier="early_signal"),
            make_opportunity("c2", final_score=5, confidence_tier="insufficient"),
        ]
        actions = top_actions.select_top_actions(opps)
        self.assertEqual(actions, [])

    def test_fk_integrity(self):
        opps = [make_opportunity("c1", final_score=5), make_opportunity("c2", final_score=3)]
        actions = top_actions.select_top_actions(opps)
        opportunity_ids = set(o.opportunity_id for o in opps)
        for action in actions:
            self.assertIn(action.opportunity_id, opportunity_ids)

    def test_ranked_by_final_score_descending(self):
        opps = [make_opportunity("low", final_score=1), make_opportunity("high", final_score=9)]
        actions = top_actions.select_top_actions(opps)
        self.assertEqual(actions[0].opportunity_id, "high")
        self.assertEqual(actions[0].priority_rank, 1)

    def test_no_recommendation_excluded(self):
        opps = [make_opportunity("c1", final_score=5, recommendation="")]
        actions = top_actions.select_top_actions(opps)
        self.assertEqual(actions, [])


if __name__ == "__main__":
    unittest.main()
