"use strict";

// Runner for the JS-native Growth Agent test suite. Shells out to Node's
// built-in test runner (`node --test`) rather than invoking node:test's
// programmatic API directly, so this behaves identically to running
// `node --test tests/test_growth_agent_js.js` by hand - correct TAP output,
// correct process exit code, no extra dependencies.

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const testFile = path.join(__dirname, "tests", "test_growth_agent_js.js");

const result = spawnSync(process.execPath, ["--test", testFile], { stdio: "inherit" });

if (result.error) {
  throw result.error;
}

process.exit(result.status === null ? 1 : result.status);

