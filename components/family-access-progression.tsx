"use client";

import { Clock3, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdditionalGuardianParentData } from "@/lib/supabase/additional-guardians";
import type { ParentSeasonTransitionData } from "@/lib/supabase/season-transitions";
import type { ParentTemporaryCaregiverData } from "@/lib/supabase/temporary-caregivers";
import { ParentAdditionalGuardianClient } from "./additional-guardian-access";
import { ParentSeasonTransitionReview } from "./season-transition-review";
import { ParentTemporaryCaregiverClient } from "./temporary-caregiver-access";

export function FamilyAccessProgression({
  guardianData,
  caregiverData,
  transitionData
}: {
  guardianData: AdditionalGuardianParentData;
  caregiverData: ParentTemporaryCaregiverData;
  transitionData: ParentSeasonTransitionData;
}) {
  const children = useMemo(() => {
    const byId = new Map<string, { playerId: string; childLabel: string; teamName: string }>();
    guardianData.children.forEach((child) => byId.set(child.playerId, {
      playerId: child.playerId,
      childLabel: child.playerName,
      teamName: child.teamName
    }));
    caregiverData.children.forEach((child) => byId.set(child.playerId, {
      playerId: child.playerId,
      childLabel: child.childLabel,
      teamName: child.teamName
    }));
    return [...byId.values()];
  }, [caregiverData.children, guardianData.children]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(children[0]?.playerId ?? "");
  const [accessType, setAccessType] = useState<"guardian" | "caregiver">("guardian");
  const pendingTransitions = transitionData.transitions.filter((transition) => (
    transition.guardianDecision === "pending" &&
    transition.state === "awaiting_guardian_review"
  ));

  return (
    <div className="page family-access-progression">
      <section className="hero family-access-hero">
        <span className="eyebrow">Family</span>
        <h1>Give the right adult the right access.</h1>
        <p className="lead">Choose one child, then decide between permanent league-verified guardian access and temporary event-boxed caregiver access.</p>
      </section>

      {pendingTransitions.length ? (
        <ParentSeasonTransitionReview
          data={{ ...transitionData, transitions: pendingTransitions }}
          embedded
        />
      ) : null}

      <section className="family-access-step" aria-labelledby="family-access-child-title">
        <header>
          <span>1</span>
          <div>
            <small>Child and team</small>
            <h2 id="family-access-child-title">Who is this access for?</h2>
          </div>
        </header>
        <label>
          Linked child
          <select value={selectedPlayerId} onChange={(event) => setSelectedPlayerId(event.target.value)}>
            {!children.length ? <option value="">No linked children available</option> : null}
            {children.map((child) => (
              <option value={child.playerId} key={child.playerId}>{child.childLabel} · {child.teamName}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="family-access-step" aria-labelledby="family-access-type-title">
        <header>
          <span>2</span>
          <div>
            <small>Access type</small>
            <h2 id="family-access-type-title">What relationship does this adult need?</h2>
          </div>
        </header>
        <div className="family-access-type-grid">
          <button
            type="button"
            className={accessType === "guardian" ? "is-selected" : ""}
            aria-pressed={accessType === "guardian"}
            onClick={() => setAccessType("guardian")}
          >
            <UserRoundCheck aria-hidden="true" size={24} />
            <strong>Guardian</strong>
            <span>Permanent team access after league verification.</span>
            <small>Requested · League reviewing · Active · Revoked</small>
          </button>
          <button
            type="button"
            className={accessType === "caregiver" ? "is-selected" : ""}
            aria-pressed={accessType === "caregiver"}
            onClick={() => setAccessType("caregiver")}
          >
            <Clock3 aria-hidden="true" size={24} />
            <strong>Caregiver</strong>
            <span>Temporary access for selected events, up to 14 days.</span>
            <small>Review link · Accepted · Active · Expires · Revoked</small>
          </button>
        </div>
        <p className="family-access-tier-boundary">
          <ShieldCheck aria-hidden="true" size={18} />
          Guardian and caregiver access are different legal and product scopes. One never upgrades into the other.
        </p>
      </section>

      <section className="family-access-step family-access-workflow" aria-labelledby="family-access-workflow-title">
        <header>
          <span>3</span>
          <div>
            <small>Identify, scope, review, confirm, track</small>
            <h2 id="family-access-workflow-title">{accessType === "guardian" ? "Request guardian review" : "Create temporary care"}</h2>
          </div>
        </header>
        {accessType === "guardian" ? (
          <ParentAdditionalGuardianClient
            data={guardianData}
            embedded
            key={`guardian-${selectedPlayerId}`}
            selectedPlayerId={selectedPlayerId}
          />
        ) : (
          <ParentTemporaryCaregiverClient
            data={caregiverData}
            embedded
            key={`caregiver-${selectedPlayerId}`}
            selectedPlayerId={selectedPlayerId}
          />
        )}
      </section>
    </div>
  );
}
