import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadLocalEnv();

const databaseUrl =
  process.env.SUPABASE_POOLER_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_DATABASE_URL;

if (!databaseUrl || databaseUrl.includes("[YOUR-PASSWORD]")) {
  console.error("Missing database URL. Set SUPABASE_POOLER_DATABASE_URL in .env.local before pushing migrations.");
  process.exit(1);
}

function runSupabase(args) {
  const result = spawnSync("npx", ["supabase", ...args], {
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result;
}

function localAndRemoteMigrationsAreAligned() {
  const result = runSupabase(["migration", "list", "--db-url", databaseUrl, "--workdir", "."]);
  if ((result.status ?? 1) !== 0) return false;

  try {
    const payload = JSON.parse(result.stdout);
    return payload.migrations.every(
      (migration) => migration.local && migration.remote && migration.local === migration.remote
    );
  } catch {
    return false;
  }
}

const result = runSupabase([
  "db",
  "push",
  "--db-url",
  databaseUrl,
  "--include-seed",
  "--yes",
  "--workdir",
  "."
]);

if ((result.status ?? 1) !== 0) {
  const output = `${result.stdout}\n${result.stderr}`;
  const poolerPreparedStatementFailure =
    output.includes("prepared statement") && output.includes("SQLSTATE 42P05");

  if (poolerPreparedStatementFailure && localAndRemoteMigrationsAreAligned()) {
    console.warn(
      "Supabase db push hit a transaction-pooler prepared-statement error, " +
        "but local and remote migration history are aligned. Treating this as a no-op."
    );
    process.exit(0);
  }
}

process.exit(result.status ?? 1);
