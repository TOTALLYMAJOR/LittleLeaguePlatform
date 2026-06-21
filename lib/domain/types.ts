export type UserRole = "admin" | "coach" | "parent";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type DeliveryStatus = "queued" | "sent" | "failed";
export type EventStatus = "scheduled" | "cancelled" | "completed";
export type EventType = "game" | "practice" | "team_event";
export type RsvpResponse = "going" | "not_going" | "maybe";
export type NotificationType = "schedule_changed" | "event_cancelled" | "new_event" | "invite_sent" | "invite_recovered";
export type NotificationChannel = "push" | "email" | "sms";
export type ImportSeverity = "valid" | "warning" | "error";

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
  auditEvents: AuditEvent[];
  rosterImportReports: RosterImportAnalysis[];
}
