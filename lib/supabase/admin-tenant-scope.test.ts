import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("admin surface tenant scope contract", () => {
  it("passes authenticated organization scope into every admin aggregate adapter", () => {
    const surfaces = source("app/admin/_surfaces.tsx");

    for (const adapter of [
      "listRegistrationRequests",
      "listMediaGovernanceData",
      "listAdminThemeData",
      "listArchiveVaultData",
      "listScheduleOperationsData",
      "listAdminMembershipData",
      "listRegistrationReviewData",
    ]) {
      expect(surfaces).toMatch(new RegExp(`${adapter}\\(\\{[\\s\\S]{0,120}organizationIds`));
    }
    expect(surfaces).toMatch(/listGuardianLinkRepairData\(\{ organizationId \}\)/);
    expect(surfaces).toMatch(/listAdminOperationsData\(\{ organizationId \}\)/);
  });

  it("filters service-role aggregate reads before returning tenant data", () => {
    const adapters = {
      registrations: source("lib/supabase/registrations.ts"),
      registrationApprovals: source("lib/supabase/registration-approvals.ts"),
      media: source("lib/supabase/media-governance.ts"),
      branding: source("lib/supabase/team-branding.ts"),
      guardianLinks: source("lib/supabase/guardian-links.ts"),
      memberships: source("lib/supabase/memberships.ts"),
      archives: source("lib/supabase/archive-vault.ts"),
      operations: source("lib/supabase/admin-operations.ts"),
      schedules: source("lib/supabase/schedule-management.ts"),
    };

    expect(adapters.registrations).toContain('.in("organization_id", organizationIds)');
    expect(adapters.registrationApprovals).toContain('.in("organization_id", organizationIds)');
    expect(adapters.media).toContain('.in("team_id", teamIds)');
    expect(adapters.branding).toContain('.in("organization_id", organizationIds)');
    expect(adapters.guardianLinks).toContain('.eq("organization_id", organizationId)');
    expect(adapters.memberships).toContain('.in("team_id", teamIds)');
    expect(adapters.archives).toContain('.in("organization_id", organizationIds)');
    expect(adapters.operations).toContain('.eq("organization_id", organizationId)');
    expect(adapters.schedules).toContain('.in("organization_id", organizationIds)');
  });
});
