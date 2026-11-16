import unittest

from growth_agent import ga4_adapter, pipeline


def raw_response(dimension_names, metric_names, rows):
    """Builds a raw GA4 run_report()-shaped dict from a list of
    (dim_values_tuple, metric_values_tuple) rows - mirrors the real API
    shape used throughout this project.
    """
    return {
        "dimension_headers": [{"name": n} for n in dimension_names],
        "metric_headers": [{"name": n} for n in metric_names],
        "rows": [
            {
                "dimension_values": [{"value": v} for v in dim_vals],
                "metric_values": [{"value": v} for v in metric_vals],
            }
            for dim_vals, metric_vals in rows
        ],
        "row_count": len(rows),
    }


class TotalsTests(unittest.TestCase):
    def test_normal_current_and_previous_totals_mapping(self):
        current_raw = raw_response([], ["totalUsers", "sessions", "engagedSessions"], [((), ("1648", "1826", "746"))])
        previous_raw = raw_response([], ["totalUsers", "sessions", "engagedSessions"], [((), ("16", "19", "2"))])
        current = ga4_adapter.parse_totals(current_raw)
        previous = ga4_adapter.parse_totals(previous_raw)
        self.assertEqual((current.users, current.sessions, current.engaged_sessions), (1648, 1826, 746))
        self.assertEqual((previous.users, previous.sessions, previous.engaged_sessions), (16, 19, 2))

    def test_zero_row_totals_produce_zeros(self):
        empty_raw = raw_response([], ["totalUsers", "sessions", "engagedSessions"], [])
        totals = ga4_adapter.parse_totals(empty_raw)
        self.assertEqual((totals.users, totals.sessions, totals.engaged_sessions), (0, 0, 0))


class ConversionsCoercionTests(unittest.TestCase):
    def test_conversions_string_float_becomes_int_key_events(self):
        raw = raw_response(
            ["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("booking_submitted",), ("26", "24.0", "21", "5"))],
        )
        rows = ga4_adapter.parse_commercial_events(raw, "current")
        booking = [r for r in rows if r.event_name == "booking_submitted"][0]
        self.assertEqual(booking.key_events, 24)
        self.assertIsInstance(booking.key_events, int)

    def test_conversions_rounding_behavior(self):
        raw = raw_response(
            ["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [
                (("booking_submitted",), ("10", "24.6", "5", "3")),
                (("brochure_download",), ("10", "24.4", "5", "3")),
            ],
        )
        rows = ga4_adapter.parse_commercial_events(raw, "current")
        by_name = {r.event_name: r for r in rows}
        self.assertEqual(by_name["booking_submitted"].key_events, 25)
        self.assertEqual(by_name["brochure_download"].key_events, 24)


class CommercialEventTests(unittest.TestCase):
    def test_all_four_event_rows_always_present(self):
        raw = raw_response(
            ["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [
                (("booking_submitted",), ("26", "25", "21", "5")),
                (("brochure_download",), ("31", "30", "22", "9")),
            ],
        )
        rows = ga4_adapter.parse_commercial_events(raw, "current")
        self.assertEqual(len(rows), 4)
        self.assertEqual(set(r.event_name for r in rows), ga4_adapter.KNOWN_COMMERCIAL_EVENTS)

    def test_missing_event_row_synthesized_to_zeros(self):
        raw = raw_response(
            ["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("booking_submitted",), ("26", "25", "21", "5"))],
        )
        rows = ga4_adapter.parse_commercial_events(raw, "previous")
        by_name = {r.event_name: r for r in rows}
        synthesized = by_name["calendar_download"]
        self.assertEqual((synthesized.event_count, synthesized.key_events, synthesized.sessions, synthesized.users), (0, 0, 0, 0))
        self.assertEqual(synthesized.period, "previous")

    def test_unknown_commercial_event_rejected(self):
        raw = raw_response(
            ["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("page_view",), ("100", "0", "50", "40"))],
        )
        with self.assertRaises(ValueError):
            ga4_adapter.parse_commercial_events(raw, "current")


class ByCourseTests(unittest.TestCase):
    def test_not_set_course_id_preserved_not_normalised(self):
        raw = raw_response(
            ["eventName", "customEvent:course_id", "customEvent:course_name", "customEvent:course_category"],
            ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("booking_submitted", "(not set)", "(not set)", "(not set)"), ("7", "6", "7", "5"))],
        )
        rows = ga4_adapter.parse_commercial_events_by_course(raw)
        self.assertEqual(rows[0].course_id, "(not set)")
        self.assertIsInstance(rows[0].course_id, str)

    def test_no_cross_row_user_aggregation_performed(self):
        # Same course_id, two different event types, both users=6. The
        # adapter must return TWO separate rows, untouched - aggregation
        # (correctly MAX, not sum) is opportunities.py's job, not this one.
        raw = raw_response(
            ["eventName", "customEvent:course_id", "customEvent:course_name", "customEvent:course_category"],
            ["eventCount", "conversions", "sessions", "totalUsers"],
            [
                (("booking_submitted", "c1", "Course One", "cat"), ("6", "6", "5", "6")),
                (("brochure_download", "c1", "Course One", "cat"), ("6", "6", "5", "6")),
            ],
        )
        rows = ga4_adapter.parse_commercial_events_by_course(raw)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0].users, 6)
        self.assertEqual(rows[1].users, 6)


class LeadIntentTests(unittest.TestCase):
    def test_not_set_lead_intent_preserved(self):
        raw = raw_response(
            ["customEvent:lead_intent"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("(not set)",), ("15", "6", "5", "3"))],
        )
        rows = ga4_adapter.parse_lead_intent(raw)
        self.assertEqual(rows[0].lead_intent, "(not set)")

    def test_lead_intent_event_name_hardcoded(self):
        raw = raw_response(
            ["customEvent:lead_intent"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("corporate_training",), ("3", "3", "3", "2"))],
        )
        rows = ga4_adapter.parse_lead_intent(raw)
        self.assertEqual(rows[0].event_name, "enquiry_submitted")


class CoursePageViewTests(unittest.TestCase):
    def test_course_page_view_mapping(self):
        raw = raw_response(
            ["customEvent:course_id", "customEvent:course_name"], ["eventCount", "sessions", "totalUsers"],
            [(("gas-lng-contracts-negotiations", "Gas & LNG Contracts Negotiations Masterclass"), ("39", "10", "5"))],
        )
        rows = ga4_adapter.parse_course_page_views(raw)
        self.assertEqual(rows[0].course_id, "gas-lng-contracts-negotiations")
        self.assertEqual(rows[0].event_count, 39)
        self.assertEqual(rows[0].sessions, 10)
        self.assertEqual(rows[0].users, 5)


class AssemblerTests(unittest.TestCase):
    def test_default_gsc_rows_empty(self):
        result = ga4_adapter.build_intelligence_input(
            current_period_start="2026-08-02", current_period_end="2026-08-29",
            previous_period_start="2026-07-05", previous_period_end="2026-08-01",
            totals_current_raw=raw_response([], ["totalUsers", "sessions", "engagedSessions"], []),
            totals_previous_raw=raw_response([], ["totalUsers", "sessions", "engagedSessions"], []),
            commercial_events_current_raw=raw_response(["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"], []),
            commercial_events_previous_raw=raw_response(["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"], []),
            commercial_events_by_course_raw=raw_response(["eventName", "customEvent:course_id", "customEvent:course_name", "customEvent:course_category"], ["eventCount", "conversions", "sessions", "totalUsers"], []),
            lead_intent_raw=raw_response(["customEvent:lead_intent"], ["eventCount", "conversions", "sessions", "totalUsers"], []),
            course_page_views_raw=raw_response(["customEvent:course_id", "customEvent:course_name"], ["eventCount", "sessions", "totalUsers"], []),
        )
        self.assertEqual(result.gsc_queries, [])

    def test_complete_assembler_returns_valid_input_and_runs_pipeline(self):
        totals_raw = raw_response([], ["totalUsers", "sessions", "engagedSessions"], [((), ("100", "120", "60"))])
        commercial_raw = raw_response(
            ["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("booking_submitted",), ("12", "12.0", "6", "12"))],
        )
        empty_commercial_raw = raw_response(["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"], [])
        by_course_raw = raw_response(
            ["eventName", "customEvent:course_id", "customEvent:course_name", "customEvent:course_category"],
            ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("booking_submitted", "c1", "Course One", "cat"), ("12", "12.0", "6", "12"))],
        )
        intent_raw = raw_response(
            ["customEvent:lead_intent"], ["eventCount", "conversions", "sessions", "totalUsers"],
            [(("corporate_training",), ("3", "3", "3", "2"))],
        )
        page_view_raw = raw_response(
            ["customEvent:course_id", "customEvent:course_name"], ["eventCount", "sessions", "totalUsers"],
            [(("c1", "Course One"), ("40", "30", "25"))],
        )

        input_data = ga4_adapter.build_intelligence_input(
            current_period_start="2026-08-24", current_period_end="2026-08-30",
            previous_period_start="2026-07-27", previous_period_end="2026-08-23",
            totals_current_raw=totals_raw,
            totals_previous_raw=totals_raw,
            commercial_events_current_raw=commercial_raw,
            commercial_events_previous_raw=empty_commercial_raw,
            commercial_events_by_course_raw=by_course_raw,
            lead_intent_raw=intent_raw,
            course_page_views_raw=page_view_raw,
        )

        self.assertEqual(len(input_data.commercial_events), 8)
        self.assertEqual(len(input_data.commercial_events_by_course), 1)
        self.assertEqual(len(input_data.commercial_events_by_intent), 1)
        self.assertEqual(len(input_data.course_page_views_by_course), 1)

        output = pipeline.run_intelligence_module(input_data, generated_at="2026-08-30T08:00:00Z")
        self.assertIsNotNone(output)
        self.assertIsNotNone(output.descriptive_summary)


if __name__ == "__main__":
    unittest.main()
