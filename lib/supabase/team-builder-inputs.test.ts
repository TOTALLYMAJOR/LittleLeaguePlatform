import { describe, expect, it } from "vitest";
import { saveTeamBuilderInput } from "./team-builder-inputs";

describe("private team-builder input validation", () => {
  const base = {
    organizationId: "org-1",
    seasonId: "season-1",
    playerId: "player-1",
    actorUserId: "admin-1"
  };

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
});
