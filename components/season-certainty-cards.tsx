import type { ReactNode } from "react";
import type {
  AdminSeasonCertaintyView,
  CoachSeasonCertaintyView,
  ParentSeasonCertaintyView,
  SeasonActionItem,
  SeasonCardState,
  SeasonChangeItem,
  TeamReadinessSnapshot
} from "@/lib/season-certainty";

interface SeasonCardProps {
  title?: string;
  state?: SeasonCardState;
  className?: string;
  children: ReactNode;
}

export function SeasonCard({ title, state = "ready", className = "", children }: SeasonCardProps) {
  return (
    <article className={`season-card state-${state} ${className}`.trim()} data-state={state}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </article>
  );
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="season-section-header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ state = "ready", label }: { state?: SeasonCardState; label: string }) {
  return <span className={`season-status state-${state}`}>{label}</span>;
}

export function ActionRow({ action }: { action: SeasonActionItem }) {
  return (
    <a className={`season-action-row priority-${action.priority}`} href={action.href}>
      <span>
        <strong>{action.label}</strong>
        <small>{action.description}</small>
        {action.ranking ? (
          <span className="season-priority-evidence">
            <b>{action.ranking.band} priority, score {action.ranking.score}</b>
            <small>{action.ranking.reasons.slice(0, 3).join(" | ")}</small>
          </span>
        ) : null}
      </span>
      <em>{action.cta}</em>
    </a>
  );
}

export function OperationalTruthBand({ truth }: { truth: ParentSeasonCertaintyView["operationalTruth"] }) {
  const state: SeasonCardState = truth.tone === "ready"
    ? "ready"
    : truth.tone === "blocked"
      ? "urgent"
      : truth.tone === "unknown"
        ? "offline_stale"
        : "needs_attention";
  const symbol = truth.tone === "ready" ? "✓" : truth.tone === "blocked" ? "×" : "!";

  return (
    <section className={`operational-truth-band state-${state}`} aria-label="Operational truth">
      <div className="operational-truth-summary">
        <span aria-hidden="true">{symbol}</span>
        <div>
          <strong>{truth.summary}</strong>
          <small>{truth.criticalExceptions.length
            ? `${truth.criticalExceptions.length} critical evidence lane${truth.criticalExceptions.length === 1 ? "" : "s"} need attention.`
            : "All critical evidence lanes shown here are supported and current."}</small>
        </div>
        <StatusBadge state={state} label={truth.tone === "unknown" ? "Needs verification" : truth.tone} />
      </div>
      <details>
        <summary>Evidence and exceptions</summary>
        <ul>
          {truth.evidence.map((lane) => (
            <li key={`${lane.category}-${lane.label}`}>
              <span aria-hidden="true">{lane.satisfied === true && !lane.freshness?.stale ? "✓" : lane.satisfied === false ? "×" : "!"}</span>
              <span>
                <strong>{lane.label}</strong>
                <small>{lane.category} | {lane.source}{lane.freshness ? ` | ${lane.freshness.label}` : ""}</small>
                {(lane.satisfied !== true || lane.freshness?.stale) && lane.recoveryAction ? <em>{lane.recoveryAction}</em> : null}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="season-state season-empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading current team records." }: { label?: string }) {
  return (
    <div className="season-state season-loading" role="status">
      <span aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ title = "This panel could not load.", body }: { title?: string; body: string }) {
  return (
    <div className="season-state season-error" role="alert">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function PermissionState({ title, body, href = "/auth" }: { title: string; body: string; href?: string }) {
  return (
    <SeasonCard state="permission_denied" className="season-permission-card">
      <StatusBadge state="permission_denied" label="Access required" />
      <h2>{title}</h2>
      <p>{body}</p>
      <a className="button" href={href}>Open access settings</a>
    </SeasonCard>
  );
}

export function OfflineStaleNotice({ label, copy }: { label: string; copy?: string }) {
  return (
    <p className="season-stale-notice">
      <strong>{label}</strong>
      {copy ? <span>{copy}</span> : null}
    </p>
  );
}

export function ChangeLogItem({ item }: { item: SeasonChangeItem }) {
  return (
    <li className={`season-change-item severity-${item.severity}`}>
      <strong>{item.label}</strong>
      {item.before || item.after ? (
        <span>{item.before ? `${item.before} -> ` : ""}{item.after}</span>
      ) : null}
      <small>{item.timeAgo}{item.sourceLabel ? `, ${item.sourceLabel}` : ""}</small>
    </li>
  );
}

export function NextEventCard({ view }: { view: ParentSeasonCertaintyView }) {
  if (!view.viewer.canViewPrivateData) {
    return (
      <PermissionState
        title={view.viewer.status === "signed_out" ? "Sign in to see your family home." : "Family access is not active yet."}
        body={view.viewer.message}
        href={view.viewer.status === "signed_out" ? "/auth" : "/parent/family-access"}
      />
    );
  }
  const primaryAction = view.actions[0] ?? {
    id: "view-event",
    label: "View event",
    description: "Open the full event details.",
    cta: view.nextEvent.status === "canceled" || view.nextEvent.status === "postponed" ? "View details" : "View event",
    href: "/parent/schedule",
    priority: "secondary" as const,
    permissionState: "ready" as const
  };
  const firstChange = view.changes[0];
  const state: SeasonCardState = view.nextEvent.id ? view.readiness.guardianAccessStatus === "urgent" ? "urgent" : "ready" : "empty";

  return (
    <SeasonCard state={state} className="next-event-card">
      <OperationalTruthBand truth={view.operationalTruth} />
      <div className="season-card-topline">
        <StatusBadge state={view.nextEvent.status === "changed" ? "needs_attention" : state} label={view.nextEvent.statusLabel} />
        <span className="season-mini-label">{view.nextEvent.type}</span>
      </div>
      <p className="season-page-kicker">Home - {view.team.name}</p>
      <h1 id="parent-home-title">What do I need to know before the next event?</h1>
      <div className="season-next-event-title">
        <strong>{view.nextEvent.title}</strong>
        {view.nextEvent.opponent ? <span>vs {view.nextEvent.opponent}</span> : null}
      </div>
      <dl className="season-event-facts">
        <div>
          <dt>When</dt>
          <dd>{view.nextEvent.timeLabel}</dd>
          {view.nextEvent.arrivalLabel ? <small>{view.nextEvent.arrivalLabel}</small> : null}
        </div>
        <div>
          <dt>Where</dt>
          <dd>{view.nextEvent.venue}</dd>
          {view.nextEvent.address ? <small>{view.nextEvent.address}</small> : <small>Address pending</small>}
          {view.nextEvent.directionsUrl ? <a href={view.nextEvent.directionsUrl} target="_blank" rel="noreferrer">Directions</a> : null}
        </div>
      </dl>
      <div className="season-rsvp-list" aria-label="Child RSVP status">
        {view.rsvp.rows.map((row) => (
          <p key={row.playerId}>
            <span>{row.playerName}</span>
            <StatusBadge state={row.status === "no_reply" ? "needs_attention" : "ready"} label={row.label} />
          </p>
        ))}
      </div>
      <div className="season-next-change">
        <strong>{firstChange ? "Most important change" : "No recent changes"}</strong>
        <span>{firstChange ? `${firstChange.label}, ${firstChange.timeAgo}` : "No recent schedule or coach update changes are visible."}</span>
      </div>
      <a className="button season-primary-action" href={primaryAction.href}>{primaryAction.cta}</a>
      <OfflineStaleNotice label={view.freshness.label} copy={view.freshness.staleCopy} />
    </SeasonCard>
  );
}

export function ActionChecklist({ actions }: { actions: SeasonActionItem[] }) {
  if (!actions.length) return null;
  return (
    <SeasonCard state="needs_attention" className="action-checklist-card">
      <SectionHeader title="What you need to do" action={actions.length > 3 ? <a href="#more-parent-actions">See all</a> : null} />
      <div className="season-action-list">
        {actions.slice(0, 3).map((action) => <ActionRow action={action} key={action.id} />)}
      </div>
    </SeasonCard>
  );
}

export function WhatChangedCard({ changes, title = "What changed", href = "/parent/schedule" }: { changes: SeasonChangeItem[]; title?: string; href?: string }) {
  if (!changes.length) return null;
  return (
    <SeasonCard state="needs_attention" className="what-changed-card">
      <SectionHeader title={title} />
      <ul className="season-change-list">
        {changes.slice(0, 4).map((item) => <ChangeLogItem item={item} key={item.id} />)}
      </ul>
      <a className="text-link" href={href}>See full history</a>
    </SeasonCard>
  );
}

export function CoachUpdateCard({ view }: { view: ParentSeasonCertaintyView }) {
  return (
    <SeasonCard state={view.coachUpdate ? "ready" : "empty"} className="coach-update-card">
      <SectionHeader title="From your coach" />
      {view.coachUpdate ? (
        <>
          <h3>{view.coachUpdate.title}</h3>
          <p>{view.coachUpdate.body}</p>
          <small>{view.coachUpdate.timeLabel}</small>
          <a className="text-link" href={view.coachUpdate.href}>Read update</a>
        </>
      ) : (
        <EmptyState title="No coach updates this week." body="Published coach announcements and approved Practice Replays will appear here." />
      )}
    </SeasonCard>
  );
}

export function MessagesSummaryCard({ unreadCount, href }: { unreadCount: number; href: string }) {
  if (unreadCount <= 0) return null;
  return (
    <SeasonCard state="needs_attention" className="messages-summary-card">
      <SectionHeader title="Messages" />
      <p>{unreadCount} unread team message{unreadCount === 1 ? "" : "s"}.</p>
      <a className="button secondary" href={href}>Open messages</a>
    </SeasonCard>
  );
}

export function PhotosSummaryCard({ count, latestTitle, href }: { count: number; latestTitle?: string; href: string }) {
  if (count <= 0) return null;
  return (
    <SeasonCard state="ready" className="photos-summary-card">
      <SectionHeader title="Photos" />
      <p>{count} approved photo or video item{count === 1 ? "" : "s"} are visible to your team.</p>
      {latestTitle ? <small>Latest: {latestTitle}</small> : null}
      <a className="button secondary" href={href}>View photos</a>
    </SeasonCard>
  );
}

export function PrivacyIndicator({ copy = "Your family's info is private to your team.", href = "/parent/settings" }: { copy?: string; href?: string }) {
  return (
    <p className="privacy-indicator">
      <strong>{copy}</strong>
      <a href={href}>Privacy settings</a>
    </p>
  );
}

export function EventReadinessCard({ view }: { view: CoachSeasonCertaintyView }) {
  if (!view.viewer.canViewPrivateData) {
    return (
      <PermissionState
        title={view.viewer.status === "signed_out" ? "Sign in to see coach readiness." : "No active coach team is assigned."}
        body={view.viewer.message}
        href={view.viewer.status === "signed_out" ? "/auth" : "/account"}
      />
    );
  }
  const primaryAction = view.actions[0];
  return (
    <SeasonCard state={view.readiness.overallState === "ready" ? "ready" : "needs_attention"} className="event-readiness-card">
      <OperationalTruthBand truth={view.operationalTruth} />
      <div className="season-card-topline">
        <StatusBadge state={view.readiness.overallState === "ready" ? "ready" : "needs_attention"} label={view.readiness.overallLabel} />
        <span className="season-mini-label">{view.team.name}</span>
      </div>
      <p className="season-page-kicker">Coach Home - {view.team.name}</p>
      <h1 id="coach-home-title">Is the next event ready?</h1>
      <div className="season-next-event-title">
        <strong>{view.nextEvent.title}</strong>
        <span>{view.nextEvent.timeLabel}</span>
      </div>
      <dl className="season-event-facts">
        <div>
          <dt>RSVPs</dt>
          <dd>{view.attendance.confirmed} confirmed, {view.attendance.noReply} no reply</dd>
          <small>{view.attendance.maybe} maybe, {view.attendance.declined} declined</small>
        </div>
        <div>
          <dt>Field and weather</dt>
          <dd>{stateLabel(view.readiness.fieldStatus)} field, {stateLabel(view.readiness.weatherStatus)} weather</dd>
          <small>{view.weather.detail}</small>
        </div>
      </dl>
      <ReadinessPills readiness={view.readiness} />
      {primaryAction ? <ActionRow action={primaryAction} /> : null}
      <OfflineStaleNotice label={view.freshness.label} copy={view.freshness.staleCopy} />
    </SeasonCard>
  );
}

export function AttendanceRosterCard({ view }: { view: CoachSeasonCertaintyView }) {
  return (
    <SeasonCard state={view.attendance.noReply ? "needs_attention" : "ready"} className="attendance-roster-card">
      <SectionHeader title="Attendance" action={<a href="/coach/attendance">Nudge missing replies</a>} />
      <div className="season-count-grid">
        <Metric label="Confirmed" value={view.attendance.confirmed} />
        <Metric label="Maybe" value={view.attendance.maybe} />
        <Metric label="Declined" value={view.attendance.declined} />
        <Metric label="No reply" value={view.attendance.noReply} />
      </div>
      {view.attendance.missingReplies.length ? (
        <p className="season-muted">Missing replies: {view.attendance.missingReplies.slice(0, 5).join(", ")}</p>
      ) : <p className="season-muted">No missing replies for the next event.</p>}
    </SeasonCard>
  );
}

export function WeatherFieldCard({ view }: { view: CoachSeasonCertaintyView }) {
  return (
    <SeasonCard state={view.weather.state} className="weather-field-card">
      <SectionHeader title="Weather & Fields" action={<a href="/coach/weather-fields">Review field status</a>} />
      <h3>{view.weather.title}</h3>
      <p>{view.weather.detail}</p>
      <p className="season-muted">Weather alerts are review records here. This card does not claim parent delivery.</p>
    </SeasonCard>
  );
}

export function DraftsToReviewCard({ view }: { view: CoachSeasonCertaintyView }) {
  return (
    <SeasonCard state={view.drafts.count ? "needs_attention" : "empty"} className="drafts-review-card">
      <SectionHeader title="Drafts to Review" action={<a href={view.drafts.href}>Open drafts</a>} />
      <p>{view.drafts.count ? `${view.drafts.count} draft record${view.drafts.count === 1 ? "" : "s"} waiting.` : "No AI or team drafts are waiting right now."}</p>
      <p className="season-muted">{view.drafts.reviewOnlyCopy}</p>
    </SeasonCard>
  );
}

export function PracticeRecapCard({ view }: { view: CoachSeasonCertaintyView }) {
  return (
    <SeasonCard state="ready" className="practice-recap-card">
      <SectionHeader title="Practice Replays" action={<a href={view.practiceRecap.href}>{view.practiceRecap.statusLabel}</a>} />
      <p>{view.practiceRecap.title}</p>
      <p className="season-muted">Practice Replay content stays coach reviewed before families see it.</p>
    </SeasonCard>
  );
}

export function LeagueHealthSummaryCard({ view }: { view: AdminSeasonCertaintyView }) {
  return (
    <SeasonCard state={view.health.teamsNeedingHelp ? "needs_attention" : "ready"} className="league-health-card">
      <OperationalTruthBand truth={view.operationalTruth} />
      <p className="season-page-kicker">League operations - {view.organizationName}</p>
      <h1 id="admin-home-title">What is blocking launch?</h1>
      <div className="season-count-grid league-health-grid">
        <Metric label="Teams needing help" value={view.health.teamsNeedingHelp} />
        <Metric label="Low RSVP teams" value={view.health.lowRsvpTeams} />
        <Metric label="Family access gaps" value={view.health.brokenFamilyAccess} />
        <Metric label="Pending registrations" value={view.health.pendingRegistrations} />
        <Metric label="Weather & field review" value={view.health.weatherFieldReview} />
        <Metric label="Media review" value={view.health.mediaReview} />
        <Metric label="Message delivery review" value={view.health.messageDeliveryReview} />
        <Metric label="Setup gaps" value={view.health.setupGaps} />
      </div>
    </SeasonCard>
  );
}

export function PendingActionsPanel({ view }: { view: AdminSeasonCertaintyView }) {
  const hasOpenQueue = view.pendingQueues.some((queue) => queue.permissionState !== "empty");
  return (
    <SeasonCard state={hasOpenQueue ? "needs_attention" : "empty"} className="pending-actions-panel">
      <SectionHeader title="Pending reviews" />
      {view.pendingQueues.length ? (
        <div className="season-action-list">
          {view.pendingQueues.map((action) => <ActionRow action={action} key={action.id} />)}
        </div>
      ) : (
        <EmptyState title="No open review queues." body="Registration, family access, weather, media, delivery, branding, archive, and security queues are clear." />
      )}
    </SeasonCard>
  );
}

export function TeamStatusTable({ view }: { view: AdminSeasonCertaintyView }) {
  return (
    <SeasonCard state={view.teamRows.length ? "ready" : "empty"} className="team-status-table-card">
      <SectionHeader title="Team status" />
      {view.teamRows.length ? (
        <div className="team-status-table" role="table" aria-label="Team readiness status">
          <div className="team-status-head" role="row">
            {["Team", "Next event", "RSVP", "Family access", "Snacks/volunteers", "Weather/field", "Media", "Setup", "Status", "Action"].map((label) => <span role="columnheader" key={label}>{label}</span>)}
          </div>
          {view.teamRows.map((row) => (
            <div className="team-status-row" role="row" key={row.teamId}>
              <span role="cell"><strong>{row.teamName}</strong><small>{row.division}</small></span>
              <span role="cell">{row.nextEvent}</span>
              <span role="cell">{row.rsvpConfidence}</span>
              <span role="cell">{row.familyAccess}</span>
              <span role="cell">{row.snacksVolunteers}</span>
              <span role="cell">{row.weatherField}</span>
              <span role="cell">{row.media}</span>
              <span role="cell">{row.setup}</span>
              <span role="cell"><StatusBadge state={row.status === "ready" ? "ready" : row.status === "blocked" ? "urgent" : "needs_attention"} label={row.status.replace("_", " ")} /></span>
              <span role="cell"><a href={row.primaryAction.href}>{row.primaryAction.cta}</a></span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No teams yet." body="Create teams before league readiness can be summarized." />
      )}
    </SeasonCard>
  );
}

export function RegistrationQueueCard({ view }: { view: AdminSeasonCertaintyView }) {
  return (
    <SeasonCard state={view.registrationQueue.count ? "needs_attention" : "empty"} className="registration-queue-card">
      <SectionHeader title="Registration queue" action={<a href={view.registrationQueue.href}>Review registrations</a>} />
      <p>{view.registrationQueue.count ? `${view.registrationQueue.count} registration request${view.registrationQueue.count === 1 ? "" : "s"} waiting.` : "No pending registrations."}</p>
    </SeasonCard>
  );
}

export function SecurityStatusCard({ view }: { view: AdminSeasonCertaintyView }) {
  return (
    <SeasonCard state={view.security.status} className="security-status-card">
      <SectionHeader title="Review & Safety" action={<a href={view.security.href}>Open security & audit</a>} />
      <p>{view.security.detail}</p>
      <p className="season-muted">Archived-season locks and provider review boundaries stay visible from the proof route.</p>
    </SeasonCard>
  );
}

function ReadinessPills({ readiness }: { readiness: TeamReadinessSnapshot }) {
  return (
    <div className="readiness-pill-grid">
      <StatusBadge state={readiness.snackCoverage} label={`Snacks ${stateLabel(readiness.snackCoverage)}`} />
      <StatusBadge state={readiness.volunteerCoverage} label={`Volunteers ${stateLabel(readiness.volunteerCoverage)}`} />
      <StatusBadge state={readiness.weatherStatus} label={`Weather ${stateLabel(readiness.weatherStatus)}`} />
      <StatusBadge state={readiness.fieldStatus} label={`Field ${stateLabel(readiness.fieldStatus)}`} />
      <StatusBadge state={readiness.coachUpdateStatus} label={`Coach update ${stateLabel(readiness.coachUpdateStatus)}`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="season-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function stateLabel(state: SeasonCardState) {
  return {
    loading: "loading",
    empty: "clear",
    ready: "ready",
    needs_attention: "needs attention",
    urgent: "urgent",
    error: "error",
    permission_denied: "access required",
    offline_stale: "stale"
  }[state];
}
