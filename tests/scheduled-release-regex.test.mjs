#!/usr/bin/env node
/**
 * Unit test for the draft-status regex used by release-scheduled-drafts.yml.
 *
 * Guards against the regression where the selection loop used a double-escaped
 * pattern (r'^status:\\s*draft\\s*$') that matches nothing — which silently
 * disabled ALL automatic releases between 2026-08-23 and 2026-09-30.
 *
 * Run: node tests/scheduled-release-regex.test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(repoRoot, ".github/workflows/release-scheduled-drafts.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

// 1) The selection-loop regex (the line that reads article_text).
const line = workflow.split("\n").find((l) => l.includes("re.search") && l.includes("status:") && l.includes("article_text"));
check("selection-loop status regex line exists", Boolean(line));

const brokenVariantPresent = /status:\\\\s\*draft/.test(workflow);
check("no double-escaped \\\\s variant anywhere in the workflow (regression guard)", !brokenVariantPresent);

const raw = line.match(/r'([^']+)'/)?.[1];
check("regex raw literal extractable", Boolean(raw));

// Convert the Python raw string to a JS RegExp (same \s semantics for this pattern).
const re = new RegExp(raw, "m");

// 2) It must match a real draft frontmatter line.
check('matches "status: draft"', re.test("status: draft"));
check('matches "status:   draft" (extra spaces)', re.test("status:   draft"));
check('matches "status: draft" with trailing \\r', re.test("status: draft\r"));
check('matches "status: draft" inside multiline frontmatter', re.test("---\ntitle: x\nstatus: draft\n---\nbody"));

// 3) It must NOT match non-draft statuses.
check('does NOT match "status: published"', !re.test("status: published"));
check('does NOT match "status: draftX"', !re.test("status: draftX"));
check('does NOT match "status: draft extra"', !re.test("status: draft extra"));
check('does NOT match "status:" (empty)', !re.test("status:"));

// 4) The loud-fail branch exists (due entries with abnormal status -> exit 1).
check("loud-fail branch present (FAILING marker)", workflow.includes("FAILING:"));
check("loud-fail branch exits 1", /FAILING:[\s\S]{0,600}SystemExit\(1\)/.test(workflow));
check("idempotent no-due path still exits 0", workflow.includes("exiting idempotently"));

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll checks passed.");
