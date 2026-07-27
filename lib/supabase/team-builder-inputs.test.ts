import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  requireActiveOrganizationAdmin: vi.fn()
}));

vi.mock("./admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

vi.mock("./access-control", () => ({
  requireActiveOrganizationAdmin: mocks.requireActiveOrganizationAdmin
}));

import { saveTeamBuilderInput } from "./team-builder-inputs";

describe("private team-builder input validation", () => {
  const base = {
    organizationId: "org-1",
    seasonId: "season-1",
    playerId: "player-1",
    actorUserId: "admin-1"
  };

  beforeEach(() => {
    mocks.createSupabaseAdminClient.mockReset();
    mocks.requireActiveOrganizationAdmin.mockReset();
    mocks.requireActiveOrganizationAdmin.mockResolvedValue({
      ok: true,
      message: "Access allowed.",
      organizationId: base.organizationId
    });
  });

  it("rejects free-form age bands and out-of-range evaluations before Supabase", async () => {
    await expect(saveTeamBuilderInput({
      ...base,
      ageBand: "advanced player",
      evaluationRating: 3
    })).resolves.toEqual({
      ok: false,
      message: "Age band must be an explicit value such as 8U or 12U."
    });
    await expect(saveTeamBuilderInput({
      ...base,
      ageBand: "8U",
      evaluationRating: 6
    })).resolves.toEqual({
      ok: false,
      message: "Player evaluation must be a whole number from 1 through 5."
    });
  });

  it("requires all tenant and actor identifiers", async () => {
    const result = await saveTeamBuilderInput({
      ...base,
      actorUserId: ""
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("verified administrator");
  });

  it("uses the atomic profile-and-audit RPC with the verified tenant and actor", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        player_id: base.playerId,
        birth_date: "2018-04-12",
        age_band: "8U",
        evaluation_rating: 4
      },
      error: null
    });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc });

    const result = await saveTeamBuilderInput({
      ...base,
      birthDate: "2018-04-12",
      ageBand: "8u",
      evaluationRating: 4
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("save_player_team_builder_profile", {
      target_organization_id: base.organizationId,
      target_season_id: base.seasonId,
      target_player_id: base.playerId,
      target_actor_user_id: base.actorUserId,
      target_birth_date: "2018-04-12",
      target_age_band: "8U",
      target_evaluation_rating: 4
    });
    expect(result).toMatchObject({
      ok: true,
      profile: {
        playerId: base.playerId,
        birthDate: "2018-04-12",
        ageBand: "8U",
        evaluationRating: 4
      },
      providerExecution: "not_started"
    });
  });

  it("does not claim success when the atomic RPC reports an audit or profile error", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "atomic profile audit failed" }
    });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc });

    await expect(saveTeamBuilderInput({
      ...base,
      ageBand: "8U",
      evaluationRating: 3
    })).resolves.toEqual({
      ok: false,
      message: "Private team-builder input could not be saved."
    });
  });
});
