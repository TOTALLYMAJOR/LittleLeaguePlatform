import { describe, expect, it } from "vitest";
import {
  NOW,
  assertActionableTransition,
  assertNotificationTransition,
  assertWeatherAlertTransition,
  getParentDashboard,
  getTeamChatAccess,
  getTeamChatView,
  getWeatherApprovalQueue,
  seedState,
  transitionActionableState,
  transitionWeatherAlertState,
  type AppState
} from "../index";

describe("domain policy enforcement", () => {
  it("fails invalid state transitions", () => {
    expect(() => assertActionableTransition({
      objectType: "notification",
      objectId: "notification-sent",
      from: "sent",
      to: "queued",
      actorRole: "admin"
    })).toThrow("Invalid notification transition");

    expect(transitionActionableState("sent", "queued", "admin")).toBe("sent");
  });

  it("prevents a mocked parent from accessing other team data", () => {
    const mockedState: AppState = {
      ...seedState,
      announcements: [
        ...seedState.announcements,
        {
          id: "announcement-hawks-private",
          teamId: "team-hawks",
          authorUserId: "user-coach-rivera",
          title: "Happy Hawks private update",
          body: "Hawks-only team details.",
          createdAt: "2026-04-01T13:00:00.000Z"
        }
      ],
      mediaItems: [
        ...seedState.mediaItems,
        {
          id: "media-hawks-private",
          teamId: "team-hawks",
          title: "Happy Hawks private album",
          type: "google_photos",
          url: "https://photos.google.com/share/hawks-private",
          moderationStatus: "approved",
          visibility: "team",
          reportCount: 0,
          createdAt: "2026-04-01T13:00:00.000Z"
        }
      ]
    };

    const dashboard = getParentDashboard(mockedState, "user-parent-jordan", NOW);
    const otherTeamAccess = getTeamChatAccess(mockedState, "user-parent-jordan", "team-hawks");

    expect(dashboard.children.map(({ team }) => team.id)).toEqual(["team-tigers"]);
    expect(dashboard.nextEvents.map((event) => event.teamId)).not.toContain("team-hawks");
    expect(dashboard.recentMedia.map((item) => item.id)).not.toContain("media-hawks-private");
    expect(dashboard.latestAnnouncement?.title).not.toBe("Happy Hawks private update");
    expect(otherTeamAccess.canView).toBe(false);
    expect(() => getTeamChatView(mockedState, "user-parent-jordan", "team-hawks", NOW)).toThrow(/private/);
  });

  it("prevents notifications from being sent without approval", () => {
    expect(() => assertNotificationTransition({
      objectId: "notification-draft",
      from: "draft",
      to: "sent",
      actorRole: "system"
    })).toThrow("Invalid notification transition");

    expect(() => assertNotificationTransition({
      objectId: "notification-approved",
      from: "approved",
      to: "sent",
      actorRole: "coach"
    })).toThrow("approved -> sent by coach");

    expect(assertNotificationTransition({
      objectId: "notification-approved",
      from: "approved",
      to: "sent",
      actorRole: "system"
    })).toBe("sent");
  });

  it("keeps weather alerts draft until approved", () => {
    const approvalQueue = getWeatherApprovalQueue(seedState);

    expect(approvalQueue).toHaveLength(1);
    expect(approvalQueue[0]?.alert.status).toBe("draft");
    expect(() => assertWeatherAlertTransition({
      objectId: "weather-tigers-watch",
      from: "draft",
      to: "queued",
      actorRole: "system"
    })).toThrow("draft -> queued");
    expect(transitionActionableState("draft", "queued", "system")).toBe("draft");
    expect(transitionWeatherAlertState("weather-tigers-watch", "draft", "approved", "admin")).toBe("approved");
    expect(transitionWeatherAlertState("weather-tigers-watch", "approved", "queued", "system")).toBe("queued");
  });
});
