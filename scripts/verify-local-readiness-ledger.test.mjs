import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTERNAL_OPEN_GATES,
  LOCAL_READINESS_SCRIPTS,
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

test("passes against repository fixtures without hosted credentials or network access", () => {
  const result = verifyLocalReadinessLedger(cloneSources());
  const report = formatLocalReadinessLedgerReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository readiness proof only/);
  assert.match(report, /LPM-001/);
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

test("fails when LPM-013A is not the only executable queue task", () => {
  const sources = cloneSources();
  sources.queue = sources.queue.replace("## LPM-013A -", "## LPM-013A -\n\n## LPM-014A -");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "agentflow-queue").includes("EXECUTABLE_QUEUE_NOT_LEDGER_ONLY"));
});

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
  removeFromDocs(sources, "Final AgentFlow HEAD through LPM-012", "Final local note");

  const result = verifyLocalReadinessLedger(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "checkout-boundary").some((code) => code.includes("FINAL_AGENTFLOW_HEAD_THROUGH_LPM_012")));
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
