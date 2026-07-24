"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  AdminSeasonTransitionData,
  ParentSeasonTransitionData,
  SeasonTransitionView
} from "@/lib/supabase/season-transitions";

const labels: Record<string, string> = {
  child_display_identity: "Child display identity",
  guardian_relationship: "Guardian relationship",
  guardian_permissions: "Guardian permissions",
  custody_restrictions: "Custody restrictions",
  medical_information: "Medical information",
  attendance_and_rsvp: "Attendance and RSVP",
  transportation_responsibility: "Transportation responsibility",
  temporary_caregivers: "Temporary caregivers",
  media_consent: "Media consent",
  notification_preferences: "Notification preferences",
  team_conversation: "Team conversation"
};

function fieldLabel(value: string) {
  return labels[value] ?? value.replaceAll("_", " ");
}

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(timestamp);
}

async function authenticatedPost(url: string, payload: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // Private routes fail closed without a verified session.
  }
  return fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
}

function TransitionScope({ transition }: { transition: SeasonTransitionView }) {
  return (
    <div className="season-transition-scope">
      <div className="season-transition-carries">
        <strong>Moves after everyone approves</strong>
        <ul>{transition.carryForwardFields.map((field) => <li key={field}>{fieldLabel(field)}</li>)}</ul>
      </div>
      <div className="season-transition-resets">
        <strong>Starts fresh or needs separate review</strong>
        <ul>{transition.resetRequiredFields.map((field) => <li key={field}>{fieldLabel(field)}</li>)}</ul>
      </div>
    </div>
  );
}

export function ParentSeasonTransitionReview({ data }: { data: ParentSeasonTransitionData }) {
  const [transitions, setTransitions] = useState(data.transitions);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState(data.message);
  const [isPending, startTransition] = useTransition();

  function respond(transition: SeasonTransitionView, decision: "accepted" | "declined") {
    startTransition(async () => {
      const response = await authenticatedPost(`/api/parent/season-transitions/${transition.id}/respond`, {
        decision,
        note: notes[transition.id] ?? "",
        expectedLockVersion: transition.lockVersion
      });
      const result = await response.json().catch(() => ({ ok: false, message: "Response was unavailable." })) as {
        ok?: boolean; message?: string; state?: SeasonTransitionView["state"]; lock_version?: number;
      };
      setMessage(result.message ?? "Response could not be saved.");
      if (result.ok) {
        setTransitions((current) => current.map((item) => item.id === transition.id ? {
          ...item,
          state: result.state ?? item.state,
          lockVersion: result.lock_version ?? item.lockVersion,
          guardianDecision: decision,
          guardianAcceptedCount: decision === "accepted"
            ? Math.min(item.guardianReviewCount, item.guardianAcceptedCount + 1)
            : item.guardianAcceptedCount
        } : item));
      }
    });
  }

  return (
    <section className="page season-transition-page">
      <div className="hero">
        <span className="eyebrow">Season and team changes</span>
        <h1>Know exactly what moves—and what does not.</h1>
        <p className="lead">A league administrator can propose a new team or season. Every current guardian reviews the same scope before an administrator can apply it.</p>
      </div>
      <p className={`notice ${data.ok ? "ok" : "warning"}`} role="status">{message}</p>
      {transitions.map((transition) => (
        <article className="card stack season-transition-card" key={transition.id}>
          <div className="card-header">
            <div>
              <span className="eyebrow">{transition.childLabel}</span>
              <h2>{transition.sourceTeamName} → {transition.targetTeamName}</h2>
              <p>{transition.sourceSeasonName} → {transition.targetSeasonName}</p>
            </div>
            <span className={`badge ${transition.state === "guardian_declined" ? "danger" : transition.state === "guardian_accepted" || transition.state === "applied" ? "ok" : "warning"}`}>
              {transition.guardianDecision === "pending" ? "Your review needed" : transition.state.replaceAll("_", " ")}
            </span>
          </div>
          <p><strong>Why the league proposed this:</strong> {transition.proposalReason}</p>
          <p className="muted">Review expires {formatDate(transition.expiresAt)}. {transition.guardianAcceptedCount} of {transition.guardianReviewCount} guardian review(s) accepted.</p>
          <TransitionScope transition={transition} />
          {transition.guardianDecision === "pending" && transition.state === "awaiting_guardian_review" ? (
            <>
              <label>
                Optional note to league staff
                <textarea value={notes[transition.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [transition.id]: event.target.value }))} />
              </label>
              <div className="toolbar">
                <button type="button" disabled={isPending} onClick={() => respond(transition, "accepted")}>Accept this reviewed move</button>
                <button type="button" className="secondary danger" disabled={isPending} onClick={() => respond(transition, "declined")}>Decline</button>
              </div>
              <p className="muted">Your response alone does not change the roster or access. An authorized league administrator must apply the reviewed move.</p>
            </>
          ) : (
            <p className="notice">
              {transition.state === "expired"
                ? "This review expired without changing the roster or access. League staff can close it and begin a new review."
                : `Your response: ${transition.guardianDecision ?? "not required"}. This response alone does not change the roster or access.`}
            </p>
          )}
        </article>
      ))}
      {!transitions.length ? <div className="card empty-state"><h2>No team or season change needs review.</h2><p>Your current family access remains unchanged.</p></div> : null}
    </section>
  );
}

export function AdminSeasonTransitionReview({ data }: { data: AdminSeasonTransitionData }) {
  const router = useRouter();
  const transitions = data.transitions;
  const [sourcePlayerId, setSourcePlayerId] = useState(data.sourcePlayers[0]?.id ?? "");
  const initialSourceTeamId = data.sourcePlayers[0]?.teamId;
  const [targetTeamId, setTargetTeamId] = useState(
    data.targetTeams.find((team) => team.id !== initialSourceTeamId)?.id ?? ""
  );
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState(data.message);
  const [correctionReasons, setCorrectionReasons] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function adminAction(payload: Record<string, unknown>) {
    startTransition(async () => {
      const response = await authenticatedPost("/api/admin/season-transitions", payload);
      const result = await response.json().catch(() => ({ ok: false, message: "Response was unavailable." })) as { ok?: boolean; message?: string };
      setMessage(result.message ?? "Season-change action could not be completed.");
      if (result.ok) router.refresh();
    });
  }

  const awaitingCount = transitions.filter((transition) => transition.state === "awaiting_guardian_review").length;
  const readyCount = transitions.filter((transition) => transition.state === "guardian_accepted").length;
  const sourceTeamId = data.sourcePlayers.find((player) => player.id === sourcePlayerId)?.teamId;
  const availableTargetTeams = data.targetTeams.filter((team) => team.id !== sourceTeamId);
  return (
    <section className="page admin-transition-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Transition readiness</span>
          <h2>Reviewed season and team changes</h2>
          <p>No move carries custody, medical, attendance, transportation, caregiver, media, notification, or conversation state.</p>
        </div>
        <span className="badge">{awaitingCount} awaiting · {readyCount} ready</span>
      </div>
      <p className={`notice ${data.ok ? "" : "warning"}`} role="status">{message}</p>
      <section className="grid two">
        <article className="card stack">
          <h3>Propose a reviewed move</h3>
          <label>Current child and team<select value={sourcePlayerId} onChange={(event) => {
            const nextSourcePlayerId = event.target.value;
            const nextSourceTeamId = data.sourcePlayers.find((player) => player.id === nextSourcePlayerId)?.teamId;
            setSourcePlayerId(nextSourcePlayerId);
            if (targetTeamId === nextSourceTeamId) {
              setTargetTeamId(data.targetTeams.find((team) => team.id !== nextSourceTeamId)?.id ?? "");
            }
          }}>{data.sourcePlayers.map((player) => <option key={player.id} value={player.id}>{player.childLabel} · {player.teamName} · {player.seasonName}</option>)}</select></label>
          <label>Target team<select value={targetTeamId} onChange={(event) => setTargetTeamId(event.target.value)}>{availableTargetTeams.map((team) => <option key={team.id} value={team.id}>{team.teamName} · {team.seasonName}</option>)}</select></label>
          <label>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <button type="button" disabled={isPending || !sourcePlayerId || !targetTeamId || reason.trim().length < 10} onClick={() => adminAction({
            action: "propose",
            sourcePlayerId,
            targetTeamId,
            reason,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          })}>Send for guardian review</button>
          <p className="muted">Creates an in-app review record only. No roster change or provider message occurs.</p>
        </article>
        <article className="card stack">
          <h3>Privacy-minimized readiness rules</h3>
          <p><strong>TRANSITION-001</strong><br /><span className="muted">Every current guardian responded to the current lock version.</span></p>
          <p><strong>TRANSITION-002</strong><br /><span className="muted">Target team and season remain active at application time.</span></p>
          <p><strong>TRANSITION-003</strong><br /><span className="muted">Only child display identity and reviewed guardian relationships carry.</span></p>
          <p><strong>TRANSITION-004</strong><br /><span className="muted">Correction is deletable only before downstream family records exist.</span></p>
        </article>
      </section>
      <div className="stack">
        {transitions.map((transition) => (
          <article className="card stack" key={transition.id}>
            <div className="card-header"><div><span className="eyebrow">{transition.childLabel}</span><h3>{transition.sourceTeamName} → {transition.targetTeamName}</h3></div><span className="badge">{transition.state.replaceAll("_", " ")}</span></div>
            <p>{transition.guardianAcceptedCount}/{transition.guardianReviewCount} guardian reviews accepted · lock v{transition.lockVersion}</p>
            <TransitionScope transition={transition} />
            <div className="toolbar">
              <button type="button" disabled={isPending || transition.state !== "guardian_accepted"} onClick={() => adminAction({ action: "apply", transitionId: transition.id, expectedLockVersion: transition.lockVersion })}>Apply reviewed move</button>
              {["awaiting_guardian_review", "guardian_accepted", "expired", "applied"].includes(transition.state) ? <input aria-label={`Close or correction reason for ${transition.childLabel}`} placeholder={transition.state === "applied" ? "Correction reason" : "Close reason"} value={correctionReasons[transition.id] ?? ""} onChange={(event) => setCorrectionReasons((current) => ({ ...current, [transition.id]: event.target.value }))} /> : null}
              {["awaiting_guardian_review", "guardian_accepted", "expired"].includes(transition.state) ? (
                <button type="button" className="secondary" disabled={isPending || (correctionReasons[transition.id] ?? "").trim().length < 10} onClick={() => adminAction({
                  action: "close",
                  transitionId: transition.id,
                  reason: correctionReasons[transition.id],
                  expectedLockVersion: transition.lockVersion
                })}>{transition.state === "expired" ? "Close expired review" : "Cancel review"}</button>
              ) : null}
              <button type="button" className="secondary danger" disabled={isPending || transition.state !== "applied" || (correctionReasons[transition.id] ?? "").trim().length < 10} onClick={() => adminAction({ action: "revert", transitionId: transition.id, reason: correctionReasons[transition.id] })}>Correct before activity</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
