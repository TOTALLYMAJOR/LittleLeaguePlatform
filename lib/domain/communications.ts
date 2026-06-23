import type { AppState, NotificationChannel, NotificationRecord } from "./types";

export type CommunicationTemplate = "weekly_digest" | "game_day_reminder" | "practice_replay" | "custom";

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

export const communicationTemplates: Array<{ id: CommunicationTemplate; label: string; subject: string; body: string }> = [
  {
    id: "weekly_digest",
    label: "Weekly digest email",
    subject: "This week with {{team}}",
    body: "Practice, game-day details, RSVP needs, snacks, volunteer openings, and the latest Parent Replay are ready for {{team}} families."
  },
  {
    id: "game_day_reminder",
    label: "Game-day reminder",
    subject: "{{team}} game-day essentials",
    body: "{{team}} families: check arrival time, field, uniform, RSVP, snack duty, parking, and weather before leaving."
  },
  {
    id: "practice_replay",
    label: "Parent Replay follow-up",
    subject: "{{team}} Parent Replay is ready",
    body: "Tonight's tiny home activity is ready for {{team}}. Keep it short, positive, and stop before it feels like homework."
  },
  {
    id: "custom",
    label: "Custom message",
    subject: "{{team}} update",
    body: "Write a team update for {{team}} families."
  }
];

function renderTemplate(value: string, teamName: string) {
  return value.replaceAll("{{team}}", teamName);
}

export function defaultTeamCommunicationCopy(state: AppState, teamId: string, templateId: CommunicationTemplate) {
  const team = state.teams.find((item) => item.id === teamId);
  const template = communicationTemplates.find((item) => item.id === templateId) ?? communicationTemplates[0]!;
  const teamName = team?.name ?? "this team";

  return {
    subject: renderTemplate(template.subject, teamName),
    body: renderTemplate(template.body, teamName)
  };
}

function actorCanMessageTeam(state: AppState, actorUserId: string, teamId: string) {
  const actor = state.users.find((user) => user.id === actorUserId);
  if (!actor) return false;
  if (actor.role === "admin") return true;
  if (actor.role !== "coach") return false;

  return state.teamMemberships.some((membership) => (
    membership.userId === actorUserId &&
    membership.teamId === teamId &&
    membership.role === "coach" &&
    membership.status === "active"
  ));
}

function activeFamilyRecipientsForTeam(state: AppState, teamId: string) {
  const playerIds = new Set(state.players.filter((player) => player.teamId === teamId).map((player) => player.id));
  const parentIds = new Set(
    state.guardianLinks
      .filter((link) => link.status === "active" && link.parentUserId && playerIds.has(link.playerId))
      .map((link) => link.parentUserId!)
  );

  return state.users.filter((user) => parentIds.has(user.id) && user.role === "parent");
}

function smsSegmentsFor(body: string) {
  return Math.max(1, Math.ceil(body.length / 160));
}

export function previewTeamCommunication(state: AppState, input: TeamCommunicationInput): TeamCommunicationPreview {
  const team = state.teams.find((item) => item.id === input.teamId);
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!team) {
    return {
      ok: false,
      message: "Team communication requires a known team.",
      teamName: "Unknown team",
      recipients: [],
      channel: input.channel,
      subject,
      body,
      smsSegments: smsSegmentsFor(body),
      notificationCount: 0
    };
  }

  if (!actorCanMessageTeam(state, input.actorUserId, input.teamId)) {
    return {
      ok: false,
      message: "Only org admins or assigned coaches can queue team communication.",
      teamName: team.name,
      recipients: [],
      channel: input.channel,
      subject,
      body,
      smsSegments: smsSegmentsFor(body),
      notificationCount: 0
    };
  }

  if (!subject || !body) {
    return {
      ok: false,
      message: "Subject and body are required before queueing email or SMS records.",
      teamName: team.name,
      recipients: [],
      channel: input.channel,
      subject,
      body,
      smsSegments: smsSegmentsFor(body),
      notificationCount: 0
    };
  }

  const recipients = activeFamilyRecipientsForTeam(state, input.teamId);
  const reachableRecipients = recipients.filter((recipient) => (
    input.channel === "email" ? recipient.email : recipient.phone
  ));

  return {
    ok: reachableRecipients.length > 0,
    message: reachableRecipients.length
      ? `${reachableRecipients.length} ${input.channel.toUpperCase()} record(s) are ready to queue for ${team.name}; no provider send occurs.`
      : `No active ${input.channel.toUpperCase()} recipients are available for ${team.name}.`,
    teamName: team.name,
    recipients: reachableRecipients,
    channel: input.channel,
    subject,
    body,
    smsSegments: smsSegmentsFor(body),
    notificationCount: reachableRecipients.length
  };
}

export function queueTeamCommunication(state: AppState, input: TeamCommunicationInput) {
  const preview = previewTeamCommunication(state, input);
  if (!preview.ok) return { ok: false, message: preview.message, state, preview };

  const team = state.teams.find((item) => item.id === input.teamId)!;
  const notifications: NotificationRecord[] = preview.recipients.map((recipient, index) => ({
    id: `notification-team-broadcast-${Date.parse(input.now)}-${input.channel}-${index + 1}`,
    organizationId: team.organizationId,
    recipientUserId: recipient.id,
    teamId: input.teamId,
    notificationType: "team_broadcast",
    title: preview.subject,
    body: preview.body,
    channel: input.channel,
    status: "pending",
    createdAt: input.now
  }));

  return {
    ok: true,
    message: `${notifications.length} ${input.channel.toUpperCase()} automation record(s) queued for ${team.name}; no provider send occurred.`,
    state: {
      ...state,
      notifications: [...notifications, ...state.notifications],
      auditEvents: [
        {
          id: `audit-team-broadcast-${Date.parse(input.now)}`,
          actorUserId: input.actorUserId,
          action: "team_communication_queued",
          targetType: "team",
          targetId: input.teamId,
          summary: `Queued ${notifications.length} ${input.channel.toUpperCase()} team communication records from the ${input.template} template.`,
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    },
    preview
  };
}
