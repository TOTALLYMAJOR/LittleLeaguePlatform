import {
  ACTIONABLE_STATES,
  canTransitionWeatherAlert,
  canViewAdminAuditPanel,
  computeAdminHealth,
  getVisibleAuditEvents,
  getVisibleWeatherAlerts,
  type AppState
} from "@/lib/domain";
import {
  isDraftWeatherAlert,
  isFailedNotification,
  isPendingNotification,
  isPendingRegistrationRequest
} from "@/lib/domain/contracts";
import type { DomainPolicyActor } from "@/lib/domain/policies";
import { AccessRestrictedPanel, EmptyState, formatDateTime, formatDomainValue } from "./shared";

export interface AdminAuditPanelProps {
  state: AppState;
  actor: DomainPolicyActor;
  now?: string;
}

const APPROVED_ACTIONABLE_STATE = ACTIONABLE_STATES[1];

export function AdminAuditPanel({ state, actor, now = new Date().toISOString() }: AdminAuditPanelProps) {
  if (!canViewAdminAuditPanel(actor)) {
    return <AccessRestrictedPanel actor={actor} title="Admin audit panel" />;
  }

  const healthCards = computeAdminHealth(state, now);
  const auditEvents = getVisibleAuditEvents(state, actor)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);
  const pendingRegistrations = state.registrationRequests.filter(isPendingRegistrationRequest);
  const pendingNotifications = state.notifications.filter(isPendingNotification);
  const failedNotifications = state.notifications.filter(isFailedNotification);
  const draftWeatherAlerts = getVisibleWeatherAlerts(state, actor).filter(isDraftWeatherAlert);

  return (
    <section className="grid two" aria-label="Admin audit panel">
      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Admin audit panel</span>
            <h2>Launch health</h2>
          </div>
          <span className="badge">{healthCards.length}</span>
        </div>
        {healthCards.map((card) => (
          <p key={card.id}>
            <strong>{card.title}: {card.count}</strong><br />
            <span className="muted">{formatDomainValue(card.status)} · {card.detail}</span>
          </p>
        ))}
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Audit log</span>
            <h2>Recent events</h2>
          </div>
          <span className="badge">{auditEvents.length}</span>
        </div>
        {auditEvents.map((event) => (
          <p key={event.id}>
            <strong>{event.action}</strong><br />
            <span className="muted">{event.targetType} · {event.targetId} · {formatDateTime(event.createdAt)}</span><br />
            {event.summary}
          </p>
        ))}
        {auditEvents.length === 0 ? <EmptyState>No audit events are visible.</EmptyState> : null}
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Review queues</span>
            <h2>Pending work</h2>
          </div>
        </div>
        <p><strong>{pendingRegistrations.length}</strong><br /><span className="muted">registration request(s) pending review</span></p>
        <p><strong>{pendingNotifications.length}</strong><br /><span className="muted">notification record(s) pending provider-independent review</span></p>
        <p><strong>{failedNotifications.length}</strong><br /><span className="muted">notification record(s) needing retry review</span></p>
      </article>

      <article className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Weather workflow</span>
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
        {draftWeatherAlerts.length === 0 ? <EmptyState>No weather alerts are awaiting review.</EmptyState> : null}
      </article>
    </section>
  );
}
