import unittest

from growth_agent import attribution_quality, config


def raw_response(rows):
    """rows: list of (date, eventName, course_id, form_location, eventCount) tuples."""
    return {
        "dimension_headers": [
            {"name": "date"}, {"name": "eventName"},
            {"name": "customEvent:course_id"}, {"name": "customEvent:form_location"},
        ],
        "metric_headers": [{"name": "eventCount"}],
        "rows": [
            {
                "dimension_values": [
                    {"value": r[0]}, {"value": r[1]}, {"value": r[2]}, {"value": r[3]},
                ],
                "metric_values": [{"value": r[4]}],
            }
            for r in rows
        ],
        "row_count": len(rows),
    }


class MigrationBoundarySourceTests(unittest.TestCase):
    def test_boundary_date_matches_registry_not_a_second_constant(self):
        boundary = attribution_quality.migration_boundary_date()
        registry_entry = [e for e in config.CUTOVER_REGISTRY if e["cutover_id"] == "course_identity_migration"][0]
        self.assertEqual(str(boundary), registry_entry["cutover_date"])

    def test_certainty_remains_approximate(self):
        registry_entry = [e for e in config.CUTOVER_REGISTRY if e["cutover_id"] == "course_identity_migration"][0]
        self.assertEqual(registry_entry["date_certainty"], "approximate")


class CalendarDownloadTests(unittest.TestCase):
    def test_calendar_download_missing_course_id_is_expected(self):
        raw = raw_response([("20260810", "calendar_download", "(not set)", "(not set)", "5")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.expected_unattributed_count, 5)
        self.assertEqual(summary.by_event_name["calendar_download"].expected, 5)


class EnquiryFormLocationTests(unittest.TestCase):
    def test_homepage_enquiry_missing_course_id_is_expected(self):
        raw = raw_response([("20260812", "enquiry_submitted", "(not set)", "homepage", "2")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.expected_unattributed_count, 2)

    def test_contact_page_enquiry_missing_course_id_is_expected(self):
        raw = raw_response([("20260812", "enquiry_submitted", "(not set)", "contact_page", "10")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.expected_unattributed_count, 10)

    def test_course_page_enquiry_missing_course_id_is_unexpected(self):
        # This is the exact regression the redesign exists to catch: a
        # course-page enquiry that lost its course_id must NOT be waved
        # through as expected just because it is an enquiry_submitted row.
        raw = raw_response([("20260812", "enquiry_submitted", "(not set)", "course_page", "1")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.unexpected_unattributed_count, 1)
        self.assertEqual(summary.expected_unattributed_count, 0)

    def test_enquiry_not_set_form_location_is_unexpected(self):
        raw = raw_response([("20260812", "enquiry_submitted", "(not set)", "(not set)", "2")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.unexpected_unattributed_count, 2)

    def test_enquiry_unknown_form_location_is_unexpected(self):
        raw = raw_response([("20260812", "enquiry_submitted", "(not set)", "some_new_flow", "1")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.unexpected_unattributed_count, 1)


class BookingBrochureDateBoundaryTests(unittest.TestCase):
    def test_booking_on_boundary_date_is_cutover(self):
        raw = raw_response([("20260822", "booking_submitted", "(not set)", "(not set)", "1")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.cutover_unattributed_count, 1)

    def test_booking_after_boundary_date_is_unexpected(self):
        raw = raw_response([("20260823", "booking_submitted", "(not set)", "(not set)", "1")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.unexpected_unattributed_count, 1)
        self.assertEqual(summary.cutover_unattributed_count, 0)

    def test_brochure_on_or_before_boundary_is_cutover(self):
        raw = raw_response([("20260801", "brochure_download", "(not set)", "(not set)", "3")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.cutover_unattributed_count, 3)

    def test_brochure_after_boundary_is_unexpected(self):
        raw = raw_response([("20260825", "brochure_download", "(not set)", "(not set)", "3")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.unexpected_unattributed_count, 3)


class ValidCourseIdTests(unittest.TestCase):
    def test_valid_course_id_row_is_not_classified_at_all(self):
        raw = raw_response([("20260825", "booking_submitted", "gas-lng-contracts-negotiations", "(not set)", "9")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.expected_unattributed_count, 0)
        self.assertEqual(summary.cutover_unattributed_count, 0)
        self.assertEqual(summary.unexpected_unattributed_count, 0)
        self.assertEqual(summary.by_event_name, {})


class MissingCourseIdRepresentationTests(unittest.TestCase):
    def test_none_empty_whitespace_and_not_set_all_treated_as_missing(self):
        self.assertTrue(attribution_quality._is_missing_course_id(None))
        self.assertTrue(attribution_quality._is_missing_course_id(""))
        self.assertTrue(attribution_quality._is_missing_course_id("   "))
        self.assertTrue(attribution_quality._is_missing_course_id("(not set)"))
        self.assertFalse(attribution_quality._is_missing_course_id("gas-lng-contracts-negotiations"))

    def test_all_four_missing_representations_count_via_calendar_download(self):
        raw = raw_response([
            ("20260810", "calendar_download", "(not set)", "(not set)", "1"),
            ("20260810", "calendar_download", "", "(not set)", "1"),
            ("20260810", "calendar_download", "   ", "(not set)", "1"),
        ])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.expected_unattributed_count, 3)


class AggregationAndReconciliationTests(unittest.TestCase):
    def test_counts_aggregate_correctly_across_multiple_rows(self):
        raw = raw_response([
            ("20260810", "calendar_download", "(not set)", "(not set)", "5"),
            ("20260812", "enquiry_submitted", "(not set)", "homepage", "2"),
            ("20260812", "enquiry_submitted", "(not set)", "course_page", "1"),
            ("20260810", "booking_submitted", "(not set)", "(not set)", "7"),
            ("20260825", "booking_submitted", "(not set)", "(not set)", "4"),
        ])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.expected_unattributed_count, 7)   # 5 calendar + 2 homepage enquiry
        self.assertEqual(summary.cutover_unattributed_count, 7)    # booking on 20260810
        self.assertEqual(summary.unexpected_unattributed_count, 5)  # 1 course_page enquiry + 4 booking after boundary

    def test_by_event_name_reconciles_exactly_to_overall_totals(self):
        raw = raw_response([
            ("20260810", "calendar_download", "(not set)", "(not set)", "5"),
            ("20260812", "enquiry_submitted", "(not set)", "homepage", "2"),
            ("20260812", "enquiry_submitted", "(not set)", "course_page", "1"),
            ("20260810", "booking_submitted", "(not set)", "(not set)", "7"),
            ("20260825", "brochure_download", "(not set)", "(not set)", "4"),
        ])
        summary = attribution_quality.classify_attribution_quality(raw)
        sum_expected = sum(c.expected for c in summary.by_event_name.values())
        sum_cutover = sum(c.cutover for c in summary.by_event_name.values())
        sum_unexpected = sum(c.unexpected for c in summary.by_event_name.values())
        self.assertEqual(sum_expected, summary.expected_unattributed_count)
        self.assertEqual(sum_cutover, summary.cutover_unattributed_count)
        self.assertEqual(sum_unexpected, summary.unexpected_unattributed_count)


class UnknownEventTests(unittest.TestCase):
    def test_unknown_event_with_missing_course_id_is_unexpected_not_discarded(self):
        raw = raw_response([("20260810", "some_future_event", "(not set)", "(not set)", "6")])
        summary = attribution_quality.classify_attribution_quality(raw)
        self.assertEqual(summary.unexpected_unattributed_count, 6)
        self.assertEqual(summary.by_event_name["some_future_event"].unexpected, 6)


if __name__ == "__main__":
    unittest.main()
