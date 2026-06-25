import { describe, expect, it } from "vitest";
import { evaluateParentPlayerEventAccess, evaluateTeamStaffAccess } from "./access-control";

describe("Supabase access-control decisions", () => {
  it("allows assigned coaches and org admins to perform team staff actions", () => {
    expect(evaluateTeamStaffAccess({
      hasCoachMembership: true,
      hasAdminMembership: false,
      action: "save weekly updates"
    })).toEqual({ ok: true, message: "Access allowed." });

    expect(evaluateTeamStaffAccess({
      hasCoachMembership: false,
      hasAdminMembership: true,
      action: "publish Parent Replay"
    })).toEqual({ ok: true, message: "Access allowed." });
  });

  it("blocks team staff actions without coach or admin membership", () => {
    expect(evaluateTeamStaffAccess({
      hasCoachMembership: false,
      hasAdminMembership: false,
      action: "save weekly updates"
    })).toEqual({
      ok: false,
      message: "Only assigned coaches or org admins can save weekly updates."
    });
  });

  it("allows parent actions only for linked players on the event team", () => {
    expect(evaluateParentPlayerEventAccess({
      eventTeamId: "team-1",
      playerTeamId: "team-1",
      hasGuardianLink: true
    })).toEqual({ ok: true, message: "Access allowed." });
  });

  it("blocks parent actions for cross-team events or missing guardian links", () => {
    expect(evaluateParentPlayerEventAccess({
      eventTeamId: "team-1",
      playerTeamId: "team-2",
      hasGuardianLink: true
    })).toEqual({
      ok: false,
      message: "Parent action requires the player and event to belong to the same team."
    });

    expect(evaluateParentPlayerEventAccess({
      eventTeamId: "team-1",
      playerTeamId: "team-1",
      hasGuardianLink: false
    })).toEqual({
      ok: false,
      message: "Parent action requires an active guardian link for this player."
    });
  });
});
