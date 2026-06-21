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
  getTeamChatView,
  roleLabel,
  sampleRosterCsv,
  setRsvp,
  type ChatAnnouncementTopic,
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

function formatArrivalTime(value: string) {
  return new Date(Date.parse(value) - 20 * 60 * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatTopic(value?: string) {
  if (!value) return "reminder";
  return value.replaceAll("_", " ");
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

export function TeamChatClient() {
  const { state, dispatch } = useAppState();
  const [viewerId, setViewerId] = useState("user-parent-jordan");
  const [teamId, setTeamId] = useState("team-tigers");
  const [draftMessage, setDraftMessage] = useState("");
  const [linkDraftToGameDay, setLinkDraftToGameDay] = useState(true);
  const [postNotice, setPostNotice] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementTopic, setAnnouncementTopic] = useState<ChatAnnouncementTopic>("reminder");
  const [announcementPinned, setAnnouncementPinned] = useState(true);
  const [announcementNotice, setAnnouncementNotice] = useState("");
  const [moderationNotice, setModerationNotice] = useState("");
  const viewer = state.users.find((user) => user.id === viewerId);
  const selectedTeam = state.teams.find((team) => team.id === teamId);

  let view: ReturnType<typeof getTeamChatView> | null = null;
  let deniedReason = "";
  try {
    view = getTeamChatView(state, viewerId, teamId, NOW);
  } catch (error) {
    deniedReason = error instanceof Error ? error.message : "Team Chat is unavailable.";
  }
  const moderationEvents = view
    ? state.chatModerationAuditEvents.filter((event) => event.teamId === view.team.id)
    : [];

  return (
    <div className="page clubhouse-chat-page">
      <section className="hero clubhouse-chat-hero">
        <span className="eyebrow">Safe family communication</span>
        <h1>Team Chat for game-day questions and coach notes.</h1>
        <p className="lead">
          A private team space for assigned parents, assigned coaches, and org admins. Children do not have chat accounts or direct messages.
        </p>
      </section>

      <section className="clubhouse-toolbar card">
        <label>
          Preview as
          <select value={viewerId} onChange={(event) => setViewerId(event.target.value)}>
            {state.users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} · {roleLabel(user.role)}</option>
            ))}
          </select>
        </label>
        <label>
          Team Chat
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            {state.teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name} · {team.division}</option>
            ))}
          </select>
        </label>
        <div className="clubhouse-toolbar-note">
          <strong>{viewer?.name ?? "Unknown viewer"}</strong>
          <span>{selectedTeam?.name ?? "Unknown team"} access is evaluated from team memberships.</span>
        </div>
      </section>

      {!view ? (
        <section className="card stack">
          <span className="badge danger">Private Team Chat</span>
          <h2>Access limited to assigned families and staff.</h2>
          <p>{deniedReason}</p>
          <p className="muted">Parents can only view chats for teams connected to their rostered child. Coaches can only view assigned teams. Org admins can view all team chats.</p>
        </section>
      ) : (
        <section className="clubhouse-chat-shell">
          <aside className="card clubhouse-team-card">
            <div className="clubhouse-team-mark" aria-hidden="true">{view.team.name.slice(0, 1)}</div>
            <span className="badge ok">Team Chat</span>
            <h2>{view.team.name}</h2>
            <p className="muted">{view.team.division} · {roleLabel(view.viewer.role)} view</p>
            <div className="clubhouse-unread">
              <strong>{view.unreadCount}</strong>
              <span>unread for this preview user</span>
            </div>
            <p className="notice">{view.safetyNote}</p>
            <div className="clubhouse-moderation-log">
              <h3>Moderation Log</h3>
              {moderationEvents.length ? moderationEvents.slice(0, 3).map((event) => (
                <p key={event.id}>
                  <strong>{event.action.replaceAll("_", " ")}</strong>
                  <span>{event.reason}</span>
                </p>
              )) : <p className="muted">No moderation actions recorded for this team.</p>}
            </div>
          </aside>

          <section className="card clubhouse-chat-panel">
            <div className="card-header">
              <div>
                <span className="eyebrow">Private to assigned team members</span>
                <h2>Team Chat</h2>
              </div>
              <span className="badge">{view.access.reason}</span>
            </div>

            {view.pinnedMessage ? (
              <article className="clubhouse-pinned">
                <span className="badge warning">Pinned Reminder</span>
                <h3>Coach Note</h3>
                <p>{view.pinnedMessage.body}</p>
                <small>{formatDate(view.pinnedMessage.createdAt)} · {formatTopic(view.pinnedMessage.topic)}</small>
              </article>
            ) : null}

            {view.upcomingGame ? (
              <article className="clubhouse-game-day">
                <div>
                  <span className="badge ok">Game-Day Questions</span>
                  <h3>{view.upcomingGame.title}</h3>
                  <p className="muted">
                    {formatDate(view.upcomingGame.startsAt)} · Arrive by {formatArrivalTime(view.upcomingGame.startsAt)}
                  </p>
                </div>
                <ul className="list compact">
                  <li>Field: {view.upcomingGame.locationName}</li>
                  <li>Opponent: {view.upcomingGame.opponent ?? "To be announced"}</li>
                  <li><a href={`https://maps.google.com/?q=${encodeURIComponent(view.upcomingGame.locationAddress)}`}>Open map link</a></li>
                  <li>Questions in thread: {view.gameDayMessages.length}</li>
                </ul>
              </article>
            ) : null}

            <form
              className="clubhouse-coach-note"
              onSubmit={(event) => {
                event.preventDefault();
                if (!view?.access.canAnnounce) {
                  setAnnouncementNotice("Only assigned coaches and org admins can send Coach Notes.");
                  return;
                }
                if (!announcementBody.trim()) {
                  setAnnouncementNotice("Write a Coach Note before sending.");
                  return;
                }
                dispatch({
                  type: "sendCoachAnnouncement",
                  input: {
                    teamId: view.team.id,
                    authorUserId: view.viewer.id,
                    body: announcementBody,
                    topic: announcementTopic,
                    pinned: announcementPinned,
                    now: new Date().toISOString()
                  }
                });
                setAnnouncementBody("");
                setAnnouncementNotice(announcementPinned ? "Coach Note posted and pinned." : "Coach Note posted.");
              }}
            >
              <div className="card-header">
                <div>
                  <span className="eyebrow">Coach Announcements</span>
                  <h3>Coach Note</h3>
                </div>
                <span className="badge warning">{view.access.canAnnounce ? "Coach/Admin" : "Read only"}</span>
              </div>
              <div className="grid two">
                <label>
                  Topic
                  <select
                    value={announcementTopic}
                    onChange={(event) => setAnnouncementTopic(event.target.value as ChatAnnouncementTopic)}
                    disabled={!view.access.canAnnounce}
                  >
                    <option value="game_time">Game time</option>
                    <option value="field_location">Field location</option>
                    <option value="uniforms">Uniforms</option>
                    <option value="snacks">Snacks</option>
                    <option value="weather">Weather</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </label>
                <label className="clubhouse-checkbox">
                  <input
                    type="checkbox"
                    checked={announcementPinned}
                    onChange={(event) => setAnnouncementPinned(event.target.checked)}
                    disabled={!view.access.canAnnounce}
                  />
                  Pin as Pinned Reminder
                </label>
              </div>
              <label>
                Message
                <textarea
                  value={announcementBody}
                  onChange={(event) => setAnnouncementBody(event.target.value)}
                  placeholder="Share game time, field location, uniforms, snacks, weather, or reminders."
                  disabled={!view.access.canAnnounce}
                />
              </label>
              <div className="toolbar">
                <button disabled={!view.access.canAnnounce || !announcementBody.trim()}>Send Coach Note</button>
                <span className="muted">Announcements appear visually distinct from normal Team Chat messages.</span>
              </div>
              {announcementNotice ? <p className="notice">{announcementNotice}</p> : null}
            </form>

            <div className="clubhouse-message-list" aria-label="Team Chat messages">
              {view.messages.length ? view.messages.map((message) => (
                <article className={`clubhouse-message ${message.kind}`} key={message.id}>
                  <div className="clubhouse-message-meta">
                    <strong>{roleLabel(message.authorRole)}</strong>
                    <span>{message.kind === "announcement" ? "Coach Note" : "Team Chat"}</span>
                    {message.eventId ? <span>Game linked</span> : null}
                  </div>
                  <p>{message.body}</p>
                  <small>{formatDate(message.createdAt)}</small>
                  {view.access.canModerate ? (
                    <div className="clubhouse-message-actions">
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => {
                          dispatch({
                            type: "moderateTeamChatMessage",
                            input: {
                              messageId: message.id,
                              actorUserId: view.viewer.id,
                              action: "message_hidden",
                              reason: "Coach or admin moderated this Team Chat message.",
                              now: new Date().toISOString()
                            }
                          });
                          setModerationNotice("Message hidden and moderation audit recorded.");
                        }}
                      >
                        Hide
                      </button>
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => {
                          dispatch({
                            type: "moderateTeamChatMessage",
                            input: {
                              messageId: message.id,
                              actorUserId: view.viewer.id,
                              action: "message_deleted",
                              reason: "Coach or admin deleted this Team Chat message.",
                              now: new Date().toISOString()
                            }
                          });
                          setModerationNotice("Message deleted and moderation audit recorded.");
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              )) : (
                <article className="clubhouse-empty">
                  <h3>Team Chat is ready.</h3>
                  <p>Use this space for schedule questions, field details, uniforms, snacks, weather updates, and coach reminders.</p>
                </article>
              )}
            </div>
            {moderationNotice ? <p className="notice">{moderationNotice}</p> : null}

            <form
              className="clubhouse-compose"
              onSubmit={(event) => {
                event.preventDefault();
                if (!view?.access.canPost) {
                  setPostNotice("Only assigned parents, assigned coaches, and org admins can post in this Team Chat.");
                  return;
                }
                const input = {
                  teamId: view.team.id,
                  authorUserId: view.viewer.id,
                  body: draftMessage,
                  eventId: linkDraftToGameDay ? view.upcomingGame?.id : undefined,
                  now: new Date().toISOString()
                };
                if (!draftMessage.trim()) {
                  setPostNotice("Write a message before sending.");
                  return;
                }
                dispatch({ type: "postTeamChatMessage", input });
                setDraftMessage("");
                setPostNotice("Team Chat message posted.");
              }}
            >
              <label>
                Team Chat message
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Ask about field location, jerseys, snacks, arrival time, or reminders."
                  disabled={!view.access.canPost}
                />
              </label>
              {view.upcomingGame ? (
                <label className="clubhouse-checkbox">
                  <input
                    type="checkbox"
                    checked={linkDraftToGameDay}
                    onChange={(event) => setLinkDraftToGameDay(event.target.checked)}
                    disabled={!view.access.canPost}
                  />
                  File under Game-Day Questions for {view.upcomingGame.locationName}
                </label>
              ) : null}
              <div className="toolbar">
                <button disabled={!view.access.canPost || !draftMessage.trim()}>Send Team Chat Message</button>
                <span className="muted">{view.access.canPost ? "Visible to this team only." : "Posting is blocked for this viewer."}</span>
              </div>
              {postNotice ? <p className="notice">{postNotice}</p> : null}
            </form>
          </section>
        </section>
      )}
    </div>
  );
}
