"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  CaregiverPortalData,
  ParentTemporaryCaregiverData,
  TemporaryCaregiverInvitationPreview
} from "@/lib/supabase/temporary-caregivers";

async function authenticatedFetch(path: string, body: unknown) {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return new Response(JSON.stringify({ ok: false, message: "Sign in again before changing temporary care." }), {
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

export function ParentTemporaryCaregiverClient({
  data,
  embedded = false,
  selectedPlayerId
}: {
  data: ParentTemporaryCaregiverData;
  embedded?: boolean;
  selectedPlayerId?: string;
}) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState(data.children[0]?.playerId ?? "");
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowPickup, setAllowPickup] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [invitation, setInvitation] = useState<{ path: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const effectivePlayerId = selectedPlayerId && data.children.some((child) => child.playerId === selectedPlayerId)
    ? selectedPlayerId
    : playerId;
  const selectedChild = useMemo(
    () => data.children.find((child) => child.playerId === effectivePlayerId),
    [data.children, effectivePlayerId]
  );

  function createAuthorization() {
    setMessage("");
    setInvitation(null);
    startTransition(async () => {
      const response = await authenticatedFetch("/api/parent/caregiver-authorizations", {
        playerId: effectivePlayerId,
        caregiverEmail,
        eventIds,
        allowPickup,
        startsAt,
        expiresAt
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        invitationPath?: string;
        inviteExpiresAt?: string;
      } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? "Temporary caregiver scope could not be saved.");
      if (result?.ok && result.invitationPath && result.inviteExpiresAt) {
        setInvitation({ path: `${window.location.origin}${result.invitationPath}`, expiresAt: result.inviteExpiresAt });
        setCaregiverEmail("");
        setEventIds([]);
        setStartsAt("");
        setExpiresAt("");
        setAllowPickup(false);
        setReviewed(false);
      }
    });
  }

  function revokeAuthorization(authorizationId: string) {
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedFetch(`/api/parent/caregiver-authorizations/${authorizationId}/revoke`, {
        reason: reasons[authorizationId] ?? ""
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessageOk(Boolean(result?.ok));
      setMessage(result?.message ?? "Temporary caregiver access could not be revoked.");
      if (result?.ok) router.refresh();
    });
  }

  async function copyInvitation() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.path);
      setMessageOk(true);
      setMessage("One-time caregiver link copied. Share it only with the named adult.");
    } catch {
      setMessageOk(false);
      setMessage("Copy was blocked. Select and copy the link manually.");
    }
  }

  return (
    <section className={`${embedded ? "family-access-embedded" : "page"} temporary-caregiver-parent`} aria-labelledby={embedded ? undefined : "temporary-caregiver-title"}>
      {!embedded ? <header className="temporary-caregiver-hero">
        <div>
          <span className="eyebrow">Temporary caregiver access</span>
          <h2 id="temporary-caregiver-title">Choose exactly what one adult may see and do.</h2>
          <p>
            Temporary care is separate from guardian access. It covers one child, selected events, a maximum
            14-day window, and only the actions you review.
          </p>
        </div>
        <span className="status-pill warning">Caregiver acceptance required</span>
      </header> : null}

      {!data.ok ? <p className="notice warning" role="status">{data.message}</p> : null}
      {message ? <p className={`notice ${messageOk ? "ok" : "warning"}`} aria-live="polite">{message}</p> : null}
      {invitation ? (
        <article className="card stack caregiver-one-time-link" role="status">
          <span className="eyebrow">Copy now · shown once</span>
          <h2>Caregiver review link</h2>
          <p className="break-anywhere">{invitation.path}</p>
          <p>
            Expires {formatDateTime(invitation.expiresAt)}. Access is still inactive. No email, SMS, push, or
            chat message was sent.
          </p>
          <button onClick={copyInvitation} type="button">Copy one-time link</button>
          <button className="button secondary" onClick={() => router.refresh()} type="button">I stored the link safely</button>
        </article>
      ) : null}

      <section className="temporary-caregiver-builder">
        <article className="card stack">
          <span className="eyebrow">1 · Person and child</span>
          <h2>Who needs temporary access?</h2>
          {!embedded ? <label>
            Child and team
            <select
              disabled={!data.ok || !data.children.length}
              onChange={(event) => {
                setPlayerId(event.target.value);
                setEventIds([]);
                setReviewed(false);
              }}
              value={playerId}
            >
              {!data.children.length ? <option value="">No linked children available</option> : null}
              {data.children.map((child) => (
                <option key={child.playerId} value={child.playerId}>{child.childLabel} · {child.teamName}</option>
              ))}
            </select>
          </label> : (
            <p className="family-access-selected-child">
              <strong>{selectedChild?.childLabel ?? "No child selected"}</strong>
              <span>{selectedChild?.teamName ?? "Linked team unavailable"}</span>
            </p>
          )}
          <label>
            Caregiver email
            <input
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              onChange={(event) => setCaregiverEmail(event.target.value)}
              placeholder="name@domain.com"
              type="email"
              value={caregiverEmail}
            />
          </label>
          <p className="muted">
            The adult must sign in with this exact email. No guardian membership or team-wide access is created.
          </p>
        </article>

        <article className="card stack">
          <span className="eyebrow">2 · Events and time</span>
          <h2>When does access apply?</h2>
          <fieldset className="caregiver-event-checks">
            <legend>Selected events</legend>
            {!selectedChild?.events.length ? <p className="muted">No upcoming events are available for this child.</p> : null}
            {selectedChild?.events.map((event) => (
              <label className="check-row" key={event.eventId}>
                <input
                  checked={eventIds.includes(event.eventId)}
                  onChange={(input) => setEventIds((current) => input.target.checked
                    ? [...current, event.eventId]
                    : current.filter((id) => id !== event.eventId))}
                  type="checkbox"
                />
                <span><strong>{event.title}</strong><br /><small>{formatDateTime(event.startsAt)}</small></span>
              </label>
            ))}
          </fieldset>
          <div className="grid two">
            <label>Access starts<input onChange={(event) => setStartsAt(event.target.value)} type="datetime-local" value={startsAt} /></label>
            <label>Access expires<input onChange={(event) => setExpiresAt(event.target.value)} type="datetime-local" value={expiresAt} /></label>
          </div>
          <p className="muted">Both fields begin blank. The window must include every selected event and cannot exceed 14 days.</p>
        </article>

        <article className="card stack">
          <span className="eyebrow">3 · Allowed actions</span>
          <h2>Minimum necessary access</h2>
          <label className="check-row is-required">
            <input checked disabled readOnly type="checkbox" />
            View current Event Passports for selected events only
          </label>
          <label className="check-row">
            <input checked={allowPickup} onChange={(event) => setAllowPickup(event.target.checked)} type="checkbox" />
            Allow pickup for selected events during this window
          </label>
          <p className="notice">
            Pickup permission fails closed when a restriction is recorded. The system does not reveal the
            restriction. Contact league staff who handle family access for review.
          </p>
        </article>

        <article className="card stack caregiver-prohibited">
          <span className="eyebrow">Always prohibited</span>
          <h2>Temporary care never includes</h2>
          <ProhibitedActions />
          <p className="muted">
            No medical notes, custody details, home address, general team conversation, or other child records
            are included.
          </p>
        </article>
      </section>

      <section className="caregiver-scope-review" aria-labelledby="caregiver-scope-review-title">
        <div>
          <span className="eyebrow">4 · Review and create access</span>
          <h2 id="caregiver-scope-review-title">Confirm the exact temporary scope</h2>
        </div>
        <dl>
          <div><dt>Adult</dt><dd>{caregiverEmail || "Not entered"}</dd></div>
          <div><dt>Child/team</dt><dd>{selectedChild ? `${selectedChild.childLabel} · ${selectedChild.teamName}` : "Not selected"}</dd></div>
          <div><dt>Events</dt><dd>{eventIds.length ? `${eventIds.length} selected` : "None selected"}</dd></div>
          <div><dt>Window</dt><dd>{startsAt && expiresAt ? `${formatDateTime(startsAt)} to ${formatDateTime(expiresAt)}` : "Not set"}</dd></div>
          <div><dt>Pickup</dt><dd>{allowPickup ? "Requested · restriction check required" : "Not allowed"}</dd></div>
          <div><dt>Activation</dt><dd>Only after exact-email caregiver acceptance</dd></div>
        </dl>
        <label className="check-row">
          <input checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} type="checkbox" />
          I reviewed the child, selected events, time window, allowed actions, and prohibited actions. I understand this does not send a message.
        </label>
        <button
          data-analytics-event="caregiver_scope_reviewed"
          disabled={!data.ok || !effectivePlayerId || !caregiverEmail.trim() || !eventIds.length || !startsAt || !expiresAt || !reviewed || isPending}
          onClick={createAuthorization}
          type="button"
        >
          Create temporary caregiver access
        </button>
        <p className="muted">
          After saving, copy the one-time review link and share it yourself. No email, SMS, push, or
          team message is sent automatically.
        </p>
      </section>

      <section className="stack" aria-labelledby="caregiver-history-title">
        <div>
          <span className="eyebrow">Temporary-care history</span>
          <h2 id="caregiver-history-title">Current and past temporary care</h2>
        </div>
        {!data.authorizations.length ? (
          <article className="card empty-state">
            <h3>No temporary caregiver access</h3>
            <p>Reviewed scope, acceptance, expiry, and revocation will appear here.</p>
          </article>
        ) : data.authorizations.map((authorization) => (
          <article className="card caregiver-history-card" key={authorization.id}>
            <header>
              <div>
                <span className="eyebrow">{authorization.teamName}</span>
                <h3>{authorization.childLabel} · {authorization.caregiverEmail}</h3>
              </div>
              <span className={`status-pill ${authorization.state === "active" ? "ok" : "warning"}`}>{authorization.stateLabel}</span>
            </header>
            <p>{formatDateTime(authorization.startsAt)} to {formatDateTime(authorization.expiresAt)}</p>
            <p>{authorization.events.length} selected event(s) · Temporary-care rules reviewed</p>
            <p className="muted">Set up by {authorization.authorizedByLabel}{authorization.caregiverLabel ? ` · Accepted by ${authorization.caregiverLabel}` : ""}</p>
            {authorization.state !== "revoked" && authorization.state !== "expired" ? (
              <div className="caregiver-revoke">
                <label>
                  Reason for revocation
                  <textarea
                    maxLength={500}
                    onChange={(event) => setReasons((current) => ({ ...current, [authorization.id]: event.target.value }))}
                    placeholder="Explain the correction without custody, medical, or address details."
                    rows={3}
                    value={reasons[authorization.id] ?? ""}
                  />
                </label>
                <button
                  className="button secondary"
                  data-analytics-event="caregiver_authorization_revoked"
                  disabled={(reasons[authorization.id]?.trim().length ?? 0) < 10 || isPending}
                  onClick={() => revokeAuthorization(authorization.id)}
                  type="button"
                >
                  Revoke temporary access
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </section>
  );
}

export function TemporaryCaregiverAcceptanceClient() {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<TemporaryCaregiverInvitationPreview | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("Open the caregiver link or paste its one-time code.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const stored = window.sessionStorage.getItem("leaguepilot-pending-caregiver-invite") ?? "";
    const nextToken = fragment.get("token") ?? stored;
    if (nextToken) {
      window.setTimeout(() => setToken(nextToken), 0);
      window.sessionStorage.setItem("leaguepilot-pending-caregiver-invite", nextToken);
      window.history.replaceState(null, "", "/caregiver/accept");
    }
    void createSupabaseBrowserClient().auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  function checkScope() {
    setPreview(null);
    setConfirmed(false);
    startTransition(async () => {
      const response = await fetch("/api/caregiver/authorizations/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });
      const result = await response.json().catch(() => null) as TemporaryCaregiverInvitationPreview | null;
      setMessage(result?.message ?? "Caregiver invitation is unavailable.");
      setPreview(result?.ok ? result : null);
      if (result?.ok) window.sessionStorage.setItem("leaguepilot-pending-caregiver-invite", token);
    });
  }

  function acceptScope() {
    startTransition(async () => {
      const response = await authenticatedFetch("/api/caregiver/authorizations/accept", { token });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? "Temporary caregiver scope could not be accepted.");
      if (result?.ok) {
        setCompleted(true);
        window.sessionStorage.removeItem("leaguepilot-pending-caregiver-invite");
      }
    });
  }

  return (
    <main className="page caregiver-acceptance-page">
      <header className="temporary-caregiver-hero">
        <div>
          <span className="eyebrow">Temporary caregiver invitation</span>
          <h1>Review every permission before accepting.</h1>
          <p>The link proves the guardian-reviewed scope. Your exact-email sign-in proves who accepts it.</p>
        </div>
        <span className="status-pill warning">Time-bound access</span>
      </header>
      <p className={`notice ${completed ? "ok" : ""}`} aria-live="polite">{message}</p>
      <section className="grid two">
        <article className="card stack">
          <h2>Check invitation</h2>
          <label>
            One-time caregiver code
            <input autoComplete="one-time-code" onChange={(event) => setToken(event.target.value)} value={token} />
          </label>
          <button disabled={isPending || token.trim().length < 24} onClick={checkScope} type="button">
            {isPending ? "Checking…" : "Check temporary scope"}
          </button>
          <p className="muted">The code is short-lived, single-use, removed from the URL, and excluded from analytics.</p>
        </article>
        <article className="card stack">
          <h2>{preview ? "Guardian-reviewed access" : "What you will review"}</h2>
          {preview ? (
            <>
              <dl className="caregiver-preview-facts">
                <div><dt>Child/team</dt><dd>{preview.childLabel} · {preview.teamName}</dd></div>
                <div><dt>Invited email</dt><dd>{preview.caregiverEmailMasked}</dd></div>
                <div><dt>Guardian</dt><dd>{preview.authorizedByLabel}</dd></div>
                <div><dt>Window</dt><dd>{formatDateTime(preview.startsAt!)} to {formatDateTime(preview.expiresAt!)}</dd></div>
              </dl>
              <ScopeLists allowed={preview.allowedActions ?? []} prohibited={preview.prohibitedActions ?? []} />
              <div className="caregiver-preview-events">
                {(preview.events ?? []).map((event) => (
                  <p key={event.eventId}><strong>{event.title}</strong><br /><span>{formatDateTime(event.startsAt)} · {event.venueLabel}</span></p>
                ))}
              </div>
              <label className="check-row">
                <input checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
                I reviewed the child, events, time window, allowed actions, and prohibited actions.
              </label>
              {signedIn ? (
                <button
                  data-analytics-event="caregiver_authorization_activated"
                  disabled={!confirmed || isPending || completed || preview.state !== "awaiting_caregiver_acceptance"}
                  onClick={acceptScope}
                  type="button"
                >
                  {completed ? "Temporary scope accepted" : "Accept temporary scope"}
                </button>
              ) : (
                <a className="button" href="/auth?returnTo=/caregiver/accept">Sign in with invited email</a>
              )}
              {completed ? <a className="button secondary" href="/caregiver">Open caregiver view</a> : null}
            </>
          ) : (
            <p className="muted">Masked identity, child/team, selected events, window, allowed actions, prohibited actions, and current state appear after verification.</p>
          )}
        </article>
      </section>
    </main>
  );
}

export function CaregiverPortalClient({ data }: { data: CaregiverPortalData }) {
  useEffect(() => {
    if (!data.clearPrivateCache) return;
    window.sessionStorage.removeItem("leaguepilot-pending-caregiver-invite");
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("leaguepilot-caregiver-")) window.localStorage.removeItem(key);
    }
    if ("caches" in window) {
      void window.caches.keys().then((names) => Promise.all(
        names.filter((name) => name.startsWith("leaguepilot-caregiver-")).map((name) => window.caches.delete(name))
      ));
    }
  }, [data.accessVersion, data.clearPrivateCache]);

  return (
    <main className="page caregiver-portal" data-access-version={data.accessVersion}>
      <header className="caregiver-portal-header">
        <div>
          <span className="eyebrow">Temporary caregiver view</span>
          <h1>{data.ok ? "Only what this care window requires." : "No current temporary access."}</h1>
          <p>{data.message}</p>
        </div>
        <span className={`status-pill ${data.ok ? "ok" : "warning"}`}>{data.ok ? "Scoped access" : "Access inactive"}</span>
      </header>
      {!data.ok ? (
        <section className="card empty-state" role="status">
          <h2>Private caregiver data is unavailable</h2>
          <p>Revoked, expired, missing, or unavailable access reveals no child or event details. Any caregiver-specific web cache is cleared at this contact.</p>
          <a className="button secondary" href="/caregiver/accept">Check another invitation</a>
        </section>
      ) : data.authorizations.map((authorization) => (
        <article className="caregiver-passport" key={authorization.id}>
          <header>
            <div>
              <span className="eyebrow">{authorization.teamName} · temporary care</span>
              <h2>{authorization.childLabel}</h2>
              <p>{formatDateTime(authorization.startsAt)} to {formatDateTime(authorization.expiresAt)}</p>
            </div>
            <span className="status-pill ok">{authorization.stateLabel}</span>
          </header>
          <ScopeLists allowed={authorization.allowedActions} prohibited={authorization.prohibitedActions} />
          <section className="caregiver-event-list" aria-label="Selected events">
            {authorization.events.map((event) => (
              <article key={event.eventId}>
                <div>
                  <span className="eyebrow">Official event · current v{event.currentScheduleVersion}</span>
                  <h3>{event.title}</h3>
                  <p>{formatDateTime(event.startsAt)} · {event.venueLabel}</p>
                  <p>{event.addressLabel}</p>
                </div>
                <div>
                  <span className={`status-pill ${event.status === "scheduled" ? "ok" : "warning"}`}>{event.status}</span>
                  {event.currentScheduleVersion !== event.authorizedScheduleVersion ? (
                    <p className="notice warning">Official event details changed since this access was reviewed. Check the current version before acting.</p>
                  ) : null}
                  {event.addressLabel !== "Not published" ? (
                    <a
                      className="button secondary"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueLabel} ${event.addressLabel}`)}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Directions
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
          <footer>
            <span>Set up by {authorization.authorizedByLabel}</span>
            <span>Temporary-care rules apply</span>
            <span>No caregiver event data is stored in the offline app shell.</span>
          </footer>
        </article>
      ))}
    </main>
  );
}

function ScopeLists({ allowed, prohibited }: { allowed: string[]; prohibited: string[] }) {
  return (
    <div className="caregiver-scope-lists">
      <section>
        <h3>Allowed</h3>
        <ul className="plain-list">{allowed.map((action) => <li key={action}>{actionLabel(action)}</li>)}</ul>
      </section>
      <section>
        <h3>Prohibited</h3>
        <ul className="plain-list">{prohibited.map((action) => <li key={action}>{actionLabel(action)}</li>)}</ul>
      </section>
    </div>
  );
}

function ProhibitedActions() {
  return (
    <ul className="plain-list">
      <li>Medical or health information and medical decisions</li>
      <li>Custody authority or guardian membership</li>
      <li>RSVP or attendance changes</li>
      <li>Official schedule changes or team communication publishing</li>
      <li>Roster, other-child, or team-wide access</li>
      <li>Passing this access to another person</li>
    </ul>
  );
}

function actionLabel(action: string) {
  return {
    view_selected_event_passports: "View current Event Passports for selected events",
    pickup_selected_events: "Pickup permission for selected events",
    medical_or_health_access: "Medical or health access",
    custody_authority: "Custody authority",
    attendance_or_rsvp_changes: "Attendance or RSVP changes",
    official_schedule_changes: "Official schedule changes",
    team_communication_publishing: "Publish team communication",
    roster_or_other_child_access: "Roster or other child access",
    onward_delegation: "Pass access to another person"
  }[action] ?? action.replaceAll("_", " ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
