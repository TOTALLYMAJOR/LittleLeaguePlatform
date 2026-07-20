import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("role route guards and compatibility wrappers", () => {
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

  it("keeps message delivery review provider-safe and send-disconnected", () => {
    const page = source("app/admin/message-delivery-review/page.tsx");
    const surfaces = source("app/admin/_surfaces.tsx");
    const providerReview = source("app/api/provider-delivery/review/route.ts");

    expect(page).toContain("AdminMessageDeliveryReviewSurface");
    expect(surfaces).toContain("without external provider sends");
    expect(surfaces).toContain("adapters are still disconnected");
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
    expect(teamPortalPage).toContain("resolveTeamPortalScope");
    expect(teamPortalPage).toContain("scopeTeamPortalData");
    expect(teamPortalPage).toContain("No accepted parent-team access is active yet.");
    expect(teamChatPage).toContain("getServerShellAccess");
    expect(teamChatPage).toContain("resolveTeamChatTeamIds");
    expect(teamChatPage).toContain("scopeTeamChatData");
    expect(teamChatPage).toContain("Team chat access is not active yet.");
  });
});
