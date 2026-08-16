import Link from "next/link";
import { ArrowRight, CalendarDays, CarFront, Clock3, MapPin, Shirt, UsersRound } from "lucide-react";
import type { RsvpResponse } from "@/lib/domain";
import type { FamilyMissionEvent } from "@/lib/family-mission-control";
import type { ChildReadinessLane } from "./readiness";
import { RsvpControl, responseLabel } from "./rsvp-control";
import { StatusChip } from "./status-chip";

export function EventPassport({
  event,
  currentResponse,
  currentLockVersion,
  canWriteRsvp,
  transportationLane,
  pending,
  onRsvpSaved
}: {
  event?: FamilyMissionEvent;
  currentResponse?: RsvpResponse;
  currentLockVersion: number;
  canWriteRsvp: boolean;
  transportationLane?: ChildReadinessLane;
  pending?: boolean;
  onRsvpSaved?: (result: { response: Extract<RsvpResponse, "going" | "maybe" | "not_going">; lockVersion: number; scheduleVersion: number; message: string }) => void;
}) {
  if (!event) {
    return (
      <section className="family-event-passport is-empty" aria-labelledby="parent-next-title">
        <span className="parent-weekly-kicker">Next event</span>
        <h2 id="parent-next-title">No upcoming Event Passport</h2>
        <p>The current official schedule has no upcoming events for linked children.</p>
        <Link href="/parent/schedule">View official schedule <ArrowRight aria-hidden="true" size={15} /></Link>
      </section>
    );
  }

  const requiredAction = event.status === "cancelled"
    ? "Review cancellation"
    : event.rsvpNeedsAction
      ? event.rsvpOutdated ? "Review RSVP after schedule change" : "RSVP required"
      : transportationLane?.status === "unresolved"
        ? transportationLane.detail
        : "No immediate family action";
  const nextAction = event.status === "cancelled"
    ? { label: "Open schedule", href: `/parent/schedule?eventId=${encodeURIComponent(event.eventId)}` }
    : event.rsvpNeedsAction
      ? { label: "Answer RSVP", href: `/parent/rsvp?eventId=${encodeURIComponent(event.eventId)}&playerId=${encodeURIComponent(event.childId)}` }
      : transportationLane?.status === "unresolved"
        ? {
          label: "Open transportation",
          href: transportationLane.href ?? `/parent/transportation?eventId=${encodeURIComponent(event.eventId)}&playerId=${encodeURIComponent(event.childId)}`
        }
        : event.primaryAction;

  return (
    <section className="family-event-passport" aria-labelledby="parent-next-title">
      <div className="family-event-passport-header">
        <div>
          <span className="parent-weekly-kicker">Next event</span>
          <h2 id="parent-next-title">{event.title}</h2>
          <p>{event.childLabel} · {event.teamName}</p>
        </div>
        <StatusChip tone={event.status === "cancelled" ? "critical" : event.rsvpOutdated || event.changed ? "changed" : "neutral"}>
          {event.statusLabel}
        </StatusChip>
      </div>

      <dl className="family-event-passport-facts">
        <div>
          <dt><CalendarDays aria-hidden="true" size={16} /> Date and time</dt>
          <dd>{event.dateLabel} · {event.startLabel}</dd>
        </div>
        <div>
          <dt><MapPin aria-hidden="true" size={16} /> Venue or field</dt>
          <dd>{event.venueLabel} · {event.fieldLabel}</dd>
        </div>
        <div>
          <dt><Clock3 aria-hidden="true" size={16} /> Event version</dt>
          <dd>Schedule v{event.scheduleVersion}{event.rsvpOutdated ? " · RSVP is stale" : ""}</dd>
        </div>
        <div>
          <dt><CarFront aria-hidden="true" size={16} /> Transportation</dt>
          <dd>
            {transportationLane?.detail ?? (event.transportationAssigned ? event.responsibleAdultLabel : "No ride help requested")}
            {" · "}
            <Link href={`/parent/transportation?eventId=${encodeURIComponent(event.eventId)}&playerId=${encodeURIComponent(event.childId)}#caregiver-coordination`}>
              Caregiver note
            </Link>
          </dd>
        </div>
        <div>
          <dt><UsersRound aria-hidden="true" size={16} /> Required family action</dt>
          <dd>{requiredAction}</dd>
        </div>
        <div>
          <dt><Shirt aria-hidden="true" size={16} /> Bring or uniform</dt>
          <dd>{event.bringLabel}</dd>
        </div>
      </dl>

      {event.status === "scheduled" && event.rsvpNeedsAction ? (
        <RsvpControl
          eventId={event.eventId}
          playerId={event.childId}
          childLabel={event.childLabel}
          eventTitle={event.title}
          scheduleVersion={event.scheduleVersion}
          currentResponse={currentResponse}
          currentLockVersion={currentLockVersion}
          disabled={!canWriteRsvp || Boolean(pending)}
          onSaved={onRsvpSaved}
        />
      ) : (
        <div className="family-event-passport-rsvp">
          <span>Answer saved</span>
          <StatusChip tone={currentResponse && currentResponse !== "cancelled" ? "confirmed" : "action"}>
            {responseLabel(currentResponse)}
          </StatusChip>
        </div>
      )}

      <div className="family-event-passport-footer">
        <p>{event.sourceLabel} · {event.freshnessLabel}</p>
        <Link href={nextAction.href}>
          {nextAction.label}
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </div>
    </section>
  );
}
