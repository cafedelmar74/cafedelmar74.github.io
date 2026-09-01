"use strict";

// Runner for the business_context test suite. Shells out to Node's built-in
// test runner (`node --test`) so this behaves identically to running
// `node --test tests/test_business_context.js` by hand - correct TAP
// output, correct process exit code, no extra dependencies.

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const testFile = path.join(__dirname, "tests", "test_business_context.js");

const result = spawnSync(process.execPath, ["--test", testFile], { stdio: "inherit" });

if (result.error) {
  throw result.error;
}

process.exit(result.status === null ? 1 : result.status);
