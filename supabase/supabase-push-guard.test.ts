import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const RUNNER = join(process.cwd(), "scripts", "supabase-push.mjs");
const PRODUCTION_REF = "dkwghvvlbdnnwzbnscvu";
const PREVIEW_REF = "gmrvnnkxksqkcxcmydhr";
const temporaryDirectories: string[] = [];

function baseEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "https://differentref.supabase.co",
    SUPABASE_MIGRATION_TARGET_REF: PREVIEW_REF,
    SUPABASE_MIGRATION_TARGET_ENV: "preview",
    ...overrides
  } as NodeJS.ProcessEnv;
  delete env["SUPABASE_MIGRATION_CONFIRM"];
  delete env["SUPABASE_MIGRATION_INCLUDE_SEED"];
  delete env["SUPABASE_MIGRATION_ALLOW_APP_TARGET"];
  return env;
}

function runDryGuard(overrides: Record<string, string | undefined>) {
  return spawnSync(process.execPath, [RUNNER, "--dry-run"], {
    cwd: process.cwd(),
    env: baseEnv(overrides),
    encoding: "utf8"
  });
}

describe("Supabase migration runner guard", () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects a matching pooler username on a non-Supabase host", () => {
    const result = runDryGuard({
      SUPABASE_POOLER_DATABASE_URL:
        `postgresql://postgres.${PREVIEW_REF}@evil.example:5432/postgres`
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "must use the matching Supabase direct host or Supavisor pooler host"
    );
  });

  it("requires the protected ref and production classification to agree", () => {
    const productionAsPreview = runDryGuard({
      SUPABASE_POOLER_DATABASE_URL:
        `postgresql://postgres.${PRODUCTION_REF}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`,
      SUPABASE_MIGRATION_TARGET_REF: PRODUCTION_REF
    });
    expect(productionAsPreview.status).toBe(1);
    expect(productionAsPreview.stderr).toContain(
      "production ref must be classified as production"
    );

    const previewAsProduction = runDryGuard({
      SUPABASE_POOLER_DATABASE_URL:
        `postgresql://postgres.${PREVIEW_REF}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`,
      SUPABASE_MIGRATION_TARGET_ENV: "production"
    });
    expect(previewAsProduction.status).toBe(1);
    expect(previewAsProduction.stderr).toContain(
      "production classification only for the protected LeaguePilot production ref"
    );
  });

  it("does not load apply or seed confirmations from .env.local", () => {
    const directory = mkdtempSync(join(tmpdir(), "leaguepilot-push-guard-"));
    temporaryDirectories.push(directory);
    const binDirectory = join(directory, "bin");
    const logPath = join(directory, "npx.log");
    mkdirSync(binDirectory);
    writeFileSync(
      join(directory, ".env.local"),
      [
        "SUPABASE_MIGRATION_CONFIRM=apply-reviewed-migrations",
        "SUPABASE_MIGRATION_INCLUDE_SEED=include-nonproduction-seed"
      ].join("\n")
    );
    const fakeNpx = join(binDirectory, "npx");
    writeFileSync(
      fakeNpx,
      "#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"$FAKE_NPX_LOG\"\nexit 0\n"
    );
    chmodSync(fakeNpx, 0o755);

    const result = spawnSync(process.execPath, [RUNNER], {
      cwd: directory,
      env: baseEnv({
        PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ""}`,
        FAKE_NPX_LOG: logPath,
        SUPABASE_POOLER_DATABASE_URL:
          `postgresql://postgres.${PREVIEW_REF}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
      }),
      encoding: "utf8"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "SUPABASE_MIGRATION_CONFIRM=apply-reviewed-migrations"
    );
    const invocations = readFileSync(logPath, "utf8").trim().split("\n");
    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toContain("--dry-run");
    expect(invocations[0]).not.toContain("--include-seed");
  });

  it("does not load app-target confirmation from .env.local", () => {
    const directory = mkdtempSync(join(tmpdir(), "leaguepilot-app-target-guard-"));
    temporaryDirectories.push(directory);
    writeFileSync(
      join(directory, ".env.local"),
      "SUPABASE_MIGRATION_ALLOW_APP_TARGET=confirmed-nonproduction-target\n"
    );

    const result = spawnSync(process.execPath, [RUNNER, "--dry-run"], {
      cwd: directory,
      env: baseEnv({
        NEXT_PUBLIC_SUPABASE_URL: `https://${PREVIEW_REF}.supabase.co`,
        SUPABASE_POOLER_DATABASE_URL:
          `postgresql://postgres.${PREVIEW_REF}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
      }),
      encoding: "utf8"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Set SUPABASE_MIGRATION_ALLOW_APP_TARGET=confirmed-nonproduction-target"
    );
  });
});
