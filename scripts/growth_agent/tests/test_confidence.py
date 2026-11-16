import unittest

from growth_agent import confidence
from growth_agent.schema import CutoverMatch


NOT_CUTOVER = CutoverMatch(affected=False, cutover_id=None)


class Ga4ConfidenceTests(unittest.TestCase):
    def test_ga4_insufficient_single_user(self):
        result = confidence.classify_ga4_confidence(1, 1, 0.0, NOT_CUTOVER)
        self.assertEqual(result.tier, "insufficient")
        self.assertEqual(result.multiplier, 0.0)

    def test_ga4_high_concentration_ratio_forces_insufficient(self):
        # An ACTUAL supplied concentration_ratio above the ceiling must
        # still suppress, even after the missing-data correction.
        result = confidence.classify_ga4_confidence(20, 15, 0.85, NOT_CUTOVER)
        self.assertEqual(result.tier, "insufficient")
        self.assertEqual(result.reason, "high_concentration_ratio")

    def test_ga4_cutover_forces_insufficient(self):
        cutover = CutoverMatch(affected=True, cutover_id="some_cutover")
        result = confidence.classify_ga4_confidence(50, 30, 0.1, cutover)
        self.assertEqual(result.tier, "insufficient")
        self.assertTrue(result.reason.startswith("cutover_affected"))

    def test_ga4_early_signal(self):
        result = confidence.classify_ga4_confidence(5, 3, 0.2, NOT_CUTOVER)
        self.assertEqual(result.tier, "early_signal")
        self.assertEqual(result.multiplier, 0.5)

    def test_ga4_directional(self):
        result = confidence.classify_ga4_confidence(12, 6, 0.1, NOT_CUTOVER)
        self.assertEqual(result.tier, "directional")
        self.assertEqual(result.multiplier, 1.0)

    def test_ga4_reliable_not_reached_below_floor(self):
        result = confidence.classify_ga4_confidence(29, 20, 0.05, NOT_CUTOVER)
        self.assertEqual(result.tier, "directional")

    def test_ga4_reliable_reached_when_concentration_known_and_low(self):
        result = confidence.classify_ga4_confidence(31, 25, 0.05, NOT_CUTOVER)
        self.assertEqual(result.tier, "reliable")

    def test_missing_concentration_does_not_suppress(self):
        # A sample that would otherwise be directional must NOT be
        # suppressed merely because concentration_ratio is unknown.
        result = confidence.classify_ga4_confidence(12, 6, None, NOT_CUTOVER)
        self.assertEqual(result.tier, "directional")
        self.assertGreater(result.multiplier, 0.0)

    def test_missing_concentration_caps_reliable_to_directional(self):
        # A sample that clears the reliable floor must be conservatively
        # downgraded to directional when concentration is unknown - not
        # suppressed, just not certified as the strongest tier.
        result = confidence.classify_ga4_confidence(35, 25, None, NOT_CUTOVER)
        self.assertEqual(result.tier, "directional")
        self.assertEqual(result.reason, "reliable_floor_met_but_concentration_unknown")

    def test_missing_concentration_still_allows_early_signal(self):
        result = confidence.classify_ga4_confidence(5, 3, None, NOT_CUTOVER)
        self.assertEqual(result.tier, "early_signal")


class GscConfidenceTests(unittest.TestCase):
    def test_gsc_insufficient_low_impressions(self):
        result = confidence.classify_gsc_confidence(30, 0)
        self.assertEqual(result.tier, "insufficient")
        self.assertEqual(result.multiplier, 0.0)

    def test_gsc_early_signal(self):
        result = confidence.classify_gsc_confidence(150, 2)
        self.assertEqual(result.tier, "early_signal")

    def test_gsc_directional(self):
        result = confidence.classify_gsc_confidence(400, 1)
        self.assertEqual(result.tier, "directional")


if __name__ == "__main__":
    unittest.main()
