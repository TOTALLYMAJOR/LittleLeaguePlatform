"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  AdditionalGuardianAdminData,
  AdditionalGuardianParentData,
  AdditionalGuardianRequestView
} from "@/lib/supabase/additional-guardians";

async function authenticatedFetch(path: string, body: unknown) {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return new Response(JSON.stringify({ ok: false, message: "Sign in again before changing family access." }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  return fetch(path, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function StatePill({ state }: { state: AdditionalGuardianRequestView["state"] }) {
  const labels: Record<AdditionalGuardianRequestView["state"], string> = {
    pending_review: "Awaiting league review",
    invitation_ready: "Approved · invitation ready",
    accepted: "Access active",
    cancelled: "Cancelled",
    rejected: "Not approved",
    expired: "Invitation expired",
    revoked: "Access revoked"
  };
  return <span className={`status-pill ${state === "accepted" ? "ok" : state === "pending_review" ? "warning" : ""}`}>{labels[state]}</span>;
}

function ScopeExplanation() {
  return (
    <div className="scope-explanation">
      <h3>Standard linked-guardian access</h3>
      <ul className="plain-list">
        <li>See this child’s team schedule and official updates</li>
        <li>Respond for this child and view eligible Parent Replay moments</li>
        <li>Participate in the family-facing team conversation</li>
      </ul>
      <p className="muted">
        This does not grant custody authority, medical access, transportation responsibility, schedule editing,
        roster management, or permission to publish team communication.
      </p>
    </div>
  );
}

export function ParentAdditionalGuardianClient({ data }: { data: AdditionalGuardianParentData }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState(data.children[0]?.playerId ?? "");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<AdditionalGuardianRequestView["relationship"]>("guardian");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedChild = useMemo(
    () => data.children.find((child) => child.playerId === playerId),
    [data.children, playerId]
  );

  function submitRequest() {
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedFetch("/api/parent/additional-guardians", {
        playerId,
        email,
        relationship
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? "Request could not be saved.");
      if (result?.ok) {
        setEmail("");
        setConfirmed(false);
        router.refresh();
      }
    });
  }

  function cancelRequest(requestId: string) {
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedFetch(`/api/parent/additional-guardians/${requestId}/cancel`, {});
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? "Request could not be cancelled.");
      if (result?.ok) router.refresh();
    });
  }

  return (
    <div className="page additional-guardian-page">
      <section className="hero">
        <span className="eyebrow">Family access</span>
        <h1>Ask the league to connect another trusted adult.</h1>
        <p className="lead">
          Choose one child and team. A league administrator verifies the request before any invitation exists.
          Most reviews should take one to two business days.
        </p>
      </section>

      {!data.ok ? <p className="notice warning" role="status">{data.message}</p> : null}
      {message ? <p className={`notice ${messageOk ? "ok" : "warning"}`} aria-live="polite">{message}</p> : null}

      <section className="grid two">
        <article className="card stack">
          <span className="eyebrow">1 · Propose an adult</span>
          <h2>Who needs access?</h2>
          <label>
            Child and team
            <select disabled={!data.ok || !data.children.length} value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
              {!data.children.length ? <option value="">No linked children available</option> : null}
              {data.children.map((child) => (
                <option key={child.playerId} value={child.playerId}>{child.playerName} · {child.teamName}</option>
              ))}
            </select>
          </label>
          <label>
            Adult email
            <input
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@domain.com"
              type="email"
              value={email}
            />
          </label>
          <label>
            Relationship to child
            <select value={relationship} onChange={(event) => setRelationship(event.target.value as typeof relationship)}>
              <option value="guardian">Guardian</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="other">Other trusted adult</option>
            </select>
          </label>
          <ScopeExplanation />
          <label className="check-row">
            <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
            I confirm this adult should be reviewed for {selectedChild?.playerName ?? "this child"} and {selectedChild?.teamName ?? "this team"} only.
          </label>
          <button
            disabled={!data.ok || !playerId || !email.trim() || !confirmed || isPending}
            onClick={submitRequest}
          >
            {isPending ? "Saving request…" : "Send for league review"}
          </button>
          <p className="muted">
            The adult will not receive an invitation from this step. Your email and theirs are visible only to
            authorized league administrators handling access.
          </p>
        </article>

        <article className="card stack">
          <span className="eyebrow">2 · Track review</span>
          <h2>What happens next</h2>
          <ol className="plain-list">
            <li>The league checks your guardian link, the adult identity, and the exact child/team scope.</li>
            <li>An administrator approves or declines with visible attribution and audit history.</li>
            <li>If approved, the administrator securely shares a seven-day, one-time sign-in link.</li>
            <li>The adult must sign in with the exact invited email before access activates.</li>
          </ol>
          <p className="notice">
            A league administrator can revoke approved access. Corrections do not change custody records,
            medical information, or the truth of attendance and transportation.
          </p>
        </article>
      </section>

      <section className="stack" aria-labelledby="guardian-request-history">
        <div>
          <span className="eyebrow">Request history</span>
          <h2 id="guardian-request-history">Additional guardian requests</h2>
        </div>
        {!data.requests.length ? (
          <article className="card empty-state">
            <h3>No requests yet</h3>
            <p className="muted">When you propose another adult, review status will appear here.</p>
          </article>
        ) : data.requests.map((request) => (
          <article className="card stack" key={request.id}>
            <div className="split-heading">
              <div>
                <span className="eyebrow">{request.teamName}</span>
                <h3>{request.playerName}</h3>
              </div>
              <StatePill state={request.state} />
            </div>
            <p><strong>{request.proposedEmail}</strong> · {request.relationship}</p>
            <p className="muted">Proposed by {request.proposedByLabel}</p>
            <p className="muted">Requested {new Date(request.requestedAt).toLocaleString()}</p>
            {request.decisionReason ? <p className="notice">League review note: {request.decisionReason}</p> : null}
            {request.reviewedByLabel ? <p className="muted">Reviewed by {request.reviewedByLabel}</p> : null}
            {request.inviteExpiresAt && request.state === "invitation_ready" ? (
              <p className="muted">The administrator-issued link expires {new Date(request.inviteExpiresAt).toLocaleString()}.</p>
            ) : null}
            {request.state === "pending_review" ? (
              <button className="button secondary" disabled={isPending} onClick={() => cancelRequest(request.id)}>
                Cancel request
              </button>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

export function AdminAdditionalGuardianClient({ data }: { data: AdditionalGuardianAdminData }) {
  const router = useRouter();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [invitation, setInvitation] = useState<{ requestId: string; url: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pending = data.requests.filter((request) => request.state === "pending_review");
  const history = data.requests.filter((request) => request.state !== "pending_review");

  function review(requestId: string, decision: "approve" | "reject") {
    setMessage("");
    setInvitation(null);
    startTransition(async () => {
      const response = await authenticatedFetch(`/api/admin/additional-guardians/${requestId}/review`, {
        decision,
        reason: reasons[requestId] ?? ""
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        invitationPath?: string;
        expiresAt?: string;
      } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? "Review could not be saved.");
      if (result?.ok && result.invitationPath && result.expiresAt) {
        setInvitation({
          requestId,
          url: `${window.location.origin}${result.invitationPath}`,
          expiresAt: result.expiresAt
        });
      } else if (result?.ok) {
        router.refresh();
      }
    });
  }

  function revoke(requestId: string) {
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedFetch(`/api/admin/additional-guardians/${requestId}/revoke`, {
        reason: reasons[requestId] ?? ""
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? "Access could not be revoked.");
      if (result?.ok) router.refresh();
    });
  }

  async function copyInvitation() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.url);
      setMessageOk(true);
      setMessage("One-time invitation link copied. Share it only with the verified adult.");
    } catch {
      setMessageOk(false);
      setMessage("Copy was blocked by this browser. Select the link above and copy it manually.");
    }
  }

  return (
    <section className="stack additional-guardian-admin" aria-labelledby="additional-guardian-review">
      <div>
        <span className="eyebrow">Additional guardian review</span>
        <h2 id="additional-guardian-review">Verify before access changes</h2>
        <p className={data.ok ? "lead" : "notice warning"} role={data.ok ? undefined : "status"}>{data.message}</p>
      </div>
      {message ? <p className={`notice ${messageOk ? "ok" : "warning"}`} aria-live="polite">{message}</p> : null}
      {invitation ? (
        <article className="card stack one-time-link" role="status">
          <span className="eyebrow">Copy now · shown once</span>
          <h3>Approved invitation link</h3>
          <p className="break-anywhere">{invitation.url}</p>
          <p className="muted">
            Expires {new Date(invitation.expiresAt).toLocaleString()}. No email, SMS, push, or chat message was sent.
          </p>
          <button onClick={copyInvitation}>Copy one-time link</button>
          <button className="button secondary" onClick={() => router.refresh()}>I have stored the link safely</button>
        </article>
      ) : null}

      <div className="grid two">
        {!pending.length ? (
          <article className="card empty-state">
            <h3>No requests await review</h3>
            <p className="muted">New proposals appear here without changing access or sending a message.</p>
          </article>
        ) : pending.map((request) => (
          <article className="card stack" key={request.id}>
            <div className="split-heading">
              <div>
                <span className="eyebrow">{request.teamName}</span>
                <h3>{request.playerName}</h3>
              </div>
              <StatePill state={request.state} />
            </div>
            <p><strong>{request.proposedEmail}</strong> · {request.relationship}</p>
            <p className="muted">Proposed by {request.proposedByLabel}</p>
            <p className="muted">Proposed {new Date(request.requestedAt).toLocaleString()}</p>
            <ScopeExplanation />
            <label>
              Family-visible decision note
              <textarea
                maxLength={500}
                onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))}
                placeholder="Explain the decision and next step without private identity, custody, or medical details."
                rows={4}
                value={reasons[request.id] ?? ""}
              />
            </label>
            <p className="muted">The action, administrator, child/team scope, and timestamp are recorded separately in audit history.</p>
            <div className="action-row">
              <button
                disabled={isPending || (reasons[request.id]?.trim().length ?? 0) < 10}
                onClick={() => review(request.id, "approve")}
              >
                Approve and issue link
              </button>
              <button
                className="button secondary"
                disabled={isPending || (reasons[request.id]?.trim().length ?? 0) < 10}
                onClick={() => review(request.id, "reject")}
              >
                Decline request
              </button>
            </div>
            {(reasons[request.id]?.trim().length ?? 0) < 10 ? <p className="muted">Add a family-visible decision note of at least 10 characters to enable approval or decline.</p> : null}
            <p className="muted">Approval creates a seven-day link but does not send it. The exact invited email must sign in.</p>
          </article>
        ))}
      </div>

      <div className="stack">
        <h3>Reviewed requests</h3>
        {!history.length ? <p className="muted">No reviewed requests yet.</p> : history.map((request) => (
          <article className="card stack" key={request.id}>
            <div className="split-heading">
              <div><strong>{request.playerName}</strong><p className="muted">{request.teamName} · {request.proposedEmail}</p></div>
              <StatePill state={request.state} />
            </div>
            {request.reviewedByLabel ? <p className="muted">Reviewed by {request.reviewedByLabel}</p> : null}
            {request.decisionReason ? <p>{request.decisionReason}</p> : null}
            {(request.state === "invitation_ready" || request.state === "accepted") ? (
              <>
                <label>
                  Family-visible correction note
                  <textarea
                    maxLength={500}
                    onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))}
                    placeholder="Explain the correction without private identity, custody, or medical details."
                    rows={3}
                    value={reasons[request.id] ?? ""}
                  />
                </label>
                <button
                  className="button secondary"
                  disabled={isPending || (reasons[request.id]?.trim().length ?? 0) < 10}
                  onClick={() => revoke(request.id)}
                >
                  Revoke this child’s access
                </button>
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
