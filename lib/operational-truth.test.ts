import { describe, expect, it } from "vitest";
import {
  buildActionPriority,
  compareActionPriority,
  createDataFreshness,
  deriveSyncLabel,
  detectConflictSignals,
  rollupOperationalTruth,
  visibleConflictsForContext,
  type ActiveContext,
  type TruthEvidence
} from "./operational-truth";

const now = "2026-07-19T18:00:00.000Z";

function lane(overrides: Partial<TruthEvidence> = {}): TruthEvidence {
  return {
    category: "record",
    label: "Event is saved",
    evidenceAvailable: true,
    satisfied: true,
    critical: true,
    source: "events.updated_at",
    observedAt: now,
    ...overrides
  };
}

describe("operational truth", () => {
  it("allows positive summaries only when every critical lane is supported and current", () => {
    const truth = rollupOperationalTruth({
      positiveSummary: "Game details are ready.",
      evidence: [
        lane(),
        lane({ category: "approval", label: "Change approved" }),
        lane({
          category: "freshness",
          label: "Data current",
          freshness: createDataFreshness({
            source: "live",
            observedAt: now,
            expiresAfterMs: 60_000,
            now
          })
        })
      ],
      now
    });

    expect(truth.tone).toBe("ready");
    expect(truth.summary).toBe("Game details are ready.");
  });

  it("renders missing or stale critical evidence as needs verification", () => {
    const truth = rollupOperationalTruth({
      positiveSummary: "Ready",
      evidence: [
        lane(),
        lane({
          category: "freshness",
          label: "Weather current",
          satisfied: null,
          evidenceAvailable: false,
          source: "weather provider"
        })
      ],
      now
    });

    expect(truth.tone).toBe("unknown");
    expect(truth.summary).toBe("Needs verification.");
    expect(truth.criticalExceptions[0]?.label).toBe("Weather current");
  });

  it("renders failed record or approval evidence as blocked", () => {
    const truth = rollupOperationalTruth({
      positiveSummary: "Ready",
      evidence: [lane({ category: "approval", satisfied: false, label: "Admin approval missing" })],
      now
    });

    expect(truth.tone).toBe("blocked");
  });
});

describe("action priority", () => {
  it("uses deterministic weights and visible reasons", () => {
    const priority = buildActionPriority({
      safetySeverity: "critical",
      deadline: "2026-07-19T22:00:00.000Z",
      eventStartsAt: "2026-07-19T21:00:00.000Z",
      dependencyImpact: "blocking",
      authorityRequirement: "admin",
      createdAt: "2026-07-14T18:00:00.000Z",
      requiredRole: "admin",
      now
    });

    expect(priority.score).toBe(965);
    expect(priority.band).toBe("urgent");
    expect(priority.reasons).toContain("Safety impact +400");
    expect(priority.algorithmVersion).toBe("leaguepilot-priority-v1");
  });

  it("breaks ties by deadline, creation time, and stable id", () => {
    const base = buildActionPriority({
      safetySeverity: "none",
      dependencyImpact: "none",
      authorityRequirement: "self",
      createdAt: now,
      requiredRole: "parent",
      now
    });
    const items = [
      { id: "b", createdAt: now, priority: { ...base, deadline: "2026-07-20T20:00:00.000Z" } },
      { id: "a", createdAt: now, priority: { ...base, deadline: "2026-07-20T10:00:00.000Z" } }
    ].sort(compareActionPriority);

    expect(items.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("conflict visibility", () => {
  const events = [
    {
      id: "event-one",
      organizationId: "org-1",
      teamId: "team-1",
      playerIds: ["player-1"],
      guardianUserIds: ["guardian-1"],
      coachUserIds: ["coach-1"],
      volunteerUserIds: ["volunteer-1"],
      fieldId: "field-1",
      startsAt: "2026-07-20T14:00:00.000Z",
      endsAt: "2026-07-20T16:00:00.000Z"
    },
    {
      id: "event-two",
      organizationId: "org-1",
      teamId: "team-2",
      playerIds: ["player-2"],
      guardianUserIds: ["guardian-1"],
      coachUserIds: ["coach-1"],
      volunteerUserIds: ["volunteer-1"],
      fieldId: "field-1",
      startsAt: "2026-07-20T15:00:00.000Z",
      endsAt: "2026-07-20T17:00:00.000Z"
    }
  ];

  it("detects cross-child, coach, field, and volunteer conflicts", () => {
    const signals = detectConflictSignals(events);
    expect(signals.map((item) => item.type)).toEqual([
      "sibling_overlap",
      "guardian_transportation_overlap",
      "coach_overlap",
      "field_double_booking",
      "volunteer_overlap"
    ]);
  });

  it("does not expose sibling or guardian detail to coaches", () => {
    const context: ActiveContext = {
      actorUserId: "coach-1",
      role: "coach",
      organizationId: "org-1",
      organizationName: "LeaguePilot Demo League",
      seasonId: "season-1",
      seasonName: "Summer",
      permittedTeamIds: ["team-1"],
      permittedPlayerIds: [],
      contextKey: "coach:org-1:season-1:team-1",
      archived: false,
      readOnly: false
    };
    const visible = visibleConflictsForContext(detectConflictSignals(events), context);

    expect(visible.map((item) => item.type)).not.toContain("sibling_overlap");
    expect(visible.every((item) => item.userIds.length === 0 && item.playerIds.length === 0)).toBe(true);
  });
});

describe("offline sync labels", () => {
  it("keeps local record state separate from server sync evidence", () => {
    expect(deriveSyncLabel({
      actionId: "action-1",
      actionType: "rsvp",
      contextKey: "parent:org:season:team",
      queuedAt: now,
      retryCount: 0
    })).toBe("Saved on this device");

    expect(deriveSyncLabel({
      actionId: "action-1",
      actionType: "rsvp",
      contextKey: "parent:org:season:team",
      queuedAt: now,
      attemptedAt: now,
      conflictDetail: "Schedule version changed.",
      retryCount: 1
    })).toBe("Sync conflict");
  });
});
