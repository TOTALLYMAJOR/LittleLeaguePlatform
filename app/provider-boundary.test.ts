import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("provider boundary tests", () => {
  it("keeps provider delivery review as approval and attempt logging only", () => {
    const providerDelivery = source("lib/supabase/provider-delivery.ts");

    expect(providerDelivery).toContain("No external send occurred");
    expect(providerDelivery).toContain("notification_delivery_attempts");
    expect(providerDelivery).toContain("claimQueuedNotificationDeliveries");
    expect(providerDelivery).toContain("@/lib/services/notifications/worker");
    expect(providerDelivery).not.toContain("fetch(");
  });

  it("keeps notification worker foundation adapter-driven", () => {
    const worker = source("lib/services/notifications/worker.ts");

    expect(worker).toContain("NotificationDeliveryAdapter");
    expect(worker).toContain("deadLetteredAt");
    expect(worker).not.toContain("SENDGRID");
    expect(worker).not.toContain("TWILIO");
    expect(worker).not.toContain("fetch(");
  });

  it("keeps roster import audit from committing rosters or sending invites", () => {
    const rosterImports = source("lib/supabase/roster-imports.ts");

    expect(rosterImports).toContain("No roster records, guardian links, invites, or provider sends were created.");
    expect(rosterImports).toContain("roster_import_rows");
    expect(rosterImports).not.toContain(".from(\"players\")");
    expect(rosterImports).not.toContain(".from(\"parent_invites\")");
  });
});
