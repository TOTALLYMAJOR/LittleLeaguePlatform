import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState, type AppState } from "@/lib/domain";
import type { NotificationReceipt } from "@/lib/supabase/notification-receipts";
import {
  AdminDeliveryReviewClient,
  FamilyFlightPlanClient
} from "./coordination-workbenches";

describe("FamilyFlightPlanClient", () => {
  it("starts caregiver coordination blank and does not imply transportation authority", () => {
    const state: AppState = {
      ...seedState,
      events: seedState.events.map((event) => event.id === "event-tigers-game"
        ? {
          ...event,
          startsAt: "2099-04-04T09:00:00.000Z",
          endsAt: "2099-04-04T10:00:00.000Z"
        }
        : event)
    };

    const html = renderToStaticMarkup(
      <FamilyFlightPlanClient
        state={state}
        parentUserId="user-parent-jordan"
        initialHandoffs={[]}
        message="Current coordination notes loaded."
      />
    );

    expect(html).toContain("Family coordination notes");
    expect(html).toContain("does not assign transportation");
    expect(html).toContain("No authorization");
    expect(html).toContain("Save coordination note");
    expect(html).toContain("placeholder=\"Enter a name or relationship\"");
    expect(html).toContain("placeholder=\"Add only the details your family needs for this event\"");
    expect(html).not.toContain("Grandparent pickup");
    expect(html).not.toContain("Meet at the team check-in flag");
  });
});

describe("AdminDeliveryReviewClient", () => {
  it("opens on pending approvals and keeps completed evidence behind filters", () => {
    const receipt: NotificationReceipt = {
      notificationId: "notification-1",
      organizationId: "organization-1",
      teamId: "team-1",
      recipientUserId: "parent-1",
      title: "Field update",
      body: "Practice moved to Field 2.",
      channel: "sms",
      notificationType: "schedule_changed",
      notificationStatus: "pending",
      providerApprovalStatus: "approved",
      createdAt: "2026-07-20T10:00:00.000Z",
      evidence: {
        attemptId: "attempt-1",
        provider: "sms",
        transportProvider: "pingram",
        attemptStatus: "failed",
        requestOutcome: "indeterminate",
        approvedAt: "2026-07-20T10:00:30.000Z",
        reconciliationRequiredAt: "2026-07-20T10:01:30.000Z",
        errorMessage: "The request timed out after submission."
      }
    };

    const html = renderToStaticMarkup(
      <AdminDeliveryReviewClient
        initialReceipts={[receipt]}
        message="Delivery evidence loaded."
      />
    );

    expect(html).toContain("All clear. No delivery drafts await approval.");
    expect(html).toContain("Awaiting approval");
    expect(html).not.toContain("Transport:");
    expect(html).not.toContain("Pingram");
    expect(html).toContain(">reconcile<");
  });
});
