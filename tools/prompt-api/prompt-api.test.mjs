import { describe, expect, it } from "vitest";
import { codex_debug, codex_spec } from "./index.mjs";

describe("prompt API", () => {
  it("builds a proof-bounded LeaguePilot specification without executing work", () => {
    const prompt = codex_spec({
      system: "LeaguePilot",
      goal: "Harden RSVP concurrency.",
      scope: ["RSVP route", "RSVP service"],
      proofLevel: "browser",
    });

    expect(prompt).toContain("Harden RSVP concurrency.");
    expect(prompt).toContain("A saved record is not proof of publication or delivery.");
    expect(prompt).toContain("Requested proof level: browser");
    expect(prompt).not.toContain("Execute Codex");
  });

  it("builds a diagnostic brief from a system alias", () => {
    const prompt = codex_debug({
      system: "Champion Coach OS",
      symptom: "A candidate is presented as validated.",
      expected: "Candidate maturity remains visible.",
    });

    expect(prompt).toContain("Champion Coach OS debugging brief");
    expect(prompt).toContain("A scaffold or local synthetic test is not authorization.");
  });

  it("rejects unsupported proof levels and systems", () => {
    expect(() =>
      codex_spec({
        system: "LeaguePilot",
        goal: "Test",
        proofLevel: "imagined",
      }),
    ).toThrow("Unsupported proofLevel");
    expect(() =>
      codex_debug({
        system: "Unknown",
        symptom: "Test",
        expected: "Test",
      }),
    ).toThrow("Unsupported system");
  });
});
