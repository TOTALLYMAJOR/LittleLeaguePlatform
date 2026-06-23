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

const result = spawnSync(
  "npx",
  ["supabase", "db", "push", "--db-url", databaseUrl, "--include-seed", "--yes", "--workdir", "."],
  {
    stdio: "inherit",
    shell: process.platform === "win32"
  }
);

process.exit(result.status ?? 1);
