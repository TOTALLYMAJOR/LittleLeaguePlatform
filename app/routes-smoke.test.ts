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

  it("keeps the homepage positioned as a product landing page with accurate provider boundaries", () => {
    const page = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");

    expect(page).toContain("Stop chasing families.");
    expect(page).toContain("Run the season from one private team home");
    expect(page).toContain("Parent Replay is the signature loop.");
    expect(page).toContain("Explore the product surfaces.");
    expect(page).toContain("Supabase-backed paths when signed-in rows and roles exist");
    expect(page).toContain("no external email, SMS, push, Stripe, AI-provider, or native-app delivery");
    expect(page).not.toContain("session-only local state");
    expect(page).not.toContain("does not persist production data");
  });

  it("keeps the PWA offline fallback route wired into the service worker", () => {
    const serviceWorker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

    expect(serviceWorker).toContain("\"/offline\"");
    expect(serviceWorker).toContain("caches.match(\"/offline\")");
  });

  it("keeps PWA install and standalone usage measurement wired", () => {
    const provider = readFileSync(join(process.cwd(), "app", "providers.tsx"), "utf8");
    const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
    const manifest = readFileSync(join(process.cwd(), "public", "manifest.webmanifest"), "utf8");

    expect(provider).toContain("/api/mobile-usage-events");
    expect(provider).toContain("install_prompt_shown");
    expect(provider).toContain("standalone_launch");
    expect(layout).toContain("AppShell");
    expect(layout).toContain("apple");
    expect(manifest).toContain("/favicons/favicon-option-1-shield.png");
    expect(manifest).toContain("/favicons/favicon-option-4-team-chat.png");
  });

  it("keeps the global app shell wired for accessible navigation and PWA state", () => {
    const shell = readFileSync(join(process.cwd(), "components", "ui", "AppShell.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(shell).toContain("Skip to main content");
    expect(shell).toContain("little-league-shell-collapsed");
    expect(shell).toContain("Route finder");
    expect(shell).toContain("aria-current");
    expect(shell).toContain("mobile-tabbar");
    expect(shell).toContain("offline");
    expect(shell).toContain("sessionWarningVisible");
    expect(shell).toContain("live-region");
    expect(shell).toContain("showModal");
    expect(shell).toContain("previousFocus.current?.focus");
    expect(css).toContain(".mobile-tabbar");
    expect(css).toContain("@media print");
    expect(css).toContain("@media (forced-colors: active)");
  });

  it("keeps the 100 concept scorecard documented and route-integrated", () => {
    const scorecard = readFileSync(join(process.cwd(), "components", "ui", "concept-scorecard.ts"), "utf8");
    const doc = readFileSync(join(process.cwd(), "docs", "ui-ux-100-implementation-scorecard.md"), "utf8");
    const chat = readFileSync(join(process.cwd(), "components", "feature-panels.tsx"), "utf8");

    expect(scorecard).toContain("uiConceptScorecard");
    expect(scorecard).toContain("allComplete");
    expect(doc).toContain("| 100 | Audit trail display |");
    expect(doc).toContain("Provider disconnected");
    expect(doc).toContain("Read-only");
    expect(chat).toContain("chat-workspace");
    expect(chat).toContain("Thread rail");
    expect(chat).toContain("Context rail");
    expect(chat).toContain("Coach Broadcast Mode");
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
    expect(logoService).toContain("Logo asset team must belong to the selected organization.");
    expect(logoService).toContain("logo_status");
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
