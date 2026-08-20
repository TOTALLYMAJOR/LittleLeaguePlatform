import { describe, expect, it } from "vitest";
import type {
  FulfillmentRequirement,
  SponsorFulfillmentEvidence,
  SponsorFulfillmentEvidenceKind,
  SponsorPlacementWindow
} from "../index";
import { deriveDeliverableState, deriveSponsorDeliverables } from "../index";

const NOW = "2026-08-19T12:00:00.000Z";

const logoRequirement: FulfillmentRequirement = {
  id: "req-logo",
  agreementId: "agreement-1",
  kind: "league_homepage_logo",
  label: "League homepage logo",
  requiredQuantity: 1
};

const newsletterRequirement: FulfillmentRequirement = {
  id: "req-newsletter",
  agreementId: "agreement-1",
  kind: "newsletter_placement",
  label: "Newsletter placement",
  requiredQuantity: 2
};

const openPlacement: SponsorPlacementWindow = {
  sponsorId: "sponsor-1",
  placementKey: "team_portal",
  status: "active",
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-12-01T00:00:00.000Z"
};

function evidenceFor(requirementId: string, id: string, observedAt = NOW): SponsorFulfillmentEvidence {
  return {
    id,
    requirementId,
    kind: "screenshot",
    observedAt,
    artifactUrl: `https://proof.example/${id}.png`
  };
}

describe("sponsor deliverable derivation", () => {
  it("never reports delivered without an evidence row", () => {
    // The claim this whole feature rests on. Every combination of placement, artwork, and clock is
    // exercised with an empty evidence list; none of them may produce `delivered`, because there is
    // no code path to the word other than the evidence branch.
    const placementSets: SponsorPlacementWindow[][] = [
      [],
      [openPlacement],
      [{ ...openPlacement, status: "paused" }],
      [{ ...openPlacement, startsAt: "2027-01-01T00:00:00.000Z" }],
      [{ ...openPlacement, endsAt: "2026-01-01T00:00:00.000Z" }],
      [{ ...openPlacement, placementKey: "weekly_digest" }]
    ];
    const requirements: FulfillmentRequirement[] = [
      logoRequirement,
      newsletterRequirement,
      { ...logoRequirement, id: "req-banner", kind: "field_banner", label: "Field banner" },
      { ...logoRequirement, id: "req-recap", kind: "season_recap", label: "Season recap" }
    ];

    for (const requirement of requirements) {
      for (const placements of placementSets) {
        for (const artworkApproved of [true, false]) {
          const state = deriveDeliverableState(requirement, placements, [], { artworkApproved, now: NOW });
          expect(state).not.toBe("delivered");
        }
      }
    }
  });

  it("reports delivered from a single evidence row even with no placement configured", () => {
    const state = deriveDeliverableState(
      newsletterRequirement,
      [],
      [evidenceFor(newsletterRequirement.id, "evidence-1")],
      { now: NOW }
    );

    expect(state).toBe("delivered");
  });

  it("ignores evidence recorded against a different requirement", () => {
    const state = deriveDeliverableState(
      logoRequirement,
      [],
      [evidenceFor(newsletterRequirement.id, "evidence-1")],
      { artworkApproved: true, now: NOW }
    );

    expect(state).not.toBe("delivered");
  });

  it("lets a block override evidence rather than reporting a delivered promise the league cannot keep", () => {
    const state = deriveDeliverableState(
      { ...logoRequirement, blockedAt: NOW, blockedReason: "Sponsor withdrew the artwork" },
      [openPlacement],
      [evidenceFor(logoRequirement.id, "evidence-1")],
      { artworkApproved: true, now: NOW }
    );

    expect(state).toBe("blocked");
  });

  it("reports awaiting_assets before scheduled when a logo benefit has no approved artwork", () => {
    expect(deriveDeliverableState(logoRequirement, [openPlacement], [], { artworkApproved: false, now: NOW }))
      .toBe("awaiting_assets");
    expect(deriveDeliverableState(logoRequirement, [openPlacement], [], { artworkApproved: true, now: NOW }))
      .toBe("scheduled");
  });

  it("does not gate a written benefit on artwork", () => {
    expect(deriveDeliverableState(
      newsletterRequirement,
      [{ ...openPlacement, placementKey: "weekly_digest" }],
      [],
      { artworkApproved: false, now: NOW }
    )).toBe("scheduled");
  });

  it("treats a closed placement window as not started rather than scheduled", () => {
    expect(deriveDeliverableState(
      logoRequirement,
      [{ ...openPlacement, endsAt: "2026-08-01T00:00:00.000Z" }],
      [],
      { artworkApproved: true, now: NOW }
    )).toBe("not_started");
    expect(deriveDeliverableState(
      logoRequirement,
      [{ ...openPlacement, startsAt: "2026-09-01T00:00:00.000Z" }],
      [],
      { artworkApproved: true, now: NOW }
    )).toBe("not_started");
  });

  it("orders evidence by observation with an id tiebreak and reports the earliest as delivered_at", () => {
    const deliverables = deriveSponsorDeliverables(
      [newsletterRequirement],
      [],
      [
        evidenceFor(newsletterRequirement.id, "evidence-c", "2026-08-10T00:00:00.000Z"),
        evidenceFor(newsletterRequirement.id, "evidence-b", "2026-08-05T00:00:00.000Z"),
        evidenceFor(newsletterRequirement.id, "evidence-a", "2026-08-05T00:00:00.000Z")
      ],
      { now: NOW }
    );

    expect(deliverables[0]?.evidence.map((entry) => entry.id)).toEqual([
      "evidence-a",
      "evidence-b",
      "evidence-c"
    ]);
    expect(deliverables[0]?.deliveredAt).toBe("2026-08-05T00:00:00.000Z");
    expect(deliverables[0]?.deliveredQuantity).toBe(3);
  });

  it("folds every evidence kind to the same delivered conclusion", () => {
    const kinds: SponsorFulfillmentEvidenceKind[] = [
      "screenshot",
      "link",
      "event_recap",
      "attendance_summary",
      "campaign_note"
    ];

    for (const kind of kinds) {
      const state = deriveDeliverableState(
        newsletterRequirement,
        [],
        [{ id: `evidence-${kind}`, requirementId: newsletterRequirement.id, kind, observedAt: NOW, note: "Observed" }],
        { now: NOW }
      );
      expect(state).toBe("delivered");
    }
  });

  it("carries no deliverable state on the requirement it derives from", () => {
    const [deliverable] = deriveSponsorDeliverables(
      [logoRequirement],
      [openPlacement],
      [evidenceFor(logoRequirement.id, "evidence-1")],
      { artworkApproved: true, now: NOW }
    );

    // The requirement is returned exactly as persisted: no state, no delivered count. Both live on
    // the derived deliverable and are recomputed from evidence on every read.
    expect(deliverable?.requirement).toEqual(logoRequirement);
    expect(Object.keys(deliverable?.requirement ?? {})).not.toContain("status");
    expect(Object.keys(deliverable?.requirement ?? {})).not.toContain("deliveredQuantity");
  });
});
