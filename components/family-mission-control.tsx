"use client";

import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CloudOff,
  Flag,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Wifi,
  WifiOff
} from "lucide-react";
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
  const responseNeededCount = weekEvents.filter((event) => event.rsvpNeedsAction).length;
  const settledCount = weekEvents.filter((event) => (
    event.status === "scheduled" && !event.rsvpNeedsAction && !event.changed
  )).length;
  const familyLabel = childFilter === "all"
    ? view.children.length > 1
      ? `${view.children.length} linked players`
      : view.children[0]?.teamName ?? "Linked family"
    : view.children.find((child) => child.id === childFilter)?.teamName ?? "Linked family";

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
        <div className="mission-family-mark" aria-hidden="true">
          {view.children[0]?.label.slice(0, 1) ?? "F"}
        </div>
        <div className="mission-control-intro">
          <span className="mission-kicker mission-icon-label">
            <Sun aria-hidden="true" data-family-icon="sun" size={15} />
            Family Mission Control
          </span>
          <h1 id="family-mission-control-title">Your family week</h1>
          <p className="mission-control-next-line">
            {selectedEvent
              ? `Next: ${selectedEvent.childLabel} · ${selectedEvent.title}`
              : "What does your family need to do next?"}
          </p>
          <p>{familyLabel}. {view.message}</p>
        </div>
        <div className="mission-control-stats" aria-label="Family week status">
          <article>
            <CheckCircle2 aria-hidden="true" className="mission-stat-icon" data-family-icon="settled" size={20} />
            <strong>{settledCount}</strong>
            <span>Settled</span>
          </article>
          <article className={responseNeededCount ? "needs-action" : ""}>
            <AlertTriangle aria-hidden="true" className="mission-stat-icon" data-family-icon="needs-reply" size={20} />
            <strong>{responseNeededCount}</strong>
            <span>Need reply</span>
          </article>
        </div>
      </header>

      {view.criticalChange ? (
        <section className="mission-critical-change" role="alert">
          <span className="mission-kicker mission-icon-label">
            <AlertTriangle aria-hidden="true" size={16} />
            {view.criticalChange.title}
          </span>
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

      <div className="mission-dashboard-grid">
        <div className="mission-dashboard-main">
          {selectedEvent ? (
            <EventPassport event={selectedEvent} conflict={selectedConflict?.summary} />
          ) : (
            <section className="mission-empty" role="status">
              <span className={`status-pill ${view.state === "ready" ? "ok" : "warning"}`}>{view.stateLabel}</span>
              <h2>No upcoming Event Passport</h2>
              <p>{view.state === "access_pending" ? "Family access must be active before private event details appear." : "The current official schedule has no upcoming events for linked children."}</p>
              <a className="button secondary" href={view.state === "access_pending" ? "/parent/family-access" : "/parent/schedule"}>
                {view.state === "access_pending" ? "Review family access" : "View official schedule"}
              </a>
            </section>
          )}

          <section className="family-week" id="family-week" aria-labelledby="family-week-title">
            <div className="mission-section-heading">
              <div className="mission-heading-with-icon">
                <span className="mission-section-icon" aria-hidden="true">
                  <CalendarDays data-family-icon="calendar" size={20} />
                </span>
                <div>
                  <h2 id="family-week-title">Your next seven days</h2>
                  <p>{weekEvents.length} official event projection{weekEvents.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <a href="/parent/schedule">Full schedule</a>
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
              <p className="mission-week-status">No overlapping official event times are visible. Travel time has not been evaluated.</p>
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
                    <span>{event.childLabel} · {event.teamName}</span>
                    <h3>{event.title}</h3>
                    <p>{event.activityLabel} · Opponent {event.opponentLabel}</p>
                    <p>{event.venueLabel} · Field {event.fieldLabel}</p>
                  </div>
                  <div className="family-agenda-action">
                    <span className={`status-pill ${event.status === "scheduled" && !event.changed ? "ok" : "warning"}`}>{event.rsvpLabel}</span>
                    <button
                      className="button secondary"
                      data-analytics-event="event_passport_opened"
                      onClick={() => {
                        setSelectedProjectionId(event.projectionId);
                        document.getElementById("event-passport")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      type="button"
                    >
                      Open event
                    </button>
                  </div>
                </article>
              ))}
              {!weekEvents.length ? <p className="mission-agenda-empty">No events match this family filter in the next seven days.</p> : null}
            </div>
          </section>
        </div>

        <FamilyReadinessRail
          changedCount={weekEvents.filter((event) => event.changed || event.status === "cancelled").length}
          conflictCount={weekConflicts.length}
          isLive={view.isLive}
          responseNeededCount={responseNeededCount}
          settledCount={settledCount}
          stateLabel={view.stateLabel}
          unresolvedCount={selectedEvent?.unresolved.length ?? 0}
        />
      </div>

      <footer className="mission-freshness">
        <span className="mission-icon-label"><CloudOff aria-hidden="true" size={15} />{view.offlineLabel}</span>
        <span className="mission-icon-label"><Clock3 aria-hidden="true" size={15} />Viewed {new Date(view.observedAt).toLocaleString()}</span>
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
      <div className="event-passport-visual">
        <Image
          alt=""
          className="event-passport-image"
          fill
          priority
          sizes="(max-width: 760px) 100vw, (max-width: 1200px) 65vw, 760px"
          src="/images/leaguepilot-game-day-parent.png"
        />
        <div className="event-passport-scrim" aria-hidden="true" />
        <header className="event-passport-header">
          <div>
            <span className="mission-icon-label">
              <Trophy aria-hidden="true" data-family-icon="trophy" size={16} />
              Next up · Event Passport
            </span>
            <h2 id="event-passport-title">{event.title}</h2>
            <p>{event.childLabel} · {event.teamName}</p>
            <p className="event-passport-meta mission-icon-label">
              <CalendarDays aria-hidden="true" size={16} />
              {event.dateLabel} at {event.startLabel}
            </p>
            <p className="event-passport-meta mission-icon-label">
              <MapPin aria-hidden="true" data-family-icon="location" size={16} />
              {event.venueLabel}
            </p>
          </div>
          <span className={`status-pill ${event.status === "scheduled" && !event.changed ? "ok" : "warning"}`}>{event.statusLabel}</span>
        </header>
      </div>

      <div className="event-passport-body">
        {event.changed ? (
          <p className="event-passport-change">
            <strong>Review current version.</strong> {event.changedLabel}
          </p>
        ) : null}
        {conflict ? <p className="notice warning"><strong>Family conflict:</strong> {conflict}</p> : null}

        <div className="event-passport-time" aria-label="Event time plan">
          <div>
            <span className="event-time-label"><Navigation aria-hidden="true" size={15} />Leave</span>
            <strong>{event.leaveLabel}</strong>
            <small>Family-owned plan</small>
          </div>
          <div>
            <span className="event-time-label"><MapPin aria-hidden="true" size={15} />Arrive</span>
            <strong>{event.arrivalLabel}</strong>
            <small>League has not published</small>
          </div>
          <div>
            <span className="event-time-label"><Flag aria-hidden="true" size={15} />Start</span>
            <strong>{event.startLabel}</strong>
            <small>{event.dateLabel}</small>
          </div>
        </div>

        <div className="event-passport-actions">
          <a
            className="button"
            data-analytics-event="next_action_opened"
            href={event.primaryAction.href}
            rel={externalAction ? "noreferrer" : undefined}
            target={externalAction ? "_blank" : undefined}
          >
            {event.primaryAction.label}
            <ArrowRight aria-hidden="true" size={17} />
          </a>
          {event.directionsUrl && event.primaryAction.href !== event.directionsUrl ? (
            <a className="button secondary" data-analytics-event="directions_opened" href={event.directionsUrl} rel="noreferrer" target="_blank">
              <MapPin aria-hidden="true" size={17} />
              Directions
            </a>
          ) : null}
          <a className="button secondary" href="/parent/messages">
            <MessageCircle aria-hidden="true" data-family-icon="messages" size={17} />
            Messages
          </a>
        </div>

        <details className="event-passport-details">
          <summary>
            <ClipboardList aria-hidden="true" size={17} />
            Full Event Passport · official schedule v{event.scheduleVersion} · {event.unresolved.length} unresolved
          </summary>
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

          <footer>
            <span>{event.sourceLabel}</span>
            <span>{event.freshnessLabel}</span>
          </footer>
        </details>
      </div>
    </section>
  );
}

function FamilyReadinessRail({
  changedCount,
  conflictCount,
  isLive,
  responseNeededCount,
  settledCount,
  stateLabel,
  unresolvedCount
}: {
  changedCount: number;
  conflictCount: number;
  isLive: boolean;
  responseNeededCount: number;
  settledCount: number;
  stateLabel: string;
  unresolvedCount: number;
}) {
  return (
    <aside className="mission-dashboard-rail" aria-label="Family week supporting information">
      <section className="mission-rail-card">
        <header>
          <div className="mission-rail-heading">
            <span className="mission-section-icon mission-section-icon-green" aria-hidden="true">
              <ShieldCheck data-family-icon="readiness" size={20} />
            </span>
            <div>
              <h2>Family readiness</h2>
              <p>Official facts and family responses</p>
            </div>
          </div>
          <span className={`status-pill ${responseNeededCount || conflictCount || changedCount ? "warning" : "ok"}`}>{stateLabel}</span>
        </header>
        <dl className="mission-readiness-list">
          <div><dt>Settled events</dt><dd>{settledCount}</dd></div>
          <div><dt>Responses needed</dt><dd>{responseNeededCount}</dd></div>
          <div><dt>Schedule conflicts</dt><dd>{conflictCount}</dd></div>
          <div><dt>Schedule changes</dt><dd>{changedCount}</dd></div>
          <div><dt>Next event gaps</dt><dd>{unresolvedCount}</dd></div>
        </dl>
        <p className={isLive ? "mission-live-state" : "mission-verify-state"}>
          {isLive ? <Wifi aria-hidden="true" size={16} /> : <WifiOff aria-hidden="true" size={16} />}
          {isLive ? "Live family records" : "Private data needs verification"}
        </p>
      </section>

      <section className="mission-rail-card mission-quick-links">
        <header>
          <div>
            <h2>Family tools</h2>
            <p>Open the full workflow when you need it</p>
          </div>
        </header>
        <a href="/parent/messages">
          <span className="mission-quick-link-icon" aria-hidden="true">
            <MessageCircle data-family-icon="messages" size={19} />
          </span>
          <span className="mission-quick-link-copy"><strong>Messages</strong><span>Official updates and team conversation</span></span>
        </a>
        <a href="/parent/transportation">
          <span className="mission-quick-link-icon" aria-hidden="true">
            <CarFront data-family-icon="transportation" size={19} />
          </span>
          <span className="mission-quick-link-copy"><strong>Transportation</strong><span>Review accepted adult responsibilities</span></span>
        </a>
        <a href="/parent/practice-recaps">
          <span className="mission-quick-link-icon" aria-hidden="true">
            <Sparkles data-family-icon="replay" size={19} />
          </span>
          <span className="mission-quick-link-copy"><strong>Parent Replay</strong><span>Coach-approved activities and memories</span></span>
        </a>
        <a data-analytics-event="offline_pack_opened" href="/offline">
          <span className="mission-quick-link-icon" aria-hidden="true">
            <CloudOff data-family-icon="offline" size={19} />
          </span>
          <span className="mission-quick-link-copy"><strong>Offline pack</strong><span>Check what is available on this device</span></span>
        </a>
      </section>
    </aside>
  );
}
