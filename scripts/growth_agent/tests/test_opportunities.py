import unittest
from datetime import date

from growth_agent import opportunities, scoring
from growth_agent.tests import fixtures


PERIOD_START = date(2026, 8, 24)
PERIOD_END = date(2026, 8, 30)


class CourseOpportunityTests(unittest.TestCase):
    def test_valid_directional_course_opportunity(self):
        rows = [fixtures.make_course_row(event_name="booking_submitted", course_id="c1", event_count=12, sessions=6, users=12, key_events=12)]
        candidates = opportunities.detect_course_opportunities(rows, PERIOD_START, PERIOD_END)
        self.assertEqual(len(candidates), 1)
        scored = scoring.score(candidates[0])
        self.assertEqual(scored.confidence_tier, "directional")
        self.assertGreater(scored.final_score, 0)
        self.assertTrue(scored.recommendation)

    def test_null_course_id_excluded_from_scoring(self):
        rows = [fixtures.make_course_row(course_id=None, event_count=20, users=15, sessions=15)]
        candidates = opportunities.detect_course_opportunities(rows, PERIOD_START, PERIOD_END)
        self.assertEqual(candidates, [])

    def test_literal_not_set_string_is_a_separate_layer_boundary(self):
        rows = [fixtures.make_course_row(course_id="(not set)", event_count=20, users=15, sessions=15)]
        candidates = opportunities.detect_course_opportunities(rows, PERIOD_START, PERIOD_END)
        self.assertEqual(len(candidates), 1)

    def test_concentration_ratio_is_never_inferred(self):
        rows = [fixtures.make_course_row(course_id="c1", event_count=12, users=12, sessions=6)]
        candidates = opportunities.detect_course_opportunities(rows, PERIOD_START, PERIOD_END)
        self.assertIsNone(candidates[0].sample_size.concentration_ratio)

    def test_repetition_ratio_is_populated_separately_and_evidenced(self):
        rows = [fixtures.make_course_row(course_id="c1", event_count=27, users=5, sessions=22)]
        candidates = opportunities.detect_course_opportunities(rows, PERIOD_START, PERIOD_END)
        opportunity = candidates[0]
        self.assertIsNone(opportunity.sample_size.concentration_ratio)
        self.assertIsNotNone(opportunity.sample_size.repetition_ratio)
        self.assertAlmostEqual(opportunity.sample_size.repetition_ratio, 1.0 - (5.0 / 27.0))
        metric_names = [e.metric for e in opportunity.evidence]
        self.assertIn("repetition_ratio", metric_names)

    def test_cross_event_users_are_not_summed(self):
        # The same 6 people both booked and downloaded the brochure for
        # this course. Summing per-event user totals would wrongly
        # report 12 unique users; the conservative MAX rule must report 6.
        rows = [
            fixtures.make_course_row(event_name="booking_submitted", course_id="c1", event_count=6, users=6, sessions=5),
            fixtures.make_course_row(event_name="brochure_download", course_id="c1", event_count=6, users=6, sessions=5),
        ]
        candidates = opportunities.detect_course_opportunities(rows, PERIOD_START, PERIOD_END)
        self.assertEqual(len(candidates), 1)
        opportunity = candidates[0]
        self.assertEqual(opportunity.sample_size.unique_users, 6)
        self.assertEqual(opportunity.primary_metric.current_value, 12)

    def test_confidence_cannot_increase_from_cross_event_user_overlap(self):
        # Same shape as above: with the OLD (summed) behaviour, 12 users
        # would have crossed the directional floor (10). With the
        # corrected MAX rule, it stays at 6 - within early_signal range.
        rows = [
            fixtures.make_course_row(event_name="booking_submitted", course_id="c1", event_count=6, users=6, sessions=5),
            fixtures.make_course_row(event_name="brochure_download", course_id="c1", event_count=6, users=6, sessions=5),
        ]
        candidates = opportunities.detect_course_opportunities(rows, PERIOD_START, PERIOD_END)
        scored = scoring.score(candidates[0])
        self.assertEqual(scored.confidence_tier, "early_signal")


class LeadIntentOpportunityTests(unittest.TestCase):
    def test_corporate_intent_detected(self):
        rows = [fixtures.make_intent_row(lead_intent="corporate_training", event_count=6, users=6, sessions=5)]
        candidates = opportunities.detect_lead_intent_opportunities(rows, PERIOD_START, PERIOD_END)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].scope.key, "corporate_training")

    def test_individual_training_not_treated_as_opportunity(self):
        rows = [fixtures.make_intent_row(lead_intent="individual_training", event_count=6, users=6, sessions=5)]
        candidates = opportunities.detect_lead_intent_opportunities(rows, PERIOD_START, PERIOD_END)
        self.assertEqual(candidates, [])

    def test_early_lead_intent_signal_scores_as_early_signal(self):
        rows = [fixtures.make_intent_row(lead_intent="corporate_training", event_count=3, users=3, sessions=3)]
        candidates = opportunities.detect_lead_intent_opportunities(rows, PERIOD_START, PERIOD_END)
        scored = scoring.score(candidates[0])
        self.assertEqual(scored.confidence_tier, "early_signal")

    def test_lead_intent_cross_event_users_not_summed(self):
        rows = [
            fixtures.make_intent_row(event_name="enquiry_submitted", lead_intent="corporate_training", event_count=4, users=4, sessions=4),
            fixtures.make_intent_row(event_name="booking_submitted", lead_intent="corporate_training", event_count=4, users=4, sessions=4),
        ]
        candidates = opportunities.detect_lead_intent_opportunities(rows, PERIOD_START, PERIOD_END)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].sample_size.unique_users, 4)


class GscOpportunityTests(unittest.TestCase):
    def test_qualifying_gsc_ctr_opportunity(self):
        rows = [fixtures.make_gsc_row(query="demo query", impressions=400, clicks=1, ctr=0.0025, average_position=6.0)]
        candidates = opportunities.detect_gsc_ctr_opportunities(rows)
        self.assertEqual(len(candidates), 1)
        scored = scoring.score(candidates[0])
        self.assertEqual(scored.confidence_tier, "directional")
        self.assertTrue(scored.recommendation)

    def test_low_impression_gsc_query_suppressed_by_confidence(self):
        rows = [fixtures.make_gsc_row(query="rare query", impressions=20, clicks=0, ctr=0.0, average_position=15.0)]
        candidates = opportunities.detect_gsc_ctr_opportunities(rows)
        self.assertEqual(len(candidates), 1)
        scored = scoring.score(candidates[0])
        self.assertEqual(scored.confidence_tier, "insufficient")

    def test_high_ctr_query_not_flagged(self):
        rows = [fixtures.make_gsc_row(query="good query", impressions=400, clicks=40, ctr=0.10, average_position=3.0)]
        candidates = opportunities.detect_gsc_ctr_opportunities(rows)
        self.assertEqual(candidates, [])


if __name__ == "__main__":
    unittest.main()
