"use strict";

// Python<->JS parity harness. Python is authoritative: every mismatch is
// reported as "python=... js=...". Runs each fixture through the real
// Python growth_agent package (via a subprocess) and the real growth_agent.js
// module in this process, then does a recursive, order-sensitive-for-arrays,
// key-order-independent-for-objects structural comparison - no epsilon/
// tolerance anywhere. Numeric int/float formatting differences between the
// two languages are a non-issue here: both sides are compared as already-
// parsed JS values (via JSON.parse on the Python subprocess output), and JS
// has only one numeric type, so a Python 2.0 and a Python 2 both arrive as
// the same JS number 2 - this is exact equality, not a tolerance.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ga = require("../growth_agent.js");

const FIXTURES_PATH = path.join(__dirname, "parity_fixtures.json");
const PY_RUNNER = path.join(__dirname, "run_python_reference.py");
const TMP_DIR = path.join(os.tmpdir(), "growth_agent_parity");

function runPythonFixture(fixture) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const tmpFile = path.join(TMP_DIR, "fixture_" + fixture.name + ".json");
  fs.writeFileSync(tmpFile, JSON.stringify(fixture));
  const proc = spawnSync("python3", [PY_RUNNER, tmpFile], { encoding: "utf8" });
  try {
    fs.unlinkSync(tmpFile);
  } catch (e) {
    // best-effort cleanup only
  }
  if (!proc.stdout || proc.stdout.trim() === "") {
    return {
      ok: false,
      error_type: "SubprocessError",
      error_message: (proc.stderr || "").trim() || ("python3 exited with status " + proc.status),
    };
  }
  try {
    return JSON.parse(proc.stdout.trim());
  } catch (e) {
    return {
      ok: false,
      error_type: "SubprocessOutputParseError",
      error_message: proc.stdout + "\n" + proc.stderr,
    };
  }
}

function runJsIntelligence(fixture) {
  const options = {
    current_period_start: fixture.current_period_start,
    current_period_end: fixture.current_period_end,
    previous_period_start: fixture.previous_period_start,
    previous_period_end: fixture.previous_period_end,
    totals_current_raw: fixture.totals_current_raw,
    totals_previous_raw: fixture.totals_previous_raw,
    commercial_events_current_raw: fixture.commercial_events_current_raw,
    commercial_events_previous_raw: fixture.commercial_events_previous_raw,
    commercial_events_by_course_raw: fixture.commercial_events_by_course_raw,
    lead_intent_raw: fixture.lead_intent_raw,
    course_page_views_raw: fixture.course_page_views_raw,
    gsc_queries: fixture.gsc_queries || null,
    property_id: fixture.property_id,
    gsc_property: fixture.gsc_property,
  };
  const input = ga.buildIntelligenceInput(options);
  return ga.runIntelligenceModule(input, fixture.generated_at);
}

function runJsAttribution(fixture) {
  return ga.classifyAttributionQuality(fixture.rows_raw);
}

function runJsDirectCall(fixture) {
  if (fixture.js_func === "classifyGa4Confidence") {
    const a = fixture.args;
    return ga.classifyGa4Confidence(a.unique_users, a.distinct_sessions, a.concentration_ratio, a.cutover);
  }
  if (fixture.js_func === "routeOpportunity") {
    const o = fixture.opportunity;
    const opp = {
      opportunity_id: o.opportunity_id,
      opportunity_type: o.opportunity_type,
      scope: o.scope,
      raw_score: o.raw_score || 0,
      confidence_tier: o.confidence_tier,
      confidence_multiplier: o.confidence_multiplier || 0.0,
      final_score: o.final_score || 0.0,
      primary_metric: o.primary_metric || { name: "x", current_value: 0 },
      evidence: o.evidence || [],
      sample_size: Object.assign(
        { unique_users: null, distinct_sessions: null, impressions: null, clicks: null, concentration_ratio: null, repetition_ratio: null },
        o.sample_size || {}
      ),
      cutover_affected: o.cutover_affected || { affected: false, cutover_id: null },
      business_context_required: o.business_context_required || false,
      business_context_note: o.business_context_note !== undefined ? o.business_context_note : null,
      recommendation: o.recommendation || "",
      rationale: o.rationale || "",
      course_id: o.course_id !== undefined ? o.course_id : null,
      course_name: o.course_name !== undefined ? o.course_name : null,
    };
    const [bucket, item] = ga.routeOpportunity(opp);
    return { bucket: bucket, item: item };
  }
  throw new Error("Unknown js_func: " + fixture.js_func);
}

function runJsFixture(fixture) {
  try {
    let result;
    if (fixture.kind === "intelligence") result = runJsIntelligence(fixture);
    else if (fixture.kind === "attribution") result = runJsAttribution(fixture);
    else if (fixture.kind === "direct_call") result = runJsDirectCall(fixture);
    else throw new Error("Unknown fixture kind: " + fixture.kind);
    return { ok: true, result: result };
  } catch (e) {
    return { ok: false, error_type: e.constructor.name, error_message: e.message };
  }
}

// Recursive structural diff. Arrays are compared in order (index by
// index); objects are compared key-by-key regardless of key order.
function diffPaths(pyValue, jsValue, prefix, out) {
  const pyIsObj = pyValue !== null && typeof pyValue === "object";
  const jsIsObj = jsValue !== null && typeof jsValue === "object";

  if (!pyIsObj && !jsIsObj) {
    if (pyValue !== jsValue) {
      out.push(prefix + ": python=" + JSON.stringify(pyValue) + " js=" + JSON.stringify(jsValue));
    }
    return;
  }
  if (pyIsObj !== jsIsObj) {
    out.push(prefix + ": python=" + JSON.stringify(pyValue) + " js=" + JSON.stringify(jsValue) + " (type mismatch)");
    return;
  }

  const pyIsArr = Array.isArray(pyValue);
  const jsIsArr = Array.isArray(jsValue);
  if (pyIsArr !== jsIsArr) {
    out.push(prefix + ": array/object mismatch (python is " + (pyIsArr ? "array" : "object") + ", js is " + (jsIsArr ? "array" : "object") + ")");
    return;
  }

  if (pyIsArr) {
    if (pyValue.length !== jsValue.length) {
      out.push(prefix + ".length: python=" + pyValue.length + " js=" + jsValue.length);
    }
    const len = Math.max(pyValue.length, jsValue.length);
    for (let i = 0; i < len; i++) {
      if (i >= pyValue.length || i >= jsValue.length) continue;
      diffPaths(pyValue[i], jsValue[i], prefix + "[" + i + "]", out);
    }
    return;
  }

  const keys = new Set(Object.keys(pyValue).concat(Object.keys(jsValue)));
  for (const key of keys) {
    const pyHas = Object.prototype.hasOwnProperty.call(pyValue, key);
    const jsHas = Object.prototype.hasOwnProperty.call(jsValue, key);
    if (!pyHas) {
      out.push(prefix + "." + key + ": present only on js side (js=" + JSON.stringify(jsValue[key]) + ")");
      continue;
    }
    if (!jsHas) {
      out.push(prefix + "." + key + ": present only on python side (python=" + JSON.stringify(pyValue[key]) + ")");
      continue;
    }
    diffPaths(pyValue[key], jsValue[key], prefix + "." + key, out);
  }
}

function main() {
  const fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf8"));
  let passCount = 0;
  let failCount = 0;
  const failedNames = [];

  for (const fixture of fixtures) {
    const pyOutcome = runPythonFixture(fixture);
    const jsOutcome = runJsFixture(fixture);
    const expectError = !!fixture.expect_error;
    let status = "PASS";
    const notes = [];

    if (expectError) {
      if (pyOutcome.ok || jsOutcome.ok) {
        status = "FAIL";
        notes.push("expected both sides to error; python ok=" + pyOutcome.ok + " js ok=" + jsOutcome.ok);
      }
    } else if (!pyOutcome.ok || !jsOutcome.ok) {
      status = "FAIL";
      if (!pyOutcome.ok) notes.push("python errored unexpectedly: " + pyOutcome.error_type + ": " + pyOutcome.error_message);
      if (!jsOutcome.ok) notes.push("js errored unexpectedly: " + jsOutcome.error_type + ": " + jsOutcome.error_message);
    } else {
      const diffs = [];
      diffPaths(pyOutcome.result, jsOutcome.result, "$", diffs);
      if (diffs.length > 0) {
        status = "FAIL";
        notes.push.apply(notes, diffs.slice(0, 40));
        if (diffs.length > 40) notes.push("... and " + (diffs.length - 40) + " more differences");
      }
    }

    if (status === "PASS") {
      passCount++;
      console.log("PASS  " + fixture.name);
    } else {
      failCount++;
      failedNames.push(fixture.name);
      console.log("FAIL  " + fixture.name);
      for (const note of notes) console.log("        " + note);
    }
  }

  console.log("");
  console.log(passCount + " passed, " + failCount + " failed, " + fixtures.length + " total");
  if (failedNames.length > 0) {
    console.log("Failed fixtures: " + failedNames.join(", "));
  }

  process.exit(failCount === 0 ? 0 : 1);
}

main();
