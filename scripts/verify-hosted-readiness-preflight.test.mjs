import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatHostedReadinessPreflightReport,
  validateHostedReadinessPreflight
} from "./verify-hosted-readiness-preflight.mjs";

const validEnv = {
  QA_PROOF_BASE_URL: "https://preview.leaguepilot.test",
  PUBLIC_ORGANIZATION_ID: "11111111-1111-4111-8111-111111111111",
  PUBLIC_ACCESS_REVIEW_WINDOW: "within two business days",
  NEXT_PUBLIC_SUPABASE_URL: "https://dkwghvvlbdnnwzbnscvu.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-for-preflight-test",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-for-preflight-test",
  SUPABASE_POOLER_DATABASE_URL: "postgresql://postgres.dkwghvvlbdnnwzbnscvu:test@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
  SUPABASE_MIGRATION_TARGET_REF: "dkwghvvlbdnnwzbnscvu",
  SUPABASE_MIGRATION_TARGET_ENV: "preview",
  SUPABASE_MIGRATION_ALLOW_APP_TARGET: "confirmed-nonproduction-target",
  QA_PARENT_EMAIL: "parent@example.com",
  QA_PARENT_PASSWORD: "test-password",
  QA_COACH_EMAIL: "coach@example.com",
  QA_COACH_PASSWORD: "test-password",
  QA_ADMIN_EMAIL: "admin@example.com",
  QA_ADMIN_PASSWORD: "test-password"
};

test("blocks missing hosted readiness inputs without network access", () => {
  const result = validateHostedReadinessPreflight({});

  assert.equal(result.ok, false);
  assert.match(result.blockers.join("\n"), /QA_PROOF_BASE_URL is required/);
  assert.match(result.blockers.join("\n"), /PUBLIC_ORGANIZATION_ID is required/);
  assert.match(result.blockers.join("\n"), /PUBLIC_ACCESS_REVIEW_WINDOW is required/);
  assert.match(result.blockers.join("\n"), /QA_ADMIN_EMAIL is required/);
  assert.match(result.blockers.join("\n"), /QA_PARENT_EMAIL is required/);
  assert.match(result.blockers.join("\n"), /QA_COACH_EMAIL is required/);
  assert.match(result.blockers.join("\n"), /SUPABASE_MIGRATION_TARGET_REF is required/);
});

test("rejects invalid hosted base URL", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    QA_PROOF_BASE_URL: "not-a-url"
  });

  assert.equal(result.ok, false);
  assert.match(result.blockers.join("\n"), /QA_PROOF_BASE_URL must be a valid absolute URL/);
});

test("rejects local-only proof mode for the hosted gate", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    QA_PROOF_BASE_URL: "https://localhost:3001"
  });

  assert.equal(result.ok, false);
  assert.equal(result.mode, "local-or-invalid");
  assert.match(result.blockers.join("\n"), /local proof target/);
});

test("rejects the protected production host and production migration classification", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    QA_PROOF_BASE_URL: "https://www.leaguepilot.us",
    SUPABASE_MIGRATION_TARGET_ENV: "production"
  });

  assert.equal(result.ok, false);
  assert.match(result.blockers.join("\n"), /isolated QA or Preview deployment/);
  assert.match(result.blockers.join("\n"), /must be qa or preview/);
});

test("rejects invalid public organization configuration", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    PUBLIC_ORGANIZATION_ID: "leaguepilot-demo"
  });

  assert.equal(result.ok, false);
  assert.match(result.blockers.join("\n"), /PUBLIC_ORGANIZATION_ID must be the target organization UUID/);
});

test("rejects a migration target that does not match the hosted app project", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    SUPABASE_MIGRATION_TARGET_REF: "otherprojectref"
  });

  assert.equal(result.ok, false);
  assert.match(result.blockers.join("\n"), /must match the hosted app Supabase project reference/);
});

test("requires explicit confirmation before planning against a hosted non-production app database", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    SUPABASE_MIGRATION_ALLOW_APP_TARGET: ""
  });

  assert.equal(result.ok, false);
  assert.match(result.blockers.join("\n"), /confirmed-nonproduction-target is required/);
});

test("accepts valid hosted mode and normalizes command URLs", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    QA_PROOF_BASE_URL: "https://preview.leaguepilot.test/"
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "hosted");
  assert.equal(result.baseUrl, "https://preview.leaguepilot.test");
  assert.deepEqual(result.commands, [
    "SUPABASE_MIGRATION_TARGET_REF=dkwghvvlbdnnwzbnscvu SUPABASE_MIGRATION_TARGET_ENV=preview SUPABASE_MIGRATION_ALLOW_APP_TARGET=confirmed-nonproduction-target npm run supabase:plan",
    "PUBLIC_FAMILY_BASE_URL=https://preview.leaguepilot.test QA_PROOF_BASE_URL=https://preview.leaguepilot.test PUBLIC_ORGANIZATION_ID=11111111-1111-4111-8111-111111111111 PUBLIC_ACCESS_REVIEW_WINDOW='within two business days' npm run qa:public-family-proof",
    "QA_PROOF_BASE_URL=https://preview.leaguepilot.test npm run qa:session-proof",
    "QA_PROOF_BASE_URL=https://preview.leaguepilot.test npm run qa:rls-proof",
    "QA_PROOF_BASE_URL=https://preview.leaguepilot.test npm run qa:tenant-readiness-proof"
  ]);
});

test("shell-safely carries hosted public-family expectations", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    PUBLIC_ACCESS_REVIEW_WINDOW: "coach's 48 hour review"
  });

  assert.equal(result.ok, true);
  assert.equal(
    result.commands[1],
    "PUBLIC_FAMILY_BASE_URL=https://preview.leaguepilot.test QA_PROOF_BASE_URL=https://preview.leaguepilot.test PUBLIC_ORGANIZATION_ID=11111111-1111-4111-8111-111111111111 PUBLIC_ACCESS_REVIEW_WINDOW='coach'\\''s 48 hour review' npm run qa:public-family-proof"
  );
});

test("prints follow-on commands and proof boundaries", () => {
  const report = formatHostedReadinessPreflightReport(validateHostedReadinessPreflight(validEnv));

  assert.match(report, /PUBLIC_FAMILY_BASE_URL=https:\/\/preview\.leaguepilot\.test QA_PROOF_BASE_URL=https:\/\/preview\.leaguepilot\.test PUBLIC_ORGANIZATION_ID=11111111-1111-4111-8111-111111111111 PUBLIC_ACCESS_REVIEW_WINDOW='within two business days' npm run qa:public-family-proof/);
  assert.match(report, /npm run supabase:plan/);
  assert.match(report, /npm run qa:session-proof/);
  assert.match(report, /npm run qa:rls-proof/);
  assert.match(report, /QA_PROOF_BASE_URL=https:\/\/preview\.leaguepilot\.test npm run qa:tenant-readiness-proof/);
  assert.match(report, /No deployment or Vercel Authentication bypass is performed/);
  assert.match(report, /No Supabase seeding, database write, migration apply, provider send, payment write, or media upload is performed/);
  assert.match(report, /guarded QA writes and readback/);
  assert.match(report, /not hosted proof, provider readiness, payment readiness, migration acceptance, or production acceptance/);
});
