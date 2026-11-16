import unittest
from datetime import date

from growth_agent import opportunities, scoring
from growth_agent.tests import fixtures


PERIOD_START = date(2026, 8, 24)
PERIOD_END = date(2026, 8, 30)


def all_candidate_opportunities():
    course_rows = [
        fixtures.make_course_row(course_id="c1", event_count=12, users=12, sessions=6),
        fixtures.make_course_row(course_id="c2", event_count=1, users=1, sessions=1),
        fixtures.make_course_row(course_id=None, event_count=20, users=15, sessions=15),
    ]
    intent_rows = [
        fixtures.make_intent_row(lead_intent="corporate_training", event_count=3, users=3, sessions=3),
        fixtures.make_intent_row(lead_intent="team_training", event_count=1, users=1, sessions=1),
    ]
    gsc_rows = [
        fixtures.make_gsc_row(query="q1", impressions=400, clicks=1, ctr=0.0025),
        fixtures.make_gsc_row(query="q2", impressions=20, clicks=0, ctr=0.0),
    ]
    candidates = []
    candidates += opportunities.detect_course_opportunities(course_rows, PERIOD_START, PERIOD_END)
    candidates += opportunities.detect_lead_intent_opportunities(intent_rows, PERIOD_START, PERIOD_END)
    candidates += opportunities.detect_gsc_ctr_opportunities(gsc_rows)
    return [scoring.score(c) for c in candidates]


class SchemaInvariantTests(unittest.TestCase):
    def test_no_opportunity_has_recommendation_without_evidence(self):
        for opportunity in all_candidate_opportunities():
            if opportunity.recommendation:
                self.assertTrue(len(opportunity.evidence) > 0)

    def test_every_opportunity_has_a_valid_confidence_tier(self):
        valid_tiers = set(["insufficient", "early_signal", "directional", "reliable"])
        for opportunity in all_candidate_opportunities():
            self.assertIn(opportunity.confidence_tier, valid_tiers)


if __name__ == "__main__":
    unittest.main()
