import type { AppState, ParentInvite } from "./types";
import { normalizeEmail, normalizePhone } from "./csv";

export type InviteRecoveryCode =
  | "not_found"
  | "season_inactive"
  | "already_registered"
  | "revoked"
  | "expired"
  | "rate_limited_hour"
  | "rate_limited_day"
  | "eligible";

export interface InviteRecoveryResult {
  code: InviteRecoveryCode;
  title: string;
  message: string;
  canResend: boolean;
  invite?: ParentInvite;
}

function dateMs(value: string) {
  return new Date(value).getTime();
}

export function findInviteByIdentifier(state: AppState, identifier: string) {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  return state.parentInvites.find((invite) => normalizeEmail(invite.email) === email || normalizePhone(invite.phone) === phone);
}

export function evaluateInviteRecovery(state: AppState, identifier: string, now: string): InviteRecoveryResult {
  const invite = findInviteByIdentifier(state, identifier);
  const nowMs = dateMs(now);

  if (!invite) {
    return {
      code: "not_found",
      title: "No invite found",
      message: "No active parent invite matches that email or phone.",
      canResend: false
    };
  }

  if (state.activeSeason.status !== "active") {
    return {
      code: "season_inactive",
      title: "Season is not active",
      message: "Invite recovery is disabled because the season is not active.",
      canResend: false,
      invite
    };
  }

  if (invite.status === "accepted") {
    return {
      code: "already_registered",
      title: "Account already registered",
      message: "This invite was already accepted. The parent should use normal sign-in recovery.",
      canResend: false,
      invite
    };
  }

  if (invite.status === "revoked") {
    return {
      code: "revoked",
      title: "Invite revoked",
      message: "An org admin must review this invite before it can be sent again.",
      canResend: false,
      invite
    };
  }

  if (invite.status === "expired" || dateMs(invite.expiresAt) < nowMs) {
    return {
      code: "expired",
      title: "Invite expired",
      message: "The invite exists but is expired. Show the expired invite page and let an admin renew it.",
      canResend: false,
      invite
    };
  }

  const hourAgo = nowMs - 60 * 60 * 1000;
  const dayAgo = nowMs - 24 * 60 * 60 * 1000;
  const hourCount = invite.resendTimestamps.filter((sentAt) => dateMs(sentAt) >= hourAgo).length;
  const dayCount = invite.resendTimestamps.filter((sentAt) => dateMs(sentAt) >= dayAgo).length;

  if (hourCount >= 3) {
    return {
      code: "rate_limited_hour",
      title: "Hourly resend limit reached",
      message: "Parents can request at most 3 invite resends per hour.",
      canResend: false,
      invite
    };
  }

  if (dayCount >= 10 || invite.sentCount >= 10) {
    return {
      code: "rate_limited_day",
      title: "Daily resend limit reached",
      message: "Parents can request at most 10 invite resends per day.",
      canResend: false,
      invite
    };
  }

  return {
    code: "eligible",
    title: "Invite can be resent",
    message: "A new invite delivery can be queued. The raw token is never stored or displayed.",
    canResend: true,
    invite
  };
}
