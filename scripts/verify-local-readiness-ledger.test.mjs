import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTERNAL_OPEN_GATES,
  LOCAL_READINESS_SCRIPTS,
  LOCAL_READY_EXTERNAL_OPEN_STATUS,
  formatLocalReadinessLedgerReport,
  readRepositorySources,
  verifyLocalReadinessLedger
} from "./verify-local-readiness-ledger.mjs";

const fixtureSources = readRepositorySources();

function cloneSources() {
  return { ...fixtureSources };
}

function codesFor(result, family) {
  return result.blockers
    .filter((blocker) => blocker.family === family)
    .map((blocker) => blocker.code);
}

function removeFromDocs(sources, value, replacement = "removed readiness contract") {
  for (const key of ["workPlan", "taskBoard", "runbook"]) {
    sources[key] = sources[key].replaceAll(value, replacement);
  }
}

function replaceExecutableHeading(sources, heading) {
  sources.queue = sources.queue.replace(/^## LPM-\d{3}A?\s+-/m, heading);
}

function replaceActiveValidationCommand(sources, command, replacement) {
  sources.queue = sources.queue.replace(`  - ${command}`, `  - ${replacement}`);
}

function replaceWorkPlanStatus(sources, taskId, replacement) {
  const taskPattern = new RegExp("(## " + taskId + " -[\\s\\S]*?^Status: )`[^`]+`", "m");
  sources.workPlan = sources.workPlan.replace(taskPattern, `$1\`${replacement}\``);
}

test("passes against repository fixtures without hosted credentials or network access", () => {
  const result = verifyLocalReadinessLedger(cloneSources());
  const report = formatLocalReadinessLedgerReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository readiness proof only/);
  assert.match(report, /LPM-001/);
  assert.match(report, new RegExp(LOCAL_READY_EXTERNAL_OPEN_STATUS));
  assert.match(report, /qa:local-readiness-ledger/);
  assert.match(report, /production acceptance/);
});

test("fails when an AgentFlow baseline integration commit is missing", () => {
  const sources = cloneSources();
  sources.queue = sources.queue.replace(
    "`f1c27e47ce0fd32cb88ac440544b37271b6b0e88`",
    "`missing-lpm-012-sha`"
  );

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "agentflow-queue").includes("LPM_012_BASELINE_RECORD_MISSING"));
});

test("accepts LPM-013A as the sole executable queue task for ledger repair reruns", () => {
  const sources = cloneSources();
  replaceExecutableHeading(sources, "## LPM-013A -");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, true);
});

test("fails when the LPM-018 integration evidence is missing", () => {
  const sources = cloneSources();
  sources.queue = sources.queue.replace(
    "`50e56d2d33cd04dc869483a1f99b6583fd9cc36b`",
    "`missing-lpm-018-sha`"
  );

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "agentflow-queue").includes("LPM_018_INTEGRATION_RECORD_MISSING"));
});

test("fails when the executable queue heading is missing", () => {
  const sources = cloneSources();
  replaceExecutableHeading(sources, "### LPM-017 -");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "agentflow-queue").includes("EXECUTABLE_QUEUE_HEADING_MISSING"));
});

test("fails when multiple executable queue tasks are present", () => {
  const sources = cloneSources();
  sources.queue = sources.queue.replace(/^## LPM-\d{3}A?\s+-/m, (heading) => `${heading}\n\n## LPM-019 -`);

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "agentflow-queue").includes("MULTIPLE_EXECUTABLE_QUEUE_HEADINGS"));
});

for (const heading of ["## LPM-012 -", "## LPM-012A -"]) {
  test(`fails when ${heading.slice(3, -2)} is reintroduced as executable`, () => {
    const sources = cloneSources();
    replaceExecutableHeading(sources, heading);

    const result = verifyLocalReadinessLedger(sources);

    assert.equal(result.ok, false);
    assert.ok(codesFor(result, "agentflow-queue").includes("BASELINE_REEXECUTION_HEADING_NOT_ALLOWED"));
  });
}

test("fails when the active task validation list omits the ledger verifier", () => {
  const sources = cloneSources();
  replaceActiveValidationCommand(sources, "npm run qa:local-readiness-ledger", "npm run typecheck");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "agentflow-queue").includes("ACTIVE_LEDGER_VALIDATE_COMMAND_MISSING"));
});

test("fails when the active task validation list omits the ledger node test", () => {
  const sources = cloneSources();
  replaceActiveValidationCommand(
    sources,
    "node --test scripts/verify-local-readiness-ledger.test.mjs",
    "npm run typecheck"
  );

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "agentflow-queue").includes("ACTIVE_LEDGER_TEST_COMMAND_MISSING"));
});

test("accepts the exact active task validation commands", () => {
  const result = verifyLocalReadinessLedger(cloneSources());

  assert.equal(result.ok, true);
  assert.deepEqual(codesFor(result, "agentflow-queue"), []);
});

test("accepts the local-readiness-with-external-proof-open work-plan statuses", () => {
  const result = verifyLocalReadinessLedger(cloneSources());

  assert.equal(result.ok, true);
  assert.deepEqual(codesFor(result, "work-plan-status"), []);
});

test("fails when an LPM-002 through LPM-012 work-plan row returns to plain planned", () => {
  const sources = cloneSources();
  replaceWorkPlanStatus(sources, "LPM-002", "planned");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "work-plan-status").includes("LPM_002_WORK_PLAN_STATUS_PLAIN_PLANNED"));
});

test("fails when an LPM-002 through LPM-012 work-plan row is overstated as end-to-end done", () => {
  const sources = cloneSources();
  replaceWorkPlanStatus(sources, "LPM-011", "done");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "work-plan-status").includes("LPM_011_WORK_PLAN_STATUS_END_TO_END_DONE_OVERSTATED"));
});

test("fails when an LPM-002 through LPM-012 work-plan row loses external-proof language", () => {
  const sources = cloneSources();
  replaceWorkPlanStatus(sources, "LPM-012", "local repository readiness complete");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(
    codesFor(result, "work-plan-status").includes(
      "LPM_012_WORK_PLAN_STATUS_EXTERNAL_PROOF_DISTINCTION_MISSING"
    )
  );
});

for (const { label, command, blocker, nearMatches } of [
  {
    label: "ledger verifier",
    command: "npm run qa:local-readiness-ledger",
    blocker: "ACTIVE_LEDGER_VALIDATE_COMMAND_MISSING",
    nearMatches: [
      ["suffixed", "npm run qa:local-readiness-ledger-extra"],
      ["prefixed", "npx npm run qa:local-readiness-ledger"],
      ["argument-appended", "npm run qa:local-readiness-ledger -- --dry-run"]
    ]
  },
  {
    label: "ledger node test",
    command: "node --test scripts/verify-local-readiness-ledger.test.mjs",
    blocker: "ACTIVE_LEDGER_TEST_COMMAND_MISSING",
    nearMatches: [
      ["suffixed", "node --test scripts/verify-local-readiness-ledger.test.mjs-extra"],
      ["prefixed", "npx node --test scripts/verify-local-readiness-ledger.test.mjs"],
      ["argument-appended", "node --test scripts/verify-local-readiness-ledger.test.mjs --watch"]
    ]
  }
]) {
  for (const [matchType, replacement] of nearMatches) {
    test(`rejects ${matchType} near match for the active task ${label} command`, () => {
      const sources = cloneSources();
      replaceActiveValidationCommand(sources, command, replacement);

      const result = verifyLocalReadinessLedger(sources);

      assert.equal(result.ok, false);
      assert.ok(codesFor(result, "agentflow-queue").includes(blocker));
    });
  }
}

test("fails when a local readiness package script points away from its verifier", () => {
  const sources = cloneSources();
  const packageJson = JSON.parse(sources.packageJson);
  packageJson.scripts["qa:private-media-storage-readiness"] = "node scripts/other.mjs";
  sources.packageJson = `${JSON.stringify(packageJson, null, 2)}\n`;

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "readiness-scripts").includes("LPM_008_PACKAGE_SCRIPT_MISSING"));
});

test("fails when a local readiness verifier lacks direct node test coverage", () => {
  const sources = cloneSources();
  const hostedIndex = LOCAL_READINESS_SCRIPTS.findIndex(
    (entry) => entry.packageScript === "qa:hosted-readiness-preflight"
  );
  sources[`readinessTest${hostedIndex}`] = sources[`readinessTest${hostedIndex}`].replace(
    "\"node:test\"",
    "\"node:assert\""
  );

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "readiness-scripts").includes("LPM_002_TEST_RUNNER_MISSING"));
});

test("fails when governing docs stop saying the sequence is locally complete only", () => {
  const sources = cloneSources();
  removeFromDocs(sources, "locally complete through LPM-012", "partially done");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "documentation-boundaries").some((code) => code.includes("LOCALLY_COMPLETE_THROUGH_LPM_012")));
});

test("fails when governing docs overstate production acceptance", () => {
  const sources = cloneSources();
  sources.runbook += "\nProduction acceptance is complete.\n";

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "documentation-boundaries").includes("HOSTED_PROVIDER_PRODUCTION_ACCEPTANCE_OVERSTATED"));
});

test("fails when checkout and AgentFlow HEAD boundary records are missing", () => {
  const sources = cloneSources();
  removeFromDocs(sources, "Final integration commit through LPM-018", "Final local note");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "checkout-boundary").some((code) => code.includes("FINAL_INTEGRATION_COMMIT_THROUGH_LPM_018")));
});

test("fails when the ledger script gains an external side-effect call", () => {
  const sources = cloneSources();
  sources.readinessScript11 += "\nfetch(\"https://example.com\");\n";

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "ledger-self-boundary").includes("LEDGER_EXTERNAL_SIDE_EFFECT_API_PRESENT"));
});

for (const gate of EXTERNAL_OPEN_GATES) {
  test(`fails when the ${gate} open gate is removed`, () => {
    const sources = cloneSources();
    removeFromDocs(sources, gate, "removed external gate");

    const result = verifyLocalReadinessLedger(sources);

    assert.equal(result.ok, false);
    assert.ok(
      codesFor(result, "external-open-gates").includes(
        `OPEN_GATE_${gate.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MISSING`
      )
    );
  });
}
