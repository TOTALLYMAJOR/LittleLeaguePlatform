"use client";

import { useMemo, useState, useTransition } from "react";
import { authenticatedJsonPost } from "@/lib/supabase/authenticated-fetch";
import type { TeamBuildFriendRequest } from "@/lib/domain";
import type {
  TeamBuildAssignment,
  TeamBuildPlanStatus,
  TeamBuilderWorkbenchData
} from "@/lib/supabase/team-builder-plans";

type FeedbackKind = "idle" | "validation" | "error" | "conflict" | "success";

interface Feedback {
  kind: FeedbackKind;
  message: string;
}

function newActionId() {
  return crypto.randomUUID();
}

export function TeamBuilderWorkbench({ initialData }: { initialData: TeamBuilderWorkbenchData }) {
  const activeSeason = initialData.seasons.find((season) => season.status === "active");
  const activeTeams = useMemo(() => initialData.teams.filter((team) => (
    team.seasonId === activeSeason?.id && team.status === "active"
  )), [activeSeason?.id, initialData.teams]);
  const divisions = useMemo(() => [...new Set(activeTeams.map((team) => team.division))].sort(), [activeTeams]);
  const initialDivision = divisions[0] ?? "";
  const initialPlan = initialData.plans.find((plan) => (
    plan.seasonId === activeSeason?.id && plan.division === initialDivision
  ));
  const [division, setDivision] = useState(initialDivision);
  const [targetRosterSize, setTargetRosterSize] = useState(initialPlan?.targetRosterSize ?? 10);
  const [planId, setPlanId] = useState(initialPlan?.id ?? "");
  const [planStatus, setPlanStatus] = useState<TeamBuildPlanStatus | "">(initialPlan?.status ?? "");
  const [lockVersion, setLockVersion] = useState(initialPlan?.lockVersion ?? 0);
  const [assignments, setAssignments] = useState<TeamBuildAssignment[]>(initialPlan?.assignments ?? []);
  const [friendRequests, setFriendRequests] = useState<TeamBuildFriendRequest[]>(initialPlan?.friendRequests ?? []);
  const [friendPlayerId, setFriendPlayerId] = useState("");
  const [friendTargetId, setFriendTargetId] = useState("");
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle", message: initialData.message });
  const [isPending, startTransition] = useTransition();
  const [inputDrafts, setInputDrafts] = useState(() => Object.fromEntries(initialData.inputs.map((input) => [
    input.playerId,
    {
      birthDate: input.birthDate ?? "",
      ageBand: input.ageBand ?? "",
      evaluationRating: input.evaluationRating?.toString() ?? ""
    }
  ])));
  const teamsForDivision = activeTeams.filter((team) => team.division === division);
  const inputsForDivision = initialData.inputs.filter((input) => (
    teamsForDivision.some((team) => team.id === input.teamId)
  ));

  function validatePlan() {
    if (!initialData.ok || !initialData.organizationId || !activeSeason) {
      return "Live organization and active-season records are required.";
    }
    if (!division || teamsForDivision.length < 1 || inputsForDivision.length < 1) {
      return "Choose a division with active teams and rostered players.";
    }
    if (!Number.isInteger(targetRosterSize) || targetRosterSize < 1 || targetRosterSize > 30) {
      return "Target roster size must be from 1 through 30.";
    }
    return "";
  }

  function postPlan(action: "preview" | "edit" | "approve" | "publish", actionId = newActionId()) {
    const validation = validatePlan();
    if (validation) {
      setFeedback({ kind: "validation", message: validation });
      return;
    }
    startTransition(async () => {
      setFeedback({ kind: "idle", message: `${action} is being saved…` });
      try {
        const response = await authenticatedJsonPost("/api/admin/team-builder-plans", {
          action,
          actionId,
          planId: planId || undefined,
          organizationId: initialData.organizationId,
          seasonId: activeSeason!.id,
          division,
          targetRosterSize,
          expectedLockVersion: action === "preview" ? 0 : lockVersion,
          assignments: action === "edit" ? assignments : undefined,
          friendRequests
        }, { "Idempotency-Key": actionId });
        const payload = await response.json() as {
          ok?: boolean;
          message?: string;
          conflict?: boolean;
          plan?: { id: string; status: TeamBuildPlanStatus; lockVersion: number };
          assignments?: TeamBuildAssignment[];
        };
        if (!response.ok || !payload.ok) {
          setFeedback({
            kind: response.status === 409 || payload.conflict ? "conflict" : "error",
            message: payload.message ?? "The reviewed team-builder action could not be saved."
          });
          return;
        }
        if (payload.plan) {
          setPlanId(payload.plan.id);
          setPlanStatus(payload.plan.status);
          setLockVersion(payload.plan.lockVersion);
        }
        if (payload.assignments) setAssignments(payload.assignments);
        setFeedback({ kind: "success", message: payload.message ?? "Team-builder action saved." });
      } catch {
        setFeedback({ kind: "error", message: "The team-builder request could not reach the server. Retry when the connection is available." });
      }
    });
  }

  function savePrivateInput(playerId: string) {
    const draft = inputDrafts[playerId];
    if (!activeSeason || !draft) return;
    const rating = draft.evaluationRating === "" ? null : Number(draft.evaluationRating);
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      setFeedback({ kind: "validation", message: "Evaluation must be a whole number from 1 through 5." });
      return;
    }
    if (draft.ageBand && !/^\d{1,2}U$/i.test(draft.ageBand.trim())) {
      setFeedback({ kind: "validation", message: "Age band must look like 8U or 12U." });
      return;
    }
    startTransition(async () => {
      setFeedback({ kind: "idle", message: "Private input is being saved…" });
      try {
        const response = await authenticatedJsonPost("/api/admin/team-builder-inputs", {
          organizationId: initialData.organizationId,
          seasonId: activeSeason.id,
          playerId,
          birthDate: draft.birthDate || null,
          ageBand: draft.ageBand || null,
          evaluationRating: rating
        });
        const payload = await response.json() as { ok?: boolean; message?: string };
        setFeedback({
          kind: response.ok && payload.ok ? "success" : "error",
          message: payload.message ?? "Private input could not be saved."
        });
      } catch {
        setFeedback({ kind: "error", message: "Private input could not reach the server. Retry when the connection is available." });
      }
    });
  }

  const hasEmptyState = !activeSeason || !activeTeams.length || !initialData.inputs.length;
  const workflow = ["Preview", "Edit", "Approve", "Publish"];

  function changeDivision(nextDivision: string) {
    const resumedPlan = initialData.plans.find((plan) => (
      plan.seasonId === activeSeason?.id && plan.division === nextDivision
    ));
    setDivision(nextDivision);
    setTargetRosterSize(resumedPlan?.targetRosterSize ?? 10);
    setPlanId(resumedPlan?.id ?? "");
    setPlanStatus(resumedPlan?.status ?? "");
    setLockVersion(resumedPlan?.lockVersion ?? 0);
    setAssignments(resumedPlan?.assignments ?? []);
    setFriendRequests(resumedPlan?.friendRequests ?? []);
    setFriendPlayerId("");
    setFriendTargetId("");
  }

  return (
    <section className="stack" aria-labelledby="team-builder-title" aria-busy={isPending}>
      <div className="card stack">
        <span className="eyebrow">Admin-only reviewed workflow</span>
        <h2 id="team-builder-title">Private team builder</h2>
        <p>
          Preview → Edit → Approve → Publish. Publishing updates only the approved in-scope roster,
          writes audit evidence, and sends no email, SMS, push, or other provider message.
        </p>
        <ol aria-label="Team-builder lifecycle">
          {workflow.map((step) => (
            <li key={step}>
              <strong>{step}</strong>
              {planStatus === step.toLowerCase() || (step === "Edit" && planStatus === "edited") ? " — current" : ""}
            </li>
          ))}
        </ol>
        <p className="muted">Saved on this device only. Final sign-off still happens outside this page.</p>
      </div>

      <div
        className={`card ${feedback.kind === "conflict" || feedback.kind === "error" ? "danger" : ""}`}
        role={feedback.kind === "error" || feedback.kind === "validation" || feedback.kind === "conflict" ? "alert" : "status"}
        aria-live="polite"
      >
        <strong>{isPending ? "Working" : feedback.kind === "conflict" ? "Version conflict" : "Team-builder status"}</strong>
        <p>{feedback.message}</p>
        {feedback.kind === "conflict" ? (
          <button className="button secondary" type="button" onClick={() => window.location.reload()}>
            Refresh workbench
          </button>
        ) : null}
      </div>

      {hasEmptyState ? (
        <div className="card stack">
          <h3>No active roster is ready</h3>
          <p className="muted">Create an active season, active division teams, and rostered players before starting a preview.</p>
          <button className="button secondary" type="button" onClick={() => window.location.reload()}>Retry roster load</button>
        </div>
      ) : (
        <>
          <div className="card stack">
            <h3>Plan scope</h3>
            <label>
              Division
              <select value={division} onChange={(event) => changeDivision(event.target.value)}>
                {divisions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <fieldset className="stack">
              <legend><strong>Friend constraint</strong></legend>
              <p className="muted">Optional reviewed pairs stay together with guardian/sibling groups when a deterministic preview is saved.</p>
              <label>
                Player
                <select value={friendPlayerId} onChange={(event) => setFriendPlayerId(event.target.value)}>
                  <option value="">Choose player</option>
                  {inputsForDivision.map((input) => <option key={input.playerId} value={input.playerId}>{input.playerLabel}</option>)}
                </select>
              </label>
              <label>
                Requested friend
                <select value={friendTargetId} onChange={(event) => setFriendTargetId(event.target.value)}>
                  <option value="">Choose friend</option>
                  {inputsForDivision.filter((input) => input.playerId !== friendPlayerId).map((input) => (
                    <option key={input.playerId} value={input.playerId}>{input.playerLabel}</option>
                  ))}
                </select>
              </label>
              <button className="button secondary" type="button" onClick={() => {
                if (!friendPlayerId || !friendTargetId || friendPlayerId === friendTargetId) {
                  setFeedback({ kind: "validation", message: "Choose two different in-scope players for a friend constraint." });
                  return;
                }
                const key = [friendPlayerId, friendTargetId].sort().join(":");
                const exists = friendRequests.some((request) => [request.playerId, request.friendPlayerId].sort().join(":") === key);
                if (!exists) setFriendRequests((current) => [...current, { playerId: friendPlayerId, friendPlayerId: friendTargetId }]);
                setFriendPlayerId("");
                setFriendTargetId("");
              }}>Add friend constraint</button>
              {friendRequests.map((request) => {
                const left = initialData.inputs.find((input) => input.playerId === request.playerId)?.playerLabel ?? "Player";
                const right = initialData.inputs.find((input) => input.playerId === request.friendPlayerId)?.playerLabel ?? "Player";
                return (
                  <p key={[request.playerId, request.friendPlayerId].sort().join(":")}>
                    {left} + {right}{" "}
                    <button className="button secondary" type="button" onClick={() => setFriendRequests((current) => current.filter((item) => item !== request))}>
                      Remove
                    </button>
                  </p>
                );
              })}
            </fieldset>
            <label>
              Target roster size
              <input
                type="number"
                min={1}
                max={30}
                value={targetRosterSize}
                onChange={(event) => setTargetRosterSize(Number(event.target.value))}
              />
            </label>
            <div className="actions">
              <button className="button" type="button" disabled={isPending} onClick={() => postPlan("preview")}>
                Create persisted preview
              </button>
              <button className="button secondary" type="button" disabled={isPending || !planId || planStatus === "approved" || planStatus === "published"} onClick={() => postPlan("edit")}>
                Save edited assignments
              </button>
              <button className="button secondary" type="button" disabled={isPending || !planId || !["preview", "edited"].includes(planStatus)} onClick={() => postPlan("approve")}>
                Approve reviewed plan
              </button>
              <button className="button" type="button" disabled={isPending || planStatus !== "approved"} onClick={() => postPlan("publish")}>
                Publish approved assignments
              </button>
            </div>
          </div>

          <div className="card stack">
            <h3>Private player inputs</h3>
            <p className="muted">Birth date, explicit age band, and bounded evaluation stay on the admin-only profile. Blank values remain visibly defaulted in previews.</p>
            {inputsForDivision.map((input) => {
              const draft = inputDrafts[input.playerId]!;
              const assignedTeamId = assignments.find((assignment) => assignment.playerId === input.playerId)?.teamId ?? input.teamId;
              return (
                <fieldset className="card stack" key={input.playerId}>
                  <legend><strong>{input.playerLabel}</strong></legend>
                  <p className="muted">
                    {input.profileMissing ? "Profile missing" : "Profile recorded"} ·
                    {" "}{draft.ageBand || `${division} default`} ·
                    {" "}{draft.evaluationRating || "Evaluation default 3"}
                  </p>
                  <label>
                    Birth date
                    <input
                      type="date"
                      value={draft.birthDate}
                      onChange={(event) => setInputDrafts((current) => ({
                        ...current,
                        [input.playerId]: { ...current[input.playerId], birthDate: event.target.value }
                      }))}
                    />
                  </label>
                  <label>
                    Explicit age band
                    <input
                      inputMode="text"
                      placeholder={`${division} (default until saved)`}
                      value={draft.ageBand}
                      onChange={(event) => setInputDrafts((current) => ({
                        ...current,
                        [input.playerId]: { ...current[input.playerId], ageBand: event.target.value.toUpperCase() }
                      }))}
                    />
                  </label>
                  <label>
                    Evaluation (1–5)
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={draft.evaluationRating}
                      onChange={(event) => setInputDrafts((current) => ({
                        ...current,
                        [input.playerId]: { ...current[input.playerId], evaluationRating: event.target.value }
                      }))}
                    />
                  </label>
                  <button className="button secondary" type="button" disabled={isPending} onClick={() => savePrivateInput(input.playerId)}>
                    Save private input
                  </button>
                  {assignments.length ? (
                    <label>
                      Reviewed team assignment
                      <select
                        value={assignedTeamId}
                        onChange={(event) => setAssignments((current) => current.map((assignment) => (
                          assignment.playerId === input.playerId ? { ...assignment, teamId: event.target.value } : assignment
                        )))}
                      >
                        {teamsForDivision.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                </fieldset>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
