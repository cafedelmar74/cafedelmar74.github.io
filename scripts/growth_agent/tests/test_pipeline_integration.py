import unittest

from growth_agent import pipeline
from growth_agent.tests import fixtures


class PipelineIntegrationTests(unittest.TestCase):
    def test_scenario_healthy_course_with_early_intent_and_gsc_opportunity(self):
        metadata = fixtures.make_report_metadata(current_start="2026-08-24", current_end="2026-08-30")
        input_data = fixtures.make_minimal_input(
            report_metadata=metadata,
            commercial_events=[
                fixtures.make_commercial_event_row(event_name="booking_submitted", period="current", event_count=12, key_events=12, sessions=6, users=12),
                fixtures.make_commercial_event_row(event_name="booking_submitted", period="previous", event_count=0, key_events=0, sessions=0, users=0),
            ],
            commercial_events_by_course=[
                fixtures.make_course_row(event_name="booking_submitted", course_id="strong-course", event_count=12, sessions=6, users=12, key_events=12),
            ],
            commercial_events_by_intent=[
                fixtures.make_intent_row(lead_intent="corporate_training", event_count=3, users=3, sessions=3),
            ],
            gsc_queries=[
                fixtures.make_gsc_row(query="training course query", impressions=500, clicks=2, ctr=0.004),
            ],
        )
        output = pipeline.run_intelligence_module(input_data, generated_at="2026-08-30T08:00:00Z")

        self.assertEqual(len(output.opportunities), 2)
        opportunity_types = set(o.opportunity_type for o in output.opportunities)
        self.assertIn("course_momentum", opportunity_types)
        self.assertIn("ctr_underperformance", opportunity_types)

        self.assertEqual(len(output.early_signals), 1)
        self.assertEqual(output.early_signals[0].opportunity_type, "corporate_intent_signal")

        early_signal_ids = set(o.opportunity_id for o in output.early_signals)
        for action in output.top_actions:
            self.assertNotIn(action.opportunity_id, early_signal_ids)

        self.assertLessEqual(len(output.top_actions), 5)
        self.assertGreater(len(output.top_actions), 0)

    def test_scenario_cutover_affected_and_unattributed_course(self):
        input_data = fixtures.make_minimal_input(
            commercial_events_by_course=[
                fixtures.make_course_row(event_name="booking_submitted", course_id="c1", event_count=15, users=15, sessions=10),
                fixtures.make_course_row(event_name="booking_submitted", course_id="(not set)", event_count=8, users=6, sessions=6),
            ],
        )
        output = pipeline.run_intelligence_module(input_data, generated_at="2026-08-30T08:00:00Z")

        self.assertTrue(any(f.flag_type == "missing_course_attribution" for f in output.data_quality_flags))

        suppressed_ids = set(s.opportunity_id for s in output.suppressed_signals)
        self.assertIn("course_momentum:c1", suppressed_ids)
        c1_suppressed = [s for s in output.suppressed_signals if s.opportunity_id == "course_momentum:c1"][0]
        self.assertEqual(c1_suppressed.suppression_reason, "known_tracking_cutover")

        self.assertEqual(output.opportunities, [])
        self.assertEqual(output.early_signals, [])

    def test_scenario_high_repetition_without_concentration_data_is_not_auto_suppressed(self):
        # Same real-world shape that originally motivated the concentration
        # safeguard (27 raw events from only 5 users, 22 sessions), but
        # since the input contract has no true busiest-session/day field,
        # concentration_ratio is correctly None here - so this must land
        # as an early_signal (needs more data), NOT be auto-suppressed as
        # suspected test activity on the basis of a repetition proxy alone.
        metadata = fixtures.make_report_metadata(current_start="2026-08-24", current_end="2026-08-30")
        input_data = fixtures.make_minimal_input(
            report_metadata=metadata,
            commercial_events_by_course=[
                fixtures.make_course_row(event_name="booking_submitted", course_id="busy-course", event_count=27, users=5, sessions=22),
            ],
        )
        output = pipeline.run_intelligence_module(input_data, generated_at="2026-08-30T08:00:00Z")

        self.assertEqual(output.suppressed_signals, [])
        self.assertEqual(output.opportunities, [])
        self.assertEqual(output.top_actions, [])
        self.assertEqual(len(output.early_signals), 1)

        signal = output.early_signals[0]
        self.assertIsNone(signal.sample_size.concentration_ratio)
        self.assertIsNotNone(signal.sample_size.repetition_ratio)
        self.assertGreater(signal.sample_size.repetition_ratio, 0.7)


if __name__ == "__main__":
    unittest.main()
