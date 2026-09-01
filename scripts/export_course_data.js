#!/usr/bin/env node
"use strict";

// Deterministic exporter for LPA_COURSES / LPA_SESSIONS.
//
// course-data.js remains the sole authored source of truth. This script
// extracts the two arrays it defines and projects them, unmodified, into
// data/lpa-course-data.json for later machine consumption (e.g. by n8n).
//
// Extraction method: course-data.js contains exactly two top-level
// statements (`var LPA_COURSES = [...]`, `var LPA_SESSIONS = [...]`) and no
// references to document/window/require/module/eval/import - confirmed by
// direct inspection. It is executed inside a fresh, empty vm.Context (no
// injected globals, no filesystem/network reachable from inside it) so we
// can read the two resulting bindings back without regex-parsing array
// bodies and without eval.
//
// Two modes:
//   node scripts/export_course_data.js            -> (re)generate the file
//   node scripts/export_course_data.js --check     -> verify it is current,
//                                                      no filesystem writes

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const REPO_ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(REPO_ROOT, "course-data.js");
const OUTPUT_PATH = path.join(REPO_ROOT, "data", "lpa-course-data.json");

class ExportValidationError extends Error {}

function extractFromSource(sourceCode) {
  const sandbox = {};
  vm.createContext(sandbox);

  let script;
  try {
    script = new vm.Script(sourceCode, { filename: "course-data.js" });
  } catch (e) {
    throw new ExportValidationError("course-data.js failed to parse as JavaScript: " + e.message);
  }

  try {
    script.runInContext(sandbox, { timeout: 2000 });
  } catch (e) {
    throw new ExportValidationError("Sandboxed execution of course-data.js failed or timed out: " + e.message);
  }

  if (!Object.prototype.hasOwnProperty.call(sandbox, "LPA_COURSES")) {
    throw new ExportValidationError("LPA_COURSES was not defined by course-data.js");
  }
  if (!Array.isArray(sandbox.LPA_COURSES)) {
    throw new ExportValidationError("LPA_COURSES is not an array");
  }
  if (!Object.prototype.hasOwnProperty.call(sandbox, "LPA_SESSIONS")) {
    throw new ExportValidationError("LPA_SESSIONS was not defined by course-data.js");
  }
  if (!Array.isArray(sandbox.LPA_SESSIONS)) {
    throw new ExportValidationError("LPA_SESSIONS is not an array");
  }

  return { courses: sandbox.LPA_COURSES, sessions: sandbox.LPA_SESSIONS };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function findDuplicates(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].filter(([, n]) => n > 1).map(([v]) => v);
}

function validate(courses, sessions) {
  courses.forEach((course, i) => {
    if (!isPlainObject(course)) {
      throw new ExportValidationError(`courses[${i}] is not a plain object`);
    }
    if (!isNonEmptyString(course.course_id)) {
      throw new ExportValidationError(`courses[${i}] has a missing, empty, or non-string course_id`);
    }
  });

  sessions.forEach((session, i) => {
    if (!isPlainObject(session)) {
      throw new ExportValidationError(`sessions[${i}] is not a plain object`);
    }
    if (!isNonEmptyString(session.course_session_id)) {
      throw new ExportValidationError(`sessions[${i}] has a missing, empty, or non-string course_session_id`);
    }
    if (!isNonEmptyString(session.course_id)) {
      throw new ExportValidationError(
        `sessions[${i}] (course_session_id=${session.course_session_id}) has a missing, empty, or non-string course_id`
      );
    }
  });

  const dupCourseIds = findDuplicates(courses.map((c) => c.course_id));
  if (dupCourseIds.length > 0) {
    throw new ExportValidationError("Duplicate course_id value(s): " + dupCourseIds.join(", "));
  }

  const dupSessionIds = findDuplicates(sessions.map((s) => s.course_session_id));
  if (dupSessionIds.length > 0) {
    throw new ExportValidationError("Duplicate course_session_id value(s): " + dupSessionIds.join(", "));
  }

  const courseIdSet = new Set(courses.map((c) => c.course_id));
  const orphanSessionIds = sessions
    .filter((s) => !courseIdSet.has(s.course_id))
    .map((s) => `${s.course_session_id} -> ${s.course_id}`);
  if (orphanSessionIds.length > 0) {
    throw new ExportValidationError("Orphan session course_id (no matching course): " + orphanSessionIds.join(", "));
  }
}

function buildProjection(courses, sessions) {
  // Plain re-assembly of the exact extracted arrays. No renaming, no
  // filtering, no derived values, no defaulting of absent fields.
  return {
    schema_version: "1.0",
    courses,
    sessions,
  };
}

function serialize(projection) {
  const json = JSON.stringify(projection, null, 2) + "\n";

  let reparsed;
  try {
    reparsed = JSON.parse(json);
  } catch (e) {
    throw new ExportValidationError("Serialization self-check failed: generated JSON does not parse: " + e.message);
  }
  const ok =
    reparsed.schema_version === projection.schema_version &&
    Array.isArray(reparsed.courses) &&
    reparsed.courses.length === projection.courses.length &&
    Array.isArray(reparsed.sessions) &&
    reparsed.sessions.length === projection.sessions.length;
  if (!ok) {
    throw new ExportValidationError("Serialization self-check failed: round-tripped JSON does not match the built projection");
  }

  return json;
}

function buildDeterministicJson() {
  const sourceCode = fs.readFileSync(SOURCE_PATH, "utf8");
  const { courses, sessions } = extractFromSource(sourceCode);
  validate(courses, sessions);
  const projection = buildProjection(courses, sessions);
  const json = serialize(projection);
  return { json, courses, sessions };
}

function runGenerate() {
  const { json } = buildDeterministicJson();

  const dir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(dir, { recursive: true });

  // Write to a temp file in the same directory, then rename, so a failure
  // mid-write can never leave a partially-written artifact at OUTPUT_PATH.
  const tmpPath = OUTPUT_PATH + ".tmp-" + process.pid;
  fs.writeFileSync(tmpPath, json, "utf8");
  fs.renameSync(tmpPath, OUTPUT_PATH);

  console.log("Wrote " + OUTPUT_PATH);
  return json;
}

function runCheck() {
  const { json } = buildDeterministicJson();

  let existing;
  try {
    existing = fs.readFileSync(OUTPUT_PATH, "utf8");
  } catch (e) {
    console.error(
      "STALE: " + OUTPUT_PATH + " does not exist. Run `node scripts/export_course_data.js` to generate it, then commit the result."
    );
    process.exitCode = 1;
    return;
  }

  if (existing !== json) {
    console.error(
      "STALE: " + OUTPUT_PATH + " does not match the current course-data.js. " +
      "Run `node scripts/export_course_data.js` to regenerate it, then commit the result."
    );
    process.exitCode = 1;
    return;
  }

  console.log("OK: " + OUTPUT_PATH + " is up to date with course-data.js.");
}

function main() {
  const checkMode = process.argv.slice(2).includes("--check");
  try {
    if (checkMode) {
      runCheck();
    } else {
      runGenerate();
    }
  } catch (e) {
    console.error("EXPORT FAILED: " + e.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  extractFromSource,
  validate,
  buildProjection,
  serialize,
  buildDeterministicJson,
  SOURCE_PATH,
  OUTPUT_PATH,
};
