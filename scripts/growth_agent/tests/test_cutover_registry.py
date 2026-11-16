import unittest
from datetime import date

from growth_agent import cutover_registry


class CutoverRegistryTests(unittest.TestCase):
    def test_period_overlaps_known_cutover(self):
        match = cutover_registry.is_cutover_affected(
            "booking_submitted", "course_id", date(2026, 7, 27), date(2026, 8, 23)
        )
        self.assertTrue(match.affected)
        self.assertEqual(match.cutover_id, "course_identity_migration")

    def test_period_fully_after_cutover_not_affected(self):
        match = cutover_registry.is_cutover_affected(
            "booking_submitted", "course_id", date(2026, 8, 25), date(2026, 9, 21)
        )
        self.assertFalse(match.affected)

    def test_unaffected_event_dimension_combination(self):
        match = cutover_registry.is_cutover_affected(
            "calendar_download", "course_id", date(2026, 7, 27), date(2026, 8, 23)
        )
        self.assertFalse(match.affected)

    def test_unknown_certainty_defaults_to_conservative_affected(self):
        match = cutover_registry.is_cutover_affected(
            "enquiry_submitted", "key_events", date(2026, 8, 18), date(2026, 8, 20)
        )
        self.assertTrue(match.affected)
        self.assertEqual(match.cutover_id, "key_event_registration_enquiry_submitted")

    def test_lead_intent_cutover_exact_date(self):
        affected = cutover_registry.is_cutover_affected(
            "enquiry_submitted", "lead_intent", date(2026, 8, 20), date(2026, 8, 23)
        )
        clean = cutover_registry.is_cutover_affected(
            "enquiry_submitted", "lead_intent", date(2026, 8, 24), date(2026, 8, 30)
        )
        self.assertTrue(affected.affected)
        self.assertFalse(clean.affected)


if __name__ == "__main__":
    unittest.main()
