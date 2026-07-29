#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const QUEUE_BASELINE_ITEMS = [
  { canonical: "LPM-001", ids: ["LPM-001"] },
  { canonical: "LPM-002", ids: ["LPM-002", "LPM-002A"] },
  { canonical: "LPM-003", ids: ["LPM-003"] },
  { canonical: "LPM-004", ids: ["LPM-004", "LPM-004A"] },
  { canonical: "LPM-005", ids: ["LPM-005", "LPM-005A"] },
  { canonical: "LPM-006", ids: ["LPM-006", "LPM-006A"] },
  { canonical: "LPM-007", ids: ["LPM-007", "LPM-007A"] },
  { canonical: "LPM-008", ids: ["LPM-008", "LPM-008A"] },
  { canonical: "LPM-009", ids: ["LPM-009", "LPM-009A"] },
  { canonical: "LPM-010", ids: ["LPM-010", "LPM-010A"] },
  { canonical: "LPM-011", ids: ["LPM-011", "LPM-011A"] },
  { canonical: "LPM-012", ids: ["LPM-012", "LPM-012A"] }
];

export const LOCAL_READY_EXTERNAL_OPEN_STATUS = "local repository readiness complete - external proof open";

export const WORK_PLAN_LOCAL_READINESS_STATUS_ITEMS = QUEUE_BASELINE_ITEMS.filter(
  (item) => item.canonical !== "LPM-001"
);

export const REQUIRED_CONTINUED_EXECUTION_ITEMS = [
  {
    canonical: "LPM-018",
    ids: ["LPM-018"],
    buildId: "build_faa1c28e-cc9d-4912-9529-0df1240963da",
    integrationCommit: "50e56d2d33cd04dc869483a1f99b6583fd9cc36b"
  }
];

export const LOCAL_READINESS_SCRIPTS = [
  {
    task: "LPM-002",
    packageScript: "qa:hosted-readiness-preflight",
    scriptPath: "scripts/verify-hosted-readiness-preflight.mjs",
    testPath: "scripts/verify-hosted-readiness-preflight.test.mjs"
  },
  {
    task: "LPM-003",
    packageScript: "qa:access-lifecycle-authority",
    scriptPath: "scripts/verify-access-lifecycle-authority.mjs",
    testPath: "scripts/verify-access-lifecycle-authority.test.mjs"
  },
  {
    task: "LPM-004",
    packageScript: "qa:admin-proof-readiness",
    scriptPath: "scripts/verify-admin-proof-closure-readiness.mjs",
    testPath: "scripts/verify-admin-proof-closure-readiness.test.mjs"
  },
  {
    task: "LPM-005",
    packageScript: "qa:game-day-communication-readiness",
    scriptPath: "scripts/verify-game-day-communication-readiness.mjs",
    testPath: "scripts/verify-game-day-communication-readiness.test.mjs"
  },
  {
    task: "LPM-006",
    packageScript: "qa:family-season-continuity-readiness",
    scriptPath: "scripts/verify-family-season-continuity-readiness.mjs",
    testPath: "scripts/verify-family-season-continuity-readiness.test.mjs"
  },
  {
    task: "LPM-007",
    packageScript: "qa:provider-sandbox-readiness",
    scriptPath: "scripts/verify-provider-sandbox-readiness.mjs",
    testPath: "scripts/verify-provider-sandbox-readiness.test.mjs"
  },
  {
    task: "LPM-008",
    packageScript: "qa:private-media-storage-readiness",
    scriptPath: "scripts/verify-private-media-storage-readiness.mjs",
    testPath: "scripts/verify-private-media-storage-readiness.test.mjs"
  },
  {
    task: "LPM-009",
    packageScript: "qa:sponsor-stripe-readiness",
    scriptPath: "scripts/verify-sponsor-stripe-readiness.mjs",
    testPath: "scripts/verify-sponsor-stripe-readiness.test.mjs"
  },
  {
    task: "LPM-010",
    packageScript: "qa:sponsor-fulfillment-readiness",
    scriptPath: "scripts/verify-sponsor-fulfillment-readiness.mjs",
    testPath: "scripts/verify-sponsor-fulfillment-readiness.test.mjs"
  },
  {
    task: "LPM-011",
    packageScript: "qa:reporting-archive-readiness",
    scriptPath: "scripts/verify-reporting-archive-readiness.mjs",
    testPath: "scripts/verify-reporting-archive-readiness.test.mjs"
  },
  {
    task: "LPM-012",
    packageScript: "qa:native-app-decision-readiness",
    scriptPath: "scripts/verify-native-app-decision-readiness.mjs",
    testPath: "scripts/verify-native-app-decision-readiness.test.mjs"
  },
  {
    task: "LPM-013A",
    packageScript: "qa:local-readiness-ledger",
    scriptPath: "scripts/verify-local-readiness-ledger.mjs",
    testPath: "scripts/verify-local-readiness-ledger.test.mjs"
  }
];

export const EXTERNAL_OPEN_GATES = [
  "hosted browser proof",
  "Supabase readback",
  "RLS",
  "provider sandbox/webhooks",
  "Stripe settlement",
  "private media storage/scanner",
  "sponsor rendering/report/finance",
  "archive retention/restore",
  "native/app-store",
  "accessibility",
  "production acceptance"
];

export const REQUIRED_DOC_PHRASES = [
  "locally complete through LPM-012",
  "LPM-013A is a ledger/verifier only",
  "local repository readiness proof only",
  LOCAL_READY_EXTERNAL_OPEN_STATUS,
  "continued one-task-at-a-time execution accepts exactly one executable queue heading",
  "LPM-013A or LPM-014 or later",
  "LPM-001 through LPM-012 remain completed records only",
  "LPM-018 is integrated in AgentFlow build `build_faa1c28e-cc9d-4912-9529-0df1240963da` at integration commit `50e56d2d33cd04dc869483a1f99b6583fd9cc36b`",
  "external proof and production acceptance remain separate authorized follow-up lanes"
];

export const CHECKOUT_BOUNDARY_PHRASES = [
  "Protected source checkout boundary",
  "Clean AgentFlow execution checkout",
  "both checkout states must be re-read before every task",
  "no-push/no-deploy/no-provider/no-production-mutation boundary",
  "Final integration commit through LPM-018",
  "/home/administrator/projects/youth-sports-platform-mvp-v3",
  "/home/administrator/projects/leaguepilot-missing-production-agentflow-20260729",
  "50e56d2d33cd04dc869483a1f99b6583fd9cc36b",
  "not the queue commit",
  "not a future final HEAD"
];

export const DEFAULT_SOURCE_FILES = Object.freeze({
  packageJson: "package.json",
  queue: "docs/agentflow-missing-production-backlog.md",
  workPlan: "docs/missing-production-slices-work-plan.md",
  taskBoard: "docs/production-task-board.md",
  runbook: "docs/runbook.md",
  ...Object.fromEntries(
    LOCAL_READINESS_SCRIPTS.flatMap((entry, index) => [
      [`readinessScript${index}`, entry.scriptPath],
      [`readinessTest${index}`, entry.testPath]
    ])
  )
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function combined(sources, keys) {
  return keys.map((key) => sources[key] ?? "").join("\n\n");
}

function pathFor(key) {
  return DEFAULT_SOURCE_FILES[key] ?? key;
}

function addBlocker(blockers, family, code, keys, message) {
  blockers.push({
    family,
    code,
    paths: keys.map(pathFor),
    message
  });
}

function requirePattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  const ok = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
  if (!ok) addBlocker(blockers, family, code, keys, message);
}

function requireNoPattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  if (pattern.test(text)) addBlocker(blockers, family, code, keys, message);
}

function parseExecutableQueueHeadings(queue) {
  return [...queue.matchAll(/^## (LPM-(\d{3})(A?))\s+-/gm)].map((match) => ({
    id: match[1],
    number: Number(match[2]),
    variant: match[3],
    index: match.index ?? 0
  }));
}

function activeQueueBlock(queue, heading) {
  const nextHeadingIndex = queue.slice(heading.index + 1).search(/^## LPM-\d{3}A?\s+-/m);
  if (nextHeadingIndex === -1) return queue.slice(heading.index);
  return queue.slice(heading.index, heading.index + 1 + nextHeadingIndex);
}

function activeQueueValidationCommands(block) {
  const yamlBlock = block.match(/```yaml\n([\s\S]*?)\n```/);
  if (!yamlBlock) return [];

  const yamlLines = yamlBlock[1].split("\n");
  const validateIndex = yamlLines.findIndex((line) => line === "validate:");
  if (validateIndex === -1) return [];

  const commands = [];
  for (const line of yamlLines.slice(validateIndex + 1)) {
    const entry = line.match(/^  - (.+)$/);
    if (entry) {
      commands.push(entry[1].trimEnd());
      continue;
    }
    if (line.trim() !== "" && !line.startsWith("  ")) break;
  }

  return commands;
}

function workPlanTaskBlock(workPlan, taskId) {
  const headingPattern = new RegExp(`^## ${escapeRegExp(taskId)}\\s+-.*$`, "m");
  const heading = workPlan.match(headingPattern);
  if (!heading) return "";

  const start = heading.index ?? 0;
  const rest = workPlan.slice(start + heading[0].length);
  const nextHeading = rest.search(/^## LPM-\d{3}A?\s+-/m);
  return nextHeading === -1 ? workPlan.slice(start) : workPlan.slice(start, start + heading[0].length + nextHeading);
}

function workPlanTaskStatus(block) {
  return block.match(/^Status:\s*`([^`]+)`\s*$/m)?.[1].trim() ?? "";
}

function requireActiveValidationCommand(blockers, validationCommands, command, code, message) {
  if (!validationCommands.includes(command)) {
    addBlocker(blockers, "agentflow-queue", code, ["queue"], message);
  }
}

export function readRepositorySources(rootDir = process.cwd(), sourceFiles = DEFAULT_SOURCE_FILES) {
  return Object.fromEntries(
    Object.entries(sourceFiles).map(([key, relativePath]) => {
      const absolutePath = resolve(rootDir, relativePath);
      return [key, existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : ""];
    })
  );
}

function parsePackageScripts(packageJsonText, blockers) {
  try {
    const packageJson = JSON.parse(packageJsonText);
    return packageJson.scripts ?? {};
  } catch (error) {
    addBlocker(
      blockers,
      "readiness-scripts",
      "PACKAGE_JSON_PARSE_FAILED",
      ["packageJson"],
      `package.json must be valid JSON: ${error.message}`
    );
    return {};
  }
}

function verifyAgentFlowQueue(sources, blockers) {
  const queue = sources.queue ?? "";
  for (const item of QUEUE_BASELINE_ITEMS) {
    const idPattern = item.ids.map(escapeRegExp).join("|");
    const baselinePattern = new RegExp(
      `- (${idPattern}) integrated in AgentFlow build\\s*\`build_[0-9a-f-]{36}\` at integration commit\\s*\`[0-9a-f]{40}\``,
      "s"
    );
    if (!baselinePattern.test(queue)) {
      addBlocker(
        blockers,
        "agentflow-queue",
        `${item.canonical.replace("-", "_")}_BASELINE_RECORD_MISSING`,
        ["queue"],
        `${item.canonical} must be recorded as a completed baseline item with an AgentFlow build id and integration commit SHA.`
      );
    }
  }

  for (const item of REQUIRED_CONTINUED_EXECUTION_ITEMS) {
    const idPattern = item.ids.map(escapeRegExp).join("|");
    const continuedRecordPattern = new RegExp(
      `- (${idPattern}) integrated in AgentFlow build\\s*\`${escapeRegExp(item.buildId)}\` at integration commit\\s*\`${item.integrationCommit}\``,
      "s"
    );
    if (!continuedRecordPattern.test(queue)) {
      addBlocker(
        blockers,
        "agentflow-queue",
        `${item.canonical.replace("-", "_")}_INTEGRATION_RECORD_MISSING`,
        ["queue"],
        `${item.canonical} must be recorded with AgentFlow build ${item.buildId} and integration commit ${item.integrationCommit}.`
      );
    }
  }

  const executableHeadings = parseExecutableQueueHeadings(queue);
  if (executableHeadings.length === 0) {
    addBlocker(
      blockers,
      "agentflow-queue",
      "EXECUTABLE_QUEUE_HEADING_MISSING",
      ["queue"],
      "Exactly one executable queue heading is required: LPM-013A or LPM-014 or later."
    );
  } else if (executableHeadings.length > 1) {
    addBlocker(
      blockers,
      "agentflow-queue",
      "MULTIPLE_EXECUTABLE_QUEUE_HEADINGS",
      ["queue"],
      `Exactly one executable queue heading is allowed; found ${executableHeadings.map((heading) => heading.id).join(", ")}.`
    );
  } else {
    const [activeHeading] = executableHeadings;
    if (activeHeading.number <= 12) {
      addBlocker(
        blockers,
        "agentflow-queue",
        "BASELINE_REEXECUTION_HEADING_NOT_ALLOWED",
        ["queue"],
        `${activeHeading.id} is part of the completed LPM-001 through LPM-012 baseline and must not be re-executed.`
      );
    } else if (activeHeading.id !== "LPM-013A" && activeHeading.number < 14) {
      addBlocker(
        blockers,
        "agentflow-queue",
        "EXECUTABLE_QUEUE_HEADING_NOT_ALLOWED",
        ["queue"],
        `Executable queue heading ${activeHeading.id} is not allowed; use LPM-013A or LPM-014 or later.`
      );
    }

    const validationCommands = activeQueueValidationCommands(activeQueueBlock(queue, activeHeading));
    requireActiveValidationCommand(
      blockers,
      validationCommands,
      "npm run qa:local-readiness-ledger",
      "ACTIVE_LEDGER_VALIDATE_COMMAND_MISSING",
      "The active AgentFlow task validation list must run the local readiness ledger script."
    );
    requireActiveValidationCommand(
      blockers,
      validationCommands,
      "node --test scripts/verify-local-readiness-ledger.test.mjs",
      "ACTIVE_LEDGER_TEST_COMMAND_MISSING",
      "The active AgentFlow task validation list must run the local readiness ledger tests."
    );
  }

  requirePattern(
    blockers,
    sources,
    "agentflow-queue",
    "LEDGER_VALIDATE_COMMAND_MISSING",
    ["queue"],
    "npm run qa:local-readiness-ledger",
    "The AgentFlow queue must validate the local readiness ledger script."
  );
  requirePattern(
    blockers,
    sources,
    "agentflow-queue",
    "LEDGER_TEST_COMMAND_MISSING",
    ["queue"],
    "node --test scripts/verify-local-readiness-ledger.test.mjs",
    "The AgentFlow queue must validate the local readiness ledger tests."
  );
}

function verifyReadinessScripts(sources, blockers) {
  const packageScripts = parsePackageScripts(sources.packageJson ?? "", blockers);

  LOCAL_READINESS_SCRIPTS.forEach((entry, index) => {
    const scriptKey = `readinessScript${index}`;
    const testKey = `readinessTest${index}`;
    const expectedPackageCommand = `node ${entry.scriptPath}`;

    if (packageScripts[entry.packageScript] !== expectedPackageCommand) {
      addBlocker(
        blockers,
        "readiness-scripts",
        `${entry.task.replace("-", "_")}_PACKAGE_SCRIPT_MISSING`,
        ["packageJson"],
        `${entry.packageScript} must map to "${expectedPackageCommand}".`
      );
    }

    requirePattern(
      blockers,
      sources,
      "readiness-scripts",
      `${entry.task.replace("-", "_")}_TEST_RUNNER_MISSING`,
      [testKey],
      /node:test/,
      `${entry.testPath} must use direct node --test coverage.`
    );
    requirePattern(
      blockers,
      sources,
      "readiness-scripts",
      `${entry.task.replace("-", "_")}_DIRECT_SCRIPT_IMPORT_MISSING`,
      [testKey],
      basename(entry.scriptPath),
      `${entry.testPath} must directly import ${entry.scriptPath}.`
    );
    requirePattern(
      blockers,
      sources,
      "readiness-scripts",
      `${entry.task.replace("-", "_")}_SCRIPT_FILE_MISSING_OR_EMPTY`,
      [scriptKey],
      /[\s\S]+/,
      `${entry.scriptPath} must be present and non-empty.`
    );
  });
}

function verifyWorkPlanLocalReadinessStatuses(sources, blockers) {
  const workPlan = sources.workPlan ?? "";

  for (const item of WORK_PLAN_LOCAL_READINESS_STATUS_ITEMS) {
    const block = workPlanTaskBlock(workPlan, item.canonical);
    if (!block) {
      addBlocker(
        blockers,
        "work-plan-status",
        `${item.canonical.replace("-", "_")}_WORK_PLAN_ROW_MISSING`,
        ["workPlan"],
        `${item.canonical} must remain present in the governing work plan.`
      );
      continue;
    }

    const status = workPlanTaskStatus(block);
    const codePrefix = item.canonical.replace("-", "_");
    if (!status) {
      addBlocker(
        blockers,
        "work-plan-status",
        `${codePrefix}_WORK_PLAN_STATUS_MISSING`,
        ["workPlan"],
        `${item.canonical} must declare Status: \`${LOCAL_READY_EXTERNAL_OPEN_STATUS}\`.`
      );
      continue;
    }

    if (status === "planned") {
      addBlocker(
        blockers,
        "work-plan-status",
        `${codePrefix}_WORK_PLAN_STATUS_PLAIN_PLANNED`,
        ["workPlan"],
        `${item.canonical} must not return to plain planned after local repository readiness completion.`
      );
      continue;
    }

    if (status === "done") {
      addBlocker(
        blockers,
        "work-plan-status",
        `${codePrefix}_WORK_PLAN_STATUS_END_TO_END_DONE_OVERSTATED`,
        ["workPlan"],
        `${item.canonical} must not be overstated as end-to-end done while external proof remains open.`
      );
      continue;
    }

    if (status !== LOCAL_READY_EXTERNAL_OPEN_STATUS) {
      addBlocker(
        blockers,
        "work-plan-status",
        `${codePrefix}_WORK_PLAN_STATUS_EXTERNAL_PROOF_DISTINCTION_MISSING`,
        ["workPlan"],
        `${item.canonical} must use the exact status \`${LOCAL_READY_EXTERNAL_OPEN_STATUS}\` to preserve the local-readiness/external-proof distinction.`
      );
    }
  }
}

function verifyDocumentationBoundaries(sources, blockers) {
  for (const docKey of ["workPlan", "taskBoard", "runbook"]) {
    for (const phrase of REQUIRED_DOC_PHRASES) {
      requirePattern(
        blockers,
        sources,
        "documentation-boundaries",
        `${docKey.toUpperCase()}_${phrase.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MISSING`,
        [docKey],
        phrase,
        `${pathFor(docKey)} must identify the local sequence boundary: ${phrase}.`
      );
    }
  }

  requireNoPattern(
    blockers,
    sources,
    "documentation-boundaries",
    "HOSTED_PROVIDER_PRODUCTION_ACCEPTANCE_OVERSTATED",
    ["workPlan", "taskBoard", "runbook"],
    /\b(hosted|provider|payment|storage|mobile|backup\/restore|accessibility|production)\s+acceptance\s+(is\s+)?(complete|closed|accepted|done)\b/i,
    "Governing docs must not claim hosted, provider, payment, storage, mobile, backup/restore, accessibility, or production acceptance."
  );
}

function verifyExternalOpenGates(sources, blockers) {
  for (const gate of EXTERNAL_OPEN_GATES) {
    const pattern = new RegExp(`${escapeRegExp(gate)}\\s+open`, "i");
    requirePattern(
      blockers,
      sources,
      "external-open-gates",
      `OPEN_GATE_${gate.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MISSING`,
      ["workPlan", "taskBoard", "runbook"],
      pattern,
      `${gate} must remain named as an open external gate.`
    );
  }
}

function verifyCheckoutBoundary(sources, blockers) {
  for (const phrase of CHECKOUT_BOUNDARY_PHRASES) {
    requirePattern(
      blockers,
      sources,
      "checkout-boundary",
      `${phrase.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MISSING`,
      ["workPlan", "taskBoard", "runbook"],
      phrase,
      `Governing docs must record the checkout/execution boundary: ${phrase}.`
    );
  }
}

function verifyLedgerSelfBoundary(sources, blockers) {
  requireNoPattern(
    blockers,
    sources,
    "ledger-self-boundary",
    "LEDGER_EXTERNAL_SIDE_EFFECT_API_PRESENT",
    ["readinessScript11"],
    /\b(?:fetch|spawn|exec|execFile)\s*\(|from\s+["'](?:@supabase|stripe|twilio|@sendgrid|@playwright|playwright|child_process)/i,
    "The local readiness ledger must not include external side-effect or provider/browser/deploy client calls."
  );
  requirePattern(
    blockers,
    sources,
    "ledger-self-boundary",
    "LEDGER_LOCAL_ONLY_COPY_MISSING",
    ["readinessScript11"],
    "local repository readiness proof only",
    "The ledger report must identify itself as local repository readiness proof only."
  );
}

export function verifyLocalReadinessLedger(sources) {
  const blockers = [];
  verifyAgentFlowQueue(sources, blockers);
  verifyReadinessScripts(sources, blockers);
  verifyWorkPlanLocalReadinessStatuses(sources, blockers);
  verifyDocumentationBoundaries(sources, blockers);
  verifyExternalOpenGates(sources, blockers);
  verifyCheckoutBoundary(sources, blockers);
  verifyLedgerSelfBoundary(sources, blockers);

  return {
    ok: blockers.length === 0,
    blockers,
    checked: {
      completedBaselineItems: QUEUE_BASELINE_ITEMS.map((item) => item.canonical),
      workPlanLocalReadinessStatus: LOCAL_READY_EXTERNAL_OPEN_STATUS,
      localReadinessScripts: LOCAL_READINESS_SCRIPTS.map((entry) => entry.packageScript),
      externalOpenGates: EXTERNAL_OPEN_GATES
    }
  };
}

export function formatLocalReadinessLedgerReport(result) {
  const lines = [
    "LeaguePilot local readiness completion ledger",
    "Scope: local repository readiness proof only; no hosted/provider/payment/storage/browser/analytics/app-store/backup/accessibility/production acceptance is claimed.",
    `Status: ${result.ok ? "pass" : "blocked"}`,
    "",
    "Completed local baseline required:",
    ...result.checked.completedBaselineItems.map((item) => `- ${item}`),
    "",
    `Work-plan status required for LPM-002 through LPM-012: ${result.checked.workPlanLocalReadinessStatus}`,
    "",
    "Local readiness scripts checked:",
    ...result.checked.localReadinessScripts.map((script) => `- ${script}`),
    "",
    "External gates that must remain open unless separately proven:",
    ...result.checked.externalOpenGates.map((gate) => `- ${gate}`)
  ];

  if (!result.ok) {
    lines.push("", "Named blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- ${blocker.code} [${blocker.family}] ${blocker.message}`);
      lines.push(`  paths: ${blocker.paths.join(", ")}`);
    }
  }

  return lines.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = verifyLocalReadinessLedger(readRepositorySources());
  console.log(formatLocalReadinessLedgerReport(result));
  process.exit(result.ok ? 0 : 1);
}
