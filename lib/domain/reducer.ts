import { analyzeRosterCsv } from "./csv";
import { evaluateInviteRecovery } from "./invites";
import {
  postTeamChatMessage,
  sendCoachAnnouncement,
  type PostTeamChatMessageInput,
  type SendCoachAnnouncementInput
} from "./chat";
import { setRsvp, type SetRsvpInput } from "./rsvp";
import { applyScheduleChange, type ScheduleChangeInput } from "./schedule";
import type { AppState } from "./types";

export type AppAction =
  | { type: "commitRosterImport"; csv: string; now: string }
  | { type: "recoverInvite"; identifier: string; now: string }
  | { type: "setRsvp"; input: SetRsvpInput }
  | { type: "applyScheduleChange"; input: ScheduleChangeInput }
  | { type: "postTeamChatMessage"; input: PostTeamChatMessageInput }
  | { type: "sendCoachAnnouncement"; input: SendCoachAnnouncementInput };

export function appReducer(state: AppState, action: AppAction): AppState {
  if (action.type === "commitRosterImport") {
    const analysis = analyzeRosterCsv(action.csv, state, action.now);
    const committed = { ...analysis, status: "committed" as const, committedAt: action.now };
    return {
      ...state,
      rosterImportReports: [committed, ...state.rosterImportReports],
      auditEvents: [
        {
          id: `audit-import-${Date.parse(action.now)}`,
          actorUserId: "user-admin",
          action: "roster_import_committed",
          targetType: "roster_import",
          targetId: committed.id,
          summary: `Roster import simulated with ${committed.validRows} valid rows, ${committed.warningRows} warning rows, and ${committed.errorRows} error rows.`,
          createdAt: action.now
        },
        ...state.auditEvents
      ]
    };
  }

  if (action.type === "recoverInvite") {
    const result = evaluateInviteRecovery(state, action.identifier, action.now);
    if (!result.canResend || !result.invite) return state;
    const nextExpiresAt = new Date(Date.parse(action.now) + 10 * 24 * 60 * 60 * 1000).toISOString();
    return {
      ...state,
      parentInvites: state.parentInvites.map((invite) => invite.id === result.invite?.id ? {
        ...invite,
        sentCount: invite.sentCount + 1,
        resendTimestamps: [...invite.resendTimestamps, action.now],
        lastSentAt: action.now,
        expiresAt: nextExpiresAt,
        deliveryStatus: "sent",
        updatedAt: action.now
      } : invite),
      notifications: [
        {
          id: `notification-invite-${Date.parse(action.now)}`,
          organizationId: result.invite.organizationId,
          recipientUserId: "pending-parent",
          teamId: result.invite.teamId,
          notificationType: "invite_recovered",
          title: "Invite recovery queued",
          body: `Invite recovery simulated for ${result.invite.email}.`,
          channel: "email",
          status: "pending",
          createdAt: action.now
        },
        ...state.notifications
      ],
      auditEvents: [
        {
          id: `audit-invite-${Date.parse(action.now)}`,
          actorUserId: "self-service",
          action: "invite_recovery_queued",
          targetType: "parent_invite",
          targetId: result.invite.id,
          summary: "Parent invite recovery queued; raw token was not stored or displayed.",
          createdAt: action.now
        },
        ...state.auditEvents
      ]
    };
  }

  if (action.type === "setRsvp") {
    return setRsvp(state, action.input).state;
  }

  if (action.type === "applyScheduleChange") {
    return applyScheduleChange(state, action.input).state;
  }

  if (action.type === "postTeamChatMessage") {
    return postTeamChatMessage(state, action.input).state;
  }

  if (action.type === "sendCoachAnnouncement") {
    return sendCoachAnnouncement(state, action.input).state;
  }

  return state;
}
