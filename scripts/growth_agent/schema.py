"""Data contract for the Growth Agent intelligence module.

Every dataclass here corresponds directly to a field in the approved
input/output contract. Nothing outside this file should define its own
ad hoc shape for these concepts.
"""

from dataclasses import dataclass, field
from typing import Optional, List


# -- Input contract ---------------------------------------------------------

@dataclass
class ReportMetadata:
    current_period_start: str   # ISO date, e.g. "2026-07-27"
    current_period_end: str
    previous_period_start: str
    previous_period_end: str
    property_id: str
    gsc_property: str


@dataclass
class Totals:
    users: int
    sessions: int
    engaged_sessions: int


@dataclass
class CommercialEventRow:
    event_name: str
    period: str            # "current" | "previous"
    event_count: int
    key_events: int
    sessions: int
    users: int


@dataclass
class CommercialEventByCourseRow:
    event_name: str
    course_id: Optional[str]     # None / "(not set)" both normalise to None - see pipeline.normalise_input
    course_name: Optional[str]
    course_category: Optional[str]
    event_count: int
    sessions: int
    users: int
    key_events: int
    period: str


@dataclass
class CommercialEventByIntentRow:
    event_name: str
    lead_intent: str        # "individual_training" | "team_training" | "corporate_training" | "(not set)"
    event_count: int
    key_events: int
    sessions: int
    users: int
    period: str


@dataclass
class CoursePageViewRow:
    course_id: Optional[str]
    course_name: Optional[str]
    event_count: int
    sessions: int
    users: int
    period: str


@dataclass
class GscQueryRow:
    query: str
    page: Optional[str]
    impressions: int
    clicks: int
    ctr: float
    average_position: float
    period: str              # current-period only is used in MVP; field kept for contract completeness


@dataclass
class IntelligenceModuleInput:
    report_metadata: ReportMetadata
    totals_current: Totals
    totals_previous: Totals
    commercial_events: List[CommercialEventRow] = field(default_factory=list)
    commercial_events_by_course: List[CommercialEventByCourseRow] = field(default_factory=list)
    commercial_events_by_intent: List[CommercialEventByIntentRow] = field(default_factory=list)
    course_page_views_by_course: List[CoursePageViewRow] = field(default_factory=list)
    gsc_queries: List[GscQueryRow] = field(default_factory=list)


# -- Shared value objects ----------------------------------------------------

@dataclass
class CutoverMatch:
    affected: bool
    cutover_id: Optional[str] = None


@dataclass
class ConfidenceResult:
    tier: str        # "insufficient" | "early_signal" | "directional" | "reliable"
    multiplier: float
    reason: str


@dataclass
class Evidence:
    metric: str
    value: float
    period: str       # "current" | "previous"
    source: str       # "GA4" | "GSC"


@dataclass
class PrimaryMetric:
    name: str
    current_value: float
    previous_value: Optional[float] = None
    change: Optional[float] = None


@dataclass
class SampleSize:
    unique_users: Optional[int] = None
    distinct_sessions: Optional[int] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    concentration_ratio: Optional[float] = None
    # True share of activity in the single busiest session/day. Must ONLY
    # be set when that value is actually supplied by input data - never
    # inferred from event_count/users. None means "unknown", not "zero".
    repetition_ratio: Optional[float] = None
    # Diagnostic-only metric: how much a users total was inflated by
    # repeat activity from the same conservative user-count estimate
    # (see opportunities._repetition_ratio). NEVER consulted by the
    # confidence governor or the suppression router - informational only.


@dataclass
class Scope:
    type: str    # "course" | "gsc_query" | "lead_intent"  (channel/country deliberately out of MVP)
    key: str
    label: str


# -- Output contract ----------------------------------------------------------

@dataclass
class Opportunity:
    opportunity_id: str
    opportunity_type: str
    scope: Scope
    raw_score: float
    confidence_tier: str
    confidence_multiplier: float
    final_score: float
    primary_metric: PrimaryMetric
    evidence: List[Evidence]
    sample_size: SampleSize
    cutover_affected: CutoverMatch
    business_context_required: bool
    business_context_note: Optional[str]
    recommendation: str
    rationale: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None


@dataclass
class SuppressedSignal:
    opportunity_id: str
    opportunity_type: str
    scope: Scope
    suppression_reason: str
    suppression_detail: str
    sample_size: SampleSize
    cutover_affected: CutoverMatch
    secondary_reasons: List[str] = field(default_factory=list)
    course_id: Optional[str] = None
    course_name: Optional[str] = None


@dataclass
class DataQualityFlag:
    flag_id: str
    flag_type: str
    description: str
    affected_scope: str
    severity: str    # "info" | "warning"


@dataclass
class TopAction:
    action_id: str
    opportunity_id: str     # foreign key into Output.opportunities - never freestanding
    headline: str
    rationale: str
    confidence_tier: str
    priority_rank: int


@dataclass
class DescriptiveEventSummary:
    event_name: str
    current: CommercialEventRow
    previous: Optional[CommercialEventRow]
    baseline_only: bool     # True if the current/previous comparison spans a known cutover


@dataclass
class DescriptiveSummary:
    totals_current: Totals
    totals_previous: Totals
    totals_comparison_valid: bool
    commercial_events: List[DescriptiveEventSummary] = field(default_factory=list)


@dataclass
class DiagnosticEntry:
    course_id: str
    course_name: Optional[str]
    evidence: List[Evidence]
    description: str


@dataclass
class Diagnostics:
    traffic_without_conversion: List[DiagnosticEntry] = field(default_factory=list)
    conversion_without_much_traffic: List[DiagnosticEntry] = field(default_factory=list)


@dataclass
class ReportMetadataOut:
    generated_at: str
    module_version: str
    current_period_start: str
    current_period_end: str
    previous_period_start: str
    previous_period_end: str


@dataclass
class IntelligenceOutput:
    report_metadata: ReportMetadataOut
    descriptive_summary: DescriptiveSummary
    diagnostics: Diagnostics
    opportunities: List[Opportunity] = field(default_factory=list)
    early_signals: List[Opportunity] = field(default_factory=list)
    suppressed_signals: List[SuppressedSignal] = field(default_factory=list)
    data_quality_flags: List[DataQualityFlag] = field(default_factory=list)
    top_actions: List[TopAction] = field(default_factory=list)
