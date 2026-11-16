import sys
import json
import dataclasses

sys.path.insert(0, "/Users/tariktobbichi/Documents/GitHub/cafedelmar74.github.io/scripts")

from growth_agent import ga4_adapter, pipeline, attribution_quality, confidence, suppression
from growth_agent.schema import (
    Opportunity, Scope, PrimaryMetric, Evidence, SampleSize, CutoverMatch, GscQueryRow,
)


def run_intelligence(fixture):
    gsc_queries = None
    if fixture.get("gsc_queries"):
        gsc_queries = [GscQueryRow(**q) for q in fixture["gsc_queries"]]
    input_data = ga4_adapter.build_intelligence_input(
        current_period_start=fixture["current_period_start"],
        current_period_end=fixture["current_period_end"],
        previous_period_start=fixture["previous_period_start"],
        previous_period_end=fixture["previous_period_end"],
        totals_current_raw=fixture["totals_current_raw"],
        totals_previous_raw=fixture["totals_previous_raw"],
        commercial_events_current_raw=fixture["commercial_events_current_raw"],
        commercial_events_previous_raw=fixture["commercial_events_previous_raw"],
        commercial_events_by_course_raw=fixture["commercial_events_by_course_raw"],
        lead_intent_raw=fixture["lead_intent_raw"],
        course_page_views_raw=fixture["course_page_views_raw"],
        gsc_queries=gsc_queries,
        property_id=fixture.get("property_id", "303311854"),
        gsc_property=fixture.get("gsc_property", "londonpetroacademy.co.uk"),
    )
    result = pipeline.run_intelligence_module(input_data, fixture["generated_at"])
    return dataclasses.asdict(result)


def run_attribution(fixture):
    summary = attribution_quality.classify_attribution_quality(fixture["rows_raw"])
    return dataclasses.asdict(summary)


def run_direct_call(fixture):
    func = fixture["python_func"]
    if func == "classify_ga4_confidence":
        a = fixture["args"]
        cutover = CutoverMatch(**a["cutover"])
        result = confidence.classify_ga4_confidence(
            a["unique_users"], a["distinct_sessions"], a["concentration_ratio"], cutover
        )
        return dataclasses.asdict(result)
    if func == "route_opportunity":
        o = fixture["opportunity"]
        opp = Opportunity(
            opportunity_id=o["opportunity_id"],
            opportunity_type=o["opportunity_type"],
            scope=Scope(**o["scope"]),
            raw_score=o.get("raw_score", 0),
            confidence_tier=o["confidence_tier"],
            confidence_multiplier=o.get("confidence_multiplier", 0.0),
            final_score=o.get("final_score", 0.0),
            primary_metric=PrimaryMetric(**o.get("primary_metric", {"name": "x", "current_value": 0})),
            evidence=[Evidence(**e) for e in o.get("evidence", [])],
            sample_size=SampleSize(**o.get("sample_size", {})),
            cutover_affected=CutoverMatch(**o.get("cutover_affected", {"affected": False, "cutover_id": None})),
            business_context_required=o.get("business_context_required", False),
            business_context_note=o.get("business_context_note"),
            recommendation=o.get("recommendation", ""),
            rationale=o.get("rationale", ""),
            course_id=o.get("course_id"),
            course_name=o.get("course_name"),
        )
        bucket, item = suppression.route_opportunity(opp)
        return {"bucket": bucket, "item": dataclasses.asdict(item)}
    raise ValueError("Unknown python_func: " + repr(func))


def main():
    fixture_path = sys.argv[1]
    with open(fixture_path) as f:
        fixture = json.load(f)

    kind = fixture["kind"]
    try:
        if kind == "intelligence":
            result = run_intelligence(fixture)
        elif kind == "attribution":
            result = run_attribution(fixture)
        elif kind == "direct_call":
            result = run_direct_call(fixture)
        else:
            raise ValueError("Unknown fixture kind: " + repr(kind))
        print(json.dumps({"ok": True, "result": result}))
    except Exception as exc:
        print(json.dumps({"ok": False, "error_type": type(exc).__name__, "error_message": str(exc)}))


if __name__ == "__main__":
    main()
