import type { AppState, LeagueEvent, Rsvp } from "@/lib/domain";
import type { FamilyEventHandoff } from "@/lib/supabase/family-flight-plan";

export type MissionControlState =
  | "ready"
  | "needs_attention"
  | "empty"
  | "access_pending"
  | "partial"
  | "offline_stale";

export interface FamilyMissionChild {
  id: string;
  label: string;
  teamId: string;
  teamName: string;
}

export interface FamilyMissionEvent {
  projectionId: string;
  eventId: string;
  scheduleVersion: number;
  childId: string;
  childLabel: string;
  teamId: string;
  teamName: string;
  title: string;
  activityLabel: string;
  dateLabel: string;
  startLabel: string;
  startsAt: string;
  endsAt: string;
  arrivalLabel: string;
  leaveLabel: string;
  opponentLabel: string;
  venueLabel: string;
  addressLabel: string;
  fieldLabel: string;
  status: "scheduled" | "cancelled" | "completed";
  statusLabel: string;
  rsvpLabel: string;
  rsvpNeedsAction: boolean;
  rsvpOutdated: boolean;
  responsibleAdultLabel: string;
  outboundResponsibilityLabel: string;
  returnResponsibilityLabel: string;
  handoffLabel?: string;
  bringLabel: string;
  changed: boolean;
  changedLabel: string;
  sourceLabel: string;
  freshnessLabel: string;
  primaryAction: {
    label: string;
    href: string;
  };
  directionsUrl?: string;
  unresolved: string[];
}

export interface FamilyMissionConflict {
  id: string;
  leftProjectionId: string;
  rightProjectionId: string;
  childLabels: string[];
  summary: string;
  evidence: string;
}

export interface FamilyMissionControlView {
  state: MissionControlState;
  stateLabel: string;
  message: string;
  children: FamilyMissionChild[];
  events: FamilyMissionEvent[];
  nextEvent?: FamilyMissionEvent;
  conflicts: FamilyMissionConflict[];
  criticalChange?: {
    eventId: string;
    title: string;
    summary: string;
  };
  isLive: boolean;
  observedAt: string;
  weekEndsAt: string;
  offlineLabel: string;
}

export interface FamilyTransportationResponsibility {
  eventId: string;
  playerId: string;
  direction: "outbound" | "return";
  state: "assigned" | "unassigned" | "needs_review";
  adultLabel?: string;
  scheduleVersion?: number;
}

export function buildFamilyMissionControl(input: {
  state: AppState;
  parentUserId: string;
  handoffs: FamilyEventHandoff[];
  transportationResponsibilities?: FamilyTransportationResponsibility[];
  accessStatus: "live" | "signed_out" | "missing_parent_link" | "missing_coach_membership" | "unavailable";
  isSupabaseBacked: boolean;
  message: string;
  now: string;
}): FamilyMissionControlView {
  if (input.accessStatus !== "live") {
    return {
      state: input.accessStatus === "unavailable" ? "partial" : "access_pending",
      stateLabel: input.accessStatus === "unavailable" ? "Needs verification" : "Access pending",
      message: input.message,
      children: [],
      events: [],
      conflicts: [],
      isLive: false,
      observedAt: input.now,
      weekEndsAt: new Date(Date.parse(input.now) + 7 * 24 * 60 * 60 * 1000).toISOString(),
      offlineLabel: "No private event pack is available."
    };
  }

  const activeLinks = input.state.guardianLinks.filter((link) => (
    link.parentUserId === input.parentUserId && link.status === "active"
  ));
  const linkedPlayerIds = new Set(activeLinks.map((link) => link.playerId));
  const players = input.state.players.filter((player) => linkedPlayerIds.has(player.id));
  const teamsById = new Map(input.state.teams.map((team) => [team.id, team]));
  const children: FamilyMissionChild[] = players.map((player) => ({
    id: player.id,
    label: `${player.firstName} ${player.lastInitial}.`,
    teamId: player.teamId,
    teamName: teamsById.get(player.teamId)?.name ?? "Linked team"
  }));

  const nowTime = Date.parse(input.now);
  const teamIds = new Set(children.map((child) => child.teamId));
  const candidateEvents = input.state.events
    .filter((event) => teamIds.has(event.teamId))
    .filter((event) => event.status !== "completed" && Date.parse(event.endsAt) >= nowTime)
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const events = children
    .flatMap((child) => candidateEvents
      .filter((event) => event.teamId === child.teamId)
      .map((event) => buildMissionEvent({
        event,
        child,
        rsvp: input.state.rsvps.find((item) => item.eventId === event.id && item.playerId === child.id),
        handoff: input.handoffs.find((item) => (
          item.eventId === event.id &&
          item.playerId === child.id &&
          !item.cancelledAt
        )),
        transportationResponsibilities: (input.transportationResponsibilities ?? []).filter((item) => (
          item.eventId === event.id && item.playerId === child.id
        )),
        isLive: input.isSupabaseBacked
      })))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const conflicts = buildConflicts(events);
  const nextEvent = events.find((event) => event.status === "scheduled") ?? events[0];
  const changedEvent = events.find((event) => event.status === "cancelled" || event.changed);
  const needsAttention = Boolean(
    changedEvent ||
    conflicts.length ||
    nextEvent?.unresolved.length ||
    nextEvent?.rsvpNeedsAction
  );

  return {
    state: !children.length ? "access_pending" : !events.length ? "empty" : needsAttention ? "needs_attention" : "ready",
    stateLabel: !children.length
      ? "Access pending"
      : !events.length
        ? "No upcoming events"
        : needsAttention
          ? "Needs attention"
          : "Ready",
    message: !children.length
      ? "No active child links are available for this guardian."
      : !events.length
        ? "No upcoming official events are visible for linked children."
        : "Official schedule facts and family-owned responses are shown separately.",
    children,
    events,
    nextEvent,
    conflicts,
    criticalChange: changedEvent ? {
      eventId: changedEvent.eventId,
      title: changedEvent.status === "cancelled" ? "Official cancellation" : "Official schedule version changed",
      summary: changedEvent.status === "cancelled"
        ? `${changedEvent.childLabel} · ${changedEvent.teamName} · ${changedEvent.title} is cancelled.`
        : `${changedEvent.childLabel} · ${changedEvent.teamName} · ${changedEvent.title} is now schedule version ${changedEvent.scheduleVersion}. Review current details.`
    } : undefined,
    isLive: input.isSupabaseBacked,
    observedAt: input.now,
    weekEndsAt: new Date(nowTime + 7 * 24 * 60 * 60 * 1000).toISOString(),
    offlineLabel: input.isSupabaseBacked
      ? "Offline pack not confirmed on this device."
      : "Current private data could not be confirmed for offline use."
  };
}

function buildMissionEvent(input: {
  event: LeagueEvent;
  child: FamilyMissionChild;
  rsvp?: Rsvp;
  handoff?: FamilyEventHandoff;
  transportationResponsibilities: FamilyTransportationResponsibility[];
  isLive: boolean;
}): FamilyMissionEvent {
  const version = input.event.scheduleVersion ?? 1;
  const rsvpOutdated = Boolean(
    input.rsvp &&
    typeof input.rsvp.confirmedScheduleVersion === "number" &&
    input.rsvp.confirmedScheduleVersion < version
  );
  const rsvpNeedsAction = input.event.status === "scheduled" && (!input.rsvp || rsvpOutdated);
  const outboundResponsibility = input.transportationResponsibilities.find((item) => item.direction === "outbound");
  const returnResponsibility = input.transportationResponsibilities.find((item) => item.direction === "return");
  const outboundResponsibilityLabel = responsibilityLabel(outboundResponsibility);
  const returnResponsibilityLabel = responsibilityLabel(returnResponsibility);
  const unresolved = [
    "Official arrival time",
    "Family leave time",
    "Field",
    "Bring list"
  ];
  if (outboundResponsibility?.state !== "assigned") unresolved.push("Outbound responsibility");
  if (returnResponsibility?.state !== "assigned") unresolved.push("Return responsibility");
  if (input.handoff) unresolved.push("Transportation responsibility");
  if (rsvpNeedsAction) unresolved.push(rsvpOutdated ? "RSVP after schedule change" : "RSVP");
  const changed = version > 1;
  const directionsUrl = isPublished(input.event.locationAddress)
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${input.event.locationName} ${input.event.locationAddress}`)}`
    : undefined;

  return {
    projectionId: `${input.event.id}:${input.child.id}`,
    eventId: input.event.id,
    scheduleVersion: version,
    childId: input.child.id,
    childLabel: input.child.label,
    teamId: input.child.teamId,
    teamName: input.child.teamName,
    title: input.event.title,
    activityLabel: formatActivity(input.event.eventType),
    dateLabel: formatDate(input.event.startsAt),
    startLabel: formatTime(input.event.startsAt),
    startsAt: input.event.startsAt,
    endsAt: input.event.endsAt,
    arrivalLabel: "Not published",
    leaveLabel: "Not planned",
    opponentLabel: input.event.eventType === "game"
      ? input.event.opponent || "Not published"
      : "Not applicable",
    venueLabel: isPublished(input.event.locationName) ? input.event.locationName : "Not published",
    addressLabel: isPublished(input.event.locationAddress) ? input.event.locationAddress : "Not published",
    fieldLabel: "Not separately published",
    status: input.event.status,
    statusLabel: input.event.status === "scheduled"
      ? changed ? "Scheduled · changed" : "Scheduled"
      : input.event.status === "cancelled" ? "Cancelled" : "Completed",
    rsvpLabel: rsvpOutdated
      ? "Review after schedule change"
      : input.rsvp
        ? formatRsvp(input.rsvp.response)
        : "Not answered",
    rsvpNeedsAction,
    rsvpOutdated,
    responsibleAdultLabel: outboundResponsibility?.state === "assigned" && returnResponsibility?.state === "assigned"
      ? `Outbound: ${outboundResponsibility.adultLabel} · Return: ${returnResponsibility.adultLabel}`
      : "Not fully assigned",
    outboundResponsibilityLabel,
    returnResponsibilityLabel,
    handoffLabel: input.handoff
      ? `${input.handoff.caregiverLabel} · coordination note only`
      : undefined,
    bringLabel: "Not published",
    changed,
    changedLabel: changed
      ? `Current official projection is version ${version}. Before/after details and publisher attribution are not available in this view.`
      : `Current official projection is version ${version}; no later version is visible.`,
    sourceLabel: `Official team schedule · version ${version}`,
    freshnessLabel: input.isLive ? `Loaded live · updated ${formatTimestamp(input.event.updatedAt)}` : "Needs verification",
    primaryAction: rsvpNeedsAction
      ? { label: rsvpOutdated ? "Review RSVP" : "RSVP now", href: "/parent/rsvp" }
      : outboundResponsibility?.state !== "assigned" || returnResponsibility?.state !== "assigned"
        ? { label: "Coordinate transportation", href: "/parent/transportation" }
      : directionsUrl
        ? { label: "Get directions", href: directionsUrl }
        : { label: "View schedule", href: "/parent/schedule" },
    directionsUrl,
    unresolved
  };
}

function responsibilityLabel(responsibility?: FamilyTransportationResponsibility) {
  if (responsibility?.state === "assigned") return `${responsibility.adultLabel ?? "Accepted adult"} · mutually accepted`;
  if (responsibility?.state === "needs_review") return "Needs review after schedule change";
  return "Not assigned";
}

function buildConflicts(events: FamilyMissionEvent[]) {
  const conflicts: FamilyMissionConflict[] = [];
  for (let leftIndex = 0; leftIndex < events.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < events.length; rightIndex += 1) {
      const left = events[leftIndex];
      const right = events[rightIndex];
      if (
        left.eventId === right.eventId ||
        left.childId === right.childId ||
        left.status !== "scheduled" ||
        right.status !== "scheduled"
      ) continue;
      const overlaps = Date.parse(left.startsAt) < Date.parse(right.endsAt) &&
        Date.parse(right.startsAt) < Date.parse(left.endsAt);
      if (!overlaps) continue;
      conflicts.push({
        id: `${left.projectionId}|${right.projectionId}`,
        leftProjectionId: left.projectionId,
        rightProjectionId: right.projectionId,
        childLabels: [left.childLabel, right.childLabel],
        summary: `${left.childLabel} and ${right.childLabel} have overlapping official event times.`,
        evidence: `${left.startLabel} ${left.title} · ${right.startLabel} ${right.title}. Travel time is not included.`
      });
    }
  }
  return conflicts;
}

function isPublished(value?: string) {
  return Boolean(value && !/tbd|pending|unknown/i.test(value));
}

function formatActivity(value: LeagueEvent["eventType"]) {
  return value === "team_event" ? "Team event" : value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRsvp(value: Rsvp["response"]) {
  return {
    going: "Going",
    not_going: "Not going",
    maybe: "Unsure",
    cancelled: "Cancelled"
  }[value];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
