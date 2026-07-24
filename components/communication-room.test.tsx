import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/domain";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import type { NotificationReceipt } from "@/lib/supabase/notification-receipts";
import type { TeamChatData } from "@/lib/supabase/team-chat";
import { CommunicationRoom } from "./communication-room";

const parentState = {
  ...seedState,
  teams: seedState.teams.filter((team) => team.id === "team-tigers"),
  players: seedState.players.filter((player) => player.id === "player-mason"),
  guardianLinks: seedState.guardianLinks.filter((link) => link.parentUserId === "user-parent-jordan"),
  events: seedState.events.filter((event) => event.teamId === "team-tigers"),
  chatMessages: seedState.chatMessages.filter((message) => message.teamId === "team-tigers")
};

const dashboardData: ParentCoachDashboardData = {
  state: parentState,
  parentUserId: "user-parent-jordan",
  coachUserId: "",
  isSupabaseBacked: true,
  accessStatus: "live",
  message: "Current family records loaded."
};

const teamChatData: TeamChatData = {
  teams: parentState.teams,
  users: seedState.users.filter((user) => ["user-parent-jordan", "user-coach-taylor"].includes(user.id)),
  teamMemberships: seedState.teamMemberships.filter((membership) => membership.teamId === "team-tigers"),
  events: parentState.events,
  channels: seedState.teamChatChannels.filter((channel) => channel.teamId === "team-tigers"),
  messages: parentState.chatMessages,
  moderationEvents: [],
  isSupabaseBacked: true,
  message: "Current team conversation loaded."
};

const criticalReceipt: NotificationReceipt = {
  notificationId: "notification-critical-1",
  organizationId: seedState.organization.id,
  teamId: "team-tigers",
  eventId: "event-tigers-game",
  recipientUserId: "user-parent-jordan",
  title: "Field closed for weather",
  body: "Do not travel to Field 1. Team staff will publish the next instruction here.",
  channel: "sms",
  notificationType: "weather_alert",
  notificationStatus: "sent",
  providerApprovalStatus: "approved",
  approvedByUserId: "user-coach-taylor",
  approvedByName: "Coach Taylor",
  createdAt: "2026-04-04T06:00:00.000Z",
  sentAt: "2026-04-04T06:01:00.000Z",
  evidence: {
    attemptId: "attempt-critical-1",
    provider: "sms",
    attemptStatus: "sent",
    approvedAt: "2026-04-04T06:00:30.000Z",
    deliveredAt: "2026-04-04T06:01:15.000Z"
  }
};

describe("CommunicationRoom", () => {
  it("keeps critical, update, and conversation authority lanes distinct", () => {
    const html = renderToStaticMarkup(
      <CommunicationRoom
        dashboardData={dashboardData}
        initialReceipts={[criticalReceipt]}
        receiptLoadOk
        receiptMessage="Message status current."
        teamChatData={teamChatData}
        viewerUserId="user-parent-jordan"
      />
    );

    expect(html).toContain("Communication Room");
    expect(html).toContain("Critical");
    expect(html).toContain("Updates");
    expect(html).toContain("Conversation");
    expect(html).toContain("Critical team instruction");
    expect(html).toContain("Approved by Coach Taylor");
    expect(html).toContain("Published");
    expect(html).toContain("Delivered");
    expect(html).toContain("Read");
    expect(html).toContain("Acknowledged");
    expect(html).toContain("Confirm receipt only");
    expect(html).toContain("It does not confirm attendance, agreement, transportation, or completion.");
    expect(html).toContain("Mason T.");
    expect(html).toContain("Tiny Tigers");
  });

  it("does not expose unapproved message wording to a family", () => {
    const html = renderToStaticMarkup(
      <CommunicationRoom
        dashboardData={dashboardData}
        initialReceipts={[{
          ...criticalReceipt,
          notificationId: "notification-pending-1",
          title: "Unapproved private draft",
          body: "This draft must not be visible.",
          providerApprovalStatus: "pending",
          evidence: { attemptStatus: "not_requested" }
        }]}
        receiptLoadOk
        receiptMessage="Message status current."
        teamChatData={teamChatData}
        viewerUserId="user-parent-jordan"
      />
    );

    expect(html).not.toContain("This draft must not be visible.");
    expect(html).toContain("No unresolved critical messages");
  });

  it("renders a read-only truth state when current conversation data is unavailable", () => {
    const html = renderToStaticMarkup(
      <CommunicationRoom
        dashboardData={{ ...dashboardData, isSupabaseBacked: false }}
        initialReceipts={[]}
        receiptLoadOk={false}
        receiptMessage="Message status is unavailable. No delivery state was inferred."
        teamChatData={{ ...teamChatData, isSupabaseBacked: false }}
        viewerUserId="user-parent-jordan"
      />
    );

    expect(html).toContain("Family links unavailable");
    expect(html).toContain("Conversation preview");
    expect(html).toContain("Message status unavailable");
    expect(html).toContain("No unresolved critical messages");
  });
});
