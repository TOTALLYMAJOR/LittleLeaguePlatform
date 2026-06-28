export const USER_ROLES = ["admin", "coach", "parent"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const INVITE_STATUSES = ["pending", "accepted", "expired", "revoked"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const DELIVERY_STATUSES = ["queued", "sent", "failed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const EVENT_STATUSES = ["scheduled", "cancelled", "completed"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = ["game", "practice", "team_event"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const RSVP_RESPONSES = ["going", "not_going", "maybe", "cancelled"] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

export const NOTIFICATION_TYPES = [
  "schedule_changed",
  "event_cancelled",
  "new_event",
  "invite_sent",
  "invite_recovered",
  "parent_replay_ready",
  "team_broadcast"
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["push", "email", "sms"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_PREFERENCE_TYPES = [
  ...NOTIFICATION_TYPES,
  "weather_alert",
  "chat_announcement",
  "volunteer_reminder",
  "snack_reminder"
] as const;
export type NotificationPreferenceType = (typeof NOTIFICATION_PREFERENCE_TYPES)[number];

export const IMPORT_SEVERITIES = ["valid", "warning", "error"] as const;
export type ImportSeverity = (typeof IMPORT_SEVERITIES)[number];

export const CHAT_MESSAGE_KINDS = ["message", "announcement"] as const;
export type ChatMessageKind = (typeof CHAT_MESSAGE_KINDS)[number];

export const CHAT_ANNOUNCEMENT_TOPICS = ["game_time", "field_location", "uniforms", "snacks", "weather", "reminder"] as const;
export type ChatAnnouncementTopic = (typeof CHAT_ANNOUNCEMENT_TOPICS)[number];

export const CHAT_MODERATION_STATUSES = ["visible", "hidden", "deleted"] as const;
export type ChatModerationStatus = (typeof CHAT_MODERATION_STATUSES)[number];

export const CHAT_MODERATION_ACTIONS = ["message_hidden", "message_deleted", "message_restored"] as const;
export type ChatModerationAction = (typeof CHAT_MODERATION_ACTIONS)[number];

export const PRACTICE_FOCUS_AREAS = [
  "catching",
  "throwing",
  "teamwork",
  "spacing",
  "hitting",
  "base_running",
  "listening",
  "sportsmanship"
] as const;
export type PracticeFocusArea = (typeof PRACTICE_FOCUS_AREAS)[number];

export const PARENT_REPLAY_STATUSES = ["draft", "queued"] as const;
export type ParentReplayStatus = (typeof PARENT_REPLAY_STATUSES)[number];

export const PARENT_REPLAY_DURATIONS = ["30_seconds", "2_minutes", "5_minutes"] as const;
export type ParentReplayDuration = (typeof PARENT_REPLAY_DURATIONS)[number];

export const PROGRAM_THEME_KEYS = ["soccer", "football", "baseball", "scouts", "golf", "tennis", "swim", "generic"] as const;
export type ProgramThemeKey = (typeof PROGRAM_THEME_KEYS)[number];

export const REGISTRATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const VOLUNTEER_SIGNUP_STATUSES = ["open", "filled"] as const;
export type VolunteerSignupStatus = (typeof VOLUNTEER_SIGNUP_STATUSES)[number];

export const SEASON_STATUSES = ["active", "archived"] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const TEAM_MEMBERSHIP_ROLES = ["coach", "parent"] as const;
export type TeamMembershipRole = (typeof TEAM_MEMBERSHIP_ROLES)[number];

export const TEAM_MEMBERSHIP_STATUSES = ["active", "invited", "removed"] as const;
export type TeamMembershipStatus = (typeof TEAM_MEMBERSHIP_STATUSES)[number];

export const GUARDIAN_RELATIONSHIPS = ["mother", "father", "guardian", "other"] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

export const GUARDIAN_LINK_STATUSES = ["invited", "active", "removed"] as const;
export type GuardianLinkStatus = (typeof GUARDIAN_LINK_STATUSES)[number];

export const MEDIA_ITEM_TYPES = ["google_photos", "youtube"] as const;
export type MediaItemType = (typeof MEDIA_ITEM_TYPES)[number];

export const MEDIA_MODERATION_STATUSES = ["pending", "approved", "hidden", "rejected", "removed"] as const;
export type MediaModerationStatus = (typeof MEDIA_MODERATION_STATUSES)[number];

export const MEDIA_VISIBILITIES = ["team", "organization"] as const;
export type MediaVisibility = (typeof MEDIA_VISIBILITIES)[number];

export const NOTIFICATION_STATUSES = ["pending", "sent", "failed", "read"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const SNACK_SCHEDULE_SLOT_STATUSES = ["open", "assigned"] as const;
export type SnackScheduleSlotStatus = (typeof SNACK_SCHEDULE_SLOT_STATUSES)[number];

export const SPONSOR_LEVELS = ["league", "team"] as const;
export type SponsorLevel = (typeof SPONSOR_LEVELS)[number];

export const SPONSOR_STATUSES = ["active", "pending", "expired"] as const;
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];

export const SPONSOR_PLACEMENT_KEYS = ["team_portal", "weekly_digest", "storybook", "registration", "field_map"] as const;
export type SponsorPlacementKey = (typeof SPONSOR_PLACEMENT_KEYS)[number];

export const WEATHER_ALERT_SEVERITIES = ["watch", "delay", "cancel_risk"] as const;
export type WeatherAlertSeverity = (typeof WEATHER_ALERT_SEVERITIES)[number];

export const WEATHER_ALERT_STATUSES = ["draft", "queued"] as const;
export type WeatherAlertStatus = (typeof WEATHER_ALERT_STATUSES)[number];

export const ROSTER_IMPORT_STATUSES = ["validated", "committed"] as const;
export type RosterImportStatus = (typeof ROSTER_IMPORT_STATUSES)[number];

export const BRAND_MONITORING_EVENT_TYPES = [
  "brand_profile_created",
  "brand_profile_updated",
  "brand_profile_published",
  "brand_asset_uploaded",
  "brand_asset_rejected",
  "brand_render_failed",
  "brand_fallback_used"
] as const;
export type BrandMonitoringEventType = (typeof BRAND_MONITORING_EVENT_TYPES)[number];

export const BRAND_SURFACE_IDS = [
  "team_logo",
  "team_banner",
  "primary_color",
  "secondary_color",
  "accent_button_color",
  "team_display_name",
  "team_short_name",
  "default_avatar",
  "home_dashboard_header",
  "navigation_accents",
  "chat_thread_header",
  "announcement_cards",
  "event_schedule_cards",
  "rsvp_buttons_badges",
  "roster_page_header",
  "photo_gallery_header",
  "invite_landing_page",
  "invite_emails",
  "announcement_reminder_emails",
  "push_notification_identity"
] as const;
export type BrandSurfaceId = (typeof BRAND_SURFACE_IDS)[number];

export const BRAND_SURFACES = ["web", "email", "push"] as const;
export type BrandSurface = (typeof BRAND_SURFACES)[number];

export const BRAND_SURFACE_STATUSES = ["covered", "blocked"] as const;
export type BrandSurfaceStatus = (typeof BRAND_SURFACE_STATUSES)[number];

export const BRAND_METRIC_STATUSES = ["covered", "needs_provider", "needs_qa"] as const;
export type BrandMetricStatus = (typeof BRAND_METRIC_STATUSES)[number];

export const INVITE_RECOVERY_CODES = [
  "not_found",
  "season_inactive",
  "already_registered",
  "revoked",
  "expired",
  "rate_limited_hour",
  "rate_limited_day",
  "eligible"
] as const;
export type InviteRecoveryCode = (typeof INVITE_RECOVERY_CODES)[number];

export const HEALTH_STATUSES = ["ok", "warning", "danger"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const PLATFORM_FEATURE_STATUSES = ["implemented", "scaffolded", "planned"] as const;
export type PlatformFeatureStatus = (typeof PLATFORM_FEATURE_STATUSES)[number];

export const PLATFORM_FEATURE_TIERS = ["Tier 1", "Tier 2", "Tier 3", "Signature"] as const;
export type PlatformFeatureTierName = (typeof PLATFORM_FEATURE_TIERS)[number];

export const COMMUNICATION_TEMPLATES = ["weekly_digest", "game_day_reminder", "practice_replay", "custom"] as const;
export type CommunicationTemplate = (typeof COMMUNICATION_TEMPLATES)[number];

export const SPONSOR_BILLING_STATUSES = ["draft", "invoice_ready", "payment_recorded"] as const;
export type SponsorBillingStatus = (typeof SPONSOR_BILLING_STATUSES)[number];

export const SPONSOR_PAYMENT_PROOF_STATUSES = ["not_requested", "awaiting_invoice", "paid"] as const;
export type SponsorPaymentProofStatus = (typeof SPONSOR_PAYMENT_PROOF_STATUSES)[number];

export const SPONSOR_BILLING_WORKFLOW_STATES = ["Draft", "Review", "Invoice", "Record payment proof"] as const;
export type SponsorBillingWorkflowState = (typeof SPONSOR_BILLING_WORKFLOW_STATES)[number];

export const REVIEW_WORKFLOW_STATES = ["Preview", "Edit", "Approve", "Publish"] as const;
export type ReviewWorkflowState = (typeof REVIEW_WORKFLOW_STATES)[number];

export const AI_COACH_WORKSPACE_TOOL_IDS = [
  "new_parent_brief",
  "team_onboarding_brief",
  "weekly_digest",
  "practice_replay",
  "announcement_cleaner",
  "smart_faq",
  "coach_inbox_prioritization",
  "game_day_parent_brief",
  "season_timeline",
  "coach_knowledge_base",
  "action_item_extraction",
  "safety_monitor",
  "season_storybook"
] as const;
export type AiCoachWorkspaceToolId = (typeof AI_COACH_WORKSPACE_TOOL_IDS)[number];

export const DIVISION_BALANCE_STATUSES = ["balanced", "needs_players", "uneven"] as const;
export type DivisionBalanceStatus = (typeof DIVISION_BALANCE_STATUSES)[number];

export const ASSISTIVE_SUGGESTION_SURFACES = ["admin", "coach", "parent"] as const;
export type AssistiveSuggestionSurface = (typeof ASSISTIVE_SUGGESTION_SURFACES)[number];

export const WEATHER_THRESHOLD_STATES = ["ok", "review"] as const;
export type WeatherThresholdState = (typeof WEATHER_THRESHOLD_STATES)[number];

export const WEATHER_ESCALATION_LEVELS = ["monitor", "review", "escalate"] as const;
export type WeatherEscalationLevel = (typeof WEATHER_ESCALATION_LEVELS)[number];

export const MAP_QUOTA_STATUSES = ["ok", "warning", "danger"] as const;
export type MapQuotaStatus = (typeof MAP_QUOTA_STATUSES)[number];

export const EMBEDDED_MAP_STATUSES = ["missing", "ready"] as const;
export type EmbeddedMapStatus = (typeof EMBEDDED_MAP_STATUSES)[number];

export const VENUE_CONFIDENCE_STATUSES = ["ready", "missing"] as const;
export type VenueConfidenceStatus = (typeof VENUE_CONFIDENCE_STATUSES)[number];

export const MEDIA_CONSENT_STATES = ["granted", "needs_review"] as const;
export type MediaConsentState = (typeof MEDIA_CONSENT_STATES)[number];

export const MEDIA_REVIEW_STATUSES = ["needs_review", "under_review"] as const;
export type MediaReviewStatus = (typeof MEDIA_REVIEW_STATUSES)[number];

export const MEDIA_MOMENT_SOURCES = ["parent_submitted", "volunteer"] as const;
export type MediaMomentSource = (typeof MEDIA_MOMENT_SOURCES)[number];

export const TEAM_CHAT_RETENTION_JOB_STATUSES = ["ready", "blocked"] as const;
export type TeamChatRetentionJobStatus = (typeof TEAM_CHAT_RETENTION_JOB_STATUSES)[number];

export const VAPID_ADAPTER_STATUSES = ["configured", "not_configured"] as const;
export type VapidAdapterStatus = (typeof VAPID_ADAPTER_STATUSES)[number];

export const UPLOAD_STORAGE_PROVIDERS = ["Supabase Storage", "not_configured"] as const;
export type UploadStorageProvider = (typeof UPLOAD_STORAGE_PROVIDERS)[number];

export const CACHE_INVALIDATION_STRATEGIES = ["stale_while_revalidate"] as const;
export type CacheInvalidationStrategy = (typeof CACHE_INVALIDATION_STRATEGIES)[number];

export const APP_ACTION_TYPES = [
  "commitRosterImport",
  "recoverInvite",
  "setRsvp",
  "applyScheduleChange",
  "postTeamChatMessage",
  "sendCoachAnnouncement",
  "moderateTeamChatMessage",
  "createParentReplay",
  "createRegistrationRequest",
  "updateTeamPortalBranding",
  "queueTeamCommunication"
] as const;
export type AppActionType = (typeof APP_ACTION_TYPES)[number];

export type RosterImportIssueSeverity = Exclude<ImportSeverity, "valid">;
export type ProviderBoundaryStatus = "pending" | "queued" | "sent" | "failed" | "read";
export type BusinessWorkflowState =
  | InviteStatus
  | DeliveryStatus
  | EventStatus
  | RsvpResponse
  | NotificationStatus
  | RegistrationStatus
  | MediaModerationStatus
  | ParentReplayStatus
  | WeatherAlertStatus
  | SponsorStatus
  | SponsorBillingStatus
  | SnackScheduleSlotStatus
  | VolunteerSignupStatus
  | RosterImportStatus
  | ChatModerationStatus;

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
  status: SeasonStatus;
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
  role: TeamMembershipRole;
  status: TeamMembershipStatus;
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
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
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
  type: MediaItemType;
  url: string;
  moderationStatus?: MediaModerationStatus;
  visibility?: MediaVisibility;
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
  status: NotificationStatus;
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
  parentTranslations: Array<{
    coachTerm: string;
    parentInstruction: string;
  }>;
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
  status: SnackScheduleSlotStatus;
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
  level: SponsorLevel;
  teamId?: string;
  url: string;
  status: SponsorStatus;
  placementKey?: SponsorPlacementKey;
  logoUrl?: string;
}

export interface WeatherAlert {
  id: string;
  teamId: string;
  eventId: string;
  headline: string;
  detail: string;
  severity: WeatherAlertSeverity;
  status: WeatherAlertStatus;
  createdAt: string;
}

export type WeatherEventDraft = Omit<WeatherAlert, "id" | "status"> & { status: "draft" };

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
  severity: RosterImportIssueSeverity;
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
  status: RosterImportStatus;
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

export interface ParentDashboardPlayer {
  player: Player;
  team: Team;
}

export interface ParentDashboardData {
  children: ParentDashboardPlayer[];
  nextEvents: LeagueEvent[];
  latestAnnouncement?: {
    title: string;
    body: string;
    teamName: string;
    createdAt: string;
  };
  rsvpNeeded: Array<{
    event: LeagueEvent;
    player: Player;
    currentRsvp?: Rsvp;
  }>;
  recentMedia: MediaItem[];
  completionStatus: string;
}

export interface TeamPortalBrandingInput {
  teamId: string;
  actorUserId: string;
  mascot: string;
  primaryColor: string;
  secondaryColor: string;
  themeKey: ProgramThemeKey;
  now: string;
}

export interface TeamPortalBrandingResult {
  ok: boolean;
  message: string;
  state: AppState;
}

export interface InviteRecoveryResult {
  code: InviteRecoveryCode;
  title: string;
  message: string;
  canResend: boolean;
  invite?: ParentInvite;
}

export interface SetRsvpInput {
  eventId: string;
  playerId: string;
  parentUserId: string;
  response: RsvpResponse;
  note?: string;
  now: string;
}

export interface SetRsvpResult {
  ok: boolean;
  message: string;
  state: AppState;
}

export interface HealthCard {
  id: string;
  title: string;
  count: number;
  status: HealthStatus;
  detail: string;
}

export interface ParentReplayInput {
  teamId: string;
  coachUserId: string;
  focusAreas: PracticeFocusArea[];
  now: string;
}

export interface ParentReplayResult {
  ok: boolean;
  message: string;
  state: AppState;
  replay?: ParentReplayRecord;
  draft?: ParentReplayDraft;
}

export interface PlatformFeature {
  title: string;
  status: PlatformFeatureStatus;
  description: string;
}

export interface PlatformFeatureTier {
  tier: PlatformFeatureTierName;
  promise: string;
  features: PlatformFeature[];
}

export interface AiCoachWorkspaceInput {
  teamId: string;
  coachUserId: string;
  now: string;
  focusAreas?: PracticeFocusArea[];
  roughAnnouncement?: string;
}

export interface AiCoachWorkspaceDraft {
  id: AiCoachWorkspaceToolId;
  label: string;
  title: string;
  body: string;
  sourceEvidence: string[];
  workflow: ReviewWorkflowState[];
  boundary: string;
}

export interface TeamBrandProfile {
  teamId: string;
  displayName: string;
  shortName: string;
  logoUrl?: string;
  bannerImageUrl?: string;
  defaultAvatarLabel: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  heroCopy: string;
  published: boolean;
}

export interface BrandSurfaceDefinition {
  id: BrandSurfaceId;
  label: string;
  surface: BrandSurface;
  requiredTokens: Array<keyof TeamBrandProfile>;
}

export interface BrandSurfaceCheck extends BrandSurfaceDefinition {
  status: BrandSurfaceStatus;
  detail: string;
}

export interface BrandMetric {
  label: string;
  target: string;
  current: string;
  status: BrandMetricStatus;
}

export interface BrandLaunchValidation {
  testProfiles: TeamBrandProfile[];
  surfaceChecks: BrandSurfaceCheck[];
  coveragePercent: number;
  metrics: BrandMetric[];
  monitoringEvents: BrandMonitoringEventType[];
  alerts: string[];
  feedbackQuestions: string[];
  acceptanceCriteria: string[];
  providerBoundary: string;
}

export interface MediaUrlValidation {
  ok: boolean;
  message: string;
}

export interface TeamChatAccess {
  canView: boolean;
  canPost: boolean;
  canAnnounce: boolean;
  canModerate: boolean;
  reason: string;
}

export interface TeamChatView {
  access: TeamChatAccess;
  channel: TeamChatChannel;
  team: Team;
  viewer: User;
  pinnedMessage?: TeamChatMessage;
  messages: TeamChatMessage[];
  upcomingGame?: LeagueEvent;
  gameDayMessages: TeamChatMessage[];
  unreadCount: number;
  safetyNote: string;
}

export interface PostTeamChatMessageInput {
  teamId: string;
  authorUserId: string;
  body: string;
  eventId?: string;
  now: string;
}

export interface SendCoachAnnouncementInput {
  teamId: string;
  authorUserId: string;
  body: string;
  topic: ChatAnnouncementTopic;
  eventId?: string;
  pinned?: boolean;
  now: string;
}

export interface ModerateTeamChatMessageInput {
  messageId: string;
  actorUserId: string;
  action: ChatModerationAction;
  reason: string;
  now: string;
}

export interface ChatMutationResult {
  ok: boolean;
  message: string;
  state: AppState;
  createdMessage?: TeamChatMessage;
  moderatedMessage?: TeamChatMessage;
}

export interface TeamCommunicationInput {
  teamId: string;
  actorUserId: string;
  channel: Extract<NotificationChannel, "email" | "sms">;
  template: CommunicationTemplate;
  subject: string;
  body: string;
  sendAt: string;
  now: string;
}

export interface TeamCommunicationPreview {
  ok: boolean;
  message: string;
  teamName: string;
  recipients: Array<{ id: string; name: string; email: string; phone?: string }>;
  channel: Extract<NotificationChannel, "email" | "sms">;
  subject: string;
  body: string;
  smsSegments: number;
  notificationCount: number;
}

export interface ScheduleChangeInput {
  eventId: string;
  actorUserId: string;
  actorRole: UserRole;
  startsAt?: string;
  locationName?: string;
  status?: EventStatus;
  now: string;
}

export interface CreateScheduleEventInput {
  actorUserId: string;
  actorRole: UserRole;
  organizationId: string;
  seasonId: string;
  teamId: string;
  title: string;
  eventType: EventType;
  startsAt: string;
  endsAt: string;
  locationName: string;
  locationAddress: string;
  opponent?: string;
  now: string;
}

export interface ScheduleConflictInput {
  eventId?: string;
  teamId: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
}

export interface RecurringEventPreviewInput {
  sourceEventId: string;
  count: number;
  intervalDays: number;
}

export interface CreateRegistrationRequestInput {
  teamId: string;
  parentName: string;
  parentEmail: string;
  playerFirstName: string;
  playerLastInitial: string;
  now: string;
}

export interface RegistrationMutationResult {
  ok: boolean;
  message: string;
  state: AppState;
  request?: RegistrationRequest;
}

export interface SeasonPlanningMetrics {
  seasonName: string;
  totalTeams: number;
  totalPlayers: number;
  averageRosterSize: number;
  targetRosterSize: number;
  rosterOpenings: number;
  divisions: Array<{
    division: string;
    teamCount: number;
    playerCount: number;
    averageRosterSize: number;
    largestRoster: number;
    smallestRoster: number;
    balanceStatus: DivisionBalanceStatus;
    rosterMakerNote: string;
    bracketMakerNote: string;
  }>;
  bracketRounds: Array<{
    division: string;
    round: string;
    matchups: string[];
  }>;
}

export interface TeamBuildFriendRequest {
  playerId: string;
  friendPlayerId: string;
}

export interface BalancedTeamBuildInput {
  division: string;
  targetRosterSize: number;
  actorUserId: string;
  now: string;
  skillRatings?: Record<string, number>;
  friendRequests?: TeamBuildFriendRequest[];
}

export interface BalancedTeamBuildPreview {
  ok: boolean;
  division: string;
  workflow: ReviewWorkflowState[];
  teams: Array<{
    teamId: string;
    teamName: string;
    playerCount: number;
    averageSkill: number;
    players: Array<{
      playerId: string;
      name: string;
      skillRating: number;
      constraintNotes: string[];
    }>;
  }>;
  warnings: string[];
  auditSummary: string;
  publishBoundary: string;
}

export interface PublishedTeamBuildPlan {
  ok: boolean;
  message: string;
  state: AppState;
  preview: BalancedTeamBuildPreview;
}

export interface ProgramThemePreset {
  key: ProgramThemeKey;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  mascotHint: string;
  fieldLabel: string;
  practiceWord: string;
}

export interface AssistiveSuggestion {
  id: string;
  surface: AssistiveSuggestionSurface;
  title: string;
  body: string;
  recommendation: string;
  boundary: string;
}

export interface SponsorBillingProof {
  sponsorId: string;
  sponsorName: string;
  billingStatus: SponsorBillingStatus;
  productName: string;
  priceLookupKey: string;
  invoiceReference: string;
  amountCents: number;
  currency: "usd";
  paymentProofStatus: SponsorPaymentProofStatus;
  publicDisplaySeparated: boolean;
  childFacingDisplayBlocked: boolean;
  workflow: SponsorBillingWorkflowState[];
  securityNotes: string[];
  auditSummary: string;
}

export interface SponsorBillingInput {
  amountCents?: number;
  billingStatus?: SponsorBillingStatus;
  invoiceReference?: string;
}

export type AppAction =
  | { type: "commitRosterImport"; csv: string; now: string }
  | { type: "recoverInvite"; identifier: string; now: string }
  | { type: "setRsvp"; input: SetRsvpInput }
  | { type: "applyScheduleChange"; input: ScheduleChangeInput }
  | { type: "postTeamChatMessage"; input: PostTeamChatMessageInput }
  | { type: "sendCoachAnnouncement"; input: SendCoachAnnouncementInput }
  | { type: "moderateTeamChatMessage"; input: ModerateTeamChatMessageInput }
  | { type: "createParentReplay"; input: ParentReplayInput }
  | { type: "createRegistrationRequest"; input: CreateRegistrationRequestInput }
  | { type: "updateTeamPortalBranding"; input: TeamPortalBrandingInput }
  | { type: "queueTeamCommunication"; input: TeamCommunicationInput };

export type AdminUser = User & { role: "admin" };
export type CoachUser = User & { role: "coach" };
export type ParentUser = User & { role: "parent" };
export type ActiveSeason = Season & { status: "active" };
export type ArchivedSeason = Season & { status: "archived" };
export type ActiveTeamMembership = TeamMembership & { status: "active" };
export type ActiveCoachMembership = TeamMembership & { role: "coach"; status: "active" };
export type ActiveParentMembership = TeamMembership & { role: "parent"; status: "active" };
export type ActiveGuardianLink = GuardianLink & { status: "active"; parentUserId: string };
export type PendingParentInvite = ParentInvite & { status: "pending" };
export type AcceptedParentInvite = ParentInvite & { status: "accepted" };
export type ExpiredParentInvite = ParentInvite & { status: "expired" };
export type RevokedParentInvite = ParentInvite & { status: "revoked" };
export type ScheduledLeagueEvent = LeagueEvent & { status: "scheduled" };
export type CancelledLeagueEvent = LeagueEvent & { status: "cancelled" };
export type CompletedLeagueEvent = LeagueEvent & { status: "completed" };
export type PendingNotification = NotificationRecord & { status: "pending" };
export type SentNotification = NotificationRecord & { status: "sent" };
export type FailedNotification = NotificationRecord & { status: "failed" };
export type ReadNotification = NotificationRecord & { status: "read" };
export type ApprovedMediaItem = MediaItem & { moderationStatus?: "approved" };
export type PendingMediaItem = MediaItem & { moderationStatus: "pending" };
export type HiddenMediaItem = MediaItem & { moderationStatus: "hidden" };
export type RejectedMediaItem = MediaItem & { moderationStatus: "rejected" };
export type RemovedMediaItem = MediaItem & { moderationStatus: "removed" };
export type PendingRegistrationRequest = RegistrationRequest & { status: "pending" };
export type ApprovedRegistrationRequest = RegistrationRequest & { status: "approved" };
export type RejectedRegistrationRequest = RegistrationRequest & { status: "rejected" };
export type OpenSnackScheduleSlot = SnackScheduleSlot & { status: "open" };
export type AssignedSnackScheduleSlot = SnackScheduleSlot & { status: "assigned"; assignedParentUserId: string };
export type OpenVolunteerSignup = VolunteerSignup & { status: "open" };
export type FilledVolunteerSignup = VolunteerSignup & { status: "filled"; assignedUserId: string };
export type ActiveSponsor = Sponsor & { status: "active" };
export type PendingSponsor = Sponsor & { status: "pending" };
export type ExpiredSponsor = Sponsor & { status: "expired" };
export type DraftWeatherAlert = WeatherAlert & { status: "draft" };
export type QueuedWeatherAlert = WeatherAlert & { status: "queued" };
export type VisibleTeamChatMessage = TeamChatMessage & { moderationStatus: "visible" };
export type HiddenTeamChatMessage = TeamChatMessage & { moderationStatus: "hidden" };
export type DeletedTeamChatMessage = TeamChatMessage & { moderationStatus: "deleted"; deletedAt: string };
export type DraftParentReplayRecord = ParentReplayRecord & { status: "draft" };
export type QueuedParentReplayRecord = ParentReplayRecord & { status: "queued" };
export type ValidatedRosterImportAnalysis = RosterImportAnalysis & { status: "validated" };
export type CommittedRosterImportAnalysis = RosterImportAnalysis & { status: "committed"; committedAt: string };

export function isAdminUser(user: User): user is AdminUser {
  return user.role === "admin";
}

export function isCoachUser(user: User): user is CoachUser {
  return user.role === "coach";
}

export function isParentUser(user: User): user is ParentUser {
  return user.role === "parent";
}

export function isActiveSeason(season: Season): season is ActiveSeason {
  return season.status === "active";
}

export function isArchivedSeason(season: Season): season is ArchivedSeason {
  return season.status === "archived";
}

export function isActiveTeamMembership(membership: TeamMembership): membership is ActiveTeamMembership {
  return membership.status === "active";
}

export function isActiveCoachMembership(membership: TeamMembership): membership is ActiveCoachMembership {
  return membership.role === "coach" && membership.status === "active";
}

export function isActiveParentMembership(membership: TeamMembership): membership is ActiveParentMembership {
  return membership.role === "parent" && membership.status === "active";
}

export function isActiveGuardianLink(link: GuardianLink): link is ActiveGuardianLink {
  return link.status === "active" && Boolean(link.parentUserId);
}

export function isPendingInvite(invite: ParentInvite): invite is PendingParentInvite {
  return invite.status === "pending";
}

export function isAcceptedInvite(invite: ParentInvite): invite is AcceptedParentInvite {
  return invite.status === "accepted";
}

export function isExpiredInvite(invite: ParentInvite): invite is ExpiredParentInvite {
  return invite.status === "expired";
}

export function isInvitePastExpiration(invite: ParentInvite, now: string) {
  return Date.parse(invite.expiresAt) < Date.parse(now);
}

export function isExpiredOrPastExpirationInvite(invite: ParentInvite, now: string) {
  return isExpiredInvite(invite) || isInvitePastExpiration(invite, now);
}

export function isRevokedInvite(invite: ParentInvite): invite is RevokedParentInvite {
  return invite.status === "revoked";
}

export function isScheduledEvent(event: LeagueEvent): event is ScheduledLeagueEvent {
  return event.status === "scheduled";
}

export function isCancelledEvent(event: LeagueEvent): event is CancelledLeagueEvent {
  return event.status === "cancelled";
}

export function isCompletedEvent(event: LeagueEvent): event is CompletedLeagueEvent {
  return event.status === "completed";
}

export function isGoingRsvp(rsvp: Rsvp): rsvp is Rsvp & { response: "going" } {
  return rsvp.response === "going";
}

export function isNotGoingRsvp(rsvp: Rsvp): rsvp is Rsvp & { response: "not_going" } {
  return rsvp.response === "not_going";
}

export function isMaybeRsvp(rsvp: Rsvp): rsvp is Rsvp & { response: "maybe" } {
  return rsvp.response === "maybe";
}

export function isCancelledRsvp(rsvp: Rsvp): rsvp is Rsvp & { response: "cancelled" } {
  return rsvp.response === "cancelled";
}

export function isPendingNotification(notification: NotificationRecord): notification is PendingNotification {
  return notification.status === "pending";
}

export function isSentNotification(notification: NotificationRecord): notification is SentNotification {
  return notification.status === "sent";
}

export function isFailedNotification(notification: NotificationRecord): notification is FailedNotification {
  return notification.status === "failed";
}

export function isReadNotification(notification: NotificationRecord): notification is ReadNotification {
  return notification.status === "read";
}

export function isDeliveredNotification(notification: NotificationRecord): notification is SentNotification | ReadNotification {
  return notification.status === "sent" || notification.status === "read";
}

export function isEnabledNotificationPreference(preference: NotificationPreference): preference is NotificationPreference & { enabled: true } {
  return preference.enabled === true;
}

export function isDisabledNotificationPreference(preference: NotificationPreference): preference is NotificationPreference & { enabled: false } {
  return preference.enabled === false;
}

export function isApprovedMediaItem(item: MediaItem): item is ApprovedMediaItem {
  return (item.moderationStatus ?? "approved") === "approved";
}

export function isPendingMediaItem(item: MediaItem): item is PendingMediaItem {
  return item.moderationStatus === "pending";
}

export function isHiddenMediaItem(item: MediaItem): item is HiddenMediaItem {
  return item.moderationStatus === "hidden";
}

export function isRejectedMediaItem(item: MediaItem): item is RejectedMediaItem {
  return item.moderationStatus === "rejected";
}

export function isRemovedMediaItem(item: MediaItem): item is RemovedMediaItem {
  return item.moderationStatus === "removed";
}

export function isTeamVisibleMediaItem(item: MediaItem): item is ApprovedMediaItem & { visibility?: "team" } {
  return isApprovedMediaItem(item) && (item.visibility ?? "team") === "team";
}

export function isOrganizationVisibleMediaItem(item: MediaItem): item is ApprovedMediaItem & { visibility: "organization" } {
  return isApprovedMediaItem(item) && item.visibility === "organization";
}

export function isPendingRegistrationRequest(request: RegistrationRequest): request is PendingRegistrationRequest {
  return request.status === "pending";
}

export function isApprovedRegistrationRequest(request: RegistrationRequest): request is ApprovedRegistrationRequest {
  return request.status === "approved";
}

export function isRejectedRegistrationRequest(request: RegistrationRequest): request is RejectedRegistrationRequest {
  return request.status === "rejected";
}

export function isOpenSnackScheduleSlot(slot: SnackScheduleSlot): slot is OpenSnackScheduleSlot {
  return slot.status === "open";
}

export function isAssignedSnackScheduleSlot(slot: SnackScheduleSlot): slot is AssignedSnackScheduleSlot {
  return slot.status === "assigned" && Boolean(slot.assignedParentUserId);
}

export function isOpenVolunteerSignup(signup: VolunteerSignup): signup is OpenVolunteerSignup {
  return signup.status === "open";
}

export function isFilledVolunteerSignup(signup: VolunteerSignup): signup is FilledVolunteerSignup {
  return signup.status === "filled" && Boolean(signup.assignedUserId);
}

export function isActiveSponsor(sponsor: Sponsor): sponsor is ActiveSponsor {
  return sponsor.status === "active";
}

export function isPendingSponsor(sponsor: Sponsor): sponsor is PendingSponsor {
  return sponsor.status === "pending";
}

export function isExpiredSponsor(sponsor: Sponsor): sponsor is ExpiredSponsor {
  return sponsor.status === "expired";
}

export function isDraftWeatherAlert(alert: WeatherAlert): alert is DraftWeatherAlert {
  return alert.status === "draft";
}

export function isQueuedWeatherAlert(alert: WeatherAlert): alert is QueuedWeatherAlert {
  return alert.status === "queued";
}

export function isDraftParentReplayRecord(record: ParentReplayRecord): record is DraftParentReplayRecord {
  return record.status === "draft";
}

export function isQueuedParentReplayRecord(record: ParentReplayRecord): record is QueuedParentReplayRecord {
  return record.status === "queued";
}

export function isVisibleTeamChatMessage(message: TeamChatMessage): message is VisibleTeamChatMessage {
  return message.moderationStatus === "visible";
}

export function isHiddenTeamChatMessage(message: TeamChatMessage): message is HiddenTeamChatMessage {
  return message.moderationStatus === "hidden";
}

export function isDeletedTeamChatMessage(message: TeamChatMessage): message is DeletedTeamChatMessage {
  return message.moderationStatus === "deleted" && Boolean(message.deletedAt);
}

export function isDraftParentReplay(replay: ParentReplayRecord): replay is DraftParentReplayRecord {
  return replay.status === "draft";
}

export function isQueuedParentReplay(replay: ParentReplayRecord): replay is QueuedParentReplayRecord {
  return replay.status === "queued";
}

export function isValidatedRosterImport(analysis: RosterImportAnalysis): analysis is ValidatedRosterImportAnalysis {
  return analysis.status === "validated";
}

export function isCommittedRosterImport(analysis: RosterImportAnalysis): analysis is CommittedRosterImportAnalysis {
  return analysis.status === "committed" && Boolean(analysis.committedAt);
}
