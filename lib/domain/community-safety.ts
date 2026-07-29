import type { AppState, MediaItem, SnackScheduleSlot, VolunteerSignup } from "./types";
import { detectScheduleConflicts } from "./schedule";
import { getLeagueWeatherThresholds, evaluateWeatherThresholds, getWeatherEscalationRules, createFieldClosureDraft } from "./weather";

export type VolunteerMarketplaceCategory =
  | "snack_duty"
  | "scorekeeper"
  | "field_prep"
  | "fundraising"
  | "carpool"
  | "team_parent"
  | "backup_volunteer";

export interface VolunteerMarketplaceJob {
  id: string;
  teamId: string;
  eventId?: string;
  category: VolunteerMarketplaceCategory;
  title: string;
  detail: string;
  actionLabel: string;
  actionStatus: "claimable" | "covered" | "setup_needed";
  claimEndpoint?: "/api/snack-slots/claim" | "/api/volunteer-signups/claim";
  claimPayload?: Record<string, string>;
  reminderBoundary: string;
}

export type EquipmentListingKind = "offer" | "request";

export interface EquipmentExchangeListing {
  id: string;
  teamId: string;
  kind: EquipmentListingKind;
  title: string;
  sizeOrAge: string;
  condition: string;
  moderationLabel: "family_visible" | "admin_review";
  detail: string;
}

export interface WeatherSafetyDecision {
  teamId: string;
  eventId?: string;
  eventTitle: string;
  recommendation: "monitor" | "review" | "delay_or_close";
  conditions: Array<{ label: string; value: string; status: "ok" | "review" }>;
  fieldClosureDraft: string;
  auditRecords: string[];
  boundary: string;
}

export interface SponsorSafeMediaGallery {
  teamId: string;
  approvedItems: Array<{
    id: string;
    title: string;
    type: MediaItem["type"];
    recapLabel: string;
    sponsorFrame: string;
    safeCaption: string;
  }>;
  hiddenCount: number;
  boundary: string;
}

export interface FamilyAvailabilityIntelligence {
  teamId: string;
  teamName: string;
  eventTitle: string;
  responseRate: number;
  missingRsvpCount: number;
  openHelpCount: number;
  scheduleConflictCount: number;
  signal: "ready" | "needs_attention" | "urgent_review";
  summary: string;
  boundary: string;
}

function categoryForVolunteerRole(role: string): VolunteerMarketplaceCategory {
  const normalized = role.toLowerCase();
  if (normalized.includes("score")) return "scorekeeper";
  if (normalized.includes("field") || normalized.includes("setup")) return "field_prep";
  if (normalized.includes("fund")) return "fundraising";
  if (normalized.includes("carpool")) return "carpool";
  if (normalized.includes("team parent")) return "team_parent";
  return "backup_volunteer";
}

function eventDetail(state: AppState, eventId?: string) {
  const event = state.events.find((candidate) => candidate.id === eventId);
  return event ? `${event.title} at ${event.locationName}` : "Team need";
}

function conditionStatus(value: string): "ok" | "review" {
  return value === "review" ? "review" : "ok";
}

function mapSnackSlot(state: AppState, slot: SnackScheduleSlot): VolunteerMarketplaceJob {
  return {
    id: `marketplace-${slot.id}`,
    teamId: slot.teamId,
    eventId: slot.eventId,
    category: "snack_duty",
    title: slot.item,
    detail: `${eventDetail(state, slot.eventId)} snack duty.`,
    actionLabel: slot.status === "open" ? "Claim snack slot" : "Covered",
    actionStatus: slot.status === "open" ? "claimable" : "covered",
    claimEndpoint: slot.status === "open" ? "/api/snack-slots/claim" : undefined,
    claimPayload: slot.status === "open" ? { slotId: slot.id } : undefined,
    reminderBoundary: "Claiming uses the existing authenticated snack endpoint; reminders remain provider-gated."
  };
}

function mapVolunteerSignup(state: AppState, signup: VolunteerSignup): VolunteerMarketplaceJob {
  return {
    id: `marketplace-${signup.id}`,
    teamId: signup.teamId,
    eventId: signup.eventId,
    category: categoryForVolunteerRole(signup.role),
    title: signup.role,
    detail: `${eventDetail(state, signup.eventId)} volunteer role.`,
    actionLabel: signup.status === "open" ? "Claim volunteer role" : "Covered",
    actionStatus: signup.status === "open" ? "claimable" : "covered",
    claimEndpoint: signup.status === "open" ? "/api/volunteer-signups/claim" : undefined,
    claimPayload: signup.status === "open" ? { signupId: signup.id } : undefined,
    reminderBoundary: "Claiming uses the existing authenticated volunteer endpoint; backup reminders stay draft-only."
  };
}

export function buildVolunteerMarketplace(state: AppState, teamId: string): VolunteerMarketplaceJob[] {
  const jobs = [
    ...state.snackScheduleSlots.filter((slot) => slot.teamId === teamId).map((slot) => mapSnackSlot(state, slot)),
    ...state.volunteerSignups.filter((signup) => signup.teamId === teamId).map((signup) => mapVolunteerSignup(state, signup))
  ];
  const existingCategories = new Set(jobs.map((job) => job.category));
  const setupNeeded: Array<{ category: VolunteerMarketplaceCategory; title: string; detail: string }> = [
    { category: "fundraising", title: "Fundraising helper", detail: "Open a reviewed fundraising role before parent claiming." },
    { category: "carpool", title: "Carpool coordinator", detail: "Coach/admin approval required before transportation coordination." },
    { category: "team_parent", title: "Team parent", detail: "Assign a reviewed team-parent role for season coordination." },
    { category: "backup_volunteer", title: "Backup volunteer", detail: "Create a backup list before automatic reminders are allowed." }
  ];

  return [
    ...jobs,
    ...setupNeeded
      .filter((job) => !existingCategories.has(job.category))
      .map((job) => ({
        id: `marketplace-setup-${teamId}-${job.category}`,
        teamId,
        category: job.category,
        title: job.title,
        detail: job.detail,
        actionLabel: "Needs staff setup",
        actionStatus: "setup_needed" as const,
        reminderBoundary: "Setup-needed jobs do not create messages or provider sends."
      }))
  ];
}

export function buildEquipmentExchange(state: AppState, teamId: string, audience: "parent" | "admin" = "parent") {
  const team = state.teams.find((candidate) => candidate.id === teamId);
  const baseListings: EquipmentExchangeListing[] = [
    {
      id: `equipment-${teamId}-cleats-request`,
      teamId,
      kind: "request",
      title: `${team?.division ?? "Youth"} cleats needed`,
      sizeOrAge: "Youth 11-12",
      condition: "Any safe playable condition",
      moderationLabel: "family_visible",
      detail: "Parent-to-parent request shows gear need only; no child name or parent contact is public."
    },
    {
      id: `equipment-${teamId}-glove-offer`,
      teamId,
      kind: "offer",
      title: "Right-hand throw glove available",
      sizeOrAge: "Ages 5-6",
      condition: "Used, coach-reviewed",
      moderationLabel: "family_visible",
      detail: "Pickup details require private team access and staff moderation."
    },
    {
      id: `equipment-${teamId}-helmet-review`,
      teamId,
      kind: "offer",
      title: "Batting helmet offer",
      sizeOrAge: "Youth small",
      condition: "Needs safety review",
      moderationLabel: "admin_review",
      detail: "Safety-sensitive gear remains hidden until an admin or coach reviews it."
    }
  ];

  return audience === "admin" ? baseListings : baseListings.filter((listing) => listing.moderationLabel === "family_visible");
}

export function buildWeatherSafetyDecisionAssistant(state: AppState, teamId: string, now = new Date().toISOString()): WeatherSafetyDecision {
  const team = state.teams.find((candidate) => candidate.id === teamId);
  const event = state.events
    .filter((candidate) => candidate.teamId === teamId && candidate.status === "scheduled" && Date.parse(candidate.startsAt) >= Date.parse(now))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];
  const thresholds = getLeagueWeatherThresholds(team?.division ?? "default");
  const evaluation = evaluateWeatherThresholds({
    heatIndex: thresholds.heatIndex + 1,
    lightningMiles: 12,
    airQualityIndex: thresholds.airQualityIndex + 2,
    rainInchesPerHour: 0.12,
    thresholds
  });
  const escalation = getWeatherEscalationRules(evaluation);
  const fieldClosure = createFieldClosureDraft({
    eventTitle: event?.title ?? "Next event",
    reason: escalation.level === "escalate" ? "multiple safety thresholds are in review" : "one weather threshold needs review"
  });

  return {
    teamId,
    eventId: event?.id,
    eventTitle: event?.title ?? "No scheduled event",
    recommendation: escalation.level === "escalate" ? "delay_or_close" : escalation.level === "review" ? "review" : "monitor",
    conditions: [
      { label: "Heat", value: `${thresholds.heatIndex + 1} heat index`, status: conditionStatus(evaluation.heat) },
      { label: "Lightning", value: "12 miles", status: conditionStatus(evaluation.lightning) },
      { label: "Air quality", value: `${thresholds.airQualityIndex + 2} AQI`, status: conditionStatus(evaluation.airQuality) },
      { label: "Rain", value: "0.12 in/hr", status: conditionStatus(evaluation.rain) }
    ],
    fieldClosureDraft: fieldClosure.body,
    auditRecords: state.weatherAlerts
      .filter((alert) => alert.teamId === teamId)
      .map((alert) => `${alert.headline} - ${alert.status} - ${alert.severity}`),
    boundary: "Safety decisions are documentation and draft guidance only. Staff approval is required before cancellation, closure, or provider delivery."
  };
}

export function buildSponsorSafeMediaGallery(state: AppState, teamId: string): SponsorSafeMediaGallery {
  const approvedItems = state.mediaItems
    .filter((item) => item.teamId === teamId && (item.moderationStatus ?? "approved") === "approved" && (item.visibility ?? "team") === "team")
    .map((item) => {
      const sponsor = state.sponsors.find((candidate) => (
        candidate.status === "active" &&
        (!candidate.teamId || candidate.teamId === teamId) &&
        ["team_portal", "storybook", "field_map"].includes(candidate.placementKey ?? "")
      ));
      return {
        id: item.id,
        title: item.title,
        type: item.type,
        recapLabel: `${item.title} recap page`,
        sponsorFrame: sponsor ? `Framed with approved sponsor ${sponsor.name}` : "No sponsor frame applied",
        safeCaption: "Approved team media only; no child profile, parent contact, EXIF, or private album metadata is exposed."
      };
    });

  return {
    teamId,
    approvedItems,
    hiddenCount: state.mediaItems.filter((item) => item.teamId === teamId && (item.moderationStatus === "hidden" || item.moderationStatus === "pending" || item.moderationStatus === "removed" || item.moderationStatus === "rejected")).length,
    boundary: "Sponsor-safe galleries can acknowledge approved sponsors around recap pages, but they do not target children, reveal private metadata, or override media moderation."
  };
}

export function buildFamilyAvailabilityIntelligence(state: AppState, teamId: string, now = new Date().toISOString()): FamilyAvailabilityIntelligence {
  const team = state.teams.find((candidate) => candidate.id === teamId);
  const event = state.events
    .filter((candidate) => candidate.teamId === teamId && candidate.status === "scheduled" && Date.parse(candidate.startsAt) >= Date.parse(now))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];
  const players = state.players.filter((player) => player.teamId === teamId);
  const rsvps = event ? state.rsvps.filter((rsvp) => rsvp.eventId === event.id) : [];
  const missingRsvpCount = Math.max(players.length - rsvps.length, 0);
  const responseRate = players.length ? Math.round((rsvps.length / players.length) * 100) : 0;
  const openHelpCount = state.snackScheduleSlots.filter((slot) => slot.teamId === teamId && slot.status === "open").length +
    state.volunteerSignups.filter((signup) => signup.teamId === teamId && signup.status === "open").length;
  const scheduleConflicts = event ? detectScheduleConflicts(state, {
    eventId: event.id,
    teamId: event.teamId,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    locationName: event.locationName
  }) : [];
  const signal = scheduleConflicts.length || missingRsvpCount >= 3
    ? "urgent_review"
    : missingRsvpCount || openHelpCount
      ? "needs_attention"
      : "ready";

  return {
    teamId,
    teamName: team?.name ?? "Team",
    eventTitle: event?.title ?? "No upcoming event",
    responseRate,
    missingRsvpCount,
    openHelpCount,
    scheduleConflictCount: scheduleConflicts.length,
    signal,
    summary: `${missingRsvpCount} missing RSVP(s), ${openHelpCount} help opening(s), ${scheduleConflicts.length} schedule conflict(s).`,
    boundary: "Availability intelligence is aggregate only. It never ranks, shames, or exposes individual parent reliability."
  };
}
