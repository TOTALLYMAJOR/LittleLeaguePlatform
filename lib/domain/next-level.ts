import type { AppState, LeagueEvent, NotificationChannel, NotificationPreferenceType, UserRole } from "./types";
import type { DrillVideo } from "./drill-videos";
import { getParentDashboard } from "./parent-dashboard";
import { getCoachRsvpSummaries } from "./rsvp";
import { getNotificationChannelReadiness, getScheduleNotificationWorkflow, getVapidSendAdapterStatus } from "./notifications";

export type NextLevelRole = "public" | UserRole;
export type NextLevelStatus = "ready" | "needs_action" | "review" | "deferred";

export type NextLevelModuleId =
  | "today_dashboard"
  | "guided_onboarding"
  | "admin_command_center"
  | "registration_review"
  | "coach_practice_planner"
  | "drill_video_collections"
  | "parent_recap_timeline"
  | "family_notification_center"
  | "provider_review"
  | "mobile_pwa_install"
  | "push_preferences"
  | "schedule_conflict_detector";

export interface NextLevelAction {
  id: string;
  label: string;
  detail: string;
  href: string;
  status: NextLevelStatus;
}

export interface NextLevelChecklistItem {
  id: string;
  label: string;
  done: boolean;
  detail: string;
  href: string;
}

export interface NextLevelModule {
  id: NextLevelModuleId;
  rank: number;
  title: string;
  route: string;
  status: NextLevelStatus;
  metric: string;
  detail: string;
  boundary: string;
}

export interface DrillVideoCollectionSummary {
  key: string;
  label: string;
  count: number;
  approvedCount: number;
  beginnerCount: number;
}

export interface ScheduleConflictSummary {
  total: number;
  conflicts: Array<{
    id: string;
    leftEvent: LeagueEvent;
    rightEvent: LeagueEvent;
    reasons: string[];
  }>;
}

export interface NextLevelCommandCenter {
  role: NextLevelRole;
  title: string;
  summary: string;
  primaryHref: string;
  today: NextLevelAction[];
  onboarding: NextLevelChecklistItem[];
  modules: NextLevelModule[];
  drillCollections: DrillVideoCollectionSummary[];
  scheduleConflicts: ScheduleConflictSummary;
  notificationChannels: Array<{
    channel: NotificationChannel;
    label: string;
    status: "ok" | "warning";
    detail: string;
  }>;
  providerBoundary: string;
  pwaInstall: {
    status: NextLevelStatus;
    detail: string;
  };
}

export interface BuildNextLevelCommandCenterInput {
  role: NextLevelRole;
  now?: string;
  userId?: string;
  drillVideos?: DrillVideo[];
}

function statusForCount(count: number, goodWhenZero = false): NextLevelStatus {
  if (goodWhenZero) return count === 0 ? "ready" : "needs_action";
  return count > 0 ? "needs_action" : "ready";
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function nextScheduledEvents(state: AppState, now: string) {
  const nowMs = Date.parse(now);
  return state.events
    .filter((event) => event.status === "scheduled" && Date.parse(event.startsAt) >= nowMs)
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}

function rangesOverlap(left: LeagueEvent, right: LeagueEvent) {
  return Date.parse(left.startsAt) < Date.parse(right.endsAt) && Date.parse(left.endsAt) > Date.parse(right.startsAt);
}

export function getScheduleConflictSummary(state: AppState, now = new Date().toISOString()): ScheduleConflictSummary {
  const events = nextScheduledEvents(state, now);
  const conflicts: ScheduleConflictSummary["conflicts"] = [];

  events.forEach((leftEvent, leftIndex) => {
    events.slice(leftIndex + 1).forEach((rightEvent) => {
      if (!rangesOverlap(leftEvent, rightEvent)) return;
      const reasons = [
        leftEvent.teamId === rightEvent.teamId ? "team overlap" : "",
        leftEvent.locationName.toLowerCase() === rightEvent.locationName.toLowerCase() ? "venue overlap" : ""
      ].filter(Boolean);
      if (!reasons.length) return;
      conflicts.push({
        id: `${leftEvent.id}-${rightEvent.id}`,
        leftEvent,
        rightEvent,
        reasons
      });
    });
  });

  return { total: conflicts.length, conflicts };
}

export function buildDrillVideoCollections(videos: DrillVideo[] = []): DrillVideoCollectionSummary[] {
  const groups = new Map<string, DrillVideoCollectionSummary>();
  videos.forEach((video) => {
    const key = `${video.sport.toLowerCase()}|${video.skillCategory.toLowerCase()}|${video.ageBand.toLowerCase()}`;
    const label = `${video.sport} / ${video.skillCategory} / ${video.ageBand}`;
    const current = groups.get(key) ?? {
      key,
      label,
      count: 0,
      approvedCount: 0,
      beginnerCount: 0
    };
    current.count += 1;
    if (video.approvalStatus === "approved") current.approvedCount += 1;
    if (video.difficulty === "beginner") current.beginnerCount += 1;
    groups.set(key, current);
  });

  return Array.from(groups.values()).sort((left, right) => (
    right.approvedCount - left.approvedCount ||
    right.count - left.count ||
    left.label.localeCompare(right.label)
  ));
}

function buildTodayActions(state: AppState, input: Required<Pick<BuildNextLevelCommandCenterInput, "role" | "now">> & Pick<BuildNextLevelCommandCenterInput, "userId">): NextLevelAction[] {
  const events = nextScheduledEvents(state, input.now);
  const pendingRegistrations = state.registrationRequests.filter((request) => request.status === "pending");
  const pendingNotifications = state.notifications.filter((notification) => notification.status === "pending");
  const firstEvent = events[0];

  if (input.role === "parent") {
    const parentUserId = input.userId ?? state.users.find((user) => user.role === "parent")?.id ?? "";
    const dashboard = getParentDashboard(state, parentUserId, input.now);
    return [
      {
        id: "parent-rsvp",
        label: dashboard.rsvpNeeded.length ? "Answer RSVP" : "RSVPs clear",
        detail: dashboard.rsvpNeeded.length ? `${dashboard.rsvpNeeded.length} linked child RSVP response(s) are open.` : "Visible linked-child RSVPs are answered.",
        href: "/parent/rsvp",
        status: dashboard.rsvpNeeded.length ? "needs_action" : "ready"
      },
      {
        id: "parent-event",
        label: dashboard.nextEvents[0]?.title ?? "No upcoming event",
        detail: dashboard.nextEvents[0] ? `${dashboard.nextEvents[0].locationName} is next for the family.` : "No linked team event is scheduled yet.",
        href: "/parent/schedule",
        status: dashboard.nextEvents.length ? "ready" : "review"
      },
      {
        id: "parent-notifications",
        label: "Notification rules",
        detail: state.notificationPreferences.some((preference) => preference.userId === parentUserId) ? "Family preference records exist." : "Set push/email/SMS quiet-hour preferences.",
        href: "/parent/settings",
        status: state.notificationPreferences.some((preference) => preference.userId === parentUserId) ? "ready" : "needs_action"
      }
    ];
  }

  if (input.role === "coach") {
    const coachUserId = input.userId ?? state.users.find((user) => user.role === "coach")?.id ?? "";
    const summaries = getCoachRsvpSummaries(state, coachUserId, input.now);
    const noResponse = summaries.reduce((total, summary) => total + summary.noResponse, 0);
    const assignedTeamCount = state.teamMemberships.filter((membership) => membership.userId === coachUserId && membership.role === "coach" && membership.status === "active").length;
    return [
      {
        id: "coach-readiness",
        label: summaries[0]?.event.title ?? "No assigned event",
        detail: summaries[0] ? `${summaries[0].noResponse} no-response player slot(s) on the next assigned event.` : "No assigned upcoming event is visible.",
        href: "/coach/attendance",
        status: noResponse ? "needs_action" : "ready"
      },
      {
        id: "coach-practice",
        label: "Practice planner",
        detail: "Open recaps, Rookie Coach Assist, approved drill videos, and Parent Replay.",
        href: "/coach/practice-recaps",
        status: "ready"
      },
      {
        id: "coach-team",
        label: "Assigned teams",
        detail: assignedTeamCount ? formatCount(assignedTeamCount, "active team") : "No active coach membership is visible.",
        href: "/coach",
        status: assignedTeamCount ? "ready" : "needs_action"
      }
    ];
  }

  if (input.role === "admin") {
    const missingCoaches = state.teams.filter((team) => !team.coachUserId).length;
    return [
      {
        id: "admin-registrations",
        label: "Registration queue",
        detail: pendingRegistrations.length ? `${pendingRegistrations.length} family request(s) need review.` : "No family request is pending.",
        href: "/admin/registrations",
        status: pendingRegistrations.length ? "needs_action" : "ready"
      },
      {
        id: "admin-setup",
        label: "Team setup",
        detail: missingCoaches ? `${missingCoaches} team(s) need a coach assignment.` : "Active teams have coach assignments.",
        href: "/admin/teams",
        status: missingCoaches ? "needs_action" : "ready"
      },
      {
        id: "admin-provider",
        label: "Provider review",
        detail: pendingNotifications.length ? `${pendingNotifications.length} notification record(s) are pending human review.` : "No pending notification record is queued.",
        href: "/admin/message-delivery-review",
        status: pendingNotifications.length ? "review" : "ready"
      }
    ];
  }

  return [
    {
      id: "public-access",
      label: "Start access",
      detail: "Sign in if approved or request family access before private tools unlock.",
      href: "/registration",
      status: "needs_action"
    },
    {
      id: "public-calendar",
      label: firstEvent?.title ?? "Public calendar",
      detail: firstEvent ? `${firstEvent.locationName} is the next public schedule item.` : "Calendar stays read-only before approval.",
      href: "/schedule",
      status: "ready"
    },
    {
      id: "public-signin",
      label: "Already approved?",
      detail: "Use the approved account to reveal parent, coach, or admin tools.",
      href: "/auth",
      status: "ready"
    }
  ];
}

function buildOnboarding(state: AppState, role: NextLevelRole, userId?: string): NextLevelChecklistItem[] {
  const firstParentId = userId ?? state.users.find((user) => user.role === "parent")?.id ?? "";
  const firstCoachId = userId ?? state.users.find((user) => user.role === "coach")?.id ?? "";
  const parentDashboard = firstParentId ? getParentDashboard(state, firstParentId) : undefined;
  const coachTeamCount = state.teamMemberships.filter((membership) => membership.userId === firstCoachId && membership.role === "coach" && membership.status === "active").length;

  if (role === "parent") {
    return [
      { id: "guardian-link", label: "Approved family link", done: Boolean(parentDashboard?.children.length), detail: parentDashboard?.completionStatus ?? "No linked child is visible yet.", href: "/parent/family-access" },
      { id: "first-rsvp", label: "First RSVP checked", done: Boolean(parentDashboard && parentDashboard.rsvpNeeded.length === 0 && parentDashboard.nextEvents.length), detail: parentDashboard?.rsvpNeeded.length ? `${parentDashboard.rsvpNeeded.length} RSVP(s) still need a response.` : "No visible RSVP gap.", href: "/parent/rsvp" },
      { id: "alerts", label: "Notification rules reviewed", done: state.notificationPreferences.some((preference) => preference.userId === firstParentId), detail: "Push, email, SMS, and quiet hours stay parent-controlled.", href: "/parent/settings" },
      { id: "team-home", label: "Team home opened", done: Boolean(parentDashboard?.latestAnnouncement || parentDashboard?.recentMedia.length), detail: "Coach updates, media, and practice recaps live behind approved team access.", href: "/parent" }
    ];
  }

  if (role === "coach") {
    return [
      { id: "coach-membership", label: "Assigned team confirmed", done: coachTeamCount > 0, detail: coachTeamCount ? formatCount(coachTeamCount, "active team") : "No active coach membership is visible.", href: "/coach" },
      { id: "attendance", label: "Attendance reviewed", done: getCoachRsvpSummaries(state, firstCoachId).length > 0, detail: "RSVP gaps and attendance summaries are coach-scoped.", href: "/coach/attendance" },
      { id: "practice-plan", label: "Practice planner ready", done: true, detail: "Rookie Coach Assist, Parent Replay, and drill-video references are grouped in practice recaps.", href: "/coach/practice-recaps" },
      { id: "provider-boundary", label: "Provider boundary understood", done: true, detail: "Coach drafts do not send email, SMS, push, or AI output without review gates.", href: "/coach/drafts" }
    ];
  }

  if (role === "admin") {
    return [
      { id: "teams", label: "Season teams reviewed", done: state.teams.length > 0, detail: formatCount(state.teams.length, "team"), href: "/admin/teams" },
      { id: "registrations", label: "Registration queue reviewed", done: state.registrationRequests.filter((request) => request.status === "pending").length === 0, detail: `${state.registrationRequests.filter((request) => request.status === "pending").length} pending request(s).`, href: "/admin/registrations" },
      { id: "provider-review", label: "Provider review queue checked", done: state.notifications.filter((notification) => notification.status === "pending").length === 0, detail: "Notification records stay review-only until provider adapters are approved.", href: "/admin/message-delivery-review" },
      { id: "security-proof", label: "Security proof opened", done: true, detail: "RLS, role gates, and audit proof remain the launch boundary.", href: "/admin/security-audit" }
    ];
  }

  return [
    { id: "calendar", label: "Check public calendar", done: state.events.length > 0, detail: "Public schedule is read-only before role approval.", href: "/schedule" },
    { id: "request-access", label: "Request access", done: false, detail: "Families submit requests before private access opens.", href: "/registration" },
    { id: "signin", label: "Sign in after approval", done: false, detail: "Approved roles reveal parent, coach, or admin tools.", href: "/auth" }
  ];
}

export function buildNextLevelCommandCenter(state: AppState, input: BuildNextLevelCommandCenterInput): NextLevelCommandCenter {
  const now = input.now ?? new Date().toISOString();
  const role = input.role;
  const pendingRegistrations = state.registrationRequests.filter((request) => request.status === "pending").length;
  const pendingNotifications = state.notifications.filter((notification) => notification.status === "pending").length;
  const failedNotifications = state.notifications.filter((notification) => notification.status === "failed").length;
  const parentReplayCount = state.parentReplays.length;
  const events = nextScheduledEvents(state, now);
  const scheduleConflicts = getScheduleConflictSummary(state, now);
  const drillCollections = buildDrillVideoCollections(input.drillVideos);
  const approvedDrillVideos = (input.drillVideos ?? []).filter((video) => video.approvalStatus === "approved").length;
  const notificationChannels = getNotificationChannelReadiness(state);
  const scheduleWorkflow = getScheduleNotificationWorkflow(state);
  const vapidStatus = getVapidSendAdapterStatus();
  const teamSetupGaps = state.teams.filter((team) => !team.coachUserId).length + state.teams.filter((team) => !events.some((event) => event.teamId === team.id)).length;
  const pushPreferenceCount = state.notificationPreferences.filter((preference) => preference.channel === "push").length;
  const preferenceTypes = new Set<NotificationPreferenceType>(state.notificationPreferences.map((preference) => preference.notificationType));

  const modules: NextLevelModule[] = [
    {
      id: "today_dashboard",
      rank: 1,
      title: "Role-based Today dashboard",
      route: role === "admin" ? "/admin" : role === "coach" ? "/coach" : role === "parent" ? "/parent" : "/",
      status: "ready",
      metric: formatCount(events.length, "upcoming event"),
      detail: "Each role now gets a short action list before dense operations content.",
      boundary: "The dashboard is a read model; route handlers and RLS still enforce protected writes."
    },
    {
      id: "guided_onboarding",
      rank: 2,
      title: "Guided onboarding checklist",
      route: role === "admin" ? "/admin/teams" : role === "coach" ? "/coach" : role === "parent" ? "/parent/family-access" : "/registration",
      status: buildOnboarding(state, role, input.userId).every((item) => item.done) ? "ready" : "needs_action",
      metric: `${buildOnboarding(state, role, input.userId).filter((item) => item.done).length}/${buildOnboarding(state, role, input.userId).length} done`,
      detail: "Role-specific setup items show what is ready and what still needs review.",
      boundary: "Checklist completion never grants access by itself."
    },
    {
      id: "admin_command_center",
      rank: 3,
      title: "Admin command center",
      route: "/admin",
      status: pendingRegistrations + pendingNotifications + failedNotifications + teamSetupGaps ? "needs_action" : "ready",
      metric: formatCount(pendingRegistrations + pendingNotifications + failedNotifications + teamSetupGaps, "open signal"),
      detail: "Registration, team setup, provider review, and launch proof are consolidated.",
      boundary: "Admin surfaces require active organization admin access."
    },
    {
      id: "registration_review",
      rank: 4,
      title: "Registration approval polish",
      route: "/admin/registrations",
      status: statusForCount(pendingRegistrations, true),
      metric: formatCount(pendingRegistrations, "pending request"),
      detail: "Family requests stay pending until an admin reviews guardian and team scope.",
      boundary: "Submitting registration never creates a login or child access grant."
    },
    {
      id: "coach_practice_planner",
      rank: 5,
      title: "Coach practice planner",
      route: "/coach/practice-recaps",
      status: "ready",
      metric: `${parentReplayCount} replay record(s)`,
      detail: "Practice recaps connect focus areas, Rookie Coach Assist, approved drill references, and Parent Replay.",
      boundary: "Coach planning tools produce reviewed drafts; provider sends remain disconnected."
    },
    {
      id: "drill_video_collections",
      rank: 6,
      title: "Drill-video collections",
      route: "/coach/practice-recaps",
      status: approvedDrillVideos ? "ready" : "review",
      metric: `${approvedDrillVideos} approved video(s)`,
      detail: drillCollections.length ? `${drillCollections.length} sport/skill/age collection(s) are grouped for coach planning.` : "Approved YouTube metadata will group into sport, skill, and age collections.",
      boundary: "Links only. Videos are never downloaded, re-hosted, clipped, or released to families."
    },
    {
      id: "parent_recap_timeline",
      rank: 7,
      title: "Parent recap timeline",
      route: "/parent/practice-recaps",
      status: parentReplayCount || state.announcements.length || state.mediaItems.length ? "ready" : "review",
      metric: formatCount(parentReplayCount + state.announcements.length + state.mediaItems.length, "timeline item"),
      detail: "Coach updates, media, and replay records create a family-facing season story when approved.",
      boundary: "Only approved/scoped team rows should appear to families."
    },
    {
      id: "family_notification_center",
      rank: 8,
      title: "Family notification center",
      route: role === "admin" ? "/admin/message-delivery-review" : "/parent/settings",
      status: scheduleWorkflow.total || state.notificationPreferences.length ? "ready" : "needs_action",
      metric: `${scheduleWorkflow.total} alert record(s)`,
      detail: "Families see alert preferences while admins review pending delivery records.",
      boundary: scheduleWorkflow.boundary
    },
    {
      id: "provider_review",
      rank: 9,
      title: "Human-approved provider sends",
      route: "/admin/message-delivery-review",
      status: pendingNotifications + failedNotifications ? "review" : "ready",
      metric: `${pendingNotifications} pending / ${failedNotifications} failed`,
      detail: "Provider delivery is modeled as a review queue with retry planning, not automatic sending.",
      boundary: "Nothing is emailed, texted, or pushed to families until a message service is set up and someone approves it."
    },
    {
      id: "mobile_pwa_install",
      rank: 10,
      title: "Mobile-first PWA install flow",
      route: "/offline",
      status: "ready",
      metric: vapidStatus.status,
      detail: "Manifest, install prompt, usage events, and offline fallback support mobile-first access.",
      boundary: "Native app distribution remains deferred until PWA usage proves the need."
    },
    {
      id: "push_preferences",
      rank: 11,
      title: "Push notification preferences",
      route: "/parent/settings",
      status: pushPreferenceCount ? "ready" : "needs_action",
      metric: `${pushPreferenceCount} push preference(s)`,
      detail: preferenceTypes.size ? `${preferenceTypes.size} notification type(s) have preference coverage.` : "Parents still need channel, quiet-hour, and alert-type preference records.",
      boundary: "Preference records do not mean push provider delivery is enabled."
    },
    {
      id: "schedule_conflict_detector",
      rank: 12,
      title: "Schedule conflict detector",
      route: "/admin/schedule-venues",
      status: scheduleConflicts.total ? "needs_action" : "ready",
      metric: formatCount(scheduleConflicts.total, "conflict"),
      detail: "Team and venue overlaps are detected before schedule changes are saved.",
      boundary: "Conflicts require a human schedule edit; the app does not auto-move events."
    }
  ];

  return {
    role,
    title: role === "admin"
      ? "Admin command center"
      : role === "coach"
        ? "Coach practice command"
        : role === "parent"
          ? "Family today center"
          : "Start the season in the right place",
    summary: role === "public"
      ? "The top 12 upgrade path is visible before sign-in, while private team data stays gated."
      : "The top 12 upgrade path is now connected to the role surface you are using.",
    primaryHref: role === "admin" ? "/admin" : role === "coach" ? "/coach/practice-recaps" : role === "parent" ? "/parent/rsvp" : "/registration",
    today: buildTodayActions(state, { role, now, userId: input.userId }),
    onboarding: buildOnboarding(state, role, input.userId),
    modules,
    drillCollections,
    scheduleConflicts,
    notificationChannels,
    providerBoundary: "Provider sends remain human-approved records only until live adapters, credentials, webhooks, preferences, suppression, audit, and hosted proof are complete.",
    pwaInstall: {
      status: "ready",
      detail: "Install prompt, production service worker, mobile usage events, and offline fallback are wired; app-store/native release remains deferred."
    }
  };
}
