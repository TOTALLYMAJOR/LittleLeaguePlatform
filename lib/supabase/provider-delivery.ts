import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";
import { isUrgentNotificationType } from "@/lib/services/notifications/rules";
import { buildNotificationIdempotencyKey } from "@/lib/services/notifications/worker";
import type {
  NotificationDeliveryOutcome,
  NotificationDeliveryPayload,
  NotificationPushSubscription
} from "@/lib/services/notifications/types";

export type ProviderDeliveryReviewDecision = "approved" | "rejected";
export type ProviderDeliveryProvider = "email" | "sms" | "web_push";
export type ProviderDeliveryChannel = "push" | "email" | "sms";
type ProviderDeliveryAttemptStatus = "queued" | "sent" | "failed" | "suppressed";
const DEFAULT_DELIVERY_MAX_RETRIES = 3;

export interface ProviderDeliveryAttemptHistoryItem {
  id: string;
  provider: string;
  channel: string;
  status: ProviderDeliveryAttemptStatus;
  reason: string;
  retryCount: number;
  attemptedAt: string;
  nextAttemptAt?: string;
  deadLetteredAt?: string;
  providerStatus?: string;
}

export interface ProviderDeliveryReviewQueueItem {
  notificationId: string;
  organizationId: string;
  teamId: string;
  teamName: string;
  recipientUserId: string;
  recipientLabel: string;
  notificationType: string;
  title: string;
  body: string;
  channel: ProviderDeliveryChannel;
  provider: ProviderDeliveryProvider;
  status: string;
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  suppressionReasons: string[];
  retryContext: {
    status: "ready" | "suppressed" | "retrying" | "dead_lettered" | "pending_review";
    label: string;
    retryCount: number;
    nextAttemptAt?: string;
  };
  attemptHistory: ProviderDeliveryAttemptHistoryItem[];
}

type UnsafeSupabase = {
  // Provider approval columns are staged until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export function providerChannel(provider: ProviderDeliveryProvider): ProviderDeliveryChannel {
  if (provider === "web_push") return "push";
  return provider;
}

export function providerForChannel(channel: ProviderDeliveryChannel): ProviderDeliveryProvider {
  return channel === "push" ? "web_push" : channel;
}

export function getProviderDeliveryReadiness(
  provider: ProviderDeliveryProvider,
  env: Partial<NodeJS.ProcessEnv> = process.env
) {
  if (provider === "web_push") {
    const configured = Boolean(
      (env.WEB_PUSH_VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY) &&
      (env.WEB_PUSH_VAPID_PRIVATE_KEY || env.VAPID_PRIVATE_KEY) &&
      (env.WEB_PUSH_VAPID_SUBJECT || env.VAPID_SUBJECT || env.WEB_PUSH_SUBJECT)
    );
    return {
      configured,
      reason: configured
        ? "Web Push VAPID keys are configured; delivery still requires approval and preference checks."
        : "Web Push VAPID keys are missing, so approved attempts stay suppressed."
    };
  }

  if (provider === "email") {
    const configured = Boolean(env.SENDGRID_API_KEY && (env.SENDGRID_FROM_EMAIL || env.EMAIL_PROVIDER_FROM_EMAIL));
    return {
      configured,
      reason: configured
        ? "SendGrid credentials are configured; delivery still requires approval and preference checks."
        : "SendGrid API key and sender email are missing, so approved attempts stay suppressed."
    };
  }

  const configured = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_MESSAGING_SERVICE_SID);
  return {
    configured,
    reason: configured
      ? "SMS provider credentials are configured; delivery still requires approval, urgency, and preference checks."
      : "SMS provider credentials are missing, so approved attempts stay suppressed."
  };
}

function providerSuppressionCode(input: {
  decision: ProviderDeliveryReviewDecision;
  preferencesAllowed: boolean;
  providerConfigured: boolean;
}) {
  if (input.decision === "rejected") return "human_rejected";
  if (!input.preferencesAllowed) return "recipient_preference_disabled";
  if (!input.providerConfigured) return "provider_not_configured";
  return null;
}

function providerAttemptStatus(input: {
  decision: ProviderDeliveryReviewDecision;
  preferencesAllowed: boolean;
  providerConfigured: boolean;
}): ProviderDeliveryAttemptStatus {
  if (input.decision === "rejected") return "suppressed";
  if (!input.preferencesAllowed || !input.providerConfigured) return "suppressed";
  return "queued";
}

function providerSuppressionMessage(code: string | null, providerReason: string) {
  if (code === "human_rejected") return "Delivery suppressed by human review.";
  if (code === "recipient_preference_disabled") return "Delivery suppressed by recipient notification preferences.";
  if (code === "provider_not_configured") return providerReason;
  return null;
}

function providerSuppressionMessageWithReason(code: string | null, providerReason: string, reason?: string) {
  if (code === "human_rejected" && reason?.trim()) {
    return `Delivery suppressed by human review: ${reason.trim()}`;
  }
  return providerSuppressionMessage(code, providerReason);
}

async function loadDeliveryPolicyForNotification(db: UnsafeSupabase, notification: {
  recipient_user_id: string;
  organization_id: string;
  team_id: string;
  channel: ProviderDeliveryChannel;
  notification_type: string;
}) {
  const { data } = await withSupabaseTimeout(db
    .from("notification_preferences")
    .select("id,organization_id,team_id,enabled,quiet_hours_start,quiet_hours_end,timezone")
    .eq("user_id", notification.recipient_user_id)
    .eq("channel", notification.channel)
    .eq("notification_type", notification.notification_type), 7000) as {
      data: Array<{
        id: string;
        organization_id: string | null;
        team_id: string | null;
        enabled: boolean;
        quiet_hours_start: string | null;
        quiet_hours_end: string | null;
        timezone: string | null;
      }> | null;
    };

  const matchingPreferences = (data ?? []).filter((preference) => (
    preference.team_id === notification.team_id ||
    preference.organization_id === notification.organization_id ||
    (!preference.team_id && !preference.organization_id)
  ));

  const disabledPreference = matchingPreferences.find((preference) => preference.enabled === false);
  const enabledPreference = matchingPreferences.find((preference) => preference.enabled === true);
  const activePreference = disabledPreference ?? enabledPreference ?? matchingPreferences[0];

  return {
    preferencesAllowed: disabledPreference ? false : (enabledPreference ? true : notification.channel !== "sms"),
    quietHoursStart: activePreference?.quiet_hours_start ?? null,
    quietHoursEnd: activePreference?.quiet_hours_end ?? null,
    timezone: activePreference?.timezone ?? "America/Chicago",
    urgent: isUrgentNotificationType(notification.notification_type)
  };
}

async function recipientAllowsProviderDelivery(db: UnsafeSupabase, notification: {
  recipient_user_id: string;
  organization_id: string;
  team_id: string;
  channel: ProviderDeliveryChannel;
  notification_type: string;
}) {
  const policy = await loadDeliveryPolicyForNotification(db, notification);
  return policy.preferencesAllowed;
}

export async function reviewNotificationDelivery(input: {
  notificationId: string;
  actorUserId: string;
  decision: ProviderDeliveryReviewDecision;
  provider: ProviderDeliveryProvider;
  reason?: string;
}) {
  if (!input.notificationId || !input.actorUserId) return { ok: false, message: "Notification review requires notification and actor." };

  try {
    const db = adminDb();
    const { data: notification, error: notificationError } = await withSupabaseTimeout(db
      .from("notifications")
      .select("id,organization_id,recipient_user_id,team_id,notification_type,channel,status")
      .eq("id", input.notificationId)
      .single(), 7000) as {
        data: {
          id: string;
          organization_id: string;
          recipient_user_id: string;
          team_id: string;
          notification_type: string;
          channel: ProviderDeliveryChannel;
          status: string;
        } | null;
        error: { message?: string } | null;
      };

    if (notificationError || !notification) return { ok: false, message: "Notification draft could not be found." };
    if (providerChannel(input.provider) !== notification.channel) {
      return { ok: false, message: "Provider does not match the notification channel." };
    }

    const [{ data: teamMemberships }, { data: adminMemberships }] = await withSupabaseTimeout(Promise.all([
      db.from("team_memberships").select("id").eq("team_id", notification.team_id).eq("user_id", input.actorUserId).eq("role", "coach").eq("status", "active"),
      db.from("organization_memberships").select("id").eq("organization_id", notification.organization_id).eq("user_id", input.actorUserId).eq("role", "admin").eq("status", "active")
    ]), 7000) as [{ data: Array<{ id: string }> | null }, { data: Array<{ id: string }> | null }];

    if (!teamMemberships?.length && !adminMemberships?.length) {
      return { ok: false, message: "Only assigned coaches or organization admins can approve provider delivery." };
    }

    const now = new Date().toISOString();
    const preferencesAllowed = await recipientAllowsProviderDelivery(db, notification);
    const providerReadiness = getProviderDeliveryReadiness(input.provider);
    const attemptStatus = providerAttemptStatus({
      decision: input.decision,
      preferencesAllowed,
      providerConfigured: providerReadiness.configured
    });
    const suppressionCode = providerSuppressionCode({
      decision: input.decision,
      preferencesAllowed,
      providerConfigured: providerReadiness.configured
    });
    const suppressionMessage = providerSuppressionMessageWithReason(suppressionCode, providerReadiness.reason, input.reason);
    const [{ data: updatedNotification }, { data: attempt }] = await withSupabaseTimeout(Promise.all([
      db.from("notifications")
        .update({
          provider_approval_status: input.decision,
          approved_by_user_id: input.actorUserId,
          approved_at: now
        })
        .eq("id", notification.id)
        .select("id,provider_approval_status,approved_at")
        .single(),
      db.from("notification_delivery_attempts")
        .insert({
          notification_id: notification.id,
          provider: input.provider,
          channel: notification.channel,
          status: attemptStatus,
          error_code: suppressionCode,
          error_message: suppressionMessage,
          idempotency_key: buildNotificationIdempotencyKey({
            notificationId: notification.id,
            provider: input.provider
          }),
          next_attempt_at: attemptStatus === "queued" ? now : null,
          retry_count: 0,
          max_retries: DEFAULT_DELIVERY_MAX_RETRIES
        })
        .select("id,provider,channel,status,attempted_at,idempotency_key,retry_count,next_attempt_at,dead_lettered_at")
        .single()
    ]), 7000) as [
      { data: { id: string; provider_approval_status: string; approved_at: string } | null },
      { data: {
        id: string;
        provider: string;
        channel: string;
        status: string;
        attempted_at: string;
        idempotency_key: string;
        retry_count: number;
        next_attempt_at: string | null;
        dead_lettered_at: string | null;
      } | null }
    ];

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: notification.organization_id,
      actor_user_id: input.actorUserId,
      action: `provider_delivery_${input.decision}`,
      target_type: "notification",
      target_id: notification.id,
      summary: input.reason?.trim()
        ? `${input.provider} delivery ${input.decision}; attempt status ${attemptStatus}. Reason: ${input.reason.trim()}`
        : `${input.provider} delivery ${input.decision}; attempt status ${attemptStatus}.`
    }), 7000);

    return {
      ok: true,
      message: attemptStatus === "queued"
        ? "Provider delivery approved and queued as a delivery-attempt record. No external send occurred."
        : input.decision === "approved"
          ? "Provider delivery approved but suppressed by provider readiness or recipient preferences. No external send occurred."
          : "Provider delivery rejected and logged as suppressed.",
      notification: updatedNotification,
      attempt
    };
  } catch {
    return { ok: false, message: "Provider delivery review could not reach Supabase." };
  }
}

function queueFallback(): ProviderDeliveryReviewQueueItem[] {
  return [];
}

function attemptReason(attempt: {
  error_message: string | null;
  error_code: string | null;
  provider_status: string | null;
}) {
  return attempt.error_message ?? attempt.error_code ?? attempt.provider_status ?? "No provider attempt detail recorded.";
}

function retryContext(attempts: ProviderDeliveryAttemptHistoryItem[], approvalStatus: string) {
  const latest = attempts[0];
  if (!latest) {
    return {
      status: approvalStatus === "rejected" ? "suppressed" as const : "pending_review" as const,
      label: approvalStatus === "rejected" ? "Rejected before delivery attempt" : "No delivery attempt yet",
      retryCount: 0
    };
  }
  if (latest.deadLetteredAt) {
    return {
      status: "dead_lettered" as const,
      label: `Dead-lettered after ${latest.retryCount} retry attempt(s)`,
      retryCount: latest.retryCount,
      nextAttemptAt: latest.nextAttemptAt
    };
  }
  if (latest.status === "failed" || (latest.status === "queued" && latest.retryCount > 0)) {
    return {
      status: "retrying" as const,
      label: latest.nextAttemptAt ? `Retry ${latest.retryCount} scheduled` : `Retry ${latest.retryCount} pending review`,
      retryCount: latest.retryCount,
      nextAttemptAt: latest.nextAttemptAt
    };
  }
  if (latest.status === "suppressed") {
    return {
      status: "suppressed" as const,
      label: latest.reason,
      retryCount: latest.retryCount,
      nextAttemptAt: latest.nextAttemptAt
    };
  }
  return {
    status: "ready" as const,
    label: latest.status === "queued" ? "Queued for worker execution" : `Latest attempt ${latest.status}`,
    retryCount: latest.retryCount,
    nextAttemptAt: latest.nextAttemptAt
  };
}

export async function listProviderDeliveryReviewQueue(): Promise<{
  ok: boolean;
  message: string;
  queue: ProviderDeliveryReviewQueueItem[];
}> {
  try {
    const db = adminDb();
    const { data: notifications, error } = await withSupabaseTimeout(db
      .from("notifications")
      .select("id,organization_id,recipient_user_id,team_id,notification_type,title,body,channel,status,provider_approval_status,created_at")
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: false })
      .limit(100), 7000) as {
        data: Array<{
          id: string;
          organization_id: string;
          recipient_user_id: string;
          team_id: string;
          notification_type: string;
          title: string;
          body: string;
          channel: ProviderDeliveryChannel;
          status: string;
          provider_approval_status: "pending" | "approved" | "rejected" | null;
          created_at: string;
        }> | null;
        error: { message?: string } | null;
      };

    if (error) return { ok: false, message: "Provider delivery review queue could not be loaded.", queue: queueFallback() };

    const reviewNotifications = (notifications ?? []).filter((notification) => notification.provider_approval_status !== "approved");
    const notificationIds = reviewNotifications.map((notification) => notification.id);
    const teamIds = Array.from(new Set(reviewNotifications.map((notification) => notification.team_id)));
    const recipientIds = Array.from(new Set(reviewNotifications.map((notification) => notification.recipient_user_id)));

    const [
      { data: attempts },
      { data: teams },
      { data: profiles }
    ] = await withSupabaseTimeout(Promise.all([
      notificationIds.length
        ? db
          .from("notification_delivery_attempts")
          .select("id,notification_id,provider,channel,status,error_code,error_message,attempted_at,retry_count,next_attempt_at,dead_lettered_at,provider_status")
          .in("notification_id", notificationIds)
          .order("attempted_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      teamIds.length
        ? db.from("teams").select("id,name").in("id", teamIds)
        : Promise.resolve({ data: [] }),
      recipientIds.length
        ? db.from("profiles").select("id,display_name,email,phone").in("id", recipientIds)
        : Promise.resolve({ data: [] })
    ]), 7000) as [
      { data: Array<{
        id: string;
        notification_id: string;
        provider: string;
        channel: string;
        status: ProviderDeliveryAttemptStatus;
        error_code: string | null;
        error_message: string | null;
        attempted_at: string;
        retry_count: number | null;
        next_attempt_at: string | null;
        dead_lettered_at: string | null;
        provider_status: string | null;
      }> | null },
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; display_name: string | null; email: string | null; phone: string | null }> | null }
    ];

    const attemptsByNotificationId = new Map<string, ProviderDeliveryAttemptHistoryItem[]>();
    for (const attempt of attempts ?? []) {
      const history = attemptsByNotificationId.get(attempt.notification_id) ?? [];
      history.push({
        id: attempt.id,
        provider: attempt.provider,
        channel: attempt.channel,
        status: attempt.status,
        reason: attemptReason(attempt),
        retryCount: attempt.retry_count ?? 0,
        attemptedAt: attempt.attempted_at,
        nextAttemptAt: attempt.next_attempt_at ?? undefined,
        deadLetteredAt: attempt.dead_lettered_at ?? undefined,
        providerStatus: attempt.provider_status ?? undefined
      });
      attemptsByNotificationId.set(attempt.notification_id, history);
    }

    const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
    const recipientById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    const queue = reviewNotifications.map((notification) => {
      const provider = providerForChannel(notification.channel);
      const readiness = getProviderDeliveryReadiness(provider);
      const recipient = recipientById.get(notification.recipient_user_id);
      const attemptHistory = attemptsByNotificationId.get(notification.id) ?? [];
      const suppressionReasons = [
        readiness.configured ? "" : readiness.reason,
        notification.provider_approval_status === "rejected" ? "Rejected by delivery review." : ""
      ].filter(Boolean);
      return {
        notificationId: notification.id,
        organizationId: notification.organization_id,
        teamId: notification.team_id,
        teamName: teamNameById.get(notification.team_id) ?? "Team",
        recipientUserId: notification.recipient_user_id,
        recipientLabel: recipient?.display_name ?? recipient?.email ?? recipient?.phone ?? notification.recipient_user_id,
        notificationType: notification.notification_type,
        title: notification.title,
        body: notification.body,
        channel: notification.channel,
        provider,
        status: notification.status,
        approvalStatus: notification.provider_approval_status ?? "pending",
        createdAt: notification.created_at,
        suppressionReasons,
        retryContext: retryContext(attemptHistory, notification.provider_approval_status ?? "pending"),
        attemptHistory
      };
    });

    return {
      ok: true,
      message: "Provider delivery review queue loaded with retry context and attempt history.",
      queue
    };
  } catch {
    return { ok: false, message: "Provider delivery review queue could not reach Supabase.", queue: queueFallback() };
  }
}

type DeliveryAttemptRow = {
  id: string;
  notification_id: string;
  provider: ProviderDeliveryProvider;
  channel: ProviderDeliveryChannel;
  status: ProviderDeliveryAttemptStatus;
  attempted_at: string;
  idempotency_key: string;
  retry_count: number;
  max_retries: number;
  notifications: {
    id: string;
    organization_id: string;
    recipient_user_id: string;
    team_id: string;
    event_id: string | null;
    notification_type: string;
    title: string;
    body: string;
    created_at: string;
  } | null;
};

async function loadRecipientForNotification(db: UnsafeSupabase, notification: {
  recipient_user_id: string;
  channel: ProviderDeliveryChannel;
}) {
  const [{ data: profile }, { data: subscriptions }] = await withSupabaseTimeout(Promise.all([
    db.from("profiles").select("id,email,phone").eq("id", notification.recipient_user_id).single(),
    notification.channel === "push"
      ? db.from("push_subscriptions").select("endpoint,p256dh,auth_secret").eq("user_id", notification.recipient_user_id).eq("enabled", true)
      : Promise.resolve({ data: [] })
  ]), 7000) as [
    { data: { id: string; email: string | null; phone: string | null } | null },
    { data: Array<{ endpoint: string; p256dh: string; auth_secret: string }> | null }
  ];

  return {
    userId: notification.recipient_user_id,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    pushSubscriptions: (subscriptions ?? []).map((subscription): NotificationPushSubscription => ({
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      authSecret: subscription.auth_secret
    }))
  };
}

async function mapAttemptPayload(db: UnsafeSupabase, attempt: DeliveryAttemptRow): Promise<NotificationDeliveryPayload | null> {
  const notification = attempt.notifications;
  if (!notification) return null;

  const idempotencyKey = attempt.idempotency_key || buildNotificationIdempotencyKey({
    notificationId: attempt.notification_id,
    provider: attempt.provider
  });

  return {
    attemptId: attempt.id,
    notificationId: attempt.notification_id,
    organizationId: notification.organization_id,
    teamId: notification.team_id,
    eventId: notification.event_id,
    provider: attempt.provider,
    channel: attempt.channel,
    notificationType: notification.notification_type,
    title: notification.title,
    body: notification.body,
    recipient: await loadRecipientForNotification(db, {
      recipient_user_id: notification.recipient_user_id,
      channel: attempt.channel
    }),
    idempotencyKey,
    retryCount: attempt.retry_count ?? 0,
    maxRetries: attempt.max_retries ?? DEFAULT_DELIVERY_MAX_RETRIES,
    createdAt: notification.created_at,
    deliveryPolicy: await loadDeliveryPolicyForNotification(db, {
      recipient_user_id: notification.recipient_user_id,
      organization_id: notification.organization_id,
      team_id: notification.team_id,
      channel: attempt.channel,
      notification_type: notification.notification_type
    })
  };
}

function providerOutcomeConfirmsDelivery(outcome: NotificationDeliveryOutcome) {
  const providerStatus = String(outcome.providerStatus ?? "").toLowerCase();
  return outcome.status === "sent" && !["accepted", "queued", "sending", "sent", "processed"].includes(providerStatus);
}

export async function claimQueuedNotificationDeliveries(input: {
  workerId: string;
  limit?: number;
  now?: string;
}) {
  if (!input.workerId) return { ok: false, message: "Notification send worker requires a worker id.", attempts: [] };

  try {
    const db = adminDb();
    const now = input.now ?? new Date().toISOString();
    const staleLockBefore = new Date(new Date(now).getTime() - 15 * 60 * 1000).toISOString();
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    const { data: candidates, error: candidateError } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .select("id")
      .eq("status", "queued")
      .is("dead_lettered_at", null)
      .lte("next_attempt_at", now)
      .or(`locked_at.is.null,locked_at.lt.${staleLockBefore}`)
      .order("next_attempt_at", { ascending: true })
      .limit(limit), 7000) as {
        data: Array<{ id: string }> | null;
        error: { message?: string } | null;
      };

    if (candidateError) return { ok: false, message: "Notification delivery attempts could not be loaded.", attempts: [] };
    const ids = (candidates ?? []).map((candidate) => candidate.id);
    if (!ids.length) return { ok: true, message: "No notification delivery attempts are due.", attempts: [] };

    const { data: lockedAttempts, error: lockError } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .update({
        locked_at: now,
        locked_by: input.workerId
      })
      .in("id", ids)
      .eq("status", "queued")
      .is("dead_lettered_at", null)
      .select("id,notification_id,provider,channel,status,attempted_at,idempotency_key,retry_count,max_retries,notifications(id,organization_id,recipient_user_id,team_id,event_id,notification_type,title,body,created_at)"), 7000) as {
        data: DeliveryAttemptRow[] | null;
        error: { message?: string } | null;
      };

    if (lockError) return { ok: false, message: "Notification delivery attempts could not be locked.", attempts: [] };

    const attempts = (await Promise.all((lockedAttempts ?? []).map((attempt) => mapAttemptPayload(db, attempt))))
      .filter((attempt): attempt is NotificationDeliveryPayload => Boolean(attempt));

    return {
      ok: true,
      message: `${attempts.length} notification delivery attempt(s) claimed for execution.`,
      attempts
    };
  } catch {
    return { ok: false, message: "Notification delivery worker could not reach Supabase.", attempts: [] };
  }
}

export async function recordNotificationDeliveryOutcome(outcome: NotificationDeliveryOutcome) {
  try {
    const db = adminDb();
    const retrying = outcome.status === "failed" && Boolean(outcome.nextAttemptAt) && !outcome.deadLetteredAt;
    const attemptStatus: ProviderDeliveryAttemptStatus = retrying ? "queued" : outcome.status;
    const { data: attempt, error } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .update({
        status: attemptStatus,
        provider_message_id: outcome.providerMessageId ?? null,
        provider_status: outcome.providerStatus ?? null,
        provider_response_json: outcome.providerResponse ?? {},
        error_code: outcome.errorCode ?? null,
        error_message: outcome.errorMessage ?? null,
        attempted_at: outcome.attemptedAt,
        retry_count: outcome.retryCount,
        next_attempt_at: outcome.nextAttemptAt ?? null,
        dead_lettered_at: outcome.deadLetteredAt ?? null,
        locked_at: null,
        locked_by: null
      })
      .eq("id", outcome.attemptId)
      .select("id,status")
      .single(), 7000) as {
        data: { id: string; status: ProviderDeliveryAttemptStatus } | null;
        error: { message?: string } | null;
      };

    if (error || !attempt) return { ok: false, message: "Notification delivery attempt outcome could not be recorded." };

    if (providerOutcomeConfirmsDelivery(outcome)) {
      await withSupabaseTimeout(db
        .from("notifications")
        .update({ status: "sent", sent_at: outcome.attemptedAt })
        .eq("id", outcome.notificationId), 7000);
    } else if (outcome.deadLetteredAt) {
      await withSupabaseTimeout(db
        .from("notifications")
        .update({ status: "failed" })
        .eq("id", outcome.notificationId), 7000);
    }

    return {
      ok: true,
      message: retrying
        ? "Notification delivery attempt failed and was re-queued with retry metadata."
        : "Notification delivery attempt outcome recorded.",
      attempt
    };
  } catch {
    return { ok: false, message: "Notification delivery worker could not record the outcome." };
  }
}

export async function listProviderDeliveryRetryQueue(input: { actorUserId: string }) {
  if (!input.actorUserId) return { ok: false, message: "Provider retry queue requires an actor.", retryQueue: [] };

  try {
    const db = adminDb();
    const [{ data: teamMemberships }, { data: adminMemberships }] = await withSupabaseTimeout(Promise.all([
      db.from("team_memberships").select("team_id").eq("user_id", input.actorUserId).eq("role", "coach").eq("status", "active"),
      db.from("organization_memberships").select("organization_id").eq("user_id", input.actorUserId).eq("role", "admin").eq("status", "active")
    ]), 7000) as [
      { data: Array<{ team_id: string }> | null },
      { data: Array<{ organization_id: string }> | null }
    ];

    const teamIds = new Set((teamMemberships ?? []).map((membership) => membership.team_id));
    const organizationIds = new Set((adminMemberships ?? []).map((membership) => membership.organization_id));
    if (teamIds.size === 0 && organizationIds.size === 0) {
      return { ok: false, message: "Only assigned coaches or organization admins can view provider retry queues.", retryQueue: [] };
    }

    const { data, error } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .select("id,notification_id,provider,channel,status,error_code,error_message,attempted_at,retry_count,next_attempt_at,dead_lettered_at,provider_status,notifications(id,organization_id,team_id,title)")
      .in("status", ["failed", "suppressed"])
      .order("attempted_at", { ascending: false })
      .limit(50), 7000) as {
        data: Array<{
          id: string;
          notification_id: string;
          provider: string;
          channel: string;
          status: ProviderDeliveryAttemptStatus;
          error_code: string | null;
          error_message: string | null;
          attempted_at: string;
          retry_count: number | null;
          next_attempt_at: string | null;
          dead_lettered_at: string | null;
          provider_status: string | null;
          notifications: { id: string; organization_id: string; team_id: string; title: string } | null;
        }> | null;
        error: { message?: string } | null;
      };

    if (error) return { ok: false, message: "Provider retry queue could not be loaded.", retryQueue: [] };

    const retryQueue = (data ?? [])
      .filter((attempt) => {
        const notification = attempt.notifications;
        return Boolean(notification && (teamIds.has(notification.team_id) || organizationIds.has(notification.organization_id)));
      })
      .map((attempt) => ({
        id: attempt.id,
        notificationId: attempt.notification_id,
        title: attempt.notifications?.title ?? "Notification",
        provider: attempt.provider,
        channel: attempt.channel,
        status: attempt.status,
        reason: attempt.error_message ?? attempt.error_code ?? "Provider retry review required.",
        attemptedAt: attempt.attempted_at,
        retryCount: attempt.retry_count ?? 0,
        providerStatus: attempt.provider_status,
        deadLetteredAt: attempt.dead_lettered_at,
        nextReviewAt: attempt.next_attempt_at ?? new Date(new Date(attempt.attempted_at).getTime() + 15 * 60 * 1000).toISOString()
      }));

    return {
      ok: true,
      message: "Provider retry queue loaded for review. No external send occurred.",
      retryQueue
    };
  } catch {
    return { ok: false, message: "Provider retry queue could not reach Supabase.", retryQueue: [] };
  }
}
