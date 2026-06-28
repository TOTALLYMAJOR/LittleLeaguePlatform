import {
  getParentDashboard,
  getVisiblePlayers,
  canViewParentDashboardPanel,
  type AppState
} from "@/lib/domain";
import type { DomainPolicyActor } from "@/lib/domain/policies";
import { AccessRestrictedPanel, EmptyState, formatDateTime } from "./shared";

export interface ParentDashboardPanelProps {
  state: AppState;
  actor: DomainPolicyActor;
  now?: string;
}

export function ParentDashboardPanel({ state, actor, now = new Date().toISOString() }: ParentDashboardPanelProps) {
  if (!canViewParentDashboardPanel(actor)) {
    return <AccessRestrictedPanel actor={actor} title="Parent dashboard" />;
  }

  const dashboard = getParentDashboard(state, actor.userId, now);
  const visiblePlayers = getVisiblePlayers(state, actor);

  return (
    <section className="grid two" aria-label="Parent dashboard">
      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Parent dashboard</span>
            <h2>Linked players</h2>
          </div>
          <span className="badge">{visiblePlayers.length}</span>
        </div>
        {dashboard.children.map(({ player, team }) => (
          <p key={player.id}>
            <strong>{player.firstName} {player.lastInitial}.</strong><br />
            <span className="muted">{team.name} · #{player.jersey}</span>
          </p>
        ))}
        {dashboard.children.length === 0 ? <EmptyState>No active child/team links are visible.</EmptyState> : null}
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Schedule</span>
            <h2>Upcoming events</h2>
          </div>
          <span className="badge">{dashboard.nextEvents.length}</span>
        </div>
        {dashboard.nextEvents.map((event) => (
          <p key={event.id}>
            <strong>{event.title}</strong><br />
            <span className="muted">{event.locationName} · {formatDateTime(event.startsAt)}</span>
          </p>
        ))}
        {dashboard.nextEvents.length === 0 ? <EmptyState>No upcoming events for linked teams.</EmptyState> : null}
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">RSVP</span>
            <h2>Needs response</h2>
          </div>
          <span className="badge">{dashboard.rsvpNeeded.length}</span>
        </div>
        {dashboard.rsvpNeeded.map(({ event, player }) => (
          <p key={`${event.id}-${player.id}`}>
            <strong>{player.firstName} {player.lastInitial}.</strong><br />
            <span className="muted">{event.title} · {formatDateTime(event.startsAt)}</span>
          </p>
        ))}
        {dashboard.rsvpNeeded.length === 0 ? <EmptyState>No RSVP gaps for visible events.</EmptyState> : null}
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Team updates</span>
            <h2>Latest announcement</h2>
          </div>
        </div>
        {dashboard.latestAnnouncement ? (
          <p>
            <strong>{dashboard.latestAnnouncement.title}</strong><br />
            <span className="muted">{dashboard.latestAnnouncement.teamName} · {formatDateTime(dashboard.latestAnnouncement.createdAt)}</span><br />
            {dashboard.latestAnnouncement.body}
          </p>
        ) : (
          <EmptyState>No visible team announcements.</EmptyState>
        )}
      </article>
    </section>
  );
}
