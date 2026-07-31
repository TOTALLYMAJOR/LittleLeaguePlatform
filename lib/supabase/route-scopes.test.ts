import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/domain";
import type { ScheduleOperationsData } from "./schedule-management";
import type { TeamChatData } from "./team-chat";
import type { TeamPortalData } from "./team-portal";
import { scopeScheduleOperationsData, scopeTeamChatData, scopeTeamPortalData } from "./route-scopes";

const allowedTeam = seedState.teams[0]!;
const blockedTeam = seedState.teams[1]!;
const allowedPlayer = seedState.players.find((player) => player.teamId === allowedTeam.id)!;
const allowedParent = seedState.users.find((user) => user.role === "parent")!;

describe("route data scoping", () => {
  it("scopes schedule data before render", () => {
    const data: ScheduleOperationsData = {
      organizationId: seedState.organization.id,
      isSupabaseBacked: true,
      message: "all rows",
      teams: seedState.teams,
      events: seedState.events,
      fieldLocations: [
        { id: "field-allowed", organizationId: allowedTeam.organizationId, name: "Allowed", address: "1 Main", status: "active" },
        { id: "field-blocked", organizationId: "org-other", name: "Blocked", address: "2 Main", status: "active" }
      ]
    };

    const scoped = scopeScheduleOperationsData(data, [allowedTeam.id], "scoped");

    expect(scoped.teams.map((team) => team.id)).toEqual([allowedTeam.id]);
    expect(scoped.events.every((event) => event.teamId === allowedTeam.id)).toBe(true);
    expect(scoped.fieldLocations.map((field) => field.id)).toEqual(["field-allowed"]);
  });

  it("scopes chat data to the viewer team and message authors", () => {
    const teamChatData: TeamChatData = {
      teams: seedState.teams,
      users: seedState.users,
      teamMemberships: seedState.teamMemberships,
      events: seedState.events,
      channels: seedState.teamChatChannels,
      messages: seedState.chatMessages,
      moderationEvents: seedState.chatModerationAuditEvents
    };

    const scoped = scopeTeamChatData(teamChatData, [allowedTeam.id], allowedParent.id);

    expect(scoped.teams.map((team) => team.id)).toEqual([allowedTeam.id]);
    expect(scoped.messages.every((message) => message.teamId === allowedTeam.id)).toBe(true);
    expect(scoped.users.some((user) => user.id === allowedParent.id)).toBe(true);
    expect(scoped.teams.some((team) => team.id === blockedTeam.id)).toBe(false);
  });

  it("minimizes parent portal data to linked players and hides invite email rows", () => {
    const parentPortalData: TeamPortalData = {
      teams: seedState.teams,
      players: seedState.players,
      guardianLinks: seedState.guardianLinks,
      parentInvites: seedState.parentInvites,
      teamMemberships: seedState.teamMemberships,
      users: seedState.users,
      events: seedState.events,
      mediaItems: seedState.mediaItems,
      familyReleasedMediaItemIds: [seedState.mediaItems[0]?.id ?? "missing"],
      parentReplays: seedState.parentReplays
    };

    const scoped = scopeTeamPortalData(parentPortalData, [allowedTeam.id], {
      audience: "parent",
      viewerUserId: allowedParent.id
    });

    expect(scoped.teams.every((team) => team.id === allowedTeam.id)).toBe(true);
    expect(scoped.players.every((player) => player.teamId === allowedTeam.id)).toBe(true);
    expect(scoped.guardianLinks.every((link) => link.parentUserId === allowedParent.id)).toBe(true);
    expect(scoped.parentInvites).toEqual([]);
    expect(scoped.parentReplays.every((replay) => replay.status === "queued")).toBe(true);
    expect(scoped.players.some((player) => player.id === allowedPlayer.id)).toBe(true);
    expect(scoped.familyReleasedMediaItemIds?.every((id) => scoped.mediaItems.some((item) => item.id === id))).toBe(true);
  });
});
