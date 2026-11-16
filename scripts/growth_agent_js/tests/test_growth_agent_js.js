"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ga = require("../growth_agent.js");

function rawResponse(dimensionNames, metricNames, rows) {
  return {
    dimension_headers: dimensionNames.map((name) => ({ name })),
    metric_headers: metricNames.map((name) => ({ name })),
    rows: rows.map((r) => ({
      dimension_values: r.dims.map((value) => ({ value })),
      metric_values: r.metrics.map((value) => ({ value })),
    })),
    row_count: rows.length,
  };
}

function zeroRows(dimensionNames, metricNames) {
  return rawResponse(dimensionNames, metricNames, []);
}

// =============================================================================
// pythonRound: half-to-even rounding
// =============================================================================

test("pythonRound: 0.5 rounds to 0 (half-to-even)", () => {
  assert.equal(ga.pythonRound(0.5), 0);
});

test("pythonRound: 1.5 rounds to 2 (half-to-even)", () => {
  assert.equal(ga.pythonRound(1.5), 2);
});

test("pythonRound: 2.5 rounds to 2 (half-to-even)", () => {
  assert.equal(ga.pythonRound(2.5), 2);
});

test("pythonRound: 3.5 rounds to 4 (half-to-even)", () => {
  assert.equal(ga.pythonRound(3.5), 4);
});

test("pythonRound: -0.5 rounds to 0 (half-to-even)", () => {
  assert.equal(ga.pythonRound(-0.5), 0);
});

test("pythonRound: -1.5 rounds to -2 (half-to-even)", () => {
  assert.equal(ga.pythonRound(-1.5), -2);
});

test("pythonRound: -2.5 rounds to -2 (half-to-even)", () => {
  assert.equal(ga.pythonRound(-2.5), -2);
});

test("pythonRound: non-half values round normally", () => {
  assert.equal(ga.pythonRound(2.3), 2);
  assert.equal(ga.pythonRound(2.7), 3);
  assert.equal(ga.pythonRound(0), 0);
});

// =============================================================================
// strict integer / key_events coercion
// =============================================================================

test("coerceInt: accepts plain integer strings, including negative", () => {
  assert.equal(ga.coerceInt("26", "ctx"), 26);
  assert.equal(ga.coerceInt("-7", "ctx"), -7);
  assert.equal(ga.coerceInt("0", "ctx"), 0);
});

test("coerceInt: rejects decimal strings (Python int() would raise)", () => {
  assert.throws(() => ga.coerceInt("26.0", "ctx"));
});

test("coerceInt: rejects non-numeric and empty strings", () => {
  assert.throws(() => ga.coerceInt("abc", "ctx"));
  assert.throws(() => ga.coerceInt("", "ctx"));
  assert.throws(() => ga.coerceInt(" 5", "ctx"));
  assert.throws(() => ga.coerceInt("5 ", "ctx"));
});

test("coerceInt: rejects non-string input types", () => {
  assert.throws(() => ga.coerceInt(26, "ctx"));
  assert.throws(() => ga.coerceInt(null, "ctx"));
  assert.throws(() => ga.coerceInt(undefined, "ctx"));
});

test("coerceKeyEvents: accepts decimal strings and rounds half-to-even", () => {
  assert.equal(ga.coerceKeyEvents("24.5", "ctx"), 24);
  assert.equal(ga.coerceKeyEvents("25.5", "ctx"), 26);
  assert.equal(ga.coerceKeyEvents("10", "ctx"), 10);
});

test("coerceKeyEvents: rejects malformed values", () => {
  assert.throws(() => ga.coerceKeyEvents("abc", "ctx"));
  assert.throws(() => ga.coerceKeyEvents("", "ctx"));
  assert.throws(() => ga.coerceKeyEvents(null, "ctx"));
});

// =============================================================================
// null/undefined compatibility (requireKey, getOrNull, missing-course-id,
// nullable ISO date parsing)
// =============================================================================

test("requireKey: returns the value when present, including falsy values", () => {
  assert.equal(ga.requireKey({ a: 1 }, "a", "ctx"), 1);
  assert.equal(ga.requireKey({ a: 0 }, "a", "ctx"), 0);
});

test("requireKey: throws when the key is absent (mirrors Python KeyError)", () => {
  assert.throws(() => ga.requireKey({}, "missing", "ctx"));
  assert.throws(() => ga.requireKey(undefined, "missing", "ctx"));
});

test("getOrNull: returns the value when present, null when absent or undefined", () => {
  assert.equal(ga.getOrNull({ a: "x" }, "a"), "x");
  assert.equal(ga.getOrNull({}, "a"), null);
  assert.equal(ga.getOrNull({ a: undefined }, "a"), null);
});

test("isMissingCourseId: null, undefined, empty, whitespace, and (not set) are all missing", () => {
  assert.equal(ga.isMissingCourseId(null), true);
  assert.equal(ga.isMissingCourseId(undefined), true);
  assert.equal(ga.isMissingCourseId(""), true);
  assert.equal(ga.isMissingCourseId("   "), true);
  assert.equal(ga.isMissingCourseId("(not set)"), true);
  assert.equal(ga.isMissingCourseId("gas-lng-contracts-negotiations"), false);
});

test("parseIsoDateMsOrNull: null passes through as null, real dates parse normally", () => {
  assert.equal(ga.parseIsoDateMsOrNull(null), null);
  assert.equal(ga.parseIsoDateMsOrNull("2026-08-22"), ga.parseIsoDateMs("2026-08-22"));
});

// =============================================================================
// GA4 adapter: all four commercial events, zero synthesis, unknown-event
// rejection, (not set) course_id / lead_intent handling
// =============================================================================

function minimalPayload(overrides) {
  const base = {
    current_period_start: "2026-08-01",
    current_period_end: "2026-08-29",
    previous_period_start: "2025-08-01",
    previous_period_end: "2025-08-29",
    totals_current_raw: zeroRows(["date"], ["totalUsers", "sessions", "engagedSessions"]),
    totals_previous_raw: zeroRows(["date"], ["totalUsers", "sessions", "engagedSessions"]),
    commercial_events_current_raw: zeroRows(["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"]),
    commercial_events_previous_raw: zeroRows(["eventName"], ["eventCount", "conversions", "sessions", "totalUsers"]),
    commercial_events_by_course_raw: zeroRows(
      ["eventName", "customEvent:course_id", "customEvent:course_name", "customEvent:course_category"],
      ["eventCount", "conversions", "sessions", "totalUsers"]
    ),
    lead_intent_raw: zeroRows(["customEvent:lead_intent"], ["eventCount", "conversions", "sessions", "totalUsers"]),
    course_page_views_raw: zeroRows(["customEvent:course_id", "customEvent:course_name"], ["eventCount", "sessions", "totalUsers"]),
    gsc_queries: [],
  };
  return Object.assign(base, overrides || {});
}

test("buildIntelligenceInput: all four known commercial events are parsed and sorted alphabetically", () => {
  const raw = rawResponse(
    ["eventName"],
    ["eventCount", "conversions", "sessions", "totalUsers"],
    [
      { dims: ["enquiry_submitted"], metrics: ["10", "3", "8", "6"] },
      { dims: ["booking_submitted"], metrics: ["4", "2", "4", "3"] },
      { dims: ["calendar_download"], metrics: ["7", "1", "6", "5"] },
      { dims: ["brochure_download"], metrics: ["9", "0", "9", "7"] },
    ]
  );
  const input = ga.buildIntelligenceInput(minimalPayload({ commercial_events_current_raw: raw }));
  const current = input.commercial_events.filter((e) => e.period === "current");
  assert.equal(current.length, 4);
  assert.deepEqual(
    current.map((e) => e.event_name),
    ["booking_submitted", "brochure_download", "calendar_download", "enquiry_submitted"]
  );
  const booking = current.find((e) => e.event_name === "booking_submitted");
  assert.equal(booking.event_count, 4);
  assert.equal(booking.key_events, 2);
  assert.equal(booking.sessions, 4);
  assert.equal(booking.users, 3);
});

test("buildIntelligenceInput: missing commercial events are zero-synthesized, not omitted", () => {
  const raw = rawResponse(
    ["eventName"],
    ["eventCount", "conversions", "sessions", "totalUsers"],
    [{ dims: ["booking_submitted"], metrics: ["4", "2", "4", "3"] }]
  );
  const input = ga.buildIntelligenceInput(minimalPayload({ commercial_events_current_raw: raw }));
  const current = input.commercial_events.filter((e) => e.period === "current");
  assert.equal(current.length, 4);
  const synthesized = current.filter((e) => e.event_name !== "booking_submitted");
  for (const row of synthesized) {
    assert.equal(row.event_count, 0);
    assert.equal(row.key_events, 0);
    assert.equal(row.sessions, 0);
    assert.equal(row.users, 0);
  }
});

test("buildIntelligenceInput: unknown commercial event name throws (fails loudly)", () => {
  const raw = rawResponse(
    ["eventName"],
    ["eventCount", "conversions", "sessions", "totalUsers"],
    [{ dims: ["mystery_event"], metrics: ["1", "0", "1", "1"] }]
  );
  assert.throws(() => ga.buildIntelligenceInput(minimalPayload({ commercial_events_current_raw: raw })));
});

test("buildIntelligenceInput: unknown event in the by-course feed also throws", () => {
  const raw = rawResponse(
    ["eventName", "customEvent:course_id", "customEvent:course_name", "customEvent:course_category"],
    ["eventCount", "conversions", "sessions", "totalUsers"],
    [{ dims: ["mystery_event", "x", "X", "cat"], metrics: ["1", "0", "1", "1"] }]
  );
  assert.throws(() => ga.buildIntelligenceInput(minimalPayload({ commercial_events_by_course_raw: raw })));
});

test("normaliseInput: (not set), empty, and whitespace course_id all normalise to null", () => {
  const inputData = {
    commercial_events_by_course: [
      { course_id: "(not set)" },
      { course_id: "" },
      { course_id: "   " },
      { course_id: "real-course" },
    ],
    course_page_views_by_course: [{ course_id: null }],
  };
  const result = ga.normaliseInput(inputData);
  assert.deepEqual(
    result.commercial_events_by_course.map((r) => r.course_id),
    [null, null, null, "real-course"]
  );
  assert.equal(result.course_page_views_by_course[0].course_id, null);
});

test("buildIntelligenceInput: (not set) lead_intent is preserved literally, not normalised", () => {
  const raw = rawResponse(
    ["customEvent:lead_intent"],
    ["eventCount", "conversions", "sessions", "totalUsers"],
    [{ dims: ["(not set)"], metrics: ["5", "1", "5", "4"] }]
  );
  const input = ga.buildIntelligenceInput(minimalPayload({ lead_intent_raw: raw }));
  assert.equal(input.commercial_events_by_intent[0].lead_intent, "(not set)");
});

// =============================================================================
// GA4 confidence tiers, high concentration, cutover suppression
// =============================================================================

test("classifyGa4Confidence: at/below insufficient floor is insufficient/low_sample", () => {
  const result = ga.classifyGa4Confidence(1, 1, null, { affected: false, cutover_id: null });
  assert.equal(result.tier, "insufficient");
  assert.equal(result.reason, "low_sample");
});

test("classifyGa4Confidence: mid sample is early_signal", () => {
  const result = ga.classifyGa4Confidence(5, 3, null, { affected: false, cutover_id: null });
  assert.equal(result.tier, "early_signal");
});

test("classifyGa4Confidence: directional floor met is directional", () => {
  const result = ga.classifyGa4Confidence(15, 6, null, { affected: false, cutover_id: null });
  assert.equal(result.tier, "directional");
  assert.equal(result.reason, "sample_meets_directional_floor");
});
test("classifyGa4Confidence: reliable floor with known concentration is reliable", () => {
  const result = ga.classifyGa4Confidence(35, 10, 0.3, { affected: false, cutover_id: null });
  assert.equal(result.tier, "reliable");
  assert.equal(result.reason, "sample_meets_reliable_floor");
});

test("classifyGa4Confidence: reliable floor with unknown concentration downgrades to directional, not suppressed", () => {
  const result = ga.classifyGa4Confidence(35, 10, null, { affected: false, cutover_id: null });
  assert.equal(result.tier, "directional");
  assert.equal(result.reason, "reliable_floor_met_but_concentration_unknown");
  assert.equal(ga.CONFIDENCE_MULTIPLIERS[result.tier] > 0, true);
});

test("classifyGa4Confidence: concentration_ratio above ceiling is insufficient/high_concentration_ratio", () => {
  const result = ga.classifyGa4Confidence(50, 20, 0.85, { affected: false, cutover_id: null });
  assert.equal(result.tier, "insufficient");
  assert.equal(result.reason, "high_concentration_ratio");
});

test("classifyGa4Confidence: concentration_ratio exactly at the ceiling does not trigger suppression", () => {
  const result = ga.classifyGa4Confidence(50, 20, 0.7, { affected: false, cutover_id: null });
  assert.notEqual(result.reason, "high_concentration_ratio");
  assert.equal(result.tier, "reliable");
});

test("classifyGa4Confidence: cutover_affected forces insufficient regardless of sample size", () => {
  const cutover = { affected: true, cutover_id: "course_identity_migration" };
  const result = ga.classifyGa4Confidence(50, 20, 0.3, cutover);
  assert.equal(result.tier, "insufficient");
  assert.equal(result.reason, "cutover_affected:course_identity_migration");
});

test("classifyGscConfidence: tiers derive from impressions only", () => {
  assert.equal(ga.classifyGscConfidence(10, 1).tier, "insufficient");
  assert.equal(ga.classifyGscConfidence(100, 1).tier, "early_signal");
  assert.equal(ga.classifyGscConfidence(500, 1).tier, "directional");
  assert.equal(ga.classifyGscConfidence(5000, 1).tier, "reliable");
});

// =============================================================================
// suppression: reason priority, secondary reasons, ordering, insufficient_sample fallback
// =============================================================================

function baseOpportunity(overrides) {
  return Object.assign(
    {
      opportunity_id: "test:1",
      opportunity_type: "course_momentum",
      scope: { type: "course", key: "x", label: "X" },
      confidence_tier: "insufficient",
      sample_size: { concentration_ratio: null, unique_users: 1, distinct_sessions: 1, impressions: null, clicks: null, repetition_ratio: null },
      cutover_affected: { affected: false, cutover_id: null },
      course_id: "x",
      course_name: "X",
    },
    overrides || {}
  );
}

test("routeOpportunity: cutover-only suppression has no secondary reasons", () => {
  const opp = baseOpportunity({ cutover_affected: { affected: true, cutover_id: "course_identity_migration" } });
  const [bucket, item] = ga.routeOpportunity(opp);
  assert.equal(bucket, "suppressed");
  assert.equal(item.suppression_reason, "known_tracking_cutover");
  assert.deepEqual(item.secondary_reasons, []);
});

test("routeOpportunity: concentration-only suppression uses suspected_test_activity with no secondary reasons", () => {
  const opp = baseOpportunity({ sample_size: Object.assign({}, baseOpportunity().sample_size, { concentration_ratio: 0.9 }) });
  const [bucket, item] = ga.routeOpportunity(opp);
  assert.equal(bucket, "suppressed");
  assert.equal(item.suppression_reason, "suspected_test_activity");
  assert.deepEqual(item.secondary_reasons, []);
});

test("routeOpportunity: cutover AND high concentration together - cutover is primary, concentration is secondary", () => {
  const opp = baseOpportunity({
    cutover_affected: { affected: true, cutover_id: "course_identity_migration" },
    sample_size: Object.assign({}, baseOpportunity().sample_size, { concentration_ratio: 0.95 }),
  });
  const [bucket, item] = ga.routeOpportunity(opp);
  assert.equal(bucket, "suppressed");
  assert.equal(item.suppression_reason, "known_tracking_cutover");
  assert.deepEqual(item.secondary_reasons, ["suspected_test_activity"]);
});

test("routeOpportunity: neither cutover nor concentration falls back to insufficient_sample", () => {
  const opp = baseOpportunity();
  const [bucket, item] = ga.routeOpportunity(opp);
  assert.equal(bucket, "suppressed");
  assert.equal(item.suppression_reason, "insufficient_sample");
  assert.deepEqual(item.secondary_reasons, []);
});

test("routeOpportunity: early_signal and non-insufficient tiers are not suppressed", () => {
  const early = baseOpportunity({ confidence_tier: "early_signal" });
  const [earlyBucket] = ga.routeOpportunity(early);
  assert.equal(earlyBucket, "early_signal");
  const directional = baseOpportunity({ confidence_tier: "directional" });
  const [directionalBucket] = ga.routeOpportunity(directional);
  assert.equal(directionalBucket, "opportunity");
});

// =============================================================================
// diagnostics: traffic without conversion / conversion without much traffic
// =============================================================================

test("detectTrafficWithoutConversion: flags courses with enough views and zero commercial events", () => {
  const pageViews = [
    { course_id: "a", course_name: "A", event_count: 15, period: "current" },
    { course_id: "b", course_name: "B", event_count: 9, period: "current" },
    { course_id: null, course_name: null, event_count: 50, period: "current" },
  ];
  const events = [];
  const result = ga.detectTrafficWithoutConversion(pageViews, events);
  assert.equal(result.length, 1);
  assert.equal(result[0].course_id, "a");
  assert.equal(result[0].course_name, "A");
  assert.deepEqual(result[0].evidence, [
    { metric: "course_page_view.event_count", value: 15, period: "current", source: "GA4" },
    { metric: "commercial_event_count", value: 0, period: "current", source: "GA4" },
  ]);
  assert.equal(
    result[0].description,
    "Course page received meaningful traffic with no recorded commercial events in the current period."
  );
});

test("detectConversionWithoutMuchTraffic: flags commercial activity with little or no page-view support", () => {
  const events = [
    { course_id: "b", course_name: "B", event_count: 3, period: "current" },
    { course_id: "c", course_name: null, event_count: 2, period: "current" },
  ];
  const pageViews = [{ course_id: "b", course_name: "B", event_count: 2, period: "current" }];
  const result = ga.detectConversionWithoutMuchTraffic(pageViews, events);
  const byId = Object.fromEntries(result.map((r) => [r.course_id, r]));
  assert.deepEqual(byId.b.evidence, [
    { metric: "commercial_event_count", value: 3, period: "current", source: "GA4" },
    { metric: "course_page_view.event_count", value: 2, period: "current", source: "GA4" },
  ]);
  assert.deepEqual(byId.c.evidence, [
    { metric: "commercial_event_count", value: 2, period: "current", source: "GA4" },
    { metric: "course_page_view.event_count", value: 0, period: "current", source: "GA4" },
  ]);
  assert.equal(byId.c.course_name, null);
  assert.equal(
    byId.b.description,
    "Course generated commercial events with very little recorded page-view traffic in the current period."
  );
});

test("detectConversionWithoutMuchTraffic: courses with more than the traffic ceiling are excluded", () => {
  const events = [{ course_id: "d", event_count: 4, period: "current" }];
  const pageViews = [{ course_id: "d", course_name: "D", event_count: 6, period: "current" }];
  const result = ga.detectConversionWithoutMuchTraffic(pageViews, events);
  assert.equal(result.length, 0);
});

// =============================================================================
// lead-intent opportunities: type mapping, evidence field names, filtering
// =============================================================================

test("detectLeadIntentOpportunities: corporate_training maps to corporate_intent_signal with non-prefixed evidence names", () => {
  const rows = [
    { event_name: "enquiry_submitted", lead_intent: "corporate_training", event_count: 6, key_events: 2, sessions: 5, users: 4, period: "current" },
  ];
  const [opp] = ga.detectLeadIntentOpportunities(rows, 0, 1);
  assert.equal(opp.opportunity_type, "corporate_intent_signal");
  const metrics = opp.evidence.map((e) => e.metric);
  assert.deepEqual(metrics, ["event_count", "key_events", "sessions", "users_conservative_max", "repetition_ratio"]);
});

test("detectLeadIntentOpportunities: team_training maps to team_intent_signal", () => {
  const rows = [
    { event_name: "enquiry_submitted", lead_intent: "team_training", event_count: 3, key_events: 1, sessions: 3, users: 2, period: "current" },
  ];
  const [opp] = ga.detectLeadIntentOpportunities(rows, 0, 1);
  assert.equal(opp.opportunity_type, "team_intent_signal");
});

test("detectLeadIntentOpportunities: (not set) and other unmapped intents produce no opportunity", () => {
  const rows = [
    { event_name: "enquiry_submitted", lead_intent: "(not set)", event_count: 10, key_events: 5, sessions: 8, users: 6, period: "current" },
    { event_name: "enquiry_submitted", lead_intent: "general", event_count: 10, key_events: 5, sessions: 8, users: 6, period: "current" },
  ];
  const result = ga.detectLeadIntentOpportunities(rows, 0, 1);
  assert.equal(result.length, 0);
});

// =============================================================================
// top_actions: tied-score stable ordering, max five, no padding
// =============================================================================

function eligibleOpportunity(id, finalScore) {
  return {
    opportunity_id: id,
    confidence_tier: "directional",
    evidence: [{ metric: "x", value: 1, period: "current", source: "GA4" }],
    final_score: finalScore,
    recommendation: "Review " + id + ".",
    rationale: "because",
  };
}

test("selectTopActions: more than five eligible actions are capped at five", () => {
  const opps = ["o1", "o2", "o3", "o4", "o5", "o6", "o7"].map((id) => eligibleOpportunity(id, 5));
  const actions = ga.selectTopActions(opps);
  assert.equal(actions.length, 5);
  assert.deepEqual(actions.map((a) => a.opportunity_id), ["o1", "o2", "o3", "o4", "o5"]);
  assert.deepEqual(actions.map((a) => a.priority_rank), [1, 2, 3, 4, 5]);
  assert.deepEqual(actions.map((a) => a.action_id), ["action_1", "action_2", "action_3", "action_4", "action_5"]);
});

test("selectTopActions: fewer than five eligible actions are never padded", () => {
  const opps = ["o1", "o2"].map((id) => eligibleOpportunity(id, 5));
  const actions = ga.selectTopActions(opps);
  assert.equal(actions.length, 2);
});

test("selectTopActions: sorts descending by final_score, preserving original order among ties", () => {
  const opps = [
    eligibleOpportunity("o1", 3),
    eligibleOpportunity("o2", 5),
    eligibleOpportunity("o3", 5),
    eligibleOpportunity("o4", 1),
  ];
  const actions = ga.selectTopActions(opps);
  assert.deepEqual(actions.map((a) => a.opportunity_id), ["o2", "o3", "o1", "o4"]);
});

test("selectTopActions: opportunities with zero score or no recommendation are excluded", () => {
  const zeroScore = eligibleOpportunity("z", 0);
  const noRecommendation = Object.assign(eligibleOpportunity("n", 5), { recommendation: "" });
  const insufficientTier = Object.assign(eligibleOpportunity("i", 5), { confidence_tier: "insufficient" });
  const actions = ga.selectTopActions([zeroScore, noRecommendation, insufficientTier]);
  assert.equal(actions.length, 0);
});

// =============================================================================
// attribution quality: expected / cutover / unexpected, unknown events, date boundary
// =============================================================================

function attributionRaw(rows) {
  return rawResponse(["date", "eventName", "customEvent:course_id", "customEvent:form_location"], ["eventCount"], rows);
}

test("classifyAttributionQuality: calendar_download with missing course_id is always expected", () => {
  const raw = attributionRaw([
    { dims: ["20260810", "calendar_download", "(not set)", "(not set)"], metrics: ["5"] },
  ]);
  const summary = ga.classifyAttributionQuality(raw);
  assert.equal(summary.expected_unattributed_count, 5);
  assert.equal(summary.by_event_name.calendar_download.expected, 5);
});

test("classifyAttributionQuality: homepage and contact_page enquiries are expected; course_page and (not set) are unexpected", () => {
  const raw = attributionRaw([
    { dims: ["20260812", "enquiry_submitted", "(not set)", "homepage"], metrics: ["2"] },
    { dims: ["20260812", "enquiry_submitted", "(not set)", "contact_page"], metrics: ["10"] },
    { dims: ["20260812", "enquiry_submitted", "(not set)", "course_page"], metrics: ["1"] },
    { dims: ["20260812", "enquiry_submitted", "(not set)", "(not set)"], metrics: ["3"] },
  ]);
  const summary = ga.classifyAttributionQuality(raw);
  assert.equal(summary.expected_unattributed_count, 12);
  assert.equal(summary.unexpected_unattributed_count, 4);
});

test("classifyAttributionQuality: booking_submitted on/before the migration boundary is cutover, after is unexpected", () => {
  const raw = attributionRaw([
    { dims: ["20260822", "booking_submitted", "(not set)", "(not set)"], metrics: ["1"] },
    { dims: ["20260823", "booking_submitted", "(not set)", "(not set)"], metrics: ["4"] },
  ]);
  const summary = ga.classifyAttributionQuality(raw);
  assert.equal(summary.cutover_unattributed_count, 1);
  assert.equal(summary.unexpected_unattributed_count, 4);
});

test("classifyAttributionQuality: brochure_download before boundary is cutover, well after is unexpected", () => {
  const raw = attributionRaw([
    { dims: ["20260801", "brochure_download", "(not set)", "(not set)"], metrics: ["3"] },
    { dims: ["20260825", "brochure_download", "(not set)", "(not set)"], metrics: ["7"] },
  ]);
  const summary = ga.classifyAttributionQuality(raw);
  assert.equal(summary.cutover_unattributed_count, 3);
  assert.equal(summary.unexpected_unattributed_count, 7);
});

test("classifyAttributionQuality: an unknown/unrecognised event name with missing course_id is unexpected, not discarded", () => {
  const raw = attributionRaw([
    { dims: ["20260810", "some_future_event", "(not set)", "(not set)"], metrics: ["6"] },
  ]);
  const summary = ga.classifyAttributionQuality(raw);
  assert.equal(summary.unexpected_unattributed_count, 6);
  assert.equal(summary.by_event_name.some_future_event.unexpected, 6);
});

test("classifyAttributionQuality: rows with a real course_id are skipped entirely", () => {
  const raw = attributionRaw([
    { dims: ["20260825", "booking_submitted", "gas-lng-contracts-negotiations", "(not set)"], metrics: ["9"] },
  ]);
  const summary = ga.classifyAttributionQuality(raw);
  assert.equal(summary.expected_unattributed_count, 0);
  assert.equal(summary.cutover_unattributed_count, 0);
  assert.equal(summary.unexpected_unattributed_count, 0);
  assert.deepEqual(summary.by_event_name, {});
});

test("classifyAttributionQuality: by_event_name reconciles exactly to the overall totals", () => {
  const raw = attributionRaw([
    { dims: ["20260810", "calendar_download", "(not set)", "(not set)"], metrics: ["5"] },
    { dims: ["20260812", "enquiry_submitted", "(not set)", "homepage"], metrics: ["2"] },
    { dims: ["20260812", "enquiry_submitted", "(not set)", "course_page"], metrics: ["1"] },
    { dims: ["20260810", "booking_submitted", "(not set)", "(not set)"], metrics: ["7"] },
    { dims: ["20260825", "brochure_download", "(not set)", "(not set)"], metrics: ["4"] },
  ]);
  const summary = ga.classifyAttributionQuality(raw);
  const buckets = Object.values(summary.by_event_name);
  const sumExpected = buckets.reduce((s, b) => s + b.expected, 0);
  const sumCutover = buckets.reduce((s, b) => s + b.cutover, 0);
  const sumUnexpected = buckets.reduce((s, b) => s + b.unexpected, 0);
  assert.equal(sumExpected, summary.expected_unattributed_count);
  assert.equal(sumCutover, summary.cutover_unattributed_count);
  assert.equal(sumUnexpected, summary.unexpected_unattributed_count);
});

