"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition, type CSSProperties, type ChangeEvent, type ReactNode } from "react";
import { useAppState } from "@/app/providers";
import {
  captureOfflineOwnerGeneration,
  clearPrivateGameDayData,
  queueOfflineGameDayAction,
  syncContextOutbox,
  type OfflineGameDayAction,
  type QueueOfflineGameDayActionInput
} from "@/lib/offline/game-day-outbox";
import {
  NOW,
  analyzeRosterCsv,
  applyScheduleChange,
  buildAdminAssistiveSuggestions,
  buildPublicEventCalendarActions,
  buildCoachAssistiveSuggestions,
  canUpdateTeamPortalBranding,
  communicationTemplates,
  computeAdminHealth,
  computeSeasonPlanningMetrics,
  defaultTeamCommunicationCopy,
  detectScheduleConflicts,
  getCoachRsvpReliability,
  getCoachRsvpSummaries,
  getParentDashboard,
  getTeamChatView,
  generateParentReplayDraft,
  exportTeamCalendarIcs,
  getProgramThemePreset,
  getScheduleRsvpSyncRows,
  getEventStatusTracking,
  getNotificationRetryLogs,
  getDeviceManagementSummary,
  getEmailFallbackPlan,
  defaultPracticeFocusAreas,
  getNotificationChannelReadiness,
  getScheduleNotificationWorkflow,
  getVapidSendAdapterStatus,
  recipientAllowsNotification,
  getAlertOpenRateTracking,
  smsUrgencyAllowed,
  getSportWeatherThresholds,
  evaluateWeatherThresholds,
  getLeagueWeatherThresholds,
  getWeatherAlertHistory,
  getWeatherApprovalQueue,
  getWeatherProviderRetryLogs,
  createFieldClosureDraft,
  getWeatherEscalationRules,
  getWeatherSafetyNotes,
  getEmbeddedMapUi,
  getFieldLayoutMetadata,
  getMapQuotaStatus,
  getVenueAmenityNotes,
  getVenueMarkers,
  getVenuePage,
  getArrivalInstructions,
  getMapFallbackUx,
  getVenueIntelligence,
  highlightLocationChange,
  getFacilityNotes,
  getTeamChatReportingSummary,
  getTeamChatRetentionJobs,
  getMediaMessagePolicyScreens,
  getVenueRecords,
  platformFeatureTiers,
  previewTeamCommunication,
  previewScheduleChangeImpact,
  previewRecurringEvents,
  publicArrivalLabel,
  programThemePresets,
  roleLabel,
  sampleRosterCsv,
  updateTeamPortalBranding,
  validateRegistrationRequestInput,
  validateMediaUrl,
  getMediaReportingSummary,
  getUploadStorageProviderStatus,
  getFamilyFacingModerationQueue,
  getMediaRetentionPolicy,
  canViewMediaByRole,
  getMediaConsentControls,
  getPerPlayerMediaConsent,
  getPhotoVisibilityFlags,
  getPrivateTeamAlbum,
  getParentSubmittedMoments,
  getVolunteerMoments,
  exportSeasonMemories,
  getSnackReminders,
  getSnackConflicts,
  getSnackAuditTrail,
  cancelSnackSlot,
  getVolunteerRoleCaps,
  getVolunteerReminders,
  cancelVolunteerSignup,
  getVolunteerApprovalPolicies,
  getSnackVolunteerFairness,
  getDutyRotation,
  getFamilyOptOuts,
  getSiblingAwareDutyAssignments,
  getMissedSlotTracking,
  getSponsorPublicDisplayPolicy,
  getTeamPortalSponsorPlacement,
  getScheduleSponsorPlacement,
  getMediaGallerySponsorPlacement,
  getEmailSponsorPlacement,
  getBannerSponsorPlacement,
  buildSponsorBillingProofs,
  buildFamilyBalanceSummary,
  buildLeagueRevenueSummary,
  buildLocalBusinessTeamPage,
  buildSponsorOpportunities,
  buildVolunteerMarketplace,
  buildEquipmentExchange,
  buildWeatherSafetyDecisionAssistant,
  buildSponsorSafeMediaGallery,
  buildFamilyAvailabilityIntelligence,
  previewBalancedTeamBuild,
  getTouchTargetQa,
  getOfflineStateSummary,
  getAccessibilityContrastChecks,
  getPromptEvalHarness,
  getPrivacyFilters,
  youtubePrivacyEmbedUrl,
  buildAiCoachWorkspaceDrafts,
  generateRookieCoachAssist,
  rookieCoachAgeBandOptions,
  rookieCoachChallengeOptions,
  rookieCoachExperienceOptions,
  rookieCoachMotivationStrategyOptions,
  rookieCoachPracticePersonalityOptions,
  buildBrandLaunchValidation,
  type AiCoachWorkspaceDraft,
  type ChatAnnouncementTopic,
  type CommunicationTemplate,
  type DrillVideo,
  type DrillVideoAssignment,
  type DrillVideoDifficulty,
  type DrillVideoSource,
  type EventType,
  type EventStatus,
  type LeagueEvent,
  type MediaItem,
  type NotificationChannel,
  type ParentReplayDraft,
  type ParentReplayRecord,
  type PracticeFocusArea,
  type ProgramThemeKey,
  type RegistrationRequest,
  type RookieCoachAgeBand,
  type RookieCoachChallenge,
  type RookieCoachExperienceLevel,
  type RookieCoachMotivationStrategy,
  type RookieCoachPracticePersonality,
  type RsvpResponse,
  type Sponsor,
  type Team,
  type UserRole
} from "@/lib/domain";
import { createSupabaseBrowserClient, getSupabaseBrowserConfigStatus, getSupabaseEmailRedirectTo } from "@/lib/supabase/browser";
import type { DrillVideoLibraryData } from "@/lib/supabase/drill-videos";
import type { MediaGovernanceData } from "@/lib/supabase/media-governance";
import type { RegistrationReviewData } from "@/lib/supabase/registration-approvals";
import type { SponsorAdminData } from "@/lib/supabase/sponsors";
import type { TeamPortalData } from "@/lib/supabase/team-portal";
import type { AdminThemeData, TeamLogoAsset, TeamThemeAudit, TenantThemeDefaults } from "@/lib/supabase/team-branding";
import type { TeamChatData } from "@/lib/supabase/team-chat";
import type { TenantReadinessData, TenantReadinessCheckStatus } from "@/lib/supabase/tenant-readiness";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import type { CoachDraftReviewData } from "@/lib/supabase/coach-drafts";
import type { PracticeRunReceipt } from "@/lib/supabase/practice-runs";
import type { AdminTeamManagementData } from "@/lib/supabase/team-management";
import type { ScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { buildFamilyMissionControl } from "@/lib/family-mission-control";
import {
  EventPassport,
  FamilyFilter,
  RsvpControl,
  responseLabel
} from "@/components/family";
import {
  buildAdminSeasonCertaintyView,
  buildCoachSeasonCertaintyView,
  buildParentSeasonCertaintyView
} from "@/lib/season-certainty";
import {
  ActionChecklist,
  AttendanceRosterCard,
  CoachUpdateCard,
  DraftsToReviewCard,
  EventReadinessCard,
  LeagueHealthSummaryCard,
  MessagesSummaryCard,
  NextEventCard,
  PendingActionsPanel,
  PhotosSummaryCard,
  PracticeRecapCard,
  PrivacyIndicator,
  RegistrationQueueCard,
  SecurityStatusCard,
  TeamStatusTable,
  WeatherFieldCard,
  WhatChangedCard
} from "@/components/season-certainty-cards";
import {
  CoachAnnouncementTicker,
  CoachGameDayRadar,
  ParentSeasonStory,
  SponsorCommunityProofLedger,
  type CoachRadarTask,
  type ParentSeasonStoryEntry,
  type SponsorProofLedgerRow
} from "@/components/role-dashboard-experiences";
import { AiCoachWorkspacePanel } from "@/components/ai-coach-workspace-panel";
import {
  AvatarStack,
  BreadcrumbTrail,
  BroadcastMode,
  Chip,
  Divider,
  EmptyState,
  PageHeader,
  PinnedMessagesBar,
  ReadReceipt,
  StatusBadge,
  Tooltip,
  Toggle,
  TypingIndicator
} from "@/components/ui/primitives";
import type { AiCoachProviderReadiness } from "@/lib/services/ai-coach";

interface RegistrationTeamOption {
  id: string;
  name: string;
  division: string;
}

const lineupPositionDefs = [
  { id: "pitcher", label: "Pitcher", shortLabel: "P", x: 240, y: 170 },
  { id: "catcher", label: "Catcher", shortLabel: "C", x: 240, y: 284 },
  { id: "first_base", label: "First", shortLabel: "1B", x: 354, y: 170 },
  { id: "second_base", label: "Second", shortLabel: "2B", x: 296, y: 110 },
  { id: "shortstop", label: "Short", shortLabel: "SS", x: 184, y: 110 },
  { id: "third_base", label: "Third", shortLabel: "3B", x: 126, y: 170 },
  { id: "left_field", label: "Left", shortLabel: "LF", x: 104, y: 58 },
  { id: "center_field", label: "Center", shortLabel: "CF", x: 240, y: 34 },
  { id: "right_field", label: "Right", shortLabel: "RF", x: 376, y: 58 }
] as const;

type LineupPositionId = typeof lineupPositionDefs[number]["id"];
type AdminCommunicationChannel = Extract<NotificationChannel, "email" | "sms">;

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatCents(value: number) {
  return `$${(value / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCalendarMonth(value?: string) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildCalendarDays(events: LeagueEvent[], selectedEventId: string) {
  const sortedEvents = [...events].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const selectedEvent = sortedEvents.find((item) => item.id === selectedEventId) ?? sortedEvents[0];
  const anchor = selectedEvent ? new Date(selectedEvent.startsAt) : new Date();
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const eventsByDay = new Map<string, LeagueEvent[]>();
  sortedEvents.forEach((event) => {
    const key = getDateKey(event.startsAt);
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
  });

  const days: Array<{
    key: string;
    day: number;
    inMonth: boolean;
    events: LeagueEvent[];
  }> = [];
  for (const cursor = new Date(gridStart); cursor <= gridEnd; cursor.setDate(cursor.getDate() + 1)) {
    const day = new Date(cursor);
    days.push({
      key: getDateKey(day),
      day: day.getDate(),
      inMonth: day.getMonth() === anchor.getMonth(),
      events: eventsByDay.get(getDateKey(day)) ?? []
    });
  }

  return {
    monthLabel: formatCalendarMonth(anchor.toISOString()),
    days
  };
}

function getDefaultScheduleEventId(events: LeagueEvent[]) {
  const nowMs = Date.parse(NOW);
  const sortedEvents = [...events].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  return sortedEvents.find((event) => event.status === "scheduled" && Date.parse(event.startsAt) >= nowMs)?.id
    ?? sortedEvents.find((event) => event.status === "scheduled")?.id
    ?? sortedEvents[0]?.id
    ?? "";
}

function publicEventDateParts(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  };
}

function PublicScheduleAgenda({
  event,
  events,
  onSelectEvent,
  teams
}: {
  event?: LeagueEvent;
  events: LeagueEvent[];
  onSelectEvent: (eventId: string) => void;
  teams: Team[];
}) {
  const teamNameById = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt)),
    [events]
  );
  const selectedTeamName = event ? teamNameById.get(event.teamId) ?? "Team" : "Team";
  const selectedActions = event ? buildPublicEventCalendarActions(event, selectedTeamName) : null;
  const directionsUrl = event
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.locationName, event.locationAddress].filter(Boolean).join(", "))}`
    : "";

  function chooseEvent(eventId: string) {
    onSelectEvent(eventId);
  }

  return (
    <section className="public-agenda-layout" aria-label="Public league schedule">
      <div className="public-agenda-list">
        <header>
          <div>
            <span className="eyebrow">Agenda</span>
            <h2>League events</h2>
          </div>
          <span className="badge">{sortedEvents.length} event(s)</span>
        </header>
        {sortedEvents.length ? sortedEvents.map((item) => {
          const dateParts = publicEventDateParts(item.startsAt);
          const teamName = teamNameById.get(item.teamId) ?? "Team";
          return (
            <article className={`public-agenda-row${item.id === event?.id ? " selected" : ""}`} key={item.id}>
              <time dateTime={item.startsAt}>
                <strong>{dateParts.date}</strong>
                <span>{dateParts.time}</span>
              </time>
              <div className="public-agenda-primary">
                <span>{teamName}</span>
                <h3>{item.title}</h3>
                <p>{item.eventType.replace(/_/g, " ")}{item.opponent ? ` against ${item.opponent}` : ""}</p>
              </div>
              <dl>
                <div><dt>Arrival</dt><dd>{publicArrivalLabel(item)}</dd></div>
                <div><dt>Venue</dt><dd>{item.locationAddress || "Not published"}</dd></div>
                <div><dt>Field</dt><dd>{item.locationName || "Not published"}</dd></div>
              </dl>
              <div className="public-agenda-action">
                <span className={`season-status state-${item.status === "cancelled" ? "error" : item.status === "completed" ? "ready" : "needs_attention"}`}>{item.status}</span>
                <button
                  aria-current={item.id === event?.id ? "true" : undefined}
                  className="secondary"
                  data-analytics-event="public_schedule_event_opened"
                  onClick={() => chooseEvent(item.id)}
                  type="button"
                >
                  View event
                </button>
              </div>
            </article>
          );
        }) : <p className="notice">No public events are available yet. Check again after the league publishes its schedule.</p>}
      </div>

      <aside className="public-event-passport" aria-labelledby="public-event-passport-title">
        {event && selectedActions ? (
          <>
            <div className="public-event-passport-heading">
              <div>
                <span className="eyebrow">Event details</span>
                <h2 id="public-event-passport-title">{event.title}</h2>
              </div>
              <span className={`season-status state-${event.status === "cancelled" ? "error" : event.status === "completed" ? "ready" : "needs_attention"}`}>{event.status}</span>
            </div>
            <dl className="public-event-facts">
              <div><dt>Team</dt><dd>{selectedTeamName}</dd></div>
              <div><dt>Activity</dt><dd>{event.eventType.replace(/_/g, " ")}</dd></div>
              <div><dt>Date and time</dt><dd>{publicEventDateParts(event.startsAt).date}, {publicEventDateParts(event.startsAt).time}</dd></div>
              <div><dt>Arrival time</dt><dd>{publicArrivalLabel(event)}</dd></div>
              <div><dt>Opponent</dt><dd>{event.opponent ?? "Not applicable"}</dd></div>
              <div><dt>Venue</dt><dd>{event.locationAddress || "Not published"}</dd></div>
              <div><dt>Field</dt><dd>{event.locationName || "Not published"}</dd></div>
            </dl>
            {event.status === "cancelled" ? (
              <p className="notice danger">This event is cancelled. Do not rely on a saved calendar copy for current status.</p>
            ) : (
              <p className="notice">Arrival guidance has not been published for this event. Confirm current details before leaving.</p>
            )}
            <div className="public-calendar-actions" aria-label="Add this event to a calendar">
              <a data-analytics-event="calendar_add_apple" download={selectedActions.fileName} href={selectedActions.appleUrl}>Apple Calendar</a>
              <a data-analytics-event="calendar_add_google" href={selectedActions.googleUrl} rel="noreferrer" target="_blank">Google Calendar</a>
              <a data-analytics-event="calendar_add_outlook" href={selectedActions.outlookUrl} rel="noreferrer" target="_blank">Outlook</a>
              <a data-analytics-event="calendar_download" download={selectedActions.fileName} href={selectedActions.downloadUrl}>Download calendar</a>
            </div>
            <a className="button secondary" href={directionsUrl} rel="noreferrer" target="_blank">Open directions</a>
            <small>Saved calendar copies do not update official LeaguePilot schedule truth.</small>
          </>
        ) : (
          <p className="notice">Choose an event to see its public details.</p>
        )}
      </aside>
    </section>
  );
}

function ScheduleMonthCalendar({
  events,
  teams,
  selectedEventId,
  onSelectEvent
}: {
  events: LeagueEvent[];
  teams: Team[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
}) {
  const calendar = useMemo(() => buildCalendarDays(events, selectedEventId), [events, selectedEventId]);
  const teamNameById = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);

  return (
    <article className="card stack calendar-month-card">
      <div className="card-header">
        <div>
          <span className="eyebrow">Calendar</span>
          <h2>{calendar.monthLabel}</h2>
        </div>
        <span className="badge warning">{events.length} event(s)</span>
      </div>
      <div className="month-calendar" role="grid" aria-label={`${calendar.monthLabel} schedule`}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span className="month-calendar-head" role="columnheader" key={day}>{day}</span>
        ))}
        {calendar.days.map((day) => {
          const firstEvent = day.events[0];
          const isSelectedDay = day.events.some((item) => item.id === selectedEventId);
          const content = (
            <>
              <span className="month-calendar-date">{day.day}</span>
              {day.events.slice(0, 2).map((item) => (
                <span className="month-calendar-event" key={item.id}>
                  {item.title}
                  <small>{teamNameById.get(item.teamId) ?? "Team"}</small>
                </span>
              ))}
              {day.events.length > 2 ? <span className="month-calendar-more">+{day.events.length - 2} more</span> : null}
            </>
          );

          return firstEvent ? (
            <button
              aria-pressed={isSelectedDay}
              className={`month-calendar-day has-event${day.inMonth ? "" : " outside-month"}`}
              key={day.key}
              onClick={() => onSelectEvent(firstEvent.id)}
              type="button"
            >
              {content}
            </button>
          ) : (
            <span className={`month-calendar-day${day.inMonth ? "" : " outside-month"}`} key={day.key} role="gridcell">
              {content}
            </span>
          );
        })}
      </div>
    </article>
  );
}

function formatShortDay(value?: string) {
  if (!value) return "No date set";
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatShortTime(value?: string) {
  if (!value) return "Time pending";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function statusClass(status: string) {
  if (status === "valid" || status === "ok" || status === "eligible" || status === "accepted") return "ok";
  if (status === "error" || status === "danger" || status === "expired" || status === "failed") return "danger";
  return "warning";
}

function privateAccessGate(
  dashboardData: ParentCoachDashboardData | null | undefined,
  surface: "parent" | "coach"
) {
  if (!dashboardData || dashboardData.accessStatus === "live") return null;

  const copy = {
    signed_out: {
      title: surface === "parent" ? "Sign in to see family records." : "Sign in to see assigned team records.",
      body: dashboardData.message,
      actionHref: "/auth",
      actionLabel: "Open sign in"
    },
    missing_parent_link: {
      title: "No approved child link is active for this account.",
      body: "A league admin needs to approve registration or connect this signed-in adult to a player before private schedules, RSVP forms, media, or coach updates appear.",
      actionHref: "/registration",
      actionLabel: "Submit registration request"
    },
    missing_coach_membership: {
      title: "No active coach membership is assigned to this account.",
      body: "An organization admin needs to grant an active coach team membership before attendance, weather, snack, volunteer, or replay workflows appear.",
      actionHref: "/account",
      actionLabel: "Check account access"
    },
    unavailable: {
      title: "Private dashboard data is unavailable.",
      body: dashboardData.message,
      actionHref: "/account",
      actionLabel: "Check account access"
    }
  }[dashboardData.accessStatus];

  return (
    <section className="grid two">
      <article className="card stack access-state">
        <span className="eyebrow">Access required</span>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <a className="button" href={copy.actionHref}>{copy.actionLabel}</a>
      </article>
      <article className="card stack">
        <h2>{surface === "coach" ? "Coach role access checklist" : "What stays protected"}</h2>
        <p>Private child, team, RSVP, media, weather, snack, volunteer, and coach workflow rows stay hidden until the signed-in account has the required approved relationship.</p>
        <p className="muted">{surface === "coach" ? "A user account is not enough; the coach route requires an active coach team membership." : "Signup proves identity only; team or guardian records grant access."}</p>
      </article>
    </section>
  );
}

function CompactDisclosure({
  id,
  title,
  summary,
  badge,
  className = "",
  defaultOpen = false,
  children
}: {
  id?: string;
  title: string;
  summary: string;
  badge?: string;
  className?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={`compact-disclosure ${className}`.trim()} id={id} open={defaultOpen}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{summary}</small>
        </span>
        {badge ? <em>{badge}</em> : null}
      </summary>
      <div className="compact-disclosure-body">
        {children}
      </div>
    </details>
  );
}

type GameDayChecklistItem = {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
};

type GameDayPlanItem = {
  id: string;
  label: string;
  detail: string;
  href?: string;
  actionLabel?: string;
};

function ParentGameDayCalmCard({
  eventTitle,
  eventMeta,
  eventStartsAt,
  eventKind,
  teamLabel,
  teamInitials,
  badge,
  location,
  directionsUrl,
  rsvpCopy,
  rsvpRequired,
  playerLabel,
  weatherCopy,
  helpCopy,
  coachCopy,
  primaryHref,
  primaryLabel,
  arrivalPlan,
  packList,
  fieldPlan,
  playerPlan,
  copyStatus,
  onCopyPlan,
  onTogglePackItem
}: {
  eventTitle: string;
  eventMeta: string;
  eventStartsAt?: string;
  eventKind: string;
  teamLabel: string;
  teamInitials: string;
  badge: string;
  location: string;
  directionsUrl?: string;
  rsvpCopy: string;
  rsvpRequired: boolean;
  playerLabel: string;
  weatherCopy: string;
  helpCopy: string;
  coachCopy: string;
  primaryHref: string;
  primaryLabel: string;
  arrivalPlan: GameDayPlanItem[];
  packList: GameDayChecklistItem[];
  fieldPlan: GameDayPlanItem[];
  playerPlan: GameDayPlanItem[];
  copyStatus: string;
  onCopyPlan: () => void;
  onTogglePackItem: (id: string) => void;
}) {
  const eventDate = eventStartsAt ? new Date(eventStartsAt) : null;
  const dayLabel = eventDate
    ? eventDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()
    : "TBD";
  const dateLabel = eventDate
    ? eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()
    : "DATE";

  return (
    <section className="stack game-day-calm-card">
      <div className="certainty-band certainty-band-parent">
        <span className="certainty-band-icon" aria-hidden="true">{rsvpCopy.startsWith("RSVP needed") ? "!" : "✓"}</span>
        <span>
          <strong>{rsvpCopy.startsWith("RSVP needed") ? "RSVP needed" : "Next event confirmed"}</strong>
          <small>{rsvpCopy.startsWith("RSVP needed") ? rsvpCopy : `${eventTitle} is next on your family schedule.`}</small>
        </span>
        <span className={`season-status ${rsvpCopy.startsWith("RSVP needed") ? "state-needs_attention" : "state-ready"}`}>{badge}</span>
      </div>

      <div className="parent-event-group">
        <header className="parent-event-group-heading">
          <h2>{badge === "Today" ? "Today" : "This week"}</h2>
          <span>1 event <span aria-hidden="true">⌃</span></span>
        </header>

        <article className="parent-schedule-card">
          <header className="parent-schedule-team">
            <span className="team-mark" aria-hidden="true">{teamInitials}</span>
            <strong>{teamLabel}</strong>
          </header>

          <div className="parent-schedule-event">
            <div className="parent-schedule-date" aria-label={`${dayLabel} ${dateLabel}`}>
              <span>{dayLabel}</span>
              <strong>{dateLabel}</strong>
              <small>{eventKind}</small>
            </div>
            <div className="parent-schedule-details">
              <h1>{eventTitle}</h1>
              <strong className="game-day-time">{eventMeta}</strong>
              <p>
                <span className="parent-location-mark" aria-hidden="true" />
                <span>{location}</span>
              </p>
              <div className="parent-schedule-links">
                {directionsUrl ? <a href={directionsUrl} target="_blank" rel="noreferrer">Directions</a> : null}
                <a className={rsvpRequired ? "parent-rsvp-action compact" : undefined} href={primaryHref}>{primaryLabel}</a>
              </div>
            </div>
          </div>

          {rsvpRequired ? (
            <div className="parent-inline-rsvp">
              <span className="parent-player-avatar" aria-hidden="true">{playerLabel.slice(0, 1).toUpperCase()}</span>
              <p><strong>Is {playerLabel} going?</strong><small>Choose on the RSVP screen.</small></p>
              <div className="parent-inline-rsvp-actions" aria-label={`RSVP options for ${playerLabel}`}>
                <a href="/parent/rsvp" aria-label={`Open RSVP and answer yes for ${playerLabel}`} title="Open RSVP and answer yes">✓</a>
                <a href="/parent/rsvp" aria-label={`Open RSVP and answer no for ${playerLabel}`} title="Open RSVP and answer no">×</a>
              </div>
            </div>
          ) : (
            <div className="parent-inline-rsvp parent-inline-rsvp-confirmed">
              <span className="parent-player-avatar" aria-hidden="true">✓</span>
              <p><strong>RSVP answered</strong><small>{rsvpCopy}</small></p>
              <a className="parent-rsvp-change" href="/parent/rsvp">Change</a>
            </div>
          )}
        </article>
      </div>

      <div className="parent-event-support-grid">
        <p><strong>Weather</strong><span>{weatherCopy}</span></p>
        <p><strong>Family help</strong><span>{helpCopy}</span></p>
      </div>
      <details className="game-day-details">
        <summary>Arrival, field, and pack details</summary>
        <div className="game-day-deep-grid">
        <section className="game-day-panel" aria-label="Arrival timeline">
          <h3>Arrival timeline</h3>
          <div className="game-day-arrival-list">
            {arrivalPlan.map((item) => (
              <p key={item.id}>
                <span>{item.label}</span>
                <strong>{item.detail}</strong>
              </p>
            ))}
          </div>
        </section>
        <section className="game-day-panel" aria-label="Pack check">
          <h3>Pack check</h3>
          <div className="game-day-checklist">
            {packList.map((item) => (
              <label className="game-day-check-row" key={item.id}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onTogglePackItem(item.id)}
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </label>
            ))}
          </div>
        </section>
        <section className="game-day-panel" aria-label="Field plan">
          <h3>Field plan</h3>
          <div className="game-day-field-list">
            {fieldPlan.map((item) => (
              <p key={item.id}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                {item.href ? <a href={item.href} target="_blank" rel="noreferrer">{item.actionLabel ?? "Open"}</a> : null}
              </p>
            ))}
          </div>
        </section>
        <section className="game-day-panel" aria-label="Player readiness">
          <h3>Player readiness</h3>
          <div className="game-day-field-list">
            {playerPlan.map((item) => (
              <p key={item.id}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </p>
            ))}
          </div>
        </section>
        </div>
      </details>
      <p className="notice ok"><strong>Latest coach update:</strong> {coachCopy}</p>
      <div className="game-day-copy-row">
        <button className="secondary" type="button" onClick={onCopyPlan}>Copy game plan</button>
      </div>
      <p className="muted" aria-live="polite">{copyStatus || "Local checklist only. It does not save attendance or send alerts."}</p>
    </section>
  );
}

function formatTopic(value?: string) {
  if (!value) return "reminder";
  return value.replaceAll("_", " ");
}

function formatFocusArea(value: PracticeFocusArea) {
  return value.replaceAll("_", " ");
}

function formatReplayDuration(value: string) {
  if (value === "30_seconds") return "30 sec";
  if (value === "2_minutes") return "2 min";
  return "5 min";
}

function teamBrandStyle(primaryColor: string, secondaryColor: string): CSSProperties {
  return {
    "--team-primary": primaryColor,
    "--team-secondary": secondaryColor
  } as CSSProperties;
}

function hexToRgb(value: string) {
  const normalized = value.replace("#", "");
  if (normalized.length !== 6) return null;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function relativeLuminance(color: string) {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastStatus(primaryColor: string, secondaryColor: string) {
  const ratio = contrastRatio(primaryColor, secondaryColor);
  if (ratio >= 4.5) return { label: "Pass", className: "ok", ratio };
  if (ratio >= 3) return { label: "Large text only", className: "warning", ratio };
  return { label: "Needs contrast", className: "danger", ratio };
}

function themeQaStatus(primaryColor: string, secondaryColor: string) {
  const direct = contrastStatus(primaryColor, secondaryColor);
  const dark = contrastStatus(primaryColor, "#111827");
  const mobile = contrastStatus("#ffffff", primaryColor);
  const allPass = direct.className === "ok" && dark.className === "ok" && mobile.className === "ok";
  return {
    label: allPass ? "Theme QA pass" : "Theme QA review",
    className: allPass ? "ok" : "warning",
    darkLabel: dark.label,
    mobileLabel: mobile.label,
    contrastLabel: direct.label
  };
}

type TenantEnvironmentSurfaceId = "app" | "portal" | "mobile" | "communications" | "commerce" | "governance";

interface TenantEnvironmentSurface {
  id: TenantEnvironmentSurfaceId;
  label: string;
  status: string;
  detail: string;
}

const tenantEnvironmentSurfaces: TenantEnvironmentSurface[] = [
  {
    id: "app",
    label: "App shell",
    status: "Menus and labels",
    detail: "League navigation, role home labels, and dashboard accents."
  },
  {
    id: "portal",
    label: "Team portals",
    status: "Family-facing",
    detail: "Roster, schedule, RSVP, media, chat, and Parent Replay surfaces."
  },
  {
    id: "mobile",
    label: "Mobile view",
    status: "Small-screen QA",
    detail: "Header, quick action bar, badges, and contrast-critical touch targets."
  },
  {
    id: "communications",
    label: "Messages",
    status: "Provider-gated",
    detail: "Invite, digest, reminder, and push identity previews before delivery."
  },
  {
    id: "commerce",
    label: "Sponsor docs",
    status: "Admin-only proof",
    detail: "Sponsor invoice references, receipts, and public placement separation."
  },
  {
    id: "governance",
    label: "Safety rules",
    status: "Human review",
    detail: "Logo review, child-privacy defaults, audit trail, and fallback rendering."
  }
];

const tenantAppMenuPreview = ["Home", "Schedule", "RSVP", "Messages", "Photos"];

function initialsFromName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

async function authenticatedJsonFetch(
  url: string,
  payload: unknown,
  extraHeaders?: Record<string, string>,
  signal?: AbortSignal
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders
  };
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // Keep the request path deterministic; private APIs will return 401.
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal
  });
}

async function getOfflineReplaySession(
  expectedActorId: string,
  verifyWithServer = true
) {
  try {
    const supabase = createSupabaseBrowserClient();
    const readSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (
        session?.user.id !== expectedActorId ||
        !session.expires_at ||
        session.expires_at * 1000 <= Date.now()
      ) return null;
      if (verifyWithServer) {
        const { data: userData, error } = await supabase.auth.getUser();
        if (error || userData.user?.id !== expectedActorId) return null;
      }
      return { session, expiresAt: session.expires_at };
    };
    const verified = await readSession();
    if (!verified) return null;
    return {
      actorId: verified.session.user.id,
      expiresAt: new Date(verified.expiresAt * 1000).toISOString(),
      validate: async () => Boolean(await readSession())
    };
  } catch {
    return null;
  }
}

async function queueOfflineActionForCurrentSession(
  action: QueueOfflineGameDayActionInput,
  expectedOwnerGeneration: number
) {
  const session = await getOfflineReplaySession(action.actorId, false);
  if (!session || !await session.validate?.()) return false;
  try {
    await queueOfflineGameDayAction(action, expectedOwnerGeneration);
    return true;
  } catch {
    return false;
  }
}

function mediaReviewPriority(item: MediaItem) {
  if (item.moderationStatus === "pending") return 0;
  if ((item.reportCount ?? 0) > 0) return 1;
  if (item.moderationStatus === "hidden") return 2;
  if (item.moderationStatus === "rejected" || item.moderationStatus === "removed") return 3;
  return 4;
}

function getMediaReviewCopy(item: MediaItem) {
  const reports = item.reportCount ?? 0;
  if (item.moderationStatus === "pending" && reports > 0) {
    return `Review request: ${reports} family report(s); staff approval is required before family visibility changes.`;
  }
  if (item.moderationStatus === "pending") {
    return "Review request: pending staff approval before this appears to families.";
  }
  if (reports > 0) {
    return `Review request: ${reports} family report(s); content remains under staff review.`;
  }
  return "Review request: none open.";
}

function getMediaVisibilityCopy(item: MediaItem) {
  const visibilityFlags = getPhotoVisibilityFlags(item);
  const familyVisible = canViewMediaByRole(item, "parent");
  if (familyVisible && visibilityFlags.organizationVisible) return "Visible to eligible organization views.";
  if (familyVisible && visibilityFlags.teamVisible) return "Visible to linked team parents.";
  if (item.moderationStatus === "removed") return "Removed from coach/admin and family-facing surfaces.";
  if (item.moderationStatus === "rejected") return "Rejected and excluded from family-facing views.";
  if (visibilityFlags.privateAlbumOnly) return "Hidden from families while review is open.";
  return "Not family-facing under the current role policy.";
}

function mergeRegistrationRequests(localRequests: RegistrationRequest[], serverRequests: RegistrationRequest[]) {
  const seen = new Set<string>();
  return [...serverRequests, ...localRequests].filter((request) => {
    if (seen.has(request.id)) return false;
    seen.add(request.id);
    return true;
  });
}

interface AuthClientProps {
  returnTo?: string;
  initialMessage?: string;
}

export function AuthClient({ returnTo = "", initialMessage }: AuthClientProps) {
  type SocialAuthProvider = "google" | "facebook";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isPending, startTransition] = useTransition();
  const authConfigStatus = getSupabaseBrowserConfigStatus();

  useEffect(() => {
    if (!authConfigStatus.ok) return;

    let cancelled = false;
    async function routeExistingSession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getSession();
        if (cancelled || error || !data.session) return;
        setMessage("Signed in. Opening the right dashboard.");
        if (returnTo) {
          if (!cancelled) window.location.assign(returnTo);
          return;
        }
        const landingResponse = await fetch("/api/auth/session-landing", { cache: "no-store" }).catch(() => null);
        const landing = await landingResponse?.json().catch(() => null) as { href?: string } | null;
        if (!cancelled) window.location.assign(landing?.href ?? "/account");
      } catch {
        // Keep the form usable if session inspection is unavailable.
      }
    }

    void routeExistingSession();
    return () => {
      cancelled = true;
    };
  }, [authConfigStatus.ok, returnTo]);

  function submitAuth() {
    setMessage("");
    if (!authConfigStatus.ok) {
      setMessage("Sign-in services are not connected in this environment.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage(error.message);
          return;
        }
        setMessage("Signed in. Opening the right dashboard.");
        if (returnTo) {
          window.location.assign(returnTo);
          return;
        }
        const landingResponse = await fetch("/api/auth/session-landing", { cache: "no-store" }).catch(() => null);
        const landing = await landingResponse?.json().catch(() => null) as { href?: string } | null;
        window.location.assign(landing?.href ?? "/account");
      } catch (error) {
        void error;
        setMessage("Sign in could not be completed. Try again or contact your league administrator.");
      }
    });
  }

  function submitSocialAuth(provider: SocialAuthProvider) {
    setMessage("");
    if (!authConfigStatus.ok) {
      setMessage("Sign-in services are not connected in this environment.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const callbackPath = returnTo
          ? `/auth/callback?provider=${provider}&returnTo=${encodeURIComponent(returnTo)}`
          : `/auth/callback?provider=${provider}`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: getSupabaseEmailRedirectTo(callbackPath)
          }
        });

        if (error) {
          setMessage("That sign-in provider could not be opened. Try again or use email.");
          return;
        }

        setMessage(`Opening ${provider === "google" ? "Google" : "Facebook"} sign in.`);
      } catch (error) {
        void error;
        setMessage("That sign-in provider could not be opened. Try again or use email.");
      }
    });
  }

  return (
    <div className="page auth-page">
      <section className="hero auth-hero">
        <span className="eyebrow">Existing members</span>
        <h1>Sign in to your LeaguePilot account.</h1>
        <p className="lead">Use the email connected to your approved parent, coach, or league role.</p>
      </section>

      {!authConfigStatus.ok ? <p className="notice warning">Sign-in services are not connected in this environment.</p> : null}
      {message ? <p className="notice">{message}</p> : null}

      <section className="grid two auth-grid">
        <article className="card stack auth-card auth-form-card">
          <label>Email<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="auth-submit" onClick={submitAuth} disabled={!authConfigStatus.ok || isPending || password.length < 6}>{isPending ? "Signing in..." : "Sign in"}</button>

          <div className="auth-provider-panel" aria-label="Social sign in providers">
            <p className="auth-support-copy">Google and Facebook confirm identity only. Private team access still requires league approval.</p>
            <div className="auth-provider-actions">
              <button type="button" className="secondary" onClick={() => submitSocialAuth("google")} disabled={!authConfigStatus.ok || isPending}>Continue with Google</button>
              <button type="button" className="secondary" onClick={() => submitSocialAuth("facebook")} disabled={!authConfigStatus.ok || isPending}>Continue with Facebook</button>
            </div>
          </div>
        </article>

        <article className="card stack auth-card auth-access-card">
          <h2>Need access to a team?</h2>
          <p className="auth-body-copy">Tell us which child and team you are connected to. A league administrator checks the match before private details appear.</p>
          <a className="button secondary" href="/registration">Request Team Access</a>
          <p className="auth-support-copy">Children do not create accounts. Signing in confirms identity, but it never grants team access by itself.</p>
        </article>
      </section>
    </div>
  );
}

interface AccountProfile {
  display_name: string;
  email: string;
  default_role: "admin" | "coach" | "parent";
}

interface AccountMembership {
  team_id: string;
  role: "coach" | "parent";
  status: "active" | "invited" | "removed";
}

interface AccountOrganizationMembership {
  organization_id: string;
  role: "admin" | "coach";
  status: "active" | "invited" | "removed";
}

interface MembershipAdminData {
  profiles: Array<{
    id: string;
    displayName: string;
    email: string;
    defaultRole: "admin" | "coach" | "parent";
  }>;
  teams: RegistrationTeamOption[];
  memberships: Array<{
    id: string;
    teamId: string;
    userId: string;
    role: "coach" | "parent";
    status: "active" | "invited" | "removed";
  }>;
}

export function AccountClient() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [memberships, setMemberships] = useState<AccountMembership[]>([]);
  const [organizationMemberships, setOrganizationMemberships] = useState<AccountOrganizationMembership[]>([]);
  const [message, setMessage] = useState("Checking your account...");
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          if (!cancelled) setMessage("No active sign-in. Sign in before checking role access.");
          return;
        }

        const [
          { data: profileData, error: profileError },
          { data: membershipData, error: membershipError },
          { data: organizationMembershipData, error: organizationMembershipError }
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name,email,default_role")
            .eq("id", userData.user.id)
            .single(),
          supabase
            .from("team_memberships")
            .select("team_id,role,status")
            .eq("user_id", userData.user.id)
            .eq("status", "active"),
          supabase
            .from("organization_memberships")
            .select("organization_id,role,status")
            .eq("user_id", userData.user.id)
            .eq("status", "active")
        ]);

        if (cancelled) return;

        if (profileError || !profileData) {
          setMessage("Signed in, but no profile row is visible yet.");
          return;
        }

        setProfile(profileData);
        setMemberships(membershipError ? [] : membershipData ?? []);
        setOrganizationMemberships(organizationMembershipError ? [] : organizationMembershipData ?? []);
        setMessage(membershipData?.length || organizationMembershipData?.length
          ? "Role-scoped membership is visible."
          : "Signed in. No team or organization membership has been granted yet.");
      } catch (error) {
        void error;
        if (!cancelled) setMessage("Account access could not be checked. Try signing in again.");
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    if (signOutPending) return;
    setSignOutPending(true);
    setSignOutError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) throw userError ?? new Error("No active user.");

      // Clearing increments every owner generation before records are deleted,
      // so an in-flight replay cannot recreate private state after sign-out.
      await clearPrivateGameDayData(data.user.id);
      window.dispatchEvent(new CustomEvent("leaguepilot:sign-out", {
        detail: { actorId: data.user.id }
      }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.assign("/auth");
    } catch {
      setSignOutError("Sign-out could not safely clear private offline data. Try again before leaving this device.");
      setSignOutPending(false);
    }
  }

  return (
    <div className="page account-page">
      <section className="hero account-hero">
        <span className="eyebrow">Account access</span>
        <h1>Your account and access</h1>
        <p className="lead">Review your profile, the leagues and teams connected to it, and safely sign out of this device.</p>
      </section>

      <p className="notice">{message}</p>

      <section className="grid three">
        <article className="card stack">
          <h2>Profile</h2>
          {profile ? (
            <>
              <p><strong>{profile.display_name}</strong><br /><span className="muted">{profile.email}</span></p>
              <p>Default role: {roleLabel(profile.default_role)}</p>
            </>
          ) : (
            <p className="muted">No profile loaded.</p>
          )}
        </article>

        <article className="card stack">
          <h2>Organization memberships</h2>
          {organizationMemberships.map((membership) => (
            <p key={`${membership.organization_id}-${membership.role}`}>
              <strong>League access</strong><br />
              <span className="muted">{roleLabel(membership.role)} · {membership.status}</span>
            </p>
          ))}
          {organizationMemberships.length === 0 ? <p className="muted">No active organization memberships yet.</p> : null}
        </article>

        <article className="card stack">
          <h2>Team memberships</h2>
          {memberships.map((membership) => (
            <p key={`${membership.team_id}-${membership.role}`}>
              <strong>Team access</strong><br />
              <span className="muted">{roleLabel(membership.role)} · {membership.status}</span>
            </p>
          ))}
          {memberships.length === 0 ? <p className="muted">No active team memberships yet.</p> : null}
        </article>
      </section>

      <section className="card stack account-security-actions" aria-labelledby="account-security-title">
        <div>
          <h2 id="account-security-title">Account security</h2>
          <p className="muted">Sign out clears private offline actions and sync receipts from this browser before the session closes.</p>
        </div>
        <button type="button" className="secondary" disabled={signOutPending} onClick={() => void signOut()}>
          {signOutPending ? "Signing out..." : "Sign out"}
        </button>
        {signOutError ? <p className="notice warning" role="alert">{signOutError}</p> : null}
      </section>
    </div>
  );
}

export function MembershipAdminClient({ initialData }: { initialData: MembershipAdminData }) {
  const [memberships, setMemberships] = useState(initialData.memberships);
  const [userId, setUserId] = useState(initialData.profiles[0]?.id ?? "");
  const [teamId, setTeamId] = useState(initialData.teams[0]?.id ?? "");
  const [role, setRole] = useState<"coach" | "parent">("coach");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function saveMembership() {
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/team-memberships", { userId, teamId, role });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        membership?: MembershipAdminData["memberships"][number];
      } | null;

      if (result?.ok && result.membership) {
        setMemberships((current) => [result.membership!, ...current.filter((item) => item.id !== result.membership?.id)]);
      }
      setMessage(result?.message ?? "Membership save failed.");
    });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Membership admin</span>
        <h1>Connect signed-in adults to team-scoped coach and parent access.</h1>
        <p className="lead">This is the access grant step. Signup alone creates identity; membership rows decide what private team data a user can see or manage.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="grid two">
        <article className="card stack">
          <h2>Grant team access</h2>
          <label>User
            <select value={userId} onChange={(event) => setUserId(event.target.value)}>
              {initialData.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.displayName} - {profile.email}</option>
              ))}
            </select>
          </label>
          <label>Team
            <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              {initialData.teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name} ({team.division})</option>
              ))}
            </select>
          </label>
          <label>Role
            <select value={role} onChange={(event) => setRole(event.target.value as "coach" | "parent")}>
              <option value="coach">Coach</option>
              <option value="parent">Parent</option>
            </select>
          </label>
          <button onClick={saveMembership} disabled={isPending || !userId || !teamId}>{isPending ? "Saving..." : "Save membership"}</button>
          {initialData.profiles.length === 0 ? <p className="muted">No account profiles are visible yet. Create an account first.</p> : null}
        </article>

        <article className="card stack">
          <h2>Current memberships</h2>
          {memberships.map((membership) => {
            const profile = initialData.profiles.find((item) => item.id === membership.userId);
            const team = initialData.teams.find((item) => item.id === membership.teamId);
            return (
              <p key={membership.id}>
                <strong>{profile?.displayName ?? membership.userId}</strong><br />
                <span className="muted">{team?.name ?? membership.teamId} - {membership.role} - {membership.status}</span>
              </p>
            );
          })}
          {memberships.length === 0 ? <p className="muted">No team memberships yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

export function ImportsClient() {
  const { state, dispatch } = useAppState();
  const [csv, setCsv] = useState(sampleRosterCsv);
  const analysis = useMemo(() => analyzeRosterCsv(csv, state, NOW), [csv, state]);
  const canCommit = analysis.totalRows > 0 && analysis.errorRows === 0;
  const latestImport = state.rosterImportReports[0];
  const [auditMessage, setAuditMessage] = useState("");
  const [isAuditPending, startAuditTransition] = useTransition();

  function saveImportAudit() {
    setAuditMessage("");
    startAuditTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/roster-imports/audit", {
        organizationId: state.organization.id,
        seasonId: state.activeSeason.id,
        filename: "roster-import.csv",
        analysis
      });
      const result = await response.json().catch(() => null) as { message?: string } | null;
      setAuditMessage(result?.message ?? "Roster import audit could not be saved.");
    });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">CSV duplicate detection</span>
        <h1>Preview roster imports before families receive bad invites.</h1>
        <p className="lead">The parser normalizes rows, flags blocking errors, keeps warnings reviewable, and simulates an audited commit without persisting production data.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <h2>Roster CSV</h2>
            <span className="badge warning">Admin review</span>
          </div>
          <textarea value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="Roster CSV" />
          <button
            disabled={!canCommit}
            onClick={() => dispatch({ type: "commitRosterImport", csv, now: new Date().toISOString() })}
          >
            Commit import simulation
          </button>
          <button className="secondary" disabled={isAuditPending} onClick={saveImportAudit}>
            Save audit trail
          </button>
          {!canCommit ? <p className="muted">Resolve blocking errors before commit simulation is available.</p> : null}
          {latestImport ? <p className="notice">Last commit: {latestImport.validRows} valid, {latestImport.warningRows} warning, {latestImport.errorRows} error rows.</p> : null}
          {auditMessage ? <p className="notice">{auditMessage}</p> : null}
        </article>

        <article className="grid three">
          <div className="card metric">
            <span className="muted">Rows</span>
            <strong>{analysis.totalRows}</strong>
          </div>
          <div className="card metric">
            <span className="muted">Warnings</span>
            <strong>{analysis.warningRows}</strong>
          </div>
          <div className="card metric">
            <span className="muted">Errors</span>
            <strong>{analysis.errorRows}</strong>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Preview rows</h2>
          <span className="badge">No records saved</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Player</th>
                <th>Team</th>
                <th>Parent contact</th>
                <th>Status</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>{row.rowNumber}</td>
                  <td>{row.normalized.firstName} {row.normalized.lastInitial}.</td>
                  <td>{row.normalized.teamName || "Missing"}</td>
                  <td>{row.normalized.parentEmail || row.normalized.parentPhone || "Missing"}</td>
                  <td><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
                  <td>{row.issues.length ? row.issues.map((issue) => issue.code).join(", ") : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function AdminInvitesClient() {
  const { state } = useAppState();

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin invite status</span>
        <h1>Review parent invite delivery and recovery state.</h1>
        <p className="lead">This view shows status, resend counts, failure state, and hashed-token policy without displaying raw invite tokens.</p>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parent</th>
                <th>Player</th>
                <th>Team</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Sent</th>
                <th>Last sent</th>
              </tr>
            </thead>
            <tbody>
              {state.parentInvites.map((invite) => {
                const player = state.players.find((item) => item.id === invite.playerId);
                const team = state.teams.find((item) => item.id === invite.teamId);
                return (
                  <tr key={invite.id}>
                    <td>{invite.email}<br /><span className="muted">{invite.phone}</span></td>
                    <td>{player ? `${player.firstName} ${player.lastInitial}.` : "Unknown"}</td>
                    <td>{team?.name ?? "Unknown"}</td>
                    <td><span className={`badge ${statusClass(invite.status)}`}>{invite.status}</span></td>
                    <td><span className={`badge ${statusClass(invite.deliveryStatus)}`}>{invite.deliveryStatus}</span></td>
                    <td>{invite.sentCount}</td>
                    <td>{invite.lastSentAt ? formatDate(invite.lastSentAt) : "Never"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function tenantReadinessStatusClass(status: TenantReadinessCheckStatus) {
  if (status === "ready") return "ok";
  if (status === "blocked") return "danger";
  return "warning";
}

export function AdminHealthClient({ tenantReadinessData }: { tenantReadinessData?: TenantReadinessData | null } = {}) {
  const { state } = useAppState();
  const cards = computeAdminHealth(state, NOW);
  const readyTenantCount = tenantReadinessData?.tenants.filter((tenant) => tenant.readyToInviteFamilies).length ?? 0;
  const tenantBlockerCount = tenantReadinessData?.tenants.reduce((total, tenant) => total + tenant.blockingCount, 0) ?? 0;

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Admin health dashboard</span>
        <h1>Launch readiness issues before parents complain.</h1>
        <p className="lead">Health cards combine local workflow checks with tenant setup readiness from Supabase for the signed-in organization admin.</p>
      </section>

      {tenantReadinessData ? (
        <>
          <p className={`notice ${tenantReadinessData.source === "supabase" ? "" : "warning"}`.trim()}>{tenantReadinessData.message}</p>
          <section className="grid three">
            <article className="card metric">
              <span className="muted">Tenants visible</span>
              <strong>{tenantReadinessData.tenants.length}</strong>
            </article>
            <article className="card metric">
              <span className="muted">Ready to invite</span>
              <strong>{readyTenantCount}</strong>
            </article>
            <article className="card metric">
              <span className="muted">Blocking setup gaps</span>
              <strong>{tenantBlockerCount}</strong>
            </article>
          </section>

          <section className="grid two" aria-label="Tenant setup readiness">
            {tenantReadinessData.tenants.map((tenant) => (
              <article className="card stack" key={tenant.organizationId}>
                <div className="card-header">
                  <div>
                    <span className="eyebrow">{tenant.activeSeasonName ?? "No active season"}</span>
                    <h2>{tenant.organizationName}</h2>
                  </div>
                  <span className={`badge ${tenant.readiness === "ready_to_invite" ? "ok" : tenant.readiness === "blocked" ? "danger" : "warning"}`}>
                    {tenant.readiness === "ready_to_invite" ? "ready to invite" : tenant.readiness === "blocked" ? "blocked" : "needs setup"}
                  </span>
                </div>
                <div className="grid three compact-grid">
                  <p><strong>{tenant.activeTeamCount}</strong><br /><span className="muted">team(s)</span></p>
                  <p><strong>{tenant.rosteredPlayerCount}</strong><br /><span className="muted">player(s)</span></p>
                  <p><strong>{tenant.scheduledEventCount}</strong><br /><span className="muted">event(s)</span></p>
                </div>
                {tenant.checks.map((item) => (
                  <div className="readiness-rule" key={item.id}>
                    <p>
                      <span className={`badge ${tenantReadinessStatusClass(item.status)}`}>{item.status.replace("_", " ")}</span>{" "}
                      <strong>{item.label}</strong><br />
                      <span className="muted">{item.detail}</span><br />
                      <a href={item.actionHref}>{item.actionLabel}</a>
                    </p>
                    <details>
                      <summary data-analytics-event="readiness_rule_opened">Why this status</summary>
                      <p><strong>Source of truth:</strong> {item.sourceOfTruth}</p>
                      <p><strong>Responsible authority:</strong> {item.responsibleAuthority}</p>
                      <p><strong>Privacy boundary:</strong> {item.privacyBoundary}</p>
                      <p className="muted">{item.explanation}</p>
                    </details>
                  </div>
                ))}
              </article>
            ))}
            {!tenantReadinessData.tenants.length ? (
              <article className="card stack">
                <h2>No tenant scope loaded.</h2>
                <p className="muted">Sign in as an active organization admin and confirm Supabase access before inviting families.</p>
              </article>
            ) : null}
          </section>
        </>
      ) : null}

      <section className="grid three">
        {cards.map((card) => (
          <article className="card metric" key={card.id}>
            <div className="card-header">
              <h2>{card.title}</h2>
              <span className={`badge ${card.status}`}>{card.status}</span>
            </div>
            <strong>{card.count}</strong>
            <p className="muted">{card.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ParentDashboardClient({ dashboardData }: { dashboardData?: ParentCoachDashboardData | null } = {}) {
  const { state } = useAppState();
  const [helpMessage, setHelpMessage] = useState("");
  const [checkedGameDayItems, setCheckedGameDayItems] = useState<Record<string, boolean>>({});
  const [gameDayCopyStatus, setGameDayCopyStatus] = useState("");
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<"all" | EventType>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | MediaItem["type"]>("all");
  const [supportTopic, setSupportTopic] = useState("schedule");
  const [supportDetail, setSupportDetail] = useState("Need help with this weekend's schedule.");
  const [isHelpPending, startHelpTransition] = useTransition();
  const sourceState = dashboardData?.state ?? state;
  const parentUserId = dashboardData?.parentUserId ?? "user-parent-jordan";
  const parentUser = sourceState.users.find((user) => user.id === parentUserId);
  const dashboard = getParentDashboard(sourceState, parentUserId, NOW);
  const familyBalance = buildFamilyBalanceSummary(sourceState, parentUserId);
  const accessGate = privateAccessGate(dashboardData, "parent");
  const parentTeamIds = new Set(dashboard.children.map(({ team }) => team.id));
  const primaryTeamId = dashboard.children[0]?.team.id;
  const allParentEvents = sourceState.events
    .filter((event) => parentTeamIds.has(event.teamId) && event.status === "scheduled" && new Date(event.startsAt).getTime() >= new Date(NOW).getTime())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const filteredParentEvents = allParentEvents.filter((event) => scheduleTypeFilter === "all" || event.eventType === scheduleTypeFilter);
  const mediaFeed = sourceState.mediaItems
    .filter((item) => parentTeamIds.has(item.teamId) && (item.moderationStatus ?? "approved") === "approved")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const filteredMediaFeed = mediaFeed.filter((item) => mediaTypeFilter === "all" || item.type === mediaTypeFilter);
  const familyModerationQueue = getFamilyFacingModerationQueue(sourceState.mediaItems.filter((item) => parentTeamIds.has(item.teamId)));
  const mediaConsentControls = getMediaConsentControls();
  const openSnackSlots = sourceState.snackScheduleSlots.filter((slot) => parentTeamIds.has(slot.teamId) && slot.status === "open");
  const openVolunteerSignups = sourceState.volunteerSignups.filter((signup) => parentTeamIds.has(signup.teamId) && signup.status === "open");
  const eventById = new Map(sourceState.events.map((event) => [event.id, event]));
  const nextParentEvent = dashboard.nextEvents[0];
  const primaryFamilyRow = dashboard.children[0];
  const primaryTeam = primaryFamilyRow?.team;
  const primaryPlayer = primaryFamilyRow?.player;
  const parentVolunteerMarketplace = primaryTeamId ? buildVolunteerMarketplace(sourceState, primaryTeamId) : [];
  const parentEquipmentExchange = primaryTeamId ? buildEquipmentExchange(sourceState, primaryTeamId, "parent") : [];
  const parentAvailabilityIntelligence = primaryTeamId ? buildFamilyAvailabilityIntelligence(sourceState, primaryTeamId, NOW) : undefined;
  const teamName = primaryTeam?.name ?? "Team home";
  const teamDivision = primaryTeam?.division ?? "Division pending";
  const teamInitials = teamName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "LH";
  const parentTeamStyle = primaryTeam ? teamBrandStyle(primaryTeam.primaryColor, primaryTeam.secondaryColor) : undefined;
  const nextParentRsvp = nextParentEvent ? dashboard.rsvpNeeded.find((item) => item.event.id === nextParentEvent.id) : undefined;
  const nextParentRsvpCopy = nextParentRsvp
    ? `RSVP needed for ${nextParentRsvp.player.firstName} ${nextParentRsvp.player.lastInitial}.`
    : nextParentEvent
      ? "RSVP is answered for linked players."
      : "No RSVP is open yet.";
  const nextWeatherAlert = nextParentEvent
    ? sourceState.weatherAlerts.find((alert) => alert.eventId === nextParentEvent.id && parentTeamIds.has(alert.teamId))
    : undefined;
  const directionsUrl = nextParentEvent?.locationAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nextParentEvent.locationName} ${nextParentEvent.locationAddress}`)}`
    : "";
  const nextEventTime = nextParentEvent ? new Date(nextParentEvent.startsAt).getTime() : 0;
  const nowTime = new Date(NOW).getTime();
  const isToday = nextParentEvent
    ? new Date(nextParentEvent.startsAt).toDateString() === new Date(NOW).toDateString()
    : false;
  const isSoon = nextParentEvent ? nextEventTime >= nowTime && nextEventTime - nowTime <= 48 * 60 * 60 * 1000 : false;
  const nextEventBadge = isToday ? "Today" : isSoon ? "Coming up soon" : "Next event";
  const parentHelpCount = openSnackSlots.length + openVolunteerSignups.length;
  const latestChangeCopy = dashboard.latestAnnouncement
    ? `${dashboard.latestAnnouncement.title}: ${dashboard.latestAnnouncement.body}`
    : "No coach update has been posted yet.";
  const parentCoachAnnouncements = sourceState.announcements
    .filter((announcement) => parentTeamIds.has(announcement.teamId))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3);
  const parentAnnouncementItems = parentCoachAnnouncements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    teamName: sourceState.teams.find((team) => team.id === announcement.teamId)?.name
  }));
  const parentSeasonStoryEntries: ParentSeasonStoryEntry[] = [
    ...parentCoachAnnouncements.map((announcement) => ({
      id: announcement.id,
      dateLabel: new Date(announcement.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      title: announcement.title,
      detail: announcement.body,
      meta: "Coach update",
      tone: "coach" as const,
      sortAt: new Date(announcement.createdAt).getTime()
    })),
    ...allParentEvents.slice(0, 3).map((event, index) => ({
      id: event.id,
      dateLabel: new Date(event.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      title: event.title,
      detail: `${formatShortTime(event.startsAt)} at ${event.locationName}`,
      meta: event.eventType.replaceAll("_", " "),
      tone: index === 0 ? "next" as const : "event" as const,
      sortAt: new Date(event.startsAt).getTime()
    }))
  ]
    .sort((left, right) => left.sortAt - right.sortAt)
    .slice(0, 4)
    .map((entry) => ({
      id: entry.id,
      dateLabel: entry.dateLabel,
      title: entry.title,
      detail: entry.detail,
      meta: entry.meta,
      tone: entry.tone
    }));
  const firstMissingRsvp = nextParentRsvp ?? dashboard.rsvpNeeded[0];
  const parentPrimaryAction = firstMissingRsvp
    ? { href: "/parent/rsvp", label: "RSVP now" }
    : directionsUrl
      ? { href: directionsUrl, label: "Directions" }
      : { href: "/parent/schedule", label: "View schedule" };
  const parentWeatherCopy = nextWeatherAlert
    ? `${nextWeatherAlert.headline}: ${nextWeatherAlert.detail}`
    : "No weather alert is waiting for this event.";
  const parentHelpCopy = parentHelpCount
    ? `${openSnackSlots.length} snack and ${openVolunteerSignups.length} volunteer opening(s).`
    : "Snacks and volunteers look covered.";
  const gameDayArrivalPlan: GameDayPlanItem[] = nextParentEvent
    ? [
      { id: "leave", label: "Leave by", detail: "Not planned" },
      { id: "arrive", label: "Arrive by", detail: "Not published" },
      { id: "warmup", label: "Warm-up", detail: "Not published" },
      { id: "start", label: "Start", detail: formatShortTime(nextParentEvent.startsAt) }
    ]
    : [
      { id: "leave", label: "Leave by", detail: "Pending" },
      { id: "arrive", label: "Arrive by", detail: "Pending" },
      { id: "warmup", label: "Warm-up", detail: "Pending" },
      { id: "start", label: "Start", detail: "Pending" }
    ];
  const gameDayPackDefaults: Record<string, boolean> = {
    uniform: false,
    water: false,
    gear: false,
    familyHelp: parentHelpCount === 0
  };
  const gameDayPackItems: GameDayChecklistItem[] = [
    {
      id: "uniform",
      label: "Uniform",
      detail: "League bring list not published.",
      checked: checkedGameDayItems.uniform ?? gameDayPackDefaults.uniform
    },
    {
      id: "water",
      label: "Water",
      detail: "Family-added checklist item; not an official instruction.",
      checked: checkedGameDayItems.water ?? gameDayPackDefaults.water
    },
    {
      id: "gear",
      label: "Gear",
      detail: "League bring list not published.",
      checked: checkedGameDayItems.gear ?? gameDayPackDefaults.gear
    },
    {
      id: "familyHelp",
      label: "Family help",
      detail: parentHelpCopy,
      checked: checkedGameDayItems.familyHelp ?? gameDayPackDefaults.familyHelp
    }
  ];
  const gameDayFieldPlan: GameDayPlanItem[] = [
    {
      id: "field",
      label: "Field",
      detail: nextParentEvent ? `${nextParentEvent.locationName}, ${nextParentEvent.locationAddress}` : "Location pending"
    },
    {
      id: "parking",
      label: "Parking",
      detail: "Not published"
    },
    {
      id: "meet",
      label: "Meet",
      detail: "Not published"
    },
    {
      id: "map",
      label: "Map",
      detail: directionsUrl ? "Open directions before leaving." : "Directions appear after the location is set.",
      href: directionsUrl || undefined,
      actionLabel: "Directions"
    }
  ];
  const playerName = primaryPlayer ? `${primaryPlayer.firstName} ${primaryPlayer.lastInitial}.` : "Linked player";
  const gameDayPlayerPlan: GameDayPlanItem[] = [
    {
      id: "player",
      label: playerName,
      detail: primaryPlayer ? `Jersey #${primaryPlayer.jersey}, ${teamDivision}` : teamDivision
    },
    {
      id: "rsvp",
      label: "RSVP",
      detail: nextParentRsvpCopy
    },
    {
      id: "weather",
      label: "Weather",
      detail: parentWeatherCopy
    },
    {
      id: "help",
      label: "Help",
      detail: parentHelpCopy
    }
  ];
  const gameDayPlanText = [
    `${nextParentEvent?.title ?? "Next event"} - ${nextParentEvent ? `${formatShortDay(nextParentEvent.startsAt)} at ${formatShortTime(nextParentEvent.startsAt)}` : "schedule pending"}`,
    `Team: ${teamName}`,
    `Leave by: ${gameDayArrivalPlan[0]?.detail ?? "Pending"}`,
    `Arrive by: ${gameDayArrivalPlan[1]?.detail ?? "Pending"}`,
    `Field: ${gameDayFieldPlan[0]?.detail ?? "Location pending"}`,
    "Meet: Not published",
    `RSVP: ${nextParentRsvpCopy}`,
    `Weather: ${parentWeatherCopy}`,
    `Family help: ${parentHelpCopy}`,
    "Local checklist only. It does not save attendance or send alerts."
  ].join("\n");
  const actionChecklist = [
    {
      label: "Check the family calendar",
      done: allParentEvents.length > 0,
      detail: allParentEvents[0] ? `${allParentEvents[0].title} at ${formatDate(allParentEvents[0].startsAt)}` : "No linked team events are scheduled."
    },
    {
      label: "Answer open RSVPs",
      done: dashboard.rsvpNeeded.length === 0,
      detail: dashboard.rsvpNeeded.length ? `${dashboard.rsvpNeeded.length} RSVP still need a response.` : "All visible RSVP requests are answered."
    },
    {
      label: "Review snack and volunteer openings",
      done: openSnackSlots.length + openVolunteerSignups.length === 0,
      detail: `${openSnackSlots.length} snack slot(s), ${openVolunteerSignups.length} volunteer role(s) open.`
    },
    {
      label: "Review the media feed",
      done: mediaFeed.length > 0,
      detail: mediaFeed.length ? `${mediaFeed.length} approved media item(s) available.` : "No approved team media is visible yet."
    },
    {
      label: "Set schedule notification rules",
      done: sourceState.notificationPreferences.some((item) => item.userId === parentUserId && item.notificationType === "schedule_changed"),
      detail: "Family messages still require opted-in channels and an approved delivery connection."
    }
  ];
  const schedulePreferences = (["push", "email", "sms"] as const).map((channel) => {
    const preference = sourceState.notificationPreferences.find((item) => (
      item.userId === parentUserId &&
      item.channel === channel &&
      item.notificationType === "schedule_changed" &&
      (!item.teamId || parentTeamIds.has(item.teamId))
    ));
    return {
      channel,
      enabled: preference?.enabled ?? channel !== "sms",
      quietHours: preference?.quietHoursStart && preference.quietHoursEnd
        ? `${preference.quietHoursStart}-${preference.quietHoursEnd}`
        : "8:30 PM-7:00 AM"
    };
  });
  const parentSeasonView = buildParentSeasonCertaintyView({
    state: sourceState,
    parentUserId,
    accessStatus: dashboardData?.accessStatus ?? "live",
    message: dashboardData?.message ?? "Preview details are shown until approved family access is available.",
    isSupabaseBacked: dashboardData?.isSupabaseBacked ?? false,
    now: NOW
  });

  function claimFamilyHelp(url: string, payload: unknown) {
    if (!dashboardData?.isSupabaseBacked) {
      setHelpMessage("Sign in with an approved parent link before claiming snacks or volunteer roles.");
      return;
    }

    startHelpTransition(async () => {
      const actionId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `family-help-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await authenticatedJsonFetch(url, payload, {
        "Idempotency-Key": actionId
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setHelpMessage(result?.message ?? (response.ok ? "Claim saved." : "Claim could not be saved."));
    });
  }

  function saveSchedulePreference(channel: "push" | "email" | "sms", enabled: boolean) {
    if (!dashboardData?.isSupabaseBacked || !primaryTeamId) {
      setHelpMessage("Sign in with an approved parent link before saving notification preferences.");
      return;
    }

    startHelpTransition(async () => {
      const response = await authenticatedJsonFetch("/api/notification-preferences", {
        teamId: primaryTeamId,
        channel,
        notificationType: "schedule_changed",
        enabled,
        quietHoursStart: "20:30",
        quietHoursEnd: "07:00",
        timezone: "America/Chicago"
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setHelpMessage(result?.message ?? (response.ok ? "Preference saved." : "Preference could not be saved."));
    });
  }

  function toggleGameDayPackItem(id: string) {
    setCheckedGameDayItems((current) => ({
      ...current,
      [id]: !(current[id] ?? gameDayPackDefaults[id] ?? false)
    }));
  }

  async function copyGameDayPlan() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(gameDayPlanText);
        setGameDayCopyStatus("Game day plan copied locally.");
        return;
      }
      setGameDayCopyStatus("Copy is not available in this browser. Use the visible plan above.");
    } catch {
      setGameDayCopyStatus("Copy was blocked by the browser. Use the visible plan above.");
    }
  }

  function submitSupportRequest() {
    if (!supportDetail.trim()) {
      setHelpMessage("Add a short support request before submitting.");
      return;
    }
    if (!dashboardData?.isSupabaseBacked) {
      setHelpMessage("Sign in with an approved parent link before submitting support requests.");
      return;
    }

    startHelpTransition(async () => {
      const response = await authenticatedJsonFetch("/api/support-requests", {
        teamId: primaryTeamId,
        topic: supportTopic,
        detail: supportDetail
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setHelpMessage(result?.message ?? (response.ok ? "Support request saved." : "Support request could not be saved."));
    });
  }

  return (
    <div className="page parent-team-home-page" style={parentTeamStyle}>
      <section className="season-certainty-home parent-certainty-home" aria-label="Parent home">
        {accessGate ? <NextEventCard view={parentSeasonView} /> : (
          <>
            <ActionChecklist actions={parentSeasonView.actions.slice(0, 1)} />
            <CoachAnnouncementTicker announcements={parentAnnouncementItems} />
            <ParentSeasonStory
              seasonName={sourceState.activeSeason.name}
              teamName={teamName}
              childLabel={playerName}
              entries={parentSeasonStoryEntries}
              nextEventTitle={nextParentEvent?.title ?? "No upcoming event"}
              nextEventMeta={nextParentEvent ? `${formatShortDay(nextParentEvent.startsAt)} at ${formatShortTime(nextParentEvent.startsAt)}` : "Schedule pending"}
              location={nextParentEvent?.locationName ?? "Location pending"}
              rsvpCopy={nextParentRsvpCopy}
              weatherCopy={parentWeatherCopy}
              familyHelpCopy={parentHelpCopy}
              primaryHref={parentPrimaryAction.href}
              primaryLabel={parentPrimaryAction.label}
            />
            <CompactDisclosure
              id="parent-game-day-plan"
              title="Game-day plan"
              summary="Arrival, field, pack, player, and local checklist details."
              badge={nextEventBadge}
            >
              <ParentGameDayCalmCard
                eventTitle={nextParentEvent?.title ?? "No upcoming event"}
                eventMeta={nextParentEvent ? `${formatShortDay(nextParentEvent.startsAt)} at ${formatShortTime(nextParentEvent.startsAt)}` : "Schedule pending"}
                eventStartsAt={nextParentEvent?.startsAt}
                eventKind={(nextParentEvent?.eventType ?? "event").replaceAll("_", " ")}
                teamLabel={`${teamName} - ${teamDivision}`}
                teamInitials={teamInitials}
                badge={nextEventBadge}
                location={nextParentEvent ? `${nextParentEvent.locationName}${nextParentEvent.locationAddress ? `, ${nextParentEvent.locationAddress}` : ""}` : "Location pending"}
                directionsUrl={directionsUrl}
                rsvpCopy={nextParentRsvpCopy}
                rsvpRequired={Boolean(nextParentRsvp)}
                playerLabel={nextParentRsvp?.player.firstName ?? primaryPlayer?.firstName ?? "your player"}
                weatherCopy={parentWeatherCopy}
                helpCopy={parentHelpCopy}
                coachCopy={latestChangeCopy}
                primaryHref={parentPrimaryAction.href}
                primaryLabel={parentPrimaryAction.label}
                arrivalPlan={gameDayArrivalPlan}
                packList={gameDayPackItems}
                fieldPlan={gameDayFieldPlan}
                playerPlan={gameDayPlayerPlan}
                copyStatus={gameDayCopyStatus}
                onCopyPlan={copyGameDayPlan}
                onTogglePackItem={toggleGameDayPackItem}
              />
            </CompactDisclosure>
            <CompactDisclosure
              title="More event context"
              summary="Tasks, changes, coach update, messages, photos, and privacy."
              badge={`${parentSeasonView.actions.length} item(s)`}
            >
              <ActionChecklist actions={parentSeasonView.actions.slice(1)} />
              <WhatChangedCard changes={parentSeasonView.changes} />
              <CoachUpdateCard view={parentSeasonView} />
              <MessagesSummaryCard unreadCount={parentSeasonView.messages.unreadCount} href={parentSeasonView.messages.href} />
              <PhotosSummaryCard count={parentSeasonView.photos.newApprovedCount} latestTitle={parentSeasonView.photos.latestTitle} href="#team-media" />
              <PrivacyIndicator href="/parent/settings" />
            </CompactDisclosure>
          </>
        )}
      </section>

      <p className={`notice ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>
        {dashboardData?.isSupabaseBacked
          ? "Team details are current and scoped to your approved family access."
          : "Preview details are shown here. Sign in with approved family access to save changes."}
      </p>
      {helpMessage ? <p className="notice">{helpMessage}</p> : null}
      {accessGate ?? (
        <>
      <CompactDisclosure
        id="more-parent-actions"
        title="Needs action"
        summary="Open family tasks without showing the full operations feed."
        badge={`${actionChecklist.filter((item) => !item.done).length} open`}
      >
        <div className="card-header">
            <div>
              <span className="eyebrow">More family tasks</span>
              <h2>All pending items</h2>
          </div>
          <span className="badge">{actionChecklist.filter((item) => !item.done).length} open</span>
        </div>
        {actionChecklist.map((item) => (
          <p key={item.label}>
            <span className={`badge ${item.done ? "ok" : "warning"}`}>{item.done ? "Done" : "Action"}</span>{" "}
            <strong>{item.label}</strong><br />
            <span className="muted">{item.detail}</span>
          </p>
        ))}
      </CompactDisclosure>

      <CompactDisclosure
        title="Family Balance Summary"
        summary="Evidence-backed fee status, payment links, processing, confirmation, failure, and credits."
        badge={familyBalance.items.every((item) => item.amountCents === 0) ? "Status unavailable" : formatCents(familyBalance.netDueCents)}
      >
        <section className="grid two">
          <div className="stack compact">
            <div className="card-header">
              <div>
                <span className="eyebrow">Family finance evidence</span>
                <h2>Family Balance Summary</h2>
              </div>
              <span className="badge warning">Proof-gated</span>
            </div>
            <div className="grid three">
              <div className="metric"><span className="muted">Obligations</span><strong>{formatCents(familyBalance.unpaidCents)}</strong></div>
              <div className="metric"><span className="muted">Verified credits</span><strong>{formatCents(familyBalance.creditsCents)}</strong></div>
              <div className="metric"><span className="muted">Evidence-backed due</span><strong>{formatCents(familyBalance.netDueCents)}</strong></div>
            </div>
            <p className="notice">{familyBalance.proofBoundary}</p>
          </div>
          <div className="stack compact">
            <div className="card-header">
              <div>
                <span className="eyebrow">Balance evidence</span>
                <h2>Fee and payment status</h2>
              </div>
              <span className="badge">{familyBalance.items.length} item(s)</span>
            </div>
            {familyBalance.items.slice(0, 5).map((item) => (
              <p key={item.id}>
                <strong>{item.label}</strong><br />
                <span className="muted">{item.direction === "credit" ? "Credit" : "Charge"} {formatCents(item.amountCents)} - {item.proofState.replaceAll("_", " ")}. {item.note}</span>
              </p>
            ))}
            {!familyBalance.items.length ? <p className="muted">No family balance records are visible until a parent account has active guardian links.</p> : null}
          </div>
        </section>
      </CompactDisclosure>

      <CompactDisclosure
        title="Family snapshot"
        summary="Child, coach update, schedule, RSVP, and recent media details."
        badge={`${dashboard.children.length} child link(s)`}
      >
        <section className="grid two">
          <article className="card stack">
            <h2>My Child</h2>
            {dashboard.children.map(({ player, team }) => (
              <div key={player.id}>
                <strong>{player.firstName} {player.lastInitial}.</strong>
                <p className="muted">{team.name} - Jersey {player.jersey}</p>
              </div>
            ))}
            <span className="badge ok">{dashboard.completionStatus}</span>
          </article>

          <article className="card stack">
            <h2>Coach updates</h2>
            {dashboard.latestAnnouncement ? (
              <>
                <strong>{dashboard.latestAnnouncement.title}</strong>
                <p>{dashboard.latestAnnouncement.body}</p>
                <p className="muted">{dashboard.latestAnnouncement.teamName} - {formatDate(dashboard.latestAnnouncement.createdAt)}</p>
              </>
            ) : <p className="muted">No announcements yet.</p>}
          </article>
        </section>

        <section className="grid three">
          <article className="card stack">
            <h2>Upcoming Schedule</h2>
            {dashboard.nextEvents.map((event) => (
              <p key={event.id}><strong>{event.title}</strong><br /><span className="muted">{formatDate(event.startsAt)} - {event.locationName}</span></p>
            ))}
          </article>
          <article className="card stack">
            <h2>RSVP Needed</h2>
            {dashboard.rsvpNeeded.length ? dashboard.rsvpNeeded.map(({ event, player }) => (
              <p key={`${event.id}-${player.id}`}>{player.firstName} {player.lastInitial}. - {event.title}</p>
            )) : <p className="muted">No RSVP needed right now.</p>}
          </article>
          <article className="card stack" id="team-media">
            <h2>Recent Media</h2>
            {dashboard.recentMedia.map((item) => {
              const validation = validateMediaUrl(item.type, item.url);
              return (
                <div className="stack compact" key={item.id}>
                  <p><strong>{item.title}</strong><br /><span className="muted">{item.type.replace("_", " ")} - {validation.message}</span></p>
                  <button
                    className="secondary"
                    disabled={isHelpPending}
                    onClick={() => claimFamilyHelp("/api/media/report", { mediaItemId: item.id, reason: "Family reported this media link for review." })}
                  >
                    Report media
                  </button>
                </div>
              );
            })}
            {!dashboard.recentMedia.length ? <p className="muted">No media links yet.</p> : null}
          </article>
        </section>
      </CompactDisclosure>

      <CompactDisclosure
        title="Media and privacy"
        summary="Moderation, consent controls, and approved media links."
        badge={`${familyModerationQueue.length} review`}
      >
      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family-facing moderation queue</span>
              <h2>Media under review</h2>
            </div>
            <span className="badge warning">{familyModerationQueue.length} item(s)</span>
          </div>
          {familyModerationQueue.map((entry) => <p key={entry.item.id}><strong>{entry.item.title}</strong><br /><span className="muted">{entry.message}</span></p>)}
          {!familyModerationQueue.length ? <p className="muted">No reported media is waiting for family-facing review.</p> : null}
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Media consent controls</span>
              <h2>Family consent</h2>
            </div>
            <span className="badge">Policy</span>
          </div>
          {mediaConsentControls.map((control) => (
            <p key={control.label}><strong>{control.label}</strong><br /><span className="muted">{control.enabled ? "Enabled" : "Planned"} · {control.detail}</span></p>
          ))}
        </article>
      </section>
      </CompactDisclosure>

      <CompactDisclosure
        title="Calendar and team media"
        summary="Full family calendar and filterable team media feed."
        badge={`${filteredParentEvents.length} event(s)`}
      >
      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family calendar</span>
              <h2>Family calendar</h2>
            </div>
            <span className="badge">{filteredParentEvents.length} event(s)</span>
          </div>
          <div className="toolbar">
            {(["all", "game", "practice", "team_event"] as const).map((filter) => (
              <button
                className={scheduleTypeFilter === filter ? undefined : "secondary"}
                key={filter}
                onClick={() => setScheduleTypeFilter(filter)}
              >
                {filter === "all" ? "All" : filter.replace("_", " ")}
              </button>
            ))}
          </div>
          {filteredParentEvents.map((event) => (
            <p key={event.id}>
              <span className="badge">{event.eventType.replace("_", " ")}</span>{" "}
                <strong>{event.title}</strong><br />
              <span className="muted">{formatDate(event.startsAt)} · Arrival not published · {event.locationName}</span>
            </p>
          ))}
          {!filteredParentEvents.length ? <p className="muted">No family events match this filter.</p> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Team media</span>
              <h2>Team media</h2>
            </div>
            <span className="badge">{filteredMediaFeed.length} item(s)</span>
          </div>
          <div className="toolbar">
            {(["all", "google_photos", "youtube"] as const).map((filter) => (
              <button
                className={mediaTypeFilter === filter ? undefined : "secondary"}
                key={filter}
                onClick={() => setMediaTypeFilter(filter)}
              >
                {filter === "all" ? "All" : filter.replace("_", " ")}
              </button>
            ))}
          </div>
          {filteredMediaFeed.map((item) => {
            const validation = validateMediaUrl(item.type, item.url);
            return (
              <div className="stack compact" key={item.id}>
                <p><strong>{item.title}</strong><br /><span className="muted">{item.type.replace("_", " ")} · {formatDate(item.createdAt)} · {validation.message}</span></p>
                <button
                  className="secondary"
                  disabled={isHelpPending}
                  onClick={() => claimFamilyHelp("/api/media/report", { mediaItemId: item.id, reason: "Family reported this media link for review." })}
                >
                  Report media
                </button>
              </div>
            );
          })}
          {!filteredMediaFeed.length ? <p className="muted">No media links match this filter.</p> : null}
        </article>
      </section>
      </CompactDisclosure>

      <CompactDisclosure
        title="Family logistics"
        summary="Snack openings, volunteer roles, and notification preferences."
        badge={`${parentHelpCount} open`}
        defaultOpen={parentHelpCount > 0}
      >
      <section className="grid two">
        <div className="stack compact">
          <div className="card-header">
            <div>
              <span className="eyebrow">One-Tap Volunteer Marketplace</span>
              <h2>Team help board</h2>
            </div>
            <span className="badge">{parentVolunteerMarketplace.filter((job) => job.actionStatus === "claimable").length} claimable</span>
          </div>
          {parentVolunteerMarketplace.slice(0, 7).map((job) => (
            <div className="stack compact" key={job.id}>
              <p><strong>{job.title}</strong><br /><span className="muted">{job.category.replace("_", " ")} - {job.detail} {job.reminderBoundary}</span></p>
              <button
                className="secondary"
                disabled={isHelpPending || job.actionStatus !== "claimable" || !job.claimEndpoint || !job.claimPayload}
                onClick={() => job.claimEndpoint && job.claimPayload ? claimFamilyHelp(job.claimEndpoint, job.claimPayload) : undefined}
              >
                {job.actionLabel}
              </button>
            </div>
          ))}
        </div>
        <div className="stack compact">
          <div className="card-header">
            <div>
              <span className="eyebrow">Equipment Exchange</span>
              <h2>Moderated gear board</h2>
            </div>
            <span className="badge">{parentEquipmentExchange.length} visible</span>
          </div>
          {parentEquipmentExchange.map((listing) => (
            <p key={listing.id}>
              <strong>{listing.title}</strong><br />
              <span className="muted">{listing.kind} - {listing.sizeOrAge} - {listing.condition}. {listing.detail}</span>
            </p>
          ))}
          {!parentEquipmentExchange.length ? <p className="muted">No approved gear listings are visible for this team yet.</p> : null}
          <p className="notice">Gear exchange listings are moderated and do not expose parent contact details publicly.</p>
        </div>
      </section>

      {parentAvailabilityIntelligence ? (
        <section className="grid one">
          <div className="stack compact">
            <div className="card-header">
              <div>
                <span className="eyebrow">Family Availability Intelligence</span>
                <h2>{parentAvailabilityIntelligence.eventTitle}</h2>
              </div>
              <span className={`badge ${parentAvailabilityIntelligence.signal === "ready" ? "ok" : "warning"}`}>{parentAvailabilityIntelligence.signal.replace("_", " ")}</span>
            </div>
            <p>{parentAvailabilityIntelligence.summary}</p>
            <p className="muted">Response rate {parentAvailabilityIntelligence.responseRate}%; schedule conflicts {parentAvailabilityIntelligence.scheduleConflictCount}.</p>
            <p className="notice">{parentAvailabilityIntelligence.boundary}</p>
          </div>
        </section>
      ) : null}

      <section className="grid two" id="family-help">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family help</span>
              <h2>Snack openings</h2>
            </div>
            <span className="badge">{openSnackSlots.length} open</span>
          </div>
          {openSnackSlots.map((slot) => {
            const event = eventById.get(slot.eventId);
            return (
              <div className="stack compact" key={slot.id}>
                <p><strong>{slot.item}</strong><br /><span className="muted">{event?.title ?? "Team event"} · {event ? formatDate(event.startsAt) : "Date pending"}</span></p>
                <button
                  className="secondary"
                  disabled={isHelpPending}
                  onClick={() => claimFamilyHelp("/api/snack-slots/claim", { slotId: slot.id })}
                >
                  Claim snack slot
                </button>
              </div>
            );
          })}
          {!openSnackSlots.length ? <p className="muted">No open snack slots for linked teams.</p> : null}
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family help</span>
              <h2>Volunteer openings</h2>
            </div>
            <span className="badge">{openVolunteerSignups.length} open</span>
          </div>
          {openVolunteerSignups.map((signup) => {
            const event = signup.eventId ? eventById.get(signup.eventId) : undefined;
            return (
              <div className="stack compact" key={signup.id}>
                <p><strong>{signup.role}</strong><br /><span className="muted">{event?.title ?? "Team need"}{event ? ` · ${formatDate(event.startsAt)}` : ""}</span></p>
                <button
                  className="secondary"
                  disabled={isHelpPending}
                  onClick={() => claimFamilyHelp("/api/volunteer-signups/claim", { signupId: signup.id })}
                >
                  Claim volunteer role
                </button>
                <button
                  className="secondary"
                  disabled={isHelpPending}
                  onClick={() => claimFamilyHelp("/api/volunteer-signups/waitlist", { signupId: signup.id })}
                >
                  Join backup list
                </button>
              </div>
            );
          })}
          {!openVolunteerSignups.length ? <p className="muted">No open volunteer roles for linked teams.</p> : null}
        </article>
      </section>

      <section className="grid two" id="schedule-alerts">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Schedule alerts</span>
              <h2>Family alert rules</h2>
            </div>
            <span className={`badge ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>{dashboardData?.isSupabaseBacked ? "Saved" : "Preview only"}</span>
          </div>
          {schedulePreferences.map((preference) => (
            <div className="stack compact" key={preference.channel}>
              <p><strong>{preference.channel.toUpperCase()}</strong> schedule alerts {preference.enabled ? "on" : "off"}<br /><span className="muted">Quiet hours {preference.quietHours}</span></p>
              <div className="toolbar">
                <button
                  className={preference.enabled ? undefined : "secondary"}
                  disabled={isHelpPending}
                  onClick={() => saveSchedulePreference(preference.channel, true)}
                >
                  On
                </button>
                <button
                  className={preference.enabled ? "secondary" : undefined}
                  disabled={isHelpPending}
                  onClick={() => saveSchedulePreference(preference.channel, false)}
                >
                  Off
                </button>
              </div>
            </div>
          ))}
          <p className="muted">Saving updates your family alert rules. Messages still require opt-in, league policy checks, and an approved delivery connection.</p>
        </article>
        <article className="card stack">
          <h2>Respectful messaging boundary</h2>
          <p>Schedule changes, weather, RSVP reminders, weekly digests, and urgent alerts should all read these family rules before delivery.</p>
          <p className="notice">Urgent alerts can still be drafted for review, but production sending must honor quiet hours and fallback settings.</p>
        </article>
      </section>
      </CompactDisclosure>

      <CompactDisclosure
        id="family-help"
        title="Support"
        summary="Ask league staff for help when family access or team details need review."
        badge={dashboardData?.isSupabaseBacked ? "saved" : "preview"}
      >
      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Ask for help</span>
              <h2>Ask league staff for help</h2>
            </div>
            <span className={`badge ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>{dashboardData?.isSupabaseBacked ? "Saved" : "Preview only"}</span>
          </div>
          <label>
            Topic
            <select value={supportTopic} onChange={(event) => setSupportTopic(event.target.value)}>
              <option value="schedule">Schedule</option>
              <option value="rsvp">RSVP</option>
              <option value="registration">Registration</option>
              <option value="media">Media</option>
              <option value="notifications">Notifications</option>
            </select>
          </label>
          <label>
            Details
            <textarea value={supportDetail} onChange={(event) => setSupportDetail(event.target.value)} rows={4} />
          </label>
          <button disabled={isHelpPending || !supportDetail.trim()} onClick={submitSupportRequest}>Submit support request</button>
          <p className="muted">Submitting saves a staff-review support record. It does not imply a connected helpdesk or provider send.</p>
        </article>
        <article className="card stack">
          <h2>Support routing context</h2>
          <p><strong>Family:</strong> {parentUser?.name ?? "Parent account"}</p>
          <p><strong>Linked teams:</strong> {dashboard.children.map(({ team }) => team.name).join(", ") || "No approved team links"}</p>
          <p className="muted">Staff should see team, child, RSVP, and notification context before replying.</p>
        </article>
      </section>
      </CompactDisclosure>
        </>
      )}
    </div>
  );
}

export function ParentRsvpClient({ dashboardData }: { dashboardData?: ParentCoachDashboardData | null } = {}) {
  const { state } = useAppState();
  const [savedAnswers, setSavedAnswers] = useState<Record<string, {
    response: Extract<RsvpResponse, "going" | "maybe" | "not_going">;
    lockVersion: number;
  }>>({});
  const sourceState = dashboardData?.state ?? state;
  const parentUserId = dashboardData?.parentUserId ?? "user-parent-jordan";
  const parentUser = sourceState.users.find((user) => user.id === parentUserId);
  const accessGate = privateAccessGate(dashboardData, "parent");
  const isArchivedSeason = sourceState.activeSeason.status === "archived";
  const rsvpHistory = sourceState.rsvps
    .filter((rsvp) => rsvp.parentUserId === parentUserId)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6);
  const mission = buildFamilyMissionControl({
    state: sourceState,
    parentUserId,
    handoffs: [],
    accessStatus: dashboardData?.accessStatus ?? "live",
    isSupabaseBacked: dashboardData?.isSupabaseBacked ?? false,
    message: dashboardData?.message ?? "Preview family schedule.",
    now: NOW
  });
  const tasks = mission.events.filter((event) => event.rsvpNeedsAction);

  return (
    <div className="page parent-rsvp-page">
      <section className="hero parent-rsvp-hero">
        <span className="eyebrow">Needs reply</span>
        <h1>Answer the family RSVP list.</h1>
        <p className="lead">Only unanswered or schedule-changed events for children linked to {parentUser?.name ?? "this account"} appear here.</p>
      </section>

      <p className={`notice ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>
        {dashboardData?.accessStatus === "live" ? "RSVP details are current for your approved family access." : "Preview details are shown until approved family access is available."}
      </p>
      {isArchivedSeason ? <p className="notice warning">Archived RSVP read-only mode is active. Past attendance remains visible, but edits are locked.</p> : null}
      {accessGate ?? (
      <div className="parent-rsvp-layout">
        <section className="parent-rsvp-task-list" aria-labelledby="parent-rsvp-task-title">
          <header>
            <span>
              <small>Family action list</small>
              <h2 id="parent-rsvp-task-title">Needs reply</h2>
            </span>
            <strong>{tasks.length} {tasks.length === 1 ? "response" : "responses"}</strong>
          </header>
          {tasks.map((event) => {
            const persisted = sourceState.rsvps.find((item) => (
              item.eventId === event.eventId &&
              item.playerId === event.childId &&
              item.parentUserId === parentUserId
            ));
            const saved = savedAnswers[event.projectionId];
            return (
              <article className="parent-rsvp-task" key={event.projectionId}>
                <div>
                  <span>{event.childLabel} · {event.teamName}</span>
                  <h3>{event.title}</h3>
                  <p>{event.dateLabel} · {event.startLabel} · {event.venueLabel}</p>
                </div>
                <RsvpControl
                  eventId={event.eventId}
                  playerId={event.childId}
                  childLabel={event.childLabel}
                  eventTitle={event.title}
                  scheduleVersion={event.scheduleVersion}
                  currentResponse={saved?.response ?? persisted?.response}
                  currentLockVersion={saved?.lockVersion ?? persisted?.lockVersion ?? 0}
                  disabled={isArchivedSeason}
                  onSaved={({ response, lockVersion }) => setSavedAnswers((current) => ({
                    ...current,
                    [event.projectionId]: { response, lockVersion }
                  }))}
                />
              </article>
            );
          })}
          {!tasks.length ? (
            <div className="parent-rsvp-empty">
              <strong>No replies needed</strong>
              <p>Your linked children have no unanswered or schedule-changed events.</p>
              <a className="button secondary" href="/parent/schedule">Open family schedule</a>
            </div>
          ) : null}
        </section>
        <aside className="card stack parent-rsvp-history">
          <h2>RSVP history</h2>
          {rsvpHistory.map((rsvp) => {
            const event = sourceState.events.find((item) => item.id === rsvp.eventId);
            const player = sourceState.players.find((item) => item.id === rsvp.playerId);
            return (
              <p key={rsvp.id}>
                <strong>{event?.title ?? "Event"}</strong><br />
                <span className="muted">{player ? `${player.firstName} ${player.lastInitial}.` : "Player"} · {responseLabel(rsvp.response)} · {formatDate(rsvp.updatedAt)}</span>
              </p>
            );
          })}
          {!rsvpHistory.length ? <p className="muted">No RSVP history yet.</p> : null}
        </aside>
      </div>
      )}
    </div>
  );
}

export function CoachDashboardClient({ dashboardData }: { dashboardData?: ParentCoachDashboardData | null } = {}) {
  const { state } = useAppState();
  const [actionMessage, setActionMessage] = useState("");
  const [isActionPending, startActionTransition] = useTransition();
  const [fieldMode, setFieldMode] = useState(false);
  const [fieldNote, setFieldNote] = useState("");
  const [fieldAttendance, setFieldAttendance] = useState<Record<string, "present" | "absent" | "late">>({});
  const [fieldAttendanceVersions, setFieldAttendanceVersions] = useState<Record<string, number>>({});
  const sourceState = dashboardData?.state ?? state;
  const coachId = dashboardData?.coachUserId ?? "user-coach-taylor";
  const assignedTeamIds = new Set(sourceState.teamMemberships.filter((membership) => (
    membership.userId === coachId && membership.role === "coach" && membership.status === "active"
  )).map((membership) => membership.teamId));
  const teams = sourceState.teams.filter((team) => assignedTeamIds.has(team.id));
  const summaries = getCoachRsvpSummaries(sourceState, coachId, NOW);
  const coachSuggestions = buildCoachAssistiveSuggestions(sourceState, coachId, NOW);
  const reliabilityRows = getCoachRsvpReliability(sourceState, coachId, NOW);
  const teamIds = new Set(teams.map((team) => team.id));
  const assignedEvents = sourceState.events.filter((event) => teamIds.has(event.teamId) && event.status === "scheduled");
  const nextAssignedEvent = assignedEvents[0];
  const rsvpReminderQueue = dashboardData?.coachRsvpTargets ?? reliabilityRows
    .filter((row) => row.noResponse > 0)
    .map((row) => ({
      id: `preview:${nextAssignedEvent?.id ?? "event"}:${row.parentUser?.id ?? row.linkedPlayers.map((player) => player.id).join("-")}`,
      teamId: nextAssignedEvent?.teamId ?? row.linkedPlayers[0]?.teamId ?? "",
      eventId: nextAssignedEvent?.id ?? "",
      eventTitle: nextAssignedEvent?.title ?? "Upcoming event",
      parentUserId: row.parentUser?.id ?? "",
      familyLabel: row.parentUser?.name ?? "Linked family",
      playerDisplayNames: row.linkedPlayers.map((player) => `${player.firstName} ${player.lastInitial}.`),
      noResponse: row.noResponse
    }));
  const primaryCoachTeam = teams.find((team) => team.id === nextAssignedEvent?.teamId)
    ?? teams.find((team) => team.seasonId === sourceState.activeSeason.id)
    ?? teams[0];
  const fieldPlayers = sourceState.players.filter((player) => player.teamId === nextAssignedEvent?.teamId);
  const coachContextKey = `coach:${sourceState.organization.id}:${sourceState.activeSeason.id}:${primaryCoachTeam?.id ?? "none"}`;
  const offlineWritesEnabled = (
    process.env.NEXT_PUBLIC_OFFLINE_WRITES_ENABLED === "true" &&
    dashboardData?.accessStatus === "live" &&
    dashboardData.isSupabaseBacked
  );
  const weatherAlerts = sourceState.weatherAlerts.filter((alert) => teamIds.has(alert.teamId));
  const weatherApprovalQueue = getWeatherApprovalQueue(sourceState).filter((item) => teamIds.has(item.alert.teamId));
  const weatherRetryLogs = getWeatherProviderRetryLogs(sourceState).filter((item) => teamIds.has(item.alert.teamId));
  const weatherAlertHistory = getWeatherAlertHistory(sourceState).filter((item) => teamIds.has(item.alert.teamId));
  const sportWeatherThresholds = getSportWeatherThresholds("baseball");
  const leagueWeatherThresholds = getLeagueWeatherThresholds(primaryCoachTeam?.division ?? "3U");
  const weatherThresholdReview = evaluateWeatherThresholds({
    heatIndex: 91,
    lightningMiles: 8,
    airQualityIndex: 105,
    rainInchesPerHour: 0.3,
    thresholds: {
      heatIndex: leagueWeatherThresholds.heatIndex,
      lightningMiles: leagueWeatherThresholds.lightningMiles,
      airQualityIndex: leagueWeatherThresholds.airQualityIndex
    }
  });
  const fieldClosureDraft = createFieldClosureDraft({ eventTitle: nextAssignedEvent?.title ?? "Selected event", reason: "rain or field safety thresholds need review" });
  const weatherEscalation = getWeatherEscalationRules(weatherThresholdReview);
  const weatherSafetyNotes = getWeatherSafetyNotes();
  const volunteerNeeds = sourceState.volunteerSignups.filter((signup) => teamIds.has(signup.teamId) && signup.status === "open");
  const snackNeeds = sourceState.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId) && slot.status === "open");
  const accessGate = privateAccessGate(dashboardData, "coach");
  const nextCoachSummary = summaries[0];
  const nextCoachEvent = nextCoachSummary?.event ?? nextAssignedEvent;
  const coachActionTasks: CoachRadarTask[] = [
    ...rsvpReminderQueue.map((row) => ({
      id: `rsvp-${row.id}`,
      category: "People" as const,
      title: `${row.familyLabel}: ${row.noResponse} RSVP response${row.noResponse === 1 ? "" : "s"} missing`,
      detail: `${row.eventTitle} | ${row.playerDisplayNames.join(", ")}`,
      actionLabel: "Save reminder draft",
      parentUserId: row.parentUserId,
      teamId: row.teamId,
      eventId: row.eventId,
      disabledReason: row.parentUserId && row.teamId && row.eventId ? undefined : "A current linked-family account and assigned-team event are required before a reminder can be drafted."
    })),
    ...snackNeeds.map((slot) => ({
      id: `snack-${slot.id}`,
      category: "Plan" as const,
      title: `Snack slot: ${slot.item}`,
      detail: sourceState.events.find((event) => event.id === slot.eventId)?.title ?? "Assigned-team event",
      actionLabel: "Review snack coverage",
      href: `/coach/snacks-volunteers#snack-${slot.id}`
    })),
    ...volunteerNeeds.map((signup) => ({
      id: `volunteer-${signup.id}`,
      category: "Plan" as const,
      title: `Volunteer role: ${signup.role}`,
      detail: sourceState.events.find((event) => event.id === signup.eventId)?.title ?? "Assigned-team event",
      actionLabel: "Review volunteer coverage",
      href: `/coach/snacks-volunteers#volunteer-${signup.id}`
    }))
  ];
  const coachReviewCount = coachActionTasks.length;
  const coachAnnouncements = sourceState.announcements
    .filter((announcement) => teamIds.has(announcement.teamId))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3)
    .map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      teamName: sourceState.teams.find((team) => team.id === announcement.teamId)?.name
    }));
  const coachRosterCount = nextCoachSummary?.totalPlayers ?? fieldPlayers.length;
  const respondedRsvpCount = Math.max(0, coachRosterCount - (nextCoachSummary?.noResponse ?? coachRosterCount));
  const assignedCoachCount = sourceState.teamMemberships.filter((membership) => (
    membership.teamId === primaryCoachTeam?.id && membership.role === "coach" && membership.status === "active"
  )).length;
  const nextCoachWeatherAlert = weatherAlerts.find((alert) => alert.eventId === nextCoachEvent?.id);
  const coachWeatherSummary = nextCoachWeatherAlert?.headline
    ?? (weatherApprovalQueue.length ? "Review needed" : "No draft");
  const coachOnboardingSteps = [
    { label: "Active coach membership", done: teams.length > 0, detail: teams.map((team) => team.name).join(", ") || "No assigned teams." },
    { label: "Review attendance snapshot", done: summaries.length > 0, detail: `${summaries.length} upcoming assigned event(s).` },
    { label: "Check weather and family help", done: weatherAlerts.length + snackNeeds.length + volunteerNeeds.length > 0, detail: `${weatherAlerts.length} weather alert(s), ${snackNeeds.length} snack slot(s), ${volunteerNeeds.length} volunteer role(s).` },
    { label: "Prepare parent update", done: true, detail: "Weekly update draft is ready for review." }
  ];
  const weeklyUpdateDraft = [
    `This week: ${assignedEvents.slice(0, 2).map((event) => `${event.title} at ${event.locationName}`).join("; ") || "No scheduled events."}`,
    `RSVP gaps: ${summaries.reduce((total, summary) => total + summary.noResponse, 0)} no-response player slot(s).`,
    `Weather: ${weatherAlerts[0] ? `${weatherAlerts[0].headline} - ${weatherAlerts[0].detail}` : "No weather alert drafted."}`,
    `Snacks: ${snackNeeds.length ? `${snackNeeds.length} open snack slot(s).` : "Snack coverage looks set."}`,
    `Volunteers: ${volunteerNeeds.length ? `${volunteerNeeds.length} open volunteer role(s).` : "Volunteer coverage looks set."}`,
    "Announcement: Please review RSVP and game-day details before the next event."
  ];
  const [weeklyUpdateBody, setWeeklyUpdateBody] = useState(weeklyUpdateDraft.join("\n"));
  const coachSeasonView = buildCoachSeasonCertaintyView({
    state: sourceState,
    coachUserId: coachId,
    accessStatus: dashboardData?.accessStatus ?? "live",
    message: dashboardData?.message ?? "Preview details are shown until an approved coach assignment is available.",
    isSupabaseBacked: dashboardData?.isSupabaseBacked ?? false,
    now: NOW
  });

  async function sendQueuedFieldAction(
    action: OfflineGameDayAction,
    endpoint: string,
    signal: AbortSignal
  ) {
    const response = await authenticatedJsonFetch(endpoint, action.payload, {
      "Idempotency-Key": action.actionId,
      "X-LeaguePilot-Offline-Replay": "true"
    }, signal);
    return {
      ok: response.ok,
      status: response.status,
      body: await response.json().catch(() => null) as Record<string, unknown> | null
    };
  }

  useEffect(() => {
    if (!nextAssignedEvent || typeof window === "undefined") return;
    const packKey = `leaguepilot-context:${coachId}:${coachContextKey}:game-day-pack`;
    try {
      localStorage.setItem(packKey, JSON.stringify({
        cachedAt: new Date().toISOString(),
        event: {
          id: nextAssignedEvent.id,
          title: nextAssignedEvent.title,
          startsAt: nextAssignedEvent.startsAt,
          locationName: nextAssignedEvent.locationName,
          scheduleVersion: nextAssignedEvent.scheduleVersion ?? 1
        },
        players: fieldPlayers.map((player) => ({
          id: player.id,
          displayName: `${player.firstName} ${player.lastInitial}.`
        }))
      }));
    } catch {
      // Field Mode remains online-only when private cache storage is unavailable.
    }
  }, [coachContextKey, coachId, fieldPlayers, nextAssignedEvent]);

  useEffect(() => {
    if (!offlineWritesEnabled || typeof window === "undefined") return;
    const sync = () => {
      void getOfflineReplaySession(coachId).then((session) => {
        if (!session) {
          setActionMessage("Sign-in required before saved Field Mode actions can sync.");
          return [];
        }
        return syncContextOutbox({
          actorId: coachId,
          organizationId: sourceState.organization.id,
          seasonId: sourceState.activeSeason.id,
          contextKey: coachContextKey,
          teamId: primaryCoachTeam?.id ?? "none"
        }, session, sendQueuedFieldAction);
      }).then((results) => {
        const conflict = results.find((result) => "conflictDetail" in result && result.conflictDetail);
        if (conflict && "conflictDetail" in conflict) setActionMessage(`Sync conflict: ${conflict.conflictDetail}`);
        else if (results.some((result) => "syncedAt" in result)) setActionMessage("Field Mode changes synced to team records.");
      }).catch(() => undefined);
    };
    if (navigator.onLine) sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [coachContextKey, coachId, offlineWritesEnabled, primaryCoachTeam?.id, sourceState.activeSeason.id, sourceState.organization.id]);

  function submitFieldAction(input: {
    actionType: "attendance" | "coach_note";
    payload: Record<string, unknown>;
    playerId?: string;
    attendanceValue?: "present" | "absent" | "late";
  }) {
    if (!nextAssignedEvent) return;
    startActionTransition(async () => {
      const ownerGeneration = offlineWritesEnabled
        ? await captureOfflineOwnerGeneration(coachId).catch(() => null)
        : null;
      const actionId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const action: QueueOfflineGameDayActionInput = {
        actionId,
        actionType: input.actionType,
        contextKey: coachContextKey,
        actorId: coachId,
        organizationId: sourceState.organization.id,
        seasonId: sourceState.activeSeason.id,
        teamId: primaryCoachTeam?.id ?? "none",
        payload: input.payload,
        queuedAt: new Date().toISOString(),
        retryCount: 0,
        baseRecordVersion: input.playerId ? fieldAttendanceVersions[input.playerId] ?? 0 : undefined,
        baseScheduleVersion: nextAssignedEvent.scheduleVersion ?? 1
      };
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!offlineWritesEnabled) {
          setActionMessage("Offline writes are disabled for this league. Cached game-day details remain available.");
          return;
        }
        if (
          ownerGeneration === null ||
          !await queueOfflineActionForCurrentSession(action, ownerGeneration)
        ) {
          setActionMessage("Sign-in required before a Field Mode change can be saved for offline sync.");
          return;
        }
        if (input.playerId && input.attendanceValue) {
          setFieldAttendance((current) => ({ ...current, [input.playerId!]: input.attendanceValue! }));
        }
        setActionMessage("Waiting to sync. This Field Mode change is saved on this device only.");
        return;
      }
      const endpoint = input.actionType === "attendance" ? "/api/coach/attendance" : "/api/coach/event-notes";
      let queuedAfterNetworkFailure = false;
      const apiResponse = await authenticatedJsonFetch(endpoint, input.payload, { "Idempotency-Key": actionId })
        .catch(async () => {
          if (offlineWritesEnabled && ownerGeneration !== null) {
            queuedAfterNetworkFailure = await queueOfflineActionForCurrentSession(
              action,
              ownerGeneration
            );
          }
          return null;
        });
      if (!apiResponse) {
        setActionMessage(queuedAfterNetworkFailure
          ? "Waiting to sync. This Field Mode change is saved on this device only."
          : "Team records are unavailable, and no offline Field Mode change was saved. Sign in again after reconnecting.");
        return;
      }
      const result = await apiResponse.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        attendance?: { lock_version?: number };
      } | null;
      setActionMessage(result?.message ?? "Field Mode action could not be saved.");
      if (!result?.ok) return;
      if (input.playerId && input.attendanceValue) {
        setFieldAttendance((current) => ({ ...current, [input.playerId!]: input.attendanceValue! }));
        if (result.attendance?.lock_version) {
          setFieldAttendanceVersions((current) => ({ ...current, [input.playerId!]: result.attendance!.lock_version! }));
        }
      }
      if (input.actionType === "coach_note") setFieldNote("");
    });
  }

  function saveFieldAttendance(playerId: string, attendanceValue: "present" | "absent" | "late") {
    if (!nextAssignedEvent) return;
    submitFieldAction({
      actionType: "attendance",
      playerId,
      attendanceValue,
      payload: {
        eventId: nextAssignedEvent.id,
        playerId,
        attendanceValue,
        expectedLockVersion: fieldAttendanceVersions[playerId] ?? 0,
        expectedScheduleVersion: nextAssignedEvent.scheduleVersion ?? 1
      }
    });
  }

  function saveFieldNote() {
    if (!nextAssignedEvent || !fieldNote.trim()) return;
    submitFieldAction({
      actionType: "coach_note",
      payload: {
        eventId: nextAssignedEvent.id,
        body: fieldNote,
        expectedScheduleVersion: nextAssignedEvent.scheduleVersion ?? 1
      }
    });
  }

  function runCoachAction(url: string, payload: unknown) {
    setActionMessage("");
    startActionTransition(async () => {
      const actionId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `coach-action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await authenticatedJsonFetch(
        url,
        payload,
        url.includes("/volunteer-signups/") ? { "Idempotency-Key": actionId } : undefined
      );
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setActionMessage(result?.message ?? (response.ok ? "Action saved." : "Action could not be saved."));
    });
  }

  function saveWeeklyUpdate() {
    if (!primaryCoachTeam) {
      setActionMessage("An assigned team is required before saving a weekly update.");
      return;
    }

    runCoachAction("/api/coach/weekly-update", {
      teamId: primaryCoachTeam.id,
      title: `Weekly update for ${primaryCoachTeam.name}`,
      body: weeklyUpdateBody
    });
  }

  function draftRsvpReminder(target: { parentUserId?: string; teamId?: string; eventId?: string }) {
    if (!target.teamId || !target.eventId || !target.parentUserId) {
      setActionMessage("A linked family and upcoming assigned-team event are required before an RSVP reminder draft can be saved.");
      return;
    }
    runCoachAction("/api/coach/rsvp-reminders/draft", {
      teamId: target.teamId,
      eventId: target.eventId,
      parentUserId: target.parentUserId
    });
  }
  return (
    <div className="page">
      <section className="season-home season-coach-home" aria-label="Coach home">
        {accessGate ? <EventReadinessCard view={coachSeasonView} /> : (
          <>
            <CoachAnnouncementTicker announcements={coachAnnouncements} />
            <CoachGameDayRadar
              teamName={primaryCoachTeam?.name ?? "Assigned team"}
              eventTitle={nextCoachEvent?.title ?? "No scheduled event"}
              eventMeta={nextCoachEvent ? `${formatShortDay(nextCoachEvent.startsAt)} at ${formatShortTime(nextCoachEvent.startsAt)}` : "Schedule pending"}
              location={nextCoachEvent?.locationName ?? "Location pending"}
              respondedRsvpCount={respondedRsvpCount}
              rosterCount={coachRosterCount}
              coachCount={assignedCoachCount}
              missingRsvpCount={nextCoachSummary?.noResponse ?? 0}
              snackCount={snackNeeds.length}
              volunteerCount={volunteerNeeds.length}
              weatherReviewCount={weatherApprovalQueue.length}
              tasks={coachActionTasks}
              weatherSummary={coachWeatherSummary}
              isPending={isActionPending}
              canDraftWeather={Boolean(nextAssignedEvent)}
              onNudgeRsvp={draftRsvpReminder}
              onDraftWeather={() => nextAssignedEvent ? runCoachAction("/api/weather-alerts/draft", { eventId: nextAssignedEvent.id }) : undefined}
            />
            <CompactDisclosure
              title="More coach context"
              summary="Attendance, recent changes, fields, drafts, and Practice Replays."
              badge={`${coachReviewCount} review`}
            >
              <div className="season-card-grid">
                <AttendanceRosterCard view={coachSeasonView} />
                <WhatChangedCard changes={coachSeasonView.changes} title="Recent changes" href="/coach/schedule" />
                <WeatherFieldCard view={coachSeasonView} />
                <DraftsToReviewCard view={coachSeasonView} />
                <PracticeRecapCard view={coachSeasonView} />
              </div>
            </CompactDisclosure>
          </>
        )}
      </section>

      <p className={`notice ${dashboardData?.isSupabaseBacked ? "ok" : "warning"}`}>
        {dashboardData?.isSupabaseBacked
          ? "Team details are current and scoped to your approved coach assignment."
          : "Preview details are shown here. Sign in with an approved coach assignment to save drafts."}
      </p>
      {actionMessage ? <p className="notice">{actionMessage}</p> : null}
      {accessGate ?? (
        <>
      <section className={`field-mode ${fieldMode ? "field-mode-active" : ""}`} aria-label="Coach Field Mode">
        <header className="field-mode-header">
          <div>
            <span className="eyebrow">Sideline command board</span>
            <h2>{fieldMode ? "Field Mode active" : "Field Mode"}</h2>
            <p>{nextAssignedEvent ? `${nextAssignedEvent.title} at ${formatShortTime(nextAssignedEvent.startsAt)}` : "No assigned event is ready."}</p>
          </div>
          <button
            type="button"
            className={fieldMode ? "field-mode-toggle active" : "field-mode-toggle"}
            onClick={() => setFieldMode((current) => !current)}
            aria-pressed={fieldMode}
          >
            {fieldMode ? "Exit Field Mode" : "Open Field Mode"}
          </button>
        </header>
        {fieldMode ? (
          <>
            <div className="field-mode-metrics">
              <p><strong>{Object.values(fieldAttendance).filter((value) => value === "present").length}</strong><span>Present</span></p>
              <p><strong>{nextCoachSummary?.noResponse ?? 0}</strong><span>No RSVP</span></p>
              <p><strong>{snackNeeds.length + volunteerNeeds.length}</strong><span>Open help</span></p>
              <p><strong>{weatherApprovalQueue.length}</strong><span>Weather review</span></p>
            </div>
            <p className="field-mode-sync">
              {offlineWritesEnabled
                ? "Attendance and operational notes can wait on this device when connection drops."
                : "Cached details are available. Offline writes remain disabled until league and environment gates are enabled."}
            </p>
            <div className="field-mode-roster">
              {fieldPlayers.map((player) => (
                <div className="field-mode-player" key={player.id}>
                  <strong>{player.firstName} {player.lastInitial}.</strong>
                  <div role="group" aria-label={`Attendance for ${player.firstName} ${player.lastInitial}.`}>
                    {(["present", "late", "absent"] as const).map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={fieldAttendance[player.id] === value ? "selected" : "secondary"}
                        disabled={isActionPending}
                        onClick={() => saveFieldAttendance(player.id, value)}
                      >
                        {value === "present" ? "Here" : value === "late" ? "Late" : "Absent"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!fieldPlayers.length ? <p>No assigned roster is available in this context.</p> : null}
            </div>
            <label className="field-mode-note">
              Operational coach note
              <textarea
                rows={3}
                value={fieldNote}
                onChange={(event) => setFieldNote(event.target.value)}
                placeholder="Private event note for assigned staff"
              />
            </label>
            <button type="button" disabled={isActionPending || !fieldNote.trim()} onClick={saveFieldNote}>
              Save private note
            </button>
            <p className="muted">Notes are not Parent Replay, announcements, or provider messages.</p>
          </>
        ) : null}
      </section>
      <CompactDisclosure
        title="Coach readiness details"
        summary="Assigned teams, setup checks, attendance, weather, and assistive suggestions."
        badge={`${coachReviewCount} review`}
      >
      <section className="grid three">
        <article className="card metric"><span className="muted">Assigned teams</span><strong>{teams.length}</strong></article>
        <article className="card metric"><span className="muted">Open volunteer roles</span><strong>{volunteerNeeds.length}</strong></article>
        <article className="card metric"><span className="muted">Open snack slots</span><strong>{snackNeeds.length}</strong></article>
      </section>

      <section className="card stack">
        <div className="card-header">
            <div>
              <span className="eyebrow">Coach setup</span>
              <h2>Team setup checklist</h2>
          </div>
          <span className="badge">{coachOnboardingSteps.filter((step) => !step.done).length} open</span>
        </div>
        {coachOnboardingSteps.map((step) => (
          <p key={step.label}>
            <span className={`badge ${step.done ? "ok" : "warning"}`}>{step.done ? "Done" : "Next"}</span>{" "}
            <strong>{step.label}</strong><br />
            <span className="muted">{step.detail}</span>
          </p>
        ))}
      </section>

      <section className="grid two">
        {coachSuggestions.map((suggestion) => (
          <article className="card stack" key={suggestion.id}>
            <span className="eyebrow">Coach notes</span>
            <h2>{suggestion.title}</h2>
            <p><strong>{suggestion.body}</strong></p>
            <p>{suggestion.recommendation}</p>
            <p className="muted">{suggestion.boundary}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Attendance snapshot</h2>
          {summaries.map((summary) => (
            <p key={summary.event.id}><strong>{summary.event.title}</strong><br /><span className="muted">Going {summary.going}, maybe {summary.maybe}, no response {summary.noResponse}</span></p>
          ))}
        </article>
        <article className="card stack">
          <h2>Weather and alerts</h2>
          {nextAssignedEvent ? (
            <button
              disabled={isActionPending}
              onClick={() => runCoachAction("/api/weather-alerts/draft", { eventId: nextAssignedEvent.id })}
            >
              Draft weather alert
            </button>
          ) : null}
          {weatherAlerts.map((alert) => (
            <p className="notice" key={alert.id}><strong>{alert.headline}</strong><br />{alert.detail}</p>
          ))}
          {!weatherAlerts.length ? <p className="muted">No weather alerts drafted for assigned teams.</p> : null}
        </article>
      </section>
      </CompactDisclosure>

      <CompactDisclosure
        title="Weather policy details"
        summary="Thresholds, field closure drafts, escalation rules, and provider retry proof."
        badge={`${weatherApprovalQueue.length} draft(s)`}
      >
      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Rain thresholds</span>
              <h2>Rain-rate review</h2>
            </div>
            <span className={`badge ${weatherThresholdReview.rain === "review" ? "warning" : "ok"}`}>{weatherThresholdReview.rain}</span>
          </div>
          <p className="muted">Rain-rate thresholds create field review prompts before schedule changes or weather alerts are queued.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Field closure drafts</span>
              <h2>{fieldClosureDraft.title}</h2>
            </div>
            <span className="badge warning">Draft</span>
          </div>
          <p>{fieldClosureDraft.body}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather escalation rules</span>
              <h2>Escalation level</h2>
            </div>
            <span className={`badge ${weatherEscalation.level === "escalate" ? "danger" : "warning"}`}>{weatherEscalation.level}</span>
          </div>
          <p>{weatherEscalation.detail}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather safety notes</span>
              <h2>Coach guidance</h2>
            </div>
            <span className="badge ok">{weatherSafetyNotes.length} note(s)</span>
          </div>
          {weatherSafetyNotes.map((note) => <p className="muted" key={note}>{note}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">League-specific weather thresholds</span>
              <h2>{leagueWeatherThresholds.division} policy</h2>
            </div>
            <span className="badge warning">League</span>
          </div>
          <p>{leagueWeatherThresholds.detail}</p>
          <p className="muted">Heat {leagueWeatherThresholds.heatIndex}, lightning {leagueWeatherThresholds.lightningMiles} miles, AQI {leagueWeatherThresholds.airQualityIndex}.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Heat thresholds</span>
              <h2>Heat index review</h2>
            </div>
            <span className={`badge ${weatherThresholdReview.heat === "review" ? "warning" : "ok"}`}>{weatherThresholdReview.heat}</span>
          </div>
          <p className="muted">Heat index inputs create review prompts before practice or game changes are queued.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Lightning thresholds</span>
              <h2>Strike distance review</h2>
            </div>
            <span className={`badge ${weatherThresholdReview.lightning === "review" ? "warning" : "ok"}`}>{weatherThresholdReview.lightning}</span>
          </div>
          <p className="muted">Lightning within the configured mile radius requires coach/admin review before field activity continues.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Air quality thresholds</span>
              <h2>AQI review</h2>
            </div>
            <span className={`badge ${weatherThresholdReview.airQuality === "review" ? "warning" : "ok"}`}>{weatherThresholdReview.airQuality}</span>
          </div>
          <p className="muted">Air-quality thresholds stay policy prompts; they do not auto-cancel events or send parent alerts.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather approval queue</span>
              <h2>Draft alerts needing review</h2>
            </div>
            <span className="badge warning">{weatherApprovalQueue.length} draft(s)</span>
          </div>
          {weatherApprovalQueue.map((item) => (
            <p key={item.alert.id}><strong>{item.alert.headline}</strong><br /><span className="muted">{item.team?.name ?? "Team"} · {item.event?.title ?? "Event"} · {item.approvalStatus}</span></p>
          ))}
          {!weatherApprovalQueue.length ? <p className="muted">No weather drafts need approval.</p> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather provider retry logs</span>
              <h2>Provider refresh review</h2>
            </div>
            <span className="badge">{weatherRetryLogs.length} retry log(s)</span>
          </div>
          {weatherRetryLogs.map((item) => (
            <p key={item.alert.id}><strong>{item.provider}</strong><br /><span className="muted">{item.alert.headline} · retry {formatDate(item.nextRetryAt)} · {item.reason}</span></p>
          ))}
          {!weatherRetryLogs.length ? <p className="muted">No high-risk weather provider retries are pending.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather alert history</span>
              <h2>Recent weather decisions</h2>
            </div>
            <span className="badge">{weatherAlertHistory.length} alert(s)</span>
          </div>
          {weatherAlertHistory.map((item) => (
            <p key={item.alert.id}><strong>{item.alert.headline}</strong><br /><span className="muted">{item.eventTitle} · {item.alert.severity} · {item.alert.status} · {formatDate(item.alert.createdAt)}</span></p>
          ))}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Sport-specific weather thresholds</span>
              <h2>Baseball safety policy</h2>
            </div>
            <span className="badge warning">Policy</span>
          </div>
          <p>{sportWeatherThresholds.detail}</p>
          <p className="muted">Thresholds create coach/admin review prompts only; parent weather delivery remains deferred.</p>
        </article>
      </section>
      </CompactDisclosure>

      <CompactDisclosure
        title="Family response details"
        summary="RSVP reliability patterns and no-response reminder drafts."
        badge={`${rsvpReminderQueue.length} queued`}
      >
      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">RSVP reliability tracker</span>
              <h2>Family response patterns</h2>
            </div>
            <span className="badge warning">Coach only</span>
          </div>
          {reliabilityRows.map((row) => (
            <p key={row.parentUser?.id ?? row.linkedPlayers.map((player) => player.id).join("-")}>
              <strong>{row.parentUser?.name ?? "Linked family"}</strong>
              <br />
              <span className="muted">{row.responseRate}% response rate · {row.noResponse} no response · {row.lateChanges} late change(s) · {row.reminderMode}</span>
            </p>
          ))}
          {!reliabilityRows.length ? <p className="muted">No active parent response history for assigned teams.</p> : null}
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">RSVP reminder queue</span>
              <h2>No-response drafts</h2>
            </div>
            <span className="badge warning">{rsvpReminderQueue.length} queued</span>
          </div>
          {rsvpReminderQueue.map((row) => (
            <div className="stack compact" key={row.id}>
              <p><strong>{row.familyLabel}</strong><br /><span className="muted">{row.eventTitle} | {row.noResponse} no response | {row.playerDisplayNames.join(", ")}</span></p>
              <button
                className="secondary"
                disabled={isActionPending || !row.parentUserId || !row.teamId || !row.eventId}
                onClick={() => draftRsvpReminder(row)}
              >
                Queue RSVP reminder draft
              </button>
            </div>
          ))}
          {!rsvpReminderQueue.length ? <p className="muted">No RSVP reminder drafts are needed.</p> : null}
          <p className="muted">This saves a coach draft only. Email, SMS, and push remain unsent until a reviewer approves the message and delivery is connected.</p>
        </article>
      </section>
      </CompactDisclosure>

      <CompactDisclosure
        title="Drafts and team help"
        summary="Weekly update draft, Practice Replay, snack, and volunteer controls."
        badge="drafts"
      >
      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Coach weekly update builder</span>
              <h2>Editable weekly message</h2>
            </div>
            <span className="badge ok">Draft</span>
          </div>
          <textarea value={weeklyUpdateBody} onChange={(event) => setWeeklyUpdateBody(event.target.value)} rows={8} />
          <button disabled={isActionPending || !weeklyUpdateBody.trim()} onClick={saveWeeklyUpdate}>Save weekly update draft</button>
          <p className="muted">Combines schedule, RSVP gaps, weather drafts, snack slots, volunteer roles, and announcement copy. Saving creates an announcement and pending notification drafts only; provider sending remains approval-gated.</p>
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <h2>Practice Replays</h2>
          <p>Use the recap builder after practice to generate parent activities and team quests.</p>
          <a href="/coach/practice-recaps">Open Practice Replays</a>
        </article>
        <article className="card stack">
          <h2>Snacks</h2>
          {sourceState.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId)).map((slot) => (
            <div className="stack compact" key={slot.id}>
              <p>{slot.item} - {slot.status}</p>
              {slot.status === "open" ? (
                <button
                  className="secondary"
                  disabled={isActionPending}
                  onClick={() => runCoachAction("/api/snack-slots/claim", { slotId: slot.id })}
                >
                  Claim snack slot
                </button>
              ) : null}
            </div>
          ))}
        </article>
        <article className="card stack">
          <h2>Volunteers</h2>
          {sourceState.volunteerSignups.filter((signup) => teamIds.has(signup.teamId)).map((signup) => (
            <div className="stack compact" key={signup.id}>
              <p>{signup.role} - {signup.status}</p>
              {signup.status === "open" ? (
                <button
                  className="secondary"
                  disabled={isActionPending}
                  onClick={() => runCoachAction("/api/volunteer-signups/claim", { signupId: signup.id })}
                >
                  Claim volunteer role
                </button>
              ) : null}
            </div>
          ))}
        </article>
      </section>
      </CompactDisclosure>
        </>
      )}
    </div>
  );
}

export function AdminTeamManagementClient({ data }: { data: AdminTeamManagementData }) {
  const [teams, setTeams] = useState(data.teams);
  const [seasons, setSeasons] = useState(data.seasons);
  const [players, setPlayers] = useState(data.players);
  const [message, setMessage] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [seasonDraft, setSeasonDraft] = useState({
    seasonId: data.seasons[0]?.id ?? "",
    name: data.seasons[0]?.name ?? "Spring 2026",
    startsAt: data.seasons[0]?.startsAt ?? "2026-03-01T00:00:00.000Z",
    endsAt: data.seasons[0]?.endsAt ?? "2026-06-30T23:59:59.000Z",
    status: data.seasons[0]?.status ?? "active"
  });
  const [teamDraft, setTeamDraft] = useState({
    teamId: data.teams[0]?.id ?? "",
    seasonId: data.teams[0]?.seasonId ?? data.seasons[0]?.id ?? "",
    name: data.teams[0]?.name ?? "New Team",
    division: data.teams[0]?.division ?? data.divisions[0] ?? "6U",
    mascot: data.teams[0]?.mascot ?? "Team",
    themeKey: data.teams[0]?.themeKey ?? "baseball",
    primaryColor: "#1d4ed8",
    secondaryColor: "#f97316",
    coachUserId: data.teams[0]?.coachUserId ?? "",
    status: data.teams[0]?.status ?? "active"
  });
  const [playerDraft, setPlayerDraft] = useState({
    playerId: data.players[0]?.id ?? "",
    teamId: data.players[0]?.teamId ?? data.teams[0]?.id ?? "",
    seasonId: data.players[0]?.seasonId ?? data.seasons[0]?.id ?? "",
    firstName: data.players[0]?.firstName ?? "Player",
    lastInitial: data.players[0]?.lastInitial ?? "A",
    jersey: data.players[0]?.jersey ?? "",
    rosterStatus: data.players[0]?.rosterStatus ?? "active"
  });
  const selectedTeamSeason = seasons.find((season) => season.id === teamDraft.seasonId);
  const selectedRosterSeason = seasons.find((season) => season.id === playerDraft.seasonId);
  const teamSeasonArchived = selectedTeamSeason?.status === "archived";
  const rosterSeasonArchived = selectedRosterSeason?.status === "archived";
  const activeSeasons = seasons.filter((season) => season.status === "active");
  const activeSeasonId = activeSeasons[0]?.id ?? seasons[0]?.id ?? "";
  const activeTeams = teams.filter((team) => team.status === "active" && team.seasonStatus === "active");
  const activeRosteredPlayers = players.filter((player) => player.rosterStatus === "active");
  const coachCoveredTeams = activeTeams.filter((team) => Boolean(team.coachUserId));

  function startNewSeason() {
    setSeasonDraft({
      seasonId: "",
      name: "Spring 2026",
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-06-30T23:59:59.000Z",
      status: "active"
    });
  }

  function startNewTeam() {
    setTeamDraft({
      teamId: "",
      seasonId: activeSeasonId,
      name: "New Team",
      division: data.divisions[0] ?? "6U",
      mascot: "Team",
      themeKey: "baseball",
      primaryColor: "#1d4ed8",
      secondaryColor: "#f97316",
      coachUserId: "",
      status: "active"
    });
  }

  function startNewPlayer() {
    const team = activeTeams[0] ?? teams[0];
    setPlayerDraft({
      playerId: "",
      teamId: team?.id ?? "",
      seasonId: team?.seasonId ?? activeSeasonId,
      firstName: "Player",
      lastInitial: "A",
      jersey: "",
      rosterStatus: "active"
    });
  }

  function selectTeam(teamId: string) {
    const team = teams.find((item) => item.id === teamId);
    setTeamDraft((current) => ({
      ...current,
      teamId,
      seasonId: team?.seasonId ?? current.seasonId,
      name: team?.name ?? current.name,
      division: team?.division ?? current.division,
      mascot: team?.mascot ?? current.mascot,
      themeKey: team?.themeKey ?? current.themeKey,
      coachUserId: team?.coachUserId ?? "",
      status: team?.status ?? current.status
    }));
  }

  function selectPlayer(playerId: string) {
    const player = players.find((item) => item.id === playerId);
    setPlayerDraft((current) => ({
      ...current,
      playerId,
      teamId: player?.teamId ?? current.teamId,
      seasonId: player?.seasonId ?? current.seasonId,
      firstName: player?.firstName ?? current.firstName,
      lastInitial: player?.lastInitial ?? current.lastInitial,
      jersey: player?.jersey ?? current.jersey,
      rosterStatus: player?.rosterStatus ?? current.rosterStatus
    }));
  }

  function saveSeason() {
    setMessage("");
    startTransition(async () => {
      let archiveProof: { previewHash: string; expiresAt: string } | undefined;
      if (seasonDraft.status === "archived") {
        if (!seasonDraft.seasonId || archiveReason.trim().length < 8) {
          setMessage("Archiving requires an existing season and a reason of at least 8 characters.");
          return;
        }
        const previewResponse = await authenticatedJsonFetch("/api/admin/impact-preview", {
          targetType: "season_archive",
          organizationId: data.organizationId,
          seasonId: seasonDraft.seasonId,
          reason: archiveReason,
        });
        const previewResult = await previewResponse.json().catch(() => null) as {
          ok?: boolean;
          message?: string;
          preview?: {
            affectedCount: number;
            counts: { teams: number; players: number; events: number };
            consequences: string[];
            previewHash: string;
            expiresAt: string;
          };
        } | null;
        if (!previewResult?.ok || !previewResult.preview) {
          setMessage(previewResult?.message ?? "Archive impact preview could not be created.");
          return;
        }
        const accepted = window.confirm([
          `Archive this season and make ${previewResult.preview.affectedCount} related records read-only?`,
          `${previewResult.preview.counts.teams} teams, ${previewResult.preview.counts.players} players, ${previewResult.preview.counts.events} events.`,
          ...previewResult.preview.consequences,
        ].join("\n\n"));
        if (!accepted) {
          setMessage("Season archive cancelled. No records changed.");
          return;
        }
        archiveProof = {
          previewHash: previewResult.preview.previewHash,
          expiresAt: previewResult.preview.expiresAt,
        };
      }
      const response = await authenticatedJsonFetch("/api/admin/seasons", {
        organizationId: data.organizationId,
        seasonId: seasonDraft.seasonId || undefined,
        name: seasonDraft.name,
        startsAt: seasonDraft.startsAt,
        endsAt: seasonDraft.endsAt,
        status: seasonDraft.status,
        ...(archiveProof ? {
          archiveReason,
          previewHash: archiveProof.previewHash,
          previewExpiresAt: archiveProof.expiresAt,
        } : {})
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        season?: { id: string; name: string; status: "active" | "archived"; starts_at: string; ends_at: string };
      } | null;
      setMessage(result?.message ?? (response.ok ? "Season saved." : "Season could not be saved."));
      if (result?.ok && result.season) {
        const mapped = {
          id: result.season.id,
          name: result.season.name,
          status: result.season.status,
          startsAt: result.season.starts_at,
          endsAt: result.season.ends_at
        };
        setSeasons((current) => [mapped, ...current.filter((item) => item.id !== mapped.id)]);
      }
    });
  }

  function saveTeam() {
    if (teamSeasonArchived) {
      setMessage("Archived seasons are read-only for team lifecycle changes.");
      return;
    }

    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/teams", {
        organizationId: data.organizationId,
        teamId: teamDraft.teamId || undefined,
        seasonId: teamDraft.seasonId,
        name: teamDraft.name,
        division: teamDraft.division,
        mascot: teamDraft.mascot,
        themeKey: teamDraft.themeKey,
        primaryColor: teamDraft.primaryColor,
        secondaryColor: teamDraft.secondaryColor,
        coachUserId: teamDraft.coachUserId || undefined,
        status: teamDraft.status
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        team?: { id: string; name: string; division: string; season_id: string; coach_user_id: string | null; mascot: string; theme_key: ProgramThemeKey; status: "active" | "archived" };
      } | null;
      setMessage(result?.message ?? (response.ok ? "Team saved." : "Team could not be saved."));
      if (result?.ok && result.team) {
        const season = seasons.find((item) => item.id === result.team!.season_id);
        const mapped = {
          id: result.team.id,
          name: result.team.name,
          division: result.team.division,
          seasonId: result.team.season_id,
          seasonName: season?.name ?? "Season",
          seasonStatus: season?.status ?? "active" as const,
          status: result.team.status,
          coachUserId: result.team.coach_user_id ?? undefined,
          rosterCount: players.filter((player) => player.teamId === result.team!.id).length,
          mascot: result.team.mascot,
          themeKey: result.team.theme_key
        };
        setTeams((current) => [mapped, ...current.filter((item) => item.id !== mapped.id)]);
      }
    });
  }

  function saveRosterPlayer() {
    if (rosterSeasonArchived) {
      setMessage("Archived seasons are read-only for roster lifecycle changes.");
      return;
    }

    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/rosters", {
        organizationId: data.organizationId,
        playerId: playerDraft.playerId || undefined,
        teamId: playerDraft.teamId,
        seasonId: playerDraft.seasonId,
        firstName: playerDraft.firstName,
        lastInitial: playerDraft.lastInitial,
        jersey: playerDraft.jersey,
        rosterStatus: playerDraft.rosterStatus
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        player?: { id: string; team_id: string; season_id: string; first_name: string; last_initial: string; jersey: string | null; roster_status: "active" | "inactive" | "archived" };
      } | null;
      setMessage(result?.message ?? (response.ok ? "Roster player saved." : "Roster player could not be saved."));
      if (result?.ok && result.player) {
        const mapped = {
          id: result.player.id,
          teamId: result.player.team_id,
          seasonId: result.player.season_id,
          firstName: result.player.first_name,
          lastInitial: result.player.last_initial,
          jersey: result.player.jersey ?? "TBD",
          rosterStatus: result.player.roster_status
        };
        setPlayers((current) => [mapped, ...current.filter((item) => item.id !== mapped.id)]);
      }
    });
  }

  return (
    <>
      {message ? <p className="notice">{message}</p> : null}

      <section className="card stack">
        <div className="card-header">
          <div>
            <span className="eyebrow">Tenant setup guide</span>
            <h2>Get this organization ready before inviting families.</h2>
          </div>
          <span className={`badge ${activeSeasons.length && activeTeams.length && activeRosteredPlayers.length ? "ok" : "warning"}`}>
            {activeSeasons.length && activeTeams.length && activeRosteredPlayers.length ? "setup started" : "needs setup"}
          </span>
        </div>
        <div className="grid three">
          <p><strong>{activeSeasons.length}</strong><br /><span className="muted">active season(s)</span></p>
          <p><strong>{activeTeams.length}</strong><br /><span className="muted">active team(s)</span></p>
          <p><strong>{coachCoveredTeams.length}</strong><br /><span className="muted">coach-covered team(s)</span></p>
          <p><strong>{activeRosteredPlayers.length}</strong><br /><span className="muted">active player(s)</span></p>
          <p><strong>{data.coaches.length}</strong><br /><span className="muted">coach/admin profile(s)</span></p>
        </div>
        <div className="grid three">
          <p>
            <span className={`badge ${activeSeasons.length ? "ok" : "warning"}`}>{activeSeasons.length ? "ready" : "next"}</span>{" "}
            <strong>1. Create an active season</strong><br />
            <span className="muted">Every tenant needs one active season before teams, rosters, and schedules are useful.</span>
          </p>
          <p>
            <span className={`badge ${activeTeams.length ? "ok" : "warning"}`}>{activeTeams.length ? "ready" : "next"}</span>{" "}
            <strong>2. Add teams and coaches</strong><br />
            <span className="muted">{activeSeasons.length ? "Create teams, then assign coach profiles or memberships." : "Create an active season first."}</span>
          </p>
          <p>
            <span className={`badge ${activeRosteredPlayers.length ? "ok" : "warning"}`}>{activeRosteredPlayers.length ? "ready" : "next"}</span>{" "}
            <strong>3. Add rostered players</strong><br />
            <span className="muted">{activeTeams.length ? "Roster players before registration approval or parent invites." : "Add at least one active team first."}</span>
          </p>
        </div>
        <p className="muted">After these basics are in place, use registration review or guardian-link repair to grant family access. Children still do not log in.</p>
      </section>

      <section className="grid three">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Season lifecycle</span>
              <h2>Create or archive seasons</h2>
            </div>
            <span className="badge">{seasons.length} season(s)</span>
          </div>
          <button className="secondary" disabled={isPending} onClick={startNewSeason}>Start new season</button>
          <label>Existing season<select value={seasonDraft.seasonId} onChange={(event) => {
            const season = seasons.find((item) => item.id === event.target.value);
            setSeasonDraft({
              seasonId: event.target.value,
              name: season?.name ?? "",
              startsAt: season?.startsAt ?? "2026-03-01T00:00:00.000Z",
              endsAt: season?.endsAt ?? "2026-06-30T23:59:59.000Z",
              status: season?.status ?? "active"
            });
          }}>
            <option value="">New season</option>
            {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
          </select></label>
          <label>Name<input value={seasonDraft.name} onChange={(event) => setSeasonDraft({ ...seasonDraft, name: event.target.value })} /></label>
          <label>Starts<input value={seasonDraft.startsAt} onChange={(event) => setSeasonDraft({ ...seasonDraft, startsAt: event.target.value })} /></label>
          <label>Ends<input value={seasonDraft.endsAt} onChange={(event) => setSeasonDraft({ ...seasonDraft, endsAt: event.target.value })} /></label>
          <label>Status<select value={seasonDraft.status} onChange={(event) => setSeasonDraft({ ...seasonDraft, status: event.target.value as "active" | "archived" })}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select></label>
          {seasonDraft.status === "archived" ? (
            <label>
              Archive reason
              <textarea
                rows={3}
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                placeholder="Explain why this season should become read-only."
              />
            </label>
          ) : null}
          <button disabled={isPending || !seasonDraft.name.trim()} onClick={saveSeason}>Save season</button>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Team CRUD</span>
              <h2>Team and coach assignment</h2>
            </div>
            <span className={`badge ${teamSeasonArchived ? "warning" : "ok"}`}>{teamSeasonArchived ? "Read-only" : "Editable"}</span>
          </div>
          <button className="secondary" disabled={isPending || !activeSeasonId} onClick={startNewTeam}>Start new team</button>
          {!activeSeasonId ? <p className="notice warning">Create an active season before adding teams.</p> : null}
          <label>Team<select value={teamDraft.teamId} onChange={(event) => selectTeam(event.target.value)}>
            <option value="">New team</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select></label>
          <label>Season<select value={teamDraft.seasonId} onChange={(event) => setTeamDraft({ ...teamDraft, seasonId: event.target.value })}>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name} ({season.status})</option>)}</select></label>
          <label>Name<input value={teamDraft.name} onChange={(event) => setTeamDraft({ ...teamDraft, name: event.target.value })} /></label>
          <label>Division<input value={teamDraft.division} onChange={(event) => setTeamDraft({ ...teamDraft, division: event.target.value })} /></label>
          <label>Mascot<input value={teamDraft.mascot} onChange={(event) => setTeamDraft({ ...teamDraft, mascot: event.target.value })} /></label>
          <label>Coach<select value={teamDraft.coachUserId} onChange={(event) => setTeamDraft({ ...teamDraft, coachUserId: event.target.value })}>
            <option value="">Unassigned</option>
            {data.coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
          </select></label>
          <label>Status<select value={teamDraft.status} onChange={(event) => setTeamDraft({ ...teamDraft, status: event.target.value as "active" | "archived" })}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select></label>
          <button disabled={isPending || teamSeasonArchived || !teamDraft.seasonId || !teamDraft.name.trim()} onClick={saveTeam}>Save team</button>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Roster lifecycle</span>
              <h2>Player records</h2>
            </div>
            <span className={`badge ${rosterSeasonArchived ? "warning" : "ok"}`}>{rosterSeasonArchived ? "Read-only" : "Editable"}</span>
          </div>
          <button className="secondary" disabled={isPending || !activeTeams.length} onClick={startNewPlayer}>Start new player</button>
          {!activeTeams.length ? <p className="notice warning">Create an active team before adding rostered players.</p> : null}
          <label>Player<select value={playerDraft.playerId} onChange={(event) => selectPlayer(event.target.value)}>
            <option value="">New player</option>
            {players.map((player) => <option key={player.id} value={player.id}>{player.firstName} {player.lastInitial}.</option>)}
          </select></label>
          <label>Team<select value={playerDraft.teamId} onChange={(event) => {
            const team = teams.find((item) => item.id === event.target.value);
            setPlayerDraft({ ...playerDraft, teamId: event.target.value, seasonId: team?.seasonId ?? playerDraft.seasonId });
          }}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <label>First name<input value={playerDraft.firstName} onChange={(event) => setPlayerDraft({ ...playerDraft, firstName: event.target.value })} /></label>
          <label>Last initial<input value={playerDraft.lastInitial} maxLength={2} onChange={(event) => setPlayerDraft({ ...playerDraft, lastInitial: event.target.value })} /></label>
          <label>Jersey<input value={playerDraft.jersey} onChange={(event) => setPlayerDraft({ ...playerDraft, jersey: event.target.value })} /></label>
          <label>Status<select value={playerDraft.rosterStatus} onChange={(event) => setPlayerDraft({ ...playerDraft, rosterStatus: event.target.value as "active" | "inactive" | "archived" })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select></label>
          <button disabled={isPending || rosterSeasonArchived || !playerDraft.teamId || !playerDraft.firstName.trim() || !playerDraft.lastInitial.trim()} onClick={saveRosterPlayer}>Save roster player</button>
        </article>
      </section>

      <section className="grid two">
        {teams.map((team) => (
          <article className="card stack" key={team.id}>
            <span className="eyebrow">{team.division}</span>
            <h2>{team.name}</h2>
            <p>{team.mascot} - {team.themeKey}</p>
            <p><span className={`badge ${team.status === "active" ? "ok" : "warning"}`}>{team.status}</span></p>
            <p>Roster: {players.filter((player) => player.teamId === team.id && player.rosterStatus === "active").length} active player(s)</p>
            <p className="muted">Coach: {data.coaches.find((coach) => coach.id === team.coachUserId)?.name ?? team.coachUserId ?? "Unassigned"}</p>
            <p className="muted">{team.seasonName} ({team.seasonStatus})</p>
          </article>
        ))}
      </section>
    </>
  );
}

interface AdminDashboardClientProps {
  registrationRequests?: RegistrationRequest[];
  sponsorData?: SponsorAdminData;
  mediaData?: MediaGovernanceData;
  drillVideoData?: DrillVideoLibraryData;
  surface?: AdminDashboardSurfaceMode;
}

export type AdminDashboardSurfaceMode = "overview" | "media" | "sponsors";

export function AdminDashboardClient({ registrationRequests, sponsorData, mediaData, drillVideoData, surface = "overview" }: AdminDashboardClientProps = {}) {
  const { state, dispatch } = useAppState();
  const showOverview = surface === "overview";
  const showMedia = surface === "media";
  const showSponsors = surface === "sponsors";
  const focusedSurfaceCopy = surface === "media"
    ? {
      eyebrow: "Media review",
      title: "Review reported media and visibility before families see it.",
      body: "Moderation keeps reported, hidden, rejected, removed, or unapproved drill video references out of family-facing views until staff review is complete."
    }
    : surface === "sponsors"
      ? {
        eyebrow: "Sponsor operations",
        title: "Manage sponsor records without exposing billing state to families.",
        body: "Admin sponsor workflows keep placements, logo metadata, and Stripe readiness records separate from child-facing display."
      }
      : null;
  const healthCards = computeAdminHealth(state, NOW);
  const adminSuggestions = buildAdminAssistiveSuggestions(state, NOW);
  const visibleRegistrations = registrationRequests ?? state.registrationRequests;
  const pendingRegistrations = visibleRegistrations.filter((request) => request.status === "pending");
  const sponsorTeams = sponsorData ? sponsorData.teams : state.teams;
  const mediaTeams = mediaData?.teams.length ? mediaData.teams : state.teams;
  const drillTeams = drillVideoData?.teams.length ? drillVideoData.teams : state.teams;
  const initialSponsors = sponsorData ? sponsorData.sponsors : state.sponsors;
  const initialMediaItems = mediaData?.mediaItems.length ? mediaData.mediaItems : state.mediaItems;
  const initialDrillVideos = drillVideoData?.drillVideos ?? [];
  const initialDrillSources = drillVideoData?.sources ?? [];
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMediaItems);
  const [drillVideos, setDrillVideos] = useState<DrillVideo[]>(initialDrillVideos);
  const [drillSources, setDrillSources] = useState<DrillVideoSource[]>(initialDrillSources);
  const mediaReportingSummary = getMediaReportingSummary(mediaItems);
  const mediaReviewQueue = mediaItems
    .filter((item) => item.moderationStatus === "pending" || (item.reportCount ?? 0) > 0)
    .sort((first, second) => mediaReviewPriority(first) - mediaReviewPriority(second));
  const uploadStorageProvider = getUploadStorageProviderStatus(false);
  const mediaRetentionPolicy = getMediaRetentionPolicy();
  const parentVisibleMediaCount = mediaItems.filter((item) => canViewMediaByRole(item, "parent")).length;
  const activeSponsors = sponsors.filter((sponsor) => sponsor.status === "active");
  const sponsorDisplayPolicy = getSponsorPublicDisplayPolicy();
  const scheduleSponsorPlacement = getScheduleSponsorPlacement(sponsors);
  const mediaGallerySponsorPlacement = getMediaGallerySponsorPlacement(sponsors);
  const emailSponsorPlacement = getEmailSponsorPlacement(sponsors);
  const bannerSponsorPlacement = getBannerSponsorPlacement(sponsors);
  const sponsorBillingProofs = buildSponsorBillingProofs(sponsors);
  const sponsorProofRows: SponsorProofLedgerRow[] = sponsors.map((sponsor) => {
    const billingProof = sponsorBillingProofs.find((proof) => proof.sponsorId === sponsor.id);
    const placementLabel = sponsor.status === "active" && sponsor.placementKey
      ? sponsor.placementKey.replaceAll("_", " ")
      : "Not public";
    const billingLabel = billingProof
      ? billingProof.invoiceReference === "not-issued"
        ? `${billingProof.billingStatus.replaceAll("_", " ")}; no invoice issued`
        : `${billingProof.paymentProofStatus.replaceAll("_", " ")}; invoice referenced`
      : "No billing record";

    return {
      id: sponsor.id,
      name: sponsor.name,
      level: sponsor.level === "team" ? "Team sponsor" : "League sponsor",
      status: sponsor.status,
      placementLabel,
      billingLabel,
      logoLabel: sponsor.logoUrl ? "On file" : "Not attached",
      evidenceCount: 1 + Number(Boolean(sponsor.placementKey)) + Number(Boolean(sponsor.logoUrl))
    };
  });
  const moneySponsorsState = useMemo(() => ({ ...state, sponsors }), [sponsors, state]);
  const leagueRevenueSummary = useMemo(() => buildLeagueRevenueSummary(moneySponsorsState), [moneySponsorsState]);
  const sponsorOpportunities = useMemo(() => buildSponsorOpportunities(moneySponsorsState), [moneySponsorsState]);
  const adminCommunityTeamId = state.teams[0]?.id ?? sponsorTeams[0]?.id ?? "";
  const adminVolunteerMarketplace = adminCommunityTeamId ? buildVolunteerMarketplace(state, adminCommunityTeamId) : [];
  const adminEquipmentExchange = adminCommunityTeamId ? buildEquipmentExchange(state, adminCommunityTeamId, "admin") : [];
  const adminWeatherSafety = adminCommunityTeamId ? buildWeatherSafetyDecisionAssistant(state, adminCommunityTeamId, NOW) : undefined;
  const adminSponsorSafeGallery = adminCommunityTeamId ? buildSponsorSafeMediaGallery(moneySponsorsState, adminCommunityTeamId) : undefined;
  const adminAvailabilityIntelligence = adminCommunityTeamId ? buildFamilyAvailabilityIntelligence(state, adminCommunityTeamId, NOW) : undefined;
  const touchTargetQa = getTouchTargetQa();
  const offlineStateSummary = getOfflineStateSummary();
  const contrastChecks = getAccessibilityContrastChecks();
  const privacyFilters = getPrivacyFilters();
  const [communicationTeamId, setCommunicationTeamId] = useState("team-tigers");
  const [communicationChannel, setCommunicationChannel] = useState<AdminCommunicationChannel>("email");
  const [communicationTemplate, setCommunicationTemplate] = useState<CommunicationTemplate>("weekly_digest");
  const initialCommunicationCopy = defaultTeamCommunicationCopy(state, "team-tigers", "weekly_digest");
  const [communicationSubject, setCommunicationSubject] = useState(initialCommunicationCopy.subject);
  const [communicationBody, setCommunicationBody] = useState(initialCommunicationCopy.body);
  const [communicationMessage, setCommunicationMessage] = useState("");
  const [sponsorId, setSponsorId] = useState(initialSponsors[0]?.id ?? "new");
  const [sponsorName, setSponsorName] = useState(initialSponsors[0]?.name ?? "");
  const [sponsorLevel, setSponsorLevel] = useState<Sponsor["level"]>(initialSponsors[0]?.level ?? "league");
  const [sponsorTeamId, setSponsorTeamId] = useState(initialSponsors[0]?.teamId ?? sponsorTeams[0]?.id ?? "");
  const [sponsorUrl, setSponsorUrl] = useState(initialSponsors[0]?.url ?? "https://example.com");
  const [sponsorStatus, setSponsorStatus] = useState<Sponsor["status"]>(initialSponsors[0]?.status ?? "pending");
  const [sponsorPlacementKey, setSponsorPlacementKey] = useState<Sponsor["placementKey"] | "none">(initialSponsors[0]?.placementKey ?? "team_portal");
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState(initialSponsors[0]?.logoUrl ?? "");
  const [sponsorMessage, setSponsorMessage] = useState(sponsorData?.message ?? "Sponsor preview records are shown.");
  const [isSponsorPending, startSponsorTransition] = useTransition();
  const [mediaMessage, setMediaMessage] = useState(mediaData ? "Media review records are current for this organization." : "Media review preview records are shown.");
  const [drillVideoMessage, setDrillVideoMessage] = useState(drillVideoData ? "Drill video review records are current." : "Drill video review preview records are shown.");
  const [mediaVisibilityDrafts, setMediaVisibilityDrafts] = useState<Record<string, "team" | "organization">>(() => Object.fromEntries(
    initialMediaItems.map((item) => [item.id, item.visibility ?? "team"])
  ));
  const [isMediaPending, startMediaTransition] = useTransition();
  const [isDrillReviewPending, startDrillReviewTransition] = useTransition();
  const [lineupTeamId, setLineupTeamId] = useState("team-tigers");
  const [draggedPlayerId, setDraggedPlayerId] = useState("");
  const [targetRosterSize, setTargetRosterSize] = useState(10);
  const [planningDivision, setPlanningDivision] = useState("3U");
  const [lineupPositions, setLineupPositions] = useState<Partial<Record<LineupPositionId, string>>>({
    pitcher: "player-mason",
    catcher: "player-avery"
  });
  const seasonPlanning = useMemo(() => computeSeasonPlanningMetrics(state, targetRosterSize), [state, targetRosterSize]);
  const selectedPlanningDivision = seasonPlanning.divisions.find((division) => division.division === planningDivision) ?? seasonPlanning.divisions[0];
  const selectedBracketRound = seasonPlanning.bracketRounds.find((round) => round.division === selectedPlanningDivision?.division);
  const teamBuildPreview = useMemo(() => previewBalancedTeamBuild(state, {
    division: selectedPlanningDivision?.division ?? planningDivision,
    targetRosterSize,
    actorUserId: "user-admin",
    now: NOW,
    skillRatings: {
      "player-mason": 4,
      "player-avery": 3,
      "player-noah": 3,
      "player-ella": 4,
      "player-liam": 2
    },
    playerMetadata: {
      "player-mason": {
        playerId: "player-mason",
        ageBand: "3U",
        birthdateDerivedAgeLabel: "Age 3 on league cutoff",
        evaluation: {
          rating: 4,
          source: "coach_evaluation",
          label: "Confident throwing and listening"
        },
        reviewNotes: ["Admin review input only; family preview keeps safe roster name."]
      },
      "player-avery": {
        playerId: "player-avery",
        ageBand: "3U",
        birthdateDerivedAgeLabel: "Age 3 on league cutoff",
        evaluation: {
          rating: 3,
          source: "guardian_questionnaire",
          label: "New player, comfortable with friends"
        },
        reviewNotes: ["Use with sibling/friend constraints before publishing."]
      },
      "player-noah": {
        playerId: "player-noah",
        ageBand: "3U",
        birthdateDerivedAgeLabel: "Age 3 on league cutoff",
        evaluation: {
          rating: 3,
          source: "imported_roster",
          label: "Balanced beginner"
        }
      },
      "player-ella": {
        playerId: "player-ella",
        ageBand: "5U",
        birthdateDerivedAgeLabel: "Age 5 on league cutoff",
        evaluation: {
          rating: 4,
          source: "coach_evaluation",
          label: "Ready for older division pace"
        }
      },
      "player-liam": {
        playerId: "player-liam",
        ageBand: "6U",
        birthdateDerivedAgeLabel: "Age 6 on league cutoff",
        evaluation: {
          rating: 2,
          source: "guardian_questionnaire",
          label: "Needs extra practice support"
        }
      }
    },
    friendRequests: [
      { playerId: "player-mason", friendPlayerId: "player-avery" }
    ]
  }), [planningDivision, selectedPlanningDivision?.division, state, targetRosterSize]);
  const communicationPreview = useMemo(() => previewTeamCommunication(state, {
    teamId: communicationTeamId,
    actorUserId: "user-admin",
    channel: communicationChannel,
    template: communicationTemplate,
    subject: communicationSubject,
    body: communicationBody,
    sendAt: new Date(Date.parse(NOW) + 60 * 60 * 1000).toISOString(),
    now: NOW
  }), [communicationBody, communicationChannel, communicationSubject, communicationTeamId, communicationTemplate, state]);
  const lineupTeam = state.teams.find((team) => team.id === lineupTeamId) ?? state.teams[0]!;
  const lineupPlayers = state.players.filter((player) => player.teamId === lineupTeam.id);
  const assignedPlayerIds = new Set(Object.values(lineupPositions).filter(Boolean));
  const unassignedLineupPlayers = lineupPlayers.filter((player) => !assignedPlayerIds.has(player.id));
  const adminSeasonView = buildAdminSeasonCertaintyView({
    state,
    registrationRequests: visibleRegistrations,
    sponsors,
    mediaItems,
    message: "Admin overview is scoped by the active organization admin guard before this client renders.",
    now: NOW
  });

  function applyCommunicationDefaults(teamId: string, template: CommunicationTemplate) {
    const copy = defaultTeamCommunicationCopy(state, teamId, template);
    setCommunicationSubject(copy.subject);
    setCommunicationBody(copy.body);
  }

  function selectSponsor(nextSponsorId: string) {
    setSponsorId(nextSponsorId);
    const sponsor = sponsors.find((item) => item.id === nextSponsorId);
    if (!sponsor) {
      setSponsorName("");
      setSponsorLevel("league");
      setSponsorTeamId(sponsorTeams[0]?.id ?? "");
      setSponsorUrl("https://example.com");
      setSponsorStatus("pending");
      setSponsorPlacementKey("team_portal");
      setSponsorLogoUrl("");
      return;
    }
    setSponsorName(sponsor.name);
    setSponsorLevel(sponsor.level);
    setSponsorTeamId(sponsor.teamId ?? sponsorTeams[0]?.id ?? "");
    setSponsorUrl(sponsor.url);
    setSponsorStatus(sponsor.status);
    setSponsorPlacementKey(sponsor.placementKey ?? "none");
    setSponsorLogoUrl(sponsor.logoUrl ?? "");
  }

  function saveSponsorDraft() {
    setSponsorMessage("");
    if (sponsorData && !sponsorData.isSupabaseBacked) {
      setSponsorMessage("Live organization records are required before sponsor changes can be saved.");
      return;
    }
    startSponsorTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/sponsors", {
        organizationId: sponsorData?.organizationId ?? state.organization.id,
        sponsorId: sponsorId === "new" ? undefined : sponsorId,
        name: sponsorName,
        level: sponsorLevel,
        teamId: sponsorLevel === "team" ? sponsorTeamId : undefined,
        url: sponsorUrl,
        status: sponsorStatus,
        placementKey: sponsorPlacementKey === "none" ? undefined : sponsorPlacementKey,
        logoUrl: sponsorLogoUrl || undefined
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        sponsor?: Sponsor;
      } | null;

      if (result?.ok && result.sponsor) {
        setSponsors((current) => {
          const exists = current.some((item) => item.id === result.sponsor!.id);
          return exists
            ? current.map((item) => item.id === result.sponsor!.id ? result.sponsor! : item)
            : [result.sponsor!, ...current];
        });
        setSponsorId(result.sponsor.id);
      }

      setSponsorMessage(result?.message ?? "Sponsor could not be saved.");
    });
  }

  function runMediaModeration(mediaItem: MediaItem, status: "approved" | "hidden" | "rejected" | "removed", reason: string) {
    setMediaMessage("");
    startMediaTransition(async () => {
      const visibility = mediaVisibilityDrafts[mediaItem.id] ?? mediaItem.visibility ?? "team";
      const response = await authenticatedJsonFetch("/api/media/moderation", {
        mediaItemId: mediaItem.id,
        status,
        visibility,
        reason
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        mediaItem?: { moderation_status?: MediaItem["moderationStatus"]; visibility?: MediaItem["visibility"] };
      } | null;

      if (result?.ok) {
        setMediaItems((current) => current.map((item) => item.id === mediaItem.id ? {
          ...item,
          moderationStatus: result.mediaItem?.moderation_status ?? status,
          visibility: result.mediaItem?.visibility ?? visibility
        } : item));
      }

      setMediaMessage(result?.message ?? "Media moderation could not be saved.");
    });
  }

  function reviewDrillSource(source: DrillVideoSource, status: "approved" | "blocked") {
    setDrillVideoMessage("");
    startDrillReviewTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/drill-video-sources/review", {
        sourceId: source.id,
        status,
        reviewNotes: status === "approved" ? "Approved for club drill video library." : "Blocked from club drill video library."
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        source?: DrillVideoSource;
      } | null;

      if (result?.ok && result.source) {
        setDrillSources((current) => current.map((item) => item.id === source.id ? result.source! : item));
      }

      setDrillVideoMessage(result?.message ?? "Drill video source review could not be saved.");
    });
  }

  function reviewDrillVideo(video: DrillVideo, status: "approved" | "rejected" | "retired") {
    setDrillVideoMessage("");
    startDrillReviewTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/drill-videos/review", {
        drillVideoId: video.id,
        status,
        reviewNotes: status === "approved" ? "Approved for coach planning library." : "Not approved for coach planning library."
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        drillVideo?: DrillVideo;
      } | null;

      if (result?.ok && result.drillVideo) {
        setDrillVideos((current) => current.map((item) => item.id === video.id ? result.drillVideo! : item));
      }

      setDrillVideoMessage(result?.message ?? "Drill video review could not be saved.");
    });
  }

  function queueCommunication() {
    if (!communicationPreview.ok) {
      setCommunicationMessage(communicationPreview.message);
      return;
    }

    dispatch({
      type: "queueTeamCommunication",
      input: {
        teamId: communicationTeamId,
        actorUserId: "user-admin",
        channel: communicationChannel,
        template: communicationTemplate,
        subject: communicationSubject,
        body: communicationBody,
        sendAt: new Date(Date.parse(NOW) + 60 * 60 * 1000).toISOString(),
        now: new Date().toISOString()
      }
    });
    setCommunicationMessage(`${communicationPreview.notificationCount} ${communicationChannel.toUpperCase()} message draft record(s) queued. Provider delivery is still disconnected.`);
  }

  function assignLineupPlayer(positionId: LineupPositionId) {
    if (!draggedPlayerId) return;
    setLineupPositions((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([, playerId]) => playerId !== draggedPlayerId)
      ) as Partial<Record<LineupPositionId, string>>;
      next[positionId] = draggedPlayerId;
      return next;
    });
    setDraggedPlayerId("");
  }

  if (showOverview) {
    return (
      <div className="page">
        <section className="season-home season-admin-home" aria-labelledby="admin-home-title">
          <details className="season-admin-context" aria-label="Current admin context">
            <summary><strong>League admin · {state.organization.name} · {state.activeSeason.name}</strong><small>Context details</small></summary>
            <div className="season-admin-context-details">
              <span><small>Organization</small><strong>{state.organization.name}</strong></span>
              <span><small>Season</small><strong>{state.activeSeason.name}</strong></span>
              <span><small>Role</small><strong>League admin</strong></span>
            </div>
          </details>
          <LeagueHealthSummaryCard view={adminSeasonView} />
          <section className="grid two" aria-label="Suggested reviews">
            {adminSuggestions.map((suggestion) => (
              <article className="card stack" key={suggestion.id}>
                <span className="eyebrow">Suggested review</span>
                <h2>{suggestion.title}</h2>
                <p><strong>{suggestion.body}</strong></p>
                <p>{suggestion.recommendation}</p>
                <p className="muted">{suggestion.boundary}</p>
                {suggestion.href ? <a className="text-link" href={suggestion.href}>Go to {suggestion.title.toLowerCase()}</a> : null}
              </article>
            ))}
          </section>
          <PendingActionsPanel view={adminSeasonView} />
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      {focusedSurfaceCopy ? (
        <section className="hero admin-focus-hero">
          <span className="eyebrow">{focusedSurfaceCopy.eyebrow}</span>
          <h1>{focusedSurfaceCopy.title}</h1>
          <p className="lead">{focusedSurfaceCopy.body}</p>
        </section>
      ) : null}

      {showOverview ? (
        <>
      <section className="season-home season-admin-home" aria-labelledby="admin-home-title">
        <div className="season-admin-context" aria-label="Current admin context">
          <span><small>Organization</small><strong>{state.organization.name}</strong></span>
          <span><small>Season</small><strong>{state.activeSeason.name}</strong></span>
          <span><small>Role</small><strong>League admin</strong></span>
        </div>
        <div className="season-admin-topgrid">
          <LeagueHealthSummaryCard view={adminSeasonView} />
          <PendingActionsPanel view={adminSeasonView} />
        </div>
        <TeamStatusTable view={adminSeasonView} />
        <div className="season-card-grid">
          <RegistrationQueueCard view={adminSeasonView} />
          <SecurityStatusCard view={adminSeasonView} />
        </div>
      </section>

      <CompactDisclosure
        title="Operations workspace"
        summary="Open planning, team management, message drafts, and lineup tools."
        badge="Admin tools"
      >
      <section className="grid three">
        <article className="card metric"><span className="muted">Teams</span><strong>{state.teams.length}</strong></article>
        <article className="card metric"><span className="muted">Pending registrations</span><strong>{pendingRegistrations.length}</strong></article>
        <article className="card metric"><span className="muted">Active sponsors</span><strong>{activeSponsors.length}</strong></article>
      </section>

      <section className="grid two">
        {adminSuggestions.map((suggestion) => (
          <article className="card stack" key={suggestion.id}>
            <span className="eyebrow">Suggested reviews</span>
            <h2>{suggestion.title}</h2>
            <p><strong>{suggestion.body}</strong></p>
            <p>{suggestion.recommendation}</p>
            <p className="muted">{suggestion.boundary}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Team management</h2>
          {state.teams.map((team) => (
            <p key={team.id}><strong>{team.name}</strong><br /><span className="muted">{team.division} - {team.mascot} - {getProgramThemePreset(team.themeKey).label}</span></p>
          ))}
          <a href="/admin/themes">Open admin theme console</a>
        </article>
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family message drafts</span>
              <h2>Message draft review</h2>
            </div>
            <span className={`badge ${communicationPreview.ok ? "ok" : "warning"}`}>{communicationPreview.notificationCount} recipient(s)</span>
          </div>
          <div className="grid two">
            <label>
              Team
              <select value={communicationTeamId} onChange={(event) => {
                const teamId = event.target.value;
                setCommunicationTeamId(teamId);
                applyCommunicationDefaults(teamId, communicationTemplate);
              }}>
                {state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label>
              Message type
              <select value={communicationTemplate} onChange={(event) => {
                const template = event.target.value as CommunicationTemplate;
                setCommunicationTemplate(template);
                applyCommunicationDefaults(communicationTeamId, template);
              }}>
                {communicationTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
              </select>
            </label>
            <label>
              Channel
              <select value={communicationChannel} onChange={(event) => setCommunicationChannel(event.target.value as AdminCommunicationChannel)}>
                <option value="email">Email draft</option>
                <option value="sms">SMS draft</option>
              </select>
            </label>
            <label>
              Subject
              <input value={communicationSubject} onChange={(event) => setCommunicationSubject(event.target.value)} />
            </label>
          </div>
          <label>
            Message
            <textarea value={communicationBody} onChange={(event) => setCommunicationBody(event.target.value)} />
          </label>
          <div className="communication-preview">
            <p><strong>{communicationPreview.message}</strong></p>
            <p className="muted">SMS length: {communicationBody.length} character(s), {communicationPreview.smsSegments} segment(s). Email/SMS records stay pending until a provider adapter is connected.</p>
            {communicationPreview.recipients.slice(0, 4).map((recipient) => (
              <span className="badge" key={recipient.id}>{recipient.name}</span>
            ))}
          </div>
          <button disabled={!communicationPreview.ok} onClick={queueCommunication}>Queue message drafts</button>
          {communicationMessage ? <p className="notice">{communicationMessage}</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack season-planning-panel">
          <div className="card-header">
            <div>
              <span className="eyebrow">Start-of-season metrics</span>
              <h2>Roster maker readiness</h2>
            </div>
            <span className="badge">{seasonPlanning.seasonName}</span>
          </div>
          <div className="grid three">
            <div className="metric"><span className="muted">Teams</span><strong>{seasonPlanning.totalTeams}</strong></div>
            <div className="metric"><span className="muted">Players</span><strong>{seasonPlanning.totalPlayers}</strong></div>
            <div className="metric"><span className="muted">Open roster spots</span><strong>{seasonPlanning.rosterOpenings}</strong></div>
          </div>
          <div className="grid two">
            <label>
              Target roster size
              <input
                max={16}
                min={6}
                onChange={(event) => setTargetRosterSize(Number(event.target.value))}
                type="number"
                value={targetRosterSize}
              />
            </label>
            <label>
              Division
              <select value={selectedPlanningDivision?.division ?? ""} onChange={(event) => setPlanningDivision(event.target.value)}>
                {seasonPlanning.divisions.map((division) => <option key={division.division} value={division.division}>{division.division}</option>)}
              </select>
            </label>
          </div>
          {selectedPlanningDivision ? (
            <div className="maker-summary">
              <span className={`badge ${selectedPlanningDivision.balanceStatus === "balanced" ? "ok" : "warning"}`}>{selectedPlanningDivision.balanceStatus.replace("_", " ")}</span>
              <p><strong>{selectedPlanningDivision.division}:</strong> {selectedPlanningDivision.teamCount} team(s), {selectedPlanningDivision.playerCount} player(s), average roster {selectedPlanningDivision.averageRosterSize}</p>
              <p className="muted">{selectedPlanningDivision.rosterMakerNote}</p>
            </div>
          ) : null}
          <div className="maker-list">
            {seasonPlanning.divisions.map((division) => (
              <div className="maker-row" key={division.division}>
                <strong>{division.division}</strong>
                <span>{division.teamCount} teams</span>
                <span>{division.playerCount} players</span>
                <span>{division.largestRoster}/{division.smallestRoster} max/min</span>
              </div>
            ))}
          </div>
          <div className="stack compact">
            <h3>Automatic team builder preview</h3>
            <p className="muted"><strong>Workflow:</strong> {teamBuildPreview.workflow.join(" -> ")}</p>
            <p className="muted"><strong>Sibling/friend constraints:</strong> sibling groups stay together and friend requests are considered before roster balance.</p>
            <p className="muted"><strong>Admin review inputs:</strong> age bands, cutoff-age labels, and player evaluations inform fairness review without showing full birthdates or private child detail to families.</p>
            <p className="muted"><strong>Publish boundary:</strong> {teamBuildPreview.publishBoundary}</p>
            {teamBuildPreview.teams.map((team) => (
              <p key={team.teamId}>
                <strong>{team.teamName}</strong><br />
                <span className="muted">{team.playerCount} player(s), skill-balance score {team.averageSkill}: {team.players.map((player) => player.name).join(", ") || "No players"}</span>
                {team.players.length ? (
                  <span className="muted"><br />Review metadata: {team.players.map((player) => `${player.name} ${player.ageBand}, ${player.birthdateDerivedAgeLabel}, eval ${player.skillRating}`).join("; ")}</span>
                ) : null}
              </p>
            ))}
            {teamBuildPreview.warnings.slice(0, 3).map((warning) => <p className="notice" key={warning}>{warning}</p>)}
          </div>
        </article>

        <article className="card stack season-planning-panel">
          <div className="card-header">
            <div>
              <span className="eyebrow">Bracket maker</span>
              <h2>{selectedPlanningDivision?.division ?? "Division"} tournament preview</h2>
            </div>
            <span className="badge warning">Preview</span>
          </div>
          <p>{selectedPlanningDivision?.bracketMakerNote ?? "Select a division to preview bracket generation."}</p>
          <div className="bracket-preview">
            <strong>{selectedBracketRound?.round ?? "Round"}</strong>
            {(selectedBracketRound?.matchups ?? []).map((matchup) => (
              <div className="bracket-matchup" key={matchup}>{matchup}</div>
            ))}
          </div>
          <p className="notice">Roster maker and bracket maker are metrics-driven previews. They do not publish teams, schedules, seeds, or standings yet.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack lineup-builder">
          <div className="card-header">
            <div>
              <span className="eyebrow">Drag and drop SVG lineup</span>
              <h2>{lineupTeam.name} position board</h2>
            </div>
            <select value={lineupTeam.id} onChange={(event) => setLineupTeamId(event.target.value)} aria-label="Lineup team">
              {state.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </div>
          <svg className="lineup-field" viewBox="0 0 480 320" role="img" aria-label="Drag players onto baseball positions">
            <path className="lineup-grass" d="M36 302C52 122 148 24 240 24s188 98 204 278Z" />
            <path className="lineup-dirt" d="M240 290 120 170 240 50 360 170Z" />
            <path className="lineup-basepath" d="M240 284 126 170 240 56 354 170Z" />
            {lineupPositionDefs.map((position) => {
              const player = lineupPlayers.find((item) => item.id === lineupPositions[position.id]);
              return (
                <g
                  className={`lineup-dropzone ${player ? "assigned" : ""}`}
                  key={position.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => assignLineupPlayer(position.id)}
                >
                  <circle cx={position.x} cy={position.y} r="25" />
                  <text x={position.x} y={position.y - 4} textAnchor="middle">{position.shortLabel}</text>
                  <text x={position.x} y={position.y + 13} textAnchor="middle">{player ? `${player.firstName} ${player.lastInitial}.` : "Drop"}</text>
                </g>
              );
            })}
          </svg>
          <p className="muted">Drag a roster chip onto any SVG position. This local board does not publish lineup changes to families.</p>
        </article>
        <article className="card stack">
          <h2>Roster chips</h2>
          <div className="player-chip-list">
            {lineupPlayers.map((player) => (
              <button
                className={`player-chip ${assignedPlayerIds.has(player.id) ? "assigned" : ""}`}
                draggable
                key={player.id}
                onDragStart={() => setDraggedPlayerId(player.id)}
                type="button"
              >
                #{player.jersey} {player.firstName} {player.lastInitial}.
              </button>
            ))}
          </div>
          <h3>Unassigned</h3>
          {unassignedLineupPlayers.length ? unassignedLineupPlayers.map((player) => (
            <p key={player.id}>{player.firstName} {player.lastInitial}. - Jersey {player.jersey}</p>
          )) : <p className="muted">Every rostered player has a position.</p>}
        </article>
      </section>
      </CompactDisclosure>
        </>
      ) : null}

      <section className={showOverview ? "grid three" : "grid two admin-focus-grid"}>
        {showOverview ? (
          <>
        <article className="card stack">
          <h2>Queued message records</h2>
          <p>{state.notifications.length} local notification records queued across push, email, and SMS channels.</p>
          {state.notifications.slice(0, 4).map((notification) => (
            <p key={notification.id}><strong>{notification.title}</strong><br /><span className="muted">{notification.channel} - {notification.status}</span></p>
          ))}
          <p className="muted">No provider send occurs without a production adapter and approval workflow.</p>
        </article>
        <article className="card stack">
          <h2>Registration queue</h2>
          {visibleRegistrations.map((request) => (
            <p key={request.id}><strong>{request.playerFirstName} {request.playerLastInitial}.</strong><br /><span className="muted">{request.parentName} - {request.status}</span></p>
          ))}
          {visibleRegistrations.length === 0 ? <p className="muted">No registration requests yet.</p> : null}
        </article>
          </>
        ) : null}
        {showMedia ? (
        <article className="card stack admin-focus-card media-review-card">
          <div className="card-header">
            <div>
              <span className="eyebrow">Visibility and moderation</span>
              <h2>Media governance</h2>
            </div>
            <span className="badge warning">Coach/Admin</span>
          </div>
          <p className="notice">{mediaMessage}</p>
          <div className="grid three media-review-summary">
            <div className="metric"><span className="muted">Family reports</span><strong>{mediaReportingSummary.totalReports}</strong></div>
            <div className="metric"><span className="muted">Pending review</span><strong>{mediaReportingSummary.pendingReview}</strong></div>
            <div className="metric"><span className="muted">Upload storage</span><strong>{uploadStorageProvider.configured ? uploadStorageProvider.provider : "Link-based only"}</strong></div>
          </div>
          <div className="media-review-policy">
            <p><strong>Role-based media visibility:</strong> {parentVisibleMediaCount} item(s) currently visible to parents.</p>
            <p className="muted">{uploadStorageProvider.configured ? uploadStorageProvider.detail : "Upload storage is not connected; staff are reviewing Google Photos and YouTube links only."}</p>
            <p className="muted">Retention: {mediaRetentionPolicy.seasonMedia}</p>
          </div>
          <div className="media-review-list" aria-label="Media moderation queue">
          {mediaReviewQueue.map((item) => {
            const team = mediaTeams.find((candidate) => candidate.id === item.teamId);
            const status = item.moderationStatus ?? "approved";
            const visibility = mediaVisibilityDrafts[item.id] ?? item.visibility ?? "team";
            const needsReview = item.moderationStatus === "pending" || (item.reportCount ?? 0) > 0;
            return (
              <div className="media-review-item" data-review={needsReview ? "pending" : status} key={item.id}>
                <div className="media-review-item-header">
                  <div>
                    <span className="eyebrow">{team?.name ?? "Unknown team"} / {item.type.replace("_", " ")}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <span className={needsReview ? "badge warning" : "badge"}>{needsReview ? "Needs review" : status}</span>
                </div>
                <div className="media-review-meta">
                  <span className="chip">Visibility: {visibility === "team" ? "Team only" : "Organization"}</span>
                  <span className="chip">Reports: {item.reportCount ?? 0}</span>
                  <span className="chip">Status: {status}</span>
                </div>
                <div className="media-review-copy">
                  <p><strong>Family visibility:</strong> {getMediaVisibilityCopy({ ...item, visibility })}</p>
                  <p className="muted">{getMediaReviewCopy(item)}</p>
                </div>
                <div className="media-review-controls">
                  <label>
                    Team/org visibility
                    <select
                      value={visibility}
                      onChange={(event) => setMediaVisibilityDrafts((current) => ({
                        ...current,
                        [item.id]: event.target.value as "team" | "organization"
                      }))}
                    >
                      <option value="team">Team only</option>
                      <option value="organization">Organization</option>
                    </select>
                  </label>
                  <div className="button-row media-review-actions">
                    <button className="secondary" disabled={isMediaPending} onClick={() => runMediaModeration(item, "approved", `Approved for ${visibility} visibility.`)}>Approve media</button>
                    <button className="secondary" disabled={isMediaPending} onClick={() => runMediaModeration(item, "rejected", "Rejected by coach/admin review.")}>Reject media</button>
                    <button className="secondary" disabled={isMediaPending} onClick={() => runMediaModeration(item, "hidden", "Hidden pending coach/admin review.")}>Hide media</button>
                    <button className="secondary" disabled={isMediaPending} onClick={() => runMediaModeration(item, "approved", "Restored after review.")}>Restore media</button>
                    <button className="secondary" disabled={isMediaPending} onClick={() => {
                      if (window.confirm(`Remove ${item.title} from media access?`)) {
                        runMediaModeration(item, "removed", "Removed by coach/admin moderation.");
                      }
                    }}>Remove media</button>
                    <a className="secondary" href={item.url} target="_blank" rel="noreferrer">Open source link</a>
                  </div>
                </div>
              </div>
            );
	          })}
          </div>
          {mediaReviewQueue.length === 0 ? <p className="notice ok">All clear. No media items need review.</p> : null}
	          <section className="grid two">
	            <div className="stack compact">
	              <div className="card-header">
	                <div>
	                  <span className="eyebrow">Sponsor-Safe Media Gallery</span>
	                  <h3>Approved recap framing</h3>
	                </div>
	                <span className="badge">{adminSponsorSafeGallery?.approvedItems.length ?? 0} approved</span>
	              </div>
	              {(adminSponsorSafeGallery?.approvedItems ?? []).slice(0, 3).map((item) => (
	                <p key={item.id}><strong>{item.recapLabel}</strong><br /><span className="muted">{item.sponsorFrame}. {item.safeCaption}</span></p>
	              ))}
	              <p className="notice">{adminSponsorSafeGallery?.boundary ?? "Sponsor-safe gallery needs a team before recap framing can render."}</p>
	            </div>
	            <div className="stack compact">
	              <div className="card-header">
	                <div>
	                  <span className="eyebrow">Equipment Exchange</span>
	                  <h3>Moderation queue</h3>
	                </div>
	                <span className="badge warning">{adminEquipmentExchange.filter((listing) => listing.moderationLabel === "admin_review").length} review</span>
	              </div>
	              {adminEquipmentExchange.map((listing) => (
	                <p key={listing.id}><strong>{listing.title}</strong><br /><span className="muted">{listing.kind} - {listing.sizeOrAge} - {listing.moderationLabel.replace("_", " ")}. {listing.detail}</span></p>
	              ))}
	              <p className="notice">Equipment listings are team-scoped, moderated, and do not publish parent contact details.</p>
	            </div>
	          </section>
	          <div className="stack compact drill-review-panel">
	            <div className="card-header">
	              <div>
	                <span className="eyebrow">Coach drill videos</span>
	                <h3>Reference review</h3>
	              </div>
	              <span className={`badge ${drillVideoData?.providerConfigured ? "ok" : "warning"}`}>YouTube metadata {drillVideoData?.providerConfigured ? "configured" : "missing"}</span>
	            </div>
	            <p className="notice">{drillVideoMessage}</p>
	            <div className="grid three">
	              <div className="metric"><span className="muted">Pending videos</span><strong>{drillVideos.filter((video) => video.approvalStatus === "pending").length}</strong></div>
	              <div className="metric"><span className="muted">Allowlisted sources</span><strong>{drillSources.filter((source) => source.approvalStatus === "approved").length}</strong></div>
	              <div className="metric"><span className="muted">Assignments</span><strong>{drillVideoData?.assignments.length ?? 0}</strong></div>
	            </div>
	            <p className="muted">Approval requires validated YouTube metadata, embeddability, and an approved source channel. Videos stay coach-planning only in this version.</p>
	            {drillSources.map((source) => (
	              <div className="stack compact" key={source.id}>
	                <p><strong>{source.title}</strong><br /><span className="muted">YouTube channel {source.externalChannelId} - {source.approvalStatus}</span></p>
	                <div className="button-row">
	                  <button className="secondary" disabled={isDrillReviewPending} onClick={() => reviewDrillSource(source, "approved")}>Approve source</button>
	                  <button className="secondary" disabled={isDrillReviewPending} onClick={() => reviewDrillSource(source, "blocked")}>Block source</button>
	                </div>
	              </div>
	            ))}
	            {drillSources.length === 0 ? <p className="muted">No YouTube drill video sources are waiting for review.</p> : null}
	            {drillVideos.map((video) => {
	              const source = drillSources.find((item) => item.externalChannelId === video.sourceChannelId);
	              const teamNames = drillTeams.filter((team) => team.organizationId === video.organizationId).map((team) => team.name).slice(0, 3);
	              return (
	                <div className="stack compact" key={video.id}>
	                  <p>
	                    <strong>{video.title}</strong><br />
	                    <span className="muted">{video.sport} - {video.skillCategory} - {video.ageBand} - {video.difficulty} - {video.approvalStatus}</span>
	                  </p>
	                  <p className="muted">Source: {video.sourceChannel ?? "Unknown channel"} ({source?.approvalStatus ?? "not reviewed"}) - teams: {teamNames.join(", ") || "organization library"}</p>
	                  <p className="muted">Made for Kids: {video.madeForKidsStatus === undefined ? "unknown" : video.madeForKidsStatus ? "yes" : "no"} - embeddable: {video.embeddable ? "yes" : "no"} - last validated {video.lastValidatedAt ? formatDate(video.lastValidatedAt) : "not validated"}</p>
	                  <div className="button-row">
	                    <button className="secondary" disabled={isDrillReviewPending} onClick={() => reviewDrillVideo(video, "approved")}>Approve video</button>
	                    <button className="secondary" disabled={isDrillReviewPending} onClick={() => reviewDrillVideo(video, "rejected")}>Reject video</button>
	                    <button className="secondary" disabled={isDrillReviewPending} onClick={() => reviewDrillVideo(video, "retired")}>Retire video</button>
	                  </div>
	                </div>
	              );
	            })}
	            {drillVideos.length === 0 ? <p className="muted">No drill video references have been submitted yet.</p> : null}
	          </div>
	          <p className="muted">Reported or hidden media is excluded from parent-visible dashboards until it is restored by an assigned coach or organization admin.</p>
	        </article>
        ) : null}
        {showSponsors ? (
        <>
        {surface === "sponsors" ? (
          <SponsorCommunityProofLedger
            rows={sponsorProofRows}
            selectedSponsorId={sponsorId === "new" ? sponsorProofRows[0]?.id ?? "" : sponsorId}
            publicRecapCount={adminSponsorSafeGallery?.approvedItems.length ?? 0}
            onSelectSponsor={selectSponsor}
          />
        ) : null}
        <article className="card stack admin-focus-card" id="sponsor-record-editor">
          <div className="card-header">
            <div>
              <span className="eyebrow">Sponsor CRUD</span>
              <h2>Sponsor management</h2>
            </div>
            <span className="badge warning">Admin only</span>
          </div>
          <p className="notice">{sponsorMessage}</p>
          <p><strong>Public display policy:</strong> {sponsorDisplayPolicy.status} - {sponsorDisplayPolicy.detail}</p>
          <p className="muted">Schedule sponsor placement: {scheduleSponsorPlacement.length}; media gallery sponsor placement: {mediaGallerySponsorPlacement.length}; email sponsor placement: {emailSponsorPlacement.length}; banner sponsor placement: {bannerSponsorPlacement.length}.</p>
          <section className="grid two">
            <div className="stack compact">
              <div className="card-header">
                <div>
                  <span className="eyebrow">League Revenue Dashboard</span>
                  <h3>Season funding proof</h3>
                </div>
                <span className="badge warning">Admin-only</span>
              </div>
              <div className="grid three">
                <div className="metric"><span className="muted">Registration</span><strong>{formatCents(leagueRevenueSummary.registrationFeeCents)}</strong></div>
                <div className="metric"><span className="muted">Sponsor invoices</span><strong>{formatCents(leagueRevenueSummary.sponsorInvoiceCents)}</strong></div>
                <div className="metric"><span className="muted">Unpaid families</span><strong>{formatCents(leagueRevenueSummary.unpaidFamilyBalanceCents)}</strong></div>
              </div>
              <p className="muted">Active sponsors {leagueRevenueSummary.activeSponsorCount}; pending sponsors {leagueRevenueSummary.pendingSponsorCount}; scholarship support {formatCents(leagueRevenueSummary.scholarshipCreditCents)}.</p>
              <p className="notice">{leagueRevenueSummary.proofBoundary}</p>
            </div>
            <div className="stack compact">
              <div className="card-header">
                <div>
                  <span className="eyebrow">Community Sponsor Matchmaker</span>
                  <h3>Suggested sponsor opportunities</h3>
                </div>
                <span className="badge">{sponsorOpportunities.length} lead(s)</span>
              </div>
              {sponsorOpportunities.slice(0, 4).map((opportunity) => (
                <p key={opportunity.id}>
                  <strong>{opportunity.title}</strong><br />
                  <span className="muted">{opportunity.need.replace("_", " ")} - {formatCents(opportunity.targetAmountCents)} target - {opportunity.status}. {opportunity.sponsorFit}. {opportunity.evidence}</span>
                </p>
              ))}
              <p className="notice">Sponsor suggestions are leads for admin review. They are not contracts, public placements, provider sends, or payment claims.</p>
            </div>
          </section>
          <div className="grid two">
            <label>
              Sponsor record
              <select value={sponsorId} onChange={(event) => selectSponsor(event.target.value)}>
                <option value="new">New sponsor</option>
                {sponsors.map((sponsor) => <option key={sponsor.id} value={sponsor.id}>{sponsor.name}</option>)}
              </select>
            </label>
            <label>
              Status workflow
              <select value={sponsorStatus} onChange={(event) => setSponsorStatus(event.target.value as Sponsor["status"])}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label>
              Sponsor name
              <input value={sponsorName} onChange={(event) => setSponsorName(event.target.value)} />
            </label>
            <label>
              Sponsor URL
              <input value={sponsorUrl} onChange={(event) => setSponsorUrl(event.target.value)} />
            </label>
            <label>
              Level
              <select value={sponsorLevel} onChange={(event) => setSponsorLevel(event.target.value as Sponsor["level"])}>
                <option value="league">League sponsor</option>
                <option value="team">Team sponsor</option>
              </select>
            </label>
            <label>
              Team
              <select disabled={sponsorLevel !== "team"} value={sponsorTeamId} onChange={(event) => setSponsorTeamId(event.target.value)}>
                {sponsorTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label>
              Sponsor placement
              <select value={sponsorPlacementKey} onChange={(event) => setSponsorPlacementKey(event.target.value as Sponsor["placementKey"] | "none")}>
                <option value="none">No public placement</option>
                <option value="team_portal">Team portal</option>
                <option value="weekly_digest">Weekly digest</option>
                <option value="storybook">Storybook</option>
                <option value="registration">Registration</option>
                <option value="field_map">Field map</option>
              </select>
            </label>
            <label>
              Sponsor logo URL
              <input value={sponsorLogoUrl} onChange={(event) => setSponsorLogoUrl(event.target.value)} placeholder="https://..." />
            </label>
          </div>
          <button disabled={isSponsorPending || Boolean(sponsorData && !sponsorData.isSupabaseBacked)} onClick={saveSponsorDraft}>Save sponsor</button>
          <p className="muted">Stripe live collection is not connected. Sponsor billing records stay separate from registration, RSVP, schedule, safety, and child-facing sponsor display.</p>
          <div className="stack compact">
            <h3>Sponsor billing records</h3>
            <p className="muted">Stripe Product/Price, invoice reference, and payment status are admin-only records. Public sponsor placement does not depend on or reveal payment status.</p>
            {sponsorBillingProofs.slice(0, 3).map((proof) => (
              <p key={proof.sponsorId}>
                <strong>{proof.sponsorName}</strong><br />
                <span className="muted">Stripe Product/Price: {proof.priceLookupKey}; invoice reference: {proof.invoiceReference}; payment status: {proof.paymentProofStatus}; ${(proof.amountCents / 100).toFixed(2)} {proof.currency.toUpperCase()}.</span>
              </p>
            ))}
            <p className="notice">Sponsor billing stays separate from child-facing display. Stripe keys must stay server-side and preferably use restricted keys.</p>
          </div>
          <div className="stack compact">
            {sponsors.map((sponsor) => (
              <p key={sponsor.id}>
                <strong>{sponsor.name}</strong><br />
                <span className="muted">{sponsor.level} - {sponsor.status} - {sponsor.placementKey ?? "no placement"}{sponsor.logoUrl ? " - logo queued" : ""}</span>
              </p>
            ))}
          </div>
        </article>
        </>
        ) : null}
        {showOverview ? (
        <article className="card stack">
          <h2>Readiness</h2>
          {healthCards.slice(0, 4).map((card) => (
            <p key={card.id}><strong>{card.title}:</strong> {card.count}<br /><span className="muted">{card.detail}</span></p>
          ))}
          <p><strong>Touch target check:</strong> {touchTargetQa.status}, {touchTargetQa.minimumPixels}px minimum.</p>
          <p><strong>Offline label:</strong> {offlineStateSummary.status}. {offlineStateSummary.detail}</p>
          <p><strong>Contrast checks:</strong> {contrastChecks.length} reviewed surface(s).</p>
          <p><strong>Privacy filters:</strong> {privacyFilters.length} active filter(s).</p>
          {adminWeatherSafety ? (
            <div className="stack compact">
              <h3>Weather + Safety Decision Assistant</h3>
              <p><strong>{adminWeatherSafety.eventTitle}</strong> - {adminWeatherSafety.recommendation.replaceAll("_", " ")}</p>
              {adminWeatherSafety.conditions.map((condition) => (
                <p key={condition.label}><span className={`badge ${condition.status === "ok" ? "ok" : "warning"}`}>{condition.status}</span> <strong>{condition.label}</strong> <span className="muted">{condition.value}</span></p>
              ))}
              <p className="muted">{adminWeatherSafety.fieldClosureDraft}</p>
              <p className="notice">{adminWeatherSafety.boundary}</p>
            </div>
          ) : null}
          {adminAvailabilityIntelligence ? (
            <div className="stack compact">
              <h3>Family Availability Intelligence</h3>
              <p>{adminAvailabilityIntelligence.teamName}: {adminAvailabilityIntelligence.summary}</p>
              <p className="muted">Response rate {adminAvailabilityIntelligence.responseRate}%; volunteer marketplace {adminVolunteerMarketplace.filter((job) => job.actionStatus === "claimable").length} claimable role(s).</p>
              <p className="notice">{adminAvailabilityIntelligence.boundary}</p>
            </div>
          ) : null}
          <p className="muted">Engagement and delivery-rate metrics stay out of this home card until they are backed by production reporting.</p>
        </article>
        ) : null}
      </section>
    </div>
  );
}

export function AdminThemesClient({ initialData }: { initialData: AdminThemeData }) {
  const [teams, setTeams] = useState(initialData.teams);
  const [audits, setAudits] = useState<TeamThemeAudit[]>(initialData.audits);
  const [logoAssets, setLogoAssets] = useState<TeamLogoAsset[]>(initialData.logoAssets);
  const [tenantDefaults, setTenantDefaults] = useState<TenantThemeDefaults>(initialData.tenantDefaults);
  const [teamId, setTeamId] = useState(initialData.teams[0]?.id ?? "");
  const [logoTeamId, setLogoTeamId] = useState(initialData.teams[0]?.id ?? "");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPolicyNotes, setLogoPolicyNotes] = useState("Pending logo asset review.");
  const [mascotPreviewDataUrl, setMascotPreviewDataUrl] = useState("");
  const [mascotUploadLabel, setMascotUploadLabel] = useState("");
  const [previewElements, setPreviewElements] = useState({
    mascotMark: true,
    mobileHeader: true,
    gameDayBand: true
  });
  const [activeEnvironmentSurface, setActiveEnvironmentSurface] = useState<TenantEnvironmentSurfaceId>("app");
  const [actorUserId, setActorUserId] = useState(initialData.users.find((user) => user.role === "admin")?.id ?? initialData.users[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, Pick<Team, "mascot" | "primaryColor" | "secondaryColor" | "themeKey">>>({});
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const team = teams.find((item) => item.id === teamId) ?? teams[0];
  const draft = team ? drafts[team.id] ?? {
    mascot: team.mascot,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    themeKey: team.themeKey
  } : null;
  const actors = initialData.users.filter((user) => user.role !== "parent");
  const selectedActorId = actors.some((user) => user.id === actorUserId) ? actorUserId : actors[0]?.id ?? actorUserId;
  const selectedContrast = draft ? contrastStatus(draft.primaryColor, draft.secondaryColor) : null;
  const brandLaunchValidation = useMemo(() => buildBrandLaunchValidation(teams), [teams]);
  const teamsUsingDefaults = teams.filter((item) => item.themeKey === tenantDefaults.themeKey &&
    item.mascot === tenantDefaults.mascot &&
    item.primaryColor.toLowerCase() === tenantDefaults.primaryColor.toLowerCase() &&
    item.secondaryColor.toLowerCase() === tenantDefaults.secondaryColor.toLowerCase()).length;
  const pendingLogoAssets = logoAssets.filter((asset) => asset.status === "pending").length;
  const approvedLogoAssets = logoAssets.filter((asset) => asset.status === "approved").length;
  const themeQaPassCount = teams.filter((item) => themeQaStatus(item.primaryColor, item.secondaryColor).className === "ok").length;
  const logoTargetTeam = teams.find((item) => item.id === logoTeamId);
  const environmentSurface = tenantEnvironmentSurfaces.find((surface) => surface.id === activeEnvironmentSurface) ?? tenantEnvironmentSurfaces[0]!;
  const activePreset = draft ? getProgramThemePreset(draft.themeKey) : null;
  const teamInitials = team ? initialsFromName(team.name) : "LP";
  const selectedThemeQa = draft ? themeQaStatus(draft.primaryColor, draft.secondaryColor) : null;
  const coveredBrandSurfaces = brandLaunchValidation.surfaceChecks.filter((check) => check.status === "covered").length;

  function updateDraft(field: "mascot" | "primaryColor" | "secondaryColor" | "themeKey", value: string) {
    if (!team || !draft) return;
    setDrafts((current) => ({
      ...current,
      [team.id]: {
        ...draft,
        [field]: value
      }
    }));
  }

  function applyTheme(nextThemeKey: ProgramThemeKey) {
    if (!team || !draft) return;
    const preset = getProgramThemePreset(nextThemeKey);
    setDrafts((current) => ({
      ...current,
      [team.id]: {
        ...draft,
        themeKey: preset.key,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        mascot: draft.mascot || preset.mascotHint
      }
    }));
  }

  function saveTheme() {
    if (!team || !draft) return;
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/team-branding", {
        teamId: team.id,
        mascot: draft.mascot,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        themeKey: draft.themeKey
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        team?: Team;
        audit?: TeamThemeAudit;
      } | null;

      if (result?.ok && result.team) {
        setTeams((current) => current.map((item) => item.id === result.team!.id ? result.team! : item));
        setDrafts((current) => {
          const next = { ...current };
          delete next[result.team!.id];
          return next;
        });
        if (result.audit) setAudits((current) => [result.audit!, ...current].slice(0, 25));
      }

      setMessage(result?.message ?? "Team theme could not be saved.");
    });
  }

  function saveTenantDefaults() {
    if (!draft) return;
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/theme-defaults", {
        organizationId: tenantDefaults.organizationId,
        themeKey: draft.themeKey,
        mascot: draft.mascot,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        tenantDefaults?: TenantThemeDefaults;
        audit?: TeamThemeAudit;
      } | null;

      if (result?.ok && result.tenantDefaults) setTenantDefaults(result.tenantDefaults);
      if (result?.audit) setAudits((current) => [result.audit!, ...current].slice(0, 25));
      setMessage(result?.message ?? "Tenant theme defaults could not be saved.");
    });
  }

  function saveLogoAsset() {
    if (!logoUrl.trim()) return;
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/admin/team-logos", {
        organizationId: tenantDefaults.organizationId,
        teamId: logoTeamId || undefined,
        url: logoUrl,
        policyNotes: logoPolicyNotes
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        tenantLogoStatus?: TenantThemeDefaults["logoStatus"];
        logoAsset?: TeamLogoAsset;
      } | null;

      if (result?.ok && result.logoAsset) {
        setLogoAssets((current) => [result.logoAsset!, ...current].slice(0, 25));
        setLogoUrl("");
        if (result.tenantLogoStatus) {
          setTenantDefaults((current) => ({ ...current, logoStatus: result.tenantLogoStatus! }));
        }
      }

      setMessage(result?.message ?? "Logo asset could not be queued for review.");
    });
  }

  function previewMascotUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Mascot upload preview requires an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Mascot upload preview is limited to 2 MB until storage policy is configured.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setMascotPreviewDataUrl(result);
      setMascotUploadLabel(`${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`);
      setLogoPolicyNotes(`Mascot art preview selected: ${file.name}. Storage provider required before binary persistence.`);
      setMessage("Mascot artwork is previewed locally. Queue an HTTPS asset URL after storage review.");
    };
    reader.readAsDataURL(file);
  }

  function togglePreviewElement(key: keyof typeof previewElements) {
    setPreviewElements((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  function renderEnvironmentPreview() {
    if (!team || !draft || !activePreset) {
      return <p className="muted">No team records are available for tenant environment preview.</p>;
    }

    if (activeEnvironmentSurface === "portal") {
      return (
        <div className="tenant-preview-portal" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
          <div className="tenant-preview-hero">
            <strong>{team.name}</strong>
            <span>{draft.mascot} families see schedule, RSVP, roster, photos, messages, and Parent Replay under one published brand.</span>
          </div>
          <div className="tenant-preview-card-grid">
            <span>Next game</span>
            <span>Coach note</span>
            <span>Roster</span>
            <span>Photos</span>
          </div>
        </div>
      );
    }

    if (activeEnvironmentSurface === "mobile") {
      return (
        <div className="tenant-preview-phone" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
          <div className="tenant-preview-phone-top">
            <strong>{teamInitials}</strong>
            <span>{team.name}</span>
          </div>
          <div className="tenant-preview-phone-action">RSVP for Saturday</div>
          <div className="tenant-preview-phone-list">
            <span>Arrive 20 min early</span>
            <span>Field 2 updated</span>
            <span>{selectedThemeQa?.mobileLabel ?? "Mobile QA pending"}</span>
          </div>
        </div>
      );
    }

    if (activeEnvironmentSurface === "communications") {
      return (
        <div className="tenant-preview-document" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
          <div className="tenant-preview-document-header">
            <strong>{team.name} weekly digest</strong>
            <span>{teamInitials}</span>
          </div>
          <p>Game reminder, RSVP status, coach note, and portal link preview use the same team tokens.</p>
          <p className="muted">Email, SMS, and push sends stay provider-gated until review approval and delivery logs exist.</p>
        </div>
      );
    }

    if (activeEnvironmentSurface === "commerce") {
      return (
        <div className="tenant-preview-document" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
          <div className="tenant-preview-document-header">
            <strong>Sponsor invoice preview</strong>
            <span>{teamInitials}</span>
          </div>
          <div className="tenant-preview-line"><span>Placement</span><strong>Team portal</strong></div>
          <div className="tenant-preview-line"><span>Receipt reference</span><strong>Admin-only</strong></div>
          <p className="muted">Sponsor billing proof stays separate from child-facing sponsor display and registration flows.</p>
        </div>
      );
    }

    if (activeEnvironmentSurface === "governance") {
      return (
        <div className="tenant-preview-governance">
          <p><strong>Write boundary:</strong> Admin theme saves and logo queue requests use verified Supabase sessions.</p>
          <p><strong>Provider boundary:</strong> Binary storage, email rendering, push identity, and public cache invalidation require separate proof.</p>
          <p><strong>Child privacy:</strong> Player names, guardian access, media visibility, and direct messaging stay role-scoped.</p>
        </div>
      );
    }

    return (
      <div className="tenant-preview-app" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
        <aside className="tenant-preview-nav">
          <strong>{teamInitials}</strong>
          {tenantAppMenuPreview.map((item) => (
            <span key={item} className={item === "Home" ? "active" : undefined}>{item}</span>
          ))}
        </aside>
        <main className="tenant-preview-main">
          <div className="tenant-preview-topbar">
            <strong>{team.name}</strong>
            <span>{activePreset.label}</span>
          </div>
          <div className="tenant-preview-banner">
            <strong>{draft.mascot} Game Day</strong>
            <span>{activePreset.fieldLabel}, RSVP, schedule, and coach update preview.</span>
          </div>
          <div className="tenant-preview-card-grid">
            <span>Schedule</span>
            <span>Roster</span>
            <span>Messages</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page admin-themes-page">
      <section className="hero">
        <span className="eyebrow">Admin customization workbench</span>
        <h1>First-class team branding control across every portal.</h1>
        <p className="lead">Update team identity, tenant defaults, logo review metadata, and launch proof from Supabase-backed admin controls.</p>
        <p className="muted">Admin theme console writes still derive the acting user from the verified Supabase session. Preview controls do not grant access.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="admin-workbench-grid" aria-label="Customization modules">
        <article className="card stack workbench-module active">
          <span className="badge ok">Live editor</span>
          <h2>Identity and colors</h2>
          <p className="muted">{teams.length} team theme records. {themeQaPassCount} pass the current contrast QA checks.</p>
        </article>
        <article className="card stack workbench-module">
          <span className="badge info">Tenant baseline</span>
          <h2>Future team defaults</h2>
          <p className="muted">{teamsUsingDefaults} team(s) match the current default preset. Logo status is {tenantDefaults.logoStatus.replace("_", " ")}.</p>
        </article>
        <article className="card stack workbench-module">
          <span className="badge warning">Review queue</span>
          <h2>Logo assets</h2>
          <p className="muted">{pendingLogoAssets} pending and {approvedLogoAssets} approved metadata record(s). Binary storage remains provider-gated.</p>
        </article>
        <article className="card stack workbench-module">
          <span className={`badge ${brandLaunchValidation.coveragePercent === 100 ? "ok" : "warning"}`}>{brandLaunchValidation.coveragePercent}% covered</span>
          <h2>Launch proof</h2>
          <p className="muted">20 target brand surfaces, monitoring events, alert rules, and coach feedback checks.</p>
        </article>
      </section>

      <section className="card stack tenant-environment-studio" aria-label="Tenant environment studio">
        <div className="card-header">
          <div>
            <span className="eyebrow">Tenant environment studio</span>
            <h2>One control surface for every branded tenant touchpoint.</h2>
          </div>
          <span className="badge ok">{coveredBrandSurfaces} / {brandLaunchValidation.surfaceChecks.length} surfaces mapped</span>
        </div>
        <p className="muted">Select an environment area to preview how team identity, menu labels, portal copy, logo fallback, messages, sponsor documents, and safety rules fit together before saving.</p>
        <div className="tenant-studio-layout">
          <div className="tenant-surface-rail" aria-label="Tenant customization surfaces">
            {tenantEnvironmentSurfaces.map((surface) => (
              <button
                type="button"
                key={surface.id}
                className={`tenant-surface-button ${activeEnvironmentSurface === surface.id ? "active" : ""}`}
                aria-pressed={activeEnvironmentSurface === surface.id}
                onClick={() => setActiveEnvironmentSurface(surface.id)}
              >
                <strong>{surface.label}</strong>
                <span>{surface.status}</span>
                <em>{surface.detail}</em>
              </button>
            ))}
          </div>
          <div className="tenant-live-preview" aria-label={`${environmentSurface.label} preview`}>
            <div className="tenant-live-preview-header">
              <div>
                <strong>{environmentSurface.label}</strong>
                <span>{environmentSurface.detail}</span>
              </div>
              <span className={`badge ${selectedThemeQa?.className ?? "neutral"}`}>
                {selectedThemeQa?.label ?? "Theme QA pending"}
              </span>
            </div>
            {renderEnvironmentPreview()}
          </div>
        </div>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Theme editor</span>
              <h2>{team?.name ?? "No team selected"}</h2>
            </div>
            {selectedContrast ? <span className={`badge ${selectedContrast.className}`}>{selectedContrast.label}</span> : null}
          </div>
          <p className="muted">Customization editor for mascot, sport preset, and portal colors. The private API ignores client-supplied actor IDs and uses the signed-in session.</p>
          <label>
            Preview actor
            <select value={selectedActorId} onChange={(event) => setActorUserId(event.target.value)}>
              {actors.map((user) => (
                <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
              ))}
            </select>
            <span className="field-hint">For admin review context only. Authorization is checked server-side.</span>
          </label>
          <label>
            Team
            <select value={team?.id ?? ""} onChange={(event) => setTeamId(event.target.value)}>
              {teams.map((item) => (
                <option key={item.id} value={item.id}>{item.name} - {item.division}</option>
              ))}
            </select>
          </label>
          {draft ? (
            <div className="grid two">
              <label>
                Program theme
                <select value={draft.themeKey} onChange={(event) => applyTheme(event.target.value as ProgramThemeKey)}>
                  {programThemePresets.map((preset) => (
                    <option key={preset.key} value={preset.key}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Mascot
                <input value={draft.mascot} onChange={(event) => updateDraft("mascot", event.target.value)} />
              </label>
              <fieldset className="brand-element-fieldset">
                <legend>Element visibility</legend>
                <label className="checkbox-row">
                  <input type="checkbox" checked={previewElements.mascotMark} onChange={() => togglePreviewElement("mascotMark")} />
                  Mascot mark
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={previewElements.mobileHeader} onChange={() => togglePreviewElement("mobileHeader")} />
                  Mobile header
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={previewElements.gameDayBand} onChange={() => togglePreviewElement("gameDayBand")} />
                  Game Day band
                </label>
              </fieldset>
              <label>
                Primary color
                <input type="color" value={draft.primaryColor} onChange={(event) => updateDraft("primaryColor", event.target.value)} />
              </label>
              <label>
                Secondary color
                <input type="color" value={draft.secondaryColor} onChange={(event) => updateDraft("secondaryColor", event.target.value)} />
              </label>
            </div>
          ) : <p className="muted">No team records are available.</p>}
          <button onClick={saveTheme} disabled={isPending || !team || !draft}>{isPending ? "Saving..." : "Save team theme"}</button>
          <button className="secondary" onClick={saveTenantDefaults} disabled={isPending || !draft}>Save as tenant defaults</button>
        </article>

        {team && draft ? (
          <article className="card stack">
            <span className="eyebrow">Preview</span>
            <div className="team-branding-preview brand-studio-preview" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
              {previewElements.mascotMark ? (
                <strong className="mascot-preview-mark">
                  {mascotPreviewDataUrl ? <Image src={mascotPreviewDataUrl} alt="" width={72} height={72} unoptimized /> : draft.mascot.slice(0, 2)}
                </strong>
              ) : null}
              <span>{team.name} portal</span>
            </div>
            {previewElements.mobileHeader ? (
              <div className="team-branding-preview mobile-preview brand-mobile-preview" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
                <strong>{mascotPreviewDataUrl ? <Image src={mascotPreviewDataUrl} alt="" width={72} height={72} unoptimized /> : draft.mascot.slice(0, 1)}</strong>
                <span>{team.name} mobile</span>
              </div>
            ) : null}
            {previewElements.gameDayBand ? (
              <div className="brand-game-day-band" style={teamBrandStyle(draft.primaryColor, draft.secondaryColor)}>
                <strong>Game Day Calm Mode</strong>
                <span>{draft.mascot} identity, field status, RSVP, and coach update preview.</span>
              </div>
            ) : null}
            <p className="muted">Contrast ratio: {selectedContrast?.ratio.toFixed(2)}. Use Pass for text-heavy portal headers.</p>
            {mascotUploadLabel ? <p className="notice ok">Mascot upload preview: {mascotUploadLabel}</p> : null}
            <div className="notice">
              <strong>Tenant defaults:</strong> {getProgramThemePreset(tenantDefaults.themeKey).label} - {tenantDefaults.mascot} - logo {tenantDefaults.logoStatus.replace("_", " ")}
            </div>
          </article>
        ) : null}
      </section>

      <section className="grid two">
        <article className="card stack admin-logo-workbench">
          <div className="card-header">
            <div>
              <span className="eyebrow">Logo asset review</span>
              <h2>Queue logo metadata for customization</h2>
            </div>
            <span className={`badge ${tenantDefaults.logoStatus === "approved" ? "ok" : tenantDefaults.logoStatus === "queued" ? "warning" : "neutral"}`}>
              {tenantDefaults.logoStatus.replace("_", " ")}
            </span>
          </div>
          <p className="muted">Admins can register an HTTPS logo URL for review. This does not upload a binary file, publish a family-facing logo, or connect provider storage.</p>
          <div className="grid two">
            <label>
              Logo applies to
              <select value={logoTeamId} onChange={(event) => setLogoTeamId(event.target.value)}>
                <option value="">Tenant default logo</option>
                {teams.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} - {item.division}</option>
                ))}
              </select>
            </label>
            <label>
              HTTPS logo URL
              <input type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://assets.example.com/logo.png" />
            </label>
            <label>
              Upload mascot artwork for preview
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={previewMascotUpload} />
              <span className="field-hint">Local preview only. Persistence still requires reviewed storage or an HTTPS asset URL.</span>
            </label>
            <label>
              Policy notes
              <textarea value={logoPolicyNotes} onChange={(event) => setLogoPolicyNotes(event.target.value)} />
              <span className="field-hint">Use notes for child-safety, sponsor-separation, and contrast review evidence.</span>
            </label>
          </div>
          <button onClick={saveLogoAsset} disabled={isPending || !logoUrl.trim()}>{isPending ? "Queueing..." : "Queue logo review"}</button>
          <p className="muted">Current target: {logoTargetTeam ? `${logoTargetTeam.name} team logo` : "tenant default logo"}. Sponsor logos stay in sponsor records.</p>
        </article>

        <article className="card stack">
          <h2>Logo review queue</h2>
          {logoAssets.map((asset) => {
            const assetTeam = teams.find((item) => item.id === asset.teamId);
            return (
              <p key={asset.id} className="logo-asset-row">
                <strong>{assetTeam?.name ?? "Tenant default logo"}</strong>
                <br />
                <span className="muted">{asset.url}</span>
                <br />
                <span className={`badge ${statusClass(asset.status)}`}>{asset.status}</span>
                <span className="muted"> Submitted {formatDate(asset.createdAt)}{asset.policyNotes ? ` - ${asset.policyNotes}` : ""}</span>
              </p>
            );
          })}
          {!logoAssets.length ? <p className="muted">No logo assets queued yet.</p> : null}
          <p className="notice">Binary upload, public rendering, and email/push logo use still require provider configuration, review approval, and browser proof.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>All team themes</h2>
          {teams.map((item) => {
            const status = contrastStatus(item.primaryColor, item.secondaryColor);
            const qa = themeQaStatus(item.primaryColor, item.secondaryColor);
            const lastAudit = audits.find((audit) => audit.teamId === item.id);
            const usesTenantDefaults = item.themeKey === tenantDefaults.themeKey &&
              item.mascot === tenantDefaults.mascot &&
              item.primaryColor.toLowerCase() === tenantDefaults.primaryColor.toLowerCase() &&
              item.secondaryColor.toLowerCase() === tenantDefaults.secondaryColor.toLowerCase();
            return (
              <button className="theme-row" key={item.id} onClick={() => setTeamId(item.id)}>
                <span className="theme-swatch" style={{ background: item.primaryColor }} />
                <span className="theme-swatch" style={{ background: item.secondaryColor }} />
                <strong>{item.name}</strong>
                <span>{getProgramThemePreset(item.themeKey).label} - {item.mascot}</span>
                <span className="theme-row-meta">
                  <span>Logo: {tenantDefaults.logoStatus.replace("_", " ")}</span>
                  <span>{lastAudit ? formatDate(lastAudit.createdAt) : "No audit yet"}</span>
                  {usesTenantDefaults ? <span className="badge ok">Default</span> : null}
                  <span className={`badge ${status.className}`}>{status.label}</span>
                  <span className={`badge ${qa.className}`}>{qa.label}</span>
                  <span>Dark: {qa.darkLabel}</span>
                  <span>Mobile: {qa.mobileLabel}</span>
                </span>
              </button>
            );
          })}
        </article>
        <article className="card stack">
          <h2>Theme audit</h2>
          {audits.map((audit) => {
            const actor = initialData.users.find((user) => user.id === audit.actorUserId);
            return (
              <p key={audit.id}>
                <strong>{audit.summary}</strong>
                <br />
                <span className="muted">{actor?.name ?? "Unknown actor"} - {formatDate(audit.createdAt)}</span>
              </p>
            );
          })}
          {!audits.length ? <p className="muted">No theme audit events recorded yet.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Launch validation</span>
              <h2>20 target brand surfaces</h2>
            </div>
            <span className={`badge ${brandLaunchValidation.coveragePercent === 100 ? "ok" : "warning"}`}>
              {brandLaunchValidation.coveragePercent}% covered
            </span>
          </div>
          <p className="muted">{brandLaunchValidation.providerBoundary}</p>
          <div className="compact-list">
            {brandLaunchValidation.surfaceChecks.map((check, index) => (
              <p key={check.id}>
                <strong>{index + 1}. {check.label}</strong>
                <br />
                <span className="muted">{check.status === "covered" ? "Covered" : "Blocked"} - {check.detail}</span>
              </p>
            ))}
          </div>
        </article>
        <article className="card stack">
          <h2>Test brands and metrics</h2>
          {brandLaunchValidation.testProfiles.map((profile) => (
            <div className="team-branding-preview" key={profile.teamId} style={teamBrandStyle(profile.primaryColor, profile.accentColor)}>
              <strong>{profile.shortName}</strong>
              <span>{profile.displayName} - published test brand</span>
            </div>
          ))}
          {brandLaunchValidation.metrics.map((metric) => (
            <p key={metric.label}>
              <strong>{metric.label}</strong>
              <br />
              <span className="muted">Target: {metric.target}. Current: {metric.current}.</span>
            </p>
          ))}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Production monitoring</h2>
          <div className="pill-row">
            {brandLaunchValidation.monitoringEvents.map((eventName) => (
              <span className="badge" key={eventName}>{eventName}</span>
            ))}
          </div>
          {brandLaunchValidation.alerts.map((alert) => (
            <p key={alert}>{alert}</p>
          ))}
        </article>
        <article className="card stack">
          <h2>Coach feedback and acceptance</h2>
          {brandLaunchValidation.feedbackQuestions.map((question) => (
            <p key={question}>{question}</p>
          ))}
          <div className="notice">
            {brandLaunchValidation.acceptanceCriteria.slice(0, 3).map((criterion) => (
              <p key={criterion}><strong>{criterion}</strong></p>
            ))}
            <p>{brandLaunchValidation.acceptanceCriteria.slice(3).join(" ")}</p>
          </div>
        </article>
      </section>
    </div>
  );
}

interface RegistrationClientProps {
  proofMetadata?: {
    publicOrganizationFingerprint?: string;
    reviewWindowConfigured: boolean;
  };
  registrationRequests?: RegistrationRequest[];
  reviewWindow?: string;
  teamOptions?: RegistrationTeamOption[];
}

export function RegistrationClient({
  proofMetadata,
  registrationRequests,
  reviewWindow = "within two business days",
  teamOptions
}: RegistrationClientProps = {}) {
  const { state } = useAppState();
  const teams = teamOptions?.length
    ? teamOptions
    : state.teams.map((team) => ({ id: team.id, name: team.name, division: team.division }));
  const [submittedRegistrationRequests, setSubmittedRegistrationRequests] = useState(registrationRequests ?? []);
  const [teamId, setTeamId] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [playerFirstName, setPlayerFirstName] = useState("");
  const [playerLastInitial, setPlayerLastInitial] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitRegistration() {
    const input = { teamId, parentName, parentEmail, playerFirstName, playerLastInitial, now: new Date().toISOString() };
    const preview = validateRegistrationRequestInput(input, teams.map((team) => team.id));
    setMessage(preview.message);
    if (!preview.ok) return;

    startTransition(async () => {
      const response = await fetch("/api/registration-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; request?: RegistrationRequest } | null;

      if (result?.ok) {
        if (result.request) {
          setSubmittedRegistrationRequests((current) => mergeRegistrationRequests([result.request!], current));
        }
        setMessage(result.message ?? "Your request was received. A league administrator will review the match before private team details appear.");
        return;
      }

      setMessage(result?.message ?? "Registration could not be saved. Please try again.");
    });
  }

  return (
    <div
      className="page"
      data-public-organization-fingerprint={proofMetadata?.publicOrganizationFingerprint}
      data-access-review-window-configured={proofMetadata ? String(proofMetadata.reviewWindowConfigured) : undefined}
    >
      <section className="hero">
        <span className="eyebrow">Request Team Access</span>
        <h1>Connect your family to the right team.</h1>
        <p className="lead">Share only what the league needs to check your connection. Private team details stay hidden during review.</p>
      </section>
      {message ? <p className="notice">{message}</p> : null}
      <section className="grid two">
        <article className="card stack">
          <label>Team<select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choose a team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} ({team.division})</option>)}</select></label>
          <label>Your name<input autoComplete="name" value={parentName} onChange={(event) => setParentName(event.target.value)} /></label>
          <label>Your email<input autoComplete="email" type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} /></label>
          <label>Child&apos;s first name<input autoComplete="off" value={playerFirstName} onChange={(event) => setPlayerFirstName(event.target.value)} /></label>
          <label>Child&apos;s last initial<input autoComplete="off" value={playerLastInitial} onChange={(event) => setPlayerLastInitial(event.target.value)} maxLength={1} /></label>
          <button onClick={submitRegistration} disabled={isPending}>{isPending ? "Sending request..." : "Request Team Access"}</button>
          <p className="muted">This request does not open private team information. It gives the league enough detail to review the match.</p>
        </article>
        <article className="card stack access-review-timeline">
          <h2>What happens next</h2>
          <ol>
            <li><strong>We receive your request</strong><span>You will see a confirmation here. Keep the reference if you contact league support.</span></li>
            <li><strong>The league checks the match</strong><span>An administrator compares your details with current registration or roster records. The usual review target is {reviewWindow}.</span></li>
            <li><strong>You receive the next step</strong><span>The league sends an invitation, asks for more information, or explains how to resolve the request safely.</span></li>
          </ol>
          <p className="notice">Privacy promise: children do not create LeaguePilot accounts. Other families cannot see your request or its status.</p>
          <h3>Your request receipt</h3>
          {submittedRegistrationRequests.map((request) => (
            <p key={request.id}><strong>{request.playerFirstName} {request.playerLastInitial}.</strong><br /><span className="muted">{request.parentName} - {request.status}<br />Reference: {request.id}</span><br /><a href={`/access/status?reference=${encodeURIComponent(request.id)}`}>Check request status</a></p>
          ))}
          {submittedRegistrationRequests.length === 0 ? <p className="muted">After you send the form, only your request receipt appears here. The private review queue stays hidden.</p> : null}
        </article>
      </section>
    </div>
  );
}

export function RegistrationReviewClient({ initialData }: { initialData: RegistrationReviewData }) {
  const [requests, setRequests] = useState(initialData.registrationRequests);
  const [actions, setActions] = useState(initialData.actions);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [invitation, setInvitation] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reviewRequest(requestId: string, action: "approve" | "reject") {
    setMessage("");
    setInvitation(null);
    setBusyRequestId(requestId);
    startTransition(async () => {
      try {
        const response = await authenticatedJsonFetch(`/api/admin/registration-requests/${requestId}/${action}`, { note });
        const result = await response.json().catch(() => null) as {
          ok?: boolean;
          message?: string;
          invitationPath?: string;
          expiresAt?: string;
        } | null;
        setMessage(result?.message ?? "Registration review failed.");

        if (result?.ok) {
          const nextStatus = action === "approve" ? "approved" : "rejected";
          setRequests((current) => current.map((request) => (
            request.id === requestId
              ? { ...request, status: nextStatus, reviewedAt: new Date().toISOString() }
              : request
          )));
          setActions((current) => [{
            id: `local-${requestId}-${action}-${Date.now()}`,
            registrationRequestId: requestId,
            action: action === "approve" ? "approved" : "rejected",
            note,
            createdAt: new Date().toISOString()
          }, ...current]);
          if (result.invitationPath && result.expiresAt) {
            setInvitation({
              url: `${window.location.origin}${result.invitationPath}`,
              expiresAt: result.expiresAt
            });
          }
        }
      } catch {
        setMessage("Registration review could not reach the server.");
      } finally {
        setBusyRequestId(null);
      }
    });
  }

  const pendingRequests = requests.filter((request) => request.status === "pending");

  async function copyInvitation() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.url);
      setMessage("One-time invitation copied. Share it only with the verified adult.");
    } catch {
      setMessage("Copy was blocked. Select the one-time link and copy it manually.");
    }
  }

  return (
    <div className="page registration-review-page">
      <section className="hero">
        <span className="eyebrow">Registration review</span>
        <h1>Verify the family match, then issue the right next step.</h1>
        <p className="lead">Your signed-in administrator identity and review note are recorded. Existing verified parents receive scoped access; other approved adults receive a one-time link for manual handoff.</p>
      </section>

      {message ? <p className="notice" aria-live="polite">{message}</p> : null}
      {invitation ? (
        <article className="card stack one-time-link" role="status">
          <span className="eyebrow">Copy now · shown once</span>
          <h2>Approved parent invitation</h2>
          <p className="break-anywhere">{invitation.url}</p>
          <p className="muted">Expires {new Date(invitation.expiresAt).toLocaleString()}. No email, SMS, push, or chat message was sent.</p>
          <button type="button" onClick={copyInvitation}>Copy one-time link</button>
          <p className="muted">The exact invited email must sign in before this link can activate the reviewed child and team scope.</p>
        </article>
      ) : null}

      <section className="grid two">
        <article className="card stack">
          <h2>Verification record</h2>
          <p className="notice">The server uses your verified signed-in administrator identity. You cannot choose another reviewer.</p>
          <label>What evidence did you review?
            <textarea maxLength={1000} placeholder="Describe the roster, registration, or league record used to verify this adult-child-team match." value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </article>

        <article className="card stack">
          <h2>Workflow boundary</h2>
          <p>Public registration remains a pending request only.</p>
          <p>Approval creates durable records and a visible review history.</p>
          <p>A one-time link is returned only to this signed-in admin and is not sent automatically.</p>
          <p>Rejected requests never create player, guardian, membership, or invite records.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Pending queue</h2>
          {pendingRequests.map((request) => (
            <div className="feature-tier-item" key={request.id}>
              <div className="card-header">
                <div>
                  <h3>{request.playerFirstName} {request.playerLastInitial}.</h3>
                  <p className="muted">{request.parentName} - {request.parentEmail}</p>
                </div>
                <span className="badge warning">{request.status}</span>
              </div>
              <div className="toolbar">
                <button
                  onClick={() => reviewRequest(request.id, "approve")}
                  disabled={isPending || busyRequestId === request.id || note.trim().length < 10}
                >
                  {busyRequestId === request.id ? "Reviewing..." : "Approve and issue next step"}
                </button>
                <button
                  className="secondary"
                  onClick={() => reviewRequest(request.id, "reject")}
                  disabled={isPending || busyRequestId === request.id || note.trim().length < 10}
                >
                  Reject
                </button>
              </div>
              {note.trim().length < 10 ? <p className="muted">Add a review note of at least 10 characters to enable a decision.</p> : null}
              {busyRequestId === request.id ? <p className="muted">This registration decision is being recorded.</p> : null}
            </div>
          ))}
          {pendingRequests.length === 0 ? <p className="muted">No pending registration requests.</p> : null}
        </article>

        <article className="card stack">
          <h2>Recent review actions</h2>
          {actions.slice(0, 8).map((action) => (
            <p key={action.id}>
              <strong>{action.action.replaceAll("_", " ")}</strong><br />
              <span className="muted">{formatDate(action.createdAt)} - {action.registrationRequestId}</span>
              {action.note ? <><br /><span>{action.note}</span></> : null}
            </p>
          ))}
          {actions.length === 0 ? <p className="muted">No approval actions have been recorded yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

export function CoachDraftsClient({
  dashboardData,
  draftData
}: {
  dashboardData?: ParentCoachDashboardData | null;
  draftData: CoachDraftReviewData;
}) {
  const accessGate = privateAccessGate(dashboardData, "coach");
  const sourceState = dashboardData?.state;

  return (
    <div className="page">
      <section className="hero compact-hero">
        <span className="eyebrow">Coach communication</span>
        <h1>Drafts to Review</h1>
        <p className="lead">Review pending family messages for assigned teams. Opening a draft does not approve or send it.</p>
      </section>

      {accessGate ?? (
        <section className="card stack" aria-labelledby="coach-draft-queue-title">
          <div className="card-header">
            <div>
              <h2 id="coach-draft-queue-title">Pending drafts</h2>
              <p className="muted">{draftData.message}</p>
            </div>
            <span className={`badge ${draftData.drafts.length ? "warning" : "ok"}`}>
              {draftData.drafts.length} pending
            </span>
          </div>

          {draftData.drafts.map((draft) => {
            const team = sourceState?.teams.find((item) => item.id === draft.teamId);
            const event = sourceState?.events.find((item) => item.id === draft.eventId);
            return (
              <article className="notice" key={draft.id}>
                <div className="card-header">
                  <div>
                    <strong>{draft.title}</strong>
                    <p className="muted">
                      {team?.name ?? "Assigned team"}{event ? ` | ${event.title}` : ""} | {draft.recipientCount} recipient{draft.recipientCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="badge warning">Pending</span>
                </div>
                <details>
                  <summary className="button secondary">Review draft</summary>
                  <div className="stack compact">
                    <p>{draft.body}</p>
                    <p className="muted">Channel: {draft.channel}. Saved {formatDate(draft.createdAt)}. Provider delivery still requires separate approval.</p>
                  </div>
                </details>
              </article>
            );
          })}

          {!draftData.drafts.length ? (
            <p className={`notice ${draftData.isSupabaseBacked ? "ok" : "warning"}`}>
              {draftData.isSupabaseBacked ? "All clear. No pending drafts need review." : draftData.message}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}

export function CoachCommunityClient({ dashboardData }: { dashboardData?: ParentCoachDashboardData | null } = {}) {
  const { state } = useAppState();
  const sourceState = dashboardData?.state ?? state;
  const accessGate = privateAccessGate(dashboardData, "coach");
  const [message, setMessage] = useState("");
  const [claimedIds, setClaimedIds] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const openSnacks = sourceState.snackScheduleSlots.filter((slot) => slot.status === "open" && !claimedIds.has(slot.id));
  const openVolunteers = sourceState.volunteerSignups.filter((signup) => signup.status === "open" && !claimedIds.has(signup.id));
  const openCount = openSnacks.length + openVolunteers.length;

  function claim(kind: "snack" | "volunteer", id: string) {
    setMessage("");
    startTransition(async () => {
      const actionId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `community-claim-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await authenticatedJsonFetch(
        kind === "snack" ? "/api/snack-slots/claim" : "/api/volunteer-signups/claim",
        kind === "snack" ? { slotId: id } : { signupId: id },
        { "Idempotency-Key": actionId }
      );
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? "The claim could not be saved.");
      if (result?.ok) setClaimedIds((current) => new Set(current).add(id));
    });
  }

  return (
    <div className="page">
      <section className="hero compact-hero">
        <span className="eyebrow">Family help</span>
        <h1>Snacks and Volunteers</h1>
        <p className="lead">Start with the open tasks for your assigned teams. Claims are saved only after the team record confirms them.</p>
      </section>

      {message ? <p className="notice">{message}</p> : null}
      {accessGate ?? (
        <>
          <section className="card stack" aria-labelledby="coach-community-open-title">
            <div className="card-header">
              <div>
                <h2 id="coach-community-open-title">Open team-help tasks</h2>
                <p className="muted">Claiming uses the signed-in coach account. It does not contact families.</p>
              </div>
              <span className={`badge ${openCount ? "warning" : "ok"}`}>{openCount} open</span>
            </div>
            {openSnacks.map((slot) => {
              const event = sourceState.events.find((item) => item.id === slot.eventId);
              return (
                <article className="notice" id={`snack-${slot.id}`} key={slot.id}>
                  <strong>{slot.item}</strong>
                  <p className="muted">Snack | {event?.title ?? "Assigned-team event"}</p>
                  <button disabled={isPending} onClick={() => claim("snack", slot.id)}>Claim for me</button>
                </article>
              );
            })}
            {openVolunteers.map((signup) => {
              const event = sourceState.events.find((item) => item.id === signup.eventId);
              return (
                <article className="notice" id={`volunteer-${signup.id}`} key={signup.id}>
                  <strong>{signup.role}</strong>
                  <p className="muted">Volunteer | {event?.title ?? "Assigned-team event"}</p>
                  <button disabled={isPending} onClick={() => claim("volunteer", signup.id)}>Claim for me</button>
                </article>
              );
            })}
            {!openCount ? <p className="notice ok">All clear. Every snack slot and volunteer role is covered.</p> : null}
          </section>

          <section className="card stack">
            <h2>Current coverage</h2>
            {sourceState.snackScheduleSlots.filter((slot) => slot.status !== "open" || claimedIds.has(slot.id)).map((slot) => (
              <p key={slot.id}><strong>{slot.item}</strong><br /><span className="muted">Snack | Covered</span></p>
            ))}
            {sourceState.volunteerSignups.filter((signup) => signup.status !== "open" || claimedIds.has(signup.id)).map((signup) => (
              <p key={signup.id}><strong>{signup.role}</strong><br /><span className="muted">Volunteer | Covered</span></p>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

export function CoachRsvpsClient({ dashboardData }: { dashboardData?: ParentCoachDashboardData | null } = {}) {
  const { state } = useAppState();
  const sourceState = dashboardData?.state ?? state;
  const coachId = dashboardData?.coachUserId ?? "user-coach-taylor";
  const accessGate = privateAccessGate(dashboardData, "coach");
  const summaries = getCoachRsvpSummaries(sourceState, coachId, NOW);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const previewTargets = summaries.flatMap((summary) => {
    const groups = new Map<string, { familyLabel: string; playerDisplayNames: string[] }>();
    for (const link of sourceState.guardianLinks.filter((item) => item.status === "active")) {
      const parentUserId = link.parentUserId;
      if (!parentUserId) continue;
      const player = sourceState.players.find((item) => item.id === link.playerId);
      if (!player || player.teamId !== summary.team.id) continue;
      const hasResponse = sourceState.rsvps.some((rsvp) => (
        rsvp.eventId === summary.event.id &&
        rsvp.playerId === player.id &&
        rsvp.parentUserId === parentUserId
      ));
      if (hasResponse) continue;
      const current = groups.get(parentUserId) ?? {
        familyLabel: sourceState.users.find((user) => user.id === parentUserId)?.name ?? "Linked family",
        playerDisplayNames: []
      };
      current.playerDisplayNames.push(`${player.firstName} ${player.lastInitial}.`);
      groups.set(parentUserId, current);
    }
    return Array.from(groups.entries()).map(([parentUserId, group]) => ({
      id: `preview:${summary.event.id}:${parentUserId}`,
      teamId: summary.team.id,
      eventId: summary.event.id,
      eventTitle: summary.event.title,
      parentUserId,
      familyLabel: group.familyLabel,
      playerDisplayNames: group.playerDisplayNames,
      noResponse: group.playerDisplayNames.length
    }));
  });
  const reminderTargets = dashboardData?.coachRsvpTargets ?? previewTargets;

  function saveReminderDraft(target: (typeof reminderTargets)[number]) {
    setMessage("");
    startTransition(async () => {
      const response = await authenticatedJsonFetch("/api/coach/rsvp-reminders/draft", {
        teamId: target.teamId,
        eventId: target.eventId,
        parentUserId: target.parentUserId
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(result?.message ?? "The RSVP reminder draft could not be saved.");
    });
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">Coach attendance view</span>
        <h1>Attendance summaries for assigned teams.</h1>
        <p className="lead">Assigned coaches see only their team events and aggregate RSVP counts.</p>
      </section>

      {dashboardData ? (
        <p className={`notice ${dashboardData.isSupabaseBacked ? "ok" : "warning"}`}>
          {dashboardData.isSupabaseBacked
            ? "Attendance is current for your assigned teams."
            : "Preview attendance is shown until an approved coach assignment is available."}
        </p>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
      {accessGate ?? (
      <section className="grid two">
        {summaries.map((summary) => (
          <article className="card stack" key={summary.event.id}>
            <h2>{summary.event.title}</h2>
            <p className="muted">{summary.team.name} · {formatDate(summary.event.startsAt)}</p>
            <div className="grid three">
              <div className="metric"><span className="muted">Going</span><strong>{summary.going}</strong></div>
              <div className="metric"><span className="muted">Maybe</span><strong>{summary.maybe}</strong></div>
              <div className="metric"><span className="muted">Not going</span><strong>{summary.notGoing}</strong></div>
            </div>
            <p>No response: {summary.noResponse} of {summary.totalPlayers}</p>
            {reminderTargets.filter((target) => target.eventId === summary.event.id).map((target) => (
              <div className="notice" id={`rsvp-${target.id}`} key={target.id}>
                <strong>{target.familyLabel}</strong>
                <p className="muted">No response for {target.playerDisplayNames.join(", ")}</p>
                <button disabled={isPending} onClick={() => saveReminderDraft(target)}>Save reminder draft</button>
                <p className="muted">Saves one pending draft for review. It does not send a message.</p>
              </div>
            ))}
            {summary.noResponse > 0 && !reminderTargets.some((target) => target.eventId === summary.event.id) ? (
              <p className="notice warning">Family reminder targets are unavailable, so no draft action is offered.</p>
            ) : null}
            {summary.noResponse === 0 ? <p className="notice ok">Nothing needed. Every family has responded.</p> : null}
          </article>
        ))}
      </section>
      )}
    </div>
  );
}

function formatParentScheduleTimeRange(event: LeagueEvent) {
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  return `${time.format(new Date(event.startsAt))} - ${time.format(new Date(event.endsAt))}`;
}

function getParentScheduleDateParts(value: string) {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()
  };
}

function getScheduleDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getTeamInitials(team?: Team) {
  if (!team) return "TM";
  return team.name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ParentScheduleFeed({
  scheduleState,
  scheduleData,
  parentDashboardData
}: {
  scheduleState: ParentCoachDashboardData["state"];
  scheduleData?: ScheduleOperationsData | null;
  parentDashboardData?: ParentCoachDashboardData | null;
}) {
  const parentState = parentDashboardData?.state ?? scheduleState;
  const parentUserId = parentDashboardData?.parentUserId || "user-parent-jordan";
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [passportProjectionId, setPassportProjectionId] = useState("");
  const [savedAnswers, setSavedAnswers] = useState<Record<string, {
    response: Extract<RsvpResponse, "going" | "maybe" | "not_going">;
    lockVersion: number;
  }>>({});
  const now = new Date(NOW);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 8);
  const visibleEvents = [...scheduleState.events]
    .filter((item) => Date.parse(item.endsAt) >= todayStart.getTime())
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const activeGuardianLinks = parentState.guardianLinks.filter((link) => (
    link.parentUserId === parentUserId &&
    link.status === "active"
  ));
  const linkedPlayerIds = new Set(activeGuardianLinks.map((link) => link.playerId));
  const linkedPlayers = parentState.players.filter((player) => linkedPlayerIds.has(player.id));
  const familyMission = buildFamilyMissionControl({
    state: parentState,
    parentUserId,
    handoffs: [],
    accessStatus: parentDashboardData?.accessStatus ?? "live",
    isSupabaseBacked: parentDashboardData?.isSupabaseBacked ?? false,
    message: parentDashboardData?.message ?? "Preview family schedule.",
    now: NOW
  });
  const filteredPlayers = selectedChildId
    ? linkedPlayers.filter((player) => player.id === selectedChildId)
    : linkedPlayers;
  const responseNeeded = visibleEvents.some((event) => (
    event.status === "scheduled" &&
    filteredPlayers.some((player) => (
      player.teamId === event.teamId &&
      !parentState.rsvps.some((rsvp) => (
        rsvp.eventId === event.id &&
        rsvp.playerId === player.id &&
        rsvp.parentUserId === parentUserId
      ))
    ))
  ));
  const nextEvent = visibleEvents.find((item) => item.status === "scheduled");
  const weekAnchor = new Date(nextEvent?.startsAt ?? visibleEvents[0]?.startsAt ?? NOW);
  const weekStart = new Date(weekAnchor);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const key = getScheduleDateKey(date);
    return {
      key,
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
      eventCount: visibleEvents.filter((item) => getScheduleDateKey(item.startsAt) === key).length
    };
  });
  const visibleTeamIds = new Set(filteredPlayers.map((player) => player.teamId));
  const familyVisibleEvents = visibleEvents.filter((event) => visibleTeamIds.has(event.teamId));
  const displayedEvents = selectedDateKey
    ? familyVisibleEvents.filter((item) => getScheduleDateKey(item.startsAt) === selectedDateKey)
    : familyVisibleEvents;
  const todayEvents = displayedEvents.filter((item) => {
    const startsAt = Date.parse(item.startsAt);
    return startsAt >= todayStart.getTime() && startsAt < tomorrowStart.getTime();
  });
  const thisWeekEvents = displayedEvents.filter((item) => {
    const startsAt = Date.parse(item.startsAt);
    return startsAt >= tomorrowStart.getTime() && startsAt < weekEnd.getTime();
  });
  const laterEvents = displayedEvents.filter((item) => Date.parse(item.startsAt) >= weekEnd.getTime());
  const passportEvent = familyMission.events.find((item) => item.projectionId === passportProjectionId);
  const passportRsvp = passportEvent ? parentState.rsvps.find((item) => (
    item.eventId === passportEvent.eventId &&
    item.playerId === passportEvent.childId &&
    item.parentUserId === parentUserId
  )) : undefined;
  const selectedDayLabel = weekDays.find((day) => day.key === selectedDateKey);

  function renderEventCard(event: LeagueEvent) {
    const team = scheduleState.teams.find((item) => item.id === event.teamId);
    const dateParts = getParentScheduleDateParts(event.startsAt);
    const eventPlayers = filteredPlayers.filter((player) => player.teamId === event.teamId);
    const eventProjections = familyMission.events.filter((item) => (
      item.eventId === event.id &&
      eventPlayers.some((player) => player.id === item.childId)
    ));
    const directionsQuery = [event.locationName, event.locationAddress].filter(Boolean).join(", ");
    const statusLabel = event.status === "cancelled"
      ? "Canceled"
      : event.status === "completed"
        ? "Completed"
        : event.eventType === "game"
          ? "Confirmed game"
          : "Confirmed";

    return (
      <article className={`parent-schedule-list-card state-${event.status}`} key={event.id}>
        <header className="parent-schedule-list-team">
          <span
            className="parent-schedule-list-mark"
            style={{ "--team-primary": team?.primaryColor, "--team-secondary": team?.secondaryColor } as CSSProperties}
            aria-hidden="true"
          >
            {getTeamInitials(team)}
          </span>
          <strong>{team?.name ?? "Team"}</strong>
          <span className={`season-status ${event.status === "cancelled" ? "state-blocked" : event.status === "completed" ? "state-ready" : "state-planned"}`}>
            {statusLabel}
          </span>
        </header>

        <div className="parent-schedule-list-event">
          <div className="parent-schedule-list-date" aria-label={`${dateParts.day} ${dateParts.date}`}>
            <span>{dateParts.day}</span>
            <strong>{dateParts.date}</strong>
            <small>{event.eventType === "team_event" ? "Team event" : event.eventType}</small>
          </div>
          <div className="parent-schedule-list-detail">
            <h2>{event.title}</h2>
            <strong className="game-day-time">{formatParentScheduleTimeRange(event)}</strong>
            <p>
              <span className="parent-location-mark" aria-hidden="true" />
              <span>{event.locationName}{event.locationAddress ? `, ${event.locationAddress}` : ""}</span>
            </p>
            <div className="parent-schedule-card-actions">
              {directionsQuery ? (
                <a
                  className="parent-schedule-directions"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              ) : null}
              <button
                className="parent-schedule-sheet-trigger"
                type="button"
                disabled={!eventProjections.length}
                onClick={() => setPassportProjectionId(eventProjections[0]?.projectionId ?? "")}
              >
                Event Passport
              </button>
            </div>
          </div>
        </div>

        {event.status === "scheduled" && eventPlayers.length ? (
          <div className="parent-schedule-rsvp-list">
            {eventPlayers.map((player) => {
              const rsvp = parentState.rsvps.find((item) => (
                item.eventId === event.id &&
                item.playerId === player.id &&
                item.parentUserId === parentUserId
              ));
              const playerLabel = `${player.firstName} ${player.lastInitial}.`;
              const projection = eventProjections.find((item) => item.childId === player.id);
              const saved = projection ? savedAnswers[projection.projectionId] : undefined;

              return (
                <div className="parent-schedule-rsvp-row" key={player.id}>
                  <span className="parent-player-avatar" aria-hidden="true">{player.firstName[0]}{player.lastInitial}</span>
                  <p>
                    <strong>{playerLabel}</strong>
                    <small>{saved || rsvp ? "Response recorded for this event." : "A response is still needed."}</small>
                  </p>
                  <RsvpControl
                    eventId={event.id}
                    playerId={player.id}
                    childLabel={playerLabel}
                    eventTitle={event.title}
                    scheduleVersion={event.scheduleVersion ?? 1}
                    currentResponse={saved?.response ?? rsvp?.response}
                    currentLockVersion={saved?.lockVersion ?? rsvp?.lockVersion ?? 0}
                    disabled={false}
                    onSaved={({ response, lockVersion }) => projection && setSavedAnswers((current) => ({
                      ...current,
                      [projection.projectionId]: { response, lockVersion }
                    }))}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {event.status === "cancelled" ? (
          <p className="parent-schedule-state-note danger">This event is canceled. No RSVP action is needed.</p>
        ) : null}
        {event.status === "completed" ? (
          <p className="parent-schedule-state-note">This event is complete. Attendance remains read-only.</p>
        ) : null}
      </article>
    );
  }

  function renderGroup(title: string, events: LeagueEvent[], emptyCopy?: string) {
    return (
      <section className="parent-schedule-feed-group" aria-labelledby={`parent-schedule-${title.toLowerCase().replaceAll(" ", "-")}`}>
        <header>
          <h2 id={`parent-schedule-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h2>
          <span>{events.length} {events.length === 1 ? "event" : "events"} <span aria-hidden="true">⌃</span></span>
        </header>
        {events.length ? <div className="parent-schedule-feed-list">{events.map(renderEventCard)}</div> : (
          <div className="parent-schedule-empty">
            <strong>{title === "Today" ? "No events today" : `No events ${title.toLowerCase()}`}</strong>
            <span>{emptyCopy ?? "Your family has no team event in this group."}</span>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="page parent-schedule-page">
      <section className="hero parent-schedule-hero">
        <span className="eyebrow">Family schedule</span>
        <h1>All schedules</h1>
        <p className="lead">Games and practices in one calm view. Answer any RSVP, then use directions when it is time to leave.</p>
      </section>

      <div className={`certainty-band ${responseNeeded ? "certainty-band-warning" : "certainty-band-parent"}`}>
        <span className="certainty-band-icon" aria-hidden="true">{responseNeeded ? "!" : "✓"}</span>
        <span>
          <strong>{responseNeeded ? "RSVP needed" : nextEvent ? "Next event confirmed" : "Schedule is clear"}</strong>
          <small>
            {responseNeeded
              ? "One or more linked players still need an event response."
              : nextEvent
                ? `${nextEvent.title} is next on your family schedule.`
                : "No upcoming team events are currently scheduled."}
          </small>
        </span>
        {responseNeeded ? (
          <a className="parent-rsvp-action" href="/parent/rsvp">Open needs reply</a>
        ) : (
          <span className="season-status state-ready">
            {scheduleData?.isSupabaseBacked ? "Current" : "Preview"}
          </span>
        )}
      </div>

      <FamilyFilter
        childrenList={familyMission.children}
        selectedChildId={selectedChildId}
        onSelect={setSelectedChildId}
      />

      <section className="parent-week-ribbon" aria-labelledby="family-week-title">
        <header>
          <span>
            <strong id="family-week-title">Week ribbon</strong>
            <small>{weekAnchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</small>
          </span>
          <button type="button" aria-pressed={!selectedDateKey} onClick={() => setSelectedDateKey("")}>All dates</button>
        </header>
        <div className="parent-week-days">
          {weekDays.map((day) => (
            <button
              type="button"
              key={day.key}
              aria-pressed={selectedDateKey === day.key}
              aria-label={`${day.day} ${day.date}, ${day.eventCount} event${day.eventCount === 1 ? "" : "s"}`}
              onClick={() => setSelectedDateKey((current) => current === day.key ? "" : day.key)}
            >
              <span>{day.day}</span>
              <strong>{day.date}</strong>
              <small>{day.eventCount || "–"}</small>
            </button>
          ))}
        </div>
      </section>

      {passportEvent ? (
        <section className="parent-game-day-sheet" aria-labelledby="game-day-sheet-title">
          <header>
            <span>
              <small>Family event details</small>
              <h2 id="game-day-sheet-title">Event Passport</h2>
              <p>Official schedule facts and family-owned responses stay separate.</p>
            </span>
            <button type="button" className="secondary" onClick={() => setPassportProjectionId("")}>Close</button>
          </header>
          <EventPassport
            event={passportEvent}
            currentResponse={savedAnswers[passportEvent.projectionId]?.response ?? passportRsvp?.response}
            currentLockVersion={savedAnswers[passportEvent.projectionId]?.lockVersion ?? passportRsvp?.lockVersion ?? 0}
            canWriteRsvp
            onRsvpSaved={({ response, lockVersion }) => setSavedAnswers((current) => ({
              ...current,
              [passportEvent.projectionId]: { response, lockVersion }
            }))}
          />
          <small className="parent-game-day-sheet-boundary">This passport reads current family and team records. It does not send alerts or infer unpublished arrival details.</small>
        </section>
      ) : null}

      {selectedDateKey
        ? renderGroup(`${selectedDayLabel?.day ?? "Selected day"} ${selectedDayLabel?.date ?? ""}`, displayedEvents, "No team event is scheduled for this date.")
        : (
          <>
            {renderGroup("Today", todayEvents, nextEvent ? `Next: ${nextEvent.title}.` : "Nothing is scheduled next.")}
            {thisWeekEvents.length
              ? renderGroup("This week", thisWeekEvents)
              : laterEvents.length
                ? renderGroup("Coming up", laterEvents)
                : renderGroup("This week", thisWeekEvents)}
            {thisWeekEvents.length && laterEvents.length ? renderGroup("Later", laterEvents) : null}
          </>
        )}

      <p className="parent-schedule-privacy">
        <strong>Family-only RSVP details.</strong>
        <span>Official calendar facts remain read-only here. Family responses use the same three-answer control everywhere.</span>
      </p>
    </div>
  );
}

function CoachScheduleCommand({
  scheduleState,
  selectedEventId,
  onSelectEvent
}: {
  scheduleState: ParentCoachDashboardData["state"];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
}) {
  const nowMs = Date.parse(NOW);
  const scheduledEvents = [...scheduleState.events]
    .filter((item) => item.status === "scheduled")
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const activeEvent = scheduledEvents.find((item) => Date.parse(item.startsAt) <= nowMs && Date.parse(item.endsAt) >= nowMs);
  const nextEvent = scheduledEvents.find((item) => Date.parse(item.startsAt) > nowMs) ?? scheduledEvents[0];
  const laterEvents = scheduledEvents.filter((item) => item.id !== activeEvent?.id && item.id !== nextEvent?.id).slice(0, 3);
  const readinessRows = getScheduleRsvpSyncRows(scheduleState)
    .filter((row) => row.event.status === "scheduled")
    .sort((left, right) => Date.parse(left.event.startsAt) - Date.parse(right.event.startsAt))
    .slice(0, 6);
  const totalNoResponse = readinessRows.reduce((total, row) => total + row.noResponse, 0);
  const totalOpenHelp = readinessRows.reduce((total, row) => (
    total +
    scheduleState.snackScheduleSlots.filter((slot) => slot.eventId === row.event.id && slot.status === "open").length +
    scheduleState.volunteerSignups.filter((signup) => signup.eventId === row.event.id && signup.status === "open").length
  ), 0);

  function renderTimelineEvent(label: string, item?: LeagueEvent) {
    const team = item ? scheduleState.teams.find((teamItem) => teamItem.id === item.teamId) : undefined;
    return (
      <article className={`coach-schedule-moment${item?.id === selectedEventId ? " is-selected" : ""}${item ? "" : " is-empty"}`}>
        <span>{label}</span>
        {item ? (
          <>
            <strong>{item.title}</strong>
            <small>{team?.name ?? "Team"} · {formatShortDay(item.startsAt)} · {formatShortTime(item.startsAt)}</small>
            <button type="button" onClick={() => onSelectEvent(item.id)}>Inspect event</button>
          </>
        ) : (
          <>
            <strong>Nothing active</strong>
            <small>The sideline is clear right now.</small>
          </>
        )}
      </article>
    );
  }

  return (
    <section className="coach-schedule-command" aria-labelledby="coach-schedule-command-title">
      <div className="certainty-band certainty-band-coach">
        <span className="certainty-band-icon" aria-hidden="true">{totalNoResponse + totalOpenHelp ? "!" : "✓"}</span>
        <span>
          <strong id="coach-schedule-command-title">{totalNoResponse + totalOpenHelp ? "Schedule attention needed" : "Next event ready"}</strong>
          <small>{totalNoResponse} family response gap(s) and {totalOpenHelp} open team-help role(s) across the visible schedule.</small>
        </span>
        <span className={`season-status ${totalNoResponse + totalOpenHelp ? "state-needs_attention" : "state-ready"}`}>
          {readinessRows.length} events
        </span>
      </div>

      <div className="coach-schedule-timeline">
        <header>
          <span>
            <small>Sideline timeline</small>
            <h2>Now, next, later</h2>
          </span>
          <p>Choose an event to move the operations form and calendar inspector to that record.</p>
        </header>
        <div className="coach-schedule-moments">
          {renderTimelineEvent("Now", activeEvent)}
          {renderTimelineEvent("Next", nextEvent)}
          <article className="coach-schedule-moment later">
            <span>Later</span>
            {laterEvents.map((item) => (
              <button type="button" key={item.id} onClick={() => onSelectEvent(item.id)}>
                <strong>{item.title}</strong>
                <small>{formatShortDay(item.startsAt)} · {formatShortTime(item.startsAt)}</small>
              </button>
            ))}
            {!laterEvents.length ? <small>No additional team events are scheduled.</small> : null}
          </article>
        </div>
      </div>

      <div className="coach-readiness-matrix">
        <header>
          <span>
            <small>Readiness matrix</small>
            <h2>What needs attention before arrival</h2>
          </span>
          <p>Counts are derived from assigned-team schedule, RSVP, snack, volunteer, and weather records.</p>
        </header>
        <div className="coach-readiness-table" role="table" aria-label="Schedule readiness matrix">
          <div className="coach-readiness-row head" role="row">
            <span role="columnheader">Event</span>
            <span role="columnheader">Going</span>
            <span role="columnheader">No response</span>
            <span role="columnheader">Help gaps</span>
            <span role="columnheader">Weather</span>
          </div>
          {readinessRows.map((row) => {
            const helpGaps =
              scheduleState.snackScheduleSlots.filter((slot) => slot.eventId === row.event.id && slot.status === "open").length +
              scheduleState.volunteerSignups.filter((signup) => signup.eventId === row.event.id && signup.status === "open").length;
            const weatherAlert = scheduleState.weatherAlerts.find((alert) => alert.eventId === row.event.id);
            return (
              <button className="coach-readiness-row" type="button" role="row" key={row.event.id} onClick={() => onSelectEvent(row.event.id)}>
                <span role="cell"><strong>{row.event.title}</strong><small>{formatShortDay(row.event.startsAt)}</small></span>
                <span role="cell">{row.going}</span>
                <span className={row.noResponse ? "needs-attention" : ""} role="cell">{row.noResponse}</span>
                <span className={helpGaps ? "needs-attention" : ""} role="cell">{helpGaps}</span>
                <span className={weatherAlert ? "needs-attention" : ""} role="cell">{weatherAlert ? weatherAlert.status : "Clear"}</span>
              </button>
            );
          })}
          {!readinessRows.length ? <p className="parent-schedule-empty">No assigned-team events are available.</p> : null}
        </div>
      </div>
    </section>
  );
}

function AdminCalendarControlRoom({
  scheduleState,
  event,
  eventId,
  startsAt,
  locationName,
  status,
  conflictCount,
  affectedFamilies,
  draftAlertCount,
  onSelectEvent,
  onStartsAtChange,
  onLocationNameChange,
  onStatusChange
}: {
  scheduleState: ParentCoachDashboardData["state"];
  event?: LeagueEvent;
  eventId: string;
  startsAt: string;
  locationName: string;
  status: EventStatus;
  conflictCount: number;
  affectedFamilies: number;
  draftAlertCount: number;
  onSelectEvent: (eventId: string) => void;
  onStartsAtChange: (value: string) => void;
  onLocationNameChange: (value: string) => void;
  onStatusChange: (value: EventStatus) => void;
}) {
  const eventTeam = event ? scheduleState.teams.find((team) => team.id === event.teamId) : undefined;
  const changes = event ? [
    {
      label: "Start",
      original: formatDate(event.startsAt),
      proposed: formatDate(startsAt),
      changed: event.startsAt !== startsAt
    },
    {
      label: "Location",
      original: event.locationName,
      proposed: locationName,
      changed: event.locationName !== locationName
    },
    {
      label: "Status",
      original: event.status,
      proposed: status,
      changed: event.status !== status
    }
  ] : [];
  const changedCount = changes.filter((item) => item.changed).length;

  return (
    <section className="admin-calendar-control-room" aria-labelledby="admin-calendar-title">
      <div className="certainty-band certainty-band-admin">
        <span className="certainty-band-icon" aria-hidden="true">{conflictCount || changedCount ? "!" : "✓"}</span>
        <span>
          <strong id="admin-calendar-title">{conflictCount ? "Schedule conflict requires review" : changedCount ? "Draft change under review" : "Calendar is operational"}</strong>
          <small>{conflictCount} conflict(s), {affectedFamilies} affected family record(s), and {draftAlertCount} draft alert record(s) for the selected event.</small>
        </span>
        <span className={`season-status ${conflictCount || changedCount ? "state-needs_attention" : "state-ready"}`}>
          {changedCount} changes
        </span>
      </div>

      <div className="admin-calendar-split">
        <ScheduleMonthCalendar
          events={scheduleState.events}
          onSelectEvent={onSelectEvent}
          selectedEventId={event?.id ?? eventId}
          teams={scheduleState.teams}
        />
        <aside className="admin-calendar-inspector" aria-label="Selected event inspector">
          <header>
            <span>
              <small>Selected event</small>
              <h2>{event?.title ?? "No event selected"}</h2>
            </span>
            <span className={`season-status ${status === "cancelled" ? "state-blocked" : status === "completed" ? "state-ready" : "state-planned"}`}>{status}</span>
          </header>
          <label>
            Inspect event
            <select value={eventId} onChange={(input) => onSelectEvent(input.target.value)}>
              {scheduleState.events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          {event ? (
            <>
              <div className="admin-inspector-facts">
                <p><span>Team</span><strong>{eventTeam?.name ?? "Team"}</strong></p>
                <p><span>Type</span><strong>{event.eventType.replace("_", " ")}</strong></p>
                <p><span>Families</span><strong>{affectedFamilies}</strong></p>
                <p><span>Conflicts</span><strong>{conflictCount}</strong></p>
              </div>
              <div className="admin-inspector-edit">
                <label>
                  Proposed start
                  <input value={startsAt} onChange={(input) => onStartsAtChange(input.target.value)} />
                </label>
                <label>
                  Proposed location
                  <input value={locationName} onChange={(input) => onLocationNameChange(input.target.value)} />
                </label>
                <label>
                  Proposed status
                  <select value={status} onChange={(input) => onStatusChange(input.target.value as EventStatus)}>
                    <option value="scheduled">Scheduled</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>
              <div className="admin-change-lens">
                <header>
                  <span>
                    <small>Change lens</small>
                    <h3>Original and proposed truth</h3>
                  </span>
                  <strong>{changedCount} changed</strong>
                </header>
                <div className="admin-change-row head">
                  <span>Field</span><span>Original</span><span>Proposed</span>
                </div>
                {changes.map((item) => (
                  <div className={`admin-change-row${item.changed ? " changed" : ""}`} key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{item.original}</span>
                    <span>{item.proposed}</span>
                  </div>
                ))}
              </div>
              <p className="admin-inspector-boundary">Changes remain local to this review form until saved. Saving queues notification records for review and does not execute provider delivery.</p>
              <a className="text-link" href="#schedule-change-form">Go to schedule change form</a>
            </>
          ) : <p className="muted">No event is available for inspection.</p>}
        </aside>
      </div>
    </section>
  );
}

export function ScheduleAlertsClient({
  scheduleData,
  dashboardData,
  mode = "operations"
}: {
  scheduleData?: ScheduleOperationsData | null;
  dashboardData?: ParentCoachDashboardData | null;
  mode?: "operations" | "readonly" | "parent" | "coach" | "admin";
} = {}) {
  const { state, dispatch } = useAppState();
  const roleState = dashboardData?.state ?? state;
  const [remoteEvents, setRemoteEvents] = useState<LeagueEvent[]>(() => scheduleData?.events ?? []);
  const scheduleEventIds = new Set((scheduleData?.events ?? []).map((event) => event.id));
  const scheduleTeamIds = new Set((scheduleData?.teams ?? []).map((team) => team.id));
  const scheduleState = scheduleData?.isSupabaseBacked
    ? {
      ...roleState,
      teams: scheduleData.teams,
      events: remoteEvents,
      rsvps: roleState.rsvps.filter((rsvp) => scheduleEventIds.has(rsvp.eventId)),
      notifications: roleState.notifications.filter((notification) => !notification.teamId || scheduleTeamIds.has(notification.teamId)),
      notificationPreferences: roleState.notificationPreferences.filter((preference) => !preference.teamId || scheduleTeamIds.has(preference.teamId))
    }
    : roleState;
  const isReadonly = mode === "readonly" || mode === "parent";
  const defaultEventId = getDefaultScheduleEventId(scheduleState.events);
  const [eventId, setEventId] = useState(defaultEventId);
  const event = scheduleState.events.find((item) => item.id === eventId) ?? scheduleState.events.find((item) => item.id === defaultEventId) ?? scheduleState.events[0];
  const [startsAt, setStartsAt] = useState(event?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(event?.endsAt ?? "");
  const [title, setTitle] = useState(event?.title ?? "");
  const [eventType, setEventType] = useState<EventType>(event?.eventType ?? "practice");
  const [locationName, setLocationName] = useState(event?.locationName ?? "");
  const [locationAddress, setLocationAddress] = useState(event?.locationAddress ?? "");
  const [fieldLocationId, setFieldLocationId] = useState("");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "scheduled");
  const [message, setMessage] = useState("");
  const [isSchedulePending, startScheduleTransition] = useTransition();
  const eventTeam = event ? scheduleState.teams.find((team) => team.id === event.teamId) : undefined;
  const venueRecords = getVenueRecords(scheduleState);
  const persistedVenueRecords = scheduleData?.fieldLocations ?? [];
  const recurringPreview = event ? previewRecurringEvents(scheduleState, { sourceEventId: event.id, count: 3, intervalDays: 7 }) : [];
  const calendarExport = eventTeam ? exportTeamCalendarIcs(scheduleState, eventTeam.id) : "";
  const calendarExportHref = scheduleData?.isSupabaseBacked && eventTeam ? `/api/schedule/export?teamId=${encodeURIComponent(eventTeam.id)}` : "";
  const rsvpSyncRows = getScheduleRsvpSyncRows(scheduleState).filter((row) => !eventTeam || row.event.teamId === eventTeam.id);
  const scheduleWorkflow = getScheduleNotificationWorkflow(scheduleState);
  const eventStatusTracking = getEventStatusTracking(scheduleState);
  const channelReadiness = getNotificationChannelReadiness(scheduleState);
  const vapidStatus = getVapidSendAdapterStatus();
  const retryLogs = getNotificationRetryLogs(scheduleState);
  const deviceSummary = getDeviceManagementSummary(scheduleState);
  const emailFallback = getEmailFallbackPlan(scheduleState, { notificationType: status === "cancelled" ? "event_cancelled" : "schedule_changed" });
  const smsUrgentAllowed = smsUrgencyAllowed({ notificationType: status === "cancelled" ? "event_cancelled" : "schedule_changed", urgent: status === "cancelled" });
  const openRate = getAlertOpenRateTracking(scheduleState);
  const preferenceAllowed = event ? recipientAllowsNotification(scheduleState, {
    userId: "user-parent-jordan",
    teamId: event.teamId,
    channel: "push",
    notificationType: status === "cancelled" ? "event_cancelled" : "schedule_changed"
  }) : false;
  const conflictEndsAt = endsAt || (event ? event.endsAt : "");
  const scheduleConflicts = event ? detectScheduleConflicts(scheduleState, {
    eventId,
    teamId: event.teamId,
    startsAt,
    endsAt: conflictEndsAt,
    locationName
  }) : [];
  const impactPreview = previewScheduleChangeImpact(scheduleState, {
    eventId,
    actorUserId: "user-admin",
    actorRole: "admin",
    startsAt,
    locationName,
    status,
    now: NOW
  });

  function selectEvent(nextId: string) {
    const next = scheduleState.events.find((item) => item.id === nextId);
    setEventId(nextId);
    setStartsAt(next?.startsAt ?? "");
    setEndsAt(next?.endsAt ?? "");
    setTitle(next?.title ?? "");
    setEventType(next?.eventType ?? "practice");
    setLocationName(next?.locationName ?? "");
    setLocationAddress(next?.locationAddress ?? "");
    setFieldLocationId("");
    setStatus(next?.status ?? "scheduled");
  }

  function saveScheduleChange() {
    if (!event) {
      setMessage("Select a schedule event before saving.");
      return;
    }

    if (isReadonly) {
      setMessage("This route is read-only. Coaches or admins must use schedule operations to edit events.");
      return;
    }

    startScheduleTransition(async () => {
      const response = await authenticatedJsonFetch("/api/schedule", {
        eventId,
        organizationId: event.organizationId,
        seasonId: event.seasonId,
        teamId: event.teamId,
        title,
        eventType,
        startsAt,
        endsAt: conflictEndsAt,
        locationName,
        locationAddress,
        fieldLocationId: fieldLocationId || undefined,
        opponent: event.opponent,
        status,
        reason: status === "cancelled" ? "Schedule change entered from the operations screen." : undefined
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; message?: string; event?: LeagueEvent } | null;
      setMessage(result?.message ?? (response.ok ? "Schedule event saved." : "Schedule event could not be saved."));

      if (result?.ok && result.event) {
        setRemoteEvents((current) => {
          const others = current.filter((item) => item.id !== result.event!.id);
          return [...others, result.event!].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
        });
        return;
      }

      if (response.status === 401 && !scheduleData?.isSupabaseBacked) {
        const input = {
          eventId,
          actorUserId: "user-admin",
          actorRole: "admin" as const,
          startsAt,
          locationName,
          status,
          now: new Date().toISOString()
        };
        const preview = applyScheduleChange(state, input);
        setMessage(preview.message);
        if (preview.ok) dispatch({ type: "applyScheduleChange", input });
      }
    });
  }

  if (mode === "parent") {
    return (
      <ParentScheduleFeed
        scheduleState={scheduleState}
        scheduleData={scheduleData}
        parentDashboardData={dashboardData}
      />
    );
  }

  if (isReadonly) {
    return (
      <div className="page public-schedule-page">
        <section className="hero">
          <span className="eyebrow">Public schedule</span>
          <h1>Know when and where the league plays.</h1>
          <p className="lead">See published event details without signing in. Private responses, conversations, and child information stay protected.</p>
        </section>

        <p className={`notice ${scheduleData?.isSupabaseBacked ? "ok" : "warning"}`}>
          {scheduleData?.isSupabaseBacked
            ? "Showing the current published schedule."
            : "Live schedule data is temporarily unavailable. These example rows are clearly separated from official league updates."}
        </p>
        {message ? <p className="notice">{message}</p> : null}

        <PublicScheduleAgenda
          event={event}
          events={scheduleState.events}
          onSelectEvent={selectEvent}
          teams={scheduleState.teams}
        />

        <section className="public-schedule-trust" aria-label="Schedule privacy and access">
          <div>
            <h2>Need private team details?</h2>
            <p>Request access so the league can verify your family connection. Public schedule browsing never exposes rosters, attendance, transportation, or family conversations.</p>
          </div>
          <a className="button" href="/registration">Request Team Access</a>
          <a className="button secondary" href="/auth">Sign in</a>
        </section>
      </div>
    );
  }

  return (
    <div className={`page schedule-operations-page schedule-mode-${mode}`}>
      <section className="hero">
        <span className="eyebrow">{mode === "coach" ? "Coach schedule" : mode === "admin" ? "League schedule control room" : "Schedule change alerts"}</span>
        <h1>
          {mode === "coach"
            ? "Run the next event."
            : mode === "admin"
              ? "Calendar control room."
              : "Queue alert records when schedule details change."}
        </h1>
        <p className="lead">
          {mode === "coach"
            ? "See now, next, attendance gaps, team-help needs, and weather before changing the schedule."
            : mode === "admin"
              ? "Inspect an event, compare original and proposed truth, then save auditable review records."
              : "Admins and assigned coaches can update time, location, or cancellation status. Changes create review records only; no family message is sent automatically."}
        </p>
      </section>

      {mode === "coach" || mode === "admin" ? null : (
        <p className={`notice ${scheduleData?.isSupabaseBacked ? "ok" : "warning"}`}>
          {scheduleData?.isSupabaseBacked
            ? "Schedule details are current for your approved role."
            : "Schedule preview is shown until approved team access is available."}
        </p>
      )}
      {message ? <p className="notice">{message}</p> : null}
      {mode === "coach" ? (
        <CoachScheduleCommand
          scheduleState={scheduleState}
          selectedEventId={event?.id ?? eventId}
          onSelectEvent={selectEvent}
        />
      ) : null}
      {mode === "admin" ? (
        <AdminCalendarControlRoom
          scheduleState={scheduleState}
          event={event}
          eventId={eventId}
          startsAt={startsAt}
          locationName={locationName}
          status={status}
          conflictCount={scheduleConflicts.length}
          affectedFamilies={impactPreview.affectedFamilies}
          draftAlertCount={impactPreview.notificationCount}
          onSelectEvent={selectEvent}
          onStartsAtChange={setStartsAt}
          onLocationNameChange={setLocationName}
          onStatusChange={setStatus}
        />
      ) : (
        <ScheduleMonthCalendar
          events={scheduleState.events}
          onSelectEvent={selectEvent}
          selectedEventId={event?.id ?? eventId}
          teams={scheduleState.teams}
        />
      )}
      <section className="grid two">
        <article className="card stack" id="schedule-change-form">
          <h2>{isReadonly ? "Event details" : "Edit event"}</h2>
          <label>
            Event
            <select value={eventId} onChange={(input) => selectEvent(input.target.value)}>
              {scheduleState.events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label>
            Title
            <input value={title} onChange={(input) => setTitle(input.target.value)} disabled={isReadonly} />
          </label>
          <label>
            Type
            <select value={eventType} onChange={(input) => setEventType(input.target.value as EventType)} disabled={isReadonly}>
              <option value="practice">Practice</option>
              <option value="game">Game</option>
              <option value="team_event">Team event</option>
            </select>
          </label>
          <label>
            Starts at
            <input value={startsAt} onChange={(input) => setStartsAt(input.target.value)} disabled={isReadonly} />
          </label>
          <label>
            Ends at
            <input value={endsAt} onChange={(input) => setEndsAt(input.target.value)} disabled={isReadonly} />
          </label>
          {persistedVenueRecords.length ? (
            <label>
              Saved venue
              <select
                value={fieldLocationId}
                disabled={isReadonly}
                onChange={(input) => {
                  const field = persistedVenueRecords.find((item) => item.id === input.target.value);
                  setFieldLocationId(input.target.value);
                  if (field) {
                    setLocationName(field.name);
                    setLocationAddress(field.address);
                  }
                }}
              >
                <option value="">Use event location</option>
                {persistedVenueRecords.map((field) => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Location
            <input value={locationName} onChange={(input) => setLocationName(input.target.value)} disabled={isReadonly} />
          </label>
          <label>
            Address
            <input value={locationAddress} onChange={(input) => setLocationAddress(input.target.value)} disabled={isReadonly} />
          </label>
          <label>
            Status
            <select value={status} onChange={(input) => setStatus(input.target.value as EventStatus)} disabled={isReadonly}>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button
            disabled={isReadonly || isSchedulePending || !title.trim() || !locationName.trim() || !locationAddress.trim()}
            onClick={saveScheduleChange}
          >
            {isReadonly ? "Read-only route" : "Save schedule change (drafts family alerts for review)"}
          </button>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Event detail</span>
              <h2>{event?.title ?? "No event selected"}</h2>
            </div>
            <span className={`badge ${status === "cancelled" ? "danger" : status === "completed" ? "ok" : "warning"}`}>{status}</span>
          </div>
          {event ? (
            <>
              <p><strong>{eventTeam?.name ?? "Team"}</strong> · {event.eventType.replace("_", " ")}</p>
              <p className="muted">{formatDate(startsAt)} to {formatDate(conflictEndsAt)} · {locationName}</p>
              <p className="muted">{locationAddress}</p>
              <p>Created {formatDate(event.createdAt)} · Updated {formatDate(event.updatedAt)}</p>
            </>
          ) : <p className="muted">No event is available.</p>}
        </article>
      </section>

      {mode === "operations" ? <>
      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Schedule CRUD service</span>
              <h2>Create, update, cancel</h2>
            </div>
            <span className="badge ok">Domain-backed</span>
          </div>
          <p>The schedule domain now exposes create and update paths with actor checks, audit records, and provider-safe notification drafts.</p>
          <p className="muted">This screen exercises update/cancel. New event creation uses the same conflict and permission service before adding an event.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Conflict detection</span>
              <h2>Schedule conflicts</h2>
            </div>
            <span className={`badge ${scheduleConflicts.length ? "danger" : "ok"}`}>{scheduleConflicts.length} conflict(s)</span>
          </div>
          {scheduleConflicts.map((conflict) => (
            <p key={conflict.event.id}>
              <strong>{conflict.event.title}</strong><br />
              <span className="muted">{conflict.reasons.join(", ")} · {formatDate(conflict.event.startsAt)} · {conflict.event.locationName}</span>
            </p>
          ))}
          {!scheduleConflicts.length ? <p className="muted">No team or venue overlap found for the selected event window.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Venue records</span>
              <h2>Known locations</h2>
            </div>
            <span className="badge">{venueRecords.length} venue(s)</span>
          </div>
          {venueRecords.map((venue) => (
            <p key={`${venue.name}-${venue.address}`}>
              <strong>{venue.name}</strong><br />
              <span className="muted">{venue.address} · {venue.eventCount} event(s) · {venue.teamNames.join(", ")}</span>
            </p>
          ))}
          {persistedVenueRecords.map((venue) => (
            <p key={venue.id}>
              <strong>{venue.name}</strong><br />
              <span className="muted">{venue.address} · {venue.status} · {venue.mapUrl ? "fallback link ready" : "fallback link pending"}</span>
              {venue.mapUrl ? <><br /><a href={venue.mapUrl}>Open map fallback</a></> : null}
            </p>
          ))}
          {!venueRecords.length && !persistedVenueRecords.length ? <p className="muted">No venue records are available yet.</p> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Recurring events</span>
              <h2>Weekly preview</h2>
            </div>
            <span className="badge warning">Preview</span>
          </div>
          {recurringPreview.map((repeat) => (
            <p key={repeat.id}><strong>{repeat.title}</strong><br /><span className="muted">{formatDate(repeat.startsAt)} · {repeat.locationName}</span></p>
          ))}
          {!recurringPreview.length ? <p className="muted">Select an event to preview recurrence.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Calendar export</span>
              <h2>ICS feed preview</h2>
            </div>
            <span className="badge ok">{eventTeam?.name ?? "Team"}</span>
          </div>
          <pre>{calendarExport.split("\n").slice(0, 8).join("\n")}</pre>
          {calendarExportHref ? <a href={calendarExportHref}>Download persisted calendar</a> : null}
          <p className="muted">{calendarExportHref ? "Calendar download is available for this approved team." : "Calendar export preview only. A team download is not available yet."}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">RSVP sync</span>
              <h2>Schedule attendance counts</h2>
            </div>
            <span className="badge">{rsvpSyncRows.length} event(s)</span>
          </div>
          {rsvpSyncRows.map((row) => (
            <p key={row.event.id}>
              <strong>{row.event.title}</strong><br />
              <span className="muted">Going {row.going}, maybe {row.maybe}, not going {row.notGoing}, cancelled {row.cancelled}, no response {row.noResponse}</span>
            </p>
          ))}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Impact preview</h2>
          <p>{impactPreview.message}</p>
          <p><strong>Affected families:</strong> {impactPreview.affectedFamilies}</p>
          <p><strong>Already RSVP&apos;d:</strong> {impactPreview.rsvpdPlayers} player response(s)</p>
          <p><strong>No response:</strong> {impactPreview.noResponsePlayers} player(s)</p>
          <p><strong>Alerts:</strong> {impactPreview.notificationCount} draft record(s) across {impactPreview.channels.join(", ") || "no channels"}</p>
          {impactPreview.rsvps.slice(0, 4).map((rsvp) => (
            <p className="muted" key={rsvp.id}>{rsvp.player?.firstName ?? "Player"} {rsvp.player?.lastInitial ?? ""}. · {rsvp.parentUser?.name ?? "Parent"} · {rsvp.response.replace("_", " ")}</p>
          ))}
          <p className="notice">Preview only. Saving queues local notification records; provider blast messages are not sent.</p>
        </article>

        <article className="card stack">
          <h2>Queued notifications</h2>
          {scheduleState.notifications.filter((notification) => notification.eventId).slice(0, 8).map((notification) => (
            <div key={notification.id}>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
              <p className="muted">{notification.channel} · {notification.status}</p>
            </div>
          ))}
          {!scheduleState.notifications.some((notification) => notification.eventId) ? <p className="muted">No schedule notifications queued yet.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Schedule notification workflow</span>
              <h2>Review before delivery</h2>
            </div>
            <span className="badge warning">{scheduleWorkflow.total} draft(s)</span>
          </div>
          <p>{scheduleWorkflow.boundary}</p>
          <p className="muted">Pending {scheduleWorkflow.statusCounts.pending}, sent {scheduleWorkflow.statusCounts.sent}, failed {scheduleWorkflow.statusCounts.failed}, read {scheduleWorkflow.statusCounts.read}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Event status tracking</span>
              <h2>Schedule state</h2>
            </div>
            <span className="badge ok">{eventStatusTracking.scheduled} scheduled</span>
          </div>
          <p>Scheduled {eventStatusTracking.scheduled}, cancelled {eventStatusTracking.cancelled}, completed {eventStatusTracking.completed}</p>
          <p className="muted">Status changes feed the impact preview before any parent-facing notification records are queued.</p>
        </article>
      </section>

      <section className="grid three">
        {channelReadiness.map((channel) => (
          <article className="card stack" key={channel.channel}>
            <div className="card-header">
              <h2>{channel.label}</h2>
              <span className={`badge ${channel.status}`}>{channel.status}</span>
            </div>
            <p className="muted">{channel.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">VAPID send adapter</span>
              <h2>Web push delivery gate</h2>
            </div>
            <span className={`badge ${vapidStatus.configured ? "ok" : "warning"}`}>{vapidStatus.status}</span>
          </div>
          <p className="muted">{vapidStatus.detail}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Recipient preference enforcement</span>
              <h2>Preference gate</h2>
            </div>
            <span className={`badge ${preferenceAllowed ? "ok" : "warning"}`}>{preferenceAllowed ? "Allowed" : "Suppressed"}</span>
          </div>
          <p className="muted">Schedule notifications must pass channel, type, team, quiet-hours, and unsubscribe preferences before delivery review.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Unsubscribe flow</span>
              <h2>Opt-out path</h2>
            </div>
            <span className="badge warning">Preference record</span>
          </div>
          <p>Unsubscribes create or update disabled notification preference records for the exact user, channel, and notification type.</p>
          <p className="muted">No global account deletion or provider call is implied by an unsubscribe.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Retry logs</span>
              <h2>Failed delivery review</h2>
            </div>
            <span className="badge">{retryLogs.length} retry log(s)</span>
          </div>
          {retryLogs.map((log) => (
            <p key={log.notification.id}>
              <strong>{log.notification.title}</strong><br />
              <span className="muted">{log.notification.channel} · next review {formatDate(log.nextRetryAt)} · {log.reason}</span>
            </p>
          ))}
          {!retryLogs.length ? <p className="muted">No failed notification records need retry review.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Device management</span>
              <h2>Push device records</h2>
            </div>
            <span className="badge">{deviceSummary.registeredUsers} user(s)</span>
          </div>
          <p className="muted">{deviceSummary.detail}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Email fallback</span>
              <h2>Fallback recipients</h2>
            </div>
            <span className="badge ok">{emailFallback.reachableCount} reachable</span>
          </div>
          <p className="muted">{emailFallback.detail}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">SMS urgency rules</span>
              <h2>Urgent-only SMS</h2>
            </div>
            <span className={`badge ${smsUrgentAllowed ? "ok" : "warning"}`}>{smsUrgentAllowed ? "Allowed" : "Blocked"}</span>
          </div>
          <p className="muted">SMS delivery is reserved for urgent cancellation or weather cases after consent and provider approval.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Alert open rate tracking</span>
              <h2>Read telemetry</h2>
            </div>
            <span className="badge">{openRate.openRate}% open</span>
          </div>
          <p className="muted">{openRate.opened} read out of {openRate.deliveredOrOpened} sent/read notification record(s).</p>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <h2>Coach confidence checklist</h2>
          <p>Review impacted families, RSVP state, alert channels, and no-response count before queueing changes.</p>
          <p className="muted">This prevents accidental blast records and makes schedule edits auditable before production delivery exists.</p>
        </article>
      </section>
      </> : null}
    </div>
  );
}

export function ParentReplayClient({
  dashboardData,
  drillVideoData,
  practiceRunReceipts = [],
  aiProviderReadiness = {
    configured: false,
    delivery: "direct_openai",
    provider: "openai",
    model: "Environment selected",
    reason: "AI provider readiness is shown on the signed-in coach practice recap surface."
  }
}: {
  dashboardData?: ParentCoachDashboardData | null;
  drillVideoData?: DrillVideoLibraryData | null;
  practiceRunReceipts?: PracticeRunReceipt[];
  aiProviderReadiness?: AiCoachProviderReadiness;
} = {}) {
  const { state, dispatch } = useAppState();
  const sourceState = dashboardData?.accessStatus === "live" ? dashboardData.state : state;
  const drillTeams = drillVideoData?.teams.length ? drillVideoData.teams : sourceState.teams;
  const drillEvents = drillVideoData?.events ?? sourceState.events.filter((event) => event.eventType === "practice");
  const initialDrillVideos = drillVideoData?.drillVideos ?? [];
  const initialDrillAssignments = drillVideoData?.assignments ?? [];
  const initialTeamId = sourceState.teams[0]?.id ?? "team-tigers";
  const initialCoachUserId = dashboardData?.accessStatus === "live"
    ? dashboardData.coachUserId || sourceState.users[0]?.id || "user-coach-taylor"
    : "user-coach-taylor";
  const [teamId, setTeamId] = useState(initialTeamId);
  const [coachUserId, setCoachUserId] = useState(initialCoachUserId);
  const [focusAreas, setFocusAreas] = useState<PracticeFocusArea[]>(["catching", "throwing", "teamwork"]);
  const [rookieAgeBand, setRookieAgeBand] = useState<RookieCoachAgeBand>("3-4");
  const [rookieSport, setRookieSport] = useState("baseball");
  const [rookieExperienceLevel, setRookieExperienceLevel] = useState<RookieCoachExperienceLevel>("first_time");
  const [rookieChallenge, setRookieChallenge] = useState<RookieCoachChallenge>("listening");
  const [rookieMotivationStrategy, setRookieMotivationStrategy] = useState<RookieCoachMotivationStrategy>("mission_game");
  const [rookiePracticePersonality, setRookiePracticePersonality] = useState<RookieCoachPracticePersonality>("wild_today");
  const [rookieFocusAreasText, setRookieFocusAreasText] = useState("listening, teamwork, confidence with the ball");
  const [sidelineResetVisible, setSidelineResetVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [savedReplays, setSavedReplays] = useState<ParentReplayRecord[]>([]);
  const [activeReplayId, setActiveReplayId] = useState("");
  const [replayCheckpoint, setReplayCheckpoint] = useState<"draft" | "approved" | "published">("draft");
  const [selectedPracticeRunId, setSelectedPracticeRunId] = useState(
    practiceRunReceipts.find((receipt) => receipt.completedAt && !receipt.parentReplayId)?.id ?? ""
  );
  const [linkedPracticeRunId, setLinkedPracticeRunId] = useState("");
  const [drillVideoUrl, setDrillVideoUrl] = useState("");
  const [drillVideoSport, setDrillVideoSport] = useState("baseball");
  const [drillVideoSkillCategory, setDrillVideoSkillCategory] = useState("throwing");
  const [drillVideoAgeBand, setDrillVideoAgeBand] = useState("6U");
  const [drillVideoDifficulty, setDrillVideoDifficulty] = useState<DrillVideoDifficulty>("beginner");
  const [drillVideoCoachInstructions, setDrillVideoCoachInstructions] = useState("");
  const [drillVideoSafetyNotes, setDrillVideoSafetyNotes] = useState("");
  const [drillVideos, setDrillVideos] = useState<DrillVideo[]>(initialDrillVideos);
  const [drillAssignments, setDrillAssignments] = useState<DrillVideoAssignment[]>(initialDrillAssignments);
  const [drillVideoMessage, setDrillVideoMessage] = useState(
    drillVideoData?.isSupabaseBacked
      ? "Approved drill video references are current."
      : "Drill video preview is shown until the approved library is available."
  );
  const [selectedDrillVideoId, setSelectedDrillVideoId] = useState(initialDrillVideos.find((video) => video.approvalStatus === "approved")?.id ?? "");
  const [selectedDrillEventId, setSelectedDrillEventId] = useState("");
  const [aiProviderMessage, setAiProviderMessage] = useState("");
  const [aiProviderDrafts, setAiProviderDrafts] = useState<Record<string, AiCoachWorkspaceDraft>>({});
  const [aiTrustEvidence, setAiTrustEvidence] = useState<{
    includedSources: string[];
    excludedSources: string[];
    generatedAt?: string;
    model: string;
    humanReviewRequired: true;
    runId?: string;
  } | null>(null);
  const [isReplayPending, startReplayTransition] = useTransition();
  const [isDrillVideoPending, startDrillVideoTransition] = useTransition();
  const [isAiProviderPending, startAiProviderTransition] = useTransition();
  const selectedTeam = sourceState.teams.find((team) => team.id === teamId);
  const approvedDrillVideos = drillVideos.filter((video) => video.approvalStatus === "approved");
  const selectedDrillVideo = approvedDrillVideos.find((video) => video.id === selectedDrillVideoId) ?? approvedDrillVideos[0];
  const teamDrillAssignments = drillAssignments.filter((assignment) => assignment.teamId === teamId);
  const teamPracticeEvents = drillEvents.filter((event) => event.teamId === teamId);
  const completedPracticeRuns = practiceRunReceipts.filter((receipt) => (
    receipt.teamId === teamId &&
    receipt.completedAt &&
    !receipt.parentReplayId &&
    receipt.id !== linkedPracticeRunId
  ));
  const accessGate = privateAccessGate(dashboardData, "coach");
  const draft = useMemo(() => {
    const previewFocusAreas: PracticeFocusArea[] = focusAreas.length ? focusAreas : ["teamwork"];
    return generateParentReplayDraft(sourceState, {
      teamId,
      coachUserId,
      focusAreas: previewFocusAreas,
      now: NOW
    });
  }, [coachUserId, focusAreas, sourceState, teamId]);
  const promptEvalHarness = getPromptEvalHarness();
  const coachWorkspaceDrafts = useMemo(() => buildAiCoachWorkspaceDrafts(sourceState, {
    teamId,
    coachUserId,
    focusAreas,
    now: NOW
  }), [coachUserId, focusAreas, sourceState, teamId]);
  const visibleCoachWorkspaceDrafts = useMemo(() => (
    coachWorkspaceDrafts.map((workspaceDraft) => aiProviderDrafts[workspaceDraft.id] ?? workspaceDraft)
  ), [aiProviderDrafts, coachWorkspaceDrafts]);
  const rookieAssistFocusAreas = useMemo(() => (
    rookieFocusAreasText.split(",").map((area) => area.trim()).filter(Boolean)
  ), [rookieFocusAreasText]);
  const rookieAssist = useMemo(() => generateRookieCoachAssist({
    ageBand: rookieAgeBand,
    sport: rookieSport,
    experienceLevel: rookieExperienceLevel,
    challenge: rookieChallenge,
    motivationStrategy: rookieMotivationStrategy,
    practicePersonality: rookiePracticePersonality,
    focusAreas: rookieAssistFocusAreas
  }), [
    rookieAgeBand,
    rookieAssistFocusAreas,
    rookieChallenge,
    rookieExperienceLevel,
    rookieMotivationStrategy,
    rookiePracticePersonality,
    rookieSport
  ]);
  const teamReplays = [...savedReplays, ...sourceState.parentReplays].filter((replay) => replay.teamId === teamId);
  const latestReplayStatus = teamReplays[0]?.status ?? "draft";
  const selectedFocus = new Set(focusAreas);
  const canQueueReplay = focusAreas.length >= 2 && focusAreas.length <= 3;

  function toggleFocus(area: PracticeFocusArea) {
    setFocusAreas((current) => (
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area]
    ));
  }

  function applyRookieAssistSeed() {
    setFocusAreas(rookieAssist.parentReplaySeed.focusAreas);
    setMessage("Rookie Coach Assist seed applied locally. Review the Parent Replay preview before queueing.");
  }

  function showSidelineReset() {
    setSidelineResetVisible(true);
    setMessage("Chaos Button loaded a 90-second reset locally. Coach still chooses whether to use or share it.");
  }

  function submitDrillVideo() {
    setDrillVideoMessage("");
    startDrillVideoTransition(async () => {
      const response = await authenticatedJsonFetch("/api/coach/drill-videos", {
        teamId,
        provider: "youtube",
        url: drillVideoUrl,
        sport: drillVideoSport,
        skillCategory: drillVideoSkillCategory,
        ageBand: drillVideoAgeBand,
        difficulty: drillVideoDifficulty,
        coachInstructions: drillVideoCoachInstructions || undefined,
        safetyNotes: drillVideoSafetyNotes || undefined
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        drillVideo?: DrillVideo;
      } | null;

      if (result?.ok && result.drillVideo) {
        setDrillVideos((current) => current.some((video) => video.id === result.drillVideo!.id)
          ? current.map((video) => video.id === result.drillVideo!.id ? result.drillVideo! : video)
          : [result.drillVideo!, ...current]);
        setDrillVideoUrl("");
      }

      setDrillVideoMessage(result?.message ?? "Drill video reference could not be submitted.");
    });
  }

  function assignDrillVideo() {
    if (!selectedDrillVideo) {
      setDrillVideoMessage("Choose an approved drill video before assigning it.");
      return;
    }

    setDrillVideoMessage("");
    startDrillVideoTransition(async () => {
      const response = await authenticatedJsonFetch("/api/coach/drill-video-assignments", {
        drillVideoId: selectedDrillVideo.id,
        teamId,
        eventId: selectedDrillEventId || undefined,
        usageContext: "practice_plan",
        notes: "Coach planning assignment only; family-facing embeds remain disabled."
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        assignment?: DrillVideoAssignment;
      } | null;

      if (result?.ok && result.assignment) {
        setDrillAssignments((current) => current.some((assignment) => assignment.id === result.assignment!.id)
          ? current.map((assignment) => assignment.id === result.assignment!.id ? result.assignment! : assignment)
          : [result.assignment!, ...current]);
      }

      setDrillVideoMessage(result?.message ?? "Drill video assignment could not be saved.");
    });
  }

  function queueParentReplay() {
    setMessage("");
    startReplayTransition(async () => {
      const response = await authenticatedJsonFetch("/api/coach/parent-replay", {
        teamId,
        coachUserId,
        focusAreas,
        draft,
        practiceRunId: selectedPracticeRunId || undefined
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        parentReplay?: ParentReplayRecord;
      } | null;

      if (result?.ok && result.parentReplay) {
        setSavedReplays((current) => [result.parentReplay!, ...current]);
        setActiveReplayId(result.parentReplay.id);
        setReplayCheckpoint("draft");
        if (selectedPracticeRunId) setLinkedPracticeRunId(selectedPracticeRunId);
      } else if (response.status === 401) {
        const input = { teamId, coachUserId, focusAreas, now: new Date().toISOString() };
        dispatch({ type: "createParentReplay", input });
      }

      setMessage(result?.message ?? (
        response.status === 401
          ? `Parent Replay queued locally for ${selectedTeam?.name ?? "team"}. Sign in as an assigned coach to publish it to families.`
          : "Parent Replay could not be queued."
      ));
    });
  }

  function confirmAndPublishParentReplay() {
    if (!activeReplayId) {
      setMessage("Save a Parent Replay draft before confirming publication.");
      return;
    }
    setMessage("");
    startReplayTransition(async () => {
      if (replayCheckpoint === "draft") {
        const approvalResponse = await authenticatedJsonFetch("/api/coach/parent-replay/approve", { parentReplayId: activeReplayId });
        const approvalResult = await approvalResponse.json().catch(() => null) as { ok?: boolean; message?: string } | null;
        if (!approvalResult?.ok) {
          setMessage(approvalResult?.message ?? "Parent Replay approval could not be completed.");
          return;
        }
        setReplayCheckpoint("approved");
      }
      const publishResponse = await authenticatedJsonFetch("/api/coach/parent-replay/publish", { parentReplayId: activeReplayId });
      const publishResult = await publishResponse.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      setMessage(publishResult?.message ?? "Parent Replay publication could not be completed.");
      if (publishResult?.ok) setReplayCheckpoint("published");
    });
  }

  function requestAiProviderDraft(workspaceDraft: AiCoachWorkspaceDraft) {
    setAiProviderMessage("");
    startAiProviderTransition(async () => {
      const response = await authenticatedJsonFetch("/api/coach/ai-workspace", {
        teamId,
        draft: workspaceDraft
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        draft?: AiCoachWorkspaceDraft;
        source?: "openai" | "deterministic";
        trust?: {
          includedSources: string[];
          excludedSources: string[];
          generatedAt?: string;
          model: string;
          humanReviewRequired: true;
        };
        generationRun?: { id?: string };
      } | null;

      if (result?.ok && result.draft) {
        setAiProviderDrafts((current) => ({
          ...current,
          [workspaceDraft.id]: result.draft!
        }));
        if (result.trust) {
          setAiTrustEvidence({
            ...result.trust,
            runId: result.generationRun?.id
          });
        }
      }

      setAiProviderMessage(result?.message ?? (
        response.status === 401
          ? "Sign in as an assigned coach or org admin before requesting AI provider drafting."
          : "AI provider draft could not be created."
      ));
    });
  }

  if (accessGate) {
    return (
      <div className="page parent-replay-page">
        <section className="hero parent-replay-hero">
          <span className="eyebrow">Signature feature</span>
          <h1>Parent Replay turns every practice into help parents can use tonight.</h1>
          <p className="lead">
            Coaches choose the practice focus, review the family preview, and approve the recap before families can see it.
          </p>
        </section>
        {accessGate}
      </div>
    );
  }

  return (
    <div className="page parent-replay-page">
      <section className="hero parent-replay-hero">
        <span className="eyebrow">Signature feature</span>
        <h1>Parent Replay turns every practice into help parents can use tonight.</h1>
        <p className="lead">
          Choose the practice focus, review the family preview, and save a draft for approval before families can see it.
        </p>
      </section>

      <section className="certainty-band certainty-band-replay" aria-label="Parent Replay status">
        <span className="certainty-band-icon" aria-hidden="true">!</span>
        <span>
          <strong>{latestReplayStatus === "draft" ? "Draft awaiting approval" : `Replay status: ${latestReplayStatus.replaceAll("_", " ")}`}</strong>
          <small>External messages are not connected here. Saving a draft does not publish or send it.</small>
        </span>
        <span className="season-status state-needs_attention">Coach review</span>
      </section>

      {message ? <p className="notice">{message}</p> : null}
      {dashboardData ? (
        <p className={`notice ${dashboardData.isSupabaseBacked ? "ok" : "warning"}`}>
          {dashboardData.isSupabaseBacked
            ? "Team and coach access are current for this replay."
            : "Preview details are shown here. Sign in with an approved coach assignment to save a draft."}
        </p>
      ) : null}
      <CompactDisclosure
        title="Drill video library"
        summary="Submit references and assign approved videos to coach planning."
        badge="Coach tools"
        className="parent-replay-advanced"
      >
      <section className="grid two">
        <article className="card stack drill-video-library">
          <div className="card-header">
            <div>
              <span className="eyebrow">Coach drill videos</span>
              <h2>Submit a YouTube drill reference</h2>
            </div>
            <span className={`badge ${drillVideoData?.providerConfigured ? "ok" : "warning"}`}>Metadata {drillVideoData?.providerConfigured ? "ready" : "missing"}</span>
          </div>
          <p className="notice">{drillVideoMessage}</p>
          <div className="grid two">
            <label>
              Team
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                {drillTeams.map((team) => <option key={team.id} value={team.id}>{team.name} - {team.division}</option>)}
              </select>
            </label>
            <label>
              YouTube URL
              <input value={drillVideoUrl} onChange={(event) => setDrillVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </label>
            <label>
              Sport
              <input value={drillVideoSport} onChange={(event) => setDrillVideoSport(event.target.value)} />
            </label>
            <label>
              Skill
              <input value={drillVideoSkillCategory} onChange={(event) => setDrillVideoSkillCategory(event.target.value)} />
            </label>
            <label>
              Age band
              <input value={drillVideoAgeBand} onChange={(event) => setDrillVideoAgeBand(event.target.value)} />
            </label>
            <label>
              Difficulty
              <select value={drillVideoDifficulty} onChange={(event) => setDrillVideoDifficulty(event.target.value as DrillVideoDifficulty)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <label>
            Coach instructions
            <textarea value={drillVideoCoachInstructions} onChange={(event) => setDrillVideoCoachInstructions(event.target.value)} />
          </label>
          <label>
            Safety notes
            <textarea value={drillVideoSafetyNotes} onChange={(event) => setDrillVideoSafetyNotes(event.target.value)} />
          </label>
          <button type="button" disabled={isDrillVideoPending || !drillVideoUrl.trim()} onClick={submitDrillVideo}>Submit for admin review</button>
          <p className="muted">The app stores metadata and IDs only. YouTube content remains embedded from the official player after admin approval.</p>
        </article>

        <article className="card stack drill-video-library">
          <div className="card-header">
            <div>
              <span className="eyebrow">Approved club library</span>
              <h2>Assign to practice planning</h2>
            </div>
            <span className="badge">{approvedDrillVideos.length} approved</span>
          </div>
          <div className="grid two">
            <label>
              Drill video
              <select value={selectedDrillVideo?.id ?? ""} onChange={(event) => setSelectedDrillVideoId(event.target.value)}>
                {approvedDrillVideos.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}
              </select>
            </label>
            <label>
              Practice
              <select value={selectedDrillEventId} onChange={(event) => setSelectedDrillEventId(event.target.value)}>
                <option value="">Team planning only</option>
                {teamPracticeEvents.map((event) => <option key={event.id} value={event.id}>{event.title} - {formatDate(event.startsAt)}</option>)}
              </select>
            </label>
          </div>
          <button type="button" disabled={isDrillVideoPending || !selectedDrillVideo} onClick={assignDrillVideo}>Assign drill video</button>
          {selectedDrillVideo ? (
            <div className="drill-video-embed">
              <iframe
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                src={youtubePrivacyEmbedUrl(selectedDrillVideo.externalVideoId)}
                title={`${selectedDrillVideo.title} drill video`}
              />
              <p className="muted">{selectedDrillVideo.sourceChannel ?? "YouTube"} - {selectedDrillVideo.skillCategory} - Made for Kids {selectedDrillVideo.madeForKidsStatus === undefined ? "unknown" : selectedDrillVideo.madeForKidsStatus ? "yes" : "no"}</p>
            </div>
          ) : <p className="muted">No approved drill videos are available yet.</p>}
          <div className="stack compact">
            <h3>Coach-only assignments</h3>
            {teamDrillAssignments.map((assignment) => {
              const video = drillVideos.find((item) => item.id === assignment.drillVideoId);
              const event = drillEvents.find((item) => item.id === assignment.eventId);
              return (
                <p key={assignment.id}>
                  <strong>{video?.title ?? "Drill video"}</strong><br />
                  <span className="muted">{event?.title ?? "Team planning"} - family visible {assignment.visibleToFamilies ? "yes" : "no"}</span>
                </p>
              );
            })}
            {teamDrillAssignments.length === 0 ? <p className="muted">No drill videos are assigned to this team yet.</p> : null}
          </div>
        </article>
      </section>
      </CompactDisclosure>

      <CompactDisclosure
        title="Rookie Coach Assist"
        summary="Open age-safe practice help and the local sideline reset."
        badge="Local preview"
        className="parent-replay-advanced"
      >
      <section className="grid one">
        <article className="card stack rookie-coach-assist">
          <div className="card-header">
            <div>
              <span className="eyebrow">Rookie Coach Assist</span>
              <h2>Age-safe practice help for new volunteer coaches</h2>
            </div>
            <span className="badge warning">Local preview only</span>
          </div>
          <p className="muted">
            Deterministic guidance for coaches who are new to a sport, new to coaching, or coaching ages 3-6. It creates a reviewed Parent Replay seed only; it does not publish or send.
          </p>

          <div className="grid three rookie-assist-form">
            <label>
              Age band
              <select value={rookieAgeBand} onChange={(event) => setRookieAgeBand(event.target.value as RookieCoachAgeBand)}>
                {rookieCoachAgeBandOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Sport
              <input value={rookieSport} onChange={(event) => setRookieSport(event.target.value)} />
            </label>
            <label>
              Coach experience
              <select value={rookieExperienceLevel} onChange={(event) => setRookieExperienceLevel(event.target.value as RookieCoachExperienceLevel)}>
                {rookieCoachExperienceOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Challenge
              <select value={rookieChallenge} onChange={(event) => setRookieChallenge(event.target.value as RookieCoachChallenge)}>
                {rookieCoachChallengeOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Motivation strategy
              <select value={rookieMotivationStrategy} onChange={(event) => setRookieMotivationStrategy(event.target.value as RookieCoachMotivationStrategy)}>
                {rookieCoachMotivationStrategyOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Team energy
              <select value={rookiePracticePersonality} onChange={(event) => setRookiePracticePersonality(event.target.value as RookieCoachPracticePersonality)}>
                {rookieCoachPracticePersonalityOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Focus areas
              <textarea value={rookieFocusAreasText} onChange={(event) => setRookieFocusAreasText(event.target.value)} />
            </label>
          </div>

          <div className="notice stack">
            <div className="card-header">
              <div>
                <strong>Chaos Button</strong>
                <p className="muted">Live sideline reset for when kids are losing focus.</p>
              </div>
              <button type="button" onClick={showSidelineReset}>Give me a 90-second reset</button>
            </div>
            {sidelineResetVisible ? (
              <div className="grid three">
                <p><strong>Call-and-response:</strong> {rookieAssist.chaosReset.callAndResponse}</p>
                <p><strong>Movement reset:</strong> {rookieAssist.chaosReset.movementReset}</p>
                <p><strong>Water break:</strong> {rookieAssist.chaosReset.waterBreak}</p>
                <p><strong>Quick game:</strong> {rookieAssist.chaosReset.quickGame}</p>
                <p><strong>Regroup phrase:</strong> {rookieAssist.chaosReset.regroupPhrase}</p>
              </div>
            ) : <p className="muted">Press the button to reveal coach-reviewed reset copy. Nothing is sent or saved.</p>}
          </div>

          <div className="grid two rookie-assist-preview">
            <div className="stack">
              <span className="badge ok">Practice plan</span>
              <h3>{rookieAssist.practiceTitle}</h3>
              <p><strong>Coach objective:</strong> {rookieAssist.coachObjective}</p>
              <div className="notice">
                <strong>Practice Personality Engine: {rookieAssist.personalityAdjustment.label}</strong>
                <p>{rookieAssist.personalityAdjustment.drillChange}</p>
                <p className="muted">{rookieAssist.personalityAdjustment.tempo}</p>
              </div>
              <div className="grid three replay-activities">
                {rookieAssist.practiceBlocks.map((block) => (
                  <div className="replay-activity" key={block.title}>
                    <span className="badge">{block.duration}</span>
                    <h3>{block.title}</h3>
                    <p>{block.activity}</p>
                    <p className="muted">{block.coachCue}</p>
                  </div>
                ))}
              </div>
              <p><strong>Attention reset:</strong> {rookieAssist.attentionReset}</p>
              <p><strong>Age-specific explanation:</strong> {rookieAssist.ageSpecificExplanation}</p>
              <p><strong>Incentive strategy:</strong> {rookieAssist.incentiveStrategy}</p>
            </div>

            <div className="stack">
              <span className="badge">Coach script</span>
              <pre className="draft-preview rookie-assist-script">{rookieAssist.exactCoachScript}</pre>
              <div className="notice">
                <strong>Coach Voice Coach</strong>
                <p><span className="muted">Instead of:</span> {rookieAssist.voiceCoach.insteadOf}</p>
                <p><span className="muted">Say:</span> {rookieAssist.voiceCoach.say}</p>
                <p className="muted">{rookieAssist.voiceCoach.why}</p>
              </div>
              <div className="grid two">
                <div className="notice">
                  <strong>Do-say phrases</strong>
                  <ul className="list compact">
                    {rookieAssist.doSayPhrases.map((phrase) => <li key={phrase}>{phrase}</li>)}
                  </ul>
                </div>
                <div className="notice">
                  <strong>Avoid-saying phrases</strong>
                  <ul className="list compact">
                    {rookieAssist.avoidSayingPhrases.map((phrase) => <li key={phrase}>{phrase}</li>)}
                  </ul>
                </div>
              </div>
              <p><strong>Parent Replay seed:</strong> {rookieAssist.parentReplaySeed.focusAreas.map(formatFocusArea).join(", ")}</p>
              <p className="muted">{rookieAssist.parentReplaySeed.summary}</p>
              <button type="button" onClick={applyRookieAssistSeed}>Use seed in Parent Replay</button>
            </div>
          </div>

          <div className="grid two">
            <div className="stack">
              <h3>Parent message draft</h3>
              <p>{rookieAssist.parentMessageDraft}</p>
              <div className="notice">
                <strong>Parent Reinforcement Loop</strong>
                <p>{rookieAssist.parentReinforcementLoop.today}</p>
                <p>{rookieAssist.parentReinforcementLoop.atHome}</p>
                <p>{rookieAssist.parentReinforcementLoop.praise}</p>
                <p className="muted">{rookieAssist.parentReinforcementLoop.deliveryBoundary}</p>
              </div>
            </div>
            <div className="stack">
              <h3>Source evidence</h3>
              <p className="muted">{rookieAssist.sourceEvidence.join(", ")}</p>
              <p className="notice">{rookieAssist.safetyBoundary}</p>
            </div>
          </div>
        </article>
      </section>
      </CompactDisclosure>

      <section className="grid two parent-replay-builder">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Replay builder</span>
              <h2>What should families practice at home?</h2>
            </div>
            <span className="badge warning">Draft</span>
          </div>

          <div className="grid two">
            <label>
              Team
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                {sourceState.teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name} - {team.division}</option>
                ))}
              </select>
            </label>
            <label>
              Coach
              <select value={coachUserId} onChange={(event) => setCoachUserId(event.target.value)}>
                {sourceState.users.filter((user) => user.role !== "parent").map((user) => (
                  <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
                ))}
              </select>
            </label>
            <label>
              Completed practice evidence
              <select value={selectedPracticeRunId} onChange={(event) => setSelectedPracticeRunId(event.target.value)}>
                <option value="">Coach-selected focus only</option>
                {completedPracticeRuns.map((receipt) => (
                  <option key={receipt.id} value={receipt.id}>
                    {receipt.plan.title} - {formatDate(receipt.completedAt!)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="replay-checklist" aria-label="Practice focus areas">
            {defaultPracticeFocusAreas.map((area) => (
              <label className="clubhouse-checkbox" key={area}>
                <input
                  type="checkbox"
                  checked={selectedFocus.has(area)}
                  onChange={() => toggleFocus(area)}
                />
                {formatFocusArea(area)}
              </label>
            ))}
          </div>

          <p className="muted">Choose 2-3 focus areas so the family replay stays short enough to use tonight.</p>
          <p className="muted">
            {selectedPracticeRunId
              ? "This draft will cite a completed practice-run receipt and its coach observations."
              : "No practice-run receipt is selected; the draft will cite coach-selected focus only."}
          </p>

          <button
            disabled={!canQueueReplay || isReplayPending}
            onClick={queueParentReplay}
          >
            Save draft for approval
          </button>
          {!canQueueReplay ? <p className="muted">Select exactly 2 or 3 practice focus areas before saving.</p> : null}
        </article>

        <article className="card stack parent-replay-preview">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family preview</span>
              <h2>{draft.title}</h2>
            </div>
            <span className="badge ok">Preview ready</span>
          </div>
          <p>{draft.summary}</p>
          <div className="grid three replay-activities">
            {draft.homeActivities.map((activity) => (
              <div className="replay-activity" key={activity.duration}>
                <span className="badge">{formatReplayDuration(activity.duration)}</span>
                <h3>{activity.title}</h3>
                {activity.coachCue ? <p><strong>Coach cue:</strong> {activity.coachCue}</p> : null}
                {activity.parentGoal ? <p className="muted">{activity.parentGoal}</p> : null}
                <ul className="list compact">
                  {activity.steps.map((step) => <li key={step}>{step}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="replay-approval-checkpoint" aria-label="Parent Replay approval checkpoint">
        <div>
          <span className="certainty-band-icon" aria-hidden="true">!</span>
          <span>
            <strong>Approval is required before publish</strong>
            <small>Review the family wording, activities, parent tip, skill cards, and team quest first.</small>
          </span>
        </div>
        <ol>
          <li data-state="complete">Preview</li>
          <li data-state={replayCheckpoint === "draft" ? "current" : "complete"}>Edit and save draft</li>
          <li data-state={replayCheckpoint === "published" ? "complete" : "current"}>Confirm and publish</li>
        </ol>
        <div className="toolbar">
          <button
            type="button"
            disabled={!activeReplayId || isReplayPending || replayCheckpoint === "published"}
            onClick={confirmAndPublishParentReplay}
          >
            {isReplayPending ? "Confirming..." : "Confirm and publish"}
          </button>
        </div>
        <p>Publishing creates in-app notification drafts only. External delivery still requires separate approval and provider evidence.</p>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Translation engine</span>
          <h2>Coach words parents can use</h2>
          {draft.parentTranslations.map((translation) => (
            <p key={translation.coachTerm}>
              <strong>{translation.coachTerm}</strong>
              <br />
              <span className="muted">{translation.parentInstruction}</span>
            </p>
          ))}
        </article>
        <article className="card stack">
          <span className="badge">Healthy streak</span>
          <h2>{draft.microCoachingStreak.label}</h2>
          <p><strong>{draft.microCoachingStreak.completionRate}%</strong> aggregate family completion</p>
          <p className="muted">{draft.microCoachingStreak.completedFamilies} of {draft.microCoachingStreak.totalFamilies} linked families. Coaches see team-level engagement only, not a parent leaderboard.</p>
        </article>
        <article className="card stack">
          <span className="badge warning">Memory timeline</span>
          <h2>{draft.memoryMoment.title}</h2>
          <p>{draft.memoryMoment.detail}</p>
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Coach video</span>
          <h2>{draft.coachVideo.title}</h2>
          <p>{draft.coachVideo.note}</p>
          <a href={draft.coachVideo.url}>Open demo video</a>
        </article>
        <article className="card stack">
          <span className="badge warning">Parent tip</span>
          <h2>Tonight&apos;s coaching cue</h2>
          <p>{draft.parentTip}</p>
          <p className="muted">{draft.parentEducation}</p>
        </article>
        <article className="card stack">
          <span className="badge">Team quest</span>
          <h2>Quest before next practice</h2>
          <p>{draft.teamQuest}</p>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">AI Coach Workspace</span>
              <h2>Coach-reviewed family drafts</h2>
            </div>
            <span className="badge warning">Preview - Edit - Approve - Publish</span>
          </div>
          <p className="muted">These drafts start as deterministic workspace previews. Signed-in coaches and admins can request an AI provider rewrite only when the server-side provider gate is configured; nothing publishes or sends without review.</p>
          <AiCoachWorkspacePanel
            teamId={teamId}
            drafts={visibleCoachWorkspaceDrafts}
            providerReadiness={aiProviderReadiness}
            providerMessage={aiProviderMessage}
            trustEvidence={aiTrustEvidence}
            onRequestRewrite={requestAiProviderDraft}
            isRewritePending={isAiProviderPending}
          />
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Prompt/Eval harness</span>
              <h2>Replay quality checks</h2>
            </div>
            <span className="badge ok">{promptEvalHarness.status}</span>
          </div>
          {promptEvalHarness.checks.map((check) => <p className="muted" key={check}>{check}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h2>Skill cards</h2>
          {draft.skillCards.map((card) => (
            <p className="notice" key={card}>{card}</p>
          ))}
        </article>
        <article className="card stack">
          <h2>Queued replay history</h2>
          {teamReplays.length ? teamReplays.map((replay) => (
            <div key={replay.id}>
              <strong>{replay.title}</strong>
              <p className="muted">{replay.status} - {replay.focusAreas.map(formatFocusArea).join(", ")} - {formatDate(replay.createdAt)}</p>
            </div>
          )) : <p className="muted">No Parent Replay has been queued for this team in this browser session.</p>}
        </article>
      </section>
    </div>
  );
}

export function FeatureTierHubClient() {
  return (
    <section className="feature-tier-hub">
      {platformFeatureTiers.map((tier) => (
        <article className="card stack" key={tier.tier}>
          <div className="card-header">
            <div>
              <span className="eyebrow">{tier.tier}</span>
              <h2>{tier.promise}</h2>
            </div>
          </div>
          <div className="feature-tier-list">
            {tier.features.map((feature) => (
              <div className="feature-tier-item" key={feature.title}>
                <div className="card-header">
                  <h3>{feature.title}</h3>
                  <span className={`badge ${feature.status === "implemented" ? "ok" : feature.status === "planned" ? "warning" : ""}`}>
                    {feature.status === "implemented" ? "Available" : feature.status === "planned" ? "Not connected" : "Preview"}
                  </span>
                </div>
                <p className="muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function createEmptyTeamPortalReplay(team: { id: string; coachUserId?: string }): ParentReplayDraft {
  return {
    teamId: team.id,
    coachUserId: team.coachUserId ?? "supabase-team-coach",
    focusAreas: ["catching", "throwing", "teamwork"],
    title: "Parent Replay pending",
    summary: "No Parent Replay has been published for this team yet.",
    homeActivities: [
      {
        duration: "2_minutes",
        title: "Ask your coach for the next home activity.",
        coachCue: "Practice Replay",
        parentGoal: "Keep the family loop ready until the next coach-approved Replay.",
        steps: ["Check the next Practice Replay after it is published."]
      }
    ],
    parentTranslations: [
      {
        coachTerm: "Practice Replay",
        parentInstruction: "Ask your coach for one simple cue to repeat at home."
      }
    ],
    microCoachingStreak: {
      label: "Team home-practice streak",
      completedFamilies: 0,
      totalFamilies: 0,
      completionRate: 0
    },
    memoryMoment: {
      title: "Replay memory pending",
      detail: "Practice memories will appear after the next coach-approved Replay."
    },
    coachVideo: {
      title: "Coach video library",
      url: "#",
      note: "No coach video has been linked yet."
    },
    parentTip: "Coach tips will appear after the next Practice Replay.",
    teamQuest: "Ask your coach for the next team quest.",
    skillCards: ["Practice cues will appear after the next recap."],
    parentEducation: "Parent education will appear after the next recap.",
    generatedAt: NOW
  };
}

export function TeamPortalClient({ teamPortalData, audience = "shared" }: { teamPortalData?: TeamPortalData | null; audience?: "shared" | "parent" | "coach" | "admin" } = {}) {
  const { state, dispatch } = useAppState();
  const [remoteBrandingOverrides, setRemoteBrandingOverrides] = useState<Record<string, Pick<Team, "mascot" | "primaryColor" | "secondaryColor" | "themeKey">>>({});
  const sourceTeams = teamPortalData?.teams.length ? teamPortalData.teams : state.teams;
  const teams = sourceTeams.map((item) => {
    const override = remoteBrandingOverrides[item.id];
    return override ? { ...item, ...override } : item;
  });
  const playersSource = teamPortalData?.players ?? state.players;
  const guardianLinksSource = teamPortalData?.guardianLinks ?? state.guardianLinks;
  const parentInvitesSource = teamPortalData?.parentInvites ?? state.parentInvites;
  const teamMembershipsSource = teamPortalData?.teamMemberships ?? state.teamMemberships;
  const usersSource = teamPortalData?.users.length ? teamPortalData.users : state.users;
  const eventsSource = teamPortalData?.events ?? state.events;
  const mediaItemsSource = teamPortalData?.mediaItems ?? state.mediaItems;
  const parentReplaysSource = teamPortalData?.parentReplays ?? state.parentReplays;
  const scopedTeamIds = new Set(teams.map((item) => item.id));
  const scopedPlayerIds = new Set(playersSource.map((item) => item.id));
  const scopedEventIds = new Set(eventsSource.map((item) => item.id));
  const portalState = teamPortalData?.teams.length ? {
    ...state,
    teams,
    players: playersSource,
    guardianLinks: guardianLinksSource,
    parentInvites: parentInvitesSource,
    teamMemberships: teamMembershipsSource,
    users: usersSource,
    events: eventsSource,
    mediaItems: mediaItemsSource,
    parentReplays: parentReplaysSource,
    announcements: state.announcements.filter((announcement) => scopedTeamIds.has(announcement.teamId)),
    rsvps: state.rsvps.filter((rsvp) => scopedPlayerIds.has(rsvp.playerId) && scopedEventIds.has(rsvp.eventId)),
    snackScheduleSlots: state.snackScheduleSlots.filter((slot) => scopedTeamIds.has(slot.teamId)),
    volunteerSignups: state.volunteerSignups.filter((signup) => scopedTeamIds.has(signup.teamId)),
    weatherAlerts: state.weatherAlerts.filter((alert) => scopedTeamIds.has(alert.teamId)),
    sponsors: audience === "parent" ? [] : state.sponsors.filter((sponsor) => !sponsor.teamId || scopedTeamIds.has(sponsor.teamId))
  } : state;
  const isSupabaseBacked = Boolean(teamPortalData?.teams.length);
  const [teamId, setTeamId] = useState(() => teamPortalData?.teams[0]?.id ?? "team-tigers");
  const [brandingActorId, setBrandingActorId] = useState("user-coach-taylor");
  const [brandingDrafts, setBrandingDrafts] = useState<Record<string, {
    mascot?: string;
    primaryColor?: string;
    secondaryColor?: string;
    themeKey?: ProgramThemeKey;
  }>>({});
  const [brandingMessage, setBrandingMessage] = useState("");
  const [isBrandingPending, startBrandingTransition] = useTransition();
  const selectedTeamId = teams.some((item) => item.id === teamId) ? teamId : teams[0]?.id ?? state.teams[0]?.id ?? teamId;
  const team = teams.find((item) => item.id === selectedTeamId) ?? teams[0] ?? state.teams[0]!;
  const brandingDraft = brandingDrafts[team.id] ?? {};
  const mascotDraft = brandingDraft.mascot ?? team.mascot;
  const primaryColorDraft = brandingDraft.primaryColor ?? team.primaryColor;
  const secondaryColorDraft = brandingDraft.secondaryColor ?? team.secondaryColor;
  const themeKeyDraft = brandingDraft.themeKey ?? team.themeKey;
  const themePreset = getProgramThemePreset(team.themeKey);
  const brandingActors = usersSource.filter((user) => user.role !== "parent");
  const selectedBrandingActorId = brandingActors.some((user) => user.id === brandingActorId)
    ? brandingActorId
    : brandingActors[0]?.id ?? brandingActorId;
  const brandingCanSave = isSupabaseBacked
    ? usersSource.some((user) => (
      user.id === selectedBrandingActorId &&
      (user.role === "admin" || teamMembershipsSource.some((membership) => (
        membership.teamId === team.id &&
        membership.userId === user.id &&
        membership.role === "coach" &&
        membership.status === "active"
      )))
    ))
    : canUpdateTeamPortalBranding(portalState, brandingActorId, team.id);
  const portalStyle = teamBrandStyle(team.primaryColor, team.secondaryColor);
  const players = playersSource.filter((player) => player.teamId === team.id);
  const playerIds = new Set(players.map((player) => player.id));
  const guardianLinks = guardianLinksSource.filter((guardian) => playerIds.has(guardian.playerId));
  const parentInvites = parentInvitesSource.filter((invite) => invite.teamId === team.id);
  const teamMemberships = teamMembershipsSource.filter((membership) => membership.teamId === team.id);
  const activeParentMemberships = teamMemberships.filter((membership) => membership.role === "parent" && membership.status === "active");
  const teamEvents = eventsSource
    .filter((event) => event.teamId === team.id && event.status === "scheduled")
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const upcomingGame = teamEvents.find((event) => event.eventType === "game");
  const nextPractice = teamEvents.find((event) => event.eventType === "practice");
  const embeddedMap = getEmbeddedMapUi(upcomingGame ?? nextPractice);
  const venueMarkers = getVenueMarkers(teamEvents);
  const mapQuotaStatus = getMapQuotaStatus({ requestsToday: 42, dailyLimit: 100 });
  const fieldLayout = getFieldLayoutMetadata(upcomingGame ?? nextPractice);
  const venuePage = getVenuePage(upcomingGame ?? nextPractice);
  const venueAmenityNotes = getVenueAmenityNotes(upcomingGame ?? nextPractice);
  const arrivalInstructions = getArrivalInstructions(upcomingGame ?? nextPractice);
  const venueIntelligence = getVenueIntelligence(upcomingGame ?? nextPractice);
  const mapFallback = getMapFallbackUx({ quotaStatus: mapQuotaStatus.status, directionsUrl: embeddedMap.directionsUrl });
  const locationChange = highlightLocationChange(upcomingGame?.locationName ?? "Field pending", upcomingGame?.locationName ?? "Field pending");
  const facilityNotes = getFacilityNotes(upcomingGame ?? nextPractice);
  const gameRsvps = upcomingGame ? portalState.rsvps.filter((rsvp) => rsvp.eventId === upcomingGame.id) : [];
  const gameSnackSlots = upcomingGame ? portalState.snackScheduleSlots.filter((slot) => slot.teamId === team.id && slot.eventId === upcomingGame.id) : [];
  const gameVolunteerSignups = upcomingGame ? portalState.volunteerSignups.filter((signup) => signup.teamId === team.id && signup.eventId === upcomingGame.id) : [];
  const gameWeatherAlert = upcomingGame ? portalState.weatherAlerts.find((alert) => alert.eventId === upcomingGame.id) : undefined;
  const media = mediaItemsSource.filter((item) => item.teamId === team.id);
  const privateTeamAlbum = getPrivateTeamAlbum(mediaItemsSource, team.id);
  const teamPortalSponsors = getTeamPortalSponsorPlacement(portalState.sponsors, team.id);
  const localBusinessTeamPage = buildLocalBusinessTeamPage(portalState, team.id);
  const teamVolunteerMarketplace = buildVolunteerMarketplace(portalState, team.id);
  const teamEquipmentExchange = buildEquipmentExchange(portalState, team.id, audience === "admin" ? "admin" : "parent");
  const teamWeatherSafety = buildWeatherSafetyDecisionAssistant(portalState, team.id, NOW);
  const teamSponsorSafeGallery = buildSponsorSafeMediaGallery(portalState, team.id);
  const teamAvailabilityIntelligence = buildFamilyAvailabilityIntelligence(portalState, team.id, NOW);
  const firstPlayerConsent = getPerPlayerMediaConsent(players[0]?.id ?? "player-pending", players.slice(0, 1).map((player) => player.id));
  const parentSubmittedMoments = getParentSubmittedMoments(portalState, team.id);
  const volunteerMoments = getVolunteerMoments(portalState, team.id);
  const seasonMemoryExport = exportSeasonMemories(portalState, team.id);
  const snackReminders = getSnackReminders(portalState, team.id);
  const snackConflicts = getSnackConflicts(portalState, team.id);
  const snackAuditTrail = getSnackAuditTrail(portalState, team.id);
  const snackCancellation = cancelSnackSlot(portalState, portalState.snackScheduleSlots.find((slot) => slot.teamId === team.id)?.id ?? "slot-pending", "Family schedule changed.");
  const volunteerRoleCaps = getVolunteerRoleCaps(portalState, team.id);
  const volunteerReminders = getVolunteerReminders(portalState, team.id);
  const volunteerCancellation = cancelVolunteerSignup(portalState, portalState.volunteerSignups.find((signup) => signup.teamId === team.id)?.id ?? "volunteer-pending", "Family schedule changed.");
  const volunteerApprovalPolicies = getVolunteerApprovalPolicies();
  const snackVolunteerFairness = getSnackVolunteerFairness(portalState, team.id);
  const dutyRotation = getDutyRotation(portalState, team.id);
  const familyOptOuts = getFamilyOptOuts(portalState, team.id);
  const siblingAwareAssignments = getSiblingAwareDutyAssignments(portalState, team.id);
  const missedSlots = getMissedSlotTracking(portalState, team.id);
  const latestReplay = parentReplaysSource
    .filter((replay) => replay.teamId === team.id)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  const replayDraft = latestReplay ?? (isSupabaseBacked ? createEmptyTeamPortalReplay(team) : generateParentReplayDraft(portalState, {
    teamId: team.id,
    coachUserId: team.coachUserId ?? "user-admin",
    focusAreas: ["catching", "throwing", "teamwork"],
    now: NOW
  }));
  const timelineItems = [
    ...teamEvents.map((event) => ({
      id: event.id,
      title: event.title,
      detail: `${event.eventType.replace("_", " ")} - ${formatDate(event.startsAt)}`
    })),
    ...parentReplaysSource.filter((replay) => replay.teamId === team.id).map((replay) => ({
      id: replay.id,
      title: replay.memoryMoment.title,
      detail: replay.memoryMoment.detail
    })),
    ...portalState.announcements.filter((announcement) => announcement.teamId === team.id).map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      detail: `Coach note - ${announcement.body}`
    })),
    ...media.map((item) => ({
      id: item.id,
      title: item.title,
      detail: `${item.type.replace("_", " ")} memory`
    })),
    ...portalState.volunteerSignups.filter((signup) => signup.teamId === team.id && signup.status === "filled").map((signup) => ({
      id: signup.id,
      title: `${signup.role} covered`,
      detail: "Volunteer moment saved to the season story."
    }))
  ].slice(0, 5);

  function updateBrandingDraft(field: "mascot" | "primaryColor" | "secondaryColor" | "themeKey", value: string) {
    setBrandingDrafts((current) => ({
      ...current,
      [team.id]: {
        ...current[team.id],
        [field]: value
      }
    }));
  }

  function applyThemePreset(nextThemeKey: ProgramThemeKey) {
    const preset = getProgramThemePreset(nextThemeKey);
    setBrandingDrafts((current) => ({
      ...current,
      [team.id]: {
        ...current[team.id],
        themeKey: preset.key,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        mascot: current[team.id]?.mascot ?? team.mascot ?? preset.mascotHint
      }
    }));
  }

  function saveBranding() {
    if (isSupabaseBacked) {
      if (!brandingCanSave) {
        setBrandingMessage("Only org admins or the assigned coach can update this team portal.");
        return;
      }

      setBrandingMessage("");
      startBrandingTransition(async () => {
        const response = await authenticatedJsonFetch("/api/admin/team-branding", {
          teamId: team.id,
          mascot: mascotDraft,
          primaryColor: primaryColorDraft,
          secondaryColor: secondaryColorDraft,
          themeKey: themeKeyDraft
        });
        const result = await response.json().catch(() => null) as {
          ok?: boolean;
          message?: string;
          team?: Team;
        } | null;

        if (result?.ok && result.team) {
          setRemoteBrandingOverrides((current) => ({
            ...current,
            [result.team!.id]: {
              mascot: result.team!.mascot,
              primaryColor: result.team!.primaryColor,
              secondaryColor: result.team!.secondaryColor,
              themeKey: result.team!.themeKey
            }
          }));
        }

        setBrandingMessage(result?.message ?? "Team portal branding could not be saved.");
      });
      return;
    }

    const input = {
      teamId: team.id,
      actorUserId: selectedBrandingActorId,
      mascot: mascotDraft,
      primaryColor: primaryColorDraft,
      secondaryColor: secondaryColorDraft,
      themeKey: themeKeyDraft,
      now: new Date().toISOString()
    };
    const preview = updateTeamPortalBranding(state, input);
    setBrandingMessage(preview.message);
    if (preview.ok) {
      dispatch({ type: "updateTeamPortalBranding", input });
    }
  }

  return (
    <div className="page team-portal-page" style={portalStyle}>
      <section className="hero team-portal-hero">
        <div className="team-portal-mark" aria-hidden="true">{team.mascot.slice(0, 1)}</div>
        <span className="eyebrow">Team-specific portal</span>
        <h1>{team.name} portal for schedules, learning, memories, and parent help.</h1>
        <p className="lead">
          {team.mascot} colors carry across this {themePreset.label.toLowerCase()} portal and Team Chat. {isSupabaseBacked
            ? "Approved roster, family access, schedule, branding, media, and replay details are current."
            : "Preview details are shown while the approved team portal is unavailable."}
        </p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Portal selector</span>
              <h2>{team.name}</h2>
            </div>
            <span className="badge ok">{team.mascot}</span>
          </div>
          <label>
            Team portal
            <select value={team.id} onChange={(event) => setTeamId(event.target.value)}>
              {teams.map((item) => (
                <option key={item.id} value={item.id}>{item.name} - {item.division}</option>
              ))}
            </select>
          </label>
          <div className="team-color-row" aria-label="Current team colors">
            <span style={{ background: team.primaryColor }} />
            <span style={{ background: team.secondaryColor }} />
            <p>{team.primaryColor} / {team.secondaryColor}</p>
          </div>
        </article>

        <article className="card stack team-branding-panel">
          <div className="card-header">
            <div>
              <span className="eyebrow">Coach customization</span>
              <h2>Portal colors and mascot</h2>
            </div>
            <span className={`badge ${brandingCanSave ? "ok" : "warning"}`}>{brandingCanSave ? "Can edit" : "Read only"}</span>
          </div>
          <div className="grid two">
            <label>
              Acting user
              <select value={selectedBrandingActorId} onChange={(event) => setBrandingActorId(event.target.value)}>
                {brandingActors.map((user) => (
                  <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
                ))}
              </select>
            </label>
            <label>
              Program theme
              <select value={themeKeyDraft} onChange={(event) => applyThemePreset(event.target.value as ProgramThemeKey)}>
                {programThemePresets.map((preset) => (
                  <option key={preset.key} value={preset.key}>{preset.label}</option>
                ))}
              </select>
            </label>
            <label>
              Mascot
              <input value={mascotDraft} onChange={(event) => updateBrandingDraft("mascot", event.target.value)} />
            </label>
            <label>
              Primary color
              <input type="color" value={primaryColorDraft} onChange={(event) => updateBrandingDraft("primaryColor", event.target.value)} />
            </label>
            <label>
              Secondary color
              <input type="color" value={secondaryColorDraft} onChange={(event) => updateBrandingDraft("secondaryColor", event.target.value)} />
            </label>
          </div>
          <div className="team-branding-preview" style={teamBrandStyle(primaryColorDraft, secondaryColorDraft)}>
            <strong>{mascotDraft}</strong>
            <span>{team.name} preview</span>
          </div>
          <div className="toolbar">
            <button onClick={saveBranding} disabled={isBrandingPending}>{isBrandingPending ? "Saving..." : "Save portal branding"}</button>
            <span className="muted">Assigned coaches can update only their own team. Org admins can update any team.</span>
          </div>
          {brandingMessage ? <p className="notice">{brandingMessage}</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Venue pages</span>
              <h2>{venuePage.title}</h2>
            </div>
            <span className="badge ok">Portal</span>
          </div>
          <p>{venuePage.summary}</p>
          <p className="muted">Canonical path: {venuePage.path}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Parking notes</span>
              <h2>Arrival parking</h2>
            </div>
            <span className="badge">Game day</span>
          </div>
          <p>{venueAmenityNotes.parking}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Field entrance notes</span>
              <h2>Main entrance</h2>
            </div>
            <span className="badge">Directions</span>
          </div>
          <p>{venueAmenityNotes.entrance}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Restroom info</span>
              <h2>Facilities</h2>
            </div>
            <span className="badge ok">Family</span>
          </div>
          <p>{venueAmenityNotes.restrooms}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Arrival instructions</span>
              <h2>Before you leave</h2>
            </div>
            <span className="badge ok">Family</span>
          </div>
          <p>{arrivalInstructions}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Venue intelligence layer</span>
              <h2>Location readiness</h2>
            </div>
            <span className={`badge ${venueIntelligence.confidence === "ready" ? "ok" : "warning"}`}>{venueIntelligence.confidence}</span>
          </div>
          <p>{venueIntelligence.summary}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Map fallback UX</span>
              <h2>{mapFallback.label}</h2>
            </div>
            <span className={`badge ${mapFallback.useFallback ? "warning" : "ok"}`}>{mapFallback.useFallback ? "Fallback" : "Embed"}</span>
          </div>
          {mapFallback.href ? <a href={mapFallback.href}>Open fallback directions</a> : <p className="muted">No fallback link is available.</p>}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Location change highlighting</span>
              <h2>{locationChange.changed ? "Location changed" : "No location change"}</h2>
            </div>
            <span className={`badge ${locationChange.changed ? "warning" : "ok"}`}>{locationChange.changed ? "Review" : "Stable"}</span>
          </div>
          <p>{locationChange.message}</p>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Facility notes</span>
              <h2>{facilityNotes.title}</h2>
            </div>
            <span className="badge">Venue</span>
          </div>
          {facilityNotes.notes.map((note) => <p className="muted" key={note}>{note}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Parent-submitted moments</span>
              <h2>Family memories</h2>
            </div>
            <span className="badge">{parentSubmittedMoments.length} moment(s)</span>
          </div>
          {parentSubmittedMoments.map((moment) => <p key={moment.id}><strong>{moment.title}</strong><br /><span className="muted">{moment.source}</span></p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer moments</span>
              <h2>Help that became story</h2>
            </div>
            <span className="badge">{volunteerMoments.length} moment(s)</span>
          </div>
          {volunteerMoments.map((moment) => <p key={moment.id}><strong>{moment.title}</strong><br /><span className="muted">{moment.source}</span></p>)}
          {!volunteerMoments.length ? <p className="muted">No volunteer moments are filled yet.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Exportable season memories</span>
              <h2>{seasonMemoryExport.filename}</h2>
            </div>
            <span className="badge ok">{seasonMemoryExport.rows.length} row(s)</span>
          </div>
          <pre>{seasonMemoryExport.rows.slice(0, 4).join("\n")}</pre>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack reminders</span>
              <h2>Snack duty prompts</h2>
            </div>
            <span className="badge warning">{snackReminders.length} reminder(s)</span>
          </div>
          {snackReminders.map((reminder) => <p key={reminder.id}><strong>{reminder.title}</strong><br /><span className="muted">{reminder.detail}</span></p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack conflict handling</span>
              <h2>Duplicate snack assignments</h2>
            </div>
            <span className="badge">{snackConflicts.length} conflict(s)</span>
          </div>
          {snackConflicts.map((slot) => <p key={slot.id}><strong>{slot.item}</strong><br /><span className="muted">{slot.eventId}</span></p>)}
          {!snackConflicts.length ? <p className="muted">No snack assignment conflicts are detected.</p> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack audit trail</span>
              <h2>Snack changes</h2>
            </div>
            <span className="badge">{snackAuditTrail.length} audit row(s)</span>
          </div>
          {snackAuditTrail.map((audit) => <p key={audit.id}>{audit.summary}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack cancellations</span>
              <h2>Cancellation preview</h2>
            </div>
            <span className="badge warning">Preview</span>
          </div>
          <p>{snackCancellation.message}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer role caps</span>
              <h2>Role capacity</h2>
            </div>
            <span className="badge">{volunteerRoleCaps.length} role(s)</span>
          </div>
          {volunteerRoleCaps.map((cap) => <p key={cap.role}><strong>{cap.role}</strong><br /><span className="muted">{cap.filled} filled of {cap.cap}</span></p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer reminders</span>
              <h2>Volunteer prompts</h2>
            </div>
            <span className="badge warning">{volunteerReminders.length} reminder(s)</span>
          </div>
          {volunteerReminders.map((reminder) => <p key={reminder.id}><strong>{reminder.title}</strong><br /><span className="muted">{reminder.detail}</span></p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer cancellation flow</span>
              <h2>Cancellation preview</h2>
            </div>
            <span className="badge warning">Preview</span>
          </div>
          <p>{volunteerCancellation.message}</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Volunteer approval policies</span>
              <h2>Role approval rules</h2>
            </div>
            <span className="badge">Policy</span>
          </div>
          {volunteerApprovalPolicies.map((policy) => <p className="muted" key={policy}>{policy}</p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Snack and volunteer fairness engine</span>
              <h2>Fairness balance</h2>
            </div>
            <span className="badge">{snackVolunteerFairness.balanceScore} gap</span>
          </div>
          <p>Snack assignments {snackVolunteerFairness.snackAssignments}, volunteer assignments {snackVolunteerFairness.volunteerAssignments}.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Duty rotation</span>
              <h2>Next family duties</h2>
            </div>
            <span className="badge">{dutyRotation.length} family(ies)</span>
          </div>
          {dutyRotation.map((entry) => <p key={entry.parentUserId}><strong>{entry.order}. {entry.parentUserId}</strong><br /><span className="muted">Next duty: {entry.nextDuty}</span></p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family opt-outs</span>
              <h2>Duty preferences</h2>
            </div>
            <span className="badge">{familyOptOuts.filter((entry) => entry.optedOut).length} opt-out(s)</span>
          </div>
          {familyOptOuts.map((entry) => <p key={entry.parentUserId}><strong>{entry.parentUserId}</strong><br /><span className="muted">{entry.reason}</span></p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Sibling-aware duty assignment</span>
              <h2>Household grouping</h2>
            </div>
            <span className="badge">{siblingAwareAssignments.length} group(s)</span>
          </div>
          {siblingAwareAssignments.map((entry) => <p key={entry.parentUserId}><strong>{entry.siblingGroupKey}</strong><br /><span className="muted">Duty: {entry.nextDuty}</span></p>)}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Missed-slot tracking</span>
              <h2>Open past duties</h2>
            </div>
            <span className="badge warning">{missedSlots.length} missed</span>
          </div>
          {missedSlots.map((slot) => <p key={slot.id}>{slot.detail}</p>)}
          {!missedSlots.length ? <p className="muted">No missed snack or volunteer slots are detected.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">One-Tap Volunteer Marketplace</span>
              <h2>Snack, score, field, carpool, and backup jobs</h2>
            </div>
            <span className="badge">{teamVolunteerMarketplace.filter((job) => job.actionStatus === "claimable").length} claimable</span>
          </div>
          {teamVolunteerMarketplace.slice(0, 7).map((job) => (
            <p key={job.id}><strong>{job.title}</strong><br /><span className="muted">{job.category.replace("_", " ")} - {job.actionStatus.replace("_", " ")}. {job.detail}</span></p>
          ))}
          <p className="notice">Claims require approved parent access. Reminder messages are not connected here.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Equipment Exchange</span>
              <h2>Moderated gear listings</h2>
            </div>
            <span className="badge">{teamEquipmentExchange.length} listing(s)</span>
          </div>
          {teamEquipmentExchange.map((listing) => (
            <p key={listing.id}><strong>{listing.title}</strong><br /><span className="muted">{listing.kind} - {listing.sizeOrAge} - {listing.condition}. {listing.detail}</span></p>
          ))}
          <p className="notice">Gear listings do not expose parent contacts publicly and safety-sensitive items require staff review.</p>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Weather + Safety Decision Assistant</span>
              <h2>{teamWeatherSafety.eventTitle}</h2>
            </div>
            <span className={`badge ${teamWeatherSafety.recommendation === "monitor" ? "ok" : "warning"}`}>{teamWeatherSafety.recommendation.replaceAll("_", " ")}</span>
          </div>
          {teamWeatherSafety.conditions.map((condition) => (
            <p key={condition.label}><strong>{condition.label}</strong><br /><span className="muted">{condition.value} - {condition.status}</span></p>
          ))}
          <p className="muted">{teamWeatherSafety.fieldClosureDraft}</p>
          <p className="notice">{teamWeatherSafety.boundary}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Family Availability Intelligence</span>
              <h2>{teamAvailabilityIntelligence.eventTitle}</h2>
            </div>
            <span className={`badge ${teamAvailabilityIntelligence.signal === "ready" ? "ok" : "warning"}`}>{teamAvailabilityIntelligence.signal.replace("_", " ")}</span>
          </div>
          <p>{teamAvailabilityIntelligence.summary}</p>
          <p className="muted">Response rate {teamAvailabilityIntelligence.responseRate}%; schedule conflicts {teamAvailabilityIntelligence.scheduleConflictCount}.</p>
          <p className="notice">{teamAvailabilityIntelligence.boundary}</p>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Sponsor-Safe Media Gallery</span>
              <h2>Approved recap pages</h2>
            </div>
            <span className="badge">{teamSponsorSafeGallery.approvedItems.length} approved</span>
          </div>
          {teamSponsorSafeGallery.approvedItems.map((item) => (
            <p key={item.id}><strong>{item.recapLabel}</strong><br /><span className="muted">{item.sponsorFrame}. {item.safeCaption}</span></p>
          ))}
          {!teamSponsorSafeGallery.approvedItems.length ? <p className="muted">No approved media is ready for sponsor-safe recap framing.</p> : null}
          <p className="notice">{teamSponsorSafeGallery.boundary}</p>
        </article>
      </section>

      <section className="grid one">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Local Business Team Pages</span>
              <h2>{localBusinessTeamPage.teamName} community sponsors</h2>
            </div>
            <span className="badge">{localBusinessTeamPage.sponsors.length} sponsor(s)</span>
          </div>
          <p className="muted">Team Portal sponsor placement: {localBusinessTeamPage.acknowledgement}</p>
          {localBusinessTeamPage.sponsors.map((sponsor) => (
            <p key={sponsor.sponsorId}>
              <strong>{sponsor.name}</strong><br />
              <span className="muted">{sponsor.offerText} {sponsor.url} - {sponsor.reviewStatus.replace("_", " ")}.</span>
            </p>
          ))}
          {!teamPortalSponsors.length ? <p className="muted">No active team portal sponsors are placed for this team.</p> : null}
          <p className="notice">{localBusinessTeamPage.privacyBoundary}</p>
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Weekly digest</span>
          <h2>This week</h2>
          <p><strong>Practice:</strong> {nextPractice ? `${formatDate(nextPractice.startsAt)} at ${nextPractice.locationName}` : "No practice scheduled."}</p>
          <p><strong>Parent Replay:</strong> {replayDraft.summary}</p>
          <p><strong>Team quest:</strong> {replayDraft.teamQuest}</p>
        </article>
        <article className="card stack">
          <span className="badge warning">Game Day Mode</span>
          <h2>{upcomingGame?.title ?? "Next game"}</h2>
          {upcomingGame ? (
            <>
              <p>{formatDate(upcomingGame.startsAt)} · Arrival time not published</p>
              <p><strong>Venue:</strong> {upcomingGame.locationName} · {upcomingGame.locationAddress}</p>
              <p><strong>Bring:</strong> League bring list not published</p>
              <p><strong>RSVP:</strong> {gameRsvps.length} of {players.length} player response(s)</p>
              <p><strong>Snack:</strong> {gameSnackSlots.find((slot) => slot.status === "assigned")?.item ?? "Open snack duty"}</p>
              <p><strong>Parking:</strong> Not published; check authorized team updates before leaving.</p>
              <p><strong>Weather:</strong> {gameWeatherAlert ? `${gameWeatherAlert.headline} - ${gameWeatherAlert.detail}` : "No weather alert drafted."}</p>
              <p><strong>Urgent help:</strong> {gameVolunteerSignups.filter((signup) => signup.status === "open").map((signup) => signup.role).join(", ") || "Covered"}</p>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(upcomingGame.locationAddress)}`}>Open field map</a>
            </>
          ) : <p className="muted">No game scheduled yet.</p>}
          <p className="notice">Calm Mode keeps only essentials visible before the event. Weather and urgent alerts remain approval-gated; no automatic provider send occurs.</p>
        </article>
        <article className="card stack">
          <span className="badge">Roster</span>
          <h2>Team family view</h2>
          {players.map((player) => (
            <p key={player.id}>
              {player.firstName} {player.lastInitial}. - Jersey {player.jersey}
              <br />
              <span className="muted">
                {guardianLinks.filter((guardian) => guardian.playerId === player.id).length} guardian link(s), {parentInvites.filter((invite) => invite.playerId === player.id).length} invite(s)
              </span>
            </p>
          ))}
          {!players.length ? <p className="muted">No approved players are rostered to this team yet.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Embedded map UI</span>
              <h2>{embeddedMap.title}</h2>
            </div>
            <span className={`badge ${embeddedMap.status === "ready" ? "ok" : "warning"}`}>{embeddedMap.status}</span>
          </div>
          {embeddedMap.embedUrl ? <iframe title={embeddedMap.title} src={embeddedMap.embedUrl} loading="lazy" /> : <p className="muted">No event location is ready for map embed.</p>}
          {embeddedMap.directionsUrl ? <a href={embeddedMap.directionsUrl}>Open directions</a> : null}
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Venue marker management</span>
              <h2>Map markers</h2>
            </div>
            <span className="badge">{venueMarkers.length} marker(s)</span>
          </div>
          {venueMarkers.map((marker) => (
            <p key={marker.id}><strong>{marker.label}. {marker.title}</strong><br /><span className="muted">{marker.eventTitle} · {marker.address}</span></p>
          ))}
          {!venueMarkers.length ? <p className="muted">No venue markers available.</p> : null}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Quota handling</span>
              <h2>Map usage guard</h2>
            </div>
            <span className={`badge ${mapQuotaStatus.status}`}>{mapQuotaStatus.remaining} left</span>
          </div>
          <p className="muted">{mapQuotaStatus.detail}</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Field layout metadata</span>
              <h2>{fieldLayout.fieldName}</h2>
            </div>
            <span className="badge ok">Game day</span>
          </div>
          <p><strong>Entrance:</strong> {fieldLayout.entrance}</p>
          <p><strong>Home bench:</strong> {fieldLayout.homeBench}</p>
          <p><strong>Away bench:</strong> {fieldLayout.awayBench}</p>
          <p className="muted">Warmup: {fieldLayout.warmupArea}</p>
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className={`badge ${isSupabaseBacked ? "ok" : "warning"}`}>{isSupabaseBacked ? "Current" : "Preview only"}</span>
          <h2>Team data status</h2>
          <p>{isSupabaseBacked ? "Approved Team Portal details are current." : "Preview details are shown while the approved team portal is unavailable."}</p>
          <p className="muted">{teams.length} team(s), {playersSource.length} player(s), {mediaItemsSource.length} media item(s)</p>
        </article>
        <article className="card stack">
          <span className="badge ok">Access records</span>
          <h2>Guardians and memberships</h2>
          <p><strong>{guardianLinks.length}</strong> guardian link(s)</p>
          <p><strong>{teamMemberships.length}</strong> active or invited membership record(s)</p>
          <p><strong>{activeParentMemberships.length}</strong> active parent family account(s)</p>
          {teamMemberships.slice(0, 3).map((membership) => {
            const user = usersSource.find((item) => item.id === membership.userId);
            return (
              <p key={membership.id}>
                {user?.name ?? membership.userId} - {roleLabel(membership.role)} · {membership.status}
              </p>
            );
          })}
        </article>
        <article className="card stack">
          <span className="badge warning">Parent invites</span>
          <h2>Invite status</h2>
          {parentInvites.slice(0, 4).map((invite) => (
            <p key={invite.id}>
              {invite.email}
              <br />
              <span className="muted">{invite.status} · {invite.deliveryStatus} · expires {formatDate(invite.expiresAt)}</span>
            </p>
          ))}
          {!parentInvites.length ? <p className="muted">No parent invites are queued for this team.</p> : null}
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Coach video library</span>
          <h2>Videos</h2>
          <p><strong>{replayDraft.coachVideo.title}</strong><br /><span className="muted">{replayDraft.coachVideo.note}</span></p>
          {media.filter((item) => item.type === "youtube").map((item) => (
            <p key={item.id}>{item.title}</p>
          ))}
        </article>
        <article className="card stack">
          <span className="badge warning">Parent education center</span>
          <h2>Help at home</h2>
          <p>{replayDraft.parentEducation}</p>
          <div className="home-practice-loop">
            {replayDraft.homeActivities.map((activity) => (
              <div className="home-practice-row" key={activity.duration}>
                <span className="badge">{formatReplayDuration(activity.duration)}</span>
                <strong>{activity.title}</strong>
                <span className="muted">{activity.parentGoal ?? activity.steps[0]}</span>
              </div>
            ))}
          </div>
          {replayDraft.parentTranslations.map((translation) => (
            <p key={translation.coachTerm}><strong>{translation.coachTerm}</strong><br /><span className="muted">{translation.parentInstruction}</span></p>
          ))}
          <p className="notice">AI learning plans are represented by local deterministic guidance; no AI provider is connected.</p>
        </article>
        <article className="card stack">
          <span className="badge">Skill cards</span>
          <h2>Practice cues</h2>
          {replayDraft.skillCards.map((card) => <p key={card}>{card}</p>)}
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Per-player media consent</span>
              <h2>{players[0]?.firstName ?? "Player"} consent</h2>
            </div>
            <span className={`badge ${firstPlayerConsent.consent === "granted" ? "ok" : "warning"}`}>{firstPlayerConsent.consent}</span>
          </div>
          <p className="muted">Per-player consent controls whether family-visible media can include a specific rostered player.</p>
        </article>

        <article className="card stack">
          <div className="card-header">
            <div>
              <span className="eyebrow">Private team album</span>
              <h2>Approved team media</h2>
            </div>
            <span className="badge ok">{privateTeamAlbum.length} item(s)</span>
          </div>
          {privateTeamAlbum.map((item) => <p key={item.id}><strong>{item.title}</strong><br /><span className="muted">{item.type.replace("_", " ")}</span></p>)}
          {!privateTeamAlbum.length ? <p className="muted">No approved private team album items are visible.</p> : null}
        </article>
      </section>

      <section className="grid three">
        <article className="card stack">
          <span className="badge ok">Skill trees</span>
          <h2>Growth path</h2>
          {replayDraft.focusAreas.map((area, index) => (
            <p key={area}>{formatFocusArea(area)} - Level {index + 1} practice habit</p>
          ))}
        </article>
        <article className="card stack">
          <span className="badge warning">Season storybook</span>
          <h2>Memory timeline</h2>
          {timelineItems.map((item) => (
            <p key={item.id}><strong>{item.title}</strong><br /><span className="muted">{item.detail}</span></p>
          ))}
        </article>
        <article className="card stack">
          <span className="badge">Volunteer center</span>
          <h2>Game help</h2>
          {state.volunteerSignups.filter((signup) => signup.teamId === team.id).map((signup) => (
            <p key={signup.id}>{signup.role}: {signup.status}</p>
          ))}
          <p className="muted">Volunteer signup is displayed from local or loaded team records; parent-facing claim flows remain separate.</p>
        </article>
      </section>
    </div>
  );
}

function mapRealtimeTeamChatMessage(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    channelId: String(row.channel_id),
    organizationId: String(row.organization_id),
    teamId: String(row.team_id),
    authorUserId: String(row.author_user_id),
    authorRole: String(row.author_role) as UserRole,
    kind: String(row.message_kind) as "message" | "announcement",
    topic: row.announcement_topic ? String(row.announcement_topic) as ChatAnnouncementTopic : undefined,
    body: String(row.body ?? ""),
    eventId: row.event_id ? String(row.event_id) : undefined,
    pinned: Boolean(row.pinned),
    moderationStatus: String(row.moderation_status ?? "visible") as "visible" | "hidden" | "deleted",
    readByUserIds: Array.isArray(row.read_by_user_ids) ? row.read_by_user_ids.map((item) => String(item)) : [],
    createdAt: String(row.created_at),
    editedAt: row.edited_at ? String(row.edited_at) : undefined,
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
    moderatedAt: row.moderated_at ? String(row.moderated_at) : undefined,
    moderatedByUserId: row.moderated_by_user_id ? String(row.moderated_by_user_id) : undefined,
    moderationReason: row.moderation_reason ? String(row.moderation_reason) : undefined
  };
}

export function TeamChatClient({
  teamChatData,
  viewerUserId,
  lockedTeamId
}: {
  teamChatData?: TeamChatData | null;
  viewerUserId?: string;
  lockedTeamId?: string;
} = {}) {
  const { state, dispatch } = useAppState();
  const isSupabaseBacked = Boolean(teamChatData?.teams.length);
  const [remoteMessages, setRemoteMessages] = useState(() => teamChatData?.messages ?? []);
  const [remoteModerationEvents, setRemoteModerationEvents] = useState(() => teamChatData?.moderationEvents ?? []);
  const chatState = isSupabaseBacked ? {
    ...state,
    teams: teamChatData!.teams,
    users: teamChatData!.users.length ? teamChatData!.users : state.users,
    teamMemberships: teamChatData!.teamMemberships,
    events: teamChatData!.events,
    teamChatChannels: teamChatData!.channels,
    chatMessages: remoteMessages,
    chatModerationAuditEvents: remoteModerationEvents
  } : state;
  const [viewerId, setViewerId] = useState(() => viewerUserId ?? teamChatData?.users.find((user) => user.role !== "parent")?.id ?? "user-parent-jordan");
  const [teamId, setTeamId] = useState(() => lockedTeamId ?? teamChatData?.teams[0]?.id ?? "team-tigers");
  const [draftMessage, setDraftMessage] = useState("");
  const [linkDraftToGameDay, setLinkDraftToGameDay] = useState(true);
  const [postNotice, setPostNotice] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementTopic, setAnnouncementTopic] = useState<ChatAnnouncementTopic>("reminder");
  const [announcementPinned, setAnnouncementPinned] = useState(true);
  const [announcementNotice, setAnnouncementNotice] = useState("");
  const [moderationNotice, setModerationNotice] = useState("");
  const [isChatPending, startChatTransition] = useTransition();
  const selectedViewerId = viewerUserId && chatState.users.some((user) => user.id === viewerUserId)
    ? viewerUserId
    : chatState.users.some((user) => user.id === viewerId) ? viewerId : chatState.users[0]?.id ?? viewerId;
  const selectedTeamId = lockedTeamId && chatState.teams.some((team) => team.id === lockedTeamId)
    ? lockedTeamId
    : chatState.teams.some((team) => team.id === teamId) ? teamId : chatState.teams[0]?.id ?? teamId;
  const viewer = chatState.users.find((user) => user.id === selectedViewerId);
  const selectedTeam = chatState.teams.find((team) => team.id === selectedTeamId);
  const chatStyle = teamBrandStyle(selectedTeam?.primaryColor ?? "#1570ef", selectedTeam?.secondaryColor ?? "#dff4ff");

  let view: ReturnType<typeof getTeamChatView> | null = null;
  let deniedReason = "";
  try {
    view = getTeamChatView(chatState, selectedViewerId, selectedTeamId, NOW);
  } catch (error) {
    deniedReason = error instanceof Error ? error.message : "Team Chat is unavailable.";
  }
  const moderationEvents = view
    ? chatState.chatModerationAuditEvents.filter((event) => event.teamId === view.team.id)
    : [];
  const reportingSummary = selectedTeam ? getTeamChatReportingSummary(chatState, selectedTeam.id) : null;
  const retentionJobs = selectedTeam ? getTeamChatRetentionJobs(chatState, selectedTeam.id) : [];
  const policyScreens = getMediaMessagePolicyScreens();

  useEffect(() => {
    if (!isSupabaseBacked) return undefined;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("team-chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_chat_messages" }, (payload) => {
        const message = mapRealtimeTeamChatMessage(payload.new as Record<string, unknown>);
        setRemoteMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "team_chat_messages" }, (payload) => {
        const message = mapRealtimeTeamChatMessage(payload.new as Record<string, unknown>);
        setRemoteMessages((current) => current.map((item) => item.id === message.id ? message : item));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isSupabaseBacked]);

  useEffect(() => {
    if (!isSupabaseBacked || !view || !view.messages.length) return;
    const unreadMessageIds = view.messages
      .filter((message) => message.authorUserId !== view!.viewer.id && !message.readByUserIds.includes(view!.viewer.id))
      .map((message) => message.id);
    if (!unreadMessageIds.length) return;
    void authenticatedJsonFetch("/api/team-chat/read-receipts", { messageIds: unreadMessageIds });
  }, [isSupabaseBacked, view]);

  function submitSupabaseChat(input: {
    kind: "message" | "announcement";
    body: string;
    topic?: ChatAnnouncementTopic;
    pinned?: boolean;
    eventId?: string;
    onDone: (message: string, created?: typeof remoteMessages[number]) => void;
  }) {
    if (!view) return;
    startChatTransition(async () => {
      const response = await authenticatedJsonFetch("/api/team-chat/messages", {
        teamId: view!.team.id,
        body: input.body,
        eventId: input.eventId,
        kind: input.kind,
        topic: input.topic,
        pinned: input.pinned
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        createdMessage?: typeof remoteMessages[number];
      } | null;
      if (result?.ok && result.createdMessage) {
        setRemoteMessages((current) => current.some((item) => item.id === result.createdMessage!.id) ? current : [...current, result.createdMessage!]);
      }
      input.onDone(result?.message ?? "Team Chat message could not be saved.", result?.createdMessage);
    });
  }

  function moderateSupabaseMessage(messageId: string, action: "message_hidden" | "message_deleted") {
    if (!view) return;
    startChatTransition(async () => {
      const response = await authenticatedJsonFetch("/api/team-chat/moderation", {
        messageId,
        action,
        reason: "Coach or admin moderated this Team Chat message."
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        moderatedMessage?: typeof remoteMessages[number];
      } | null;
      if (result?.ok && result.moderatedMessage) {
        setRemoteMessages((current) => current.map((item) => item.id === result.moderatedMessage!.id ? result.moderatedMessage! : item));
        setRemoteModerationEvents((current) => [{
          id: `remote-moderation-${Date.now()}`,
          messageId,
          channelId: result.moderatedMessage!.channelId,
          teamId: result.moderatedMessage!.teamId,
          actorUserId: view!.viewer.id,
          actorRole: view!.viewer.role,
          action,
          reason: "Coach or admin moderated this Team Chat message.",
          createdAt: new Date().toISOString()
        }, ...current]);
      }
      setModerationNotice(result?.message ?? "Team Chat moderation could not be saved.");
    });
  }

  return (
    <div className="page clubhouse-chat-page" style={chatStyle}>
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Team Chat" }]} />
      <PageHeader
        eyebrow="Safe family communication"
        title={`${selectedTeam?.name ?? "Team"} Chat`}
        subtitle="A private, assigned-team workspace for coach notes, game-day questions, read receipts, and moderation review. No child accounts."
        actions={(
          <div className="cluster">
            <StatusBadge label={isSupabaseBacked ? "Current" : "Preview only"} variant={isSupabaseBacked ? "success" : "warning"} dot={isSupabaseBacked} />
            <StatusBadge label="Read-only" variant="neutral" />
          </div>
        )}
      />
      <section className="hero clubhouse-chat-hero">
        <div className="clubhouse-hero-mark" aria-hidden="true">{selectedTeam?.mascot.slice(0, 1) ?? "T"}</div>
        <span className="eyebrow">Safe family communication</span>
        <h1>{selectedTeam?.name ?? "Team"} Chat for game-day questions and coach notes.</h1>
        <p className="lead">
          A private branded clubhouse for assigned parents, assigned coaches, and org admins. Children do not have chat accounts or direct messages.
        </p>
      </section>

      <section className="clubhouse-toolbar card">
        <label>
          Preview as
          <select value={selectedViewerId} onChange={(event) => setViewerId(event.target.value)} disabled={Boolean(viewerUserId)}>
            {chatState.users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} · {roleLabel(user.role)}</option>
            ))}
          </select>
        </label>
        <label>
          Team Chat
          <select value={selectedTeamId} onChange={(event) => setTeamId(event.target.value)} disabled={Boolean(lockedTeamId)}>
            {chatState.teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name} · {team.division}</option>
            ))}
          </select>
        </label>
        <div className="clubhouse-toolbar-note">
          <strong>{viewer?.name ?? "Unknown viewer"}</strong>
          <span>{selectedTeam?.name ?? "Unknown team"} access is evaluated from team memberships.</span>
        </div>
      </section>

      {!view ? (
        <section className="card stack">
          <span className="badge danger">Private Team Chat</span>
          <h2>Access limited to assigned families and staff.</h2>
          <p>{deniedReason}</p>
          <p className="muted">Parents can only view chats for teams connected to their rostered child. Coaches can only view assigned teams. Org admins can view all team chats.</p>
        </section>
      ) : (
        <section className="clubhouse-chat-shell chat-workspace" aria-label="Team Chat workspace">
          <aside className="card clubhouse-team-card chat-thread-rail">
            <span className="eyebrow">Thread rail</span>
            <div className="clubhouse-team-mark" aria-hidden="true">{view.team.mascot.slice(0, 1)}</div>
            <StatusBadge label="Team Chat" variant="success" />
            <h2>{view.team.name}</h2>
            <p className="muted">{view.team.mascot} · {view.team.division} · {roleLabel(view.viewer.role)} view</p>
            <div className="chat-rail-presence">
              <span className="eyebrow">Team presence</span>
              <AvatarStack names={chatState.users.slice(0, 8).map((user) => user.name)} label={`${chatState.users.length} team participants`} />
            </div>
            <div className="clubhouse-chip-row" aria-label="Team chat quick topics">
              <Chip label="Arrival" />
              <Chip label="Uniforms" />
              <Chip label="Snacks" />
              <Chip label="Weather" />
            </div>
            <div className="clubhouse-unread">
              <strong>{view.unreadCount}</strong>
              <span>unread for this preview user</span>
            </div>
            <p className="notice">{view.safetyNote}</p>
            <div className="clubhouse-moderation-log">
              <h3>Moderation Log</h3>
              {moderationEvents.length ? moderationEvents.slice(0, 3).map((event) => (
                <p key={event.id}>
                  <strong>{event.action.replaceAll("_", " ")}</strong>
                  <span>{event.reason}</span>
                </p>
              )) : <p className="muted">No moderation actions recorded for this team.</p>}
            </div>
          </aside>

          <section className="card clubhouse-chat-panel chat-conversation-panel">
            <div className="card-header">
              <div>
                <span className="eyebrow">Private to assigned team members</span>
                <h2>{view.team.mascot} clubhouse</h2>
              </div>
              <StatusBadge label={view.access.reason} variant="info" />
            </div>
            <div className="chat-broadcast-control">
              <div>
                <strong>Coach Broadcast Mode</strong>
                <p className="muted">When enabled, families see a Read-only game-day announcement stream.</p>
              </div>
              <Toggle checked={!view.access.canPost} label={!view.access.canPost ? "Read-only" : "Open thread"} />
            </div>
            <BroadcastMode enabled={!view.access.canPost} />

            {view.pinnedMessage ? (
              <PinnedMessagesBar count={1}>
                <article className="clubhouse-pinned">
                  <StatusBadge label="Pinned Reminder" variant="warning" />
                  <h3>Coach Note</h3>
                  <p>{view.pinnedMessage.body}</p>
                  <small>{formatDate(view.pinnedMessage.createdAt)} · {formatTopic(view.pinnedMessage.topic)}</small>
                </article>
              </PinnedMessagesBar>
            ) : null}

            {view.upcomingGame ? (
              <article className="clubhouse-game-day">
                <div>
                  <StatusBadge label="Game-Day Questions" variant="success" />
                  <h3>{view.upcomingGame.title}</h3>
                  <p className="muted">
                    {formatDate(view.upcomingGame.startsAt)} · Arrival time not published
                  </p>
                </div>
                <ul className="list compact">
                  <li>Field: {view.upcomingGame.locationName}</li>
                  <li>Opponent: {view.upcomingGame.opponent ?? "To be announced"}</li>
                  <li><a href={`https://maps.google.com/?q=${encodeURIComponent(view.upcomingGame.locationAddress)}`}>Open map link</a></li>
                  <li>Questions in thread: {view.gameDayMessages.length}</li>
                </ul>
              </article>
            ) : null}

            <form
              className="clubhouse-coach-note"
              onSubmit={(event) => {
                event.preventDefault();
                if (!view?.access.canAnnounce) {
                  setAnnouncementNotice("Only assigned coaches and org admins can send Coach Notes.");
                  return;
                }
                if (!announcementBody.trim()) {
                  setAnnouncementNotice("Write a Coach Note before sending.");
                  return;
                }
                if (isSupabaseBacked) {
                  submitSupabaseChat({
                    kind: "announcement",
                    body: announcementBody,
                    topic: announcementTopic,
                    pinned: announcementPinned,
                    onDone: (message, created) => {
                      if (created) setAnnouncementBody("");
                      setAnnouncementNotice(message);
                    }
                  });
                  return;
                }
                dispatch({
                  type: "sendCoachAnnouncement",
                  input: {
                    teamId: view.team.id,
                    authorUserId: view.viewer.id,
                    body: announcementBody,
                    topic: announcementTopic,
                    pinned: announcementPinned,
                    now: new Date().toISOString()
                  }
                });
                setAnnouncementBody("");
                setAnnouncementNotice(announcementPinned ? "Coach Note posted and pinned." : "Coach Note posted.");
              }}
            >
              <div className="card-header">
                <div>
                  <span className="eyebrow">Coach Announcements</span>
                  <h3>Coach Note</h3>
                </div>
                <StatusBadge label={view.access.canAnnounce ? "Coach/Admin" : "Read-only"} variant="warning" />
              </div>
              <div className="grid two">
                <label>
                  Topic
                  <select
                    value={announcementTopic}
                    onChange={(event) => setAnnouncementTopic(event.target.value as ChatAnnouncementTopic)}
                    disabled={!view.access.canAnnounce}
                  >
                    <option value="game_time">Game time</option>
                    <option value="field_location">Field location</option>
                    <option value="uniforms">Uniforms</option>
                    <option value="snacks">Snacks</option>
                    <option value="weather">Weather</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </label>
                <label className="clubhouse-checkbox">
                  <input
                    type="checkbox"
                    checked={announcementPinned}
                    onChange={(event) => setAnnouncementPinned(event.target.checked)}
                    disabled={!view.access.canAnnounce}
                  />
                  Pin as Pinned Reminder
                </label>
              </div>
              <label>
                Message
                <textarea
                  value={announcementBody}
                  onChange={(event) => setAnnouncementBody(event.target.value)}
                  placeholder="Share game time, field location, uniforms, snacks, weather, or reminders."
                  disabled={!view.access.canAnnounce}
                />
              </label>
              <div className="toolbar">
                <button disabled={isChatPending || !view.access.canAnnounce || !announcementBody.trim()}>{isChatPending ? "Posting..." : "Send coach note to team now"}</button>
                <span className="muted">Posts immediately in Team Chat for this team. It does not send email, SMS, or push.</span>
              </div>
              {announcementNotice ? <p className="notice">{announcementNotice}</p> : null}
            </form>

            <Divider label="Today" />
            <div className="clubhouse-message-list chat-message-list" aria-label="Team Chat messages">
              {view.messages.length ? view.messages.map((message) => {
                const author = chatState.users.find((user) => user.id === message.authorUserId);
                const isOutbound = message.authorUserId === view.viewer.id;
                return (
                  <article className={`chat-message-row ${isOutbound ? "outbound" : "inbound"} ${message.kind}`} key={message.id} aria-label={`Message from ${author?.name ?? roleLabel(message.authorRole)}`}>
                    <div className="avatar sm" aria-hidden="true">{author?.name ? author.name.slice(0, 2).toUpperCase() : roleLabel(message.authorRole).slice(0, 2).toUpperCase()}</div>
                    <div className={`chat-bubble ${isOutbound ? "out" : "in"}`}>
                      <div className="chat-bubble-meta">
                        <strong>{author?.name ?? roleLabel(message.authorRole)}</strong>
                        <span>{roleLabel(message.authorRole)}</span>
                        <span>{message.kind === "announcement" ? "Coach Note" : "Team Chat"}</span>
                        {message.eventId ? <span>Game linked</span> : null}
                      </div>
                      <p>{message.body}</p>
                      <time>{formatDate(message.createdAt)}</time>
                      <ReadReceipt read={message.readByUserIds.length} total={Math.max(1, chatState.users.length)} />
                      {view.access.canModerate ? (
                        <div className="clubhouse-message-actions">
                          <Tooltip tip="Hide this message from the team thread.">
                            <button
                              className="secondary"
                              type="button"
                              onClick={() => {
                                if (isSupabaseBacked) {
                                  moderateSupabaseMessage(message.id, "message_hidden");
                                  return;
                                }
                                dispatch({
                                  type: "moderateTeamChatMessage",
                                  input: {
                                    messageId: message.id,
                                    actorUserId: view.viewer.id,
                                    action: "message_hidden",
                                    reason: "Coach or admin moderated this Team Chat message.",
                                    now: new Date().toISOString()
                                  }
                                });
                                setModerationNotice("Message hidden and moderation audit recorded.");
                              }}
                            >
                              Hide
                            </button>
                          </Tooltip>
                          <Tooltip tip="Delete and audit this message.">
                            <button
                              className="secondary"
                              type="button"
                              onClick={() => {
                                if (isSupabaseBacked) {
                                  moderateSupabaseMessage(message.id, "message_deleted");
                                  return;
                                }
                                dispatch({
                                  type: "moderateTeamChatMessage",
                                  input: {
                                    messageId: message.id,
                                    actorUserId: view.viewer.id,
                                    action: "message_deleted",
                                    reason: "Coach or admin deleted this Team Chat message.",
                                    now: new Date().toISOString()
                                  }
                                });
                                setModerationNotice("Message deleted and moderation audit recorded.");
                              }}
                            >
                              Delete
                            </button>
                          </Tooltip>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              }) : (
                <EmptyState
                  title="Team Chat is ready."
                  body="Use this space for schedule questions, field details, uniforms, snacks, weather updates, and coach reminders."
                />
              )}
              <TypingIndicator label="Coach is drafting a field note" />
            </div>
            {moderationNotice ? <p className="notice">{moderationNotice}</p> : null}

            <form
              className="clubhouse-compose message-input-toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                if (!view?.access.canPost) {
                  setPostNotice("Only assigned parents, assigned coaches, and org admins can post in this Team Chat.");
                  return;
                }
                const input = {
                  teamId: view.team.id,
                  authorUserId: view.viewer.id,
                  body: draftMessage,
                  eventId: linkDraftToGameDay ? view.upcomingGame?.id : undefined,
                  now: new Date().toISOString()
                };
                if (!draftMessage.trim()) {
                  setPostNotice("Write a message before sending.");
                  return;
                }
                if (isSupabaseBacked) {
                  submitSupabaseChat({
                    kind: "message",
                    body: draftMessage,
                    eventId: input.eventId,
                    onDone: (message, created) => {
                      if (created) setDraftMessage("");
                      setPostNotice(message);
                    }
                  });
                  return;
                }
                dispatch({ type: "postTeamChatMessage", input });
                setDraftMessage("");
                setPostNotice("Team Chat message posted.");
              }}
            >
              <label>
                Team Chat message
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Ask about field location, jerseys, snacks, arrival time, or reminders."
                  disabled={!view.access.canPost}
                />
              </label>
              {view.upcomingGame ? (
                <label className="clubhouse-checkbox">
                  <input
                    type="checkbox"
                    checked={linkDraftToGameDay}
                    onChange={(event) => setLinkDraftToGameDay(event.target.checked)}
                    disabled={!view.access.canPost}
                  />
                  File under Game-Day Questions for {view.upcomingGame.locationName}
                </label>
              ) : null}
              <div className="toolbar">
                <button disabled={isChatPending || !view.access.canPost || !draftMessage.trim()}>{isChatPending ? "Posting..." : "Send to team now"}</button>
                <span className="muted">{view.access.canPost ? "Posts immediately for this team. It does not send email, SMS, or push." : "Posting is blocked because this viewer does not have active team access."}</span>
              </div>
              {postNotice ? <p className="notice">{postNotice}</p> : null}
            </form>
          </section>

          <aside className="card chat-context-rail">
            <span className="eyebrow">Context rail</span>
            <h2>Safety and message status</h2>
            <div className="stack-sm">
              <StatusBadge label={isSupabaseBacked ? "Current" : "Preview only"} variant={isSupabaseBacked ? "success" : "warning"} dot={isSupabaseBacked} />
              <StatusBadge label={isSupabaseBacked ? "Saved" : "Delivery disconnected"} variant={isSupabaseBacked ? "info" : "error"} />
              <StatusBadge label="No child accounts" variant="neutral" />
            </div>
            <section className="chat-context-card">
              <span className="eyebrow">Reporting UI</span>
              <p><strong>{reportingSummary?.reportableMessages ?? 0}</strong> visible message(s) can be reported.</p>
              <p className="muted">{reportingSummary?.hiddenMessages ?? 0} hidden, {reportingSummary?.deletedMessages ?? 0} deleted.</p>
            </section>
            <section className="chat-context-card">
              <span className="eyebrow">Retention jobs</span>
              {retentionJobs.map((job) => (
                <p key={job.id}><strong>{job.title}</strong><br /><span className="muted">{job.status} · {job.detail}</span></p>
              ))}
            </section>
            <section className="chat-context-card">
              <span className="eyebrow">Media/message policy screens</span>
              {policyScreens.map((policy) => (
                <p key={policy.title}><strong>{policy.title}</strong><br /><span className="muted">{policy.detail}</span></p>
              ))}
            </section>
          </aside>
        </section>
      )}
    </div>
  );
}
