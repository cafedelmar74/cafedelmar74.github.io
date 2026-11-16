import unittest

from growth_agent import diagnostics
from growth_agent.tests import fixtures


class DiagnosticsTests(unittest.TestCase):
    def test_traffic_without_conversion_detected(self):
        page_views = [fixtures.make_page_view_row(course_id="c1", event_count=50, sessions=40, users=30)]
        entries = diagnostics.detect_traffic_without_conversion(page_views, [])
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].course_id, "c1")

    def test_traffic_without_conversion_excludes_null_course_id(self):
        page_views = [fixtures.make_page_view_row(course_id=None, event_count=100)]
        entries = diagnostics.detect_traffic_without_conversion(page_views, [])
        self.assertEqual(entries, [])

    def test_no_flag_when_conversion_present(self):
        page_views = [fixtures.make_page_view_row(course_id="c1", event_count=50)]
        events = [fixtures.make_course_row(course_id="c1", event_count=3)]
        entries = diagnostics.detect_traffic_without_conversion(page_views, events)
        self.assertEqual(entries, [])

    def test_conversion_without_much_traffic_detected(self):
        events = [fixtures.make_course_row(course_id="c2", event_count=4)]
        page_views = [fixtures.make_page_view_row(course_id="c2", event_count=2)]
        entries = diagnostics.detect_conversion_without_much_traffic(page_views, events)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].course_id, "c2")

    def test_conversion_without_much_traffic_excludes_null_course_id(self):
        events = [fixtures.make_course_row(course_id=None, event_count=4)]
        entries = diagnostics.detect_conversion_without_much_traffic([], events)
        self.assertEqual(entries, [])


if __name__ == "__main__":
    unittest.main()
