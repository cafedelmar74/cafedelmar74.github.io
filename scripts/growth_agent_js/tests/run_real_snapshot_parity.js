"use strict";

// Real LPA snapshot Python<->JS parity gate. Deliberately separate from
// run_parity.js / parity_fixtures.json (the 23 synthetic fixtures) so this
// gate cannot accidentally perturb that already-passing suite. Reuses the
// existing run_python_reference.py unchanged (its dispatch is generic by
// fixture "kind" and has no dependency on which fixture file called it).

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ga = require("../growth_agent.js");

const FIXTURES_PATH = path.join(__dirname, "real_lpa_snapshot_fixtures.json");
const PY_RUNNER = path.join(__dirname, "run_python_reference.py");
const TMP_DIR = path.join(os.tmpdir(), "growth_agent_real_snapshot_parity");

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
    return { ok: false, error_type: "SubprocessOutputParseError", error_message: proc.stdout + "\n" + proc.stderr };
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

function runJsFixture(fixture) {
  try {
    let result;
    if (fixture.kind === "intelligence") result = runJsIntelligence(fixture);
    else if (fixture.kind === "attribution") result = runJsAttribution(fixture);
    else throw new Error("Unknown fixture kind: " + fixture.kind);
    return { ok: true, result: result };
  } catch (e) {
    return { ok: false, error_type: e.constructor.name, error_message: e.message };
  }
}

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
    out.push(prefix + ": array/object mismatch");
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

function sortedIds(list) {
  return list.map((x) => x.opportunity_id).slice().sort();
}

function checkKnownTruth(label, result, knownTruth) {
  const notes = [];
  const check = (name, actual, expected) => {
    if (actual !== expected) notes.push(label + ": " + name + " expected " + expected + " got " + actual);
  };

  if (label === "intelligence") {
    check("totals_current.users", result.descriptive_summary.totals_current.users, knownTruth.totals_current.users);
    check("totals_current.sessions", result.descriptive_summary.totals_current.sessions, knownTruth.totals_current.sessions);
    check("totals_current.engaged_sessions", result.descriptive_summary.totals_current.engaged_sessions, knownTruth.totals_current.engaged_sessions);
    check("totals_previous.users", result.descriptive_summary.totals_previous.users, knownTruth.totals_previous.users);
    check("totals_previous.sessions", result.descriptive_summary.totals_previous.sessions, knownTruth.totals_previous.sessions);
    check("totals_previous.engaged_sessions", result.descriptive_summary.totals_previous.engaged_sessions, knownTruth.totals_previous.engaged_sessions);
    const commercialEventRowCount = result.descriptive_summary.commercial_events.reduce(
      (sum, e) => sum + (e.current !== null ? 1 : 0) + (e.previous !== null ? 1 : 0),
      0
    );
    check("commercial_events row count (current+previous slots across grouped summary)", commercialEventRowCount, knownTruth.commercial_events_row_count);
    check("opportunities.length", result.opportunities.length, knownTruth.opportunities_count);
    check("early_signals.length", result.early_signals.length, knownTruth.early_signals_count);
    check("suppressed_signals.length", result.suppressed_signals.length, knownTruth.suppressed_signals_count);
    check("top_actions.length", result.top_actions.length, knownTruth.top_actions_count);
    check("diagnostics.traffic_without_conversion.length", result.diagnostics.traffic_without_conversion.length, knownTruth.diagnostics_traffic_without_conversion_count);
    check("diagnostics.conversion_without_much_traffic.length", result.diagnostics.conversion_without_much_traffic.length, knownTruth.diagnostics_conversion_without_much_traffic_count);
  } else {
    check("expected_unattributed_count", result.expected_unattributed_count, knownTruth.attribution_expected);
    check("cutover_unattributed_count", result.cutover_unattributed_count, knownTruth.attribution_cutover);
    check("unexpected_unattributed_count", result.unexpected_unattributed_count, knownTruth.attribution_unexpected);
    const total = result.expected_unattributed_count + result.cutover_unattributed_count + result.unexpected_unattributed_count;
    check("total_unattributed", total, knownTruth.attribution_total);
  }
  return notes;
}

function main() {
  const doc = JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf8"));
  const fixtures = doc.fixtures;
  const knownTruth = doc.known_truth;
  let passCount = 0;
  let failCount = 0;

  for (const fixture of fixtures) {
    const pyOutcome = runPythonFixture(fixture);
    const jsOutcome = runJsFixture(fixture);
    let status = "PASS";
    const notes = [];

    if (!pyOutcome.ok || !jsOutcome.ok) {
      status = "FAIL";
      if (!pyOutcome.ok) notes.push("python errored unexpectedly: " + pyOutcome.error_type + ": " + pyOutcome.error_message);
      if (!jsOutcome.ok) notes.push("js errored unexpectedly: " + jsOutcome.error_type + ": " + jsOutcome.error_message);
    } else {
      const diffs = [];
      diffPaths(pyOutcome.result, jsOutcome.result, "$", diffs);
      if (diffs.length > 0) {
        status = "FAIL";
        notes.push.apply(notes, diffs);
      }

      const truthNotes = checkKnownTruth(fixture.kind === "intelligence" ? "intelligence" : "attribution", pyOutcome.result, knownTruth);
      if (truthNotes.length > 0) {
        status = "FAIL";
        notes.push("--- known-truth mismatches (python vs previously validated numbers) ---");
        notes.push.apply(notes, truthNotes);
      }

      if (fixture.kind === "intelligence" && pyOutcome.result.suppressed_signals) {
        const pyIds = sortedIds(pyOutcome.result.suppressed_signals);
        const jsIds = sortedIds(jsOutcome.result.suppressed_signals);
        if (JSON.stringify(pyIds) !== JSON.stringify(jsIds)) {
          status = "FAIL";
          notes.push("suppressed_signal opportunity_id sets differ: python=" + JSON.stringify(pyIds) + " js=" + JSON.stringify(jsIds));
        } else {
          console.log("  suppressed_signals ids (sorted, both sides identical):");
          for (const id of pyIds) console.log("    - " + id);
        }
      }
    }

    if (status === "PASS") {
      passCount++;
      console.log("PASS  " + fixture.name);
    } else {
      failCount++;
      console.log("FAIL  " + fixture.name);
      for (const note of notes) console.log("        " + note);
    }
  }

  console.log("");
  console.log(passCount + " passed, " + failCount + " failed, " + fixtures.length + " total");
  process.exit(failCount === 0 ? 0 : 1);
}

main();
