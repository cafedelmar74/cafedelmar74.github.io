"""Top-level orchestration: run_intelligence_module(input, generated_at) ->
IntelligenceOutput.

This is the single public entrypoint. Everything else in this package is
an implementation detail reachable through here. The function is pure and
deterministic given identical inputs - it never reads the system clock
itself; generated_at is an explicit required argument supplied by the
caller (the eventual n8n wrapper).
"""

from datetime import date

from . import diagnostics as diagnostics_mod
from . import opportunities as opportunities_mod
from . import scoring as scoring_mod
from . import suppression as suppression_mod
from . import top_actions as top_actions_mod
from .schema import (
    IntelligenceOutput,
    ReportMetadataOut,
    DescriptiveSummary,
    DescriptiveEventSummary,
    Diagnostics,
    DataQualityFlag,
)

MODULE_VERSION = "0.1.0-mvp"


def _parse(iso_date):
    year, month, day = iso_date.split("-")
    return date(int(year), int(month), int(day))


def _normalise_course_id(value):
    if value is None:
        return None
    if value.strip() in ("", "(not set)"):
        return None
    return value


def normalise_input(input_data):
    for row in input_data.commercial_events_by_course:
        row.course_id = _normalise_course_id(row.course_id)
    for row in input_data.course_page_views_by_course:
        row.course_id = _normalise_course_id(row.course_id)
    return input_data


def _build_descriptive_summary(input_data):
    by_event = {}
    for row in input_data.commercial_events:
        by_event.setdefault(row.event_name, {})[row.period] = row

    summaries = []
    for event_name, periods in by_event.items():
        current = periods.get("current")
        previous = periods.get("previous")
        baseline_only = previous is None or previous.event_count == 0
        summaries.append(DescriptiveEventSummary(
            event_name=event_name,
            current=current,
            previous=previous,
            baseline_only=baseline_only,
        ))

    return DescriptiveSummary(
        totals_current=input_data.totals_current,
        totals_previous=input_data.totals_previous,
        totals_comparison_valid=input_data.totals_previous.sessions > 0,
        commercial_events=summaries,
    )


def _build_data_quality_flags(input_data):
    flags = []
    unattributed_rows = [
        row for row in input_data.commercial_events_by_course
        if row.course_id is None and row.period == "current"
    ]
    if unattributed_rows:
        total_unattributed = sum(row.event_count for row in unattributed_rows)
        flags.append(DataQualityFlag(
            flag_id="unattributed_course_events",
            flag_type="missing_course_attribution",
            description=(
                str(total_unattributed)
                + " commercial event occurrence(s) had no course_id and were excluded from course-level scoring."
            ),
            affected_scope="commercial_events_by_course",
            severity="info",
        ))
    return flags


def run_intelligence_module(input_data, generated_at):
    input_data = normalise_input(input_data)

    period_start = _parse(input_data.report_metadata.current_period_start)
    period_end = _parse(input_data.report_metadata.current_period_end)

    descriptive_summary = _build_descriptive_summary(input_data)

    diagnostics_out = Diagnostics(
        traffic_without_conversion=diagnostics_mod.detect_traffic_without_conversion(
            input_data.course_page_views_by_course, input_data.commercial_events_by_course
        ),
        conversion_without_much_traffic=diagnostics_mod.detect_conversion_without_much_traffic(
            input_data.course_page_views_by_course, input_data.commercial_events_by_course
        ),
    )

    candidates = []
    candidates += opportunities_mod.detect_course_opportunities(
        input_data.commercial_events_by_course, period_start, period_end
    )
    candidates += opportunities_mod.detect_lead_intent_opportunities(
        input_data.commercial_events_by_intent, period_start, period_end
    )
    candidates += opportunities_mod.detect_gsc_ctr_opportunities(input_data.gsc_queries)

    scored = [scoring_mod.score(candidate) for candidate in candidates]

    opportunities_list = []
    early_signals = []
    suppressed_signals = []
    for opportunity in scored:
        bucket, item = suppression_mod.route_opportunity(opportunity)
        if bucket == "opportunity":
            opportunities_list.append(item)
        elif bucket == "early_signal":
            early_signals.append(item)
        else:
            suppressed_signals.append(item)

    data_quality_flags = _build_data_quality_flags(input_data)
    top_actions = top_actions_mod.select_top_actions(opportunities_list)

    return IntelligenceOutput(
        report_metadata=ReportMetadataOut(
            generated_at=generated_at,
            module_version=MODULE_VERSION,
            current_period_start=input_data.report_metadata.current_period_start,
            current_period_end=input_data.report_metadata.current_period_end,
            previous_period_start=input_data.report_metadata.previous_period_start,
            previous_period_end=input_data.report_metadata.previous_period_end,
        ),
        descriptive_summary=descriptive_summary,
        diagnostics=diagnostics_out,
        opportunities=opportunities_list,
        early_signals=early_signals,
        suppressed_signals=suppressed_signals,
        data_quality_flags=data_quality_flags,
        top_actions=top_actions,
    )
