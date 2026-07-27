import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const harness = readFileSync(
  new URL("../scripts/verify-migration-gap-lifecycle.mjs", import.meta.url),
  "utf8"
);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { scripts: Record<string, string> };
const makefile = readFileSync(new URL("../Makefile", import.meta.url), "utf8");

function mainBody() {
  const start = harness.indexOf("async function main()");
  const end = harness.indexOf("main().catch", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return harness.slice(start, end);
}

describe("guarded migration-gap lifecycle proof harness", () => {
  it("guards the exact target and credential before creating a Supabase client", () => {
    const main = mainBody();
    const safeTarget = main.indexOf("assertSafeTarget(url)");
    const isolatedTarget = main.indexOf(
      'assertIsolatedQaTarget(url, "Migration-gap lifecycle proof")'
    );
    const serviceCredential = main.indexOf(
      "assertServiceRoleCredential(serviceRoleKey)"
    );
    const separatedKeys = main.indexOf(
      "assertKeySeparation(anonKey, serviceRoleKey)"
    );
    const clientCreation = main.indexOf(
      "const db = serviceClient(url, serviceRoleKey)"
    );

    expect(safeTarget).toBeGreaterThan(-1);
    expect(isolatedTarget).toBeGreaterThan(safeTarget);
    expect(serviceCredential).toBeGreaterThan(isolatedTarget);
    expect(separatedKeys).toBeGreaterThan(serviceCredential);
    expect(clientCreation).toBeGreaterThan(separatedKeys);
    expect(harness).toContain(
      "Refusing non-local Supabase target"
    );
    expect(harness).toContain(
      "exact disposable, isolated, non-production target"
    );
  });

  it("is opt-in and cannot run as part of ordinary local validation", () => {
    expect(packageJson.scripts["qa:migration-gap-proof"]).toBe(
      "node scripts/verify-migration-gap-lifecycle.mjs"
    );

    for (const scriptName of [
      "dev",
      "build",
      "postbuild",
      "start",
      "lint",
      "typegen",
      "typecheck",
      "test",
      "check:skills"
    ]) {
      expect(packageJson.scripts[scriptName] ?? "").not.toContain(
        "verify-migration-gap-lifecycle"
      );
      expect(packageJson.scripts[scriptName] ?? "").not.toContain(
        "qa:migration-gap-proof"
      );
    }

    const validateTarget =
      makefile.match(/^validate:\n((?:\t.*\n?)*)/m)?.[1] ?? "";
    expect(validateTarget).not.toContain("qa:migration-gap-proof");
    expect(validateTarget).not.toContain("verify-migration-gap-lifecycle");
  });

  it("declares and executes every requested lifecycle case", () => {
    const cases = [
      "same-team-competing-transportation-offers",
      "caregiver-expiry-and-cache-clearing",
      "official-communication-correction-and-acknowledgment",
      "media-consent-revocation-and-retention",
      "multi-guardian-season-transition"
    ];
    for (const name of cases) {
      expect(harness).toContain(`"${name}"`);
    }

    for (const runner of [
      "runTransportationCase(db, actors)",
      "runCaregiverCase(db, actors, times)",
      "runOfficialCommunicationCase(db, actors)",
      "runMediaConsentCase(db, actors)",
      "runSeasonTransitionCase(db, actors, times)"
    ]) {
      expect(mainBody()).toContain(runner);
    }
  });

  it("requires setup, mutation, denial, stale/concurrency, readback, audit, provider, and cleanup evidence per case", () => {
    for (const phase of [
      "setup",
      "authorized_mutation",
      "denied_mutation",
      "concurrency_or_stale_version",
      "readback",
      "audit_evidence",
      "notification_draft_count",
      "provider_send_count",
      "cleanup"
    ]) {
      expect(harness).toContain(`"${phase}"`);
    }

    expect(harness).toContain("denial left partial audit evidence");
    expect(harness).toContain("expectedNotificationDelta");
    expect(harness).toContain('eq("status", "sent")');
    expect(harness).toContain("attempted a provider send");
    expect(harness).toContain("providerCallsAttemptedByHarness: 0");
  });

  it("covers competing offers, cross-scope denial, and one concurrent winner", () => {
    expect(harness).toContain("actors.competitor.id");
    expect(harness).toContain("actors.outsider.id");
    expect(harness).toContain("Promise.allSettled");
    expect(harness).toContain(
      "Competing transportation acceptance did not converge on one final outcome."
    );
    expect(harness).toContain(
      "Competing offers did not preserve accepted and rejected evidence."
    );
    expect(harness).toContain(
      "Transportation cleanup left a current request."
    );
  });

  it("asserts caregiver expiry and cache clearing independently", () => {
    expect(harness).toContain('cache_action === "clear_at_next_contact"');
    expect(harness).toContain("expires_at: isoHoursFrom(Date.now(), -24)");
    expect(harness).toContain(
      "new Date(expiredRow.expires_at).getTime() < Date.now()"
    );
    expect(harness).toContain('"expired"');
    expect(harness).toContain(
      "Caregiver revocation or independent expiry readback is incomplete."
    );
    expect(harness).toContain(
      "Caregiver cleanup left active authorization rows."
    );
  });

  it("asserts correction, projection incident repair, and current-version acknowledgment", () => {
    expect(harness).toContain('staleAcknowledgment.code === "superseded"');
    expect(harness).toContain('target_status: "failed"');
    expect(harness).toContain('target_status: "ready"');
    expect(harness).toContain("resolved_by_user_id === actors.admin.id");
    expect(harness).toContain(
      "acknowledgment.messageVersionId === corrected.version_id"
    );
    expect(harness).toContain(
      "retainedVersions === 2"
    );
  });

  it("asserts consent revocation, retained evidence, and family-scope refusal", () => {
    expect(harness).toContain(
      '{ revoked_at: new Date().toISOString() }'
    );
    expect(harness).toContain('"current family media consent"');
    expect(harness).toContain("consent_snapshot_hash");
    expect(harness).toContain("mediaItem.storage_deleted_at === null");
    expect(harness).toContain('"unavailable to this family"');
    expect(harness).toContain(
      "Media cleanup removed required revoked-retention evidence."
    );
  });

  it("asserts multi-guardian concurrency, expiry, safe correction, reset, and downstream refusal", () => {
    expect(harness).toContain(
      "Concurrent guardian review did not reject exactly one stale response."
    );
    expect(harness).toContain('completed.state === "guardian_accepted"');
    expect(harness).toContain('expired.state === "expired"');
    expect(harness).toContain(
      "Safe correction removes only transition-created rows."
    );
    expect(harness).toContain(
      "Season transition carried a reset-required downstream field."
    );
    expect(harness).toContain('"downstream family records"');
    expect(harness).toContain(
      "Transition readback did not preserve reverted, expired, and refused outcomes."
    );
  });

  it("does not introduce external provider credentials or production authority", () => {
    for (const forbidden of [
      "TWILIO_AUTH_TOKEN",
      "TWILIO_ACCOUNT_SID",
      "SENDGRID_API_KEY",
      "OPENAI_API_KEY",
      "STRIPE_SECRET_KEY",
      "provider_sends_enabled: true"
    ]) {
      expect(harness).not.toContain(forbidden);
    }
    expect(harness).toContain("provider_sends_enabled: false");
  });
});
