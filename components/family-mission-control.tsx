"use client";

import { useMemo, useState } from "react";
import type {
  FamilyMissionControlView,
  FamilyMissionEvent
} from "@/lib/family-mission-control";

export function FamilyMissionControlClient({ view }: { view: FamilyMissionControlView }) {
  const [childFilter, setChildFilter] = useState("all");
  const [selectedProjectionId, setSelectedProjectionId] = useState(view.nextEvent?.projectionId ?? "");
  const filteredEvents = useMemo(
    () => view.events.filter((event) => childFilter === "all" || event.childId === childFilter),
    [childFilter, view.events]
  );
  const weekEvents = filteredEvents.filter((event) => Date.parse(event.startsAt) <= Date.parse(view.weekEndsAt));
  const weekProjectionIds = new Set(weekEvents.map((event) => event.projectionId));
  const weekConflicts = view.conflicts.filter((conflict) => (
    weekProjectionIds.has(conflict.leftProjectionId) &&
    weekProjectionIds.has(conflict.rightProjectionId)
  ));
  const selectedEvent = filteredEvents.find((event) => event.projectionId === selectedProjectionId)
    ?? filteredEvents[0]
    ?? view.nextEvent;
  const selectedConflict = selectedEvent
    ? view.conflicts.find((conflict) => (
      conflict.leftProjectionId === selectedEvent.projectionId ||
      conflict.rightProjectionId === selectedEvent.projectionId
    ))
    : undefined;

  function applyFilter(nextFilter: string) {
    setChildFilter(nextFilter);
    const nextEvent = view.events.find((event) => nextFilter === "all" || event.childId === nextFilter);
    setSelectedProjectionId(nextEvent?.projectionId ?? "");
  }

  return (
    <section
      className={`page family-mission-control state-${view.state}`}
      data-analytics-surface="family_mission_control"
      aria-labelledby="family-mission-control-title"
    >
      <a className="sr-only-focusable" href="#family-week">Skip to family week</a>
      <header className="mission-control-header">
        <div>
          <span className="eyebrow">Family Mission Control</span>
          <h1 id="family-mission-control-title">
            {selectedEvent
              ? `Next: ${selectedEvent.childLabel} · ${selectedEvent.title}`
              : "What does your family need to do next?"}
          </h1>
          <p>{view.message}</p>
        </div>
        <div className="mission-control-state">
          <span className={`status-pill ${view.state === "ready" ? "ok" : "warning"}`}>{view.stateLabel}</span>
          <small>{view.isLive ? "Live family records" : "Needs verification"}</small>
        </div>
      </header>

      {view.criticalChange ? (
        <section className="mission-critical-change" role="alert">
          <span className="eyebrow">{view.criticalChange.title}</span>
          <strong>{view.criticalChange.summary}</strong>
          <a href="#event-passport">Review current Event Passport</a>
        </section>
      ) : null}

      {view.children.length > 1 ? (
        <nav className="family-filter" aria-label="Filter family schedule">
          <button
            aria-pressed={childFilter === "all"}
            className={childFilter === "all" ? "" : "secondary"}
            data-analytics-event="child_filter_changed"
            onClick={() => applyFilter("all")}
            type="button"
          >
            Everyone
          </button>
          {view.children.map((child) => (
            <button
              aria-pressed={childFilter === child.id}
              className={childFilter === child.id ? "" : "secondary"}
              data-analytics-event="child_filter_changed"
              key={child.id}
              onClick={() => applyFilter(child.id)}
              type="button"
            >
              {child.label} · {child.teamName}
            </button>
          ))}
        </nav>
      ) : null}

      {selectedEvent ? (
        <EventPassport event={selectedEvent} conflict={selectedConflict?.summary} />
      ) : (
        <section className="card mission-empty" role="status">
          <h2>No upcoming Event Passport</h2>
          <p>{view.state === "access_pending" ? "Family access must be active before private event details appear." : "The current official schedule has no upcoming events for linked children."}</p>
          <a className="button secondary" href={view.state === "access_pending" ? "/parent/family-access" : "/parent/schedule"}>
            {view.state === "access_pending" ? "Review family access" : "View official schedule"}
          </a>
        </section>
      )}

      <section className="mission-secondary-actions" aria-label="Family shortcuts">
        <a href="#family-week">View week</a>
        <a href="/parent/messages">Messages</a>
        <a href="/parent/transportation">Transportation</a>
        <a href="/parent/practice-recaps">Parent Replay</a>
        <a data-analytics-event="offline_pack_opened" href="/offline">Offline pack</a>
      </section>

      <section className="family-week" id="family-week" aria-labelledby="family-week-title">
        <div className="mission-section-heading">
          <div>
            <span className="eyebrow">Multi-child schedule</span>
            <h2 id="family-week-title">Your next seven days</h2>
          </div>
          <span>{weekEvents.length} event projection{weekEvents.length === 1 ? "" : "s"}</span>
        </div>

        {weekConflicts.length ? (
          <div className="mission-conflict-list">
            {weekConflicts.map((conflict) => (
              <article className="mission-conflict" key={conflict.id}>
                <strong>{conflict.summary}</strong>
                <p>{conflict.evidence}</p>
                <button
                  className="button secondary"
                  data-analytics-event="schedule_conflict_opened"
                  onClick={() => setSelectedProjectionId(conflict.leftProjectionId)}
                  type="button"
                >
                  Review conflict
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="notice ok">No overlapping official event times are visible. Travel time has not been evaluated.</p>
        )}

        <div className="family-agenda" role="list" aria-label="Family event agenda">
          {weekEvents.slice(0, 12).map((event) => (
            <article
              className={`family-agenda-row ${selectedEvent?.projectionId === event.projectionId ? "is-selected" : ""}`}
              key={event.projectionId}
              role="listitem"
            >
              <div className="family-agenda-when">
                <time dateTime={event.startsAt}>{event.dateLabel}</time>
                <strong>{event.startLabel}</strong>
                <small>Arrival {event.arrivalLabel}</small>
              </div>
              <div className="family-agenda-main">
                <span className="eyebrow">{event.childLabel} · {event.teamName}</span>
                <h3>{event.title}</h3>
                <p>{event.activityLabel} · Opponent {event.opponentLabel}</p>
                <p>{event.venueLabel} · Field {event.fieldLabel}</p>
              </div>
              <div className="family-agenda-action">
                <span className={`status-pill ${event.status === "scheduled" && !event.changed ? "ok" : "warning"}`}>{event.statusLabel}</span>
                <button
                  className="button secondary"
                  data-analytics-event="event_passport_opened"
                  onClick={() => {
                    setSelectedProjectionId(event.projectionId);
                    document.getElementById("event-passport")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  type="button"
                >
                  Open Event
                </button>
              </div>
            </article>
          ))}
          {!weekEvents.length ? <p className="muted">No events match this family filter in the next seven days.</p> : null}
        </div>
      </section>

      <footer className="mission-freshness">
        <span>{view.offlineLabel}</span>
        <span>Viewed {new Date(view.observedAt).toLocaleString()}</span>
      </footer>
    </section>
  );
}

function EventPassport({ event, conflict }: { event: FamilyMissionEvent; conflict?: string }) {
  const externalAction = event.primaryAction.href.startsWith("http");
  return (
    <section
      className={`event-passport ${event.status === "cancelled" ? "is-cancelled" : event.changed ? "is-changed" : ""}`}
      id="event-passport"
      aria-labelledby="event-passport-title"
      data-analytics-event="event_passport_viewed"
    >
      <header className="event-passport-header">
        <div>
          <span className="eyebrow">Event Passport · official schedule v{event.scheduleVersion}</span>
          <h2 id="event-passport-title">{event.childLabel} · {event.title}</h2>
          <p>{event.teamName} · {event.activityLabel}{event.opponentLabel !== "Not applicable" ? ` · vs ${event.opponentLabel}` : ""}</p>
        </div>
        <span className={`status-pill ${event.status === "scheduled" && !event.changed ? "ok" : "warning"}`}>{event.statusLabel}</span>
      </header>

      {event.changed ? (
        <p className="event-passport-change">
          <strong>Review current version.</strong> {event.changedLabel}
        </p>
      ) : null}
      {conflict ? <p className="notice warning"><strong>Family conflict:</strong> {conflict}</p> : null}

      <div className="event-passport-time" aria-label="Event time plan">
        <div><span>Leave</span><strong>{event.leaveLabel}</strong><small>Family-owned plan</small></div>
        <div><span>Arrive</span><strong>{event.arrivalLabel}</strong><small>League has not published</small></div>
        <div><span>Start</span><strong>{event.startLabel}</strong><small>{event.dateLabel}</small></div>
      </div>

      <dl className="event-passport-facts">
        <div><dt>Venue</dt><dd>{event.venueLabel}</dd><small>{event.addressLabel}</small></div>
        <div><dt>Field</dt><dd>{event.fieldLabel}</dd></div>
        <div><dt>Bring</dt><dd>{event.bringLabel}</dd></div>
        <div><dt>Outbound responsibility</dt><dd>{event.outboundResponsibilityLabel}</dd></div>
        <div><dt>Return responsibility</dt><dd>{event.returnResponsibilityLabel}</dd></div>
        <div><dt>Responsibility summary</dt><dd>{event.responsibleAdultLabel}</dd>{event.handoffLabel ? <small>Coordination note: {event.handoffLabel}</small> : null}</div>
        <div><dt>RSVP</dt><dd>{event.rsvpLabel}</dd></div>
        <div><dt>Opponent</dt><dd>{event.opponentLabel}</dd></div>
      </dl>

      <section className="event-passport-unresolved" aria-label="Unresolved event details">
        <strong>{event.unresolved.length} unresolved</strong>
        <p>{event.unresolved.join(" · ")}</p>
      </section>

      <div className="event-passport-actions">
        <a
          className="button"
          data-analytics-event="next_action_opened"
          href={event.primaryAction.href}
          rel={externalAction ? "noreferrer" : undefined}
          target={externalAction ? "_blank" : undefined}
        >
          {event.primaryAction.label}
        </a>
        {event.directionsUrl && event.primaryAction.href !== event.directionsUrl ? (
          <a className="button secondary" data-analytics-event="directions_opened" href={event.directionsUrl} rel="noreferrer" target="_blank">Directions</a>
        ) : null}
        <a className="button secondary" href="/parent/messages">View messages</a>
        <a className="button secondary" href="/parent/transportation">Transportation</a>
      </div>

      <footer>
        <span>{event.sourceLabel}</span>
        <span>{event.freshnessLabel}</span>
      </footer>
    </section>
  );
}
