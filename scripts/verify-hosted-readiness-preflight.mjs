import { pathToFileURL } from "node:url";

const requiredNonSecretInputs = [
  "QA_PROOF_BASE_URL",
  "PUBLIC_ORGANIZATION_ID",
  "PUBLIC_ACCESS_REVIEW_WINDOW"
];

const requiredQaCommandInputs = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "QA_PARENT_EMAIL",
  "QA_PARENT_PASSWORD",
  "QA_COACH_EMAIL",
  "QA_COACH_PASSWORD",
  "QA_ADMIN_EMAIL",
  "QA_ADMIN_PASSWORD"
];

const requiredMigrationPlanInputs = [
  "SUPABASE_POOLER_DATABASE_URL",
  "SUPABASE_MIGRATION_TARGET_REF",
  "SUPABASE_MIGRATION_TARGET_ENV"
];

const localHostnames = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1"
]);

const protectedProductionHostnames = new Set([
  "leaguepilot.us",
  "www.leaguepilot.us"
]);

function trimmed(env, name) {
  return typeof env[name] === "string" ? env[name].trim() : "";
}

function isPlaceholder(value) {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("[your-") ||
    normalized.includes("<your-") ||
    normalized === "todo" ||
    normalized === "tbd" ||
    normalized === "changeme"
  );
}

function parseUrl(value, name, blockers) {
  try {
    return new URL(value);
  } catch {
    blockers.push(`${name} must be a valid absolute URL.`);
    return null;
  }
}

function isLocalProofUrl(url) {
  const hostname = url.hostname.toLowerCase();
  return (
    localHostnames.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  );
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function shellValue(value) {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function validateHostedReadinessPreflight(env = process.env) {
  const blockers = [];

  for (const name of [...requiredNonSecretInputs, ...requiredQaCommandInputs, ...requiredMigrationPlanInputs]) {
    if (isPlaceholder(trimmed(env, name))) {
      blockers.push(`${name} is required for hosted readiness preflight.`);
    }
  }

  const rawBaseUrl = trimmed(env, "QA_PROOF_BASE_URL");
  const baseUrl = rawBaseUrl ? parseUrl(rawBaseUrl, "QA_PROOF_BASE_URL", blockers) : null;
  if (baseUrl) {
    if (baseUrl.protocol !== "https:") {
      blockers.push("QA_PROOF_BASE_URL must use https for hosted proof.");
    }
    if (isLocalProofUrl(baseUrl)) {
      blockers.push("QA_PROOF_BASE_URL points at a local proof target; LPM-002 requires an explicit hosted deployment URL.");
    }
    if (protectedProductionHostnames.has(baseUrl.hostname.toLowerCase())) {
      blockers.push("QA_PROOF_BASE_URL must identify an isolated QA or Preview deployment, not the protected production host.");
    }
  }

  const supabaseUrlValue = trimmed(env, "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseUrl = supabaseUrlValue ? parseUrl(supabaseUrlValue, "NEXT_PUBLIC_SUPABASE_URL", blockers) : null;
  if (supabaseUrl && supabaseUrl.protocol !== "https:") {
    blockers.push("NEXT_PUBLIC_SUPABASE_URL must use https for hosted QA authentication.");
  }

  const migrationTargetRef = trimmed(env, "SUPABASE_MIGRATION_TARGET_REF");
  if (migrationTargetRef && !/^[a-z0-9]{8,32}$/i.test(migrationTargetRef)) {
    blockers.push("SUPABASE_MIGRATION_TARGET_REF must be a Supabase project reference.");
  }
  const migrationTargetEnv = trimmed(env, "SUPABASE_MIGRATION_TARGET_ENV").toLowerCase();
  if (migrationTargetEnv && !["qa", "preview"].includes(migrationTargetEnv)) {
    blockers.push("SUPABASE_MIGRATION_TARGET_ENV must be qa or preview for hosted session acceptance.");
  }
  const appProjectRef = supabaseUrl?.hostname.endsWith(".supabase.co")
    ? supabaseUrl.hostname.split(".")[0]
    : "";
  if (appProjectRef && migrationTargetRef && appProjectRef !== migrationTargetRef) {
    blockers.push("SUPABASE_MIGRATION_TARGET_REF must match the hosted app Supabase project reference.");
  }
  const allowAppTarget = trimmed(env, "SUPABASE_MIGRATION_ALLOW_APP_TARGET");
  if (
    migrationTargetRef
    && appProjectRef === migrationTargetRef
    && ["qa", "preview"].includes(migrationTargetEnv)
    && allowAppTarget !== "confirmed-nonproduction-target"
  ) {
    blockers.push("SUPABASE_MIGRATION_ALLOW_APP_TARGET=confirmed-nonproduction-target is required to plan against the hosted non-production app database.");
  }

  const organizationId = trimmed(env, "PUBLIC_ORGANIZATION_ID");
  if (organizationId && !isUuid(organizationId)) {
    blockers.push("PUBLIC_ORGANIZATION_ID must be the target organization UUID configured in the hosted environment.");
  }

  const reviewWindow = trimmed(env, "PUBLIC_ACCESS_REVIEW_WINDOW");
  if (reviewWindow && (reviewWindow.length < 6 || reviewWindow.length > 120)) {
    blockers.push("PUBLIC_ACCESS_REVIEW_WINDOW must be a human-readable review window between 6 and 120 characters.");
  }

  const normalizedBaseUrl = baseUrl ? baseUrl.origin + baseUrl.pathname.replace(/\/$/, "") : "";
  const migrationConfirmation = allowAppTarget
    ? ` SUPABASE_MIGRATION_ALLOW_APP_TARGET=${shellValue(allowAppTarget)}`
    : "";
  const commands = normalizedBaseUrl ? [
    `SUPABASE_MIGRATION_TARGET_REF=${shellValue(migrationTargetRef)} SUPABASE_MIGRATION_TARGET_ENV=${shellValue(migrationTargetEnv)}${migrationConfirmation} npm run supabase:plan`,
    `PUBLIC_FAMILY_BASE_URL=${shellValue(normalizedBaseUrl)} QA_PROOF_BASE_URL=${shellValue(normalizedBaseUrl)} PUBLIC_ORGANIZATION_ID=${shellValue(organizationId)} PUBLIC_ACCESS_REVIEW_WINDOW=${shellValue(reviewWindow)} npm run qa:public-family-proof`,
    `QA_PROOF_BASE_URL=${shellValue(normalizedBaseUrl)} npm run qa:session-proof`,
    `QA_PROOF_BASE_URL=${shellValue(normalizedBaseUrl)} npm run qa:rls-proof`,
    `QA_PROOF_BASE_URL=${shellValue(normalizedBaseUrl)} npm run qa:tenant-readiness-proof`
  ] : [];

  return {
    ok: blockers.length === 0,
    blockers,
    mode: baseUrl && !isLocalProofUrl(baseUrl) ? "hosted" : "local-or-invalid",
    baseUrl: normalizedBaseUrl,
    commands,
    checkedInputs: {
      requiredNonSecretInputs,
      requiredQaCommandInputs,
      requiredMigrationPlanInputs
    }
  };
}

export function formatHostedReadinessPreflightReport(result) {
  const lines = [];
  if (!result.ok) {
    lines.push("Hosted readiness preflight blocked.");
    lines.push("");
    lines.push("Blockers:");
    for (const blocker of result.blockers) lines.push(`- ${blocker}`);
    lines.push("");
    lines.push("This gate is for hosted proof only. Local proof can still be run with the local proof scripts, but it does not satisfy LPM-002 hosted readiness.");
    return lines.join("\n");
  }

  lines.push(`Hosted readiness preflight passed for ${result.baseUrl}.`);
  lines.push("");
  lines.push("Follow-on commands for the human/operator to run after hosted credentials, Vercel Authentication or bypass status, and target environment configuration are confirmed:");
  for (const command of result.commands) lines.push(command);
  lines.push("");
  lines.push("Boundaries preserved by this preflight:");
  lines.push("- No deployment or Vercel Authentication bypass is performed.");
  lines.push("- No Supabase seeding, database write, migration apply, provider send, payment write, or media upload is performed by this preflight.");
  lines.push("- The printed session and RLS proof commands perform guarded QA writes and readback only when the operator runs them against the confirmed isolated target.");
  lines.push("- Passing this gate is not hosted proof, provider readiness, payment readiness, migration acceptance, or production acceptance.");
  return lines.join("\n");
}

export function runHostedReadinessPreflightCli(env = process.env, streams = { stdout: process.stdout, stderr: process.stderr }) {
  const result = validateHostedReadinessPreflight(env);
  const report = formatHostedReadinessPreflightReport(result);
  if (result.ok) {
    streams.stdout.write(`${report}\n`);
    return 0;
  }
  streams.stderr.write(`${report}\n`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runHostedReadinessPreflightCli();
}
