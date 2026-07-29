import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260727230627_pingram_terminal_reconciliation.sql"
  ),
  "utf8"
);

describe("Pingram terminal reconciliation migration", () => {
  it("resolves both terminal callback types without collapsing delivery status", () => {
    expect(migration).toContain("event_type in ('SMS_DELIVERED', 'SMS_FAILED')");
    expect(migration).toContain("then 'provider_accepted'");
    expect(migration).toContain("when delivered_value is not null then 'sent'");
    expect(migration).toContain("when failed_value is not null and delivered_at is null then 'failed'");
  });

  it("clears reconciliation and stale indeterminate request errors", () => {
    expect(migration).toContain("reconciliation_required_at = case");
    expect(migration).toContain("request_outcome = 'indeterminate'");
    expect(migration).toContain("error_code = case");
    expect(migration).toContain("error_message = case");
  });

  it("retains service-only execution authority for the trigger function", () => {
    expect(migration).toContain(
      "revoke all on function public.reconcile_pending_provider_webhook_evidence()"
    );
    expect(migration).toContain(
      "grant execute on function public.reconcile_pending_provider_webhook_evidence()\n  to service_role;"
    );
  });

  it("repairs already-recorded verified terminal evidence without a provider call", () => {
    expect(migration).toContain("with terminal_pingram_evidence as");
    expect(migration).toContain("join public.provider_webhook_events event");
    expect(migration).toContain("event.provider = 'pingram'");
  });
});
