import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const privateMutationRoutes = [
  "app/api/admin/registration-requests/[requestId]/approve/route.ts",
  "app/api/admin/registration-requests/[requestId]/reject/route.ts",
  "app/api/admin/exports/route.ts",
  "app/api/admin/guardian-links/repair/route.ts",
  "app/api/admin/impact-preview/route.ts",
  "app/api/admin/payments/connect/route.ts",
  "app/api/admin/payments/sponsor-checkout/route.ts",
  "app/api/admin/roster-imports/audit/route.ts",
  "app/api/admin/rosters/route.ts",
  "app/api/admin/seasons/route.ts",
  "app/api/admin/sponsors/route.ts",
  "app/api/admin/teams/route.ts",
  "app/api/admin/theme-defaults/route.ts",
  "app/api/admin/team-branding/route.ts",
  "app/api/admin/team-memberships/route.ts",
  "app/api/admin/team-logos/route.ts",
  "app/api/admin/drill-video-sources/review/route.ts",
  "app/api/admin/drill-videos/review/route.ts",
  "app/api/coach/drill-video-assignments/route.ts",
  "app/api/coach/drill-videos/route.ts",
  "app/api/coach/attendance/route.ts",
  "app/api/coach/event-notes/route.ts",
  "app/api/coach/parent-replay/approve/route.ts",
  "app/api/coach/parent-replay/publish/route.ts",
  "app/api/coach/parent-replay/route.ts",
  "app/api/coach/weekly-update/route.ts",
  "app/api/field-locations/route.ts",
  "app/api/media/moderation/route.ts",
  "app/api/media/report/route.ts",
  "app/api/media/family-release/route.ts",
  "app/api/media/uploads/complete/route.ts",
  "app/api/media/uploads/initiate/route.ts",
  "app/api/notification-preferences/route.ts",
  "app/api/notification-preferences/unsubscribe/route.ts",
  "app/api/provider-delivery/retry-plan/route.ts",
  "app/api/provider-delivery/review/route.ts",
  "app/api/push-subscriptions/route.ts",
  "app/api/parent/payments/checkout/route.ts",
  "app/api/rsvps/route.ts",
  "app/api/schedule/export/route.ts",
  "app/api/schedule/route.ts",
  "app/api/snack-slots/claim/route.ts",
  "app/api/support-requests/route.ts",
  "app/api/team-chat/messages/route.ts",
  "app/api/team-chat/moderation/route.ts",
  "app/api/team-chat/read-receipts/route.ts",
  "app/api/volunteer-signups/claim/route.ts",
  "app/api/volunteer-signups/transfers/route.ts",
  "app/api/volunteer-signups/waitlist/promote/route.ts",
  "app/api/volunteer-signups/waitlist/route.ts",
  "app/api/weather-alerts/draft/route.ts"
];

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("API mutation auth boundaries", () => {
  it("requires a verified Supabase session on every private mutation route", () => {
    for (const route of privateMutationRoutes) {
      const file = source(route);

      expect(file, `${route} should import the auth guard`).toContain("requireAuthenticatedRouteUser");
      expect(file, `${route} should return 401 without a valid session`).toContain("status: 401");
    }
  });

  it("keeps public registration intake open for unauthenticated families", () => {
    const file = source("app/api/registration-requests/route.ts");

    expect(file).not.toContain("requireAuthenticatedRouteUser");
    expect(file).toContain("createPendingRegistration");
  });

  it("sends the Supabase bearer token when admin registration review buttons call private APIs", () => {
    const panel = source("components/feature-panels.tsx");
    const reviewRequest = panel.slice(
      panel.indexOf("function reviewRequest"),
      panel.indexOf("const pendingRequests")
    );

    expect(reviewRequest).toContain("authenticatedJsonFetch");
    expect(reviewRequest).toContain("/api/admin/registration-requests/${requestId}/${action}");
    expect(reviewRequest).not.toContain("await fetch(`/api/admin/registration-requests");
  });

  it("keeps anonymous mobile usage measurement open for PWA decision data", () => {
    const file = source("app/api/mobile-usage-events/route.ts");

    expect(file).not.toContain("requireAuthenticatedRouteUser");
    expect(file).toContain("recordMobileUsageEvent");
  });

  it("keeps OAuth callback scoped to Supabase code exchange and auth landing", () => {
    const callback = source("app/auth/callback/route.ts");
    const panel = source("components/feature-panels.tsx");

    expect(callback).toContain("exchangeCodeForSession");
    expect(callback).toContain("/auth?oauth=complete");
    expect(panel).toContain("signInWithOAuth");
    expect(panel).toContain("provider,");
    expect(panel).toContain("getSupabaseEmailRedirectTo(`/auth/callback");
    expect(panel).toContain("encodeURIComponent(returnTo)");
    expect(panel).toContain("/api/auth/session-landing");
  });
});
