import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const APPLY_CONFIRMATION = "apply-reviewed-migrations";
const PRODUCTION_APPLY_CONFIRMATION = "apply-reviewed-production-migrations";
const NONPRODUCTION_APP_TARGET_CONFIRMATION = "confirmed-nonproduction-target";
const SEED_CONFIRMATION = "include-nonproduction-seed";
const PROTECTED_PRODUCTION_PROJECT_REF = "dkwghvvlbdnnwzbnscvu";
const INVOCATION_ONLY_ENV_KEYS = new Set([
  "SUPABASE_MIGRATION_TARGET_REF",
  "SUPABASE_MIGRATION_TARGET_ENV",
  "SUPABASE_MIGRATION_CONFIRM",
  "SUPABASE_MIGRATION_INCLUDE_SEED",
  "SUPABASE_MIGRATION_ALLOW_APP_TARGET"
]);

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
    if (
      key &&
      !INVOCATION_ONLY_ENV_KEYS.has(key) &&
      !(key in process.env)
    ) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const databaseUrl =
  process.env.SUPABASE_POOLER_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_DATABASE_URL;
const expectedProjectRef = process.env.SUPABASE_MIGRATION_TARGET_REF?.trim();
const targetEnvironment = process.env.SUPABASE_MIGRATION_TARGET_ENV?.trim().toLowerCase();
const dryRunOnly = process.argv.includes("--dry-run");

if (!databaseUrl || databaseUrl.includes("[YOUR-PASSWORD]")) {
  console.error(
    "Missing database URL. Set an explicitly selected QA/preview database URL before planning migrations."
  );
  process.exit(1);
}

function projectRefFromDatabaseUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) return null;

  const directMatch = parsed.hostname.match(/^db\.([a-z0-9-]+)\.supabase\.co$/);
  if (directMatch) return directMatch[1];

  if (!/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(parsed.hostname)) return null;

  const poolerUser = decodeURIComponent(parsed.username);
  const poolerMatch = poolerUser.match(/^postgres\.([a-z0-9-]+)$/);
  return poolerMatch?.[1] ?? null;
}

function projectRefFromApiUrl(value) {
  if (!value) return null;
  try {
    return new URL(value).hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

const databaseProjectRef = projectRefFromDatabaseUrl(databaseUrl);
const appProjectRef = projectRefFromApiUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  console.error("The migration database URL is invalid.");
  process.exit(1);
}

if (!expectedProjectRef || !/^[a-z0-9-]+$/.test(expectedProjectRef)) {
  console.error(
    "SUPABASE_MIGRATION_TARGET_REF is required and must name the explicitly selected target."
  );
  process.exit(1);
}

if (!databaseProjectRef || databaseProjectRef !== expectedProjectRef) {
  console.error(
    "The migration database URL must use the matching Supabase direct host or Supavisor pooler host. Refusing to continue."
  );
  process.exit(1);
}

if (
  parsedDatabaseUrl.hostname.endsWith(".pooler.supabase.com") &&
  parsedDatabaseUrl.port === "6543"
) {
  console.error(
    "Supabase transaction-pooler URLs (port 6543) do not support the prepared statements used by migration tooling. Use the session pooler on port 5432 or the direct database URL."
  );
  process.exit(1);
}

if (!["qa", "preview", "production"].includes(targetEnvironment)) {
  console.error("SUPABASE_MIGRATION_TARGET_ENV must be qa, preview, or production.");
  process.exit(1);
}

if (
  expectedProjectRef === PROTECTED_PRODUCTION_PROJECT_REF &&
  targetEnvironment !== "production"
) {
  console.error(
    "The protected LeaguePilot production ref must be classified as production."
  );
  process.exit(1);
}

if (
  targetEnvironment === "production" &&
  expectedProjectRef !== PROTECTED_PRODUCTION_PROJECT_REF
) {
  console.error(
    "This repository accepts the production classification only for the protected LeaguePilot production ref."
  );
  process.exit(1);
}

if (
  targetEnvironment !== "production" &&
  appProjectRef === databaseProjectRef &&
  process.env.SUPABASE_MIGRATION_ALLOW_APP_TARGET !== NONPRODUCTION_APP_TARGET_CONFIRMATION
) {
  console.error(
    "The migration target matches NEXT_PUBLIC_SUPABASE_URL. " +
      `Set SUPABASE_MIGRATION_ALLOW_APP_TARGET=${NONPRODUCTION_APP_TARGET_CONFIRMATION} ` +
      "only after independently confirming this is a non-production app environment."
  );
  process.exit(1);
}

function runSupabase(args) {
  const result = spawnSync("npx", ["--no-install", "supabase", ...args], {
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result;
}

console.log(`Supabase migration target verified: ${expectedProjectRef} (${targetEnvironment}).`);

const includeSeed = process.env.SUPABASE_MIGRATION_INCLUDE_SEED === SEED_CONFIRMATION;
if (includeSeed && targetEnvironment === "production") {
  console.error("Seed data is forbidden for production migration promotion.");
  process.exit(1);
}

const pushArgs = [
  "db",
  "push",
  "--db-url",
  databaseUrl,
  ...(includeSeed ? ["--include-seed"] : []),
  "--workdir",
  "."
];
const planResult = runSupabase([...pushArgs, "--dry-run"]);

if ((planResult.status ?? 1) !== 0 || dryRunOnly) {
  process.exit(planResult.status ?? 1);
}

const requiredApplyConfirmation =
  targetEnvironment === "production"
    ? PRODUCTION_APPLY_CONFIRMATION
    : APPLY_CONFIRMATION;

if (process.env.SUPABASE_MIGRATION_CONFIRM !== requiredApplyConfirmation) {
  console.error(
    `Apply requires SUPABASE_MIGRATION_CONFIRM=${requiredApplyConfirmation} after reviewing the dry run.`
  );
  process.exit(1);
}

const result = runSupabase([...pushArgs, "--yes"]);

process.exit(result.status ?? 1);
