import unittest

from growth_agent import suppression, scoring
from growth_agent.schema import Opportunity, Scope, PrimaryMetric, Evidence, SampleSize, CutoverMatch


def base_opportunity(sample_size=None, cutover_affected=None):
    if sample_size is None:
        sample_size = SampleSize(unique_users=1, distinct_sessions=1, concentration_ratio=0.0)
    if cutover_affected is None:
        cutover_affected = CutoverMatch(affected=False, cutover_id=None)
    return Opportunity(
        opportunity_id="test:1",
        opportunity_type="course_momentum",
        scope=Scope(type="course", key="c1", label="Course One"),
        raw_score=2,
        confidence_tier="pending",
        confidence_multiplier=0.0,
        final_score=0.0,
        primary_metric=PrimaryMetric(name="commercial_event_count", current_value=1),
        evidence=[Evidence(metric="commercial_event_count", value=1, period="current", source="GA4")],
        sample_size=sample_size,
        cutover_affected=cutover_affected,
        business_context_required=False,
        business_context_note=None,
        recommendation="",
        rationale="",
        course_id="c1",
        course_name="Course One",
    )


class SuppressionTests(unittest.TestCase):
    def test_insufficient_sample_suppressed(self):
        opp = base_opportunity(sample_size=SampleSize(unique_users=1, distinct_sessions=1, concentration_ratio=0.0))
        scored = scoring.score(opp)
        bucket, item = suppression.route_opportunity(scored)
        self.assertEqual(bucket, "suppressed")
        self.assertEqual(item.suppression_reason, "insufficient_sample")
        self.assertEqual(item.secondary_reasons, [])

    def test_cutover_affected_suppressed_with_reason(self):
        opp = base_opportunity(
            sample_size=SampleSize(unique_users=50, distinct_sessions=30, concentration_ratio=0.05),
            cutover_affected=CutoverMatch(affected=True, cutover_id="course_identity_migration"),
        )
        scored = scoring.score(opp)
        bucket, item = suppression.route_opportunity(scored)
        self.assertEqual(bucket, "suppressed")
        self.assertEqual(item.suppression_reason, "known_tracking_cutover")
        self.assertEqual(item.secondary_reasons, [])

    def test_suspected_test_activity_suppressed(self):
        # An ACTUAL supplied concentration_ratio above the ceiling, with
        # no cutover involved, must still be routed to suppressed with
        # the correct primary reason.
        opp = base_opportunity(sample_size=SampleSize(unique_users=5, distinct_sessions=22, concentration_ratio=0.815))
        scored = scoring.score(opp)
        bucket, item = suppression.route_opportunity(scored)
        self.assertEqual(bucket, "suppressed")
        self.assertEqual(item.suppression_reason, "suspected_test_activity")
        self.assertEqual(item.secondary_reasons, [])

    def test_cutover_and_high_concentration_both_recorded(self):
        # When BOTH a cutover and a supplied high concentration_ratio
        # apply to the same signal, cutover remains the primary reason,
        # but the concentration finding must not be silently erased - it
        # belongs in secondary_reasons.
        opp = base_opportunity(
            sample_size=SampleSize(unique_users=50, distinct_sessions=30, concentration_ratio=0.9),
            cutover_affected=CutoverMatch(affected=True, cutover_id="course_identity_migration"),
        )
        scored = scoring.score(opp)
        bucket, item = suppression.route_opportunity(scored)
        self.assertEqual(bucket, "suppressed")
        self.assertEqual(item.suppression_reason, "known_tracking_cutover")
        self.assertIn("suspected_test_activity", item.secondary_reasons)

    def test_early_signal_routes_to_early_signals_not_suppressed(self):
        opp = base_opportunity(sample_size=SampleSize(unique_users=5, distinct_sessions=3, concentration_ratio=0.1))
        scored = scoring.score(opp)
        bucket, item = suppression.route_opportunity(scored)
        self.assertEqual(bucket, "early_signal")

    def test_directional_routes_to_opportunity(self):
        opp = base_opportunity(sample_size=SampleSize(unique_users=15, distinct_sessions=8, concentration_ratio=0.05))
        scored = scoring.score(opp)
        bucket, item = suppression.route_opportunity(scored)
        self.assertEqual(bucket, "opportunity")

    def test_missing_concentration_does_not_route_to_suppressed(self):
        opp = base_opportunity(sample_size=SampleSize(unique_users=12, distinct_sessions=6, concentration_ratio=None))
        scored = scoring.score(opp)
        bucket, item = suppression.route_opportunity(scored)
        self.assertEqual(bucket, "opportunity")


if __name__ == "__main__":
    unittest.main()
