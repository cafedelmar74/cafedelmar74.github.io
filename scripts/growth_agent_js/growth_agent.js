"use strict";

/*
 * Growth Agent - JavaScript parity port of scripts/growth_agent/ (Python).
 *
 * Python remains the source of truth. This file mirrors the Python
 * package's module boundaries as function groups (section headers below),
 * preserves snake_case field names byte-for-byte, and preserves controlled
 * strings, ordering, and suppression/scoring behavior exactly.
 *
 * Self-contained: no npm dependencies, suitable for a single n8n Code node.
 */

// =============================================================================
// SECTION: compat helpers (Python <-> JS behavioral parity primitives)
// =============================================================================

// Python round() is round-half-to-even (bankers rounding); Math.round()
// always rounds half up. 0.5 (and any X.5 for small integers X) is exactly
// representable in binary float64, so exact equality against 0.5 here is
// safe for this domain (event/conversion counts), not a general-purpose
// float comparison - no epsilon needed.
function pythonRound(x) {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

// Mirrors a bare Python dict[key] access, which raises KeyError if missing.
// JS bracket access silently returns undefined instead, so this must be
// explicit to preserve fail-loudly parity.
function requireKey(obj, key, context) {
  if (obj === null || obj === undefined || !(key in obj)) {
    throw new Error("Missing required field '" + key + "' in " + context);
  }
  return obj[key];
}

// Mirrors Python dict.get(key), which returns None if the key is absent.
function getOrNull(obj, key) {
  if (obj === null || obj === undefined || !(key in obj)) return null;
  const value = obj[key];
  return value === undefined ? null : value;
}

// Mirrors Pythons int(value) on a string: strict, rejects decimals and
// non-digit content. Number("26.0") === 26 in JS (wrongly permissive), so
// this does NOT use Number()/parseInt() directly - it validates the string
// shape first, exactly as Pythons int() would reject "26.0" or "abc".
function coerceInt(value, context) {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    throw new Error("Cannot coerce to int: " + JSON.stringify(value) + " (" + context + ")");
  }
  return parseInt(value, 10);
}

// Mirrors Pythons round(float(value)) used for key_events/conversions:
// float() accepts decimal strings, int() would not.
function coerceKeyEvents(value, context) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Cannot coerce to float: " + JSON.stringify(value) + " (" + context + ")");
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error("Cannot coerce to float: " + JSON.stringify(value) + " (" + context + ")");
  }
  return pythonRound(num);
}

// Mirrors Pythons date(...) parsing of an ISO "YYYY-MM-DD" string via
// int(part) on each split segment - strict, fails loudly on malformed
// input rather than silently producing NaN/Invalid Date or Number("")===0.
function parseIsoDateMs(value) {
  if (typeof value !== "string") {
    throw new Error("Invalid ISO date string: " + JSON.stringify(value));
  }
  const parts = value.split("-");
  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p))) {
    throw new Error("Invalid ISO date string: " + JSON.stringify(value));
  }
  const [year, month, day] = parts.map(Number);
  return Date.UTC(year, month - 1, day);
}

function parseIsoDateMsOrNull(value) {
  if (value === null || value === undefined) return null;
  return parseIsoDateMs(value);
}

// Mirrors Pythons date(int(value[0:4]), int(value[4:6]), int(value[6:8]))
// for GA4s YYYYMMDD "date" dimension. Pythons int("") on a truncated
// slice raises ValueError; JSs Number("") === 0 (NOT NaN), so slices are
// validated as non-empty digit runs before conversion - otherwise a
// truncated date string would silently parse instead of failing loudly.
function parseGa4DateMs(value) {
  if (typeof value !== "string" || value.length < 8) {
    throw new Error("Invalid GA4 date string: " + JSON.stringify(value));
  }
  const yearStr = value.slice(0, 4);
  const monthStr = value.slice(4, 6);
  const dayStr = value.slice(6, 8);
  if (!/^\d{4}$/.test(yearStr) || !/^\d{2}$/.test(monthStr) || !/^\d{2}$/.test(dayStr)) {
    throw new Error("Invalid GA4 date string: " + JSON.stringify(value));
  }
  return Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
}

function isMissingCourseId(value) {
  if (value === null || value === undefined) return true;
  const stripped = String(value).trim();
  return stripped === "" || stripped === "(not set)";
}

// =============================================================================
// SECTION: config (mirrors config.py)
// =============================================================================

const GA4_CONFIDENCE_THRESHOLDS = {
  insufficient: { max_unique_users: 2, max_distinct_sessions: 1, concentration_ratio_ceiling: 0.7 },
  early_signal: { min_unique_users: 3, max_unique_users: 9, min_distinct_sessions: 2 },
  directional: { min_unique_users: 10, min_distinct_sessions: 5 },
  reliable: { min_unique_users: 30 },
};

const GSC_CONFIDENCE_THRESHOLDS = {
  insufficient: { max_impressions: 49 },
  early_signal: { min_impressions: 50, max_impressions: 299 },
  directional: { min_impressions: 300 },
  reliable: { min_impressions: 3000 },
};

const CONFIDENCE_MULTIPLIERS = {
  insufficient: 0.0,
  early_signal: 0.5,
  directional: 1.0,
  reliable: 1.0,
};

const TOP_ACTIONS_MAX = 5;
const GSC_CTR_UNDERPERFORMANCE_MAX_CTR = 0.02;

const CUTOVER_REGISTRY = [
  {
    cutover_id: "course_identity_migration",
    affected_scope: { events: ["booking_submitted", "brochure_download"], dimensions: ["course_id", "course_name"] },
    cutover_date: "2026-08-22",
    date_certainty: "approximate",
    date_range: ["2026-08-22", "2026-08-22"],
    basis: "observed_data_pattern",
    description: "course_id and course_name enrichment added to booking_submitted and brochure_download; verified via day-by-day eventCount vs course_id breakdown.",
  },
  {
    cutover_id: "lead_intent_rollout",
    affected_scope: { events: ["enquiry_submitted"], dimensions: ["lead_intent"] },
    cutover_date: "2026-08-24",
    date_certainty: "exact",
    date_range: null,
    basis: "documented_change",
    description: "lead_intent field added across all enquiry forms in commit 784968a.",
  },
  {
    cutover_id: "homepage_enquiry_tracking",
    affected_scope: { events: ["enquiry_submitted"], dimensions: ["form_location"] },
    cutover_date: "2026-08-24",
    date_certainty: "exact",
    date_range: null,
    basis: "documented_change",
    description: "Homepage enquiry form had no GA4 tracking at all before this date; commit 784968a added the first tracking call for it.",
  },
  {
    cutover_id: "key_event_registration_booking_submitted",
    affected_scope: { events: ["booking_submitted"], dimensions: ["key_events"] },
    cutover_date: "2026-08-03",
    date_certainty: "approximate",
    date_range: ["2026-08-01", "2026-08-03"],
    basis: "observed_data_pattern",
    description: "booking_submitted marked as a GA4 Key Event; inferred from eventCount versus conversions day-by-day breakdown, not a documented Admin change-log entry.",
  },
  {
    cutover_id: "key_event_registration_brochure_download",
    affected_scope: { events: ["brochure_download"], dimensions: ["key_events"] },
    cutover_date: "2026-08-02",
    date_certainty: "approximate",
    date_range: ["2026-08-01", "2026-08-02"],
    basis: "observed_data_pattern",
    description: "brochure_download marked as a GA4 Key Event; inferred the same way as the booking_submitted entry above.",
  },
  {
    cutover_id: "key_event_registration_calendar_download",
    affected_scope: { events: ["calendar_download"], dimensions: ["key_events"] },
    cutover_date: "2026-08-14",
    date_certainty: "approximate",
    date_range: ["2026-08-13", "2026-08-14"],
    basis: "observed_data_pattern",
    description: "calendar_download marked as a GA4 Key Event; inferred the same way as the booking_submitted entry above.",
  },
  {
    cutover_id: "key_event_registration_enquiry_submitted",
    affected_scope: { events: ["enquiry_submitted"], dimensions: ["key_events"] },
    cutover_date: null,
    date_certainty: "unknown",
    date_range: ["2026-08-14", "2026-08-23"],
    basis: "observed_data_pattern",
    description: "enquiry_submitted marked as a GA4 Key Event sometime in this window; no enquiry_submitted volume existed in the gap to pin an exact day.",
  },
];

const COURSE_ALIAS_MAP = {};

// =============================================================================
// SECTION: cutover_registry (mirrors cutover_registry.py)
// =============================================================================

function entryApplies(entry, eventName, dimension) {
  const events = entry.affected_scope.events;
  const dimensions = entry.affected_scope.dimensions;
  if (events !== "all" && !events.includes(eventName)) return false;
  if (!dimensions.includes(dimension)) return false;
  return true;
}

function periodOverlapsEntry(entry, periodStartMs, periodEndMs) {
  const certainty = entry.date_certainty;

  if (certainty === "unknown") {
    const dateRange = entry.date_range;
    if (dateRange === null || dateRange === undefined) return true;
    const earliestMs = parseIsoDateMs(dateRange[0]);
    const latestMs = parseIsoDateMs(dateRange[1]);
    return periodStartMs <= latestMs && periodEndMs >= earliestMs;
  }

  if (certainty === "exact") {
    const cutoverDateMs = parseIsoDateMsOrNull(entry.cutover_date);
    if (cutoverDateMs === null) return true;
    return periodStartMs < cutoverDateMs;
  }

  if (certainty === "approximate") {
    const dateRange = entry.date_range;
    if (dateRange === null || dateRange === undefined) return true;
    const latestMs = parseIsoDateMs(dateRange[1]);
    return periodStartMs < latestMs;
  }

  return true;
}

function isCutoverAffected(eventName, dimension, periodStartMs, periodEndMs) {
  for (const entry of CUTOVER_REGISTRY) {
    if (!entryApplies(entry, eventName, dimension)) continue;
    if (periodOverlapsEntry(entry, periodStartMs, periodEndMs)) {
      return { affected: true, cutover_id: entry.cutover_id };
    }
  }
  return { affected: false, cutover_id: null };
}

// =============================================================================
// SECTION: confidence (mirrors confidence.py)
// =============================================================================

function classifyGa4Confidence(uniqueUsers, distinctSessions, concentrationRatio, cutover) {
  const thresholds = GA4_CONFIDENCE_THRESHOLDS;

  if (cutover.affected) {
    return {
      tier: "insufficient",
      multiplier: CONFIDENCE_MULTIPLIERS.insufficient,
      reason: "cutover_affected:" + String(cutover.cutover_id),
    };
  }

  const insufficient = thresholds.insufficient;
  if (concentrationRatio !== null && concentrationRatio !== undefined && concentrationRatio > insufficient.concentration_ratio_ceiling) {
    return { tier: "insufficient", multiplier: CONFIDENCE_MULTIPLIERS.insufficient, reason: "high_concentration_ratio" };
  }
  if (uniqueUsers <= insufficient.max_unique_users || distinctSessions <= insufficient.max_distinct_sessions) {
    return { tier: "insufficient", multiplier: CONFIDENCE_MULTIPLIERS.insufficient, reason: "low_sample" };
  }

  const reliable = thresholds.reliable;
  if (uniqueUsers >= reliable.min_unique_users) {
    if (concentrationRatio === null || concentrationRatio === undefined) {
      return {
        tier: "directional",
        multiplier: CONFIDENCE_MULTIPLIERS.directional,
        reason: "reliable_floor_met_but_concentration_unknown",
      };
    }
    return { tier: "reliable", multiplier: CONFIDENCE_MULTIPLIERS.reliable, reason: "sample_meets_reliable_floor" };
  }

  const directional = thresholds.directional;
  if (uniqueUsers >= directional.min_unique_users && distinctSessions >= directional.min_distinct_sessions) {
    return { tier: "directional", multiplier: CONFIDENCE_MULTIPLIERS.directional, reason: "sample_meets_directional_floor" };
  }

  return {
    tier: "early_signal",
    multiplier: CONFIDENCE_MULTIPLIERS.early_signal,
    reason: "sample_above_insufficient_below_directional",
  };
}

function classifyGscConfidence(impressions, clicks) {
  const thresholds = GSC_CONFIDENCE_THRESHOLDS;

  const insufficient = thresholds.insufficient;
  if (impressions <= insufficient.max_impressions) {
    return { tier: "insufficient", multiplier: CONFIDENCE_MULTIPLIERS.insufficient, reason: "low_impressions" };
  }

  const reliable = thresholds.reliable;
  if (impressions >= reliable.min_impressions) {
    return { tier: "reliable", multiplier: CONFIDENCE_MULTIPLIERS.reliable, reason: "impressions_meet_reliable_floor" };
  }

  const directional = thresholds.directional;
  if (impressions >= directional.min_impressions) {
    return { tier: "directional", multiplier: CONFIDENCE_MULTIPLIERS.directional, reason: "impressions_meet_directional_floor" };
  }

  return {
    tier: "early_signal",
    multiplier: CONFIDENCE_MULTIPLIERS.early_signal,
    reason: "impressions_above_insufficient_below_directional",
  };
}

// =============================================================================
// SECTION: diagnostics (mirrors diagnostics.py)
// =============================================================================

const MIN_PAGE_VIEWS_FOR_TRAFFIC_WITHOUT_CONVERSION = 10;
const MIN_COMMERCIAL_EVENTS_FOR_CONVERSION_WITHOUT_TRAFFIC = 1;
const MAX_PAGE_VIEWS_FOR_CONVERSION_WITHOUT_TRAFFIC = 5;

function commercialTotalsByCourse(eventsByCourse) {
  const totals = new Map();
  for (const row of eventsByCourse) {
    if (row.course_id === null || row.period !== "current") continue;
    if (!totals.has(row.course_id)) totals.set(row.course_id, { event_count: 0, course_name: row.course_name });
    totals.get(row.course_id).event_count += row.event_count;
  }
  return totals;
}

function detectTrafficWithoutConversion(pageViewsByCourse, eventsByCourse) {
  const commercialTotals = commercialTotalsByCourse(eventsByCourse);
  const results = [];
  for (const row of pageViewsByCourse) {
    if (row.course_id === null || row.period !== "current") continue;
    if (row.event_count < MIN_PAGE_VIEWS_FOR_TRAFFIC_WITHOUT_CONVERSION) continue;
    const commercial = commercialTotals.get(row.course_id) || { event_count: 0, course_name: row.course_name };
    if (commercial.event_count > 0) continue;
    results.push({
      course_id: row.course_id,
      course_name: row.course_name,
      evidence: [
        { metric: "course_page_view.event_count", value: row.event_count, period: "current", source: "GA4" },
        { metric: "commercial_event_count", value: 0, period: "current", source: "GA4" },
      ],
      description: "Course page received meaningful traffic with no recorded commercial events in the current period.",
    });
  }
  return results;
}

function detectConversionWithoutMuchTraffic(pageViewsByCourse, eventsByCourse) {
  const pageViewsById = new Map();
  for (const row of pageViewsByCourse) {
    if (row.course_id === null || row.period !== "current") continue;
    pageViewsById.set(row.course_id, row.event_count);
  }

  const commercialTotals = commercialTotalsByCourse(eventsByCourse);
  const results = [];
  for (const [courseId, commercial] of commercialTotals) {
    if (commercial.event_count < MIN_COMMERCIAL_EVENTS_FOR_CONVERSION_WITHOUT_TRAFFIC) continue;
    const pageViews = pageViewsById.has(courseId) ? pageViewsById.get(courseId) : 0;
    if (pageViews > MAX_PAGE_VIEWS_FOR_CONVERSION_WITHOUT_TRAFFIC) continue;
    results.push({
      course_id: courseId,
      course_name: commercial.course_name,
      evidence: [
        { metric: "commercial_event_count", value: commercial.event_count, period: "current", source: "GA4" },
        { metric: "course_page_view.event_count", value: pageViews, period: "current", source: "GA4" },
      ],
      description: "Course generated commercial events with very little recorded page-view traffic in the current period.",
    });
  }
  return results;
}

// =============================================================================
// SECTION: opportunities (mirrors opportunities.py)
// =============================================================================

const PENDING_TIER = "pending";
const PENDING_MULTIPLIER = 0.0;
const PENDING_SCORE = 0.0;

const INTENT_OPPORTUNITY_TYPES = {
  corporate_training: "corporate_intent_signal",
  team_training: "team_intent_signal",
};

function repetitionRatio(users, eventCount) {
  if (eventCount <= 0) return null;
  return Math.max(0.0, 1.0 - users / eventCount);
}

function rawScoreFromEventCount(eventCount) {
  if (eventCount >= 5) return 2;
  if (eventCount >= 2) return 1;
  return 0;
}

function newBucket(courseName) {
  return {
    course_name: courseName === undefined ? null : courseName,
    event_count: 0,
    key_events: 0,
    sessions: 0,
    users: 0,
    event_names: new Set(),
  };
}

function accumulate(bucket, row) {
  bucket.event_count += row.event_count;
  bucket.key_events += row.key_events;
  bucket.sessions += row.sessions;
  bucket.users = Math.max(bucket.users, row.users);
  bucket.event_names.add(row.event_name);
}

function detectCourseOpportunities(eventsByCourse, periodStartMs, periodEndMs) {
  const grouped = new Map();
  for (const row of eventsByCourse) {
    if (row.course_id === null || row.period !== "current") continue;
    if (!grouped.has(row.course_id)) grouped.set(row.course_id, newBucket(row.course_name));
    accumulate(grouped.get(row.course_id), row);
  }

  const results = [];
  for (const [courseId, agg] of grouped) {
    if (agg.event_count <= 0) continue;

    let cutover = { affected: false, cutover_id: null };
    for (const eventName of agg.event_names) {
      const match = isCutoverAffected(eventName, "course_id", periodStartMs, periodEndMs);
      if (match.affected) {
        cutover = match;
        break;
      }
    }

    results.push({
      opportunity_id: "course_momentum:" + courseId,
      opportunity_type: "course_momentum",
      scope: { type: "course", key: courseId, label: agg.course_name || courseId },
      raw_score: rawScoreFromEventCount(agg.event_count),
      confidence_tier: PENDING_TIER,
      confidence_multiplier: PENDING_MULTIPLIER,
      final_score: PENDING_SCORE,
      primary_metric: { name: "commercial_event_count", current_value: agg.event_count, previous_value: null, change: null },
      evidence: [
        { metric: "commercial_event_count", value: agg.event_count, period: "current", source: "GA4" },
        { metric: "commercial_key_events", value: agg.key_events, period: "current", source: "GA4" },
        { metric: "commercial_sessions", value: agg.sessions, period: "current", source: "GA4" },
        { metric: "commercial_users_conservative_max", value: agg.users, period: "current", source: "GA4" },
        { metric: "repetition_ratio", value: repetitionRatio(agg.users, agg.event_count) ?? 0.0, period: "current", source: "GA4" },
      ],
      sample_size: {
        unique_users: agg.users,
        distinct_sessions: agg.sessions,
        concentration_ratio: null,
        repetition_ratio: repetitionRatio(agg.users, agg.event_count),
        impressions: null,
        clicks: null,
      },
      cutover_affected: cutover,
      business_context_required: true,
      business_context_note: "Verify upcoming session availability before promoting this course.",
      recommendation: "",
      rationale: "",
      course_id: courseId,
      course_name: agg.course_name,
    });
  }
  return results;
}

function detectLeadIntentOpportunities(eventsByIntent, periodStartMs, periodEndMs) {
  const grouped = new Map();
  for (const row of eventsByIntent) {
    if (row.period !== "current") continue;
    if (!(row.lead_intent in INTENT_OPPORTUNITY_TYPES)) continue;
    if (!grouped.has(row.lead_intent)) grouped.set(row.lead_intent, newBucket());
    accumulate(grouped.get(row.lead_intent), row);
  }

  const results = [];
  for (const [intent, agg] of grouped) {
    if (agg.event_count <= 0) continue;

    let cutover = { affected: false, cutover_id: null };
    for (const eventName of agg.event_names) {
      const match = isCutoverAffected(eventName, "lead_intent", periodStartMs, periodEndMs);
      if (match.affected) {
        cutover = match;
        break;
      }
    }

    const label = intent
      .split("_")
      .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
      .join(" ");

    results.push({
      opportunity_id: "lead_intent:" + intent,
      opportunity_type: INTENT_OPPORTUNITY_TYPES[intent],
      scope: { type: "lead_intent", key: intent, label: label },
      raw_score: rawScoreFromEventCount(agg.event_count),
      confidence_tier: PENDING_TIER,
      confidence_multiplier: PENDING_MULTIPLIER,
      final_score: PENDING_SCORE,
      primary_metric: { name: "event_count", current_value: agg.event_count, previous_value: null, change: null },
      evidence: [
        { metric: "event_count", value: agg.event_count, period: "current", source: "GA4" },
        { metric: "key_events", value: agg.key_events, period: "current", source: "GA4" },
        { metric: "sessions", value: agg.sessions, period: "current", source: "GA4" },
        { metric: "users_conservative_max", value: agg.users, period: "current", source: "GA4" },
        { metric: "repetition_ratio", value: repetitionRatio(agg.users, agg.event_count) ?? 0.0, period: "current", source: "GA4" },
      ],
      sample_size: {
        unique_users: agg.users,
        distinct_sessions: agg.sessions,
        concentration_ratio: null,
        repetition_ratio: repetitionRatio(agg.users, agg.event_count),
        impressions: null,
        clicks: null,
      },
      cutover_affected: cutover,
      business_context_required: false,
      business_context_note: null,
      recommendation: "",
      rationale: "",
      course_id: null,
      course_name: null,
    });
  }
  return results;
}

function detectGscCtrOpportunities(gscQueries) {
  const maxCtr = GSC_CTR_UNDERPERFORMANCE_MAX_CTR;
  const directionalFloor = GSC_CONFIDENCE_THRESHOLDS.directional.min_impressions;

  const results = [];
  for (const row of gscQueries) {
    if (row.period !== "current") continue;
    if (row.ctr > maxCtr) continue;

    const rawScore = row.impressions >= 1000 ? 2 : row.impressions >= directionalFloor ? 1 : 0;

    results.push({
      opportunity_id: "gsc_ctr:" + row.query,
      opportunity_type: "ctr_underperformance",
      scope: { type: "gsc_query", key: row.query, label: "Search query: " + row.query },
      raw_score: rawScore,
      confidence_tier: PENDING_TIER,
      confidence_multiplier: PENDING_MULTIPLIER,
      final_score: PENDING_SCORE,
      primary_metric: { name: "ctr", current_value: row.ctr, previous_value: null, change: null },
      evidence: [
        { metric: "impressions", value: row.impressions, period: "current", source: "GSC" },
        { metric: "clicks", value: row.clicks, period: "current", source: "GSC" },
        { metric: "average_position", value: row.average_position, period: "current", source: "GSC" },
      ],
      sample_size: {
        unique_users: null,
        distinct_sessions: null,
        concentration_ratio: null,
        repetition_ratio: null,
        impressions: row.impressions,
        clicks: row.clicks,
      },
      cutover_affected: { affected: false, cutover_id: null },
      business_context_required: false,
      business_context_note: null,
      recommendation: "",
      rationale: "",
      course_id: null,
      course_name: null,
    });
  }
  return results;
}

// =============================================================================
// SECTION: scoring (mirrors scoring.py)
// =============================================================================

function isGscOpportunity(opportunity) {
  return opportunity.sample_size.impressions !== null && opportunity.sample_size.impressions !== undefined;
}

// Python's repetition_ratio is a genuine float (division always produces a
// float in Python 3), so str() on a whole-number value like 0.0 renders
// "0.0". JS has one numeric type, so String(0) renders "0" - this
// reproduces Python's str(float) rendering for that one proven-divergent
// metric only, without touching formatting for the other (genuinely
// integer-typed in Python) evidence metrics.
function pyFloatStr(x) {
  return Number.isInteger(x) ? x.toFixed(1) : String(x);
}

function evidenceValueText(evidence) {
  if (evidence.metric === "repetition_ratio") return pyFloatStr(evidence.value);
  return String(evidence.value);
}

function evidenceText(opportunity) {
  return opportunity.evidence.map((e) => e.metric + "=" + evidenceValueText(e)).join("; ");
}

function buildRecommendation(opportunity) {
  const evidenceTextStr = evidenceText(opportunity);
  if (opportunity.opportunity_type === "course_momentum") {
    const subject = opportunity.course_name || opportunity.course_id;
    return "Review " + subject + " for promotion this week (" + evidenceTextStr + ").";
  }
  if (opportunity.opportunity_type === "corporate_intent_signal" || opportunity.opportunity_type === "team_intent_signal") {
    return "Follow up on " + opportunity.scope.label + " enquiries this week (" + evidenceTextStr + ").";
  }
  if (opportunity.opportunity_type === "ctr_underperformance") {
    return "Review search listing presentation for " + opportunity.scope.label + " (" + evidenceTextStr + ").";
  }
  return "Review " + opportunity.scope.label + " (" + evidenceTextStr + ").";
}

function buildRationale(opportunity) {
  return "Confidence tier " + opportunity.confidence_tier + " based on evidence: " + evidenceText(opportunity) + ".";
}

function score(opportunity) {
  let result;
  if (isGscOpportunity(opportunity)) {
    result = classifyGscConfidence(opportunity.sample_size.impressions, opportunity.sample_size.clicks);
  } else {
    result = classifyGa4Confidence(
      opportunity.sample_size.unique_users || 0,
      opportunity.sample_size.distinct_sessions || 0,
      opportunity.sample_size.concentration_ratio,
      opportunity.cutover_affected
    );
  }

  opportunity.confidence_tier = result.tier;
  opportunity.confidence_multiplier = result.multiplier;
  opportunity.final_score = opportunity.raw_score * result.multiplier;

  if (opportunity.evidence.length > 0) {
    opportunity.recommendation = buildRecommendation(opportunity);
    opportunity.rationale = buildRationale(opportunity);
  } else {
    opportunity.recommendation = "";
    opportunity.rationale = "";
  }

  return opportunity;
}

// =============================================================================
// SECTION: suppression (mirrors suppression.py)
// =============================================================================

function applicableReasons(opportunity) {
  const reasons = [];

  if (opportunity.cutover_affected.affected) {
    reasons.push(["known_tracking_cutover", "Cutover: " + String(opportunity.cutover_affected.cutover_id)]);
  }

  const ceiling = GA4_CONFIDENCE_THRESHOLDS.insufficient.concentration_ratio_ceiling;
  const ratio = opportunity.sample_size.concentration_ratio;
  if (ratio !== null && ratio !== undefined && ratio > ceiling) {
    reasons.push(["suspected_test_activity", "concentration_ratio=" + String(ratio)]);
  }

  if (reasons.length === 0) {
    reasons.push(["insufficient_sample", "Sample size below the confidence floor."]);
  }

  return reasons;
}

function routeOpportunity(opportunity) {
  if (opportunity.confidence_tier === "insufficient") {
    const reasons = applicableReasons(opportunity);
    const primaryReason = reasons[0][0];
    const primaryDetail = reasons[0][1];
    const secondaryReasons = reasons.slice(1).map((r) => r[0]);
    return [
      "suppressed",
      {
        opportunity_id: opportunity.opportunity_id,
        opportunity_type: opportunity.opportunity_type,
        scope: opportunity.scope,
        suppression_reason: primaryReason,
        suppression_detail: primaryDetail,
        sample_size: opportunity.sample_size,
        cutover_affected: opportunity.cutover_affected,
        secondary_reasons: secondaryReasons,
        course_id: opportunity.course_id,
        course_name: opportunity.course_name,
      },
    ];
  }
  if (opportunity.confidence_tier === "early_signal") {
    return ["early_signal", opportunity];
  }
  return ["opportunity", opportunity];
}

// =============================================================================
// SECTION: top_actions (mirrors top_actions.py)
// =============================================================================

const ELIGIBLE_TIERS = ["directional", "reliable"];

function selectTopActions(opportunities) {
  const eligible = opportunities.filter(
    (o) => ELIGIBLE_TIERS.includes(o.confidence_tier) && o.evidence.length > 0 && o.final_score > 0 && o.recommendation
  );
  // Stable descending sort; must NOT be implemented as ascending-sort-then-
  // reverse (that flips tie order relative to Pythons stable reverse=True).
  eligible.sort((a, b) => b.final_score - a.final_score);

  const selected = eligible.slice(0, TOP_ACTIONS_MAX);

  return selected.map((opportunity, index) => ({
    action_id: "action_" + String(index + 1),
    opportunity_id: opportunity.opportunity_id,
    headline: opportunity.recommendation,
    rationale: opportunity.rationale,
    confidence_tier: opportunity.confidence_tier,
    priority_rank: index + 1,
  }));
}

// =============================================================================
// SECTION: pipeline (mirrors pipeline.py)
// =============================================================================

const MODULE_VERSION = "0.1.0-mvp";

function normaliseCourseIdField(value) {
  if (value === null || value === undefined) return null;
  const stripped = String(value).trim();
  if (stripped === "" || stripped === "(not set)") return null;
  return value;
}

function normaliseInput(inputData) {
  for (const row of inputData.commercial_events_by_course) {
    row.course_id = normaliseCourseIdField(row.course_id);
  }
  for (const row of inputData.course_page_views_by_course) {
    row.course_id = normaliseCourseIdField(row.course_id);
  }
  return inputData;
}

function buildDescriptiveSummary(inputData) {
  const byEvent = new Map();
  for (const row of inputData.commercial_events) {
    if (!byEvent.has(row.event_name)) byEvent.set(row.event_name, {});
    byEvent.get(row.event_name)[row.period] = row;
  }

  const summaries = [];
  for (const [eventName, periods] of byEvent) {
    const current = periods.current || null;
    const previous = periods.previous || null;
    const baselineOnly = previous === null || previous.event_count === 0;
    summaries.push({
      event_name: eventName,
      current: current,
      previous: previous,
      baseline_only: baselineOnly,
    });
  }

  return {
    totals_current: inputData.totals_current,
    totals_previous: inputData.totals_previous,
    totals_comparison_valid: inputData.totals_previous.sessions > 0,
    commercial_events: summaries,
  };
}

function buildDataQualityFlags(inputData) {
  const flags = [];
  const unattributedRows = inputData.commercial_events_by_course.filter(
    (row) => row.course_id === null && row.period === "current"
  );
  if (unattributedRows.length > 0) {
    const totalUnattributed = unattributedRows.reduce((sum, row) => sum + row.event_count, 0);
    flags.push({
      flag_id: "unattributed_course_events",
      flag_type: "missing_course_attribution",
      description:
        String(totalUnattributed) +
        " commercial event occurrence(s) had no course_id and were excluded from course-level scoring.",
      affected_scope: "commercial_events_by_course",
      severity: "info",
    });
  }
  return flags;
}

function runIntelligenceModule(inputDataRaw, generatedAt) {
  const inputData = normaliseInput(inputDataRaw);

  const periodStartMs = parseIsoDateMs(inputData.report_metadata.current_period_start);
  const periodEndMs = parseIsoDateMs(inputData.report_metadata.current_period_end);

  const descriptiveSummary = buildDescriptiveSummary(inputData);

  const diagnosticsOut = {
    traffic_without_conversion: detectTrafficWithoutConversion(
      inputData.course_page_views_by_course,
      inputData.commercial_events_by_course
    ),
    conversion_without_much_traffic: detectConversionWithoutMuchTraffic(
      inputData.course_page_views_by_course,
      inputData.commercial_events_by_course
    ),
  };

  let candidates = [];
  candidates = candidates.concat(detectCourseOpportunities(inputData.commercial_events_by_course, periodStartMs, periodEndMs));
  candidates = candidates.concat(
    detectLeadIntentOpportunities(inputData.commercial_events_by_intent, periodStartMs, periodEndMs)
  );
  candidates = candidates.concat(detectGscCtrOpportunities(inputData.gsc_queries || []));

  const scored = candidates.map((c) => score(c));

  const opportunitiesList = [];
  const earlySignals = [];
  const suppressedSignals = [];
  for (const opportunity of scored) {
    const [bucket, item] = routeOpportunity(opportunity);
    if (bucket === "opportunity") opportunitiesList.push(item);
    else if (bucket === "early_signal") earlySignals.push(item);
    else suppressedSignals.push(item);
  }

  const dataQualityFlags = buildDataQualityFlags(inputData);
  const topActionsResult = selectTopActions(opportunitiesList);

  return {
    report_metadata: {
      generated_at: generatedAt,
      module_version: MODULE_VERSION,
      current_period_start: inputData.report_metadata.current_period_start,
      current_period_end: inputData.report_metadata.current_period_end,
      previous_period_start: inputData.report_metadata.previous_period_start,
      previous_period_end: inputData.report_metadata.previous_period_end,
    },
    descriptive_summary: descriptiveSummary,
    diagnostics: diagnosticsOut,
    opportunities: opportunitiesList,
    early_signals: earlySignals,
    suppressed_signals: suppressedSignals,
    data_quality_flags: dataQualityFlags,
    top_actions: topActionsResult,
  };
}

// =============================================================================
// SECTION: ga4_adapter (mirrors ga4_adapter.py)
// =============================================================================

const KNOWN_COMMERCIAL_EVENTS = ["booking_submitted", "enquiry_submitted", "brochure_download", "calendar_download"];
const KNOWN_COMMERCIAL_EVENTS_SET = new Set(KNOWN_COMMERCIAL_EVENTS);

function extractRows(raw) {
  const dimensionNames = (raw.dimension_headers || []).map((h) => h.name);
  const metricNames = (raw.metric_headers || []).map((h) => h.name);
  const pairs = [];
  for (const row of raw.rows || []) {
    const dimValues = row.dimension_values || [];
    const metricValues = row.metric_values || [];
    const dims = {};
    dimensionNames.forEach((name, i) => {
      dims[name] = dimValues[i].value;
    });
    const metrics = {};
    metricNames.forEach((name, i) => {
      metrics[name] = metricValues[i].value;
    });
    pairs.push([dims, metrics]);
  }
  return pairs;
}

function requireKnownEvent(eventName) {
  if (!KNOWN_COMMERCIAL_EVENTS_SET.has(eventName)) {
    throw new Error("Unknown commercial event name: " + JSON.stringify(eventName));
  }
}

function parseTotals(raw) {
  const rows = extractRows(raw);
  if (rows.length === 0) {
    return { users: 0, sessions: 0, engaged_sessions: 0 };
  }
  const metrics = rows[0][1];
  return {
    users: coerceInt(requireKey(metrics, "totalUsers", "totals row"), "totalUsers"),
    sessions: coerceInt(requireKey(metrics, "sessions", "totals row"), "sessions"),
    engaged_sessions: coerceInt(requireKey(metrics, "engagedSessions", "totals row"), "engagedSessions"),
  };
}

function parseCommercialEvents(raw, period) {
  const rows = extractRows(raw);
  const byEvent = new Map();
  for (const [dims, metrics] of rows) {
    const eventName = requireKey(dims, "eventName", "commercial event row");
    requireKnownEvent(eventName);
    byEvent.set(eventName, {
      event_name: eventName,
      period: period,
      event_count: coerceInt(requireKey(metrics, "eventCount", "commercial event row"), "eventCount"),
      key_events: coerceKeyEvents(requireKey(metrics, "conversions", "commercial event row"), "conversions"),
      sessions: coerceInt(requireKey(metrics, "sessions", "commercial event row"), "sessions"),
      users: coerceInt(requireKey(metrics, "totalUsers", "commercial event row"), "totalUsers"),
    });
  }
  for (const eventName of KNOWN_COMMERCIAL_EVENTS) {
    if (!byEvent.has(eventName)) {
      byEvent.set(eventName, { event_name: eventName, period: period, event_count: 0, key_events: 0, sessions: 0, users: 0 });
    }
  }
  return Array.from(byEvent.keys())
    .sort()
    .map((name) => byEvent.get(name));
}

function parseCommercialEventsByCourse(raw) {
  const rows = extractRows(raw);
  const result = [];
  for (const [dims, metrics] of rows) {
    const eventName = requireKey(dims, "eventName", "commercial-by-course row");
    requireKnownEvent(eventName);
    result.push({
      event_name: eventName,
      course_id: requireKey(dims, "customEvent:course_id", "commercial-by-course row"),
      course_name: requireKey(dims, "customEvent:course_name", "commercial-by-course row"),
      course_category: requireKey(dims, "customEvent:course_category", "commercial-by-course row"),
      event_count: coerceInt(requireKey(metrics, "eventCount", "commercial-by-course row"), "eventCount"),
      key_events: coerceKeyEvents(requireKey(metrics, "conversions", "commercial-by-course row"), "conversions"),
      sessions: coerceInt(requireKey(metrics, "sessions", "commercial-by-course row"), "sessions"),
      users: coerceInt(requireKey(metrics, "totalUsers", "commercial-by-course row"), "totalUsers"),
      period: "current",
    });
  }
  return result;
}

function parseLeadIntent(raw) {
  const rows = extractRows(raw);
  const result = [];
  for (const [dims, metrics] of rows) {
    result.push({
      event_name: "enquiry_submitted",
      lead_intent: requireKey(dims, "customEvent:lead_intent", "lead-intent row"),
      event_count: coerceInt(requireKey(metrics, "eventCount", "lead-intent row"), "eventCount"),
      key_events: coerceKeyEvents(requireKey(metrics, "conversions", "lead-intent row"), "conversions"),
      sessions: coerceInt(requireKey(metrics, "sessions", "lead-intent row"), "sessions"),
      users: coerceInt(requireKey(metrics, "totalUsers", "lead-intent row"), "totalUsers"),
      period: "current",
    });
  }
  return result;
}

function parseCoursePageViews(raw) {
  const rows = extractRows(raw);
  const result = [];
  for (const [dims, metrics] of rows) {
    result.push({
      course_id: requireKey(dims, "customEvent:course_id", "course-page-view row"),
      course_name: requireKey(dims, "customEvent:course_name", "course-page-view row"),
      event_count: coerceInt(requireKey(metrics, "eventCount", "course-page-view row"), "eventCount"),
      sessions: coerceInt(requireKey(metrics, "sessions", "course-page-view row"), "sessions"),
      users: coerceInt(requireKey(metrics, "totalUsers", "course-page-view row"), "totalUsers"),
      period: "current",
    });
  }
  return result;
}

// Options-object calling convention (idiomatic for a many-param JS
// function; Pythons build_intelligence_input takes the equivalent
// values as explicit positional/keyword params). Keys are the exact
// snake_case Python parameter names so the mapping is 1:1 and obvious.
function buildIntelligenceInput(options) {
  const reportMetadata = {
    current_period_start: options.current_period_start,
    current_period_end: options.current_period_end,
    previous_period_start: options.previous_period_start,
    previous_period_end: options.previous_period_end,
    property_id: options.property_id !== undefined ? options.property_id : "303311854",
    gsc_property: options.gsc_property !== undefined ? options.gsc_property : "londonpetroacademy.co.uk",
  };

  const totalsCurrent = parseTotals(options.totals_current_raw);
  const totalsPrevious = parseTotals(options.totals_previous_raw);

  const commercialEvents = parseCommercialEvents(options.commercial_events_current_raw, "current").concat(
    parseCommercialEvents(options.commercial_events_previous_raw, "previous")
  );

  const commercialEventsByCourse = parseCommercialEventsByCourse(options.commercial_events_by_course_raw);
  const commercialEventsByIntent = parseLeadIntent(options.lead_intent_raw);
  const coursePageViewsByCourse = parseCoursePageViews(options.course_page_views_raw);

  return {
    report_metadata: reportMetadata,
    totals_current: totalsCurrent,
    totals_previous: totalsPrevious,
    commercial_events: commercialEvents,
    commercial_events_by_course: commercialEventsByCourse,
    commercial_events_by_intent: commercialEventsByIntent,
    course_page_views_by_course: coursePageViewsByCourse,
    gsc_queries: options.gsc_queries !== undefined && options.gsc_queries !== null ? options.gsc_queries : [],
  };
}

// =============================================================================
// SECTION: attribution_quality (mirrors attribution_quality.py)
//
// Standalone: never reads scoring/opportunities/confidence/suppression
// output or state. Its own extractRows is a local copy of ga4_adapters,
// matching the Python modules own deliberate duplication. Its only
// dependency on the rest of this file is a read-only lookup into
// CUTOVER_REGISTRY for course_identity_migrations cutover_date.
// =============================================================================

const MIGRATION_CUTOVER_ID = "course_identity_migration";
const ROW_SCOPED_EVENTS = new Set(["booking_submitted", "brochure_download"]);
const EXPECTED_ENQUIRY_FORM_LOCATIONS = new Set(["homepage", "contact_page"]);

function migrationBoundaryDateMs() {
  for (const entry of CUTOVER_REGISTRY) {
    if (entry.cutover_id === MIGRATION_CUTOVER_ID) {
      return parseIsoDateMs(entry.cutover_date);
    }
  }
  throw new Error(MIGRATION_CUTOVER_ID + " entry not found in CUTOVER_REGISTRY");
}

function classifyAttributionRow(eventName, courseId, formLocation, dateStr, migrationBoundaryMs) {
  if (!isMissingCourseId(courseId)) return null;

  if (eventName === "calendar_download") return "expected";

  if (eventName === "enquiry_submitted") {
    if (EXPECTED_ENQUIRY_FORM_LOCATIONS.has(formLocation)) return "expected";
    return "unexpected";
  }

  if (ROW_SCOPED_EVENTS.has(eventName)) {
    let eventDateMs;
    try {
      eventDateMs = parseGa4DateMs(dateStr);
    } catch (e) {
      return "unexpected";
    }
    if (eventDateMs <= migrationBoundaryMs) return "cutover";
    return "unexpected";
  }

  return "unexpected";
}

function classifyAttributionQuality(raw) {
  const migrationBoundaryMs = migrationBoundaryDateMs();
  const rows = extractRows(raw);

  const byEvent = new Map();
  const totals = { expected: 0, cutover: 0, unexpected: 0 };

  for (const [dims, metrics] of rows) {
    const eventName = getOrNull(dims, "eventName");
    const courseId = getOrNull(dims, "customEvent:course_id");
    const formLocation = getOrNull(dims, "customEvent:form_location");
    const dateStr = getOrNull(dims, "date");
    const eventCount = coerceInt(requireKey(metrics, "eventCount", "attribution-quality row"), "eventCount");

    const classification = classifyAttributionRow(eventName, courseId, formLocation, dateStr, migrationBoundaryMs);
    if (classification === null) continue;

    if (!byEvent.has(eventName)) byEvent.set(eventName, { expected: 0, cutover: 0, unexpected: 0 });
    const bucket = byEvent.get(eventName);
    bucket[classification] += eventCount;
    totals[classification] += eventCount;
  }

  return {
    expected_unattributed_count: totals.expected,
    cutover_unattributed_count: totals.cutover,
    unexpected_unattributed_count: totals.unexpected,
    by_event_name: Object.fromEntries(byEvent),
  };
}

// =============================================================================
// SECTION: run_growth_agent convenience entrypoint (n8n Code node shape)
//
// Attribution-quality output is a sibling of intelligence output and must
// never feed scoring - enforced structurally here by simply never passing
// attributionQualitySummary into runIntelligenceModule or any of its
// inputs.
// =============================================================================

function runGrowthAgent(payload) {
  const scoringInput = buildIntelligenceInput({
    current_period_start: payload.period.current_start,
    current_period_end: payload.period.current_end,
    previous_period_start: payload.period.previous_start,
    previous_period_end: payload.period.previous_end,
    totals_current_raw: payload.scoring_input.totals_current_raw,
    totals_previous_raw: payload.scoring_input.totals_previous_raw,
    commercial_events_current_raw: payload.scoring_input.commercial_events_current_raw,
    commercial_events_previous_raw: payload.scoring_input.commercial_events_previous_raw,
    commercial_events_by_course_raw: payload.scoring_input.commercial_events_by_course_raw,
    lead_intent_raw: payload.scoring_input.lead_intent_raw,
    course_page_views_raw: payload.scoring_input.course_page_views_raw,
    gsc_queries: payload.scoring_input.gsc_queries,
    property_id: payload.property_id,
    gsc_property: payload.gsc_property,
  });

  const intelligenceOutput = runIntelligenceModule(scoringInput, payload.generated_at);

  let attributionQualitySummary = null;
  if (payload.attribution_quality_input && payload.attribution_quality_input.attribution_quality_rows_raw) {
    attributionQualitySummary = classifyAttributionQuality(payload.attribution_quality_input.attribution_quality_rows_raw);
  }

  return {
    intelligenceOutput: intelligenceOutput,
    attributionQualitySummary: attributionQualitySummary,
  };
}

// =============================================================================
// exports
// =============================================================================

module.exports = {
  // compat helpers (exposed for JS-native unit tests)
  pythonRound,
  requireKey,
  getOrNull,
  coerceInt,
  coerceKeyEvents,
  parseIsoDateMs,
  parseIsoDateMsOrNull,
  parseGa4DateMs,
  isMissingCourseId,
  // config
  GA4_CONFIDENCE_THRESHOLDS,
  GSC_CONFIDENCE_THRESHOLDS,
  CONFIDENCE_MULTIPLIERS,
  TOP_ACTIONS_MAX,
  GSC_CTR_UNDERPERFORMANCE_MAX_CTR,
  CUTOVER_REGISTRY,
  COURSE_ALIAS_MAP,
  // cutover_registry
  isCutoverAffected,
  // confidence
  classifyGa4Confidence,
  classifyGscConfidence,
  // diagnostics
  detectTrafficWithoutConversion,
  detectConversionWithoutMuchTraffic,
  // opportunities
  detectCourseOpportunities,
  detectLeadIntentOpportunities,
  detectGscCtrOpportunities,
  // scoring
  score,
  // suppression
  routeOpportunity,
  // top_actions
  selectTopActions,
  // pipeline
  normaliseInput,
  run_intelligence_module: runIntelligenceModule,
  runIntelligenceModule,
  // ga4_adapter
  build_intelligence_input: buildIntelligenceInput,
  buildIntelligenceInput,
  // attribution_quality
  classify_attribution_quality: classifyAttributionQuality,
  classifyAttributionQuality,
  migrationBoundaryDateMs,
  // convenience
  run_growth_agent: runGrowthAgent,
  runGrowthAgent,
};
