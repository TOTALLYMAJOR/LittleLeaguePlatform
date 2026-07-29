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

test("rejects invalid public organization configuration", () => {
  const result = validateHostedReadinessPreflight({
    ...validEnv,
    PUBLIC_ORGANIZATION_ID: "leaguepilot-demo"
  });

  assert.equal(result.ok, false);
  assert.match(result.blockers.join("\n"), /PUBLIC_ORGANIZATION_ID must be the target organization UUID/);
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
    "PUBLIC_FAMILY_BASE_URL=https://preview.leaguepilot.test QA_PROOF_BASE_URL=https://preview.leaguepilot.test npm run qa:public-family-proof",
    "QA_PROOF_BASE_URL=https://preview.leaguepilot.test npm run qa:tenant-readiness-proof"
  ]);
});

test("prints follow-on commands and proof boundaries", () => {
  const report = formatHostedReadinessPreflightReport(validateHostedReadinessPreflight(validEnv));

  assert.match(report, /PUBLIC_FAMILY_BASE_URL=https:\/\/preview\.leaguepilot\.test QA_PROOF_BASE_URL=https:\/\/preview\.leaguepilot\.test npm run qa:public-family-proof/);
  assert.match(report, /QA_PROOF_BASE_URL=https:\/\/preview\.leaguepilot\.test npm run qa:tenant-readiness-proof/);
  assert.match(report, /No deployment or Vercel Authentication bypass is performed/);
  assert.match(report, /No Supabase seeding, database write, migration, provider send, payment write, or media upload is performed/);
  assert.match(report, /not hosted proof, provider readiness, payment readiness, migration acceptance, or production acceptance/);
});
