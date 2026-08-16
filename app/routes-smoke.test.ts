import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appRoutes = [
  "/",
  "/admin",
  "/admin/archive",
  "/admin/branding",
  "/admin/communications",
  "/admin/family-access",
  "/admin/guardian-links",
  "/admin/media-review",
  "/admin/message-delivery-review",
  "/admin/operations",
  "/admin/reports-archive",
  "/admin/safety-weather",
  "/admin/schedule-venues",
  "/admin/security",
  "/admin/security-audit",
  "/admin/settings",
  "/admin/sponsors",
  "/admin/teams",
  "/admin/themes",
  "/admin/registrations",
  "/access/status",
  "/caregiver",
  "/caregiver/accept",
  "/coach",
  "/coach/attendance",
  "/coach/drafts",
  "/coach/messages",
  "/coach/practice-recaps",
  "/coach/roster",
  "/coach/schedule",
  "/coach/settings",
  "/coach/snacks-volunteers",
  "/coach/weather-fields",
  "/offline",
  "/parent",
  "/parent/family-access",
  "/parent/messages",
  "/parent/more",
  "/parent/photos",
  "/parent/practice-recaps",
  "/parent/schedule",
  "/parent/settings",
  "/parent/setup",
  "/parent/transportation",
  "/registration",
  "/sponsors",
  "/invite/expired",
  "/invite/accept",
  "/invite/recover",
  "/team-portal",
  "/team-chat",
  "/coach/rsvps",
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

  it("keeps the homepage as a compact public gateway with accurate privacy boundaries", () => {
    const page = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");

    expect(page).toContain("Your season, organized.");
    expect(page).toContain("Games and field updates");
    expect(page).toContain("Support local youth sports");
    expect(page).toContain("Private by default");
    expect(page).toContain("Sign in");
    expect(page).toContain("/auth");
    expect(page).toContain("/schedule");
    expect(page).toContain("/sponsors");
    expect(page).toContain("landing-gateway");
    expect(page).toContain("/images/leaguepilot-community-game-day-hero.png");
    expect(existsSync(join(process.cwd(), "public", "images", "leaguepilot-community-game-day-hero.png"))).toBe(true);
    expect(page).toContain("Children do not create accounts");
    expect(page).not.toContain("Little League HQ is the demo organization");
    expect(page).not.toContain("Request Team Access");
    expect(page).not.toContain("/prototype/index.html");
    expect(page).not.toContain("Supabase");
    expect(page).not.toContain("seed fallback");
    expect(page).not.toContain("Current scaffold inventory");
  });

  it("keeps the public sponsor page informational and proof-safe", () => {
    const page = readFileSync(join(process.cwd(), "app", "sponsors", "page.tsx"), "utf8");

    expect(page).toContain("Put local support behind every game.");
    expect(page).toContain("Ask your league administrator");
    expect(page).toContain("never includes child profiles");
    expect(page).toContain("not by this public page");
    expect(page).not.toContain("checkout");
    expect(page).not.toContain("donate");
  });

  it("keeps the static prototype available but hidden from indexable IA", () => {
    const prototype = readFileSync(join(process.cwd(), "public", "prototype", "index.html"), "utf8");
    const topology = readFileSync(join(process.cwd(), "lib", "navigation", "route-topology.ts"), "utf8");

    expect(prototype).toContain("noindex,nofollow");
    expect(topology).toContain("\"/prototype/index.html\"");
    expect(topology).toContain("noindex: true");
    expect(topology).toContain("navVisible: false");
    expect(topology).toContain("commandVisible: false");
  });

  it("keeps the PWA offline fallback route wired into the service worker", () => {
    const serviceWorker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

    expect(serviceWorker).toContain("\"/offline\"");
    expect(serviceWorker).toContain("caches.match(OFFLINE_URL)");
    expect(serviceWorker).toContain("event.request.mode === \"navigate\"");
    expect(serviceWorker).toContain("networkFirstNavigation");
    expect(serviceWorker).toContain("precacheStaticShell");
    expect(serviceWorker).toContain("cache: \"reload\"");
    expect(serviceWorker).not.toContain("\"/parent\"");
    expect(serviceWorker).not.toContain("\"/coach\"");
    expect(serviceWorker).not.toContain("\"/admin\"");
  });

  it("keeps PWA install and standalone usage measurement wired", () => {
    const provider = readFileSync(join(process.cwd(), "app", "providers.tsx"), "utf8");
    const featurePanels = readFileSync(join(process.cwd(), "components", "feature-panels.tsx"), "utf8");
    const rsvpControl = readFileSync(join(process.cwd(), "components", "family", "rsvp-control.tsx"), "utf8");
    const communicationRoom = readFileSync(join(process.cwd(), "components", "communication-room.tsx"), "utf8");
    const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const manifest = readFileSync(join(process.cwd(), "public", "manifest.webmanifest"), "utf8");

    expect(provider).toContain("/api/mobile-usage-events");
    expect(provider).toContain("process.env.NODE_ENV !== \"production\"");
    expect(provider).toContain("registration.unregister()");
    expect(provider).toContain("little-league-hq-shell-");
    expect(provider).toContain("caches.delete");
    expect(provider).toContain("install_prompt_shown");
    expect(provider).toContain("leaguepilot:value-experienced");
    expect(provider).toContain("hasExperiencedValue");
    expect(provider).toContain("valueGate: true");
    expect(rsvpControl).toContain("parent_rsvp_confirmed");
    expect(communicationRoom).toContain("critical_message_acknowledged");
    expect(featurePanels).not.toContain("markLeaguePilotValueExperienced(\"public_schedule_event_opened\")");
    expect(provider).toContain("standalone_launch");
    expect(layout).toContain("AppShell");
    expect(layout).toContain("criticalShellCss");
    expect(layout).toContain("viewportFit");
    expect(layout).toContain("\"device-width\"");
    expect(layout).toContain(".sidebar.app-sidebar{display:none}");
    expect(css).toContain(".sidebar.app-sidebar { display: none; }");
    expect(layout).toContain("apple");
    expect(manifest).toContain("/favicons/favicon-option-1-shield.png");
    expect(manifest).toContain("/favicons/favicon-option-4-team-chat.png");
  });

  it("keeps the global app shell wired for accessible navigation and PWA state", () => {
    const shell = readFileSync(join(process.cwd(), "components", "ui", "AppShell.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(shell).toContain("Skip to main content");
    expect(shell).toContain("You are here");
    expect(shell).toContain("getShellContext");
    expect(shell).toContain("Current access");
    expect(shell).toContain("Private team details stay hidden on this page");
    expect(shell).toContain("Sign-in required");
    expect(shell).toContain("little-league-shell-collapsed");
    expect(shell).toContain("Quick navigation");
    expect(shell).toContain("aria-current");
    expect(shell).toContain("mobile-tabbar");
    expect(shell).toContain("offline");
    expect(shell).toContain("sessionWarningVisible");
    expect(shell).toContain("live-region");
    expect(shell).toContain("showModal");
    expect(shell).toContain("previousFocus.current?.focus");
    expect(shell).toContain("leaguepilot-sidebar-loop.webm");
    expect(shell).toContain("autoPlay");
    expect(shell).toContain("playsInline");
    expect(css).toContain(".mobile-tabbar");
    expect(css).toContain(".sidebar-video-backdrop");
    expect(css).toContain(".parent-rsvp-action");
    expect(css).toContain("@media print");
    expect(css).toContain("@media (forced-colors: active)");
  });

  it("uses one light-default, explicitly selected theme across every shell", () => {
    const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
    const shell = readFileSync(join(process.cwd(), "components", "ui", "AppShell.tsx"), "utf8");
    const theme = readFileSync(join(process.cwd(), "lib", "theme.ts"), "utf8");
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const familyCss = readFileSync(join(process.cwd(), "app", "parent", "parent-weekly.css"), "utf8");

    expect(layout).toContain('data-theme="light"');
    expect(layout).toContain('id="leaguepilot-color-theme"');
    expect(layout).toContain("<head>");
    expect(layout.indexOf('id="leaguepilot-color-theme"')).toBeLessThan(layout.indexOf("<body>"));
    expect(layout).toContain("dangerouslySetInnerHTML={{ __html: COLOR_THEME_PREPAINT_SCRIPT }}");
    expect(layout).toContain("suppressHydrationWarning");
    expect(theme).toContain('leaguepilot-color-theme:v1');
    expect(theme).toContain('savedTheme === "dark" ? "dark" : "light"');
    expect(shell.match(/<ThemeToggle/g)).toHaveLength(3);
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).not.toContain("@media (prefers-color-scheme: dark)");
    expect(familyCss).toContain(':root[data-theme="dark"] [data-surface-family="family"]');
    expect(familyCss).not.toContain("color-scheme: light");
  });

  it("keeps the parent weekly visual language in the shared app design system", () => {
    const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(css).toContain("--bg:             #fdf8f1");
    expect(css).toContain("--accent:        #1f3a63");
    expect(css).toContain("--action:        #c94f17");
    expect(css).toContain("--font-sans: var(--font-parent-sans)");
    expect(css).toContain("font-family: var(--font-parent-display), var(--font-sans)");
    expect(css).toContain("border-radius: var(--radius-lg)");
    expect(css).toContain("background: var(--action)");
    expect(css).toContain("@media (max-width: 1180px)");
    expect(css).toContain(".temporary-caregiver-builder input");
    expect(css).toContain(".admin-calendar-split");
    expect(css).toContain(".admin-inspector-edit input");
    expect(layout).toContain("background:var(--bg,#fdf8f1)");
    expect(layout).toContain("border-right:1px solid var(--line,#e7ded1)");
    expect(layout).toContain("color:var(--muted,#68665f)");
    expect(css).toContain("color-mix(in srgb, var(--bg) 82%, transparent)");
    expect(css).toContain("color-mix(in srgb, var(--accent) 6%, transparent)");
    expect(layout).toContain("background:#1f3a63");
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
    const canonicalPage = readFileSync(join(process.cwd(), "app", "admin", "security-audit", "page.tsx"), "utf8");
    const surfaces = readFileSync(join(process.cwd(), "app", "admin", "_surfaces.tsx"), "utf8");
    const proof = readFileSync(join(process.cwd(), "lib", "supabase", "security-proof.ts"), "utf8");

    expect(page).toContain('redirect("/admin/security-audit")');
    expect(canonicalPage).toContain("AdminSecurityAuditSurface");
    expect(surfaces).toContain("buildSecurityProofDashboard");
    expect(proof).toContain("parent cannot read cross-team players");
    expect(proof).toContain("coach cannot update archived-season events");
    expect(proof).toContain("team_membership_saved");
  });

  it("keeps the admin operations page tied to settings, providers, queues, and audits", () => {
    const page = readFileSync(join(process.cwd(), "app", "admin", "operations", "page.tsx"), "utf8");
    const surfaces = readFileSync(join(process.cwd(), "app", "admin", "_surfaces.tsx"), "utf8");
    const data = readFileSync(join(process.cwd(), "lib", "supabase", "admin-operations.ts"), "utf8");

    expect(page).toContain("AdminOperationsSurface");
    expect(surfaces).toContain("listAdminOperationsData");
    expect(data).toContain("providerInventory");
    expect(data).toContain("approvalQueues");
    expect(data).toContain("auditLogs");
  });

  it("keeps admin team setup tied to seasons and divisions", () => {
    const page = readFileSync(join(process.cwd(), "app", "admin", "teams", "page.tsx"), "utf8");
    const surfaces = readFileSync(join(process.cwd(), "app", "admin", "_surfaces.tsx"), "utf8");
    const data = readFileSync(join(process.cwd(), "lib", "supabase", "team-management.ts"), "utf8");

    expect(page).toContain("AdminTeamsSurface");
    expect(surfaces).toContain("listAdminTeamManagementData");
    expect(data).toContain("requireActiveOrganizationAdmin");
    expect(data).toContain("AdminTeamManagementReadOptions");
    expect(data).toContain("organizationIds");
    expect(data).toContain("scopedQuery");
    expect(data).toContain("division");
    expect(data).toContain("season_id");
    expect(data).toContain("rosterCount");
    expect(data).toContain("team_archived");
  });

  it("keeps guardian link repair tied to missing-link access recovery", () => {
    const page = readFileSync(join(process.cwd(), "app", "admin", "guardian-links", "page.tsx"), "utf8");
    const surfaces = readFileSync(join(process.cwd(), "app", "admin", "_surfaces.tsx"), "utf8");
    const data = readFileSync(join(process.cwd(), "lib", "supabase", "guardian-links.ts"), "utf8");

    expect(page).toContain("AdminFamilyAccessSurface");
    expect(surfaces).toContain("listGuardianLinkRepairData");
    expect(data).toContain("guardian_link_repaired");
    expect(data).toContain("team_memberships");
  });

  it("keeps archive vault and brand governance evidence present", () => {
    const archivePage = readFileSync(join(process.cwd(), "app", "admin", "archive", "page.tsx"), "utf8");
    const surfaces = readFileSync(join(process.cwd(), "app", "admin", "_surfaces.tsx"), "utf8");
    const logoPolicy = readFileSync(join(process.cwd(), "docs", "brand-governance.md"), "utf8");
    const logoService = readFileSync(join(process.cwd(), "lib", "supabase", "team-logos.ts"), "utf8");

    expect(archivePage).toContain("AdminReportsArchiveSurface");
    expect(surfaces).toContain("listArchiveVaultData");
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

  it("keeps tenant readiness browser proof wired into QA automation", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const proofScript = readFileSync(join(process.cwd(), "scripts", "capture-tenant-readiness-proof.mjs"), "utf8");

    expect(packageJson).toContain("\"qa:tenant-readiness-proof\"");
    expect(proofScript).toContain("/admin/health");
    expect(proofScript).toContain("/admin/teams");
    expect(proofScript).toContain("output/playwright/tenant-readiness");
    expect(proofScript).toContain("Tenant setup guide");
    expect(proofScript).toContain("Notification boundary");
  });

  it("keeps the fictional demo tenant seed guarded and provider-safe", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const seedScript = readFileSync(join(process.cwd(), "scripts", "bootstrap-demo-tenant.mjs"), "utf8");

    expect(packageJson).toContain("\"supabase:demo-tenant\"");
    expect(seedScript).toContain("DEMO_TENANT_SEED_CONFIRM");
    expect(seedScript).toContain("load-fictional-data");
    expect(seedScript).toContain("LeaguePilot Demo League");
    expect(seedScript).toContain("providerSendsExecuted: 0");
    expect(seedScript).toContain("Demo tenant never sends external SMS.");
  });

  it("keeps fictional demo tenant browser proof wired into QA automation", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const proofScript = readFileSync(join(process.cwd(), "scripts", "capture-demo-tenant-proof.mjs"), "utf8");

    expect(packageJson).toContain("\"qa:demo-tenant-proof\"");
    expect(proofScript).toContain("output/playwright/demo-tenant");
    expect(proofScript).toContain("LeaguePilot Demo League");
    expect(proofScript).toContain("Riverside Rockets");
    expect(proofScript).toContain("Northside Waves");
    expect(proofScript).toContain("providerSendsExecuted: 0");
    expect(proofScript).toContain("provider_call === true");
  });

  it("keeps Schedule and RSVP browser proof provider-free and mutation-safe", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const proofScript = readFileSync(join(process.cwd(), "scripts", "capture-schedule-rsvp-proof.mjs"), "utf8");

    expect(packageJson).toContain("\"qa:schedule-rsvp-proof\"");
    expect(proofScript).toContain("/parent/schedule");
    expect(proofScript).toContain("/parent/rsvp");
    expect(proofScript).toContain("schedule_changed");
    expect(proofScript).toContain("guardian_conflict");
    expect(proofScript).toContain("hostedRowsMutated: false");
    expect(proofScript).toContain("providerCallsExecuted: 0");
    expect(proofScript).toContain('page.route("**/api/rsvps"');
  });

  it("keeps Family utility browser proof provider-free and mutation-safe", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const proofScript = readFileSync(join(process.cwd(), "scripts", "capture-family-utilities-proof.mjs"), "utf8");

    expect(packageJson).toContain("\"qa:family-utilities-proof\"");
    expect(proofScript).toContain("/parent/settings");
    expect(proofScript).toContain("/parent/more");
    expect(proofScript).toContain("/account");
    expect(proofScript).toContain("/parent/practice-recaps");
    expect(proofScript).toContain("hostedRowsMutated: false");
    expect(proofScript).toContain("providerCallsExecuted: 0");
    expect(proofScript).toContain('page.route("**/api/parent/setup"');
    expect(proofScript).toContain('page.route("**/api/parent/replays/*/engagement"');
  });
});
