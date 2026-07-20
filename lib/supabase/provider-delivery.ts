import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";
import { buildNotificationIdempotencyKey } from "@/lib/services/notifications/worker";
import type { NotificationDeliveryOutcome, NotificationDeliveryPayload } from "@/lib/services/notifications/types";
import { featureGateDecision } from "@/lib/services/feature-gates";

type ProviderDeliveryReviewDecision = "approved" | "rejected";
type ProviderDeliveryProvider = "email" | "sms" | "web_push";
type ProviderDeliveryChannel = "push" | "email" | "sms";
type ProviderDeliveryAttemptStatus = "queued" | "sent" | "failed" | "suppressed";
const DEFAULT_DELIVERY_MAX_RETRIES = 3;

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

export function getProviderDeliveryReadiness(
  provider: ProviderDeliveryProvider,
  env: Partial<NodeJS.ProcessEnv> = process.env
) {
  if (provider === "web_push") {
    const configured = Boolean(
      (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY) &&
      env.VAPID_PRIVATE_KEY &&
      (env.VAPID_SUBJECT || env.WEB_PUSH_SUBJECT)
    );
    return {
      configured,
      reason: configured
        ? "Web Push VAPID keys are configured; delivery still requires approval and preference checks."
        : "Web Push VAPID keys are missing, so approved attempts stay suppressed."
    };
  }

  if (provider === "email") {
    const configured = Boolean(env.RESEND_API_KEY || env.SENDGRID_API_KEY || env.EMAIL_PROVIDER_API_KEY);
    return {
      configured,
      reason: configured
        ? "Email provider credentials are configured; delivery still requires approval and preference checks."
        : "Email provider credentials are missing, so approved attempts stay suppressed."
    };
  }

  const configured = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_MESSAGING_SERVICE_SID || env.TWILIO_FROM_NUMBER));
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

async function recipientAllowsProviderDelivery(db: UnsafeSupabase, notification: {
  recipient_user_id: string;
  organization_id: string;
  team_id: string;
  channel: ProviderDeliveryChannel;
  notification_type: string;
}) {
  const { data } = await withSupabaseTimeout(db
    .from("notification_preferences")
    .select("id,organization_id,team_id,enabled")
    .eq("user_id", notification.recipient_user_id)
    .eq("channel", notification.channel)
    .eq("notification_type", notification.notification_type), 7000) as {
      data: Array<{ id: string; organization_id: string | null; team_id: string | null; enabled: boolean }> | null;
    };

  const matchingPreferences = (data ?? []).filter((preference) => (
    preference.team_id === notification.team_id ||
    preference.organization_id === notification.organization_id ||
    (!preference.team_id && !preference.organization_id)
  ));

  if (matchingPreferences.some((preference) => preference.enabled === false)) return false;
  if (matchingPreferences.some((preference) => preference.enabled === true)) return true;
  return notification.channel !== "sms";
}

export async function reviewNotificationDelivery(input: {
  notificationId: string;
  actorUserId: string;
  decision: ProviderDeliveryReviewDecision;
  provider: ProviderDeliveryProvider;
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
    const { data: organization } = await withSupabaseTimeout(db
      .from("organizations")
      .select("id,provider_sends_enabled")
      .eq("id", notification.organization_id)
      .maybeSingle(), 7000) as {
        data: { id: string; provider_sends_enabled: boolean } | null;
      };
    const providerGate = featureGateDecision({
      feature: "provider_sends",
      organizationEnabled: organization?.provider_sends_enabled
    });
    const providerConfigured = providerReadiness.configured && providerGate.enabled;
    const attemptStatus = providerAttemptStatus({
      decision: input.decision,
      preferencesAllowed,
      providerConfigured
    });
    const suppressionCode = providerSuppressionCode({
      decision: input.decision,
      preferencesAllowed,
      providerConfigured
    });
    const suppressionMessage = providerSuppressionMessage(
      suppressionCode,
      providerReadiness.configured ? providerGate.reason : providerReadiness.reason
    );
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
          idempotency_key: buildNotificationIdempotencyKey({
            notificationId: notification.id,
            provider: input.provider
          }),
          next_attempt_at: now,
          retry_count: 0,
          max_retries: DEFAULT_DELIVERY_MAX_RETRIES,
          approved_at: input.decision === "approved" ? now : null,
          error_code: suppressionCode,
          error_message: suppressionMessage
        })
        .select("id,provider,channel,status,attempted_at,idempotency_key,next_attempt_at,retry_count,max_retries")
        .single()
    ]), 7000) as [
      { data: { id: string; provider_approval_status: string; approved_at: string } | null },
      { data: { id: string; provider: string; channel: string; status: string; attempted_at: string; idempotency_key: string | null; next_attempt_at: string | null; retry_count: number; max_retries: number } | null }
    ];

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: notification.organization_id,
      actor_user_id: input.actorUserId,
      action: `provider_delivery_${input.decision}`,
      target_type: "notification",
      target_id: notification.id,
      summary: `${input.provider} delivery ${input.decision}; attempt status ${attemptStatus}.`
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

type DeliveryAttemptRow = {
  id: string;
  notification_id: string;
  provider: ProviderDeliveryProvider;
  channel: ProviderDeliveryChannel;
  status: ProviderDeliveryAttemptStatus;
  idempotency_key: string | null;
  retry_count: number | null;
  max_retries: number | null;
  next_attempt_at: string | null;
  notifications: {
    id: string;
    organization_id: string;
    recipient_user_id: string;
    team_id: string;
    notification_type: string;
    channel: ProviderDeliveryChannel;
    title: string;
    body: string;
  } | null;
};

async function loadRecipientForNotification(db: UnsafeSupabase, notification: NonNullable<DeliveryAttemptRow["notifications"]>) {
  const [{ data: profile }, { data: subscriptions }] = await withSupabaseTimeout(Promise.all([
    db.from("profiles").select("id,email,phone").eq("id", notification.recipient_user_id).maybeSingle(),
    db.from("push_subscriptions")
      .select("endpoint,p256dh,auth_secret")
      .eq("user_id", notification.recipient_user_id)
      .eq("enabled", true)
      .order("updated_at", { ascending: false })
      .limit(1)
  ]), 7000) as [
    { data: { id: string; email: string | null; phone: string | null } | null },
    { data: Array<{ endpoint: string; p256dh: string; auth_secret: string }> | null }
  ];

  return {
    userId: notification.recipient_user_id,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    pushEndpoint: subscriptions?.[0]?.endpoint ?? null,
    pushP256dh: subscriptions?.[0]?.p256dh ?? null,
    pushAuth: subscriptions?.[0]?.auth_secret ?? null
  };
}

async function mapAttemptPayload(db: UnsafeSupabase, attempt: DeliveryAttemptRow): Promise<NotificationDeliveryPayload | null> {
  if (!attempt.notifications) return null;
  const notification = attempt.notifications;
  const { data: organization } = await withSupabaseTimeout(db
    .from("organizations")
    .select("provider_sends_enabled")
    .eq("id", notification.organization_id)
    .maybeSingle(), 7000) as {
      data: { provider_sends_enabled: boolean } | null;
    };
  const retryCount = attempt.retry_count ?? 0;
  const maxRetries = attempt.max_retries ?? DEFAULT_DELIVERY_MAX_RETRIES;
  return {
    attemptId: attempt.id,
    notificationId: notification.id,
    provider: attempt.provider,
    channel: attempt.channel,
    organizationId: notification.organization_id,
    organizationProviderSendsEnabled: organization?.provider_sends_enabled === true,
    teamId: notification.team_id,
    title: notification.title,
    body: notification.body,
    notificationType: notification.notification_type,
    recipient: await loadRecipientForNotification(db, notification),
    idempotencyKey: attempt.idempotency_key ?? buildNotificationIdempotencyKey({
      notificationId: notification.id,
      provider: attempt.provider
    }),
    retryCount,
    maxRetries
  };
}

export async function claimQueuedNotificationDeliveries(input: {
  workerId: string;
  limit?: number;
  now?: string;
}) {
  const workerId = input.workerId.trim();
  if (!workerId) return { ok: false, message: "Notification delivery worker id is required.", attempts: [] as NotificationDeliveryPayload[] };

  try {
    const db = adminDb();
    const now = input.now ?? new Date().toISOString();
    const { data, error } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .select("id,notification_id,provider,channel,status,idempotency_key,retry_count,max_retries,next_attempt_at,notifications(id,organization_id,recipient_user_id,team_id,notification_type,channel,title,body)")
      .eq("status", "queued")
      .is("locked_at", null)
      .lte("next_attempt_at", now)
      .order("next_attempt_at", { ascending: true })
      .limit(Math.min(Math.max(input.limit ?? 10, 1), 50)), 7000) as {
        data: DeliveryAttemptRow[] | null;
        error: { message?: string } | null;
      };

    if (error) return { ok: false, message: "Queued notification delivery attempts could not be loaded.", attempts: [] };

    const claimed: NotificationDeliveryPayload[] = [];
    for (const attempt of data ?? []) {
      const { data: lockedAttempt } = await withSupabaseTimeout(db
        .from("notification_delivery_attempts")
        .update({ locked_at: now, locked_by: workerId })
        .eq("id", attempt.id)
        .eq("status", "queued")
        .is("locked_at", null)
        .select("id,notification_id,provider,channel,status,idempotency_key,retry_count,max_retries,next_attempt_at,notifications(id,organization_id,recipient_user_id,team_id,notification_type,channel,title,body)")
        .maybeSingle(), 7000) as { data: DeliveryAttemptRow | null };

      if (!lockedAttempt) continue;
      const payload = await mapAttemptPayload(db, lockedAttempt);
      if (payload) claimed.push(payload);
    }

    return {
      ok: true,
      message: `${claimed.length} notification delivery attempt(s) claimed for worker execution.`,
      attempts: claimed
    };
  } catch {
    return { ok: false, message: "Notification delivery worker could not reach Supabase.", attempts: [] };
  }
}

export async function recordNotificationDeliveryOutcome(outcome: NotificationDeliveryOutcome) {
  try {
    const db = adminDb();
    const storedStatus: ProviderDeliveryAttemptStatus = outcome.status === "failed" && outcome.nextAttemptAt ? "queued" : outcome.status;
    const updatePayload = {
      status: storedStatus,
      provider_message_id: outcome.providerMessageId ?? null,
      provider_status: outcome.providerStatus ?? null,
      error_code: outcome.errorCode ?? null,
      error_message: outcome.errorMessage ?? null,
      retry_count: outcome.retryCount,
      next_attempt_at: outcome.nextAttemptAt ?? new Date().toISOString(),
      dead_lettered_at: outcome.deadLetteredAt ?? null,
      provider_response_json: outcome.providerResponse ?? {},
      provider_accepted_at: outcome.status === "sent" ? new Date().toISOString() : null,
      locked_at: null,
      locked_by: null
    };

    const { data: attempt, error } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .update(updatePayload)
      .eq("id", outcome.attemptId)
      .select("id,notification_id,status,dead_lettered_at")
      .single(), 7000) as {
        data: { id: string; notification_id: string; status: ProviderDeliveryAttemptStatus; dead_lettered_at: string | null } | null;
        error: { message?: string } | null;
      };

    if (error || !attempt) return { ok: false, message: "Notification delivery outcome could not be recorded." };

    if (outcome.status === "sent") {
      await withSupabaseTimeout(db.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", attempt.notification_id), 7000);
    } else if (outcome.deadLetteredAt) {
      await withSupabaseTimeout(db.from("notifications").update({ status: "failed" }).eq("id", attempt.notification_id), 7000);
    }

    return {
      ok: true,
      message: outcome.status === "sent"
        ? "Provider acceptance recorded. Verified delivery still requires provider webhook evidence."
        : "Notification delivery attempt outcome recorded.",
      attempt
    };
  } catch {
    return { ok: false, message: "Notification delivery outcome could not reach Supabase." };
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
      .select("id,notification_id,provider,channel,status,error_code,error_message,attempted_at,notifications(id,organization_id,team_id,title)")
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
        nextReviewAt: new Date(new Date(attempt.attempted_at).getTime() + 15 * 60 * 1000).toISOString()
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
