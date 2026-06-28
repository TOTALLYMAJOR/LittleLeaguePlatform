import {
  ACTIONABLE_STATES,
  canTransitionParentReplayOutput,
  canTransitionWeatherAlert,
  canViewCoachTeamPanel,
  getVisibleEvents,
  getVisiblePlayers,
  getVisibleTeams,
  getVisibleWeatherAlerts,
  type AppState
} from "@/lib/domain";
import {
  EVENT_STATUSES,
  RSVP_RESPONSES,
  isDraftParentReplayRecord,
  isDraftWeatherAlert
} from "@/lib/domain/contracts";
import type { DomainPolicyActor } from "@/lib/domain/policies";
import { AccessRestrictedPanel, EmptyState, formatDateTime, formatDomainValue } from "./shared";

export interface CoachTeamPanelProps {
  state: AppState;
  actor: DomainPolicyActor;
  now?: string;
}

const SCHEDULED_EVENT_STATUS = EVENT_STATUSES[0];
const APPROVED_ACTIONABLE_STATE = ACTIONABLE_STATES[1];

export function CoachTeamPanel({ state, actor, now = new Date().toISOString() }: CoachTeamPanelProps) {
  if (!canViewCoachTeamPanel(state, actor)) {
    return <AccessRestrictedPanel actor={actor} title="Coach team panel" />;
  }

  const nowMs = new Date(now).getTime();
  const visibleTeams = getVisibleTeams(state, actor);
  const visiblePlayers = getVisiblePlayers(state, actor);
  const visibleEvents = getVisibleEvents(state, actor);
  const visibleTeamIds = new Set(visibleTeams.map((team) => team.id));
  const upcomingEvents = visibleEvents
    .filter((event) => event.status === SCHEDULED_EVENT_STATUS && new Date(event.startsAt).getTime() >= nowMs)
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const draftWeatherAlerts = getVisibleWeatherAlerts(state, actor).filter(isDraftWeatherAlert);
  const draftParentReplays = state.parentReplays
    .filter((replay) => visibleTeamIds.has(replay.teamId))
    .filter(isDraftParentReplayRecord);

  return (
    <section className="grid two" aria-label="Coach team panel">
      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Coach team panel</span>
            <h2>Visible teams</h2>
          </div>
          <span className="badge">{visibleTeams.length}</span>
        </div>
        {visibleTeams.map((team) => {
          const rosterCount = visiblePlayers.filter((player) => player.teamId === team.id).length;
          const eventCount = upcomingEvents.filter((event) => event.teamId === team.id).length;
          return (
            <p key={team.id}>
              <strong>{team.name}</strong><br />
              <span className="muted">{team.division} · {rosterCount} player(s) · {eventCount} upcoming event(s)</span>
            </p>
          );
        })}
        {visibleTeams.length === 0 ? <EmptyState>No assigned teams are visible.</EmptyState> : null}
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">RSVP snapshot</span>
            <h2>Upcoming events</h2>
          </div>
          <span className="badge">{upcomingEvents.length}</span>
        </div>
        {upcomingEvents.slice(0, 5).map((event) => {
          const eventPlayers = visiblePlayers.filter((player) => player.teamId === event.teamId);
          const eventRsvps = state.rsvps.filter((rsvp) => rsvp.eventId === event.id);
          const responseCounts = RSVP_RESPONSES.map((response) => ({
            response,
            count: eventRsvps.filter((rsvp) => rsvp.response === response).length
          }));
          const responseTotal = responseCounts.reduce((total, item) => total + item.count, 0);
          return (
            <div className="stack compact" key={event.id}>
              <p>
                <strong>{event.title}</strong><br />
                <span className="muted">{formatDateTime(event.startsAt)} · {Math.max(eventPlayers.length - responseTotal, 0)} no response</span>
              </p>
              <div className="toolbar" aria-label={`${event.title} RSVP counts`}>
                {responseCounts.map(({ response, count }) => (
                  <span className="badge" key={response}>{formatDomainValue(response)}: {count}</span>
                ))}
              </div>
            </div>
          );
        })}
        {upcomingEvents.length === 0 ? <EmptyState>No scheduled upcoming events are visible.</EmptyState> : null}
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Weather review</span>
            <h2>Draft alerts</h2>
          </div>
          <span className="badge">{draftWeatherAlerts.length}</span>
        </div>
        {draftWeatherAlerts.map((alert) => (
          <p key={alert.id}>
            <strong>{alert.headline}</strong><br />
            <span className="muted">
              {formatDomainValue(alert.severity)} · approval allowed: {canTransitionWeatherAlert(alert.status, APPROVED_ACTIONABLE_STATE, actor.role) ? "yes" : "no"}
            </span><br />
            {alert.detail}
          </p>
        ))}
        {draftWeatherAlerts.length === 0 ? <EmptyState>No draft weather alerts are visible.</EmptyState> : null}
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Parent Replay</span>
            <h2>Draft outputs</h2>
          </div>
          <span className="badge">{draftParentReplays.length}</span>
        </div>
        {draftParentReplays.map((replay) => (
          <p key={replay.id}>
            <strong>{replay.title}</strong><br />
            <span className="muted">
              {formatDateTime(replay.createdAt)} · approval allowed: {canTransitionParentReplayOutput(replay.status, APPROVED_ACTIONABLE_STATE, actor.role) ? "yes" : "no"}
            </span><br />
            {replay.summary}
          </p>
        ))}
        {draftParentReplays.length === 0 ? <EmptyState>No draft Parent Replay outputs are visible.</EmptyState> : null}
      </article>
    </section>
  );
}
