"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/app/providers";
import {
  NOW,
  analyzeRosterCsv,
  applyScheduleChange,
  computeAdminHealth,
  evaluateInviteRecovery,
  getCoachRsvpSummaries,
  getParentDashboard,
  sampleRosterCsv,
  setRsvp,
  type EventStatus,
  type RsvpResponse
} from "@/lib/domain";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function statusClass(status: string) {
  if (status === "valid" || status === "ok" || status === "eligible" || status === "accepted") return "ok";
  if (status === "error" || status === "danger" || status === "expired" || status === "failed") return "danger";
  return "warning";
}

export function ImportsClient() {
  const { state, dispatch } = useAppState();
  const [csv, setCsv] = useState(sampleRosterCsv);
  const analysis = useMemo(() => analyzeRosterCsv(csv, state, NOW), [csv, state]);
  const canCommit = analysis.totalRows > 0 && analysis.errorRows === 0;
  const latestImport = state.rosterImportReports[0];

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">CSV duplicate detection</span>
        <h1>Preview roster imports before families receive bad invites.</h1>
        <p className="lead">The parser normalizes rows, flags blocking errors, keeps warnings reviewable, and simulates an audited commit without persisting production data.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <h2>Roster CSV</h2>
            <span className="badge warning">Admin review</span>
          </div>
          <textarea value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="Roster CSV" />
          <button
            disabled={!canCommit}
            onClick={() => dispatch({ type: "commitRosterImport", csv, now: new Date().toISOString() })}
          >
            Commit import simulation
          </button>
          {!canCommit ? <p className="muted">Resolve blocking errors before commit simulation is available.</p> : null}
          {latestImport ? <p className="notice">Last commit: {latestImport.validRows} valid, {latestImport.warningRows} warning, {latestImport.errorRows} error rows.</p> : null}
        </article>

        <article className="grid three">
          <div className="card metric">
            <span className="muted">Rows</span>
            <strong>{analysis.totalRows}</strong>
          </div>
          <div className="card metric">
            <span className="muted">Warnings</span>
            <strong>{analysis.warningRows}</strong>
          </div>
          <div className="card metric">
            <span className="muted">Errors</span>
            <strong>{analysis.errorRows}</strong>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Preview rows</h2>
          <span className="badge">No records saved</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Player</th>
                <th>Team</th>
                <th>Parent contact</th>
                <th>Status</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>{row.rowNumber}</td>
                  <td>{row.normalized.firstName} {row.normalized.lastInitial}.</td>
                  <td>{row.normalized.teamName || "Missing"}</td>
                  <td>{row.normalized.parentEmail || row.normalized.parentPhone || "Missing"}</td>
                  <td><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
                  <td>{row.issues.length ? row.issues.map((issue) => issue.code).join(", ") : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function InviteRecoveryClient() {
  const { state, dispatch } = useAppState();
  const [identifier, setIdentifier] = useState("sam@example.com");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const result = submitted ? evaluateInviteRecovery(state, submitted, NOW) : null;

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Smart invite recovery</span>
        <h1>Recover parent invites without exposing raw tokens.</h1>
        <p className="lead">Parents can enter an email or phone. The system checks whether the invite exists, is expired, was already accepted, and is within resend limits.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Resend invite</h2>
          <label>
            Parent email or phone
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </label>
          <button
            onClick={() => {
              setSubmitted(identifier);
              const evaluation = evaluateInviteRecovery(state, identifier, NOW);
              if (evaluation.canResend) {
                dispatch({ type: "recoverInvite", identifier, now: new Date().toISOString() });
              }
            }}
          >
            Request recovery
          </button>
          <p className="muted">Try sam@example.com, pat@example.com, jordan@example.com, limit@example.com, or 555-0000.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <h2>Recovery result</h2>
            {result ? <span className={`badge ${statusClass(result.code)}`}>{result.code}</span> : null}
          </div>
          {result ? (
            <>
              <h3>{result.title}</h3>
              <p>{result.message}</p>
              {result.invite ? (
                <ul className="list">
                  <li>Status: {result.invite.status}</li>
                  <li>Sent count: {result.invite.sentCount}</li>
                  <li>Expires: {formatDate(result.invite.expiresAt)}</li>
                  <li>Token storage: hashed only</li>
                </ul>
              ) : null}
            </>
          ) : (
            <p className="muted">Submit an email or phone to run recovery checks.</p>
          )}
        </article>
      </section>
    </div>
  );
}

export function AdminInvitesClient() {
  const { state } = useAppState();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin invite status</span>
        <h1>Review parent invite delivery and recovery state.</h1>
        <p className="lead">This view shows status, resend counts, failure state, and hashed-token policy without displaying raw invite tokens.</p>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parent</th>
                <th>Player</th>
                <th>Team</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Sent</th>
                <th>Last sent</th>
              </tr>
            </thead>
            <tbody>
              {state.parentInvites.map((invite) => {
                const player = state.players.find((item) => item.id === invite.playerId);
                const team = state.teams.find((item) => item.id === invite.teamId);
                return (
                  <tr key={invite.id}>
                    <td>{invite.email}<br /><span className="muted">{invite.phone}</span></td>
                    <td>{player ? `${player.firstName} ${player.lastInitial}.` : "Unknown"}</td>
                    <td>{team?.name ?? "Unknown"}</td>
                    <td><span className={`badge ${statusClass(invite.status)}`}>{invite.status}</span></td>
                    <td><span className={`badge ${statusClass(invite.deliveryStatus)}`}>{invite.deliveryStatus}</span></td>
                    <td>{invite.sentCount}</td>
                    <td>{invite.lastSentAt ? formatDate(invite.lastSentAt) : "Never"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function AdminHealthClient() {
  const { state } = useAppState();
  const cards = computeAdminHealth(state, NOW);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin health dashboard</span>
        <h1>Launch readiness issues before parents complain.</h1>
        <p className="lead">Health cards are computed from the typed local adapter and update after import, invite, RSVP, and schedule actions.</p>
      </section>

      <section className="grid three">
        {cards.map((card) => (
          <article className="card metric" key={card.id}>
            <div className="card-header">
              <h2>{card.title}</h2>
              <span className={`badge ${card.status}`}>{card.status}</span>
            </div>
            <strong>{card.count}</strong>
            <p className="muted">{card.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ParentDashboardClient() {
  const { state } = useAppState();
  const dashboard = getParentDashboard(state, "user-parent-jordan", NOW);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Parent dashboard</span>
        <h1>One place for the next thing a parent needs to know.</h1>
        <p className="lead">This dashboard is scoped to Jordan Taylor and only shows linked child, team, schedule, RSVP, media, and coach update records.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>My Child</h2>
          {dashboard.children.map(({ player, team }) => (
            <div key={player.id}>
              <strong>{player.firstName} {player.lastInitial}.</strong>
              <p className="muted">{team.name} · Jersey {player.jersey}</p>
            </div>
          ))}
          <span className="badge ok">{dashboard.completionStatus}</span>
        </article>

        <article className="card stack">
          <h2>Coach Updates</h2>
          {dashboard.latestAnnouncement ? (
            <>
              <strong>{dashboard.latestAnnouncement.title}</strong>
              <p>{dashboard.latestAnnouncement.body}</p>
              <p className="muted">{dashboard.latestAnnouncement.teamName} · {formatDate(dashboard.latestAnnouncement.createdAt)}</p>
            </>
          ) : <p className="muted">No announcements yet.</p>}
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <h2>Upcoming Schedule</h2>
          {dashboard.nextEvents.map((event) => (
            <p key={event.id}><strong>{event.title}</strong><br /><span className="muted">{formatDate(event.startsAt)} · {event.locationName}</span></p>
          ))}
        </article>
        <article className="card stack">
          <h2>RSVP Needed</h2>
          {dashboard.rsvpNeeded.length ? dashboard.rsvpNeeded.map(({ event, player }) => (
            <p key={`${event.id}-${player.id}`}>{player.firstName} {player.lastInitial}. · {event.title}</p>
          )) : <p className="muted">No RSVP needed right now.</p>}
        </article>
        <article className="card stack">
          <h2>Recent Media</h2>
          {dashboard.recentMedia.map((item) => (
            <p key={item.id}><strong>{item.title}</strong><br /><span className="muted">{item.type.replace("_", " ")}</span></p>
          ))}
        </article>
      </section>
    </div>
  );
}

export function ParentRsvpClient() {
  const { state, dispatch } = useAppState();
  const [message, setMessage] = useState("");
  const dashboard = getParentDashboard(state, "user-parent-jordan", NOW);
  const events = dashboard.nextEvents.flatMap((event) => dashboard.children
    .filter(({ player }) => player.teamId === event.teamId)
    .map(({ player }) => ({
      event,
      player,
      rsvp: state.rsvps.find((item) => item.eventId === event.id && item.playerId === player.id)
    })));

  function save(eventId: string, playerId: string, response: RsvpResponse) {
    const input = { eventId, playerId, parentUserId: "user-parent-jordan", response, now: new Date().toISOString() };
    const preview = setRsvp(state, input);
    setMessage(preview.message);
    if (preview.ok) dispatch({ type: "setRsvp", input });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">One-tap RSVP</span>
        <h1>Parents answer attendance for linked children only.</h1>
        <p className="lead">This view is scoped to Jordan Taylor. It enforces the same parent-child permission rule used by the domain tests.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}
      <section className="grid two">
        {events.map(({ event, player, rsvp }) => (
          <article className="card stack" key={`${event.id}-${player.id}`}>
            <div className="card-header">
              <h2>{event.title}</h2>
              <span className="badge">{rsvp?.response.replace("_", " ") ?? "no response"}</span>
            </div>
            <p>{player.firstName} {player.lastInitial}. · {formatDate(event.startsAt)} · {event.locationName}</p>
            <div className="toolbar">
              <button onClick={() => save(event.id, player.id, "going")}>Going</button>
              <button className="secondary" onClick={() => save(event.id, player.id, "maybe")}>Maybe</button>
              <button className="secondary" onClick={() => save(event.id, player.id, "not_going")}>Not going</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export function CoachRsvpsClient() {
  const { state } = useAppState();
  const summaries = getCoachRsvpSummaries(state, "user-coach-taylor", NOW);

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Coach attendance view</span>
        <h1>Attendance summaries for assigned teams.</h1>
        <p className="lead">Coach Taylor sees only assigned team events and aggregate RSVP counts.</p>
      </section>

      <section className="grid two">
        {summaries.map((summary) => (
          <article className="card stack" key={summary.event.id}>
            <h2>{summary.event.title}</h2>
            <p className="muted">{summary.team.name} · {formatDate(summary.event.startsAt)}</p>
            <div className="grid three">
              <div className="metric"><span className="muted">Going</span><strong>{summary.going}</strong></div>
              <div className="metric"><span className="muted">Maybe</span><strong>{summary.maybe}</strong></div>
              <div className="metric"><span className="muted">Not going</span><strong>{summary.notGoing}</strong></div>
            </div>
            <p>No response: {summary.noResponse} of {summary.totalPlayers}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ScheduleAlertsClient() {
  const { state, dispatch } = useAppState();
  const [eventId, setEventId] = useState(state.events[0]?.id ?? "");
  const event = state.events.find((item) => item.id === eventId) ?? state.events[0];
  const [startsAt, setStartsAt] = useState(event?.startsAt ?? "");
  const [locationName, setLocationName] = useState(event?.locationName ?? "");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "scheduled");
  const [message, setMessage] = useState("");

  function selectEvent(nextId: string) {
    const next = state.events.find((item) => item.id === nextId);
    setEventId(nextId);
    setStartsAt(next?.startsAt ?? "");
    setLocationName(next?.locationName ?? "");
    setStatus(next?.status ?? "scheduled");
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Schedule change alerts</span>
        <h1>Queue alert records when schedule details change.</h1>
        <p className="lead">Admin and assigned coaches can update time, location, or cancellation status. The scaffold creates notification records only; no provider send occurs.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}
      <section className="grid two">
        <article className="card stack">
          <h2>Edit event</h2>
          <label>
            Event
            <select value={eventId} onChange={(input) => selectEvent(input.target.value)}>
              {state.events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label>
            Starts at
            <input value={startsAt} onChange={(input) => setStartsAt(input.target.value)} />
          </label>
          <label>
            Location
            <input value={locationName} onChange={(input) => setLocationName(input.target.value)} />
          </label>
          <label>
            Status
            <select value={status} onChange={(input) => setStatus(input.target.value as EventStatus)}>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button
            onClick={() => {
              const input = {
                eventId,
                actorUserId: "user-admin",
                actorRole: "admin" as const,
                startsAt,
                locationName,
                status,
                now: new Date().toISOString()
              };
              const preview = applyScheduleChange(state, input);
              setMessage(preview.message);
              if (preview.ok) dispatch({ type: "applyScheduleChange", input });
            }}
          >
            Queue schedule alert records
          </button>
        </article>

        <article className="card stack">
          <h2>Queued notifications</h2>
          {state.notifications.filter((notification) => notification.eventId).slice(0, 8).map((notification) => (
            <div key={notification.id}>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
              <p className="muted">{notification.channel} · {notification.status}</p>
            </div>
          ))}
          {!state.notifications.some((notification) => notification.eventId) ? <p className="muted">No schedule notifications queued yet.</p> : null}
        </article>
      </section>
    </div>
  );
}
