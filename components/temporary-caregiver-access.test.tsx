import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CaregiverPortalData, ParentTemporaryCaregiverData } from "@/lib/supabase/temporary-caregivers";
import {
  CaregiverPortalClient,
  ParentTemporaryCaregiverClient,
  TemporaryCaregiverAcceptanceClient
} from "./temporary-caregiver-access";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

const parentData: ParentTemporaryCaregiverData = {
  ok: true,
  message: "Current scope loaded.",
  children: [{
    playerId: "player-1",
    childLabel: "Maya R.",
    teamName: "Tigers",
    events: [{
      eventId: "event-1",
      title: "Tigers vs Rockets",
      startsAt: "2026-08-02T15:00:00.000Z",
      endsAt: "2026-08-02T17:00:00.000Z"
    }]
  }],
  authorizations: []
};

describe("temporary caregiver experience", () => {
  it("starts blank and explains exact scope, acceptance, privacy, and prohibited authority", () => {
    const html = renderToStaticMarkup(<ParentTemporaryCaregiverClient data={parentData} />);
    expect(html).toContain("Choose exactly what one adult may see and do.");
    expect(html).toContain("Caregiver acceptance required");
    expect(html).toContain("one child");
    expect(html).toContain("maximum");
    expect(html).toContain("exact email");
    expect(html).toContain("Medical or health information");
    expect(html).toContain("RSVP or attendance changes");
    expect(html).toContain("No guardian membership");
    expect(html).toContain("No email, SMS, push, or");
    expect(html).not.toContain("caregiver@example.com");
    expect(html).not.toContain("value=\"2026-");
  });

  it("reveals no child or event details before a one-time invitation is checked", () => {
    const html = renderToStaticMarkup(<TemporaryCaregiverAcceptanceClient />);
    expect(html).toContain("Review every permission before accepting.");
    expect(html).toContain("Masked identity");
    expect(html).not.toContain("Maya R.");
    expect(html).not.toContain("Tigers vs Rockets");
  });

  it("shows only accepted child, selected events, actions, and current schedule version", () => {
    const data: CaregiverPortalData = {
      ok: true,
      message: "Showing only accepted scope.",
      clearPrivateCache: false,
      accessVersion: "2026-07-30T12:00:00.000Z",
      authorizations: [{
        id: "authorization-1",
        childLabel: "Maya R.",
        teamName: "Tigers",
        caregiverEmail: "caregiver@example.com",
        caregiverLabel: "Alex Morgan",
        authorizedByLabel: "Jordan R.",
        state: "active",
        stateLabel: "Active · time-bound",
        startsAt: "2026-08-02T12:00:00.000Z",
        expiresAt: "2026-08-03T19:00:00.000Z",
        inviteExpiresAt: "2026-08-01T12:00:00.000Z",
        allowedActions: ["view_selected_event_passports"],
        prohibitedActions: ["medical_or_health_access", "attendance_or_rsvp_changes"],
        policyVersion: "temporary-care-v1",
        updatedAt: "2026-07-30T12:00:00.000Z",
        events: [{
          eventId: "event-1",
          title: "Tigers vs Rockets",
          startsAt: "2026-08-02T15:00:00.000Z",
          endsAt: "2026-08-02T17:00:00.000Z",
          venueLabel: "West Park",
          addressLabel: "100 Main St",
          status: "scheduled",
          authorizedScheduleVersion: 1,
          currentScheduleVersion: 2
        }]
      }]
    };
    const html = renderToStaticMarkup(<CaregiverPortalClient data={data} />);
    expect(html).toContain("Maya R.");
    expect(html).toContain("Tigers vs Rockets");
    expect(html).toContain("current v2");
    expect(html).toContain("changed since this access was reviewed");
    expect(html).toContain("Medical or health access");
    expect(html).not.toContain("Change RSVP");
    expect(html).not.toContain("Publish message");
  });

  it("fails closed without rendering prior private scope", () => {
    const html = renderToStaticMarkup(<CaregiverPortalClient data={{
      ok: false,
      message: "No current temporary caregiver access is available.",
      clearPrivateCache: true,
      accessVersion: "1970-01-01T00:00:00.000Z",
      authorizations: []
    }} />);
    expect(html).toContain("No current temporary access.");
    expect(html).toContain("reveals no child or event details");
    expect(html).not.toContain("Maya R.");
    expect(html).not.toContain("Tigers vs Rockets");
    expect(CaregiverPortalClient.toString()).toContain("leaguepilot-pending-caregiver-invite");
  });
});
