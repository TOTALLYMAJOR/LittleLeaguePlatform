import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("role route guards and compatibility wrappers", () => {
  it("keeps the public schedule on an organization-scoped active-team loader", () => {
    const page = source("app/schedule/page.tsx");
    const service = source("lib/supabase/schedule-management.ts");

    expect(page).toContain("listPublicScheduleOperationsData");
    expect(page).not.toContain("listScheduleOperationsData");
    expect(service).toContain("PUBLIC_ORGANIZATION_ID");
    expect(service).toContain('.eq("organization_id", organization.id)');
    expect(service).toContain("filter(isCurrentTeamRow)");
    expect(service).toContain('.in("team_id", currentTeamIds)');
  });

  it("keeps public team-access choices in the same canonical organization", () => {
    const service = source("lib/supabase/registrations.ts");

    expect(service).toContain("PUBLIC_ORGANIZATION_ID");
    expect(service).toContain('.eq("organization_id", organizationId)');
    expect(service).toContain("selectCurrentTeamsOrAll");
  });

  it("keeps public status and recovery checks server-scoped, rate-limited, and privacy-minimized", () => {
    const statusRoute = source("app/api/registration-requests/status/route.ts");
    const recoveryRoute = source("app/api/invites/recover/route.ts");
    const service = source("lib/supabase/access-activation.ts");

    expect(statusRoute).toContain('checkPublicIntakeRateLimit("registration_status"');
    expect(recoveryRoute).toContain('checkPublicIntakeRateLimit("invite_recovery"');
    expect(statusRoute).toContain("findFamilyAccessStatus");
    expect(recoveryRoute).toContain("requestInvitationRecovery");
    expect(service).toContain("PUBLIC_ORGANIZATION_ID");
    expect(service).toContain('.eq("parent_email", email)');
    expect(service).not.toContain("invite_token_hash");
    expect(service).toContain("No provider message was sent");
    expect(service).not.toContain("seedState");
  });

  it("keeps first-sign-in preferences session-derived and atomic", () => {
    const route = source("app/api/parent/setup/route.ts");
    const service = source("lib/supabase/family-onboarding.ts");
    const migration = source("supabase/migrations/0025_family_first_sign_in.sql");
    expect(route).toContain("requireAuthenticatedRouteUser");
    expect(route).toContain("userId: auth.user.id");
    expect(service).toContain('supabase.rpc("complete_family_first_sign_in"');
    expect(migration).toContain("Active parent team access is required.");
    expect(migration).toContain("No provider message was sent.");
    expect(migration).not.toContain("net.http");
  });

  it("keeps invitation acceptance one-time, session-derived, and open-redirect safe", () => {
    const acceptRoute = source("app/api/invites/accept/route.ts");
    const service = source("lib/supabase/invite-acceptance.ts");
    const migration = source("supabase/migrations/0026_parent_invite_acceptance.sql");
    const authPage = source("app/auth/page.tsx");
    expect(acceptRoute).toContain("requireAuthenticatedRouteUser");
    expect(acceptRoute).toContain("userId: auth.user.id");
    expect(service).toContain('createHash("sha256")');
    expect(service).not.toContain("seedState");
    expect(migration).toContain("Signed-in email does not match this invitation.");
    expect(migration).toContain("status = 'accepted'");
    expect(migration).toContain("to service_role");
    expect(authPage).toContain('!returnTo.startsWith("//")');
  });

  it("uses one shared active-admin guard before admin data loaders", () => {
    const surfaces = source("app/admin/_surfaces.tsx");

    expect(surfaces).toContain("requireAdminPageAccess");
    expect((surfaces.match(/const pageAccess = await requireAdminPageAccess\(\);/g) ?? []).length).toBeGreaterThanOrEqual(12);
    expect((surfaces.match(/if \(!pageAccess.ok\) return <AdminAccessDeniedSurface/g) ?? []).length).toBeGreaterThanOrEqual(12);
    for (const loader of [
      "listRegistrationRequests",
      "listSponsorAdminData",
      "listMediaGovernanceData",
      "listAdminThemeData",
      "listGuardianLinkRepairData",
      "buildSecurityProofDashboard",
      "listArchiveVaultData",
      "listAdminOperationsData",
      "listAdminTeamManagementData",
      "listRegistrationReviewData",
      "listAdminMembershipData",
      "listScheduleOperationsData"
    ]) {
      expect(surfaces).toContain(loader);
    }
  });

  it("keeps admin observability access-guarded and organization-scoped", () => {
    const page = source("app/admin/observability/page.tsx");
    const service = source("lib/supabase/admin-observability.ts");

    expect(page).toContain("requireAdminPageAccess");
    expect(page).toContain("AdminAccessDeniedSurface");
    expect(page).toContain("listAdminObservabilityData({ organizationId })");
    expect(service).toContain('.eq("organization_id", input.organizationId)');
    expect(service).toContain('.eq("notifications.organization_id", input.organizationId)');
    expect(service).toContain('.from("provider_webhook_events")');
    expect(service).not.toContain('.from("notification_provider_webhook_events")');
    expect(service).not.toContain('.from("public_rate_limit_buckets")');
  });

  it("keeps coach attendance canonical and RSVP compatibility on the same guarded surface", () => {
    expect(source("app/coach/attendance/page.tsx")).toContain("CoachAttendanceSurface");
    expect(source("app/coach/rsvps/page.tsx")).toContain("CoachAttendanceSurface");
    expect(source("app/coach/_surfaces.tsx")).toContain("requireCoachPageAccess");
    expect(source("app/coach/_surfaces.tsx")).toContain("CoachRsvpsClient dashboardData");
  });

  it("keeps practice recap aliases on the review-only Parent Replay surface", () => {
    expect(source("app/coach/practice-recaps/page.tsx")).toContain("CoachPracticeRecapsSurface");
    expect(source("app/coach/parent-replay/page.tsx")).toContain("CoachPracticeRecapsSurface");
    const panel = source("components/feature-panels.tsx");

    expect(panel).toContain("ParentReplayClient");
    expect(panel).toContain("Preview");
    expect(panel).toContain("Approval is required before publish");
    expect(panel).toContain("Publishing creates in-app notification drafts only. External delivery still requires separate approval and provider evidence.");
    expect(panel).toContain("/api/coach/ai-workspace");
  });

  it("keeps practice safety controls coach-scoped and provider-free", () => {
    const surfaces = source("app/coach/_surfaces.tsx");
    const workbench = source("components/coordination-workbenches.tsx");
    const contacts = source("lib/supabase/coach-injury-contacts.ts");

    expect(surfaces).toContain("requireCoachPageAccess");
    expect(surfaces).toContain("listCoachInjuryContacts");
    expect(contacts).toContain("requireActiveTeamCoachOrOrgAdmin");
    expect(contacts).toContain('action: "read injury contact details"');
    expect(workbench).toContain("Water break timer");
    expect(workbench).toContain("Numbers stay hidden on screen until a coach intentionally reveals them");
    expect(workbench).toContain('href={`tel:${contact.phone}`}');
    expect(workbench).toContain("LeaguePilot does not place or confirm the call");
  });

  it("keeps message delivery review provider-safe and evidence-separated", () => {
    const page = source("app/admin/message-delivery-review/page.tsx");
    const surfaces = source("app/admin/_surfaces.tsx");
    const workbench = source("components/coordination-workbenches.tsx");
    const providerReview = source("app/api/provider-delivery/review/route.ts");

    expect(page).toContain("AdminMessageDeliveryReviewSurface");
    expect(surfaces).toContain("listOrganizationNotificationReceipts");
    expect(surfaces).toContain("AdminDeliveryReviewClient");
    expect(workbench).toContain("A queued attempt is not called sent");
    expect(workbench).toContain("provider acceptance is not called delivery");
    expect(providerReview).not.toContain("fetch(");
  });

  it("scopes wrapper data before rendering client surfaces", () => {
    const parentSurfaces = source("app/parent/_surfaces.tsx");
    const coachSurfaces = source("app/coach/_surfaces.tsx");
    const adminSurfaces = source("app/admin/_surfaces.tsx");

    expect(parentSurfaces).toContain("requireParentPageAccess");
    expect(parentSurfaces).toContain("scopeScheduleOperationsData");
    expect(parentSurfaces).toContain("scopeTeamChatData");
    expect(parentSurfaces).toContain("scopeTeamPortalData");
    expect(coachSurfaces).toContain("requireCoachPageAccess");
    expect(coachSurfaces).toContain("scopeScheduleOperationsData");
    expect(coachSurfaces).toContain("scopeTeamChatData");
    expect(coachSurfaces).toContain("scopeTeamPortalData");
    expect(adminSurfaces).toContain("scopeScheduleOperationsData");
    expect(adminSurfaces).toContain("organizationIds: pageAccess.access.adminOrganizationIds");
  });

  it("guards shared team portal and chat routes before loading private shared data", () => {
    const teamPortalPage = source("app/team-portal/page.tsx");
    const teamChatPage = source("app/team-chat/page.tsx");

    expect(teamPortalPage).toContain("getServerShellAccess");
    expect(teamPortalPage).toContain("resolveRouteAuthorityContext(access, \"/team-portal\")");
    expect(teamPortalPage).toContain("authority.dataScopeRole");
    expect(teamPortalPage).toContain("resolveTeamPortalScope");
    expect(teamPortalPage).toContain("scopeTeamPortalData");
    expect(teamPortalPage).toContain("No accepted parent-team access is active yet.");
    expect(teamChatPage).toContain("getServerShellAccess");
    expect(teamChatPage).toContain("resolveRouteAuthorityContext(access, \"/team-chat\")");
    expect(teamChatPage).toContain("authority.dataScopeRole");
    expect(teamChatPage).toContain("resolveTeamChatTeamIds");
    expect(teamChatPage).toContain("scopeTeamChatData");
    expect(teamChatPage).toContain("Team chat access is not active yet.");
  });

  it("persists active role through an authenticated server-validated cookie route", () => {
    const route = source("app/api/auth/active-role/route.ts");
    const shell = source("components/ui/AppShell.tsx");

    expect(route).toContain("getServerShellAccess");
    expect(route).toContain("response.cookies.set");
    expect(route).toContain("leaguepilot-active-role");
    expect(route).toContain("hasContext");
    expect(shell).toContain('fetch("/api/auth/active-role"');
    expect(shell).not.toContain("document.cookie");
  });

  it("guards parent More and derives destinations from route topology", () => {
    const page = source("app/parent/more/page.tsx");
    const topology = source("lib/navigation/route-topology.ts");

    expect(page).toContain("requireParentPageAccess");
    expect(page).toContain("ParentDashboardClient");
    expect(page).toContain("getParentMoreDestinations(pageAccess.access)");
    expect(page).not.toContain("const moreDestinations = [");
    expect(topology).toContain("getParentMoreDestinations");
    expect(topology).toContain("parentMoreDescription");
  });
});
