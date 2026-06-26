import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appRoutes = [
  "/",
  "/admin",
  "/admin/archive",
  "/admin/guardian-links",
  "/admin/operations",
  "/admin/security",
  "/admin/teams",
  "/admin/themes",
  "/admin/registrations",
  "/coach",
  "/offline",
  "/parent",
  "/registration",
  "/team-portal",
  "/team-chat",
  "/coach/parent-replay"
];

function pagePath(route: string) {
  return join(process.cwd(), "app", route === "/" ? "" : route.slice(1), "page.tsx");
}

describe("route smoke coverage", () => {
  it("keeps the primary mobile app routes backed by App Router pages", () => {
    for (const route of appRoutes) {
      expect(existsSync(pagePath(route)), `${route} should have a page.tsx`).toBe(true);
    }
  });

  it("keeps the PWA offline fallback route wired into the service worker", () => {
    const serviceWorker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

    expect(serviceWorker).toContain("\"/offline\"");
    expect(serviceWorker).toContain("caches.match(\"/offline\")");
  });

  it("keeps PWA install and standalone usage measurement wired", () => {
    const provider = readFileSync(join(process.cwd(), "app", "providers.tsx"), "utf8");

    expect(provider).toContain("/api/mobile-usage-events");
    expect(provider).toContain("install_prompt_shown");
    expect(provider).toContain("standalone_launch");
  });

  it("keeps season archive readiness proof documented", () => {
    const checklist = readFileSync(join(process.cwd(), "docs", "archive-readiness-checklist.md"), "utf8");

    expect(checklist).toContain("/api/admin/exports");
    expect(checklist).toContain("deleted chat message text");
    expect(checklist).toContain("read-only archived-season smoke check");
  });

  it("keeps the admin security proof page tied to RLS and audit evidence", () => {
    const page = readFileSync(join(process.cwd(), "app", "admin", "security", "page.tsx"), "utf8");
    const proof = readFileSync(join(process.cwd(), "lib", "supabase", "security-proof.ts"), "utf8");

    expect(page).toContain("buildSecurityProofDashboard");
    expect(proof).toContain("parent cannot read cross-team players");
    expect(proof).toContain("coach cannot update archived-season events");
    expect(proof).toContain("team_membership_saved");
  });

  it("keeps the admin operations page tied to settings, providers, queues, and audits", () => {
    const page = readFileSync(join(process.cwd(), "app", "admin", "operations", "page.tsx"), "utf8");
    const data = readFileSync(join(process.cwd(), "lib", "supabase", "admin-operations.ts"), "utf8");

    expect(page).toContain("listAdminOperationsData");
    expect(data).toContain("providerInventory");
    expect(data).toContain("approvalQueues");
    expect(data).toContain("auditLogs");
  });

  it("keeps admin team setup tied to seasons and divisions", () => {
    const page = readFileSync(join(process.cwd(), "app", "admin", "teams", "page.tsx"), "utf8");
    const data = readFileSync(join(process.cwd(), "lib", "supabase", "team-management.ts"), "utf8");

    expect(page).toContain("listAdminTeamManagementData");
    expect(data).toContain("requireActiveOrganizationAdmin");
    expect(data).toContain("division");
    expect(data).toContain("season_id");
    expect(data).toContain("rosterCount");
    expect(data).toContain("team_archived");
  });

  it("keeps guardian link repair tied to missing-link access recovery", () => {
    const page = readFileSync(join(process.cwd(), "app", "admin", "guardian-links", "page.tsx"), "utf8");
    const data = readFileSync(join(process.cwd(), "lib", "supabase", "guardian-links.ts"), "utf8");

    expect(page).toContain("listGuardianLinkRepairData");
    expect(data).toContain("guardian_link_repaired");
    expect(data).toContain("team_memberships");
  });

  it("keeps archive vault and brand governance evidence present", () => {
    const archivePage = readFileSync(join(process.cwd(), "app", "admin", "archive", "page.tsx"), "utf8");
    const logoPolicy = readFileSync(join(process.cwd(), "docs", "brand-governance.md"), "utf8");
    const logoService = readFileSync(join(process.cwd(), "lib", "supabase", "team-logos.ts"), "utf8");

    expect(archivePage).toContain("listArchiveVaultData");
    expect(logoPolicy).toContain("Logos must use HTTPS URLs");
    expect(logoService).toContain("team_logo_asset_submitted");
  });

  it("keeps hosted brand proof wired into QA automation", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const workflow = readFileSync(join(process.cwd(), ".github", "workflows", "supabase-qa-proof.yml"), "utf8");
    const proofScript = readFileSync(join(process.cwd(), "scripts", "verify-brand-surface-proof.mjs"), "utf8");

    expect(packageJson).toContain("\"qa:brand-proof\"");
    expect(workflow).toContain("npm run qa:brand-proof");
    expect(proofScript).toContain("20 target brand surfaces");
    expect(proofScript).toContain("brand_profile_published");
    expect(proofScript).toContain("brand-launch-validation.png");
  });
});
