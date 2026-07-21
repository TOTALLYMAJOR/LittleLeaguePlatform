import { describe, expect, it } from "vitest";
import { buildCoachInjuryContacts, normalizeDialablePhone } from "./coach-injury-contacts";

describe("coach injury contact scope", () => {
  it("normalizes valid dialer targets and rejects malformed phone values", () => {
    expect(normalizeDialablePhone("+1 (202) 555-0101")).toBe("+12025550101");
    expect(normalizeDialablePhone("555-0101")).toBe("5550101");
    expect(normalizeDialablePhone("call the office")).toBeNull();
    expect(normalizeDialablePhone("202-555-0101 ext 2")).toBeNull();
    expect(normalizeDialablePhone("+1234567890123456")).toBeNull();
  });

  it("returns only callable active contacts for assigned-team players", () => {
    const contacts = buildCoachInjuryContacts({
      teamIds: ["team-a"],
      teams: [{ id: "team-a", name: "Tiny Tigers" }, { id: "team-b", name: "Other Team" }],
      players: [
        { id: "player-a", team_id: "team-a", first_name: "Mason", last_initial: "T" },
        { id: "player-b", team_id: "team-b", first_name: "Other", last_initial: "P" }
      ],
      guardians: [
        { id: "guardian-a", player_id: "player-a", parent_user_id: "parent-a", relationship: "parent", status: "active" },
        { id: "guardian-inactive", player_id: "player-a", parent_user_id: "parent-inactive", relationship: "guardian", status: "inactive" },
        { id: "guardian-b", player_id: "player-b", parent_user_id: "parent-b", relationship: "parent", status: "active" }
      ],
      profiles: [
        { id: "parent-a", display_name: "Jordan Taylor", phone: "555-0101" },
        { id: "parent-inactive", display_name: "Inactive Guardian", phone: "555-0102" },
        { id: "parent-b", display_name: "Other Parent", phone: "555-0103" }
      ],
      authorizations: [{
        player_guardian_id: "guardian-a",
        authorization_type: "medical_decision",
        allowed: true,
        effective_at: "2026-01-01T00:00:00.000Z",
        expires_at: null
      }],
      emergencyContacts: [
        { id: "emergency-a", player_id: "player-a", name: "Casey Taylor", phone: "555-0199", relationship: "grandparent", priority: 2 },
        { id: "emergency-b", player_id: "player-b", name: "Other Contact", phone: "555-0188", relationship: "family", priority: 1 }
      ],
      now: Date.parse("2026-07-20T12:00:00.000Z")
    });

    expect(contacts).toHaveLength(2);
    expect(contacts.map((contact) => contact.contactName)).toEqual(["Jordan Taylor", "Casey Taylor"]);
    expect(contacts[0]).toMatchObject({
      playerId: "player-a",
      teamId: "team-a",
      kind: "guardian",
      medicalDecisionStatus: "approved"
    });
  });

  it("distinguishes denied or missing medical-decision evidence without hiding the emergency number", () => {
    const common = {
      teamIds: ["team-a"],
      teams: [{ id: "team-a", name: "Tiny Tigers" }],
      players: [{ id: "player-a", team_id: "team-a", first_name: "Mason", last_initial: "T" }],
      profiles: [{ id: "parent-a", display_name: "Jordan Taylor", phone: "555-0101" }],
      emergencyContacts: []
    };
    const denied = buildCoachInjuryContacts({
      ...common,
      guardians: [{ id: "guardian-a", player_id: "player-a", parent_user_id: "parent-a", relationship: "parent", status: "active" }],
      authorizations: [{
        player_guardian_id: "guardian-a",
        authorization_type: "medical_decision" as const,
        allowed: false,
        effective_at: "2026-01-01T00:00:00.000Z",
        expires_at: null
      }],
      now: Date.parse("2026-07-20T12:00:00.000Z")
    });
    const notRecorded = buildCoachInjuryContacts({
      ...common,
      guardians: [{ id: "guardian-a", player_id: "player-a", parent_user_id: "parent-a", relationship: "parent", status: "active" }],
      authorizations: [],
      now: Date.parse("2026-07-20T12:00:00.000Z")
    });

    expect(denied[0].medicalDecisionStatus).toBe("denied");
    expect(notRecorded[0].medicalDecisionStatus).toBe("not_recorded");
  });
});
