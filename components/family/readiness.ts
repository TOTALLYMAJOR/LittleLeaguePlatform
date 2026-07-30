import type { RsvpResponse } from "@/lib/domain";
import type { FamilyMissionChild, FamilyMissionConflict, FamilyMissionEvent } from "@/lib/family-mission-control";
import type { ParentEventChange } from "@/lib/supabase/event-change-log-reads";
import type { NotificationReceipt } from "@/lib/supabase/notification-receipts";
import type { ParentTransportationData, TransportationRequestView } from "@/lib/supabase/transportation";
import type { ReadinessItem } from "./readiness-strip";

export type ReadinessLaneStatus = "neutral" | "resolved" | "unresolved";
export type ReadinessLaneId = "rsvp" | "critical-message" | "transportation" | "changes" | "schedule-conflict";

export interface ChildReadinessLane {
  id: ReadinessLaneId;
  label: string;
  detail: string;
  status: ReadinessLaneStatus;
  href?: string;
}

export interface ChildSaturdayReadiness {
  child: FamilyMissionChild;
  event?: FamilyMissionEvent;
  lanes: ChildReadinessLane[];
  unresolvedItems: ReadinessItem[];
}

const criticalNotificationTypes = new Set(["event_cancelled", "weather_alert"]);

export function isCriticalFamilyReceipt(receipt: NotificationReceipt) {
  return criticalNotificationTypes.has(receipt.notificationType)
    || receipt.officialRevision?.priority === "critical"
    || receipt.officialRevision?.priority === "disruption";
}

export function buildChildSaturdayReadiness(input: {
  child: FamilyMissionChild;
  event?: FamilyMissionEvent;
  currentRsvp?: RsvpResponse;
  notificationReceipts: NotificationReceipt[];
  notificationLoadOk: boolean;
  transportationData: ParentTransportationData;
  visibleChanges: ParentEventChange[];
  eventChangeLoadOk: boolean;
  conflicts?: FamilyMissionConflict[];
}): ChildSaturdayReadiness {
  const lanes = [
    buildRsvpLane(input.event, input.currentRsvp),
    buildCriticalMessageLane(input),
    buildTransportationLane(input.event, input.transportationData),
    buildChangesLane(input.event, input.visibleChanges, input.eventChangeLoadOk),
    buildScheduleConflictLane(input.child, input.conflicts ?? [])
  ];
  const unresolvedItems = lanes.flatMap((lane): ReadinessItem[] => (
    lane.status === "unresolved" && lane.href
      ? [{
        id: `${input.child.id}:${lane.id}`,
        label: `${input.child.label}: ${lane.detail}`,
        href: lane.href
      }]
      : []
  ));

  return {
    child: input.child,
    event: input.event,
    lanes,
    unresolvedItems
  };
}

function buildRsvpLane(event?: FamilyMissionEvent, currentRsvp?: RsvpResponse): ChildReadinessLane {
  if (!event || event.status !== "scheduled") {
    return {
      id: "rsvp",
      label: "RSVP",
      detail: "No upcoming scheduled event",
      status: "neutral"
    };
  }
  if (event.rsvpNeedsAction || !currentRsvp || currentRsvp === "cancelled") {
    return {
      id: "rsvp",
      label: "RSVP",
      detail: event.rsvpOutdated ? "Review RSVP after the schedule change" : "RSVP is required",
      status: "unresolved",
      href: `/parent/rsvp?eventId=${encodeURIComponent(event.eventId)}&playerId=${encodeURIComponent(event.childId)}`
    };
  }
  return {
    id: "rsvp",
    label: "RSVP",
    detail: `Saved as ${rsvpLabel(currentRsvp)}`,
    status: "resolved"
  };
}

function buildCriticalMessageLane(input: {
  event?: FamilyMissionEvent;
  notificationReceipts: NotificationReceipt[];
  notificationLoadOk: boolean;
}): ChildReadinessLane {
  if (!input.event) {
    return {
      id: "critical-message",
      label: "Critical updates",
      detail: "No upcoming event to check",
      status: "neutral"
    };
  }
  if (!input.notificationLoadOk) {
    return {
      id: "critical-message",
      label: "Critical updates",
      detail: "Critical message receipts need verification",
      status: "unresolved",
      href: "/parent/messages#communication-critical"
    };
  }
  const relevantReceipts = input.notificationReceipts.filter((receipt) => (
    isCriticalFamilyReceipt(receipt)
    && receipt.teamId === input.event?.teamId
    && (!receipt.eventId || receipt.eventId === input.event?.eventId)
  ));
  if (!relevantReceipts.length) {
    return {
      id: "critical-message",
      label: "Critical updates",
      detail: "No critical message exists",
      status: "neutral"
    };
  }
  const unacknowledged = relevantReceipts.find((receipt) => !receipt.evidence.acknowledgedAt);
  if (unacknowledged) {
    return {
      id: "critical-message",
      label: "Critical updates",
      detail: "A critical message needs your acknowledgement",
      status: "unresolved",
      href: communicationHref(unacknowledged)
    };
  }
  return {
    id: "critical-message",
    label: "Critical updates",
    detail: "Acknowledged by you",
    status: "resolved"
  };
}

function buildTransportationLane(
  event: FamilyMissionEvent | undefined,
  transportationData: ParentTransportationData
): ChildReadinessLane {
  if (!event || event.status !== "scheduled") {
    return {
      id: "transportation",
      label: "Transportation",
      detail: "Transportation is not required",
      status: "neutral"
    };
  }
  if (!transportationData.ok) {
    return {
      id: "transportation",
      label: "Transportation",
      detail: "Transportation records need verification",
      status: "unresolved",
      href: event
        ? `/parent/transportation?eventId=${encodeURIComponent(event.eventId)}&playerId=${encodeURIComponent(event.childId)}`
        : "/parent/transportation"
    };
  }
  const requests = currentTransportationRequests(transportationData.requests, event);
  const responsibilities = transportationData.responsibilities.filter((responsibility) => (
    responsibility.eventId === event.eventId && responsibility.playerId === event.childId
  ));
  if (responsibilities.some((responsibility) => responsibility.state === "needs_review")) {
    return {
      id: "transportation",
      label: "Transportation",
      detail: "Accepted ride responsibility needs review after a schedule change",
      status: "unresolved",
      href: `/parent/transportation?eventId=${encodeURIComponent(event.eventId)}&playerId=${encodeURIComponent(event.childId)}`
    };
  }
  if (!requests.length) {
    const assigned = responsibilities.filter((responsibility) => responsibility.state === "assigned");
    if (assigned.length && assigned.length === responsibilities.length) {
      return {
        id: "transportation",
        label: "Transportation",
        detail: assigned.map((responsibility) => (
          `${responsibility.direction === "outbound" ? "Outbound" : "Return"}: ${responsibility.adultLabel ?? "Accepted adult"}`
        )).join(" · "),
        status: "resolved"
      };
    }
    if (assigned.length) {
      return {
        id: "transportation",
        label: "Transportation",
        detail: "Ride responsibility is only partly confirmed",
        status: "unresolved",
        href: `/parent/transportation?eventId=${encodeURIComponent(event.eventId)}&playerId=${encodeURIComponent(event.childId)}`
      };
    }
    return {
      id: "transportation",
      label: "Transportation",
      detail: "No ride help requested",
      status: "neutral"
    };
  }
  const unresolved = requests.find((request) => (
    request.state === "open"
    || request.state === "awaiting_requester_acceptance"
    || request.state === "schedule_changed"
  ));
  if (unresolved) {
    return {
      id: "transportation",
      label: "Transportation",
      detail: transportationDetail(unresolved),
      status: "unresolved",
      href: transportationHref(unresolved)
    };
  }
  if (requests.some((request) => request.state === "assigned")) {
    return {
      id: "transportation",
      label: "Transportation",
      detail: "Accepted responsibility is recorded",
      status: "resolved"
    };
  }
  return {
    id: "transportation",
    label: "Transportation",
    detail: "Transportation is not required",
    status: "neutral"
  };
}

function buildChangesLane(
  event: FamilyMissionEvent | undefined,
  changes: ParentEventChange[],
  eventChangeLoadOk: boolean
): ChildReadinessLane {
  if (!event) {
    return {
      id: "changes",
      label: "Event changes",
      detail: "No upcoming event to review",
      status: "neutral"
    };
  }
  if (!eventChangeLoadOk) {
    return {
      id: "changes",
      label: "Event changes",
      detail: "Event changes need verification",
      status: "unresolved",
      href: event
        ? `/parent/schedule?eventId=${encodeURIComponent(event.eventId)}`
        : "/parent/schedule"
    };
  }
  const relevantChanges = changes.filter((change) => change.eventId === event.eventId);
  if (!relevantChanges.length) {
    return {
      id: "changes",
      label: "Event changes",
      detail: "No unreviewed event changes",
      status: "resolved"
    };
  }
  return {
    id: "changes",
    label: "Event changes",
    detail: `${relevantChanges.length} event change${relevantChanges.length === 1 ? "" : "s"} to review`,
    status: "unresolved",
    href: relevantChanges[0].canonicalHref
  };
}

function buildScheduleConflictLane(
  child: FamilyMissionChild,
  conflicts: FamilyMissionConflict[]
): ChildReadinessLane {
  const childConflicts = conflicts.filter((conflict) => conflict.childLabels.includes(child.label));
  if (!childConflicts.length) {
    return {
      id: "schedule-conflict",
      label: "Schedule conflicts",
      detail: "No overlapping child events",
      status: "resolved"
    };
  }
  return {
    id: "schedule-conflict",
    label: "Schedule conflicts",
    detail: `${childConflicts.length} overlapping event${childConflicts.length === 1 ? "" : "s"} to review`,
    status: "unresolved",
    href: `/parent/schedule?playerId=${encodeURIComponent(child.id)}`
  };
}

function currentTransportationRequests(requests: TransportationRequestView[], event: FamilyMissionEvent) {
  return requests.filter((request) => (
    request.eventId === event.eventId
    && request.playerId === event.childId
    && request.state !== "cancelled"
    && request.state !== "expired"
    && request.state !== "withdrawn"
  ));
}

function transportationDetail(request: TransportationRequestView) {
  if (request.state === "schedule_changed") return "Ride request needs review after the event changed";
  if (request.state === "awaiting_requester_acceptance") return "A ride offer awaits requester confirmation";
  return "Ride help was requested and awaits an offer";
}

function transportationHref(request: TransportationRequestView) {
  return `/parent/transportation?eventId=${encodeURIComponent(request.eventId)}&playerId=${encodeURIComponent(request.playerId)}&requestId=${encodeURIComponent(request.id)}#transportation-request-${encodeURIComponent(request.id)}`;
}

function communicationHref(receipt: NotificationReceipt) {
  const parameters = new URLSearchParams({
    teamId: receipt.teamId,
    notificationId: receipt.notificationId
  });
  if (receipt.eventId) parameters.set("eventId", receipt.eventId);
  return `/parent/messages?${parameters.toString()}#communication-message-${encodeURIComponent(receipt.notificationId)}`;
}

function rsvpLabel(response: RsvpResponse) {
  if (response === "going") return "Going";
  if (response === "maybe") return "Maybe";
  if (response === "not_going") return "Can’t go";
  return "Needs reply";
}
