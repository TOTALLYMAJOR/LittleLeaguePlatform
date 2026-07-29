import { describe, expect, it } from "vitest";
import {
  approveTeamBuildPlan,
  saveTeamBuildPlan
} from "./team-builder-plans";

describe("team-builder plan service boundary", () => {
  it("rejects malformed preview scope before loading privileged records", async () => {
    const result = await saveTeamBuildPlan({
      organizationId: "",
      seasonId: "season-1",
      division: "8U",
      targetRosterSize: 10,
      actorUserId: "admin-1",
      expectedLockVersion: 0,
      actionId: "action-1"
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("verified administrator");
  });

  it("requires an expected version and action identifier for approval", async () => {
    const result = await approveTeamBuildPlan({
      planId: "plan-1",
      actorUserId: "admin-1",
      expectedLockVersion: 0,
      actionId: ""
    });
    expect(result).toEqual({
      ok: false,
      message: "Plan, verified administrator, expected version, and action identifier are required."
    });
  });
});
