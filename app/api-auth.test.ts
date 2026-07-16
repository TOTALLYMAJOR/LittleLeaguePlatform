import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const privateMutationRoutes = [
  "app/api/admin/registration-requests/[requestId]/approve/route.ts",
  "app/api/admin/registration-requests/[requestId]/reject/route.ts",
  "app/api/admin/exports/route.ts",
  "app/api/admin/guardian-links/repair/route.ts",
  "app/api/admin/roster-imports/audit/route.ts",
  "app/api/admin/rosters/route.ts",
  "app/api/admin/seasons/route.ts",
  "app/api/admin/sponsors/route.ts",
  "app/api/admin/teams/route.ts",
  "app/api/admin/theme-defaults/route.ts",
  "app/api/admin/team-branding/route.ts",
  "app/api/admin/team-memberships/route.ts",
  "app/api/admin/team-logos/route.ts",
  "app/api/coach/parent-replay/route.ts",
  "app/api/coach/weekly-update/route.ts",
  "app/api/field-locations/route.ts",
  "app/api/media/moderation/route.ts",
  "app/api/media/report/route.ts",
  "app/api/media/uploads/finalize/route.ts",
  "app/api/media/uploads/intent/route.ts",
  "app/api/notification-preferences/route.ts",
  "app/api/notification-preferences/unsubscribe/route.ts",
  "app/api/provider-delivery/batch-review/route.ts",
  "app/api/provider-delivery/retry-plan/route.ts",
  "app/api/provider-delivery/review/route.ts",
  "app/api/push-subscriptions/route.ts",
  "app/api/rsvps/route.ts",
  "app/api/schedule/export/route.ts",
  "app/api/schedule/route.ts",
  "app/api/snack-slots/claim/route.ts",
  "app/api/support-requests/route.ts",
  "app/api/team-chat/messages/route.ts",
  "app/api/team-chat/moderation/route.ts",
  "app/api/team-chat/read-receipts/route.ts",
  "app/api/team-chat/reports/route.ts",
  "app/api/team-chat/reports/review/route.ts",
  "app/api/team-chat/retention/run/route.ts",
  "app/api/volunteer-signups/claim/route.ts",
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
    expect(file).toContain("applyPublicRateLimit");
    expect(file).toContain("status: 429");
  });

  it("keeps anonymous mobile usage measurement open for PWA decision data", () => {
    const file = source("app/api/mobile-usage-events/route.ts");

    expect(file).not.toContain("requireAuthenticatedRouteUser");
    expect(file).toContain("recordMobileUsageEvent");
    expect(file).toContain("applyPublicRateLimit");
    expect(file).toContain("status: 429");
  });

  it("keeps the internal notification worker secret-gated", () => {
    const file = source("app/api/internal/notification-send-worker/route.ts");

    expect(file).not.toContain("requireAuthenticatedRouteUser");
    expect(file).toContain("NOTIFICATION_WORKER_SECRET");
    expect(file).toContain("status: 401");
    expect(file).toContain("runNotificationProviderSendWorker");
  });

  it("keeps provider webhooks signature-gated instead of session-gated", () => {
    const sendGrid = source("app/api/provider-webhooks/sendgrid/route.ts");
    const twilio = source("app/api/provider-webhooks/twilio/route.ts");

    expect(sendGrid).not.toContain("requireAuthenticatedRouteUser");
    expect(sendGrid).toContain("verifySendGridWebhookSignature");
    expect(sendGrid).toContain("SENDGRID_WEBHOOK_PUBLIC_KEY");
    expect(twilio).not.toContain("requireAuthenticatedRouteUser");
    expect(twilio).toContain("verifyTwilioWebhookSignature");
    expect(twilio).toContain("TWILIO_AUTH_TOKEN");
  });
});
