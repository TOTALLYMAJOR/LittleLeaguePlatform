export type UserRole = "admin" | "coach" | "parent";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type DeliveryStatus = "queued" | "sent" | "failed";
export type EventStatus = "scheduled" | "cancelled" | "completed";
export type EventType = "game" | "practice" | "team_event";
export type RsvpResponse = "going" | "not_going" | "maybe";
export type NotificationType = "schedule_changed" | "event_cancelled" | "new_event" | "invite_sent" | "invite_recovered" | "parent_replay_ready" | "team_broadcast";
export type NotificationChannel = "push" | "email" | "sms";
export type NotificationPreferenceType = NotificationType | "weather_alert" | "chat_announcement" | "volunteer_reminder" | "snack_reminder";
export type ImportSeverity = "valid" | "warning" | "error";
export type ChatMessageKind = "message" | "announcement";
export type ChatAnnouncementTopic = "game_time" | "field_location" | "uniforms" | "snacks" | "weather" | "reminder";
export type ChatModerationStatus = "visible" | "hidden" | "deleted";
export type ChatModerationAction = "message_hidden" | "message_deleted" | "message_restored";
export type PracticeFocusArea = "catching" | "throwing" | "teamwork" | "spacing" | "hitting" | "base_running" | "listening" | "sportsmanship";
export type ParentReplayStatus = "draft" | "queued";
export type ParentReplayDuration = "30_seconds" | "2_minutes" | "5_minutes";
export type ProgramThemeKey = "soccer" | "football" | "baseball" | "scouts" | "golf" | "tennis" | "swim" | "generic";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type VolunteerSignupStatus = "open" | "filled";

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Season {
  id: string;
  organizationId: string;
  name: string;
  status: "active" | "archived";
  startsAt: string;
  endsAt: string;
  archivedAt?: string;
}

export interface Team {
  id: string;
  organizationId: string;
  seasonId: string;
  division: string;
  name: string;
  coachUserId?: string;
  mascot: string;
  primaryColor: string;
  secondaryColor: string;
  themeKey: ProgramThemeKey;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: "coach" | "parent";
  status: "active" | "invited" | "removed";
}

export interface Player {
  id: string;
  organizationId: string;
  seasonId: string;
  teamId: string;
  firstName: string;
  lastInitial: string;
  jersey: string;
}

export interface GuardianLink {
  id: string;
  playerId: string;
  parentUserId?: string;
  parentInviteId?: string;
  relationship: "mother" | "father" | "guardian" | "other";
  status: "invited" | "active" | "removed";
}

export interface ParentInvite {
  id: string;
  organizationId: string;
  teamId: string;
  playerId: string;
  email: string;
  phone: string;
  inviteTokenHash: string;
  status: InviteStatus;
  deliveryStatus: DeliveryStatus;
  sentCount: number;
  resendTimestamps: string[];
  lastSentAt?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeagueEvent {
  id: string;
  organizationId: string;
  teamId: string;
  seasonId: string;
  title: string;
  eventType: EventType;
  startsAt: string;
  endsAt: string;
  locationName: string;
  locationAddress: string;
  status: EventStatus;
  opponent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rsvp {
  id: string;
  eventId: string;
  playerId: string;
  parentUserId: string;
  response: RsvpResponse;
  note?: string;
  respondedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  teamId: string;
  authorUserId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  teamId: string;
  title: string;
  type: "google_photos" | "youtube";
  url: string;
  moderationStatus?: "pending" | "approved" | "hidden" | "rejected" | "removed";
  visibility?: "team" | "organization";
  reportCount?: number;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  organizationId: string;
  recipientUserId: string;
  teamId: string;
  eventId?: string;
  notificationType: NotificationType;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: "pending" | "sent" | "failed" | "read";
  createdAt: string;
  sentAt?: string;
  readAt?: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  organizationId?: string;
  teamId?: string;
  channel: NotificationChannel;
  notificationType: NotificationPreferenceType;
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  optedInAt?: string;
  optedOutAt?: string;
}

export interface ParentReplayHomeActivity {
  duration: ParentReplayDuration;
  title: string;
  coachCue?: string;
  parentGoal?: string;
  steps: string[];
}

export interface ParentReplayDraft {
  teamId: string;
  coachUserId: string;
  focusAreas: PracticeFocusArea[];
  title: string;
  summary: string;
  homeActivities: ParentReplayHomeActivity[];
  parentTranslations: {
    coachTerm: string;
    parentInstruction: string;
  }[];
  microCoachingStreak: {
    label: string;
    completedFamilies: number;
    totalFamilies: number;
    completionRate: number;
  };
  memoryMoment: {
    title: string;
    detail: string;
  };
  coachVideo: {
    title: string;
    url: string;
    note: string;
  };
  parentTip: string;
  teamQuest: string;
  skillCards: string[];
  parentEducation: string;
  generatedAt: string;
}

export interface ParentReplayRecord extends ParentReplayDraft {
  id: string;
  organizationId: string;
  seasonId: string;
  status: ParentReplayStatus;
  createdAt: string;
}

export interface RegistrationRequest {
  id: string;
  organizationId: string;
  seasonId: string;
  teamId: string;
  parentName: string;
  parentEmail: string;
  playerFirstName: string;
  playerLastInitial: string;
  status: RegistrationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
}

export interface SnackScheduleSlot {
  id: string;
  teamId: string;
  eventId: string;
  assignedParentUserId?: string;
  item: string;
  status: "open" | "assigned";
}

export interface VolunteerSignup {
  id: string;
  teamId: string;
  eventId?: string;
  role: string;
  assignedUserId?: string;
  status: VolunteerSignupStatus;
}

export interface Sponsor {
  id: string;
  organizationId: string;
  name: string;
  level: "league" | "team";
  teamId?: string;
  url: string;
  status: "active" | "pending" | "expired";
  placementKey?: "team_portal" | "weekly_digest" | "storybook" | "registration" | "field_map";
  logoUrl?: string;
}

export interface WeatherAlert {
  id: string;
  teamId: string;
  eventId: string;
  headline: string;
  detail: string;
  severity: "watch" | "delay" | "cancel_risk";
  status: "draft" | "queued";
  createdAt: string;
}

export interface TeamChatChannel {
  id: string;
  organizationId: string;
  seasonId: string;
  teamId: string;
  pinnedMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamChatMessage {
  id: string;
  channelId: string;
  organizationId: string;
  teamId: string;
  authorUserId: string;
  authorRole: UserRole;
  kind: ChatMessageKind;
  topic?: ChatAnnouncementTopic;
  body: string;
  eventId?: string;
  pinned: boolean;
  moderationStatus: ChatModerationStatus;
  readByUserIds: string[];
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  moderatedAt?: string;
  moderatedByUserId?: string;
  moderationReason?: string;
}

export interface ChatModerationAuditEvent {
  id: string;
  messageId: string;
  channelId: string;
  teamId: string;
  actorUserId: string;
  actorRole: UserRole;
  action: ChatModerationAction;
  reason: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

export interface RosterImportIssue {
  code: string;
  severity: Exclude<ImportSeverity, "valid">;
  message: string;
}

export interface RosterImportPreviewRow {
  rowNumber: number;
  raw: Record<string, string>;
  normalized: {
    teamName: string;
    teamId?: string;
    division: string;
    firstName: string;
    lastInitial: string;
    jersey: string;
    parentName: string;
    parentEmail: string;
    parentPhone: string;
  };
  status: ImportSeverity;
  issues: RosterImportIssue[];
}

export interface RosterImportAnalysis {
  id: string;
  status: "validated" | "committed";
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  rows: RosterImportPreviewRow[];
  createdAt: string;
  committedAt?: string;
}

export interface AppState {
  organization: Organization;
  activeSeason: Season;
  users: User[];
  teams: Team[];
  teamMemberships: TeamMembership[];
  players: Player[];
  guardianLinks: GuardianLink[];
  parentInvites: ParentInvite[];
  events: LeagueEvent[];
  rsvps: Rsvp[];
  announcements: Announcement[];
  mediaItems: MediaItem[];
  notifications: NotificationRecord[];
  notificationPreferences: NotificationPreference[];
  parentReplays: ParentReplayRecord[];
  registrationRequests: RegistrationRequest[];
  snackScheduleSlots: SnackScheduleSlot[];
  volunteerSignups: VolunteerSignup[];
  sponsors: Sponsor[];
  weatherAlerts: WeatherAlert[];
  teamChatChannels: TeamChatChannel[];
  chatMessages: TeamChatMessage[];
  chatModerationAuditEvents: ChatModerationAuditEvent[];
  auditEvents: AuditEvent[];
  rosterImportReports: RosterImportAnalysis[];
}
