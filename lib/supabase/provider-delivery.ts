import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";
import {
  buildNotificationIdempotencyKey,
  type NotificationDeliveryAuthorityDecision
} from "@/lib/services/notifications/worker";
import type { NotificationDeliveryOutcome, NotificationDeliveryPayload } from "@/lib/services/notifications/types";
import { featureGateDecision } from "@/lib/services/feature-gates";
import { pingramDeliveryConfigurationReady } from "@/lib/services/notifications/pingram";
import { resolveSmsProvider } from "@/lib/services/notifications/sms-provider";
import { normalizeSmsRecipient } from "@/lib/services/notifications/sms-contact-suppression";

type ProviderDeliveryReviewDecision = "approved" | "rejected";
type ProviderDeliveryProvider = "email" | "sms" | "web_push";
type ProviderDeliveryChannel = "push" | "email" | "sms";
type ProviderDeliveryAttemptStatus = "queued" | "sent" | "failed" | "suppressed";
const DEFAULT_DELIVERY_MAX_RETRIES = 3;

type UnsafeSupabase = {
  // Provider approval columns are staged until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, args: Record<string, unknown>): any;
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
      transportProvider: "web_push" as const,
      reason: configured
        ? "Web Push VAPID keys are configured; delivery still requires approval and preference checks."
        : "Web Push VAPID keys are missing, so approved attempts stay suppressed."
    };
  }

  if (provider === "email") {
    const configured = Boolean(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL);
    return {
      configured,
      transportProvider: "sendgrid" as const,
      reason: configured
        ? "SendGrid credentials are configured; delivery still requires approval and preference checks."
        : "SendGrid credentials are missing, so approved attempts stay suppressed."
    };
  }

  const smsProvider = resolveSmsProvider(env);
  if (smsProvider === "pingram") {
    const configured = pingramDeliveryConfigurationReady(env);
    return {
      configured,
      transportProvider: "pingram" as const,
      reason: configured
        ? "Pingram send, sender, webhook, and STOP-suppression configuration is present; delivery still requires approval and preference checks."
        : "Pingram is selected but its send, sender, webhook, or STOP-suppression configuration is incomplete, so approved attempts stay suppressed."
    };
  }

  if (smsProvider === "twilio") {
    const configured = Boolean(
      env.TWILIO_ACCOUNT_SID &&
      env.TWILIO_AUTH_TOKEN &&
      env.TWILIO_MESSAGING_SERVICE_SID
    );
    return {
      configured,
      transportProvider: "twilio" as const,
      reason: configured
        ? "Twilio rollback credentials are configured; delivery still requires approval, urgency, and preference checks."
        : "Twilio is selected but its Messaging Service credentials are missing, so approved attempts stay suppressed."
    };
  }

  return {
    configured: false,
    transportProvider: null,
    reason: "SMS_PROVIDER must explicitly select pingram or twilio before approved attempts can leave suppression."
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
  const { data, error } = await withSupabaseTimeout(db
    .from("notification_preferences")
    .select("id,organization_id,team_id,enabled")
    .eq("user_id", notification.recipient_user_id)
    .eq("channel", notification.channel)
    .eq("notification_type", notification.notification_type), 7000) as {
      data: Array<{ id: string; organization_id: string | null; team_id: string | null; enabled: boolean }> | null;
      error: { message?: string } | null;
    };
  if (error) throw new Error("Notification preference authority is unavailable.");

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
    const { data: transaction, error: transactionError } = await withSupabaseTimeout(
      db.rpc("review_notification_delivery_transaction", {
        p_notification_id: notification.id,
        p_actor_user_id: input.actorUserId,
        p_decision: input.decision,
        p_provider: input.provider,
        p_transport_provider: providerReadiness.transportProvider,
        p_attempt_status: attemptStatus,
        p_request_outcome: attemptStatus === "queued" ? "not_attempted" : "suppressed",
        p_error_code: suppressionCode,
        p_error_message: suppressionMessage
      }),
      7000
    ) as {
      data: {
        ok?: boolean;
        code?: string;
        notification?: {
          id: string;
          provider_approval_status: string;
          approved_at: string;
        };
        attempt?: {
          id: string;
          provider: string;
          transport_provider: string | null;
          channel: string;
          status: string;
          request_outcome: string | null;
          attempted_at: string;
          idempotency_key: string | null;
          next_attempt_at: string | null;
          retry_count: number;
          max_retries: number;
        };
      } | null;
      error: { message?: string } | null;
    };
    if (transactionError || !transaction?.ok || !transaction.notification || !transaction.attempt) {
      return {
        ok: false,
        message: transaction?.code === "review_conflict"
          ? "This provider delivery already has a different review decision."
          : "Provider delivery review could not be committed atomically."
      };
    }

    return {
      ok: true,
      message: attemptStatus === "queued"
        ? "Provider delivery approved and queued as a delivery-attempt record. No external send occurred."
        : input.decision === "approved"
          ? "Provider delivery approved but suppressed by provider readiness or recipient preferences. No external send occurred."
          : "Provider delivery rejected and logged as suppressed.",
      notification: transaction.notification,
      attempt: transaction.attempt
    };
  } catch {
    return { ok: false, message: "Provider delivery review could not reach Supabase." };
  }
}

type DeliveryAttemptRow = {
  id: string;
  notification_id: string;
  provider: ProviderDeliveryProvider;
  transport_provider: NotificationDeliveryPayload["transportProvider"] | null;
  channel: ProviderDeliveryChannel;
  status: ProviderDeliveryAttemptStatus;
  request_outcome: NotificationDeliveryOutcome["requestOutcome"] | null;
  approved_at: string | null;
  idempotency_key: string | null;
  retry_count: number | null;
  max_retries: number | null;
  next_attempt_at: string | null;
  reconciliation_required_at: string | null;
  dead_lettered_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
  notifications: {
    id: string;
    organization_id: string;
    recipient_user_id: string;
    team_id: string;
    notification_type: string;
    channel: ProviderDeliveryChannel;
    status: string;
    provider_approval_status: string;
    approved_at: string | null;
    title: string;
    body: string;
  } | null;
};

async function loadRecipientForNotification(db: UnsafeSupabase, notification: NonNullable<DeliveryAttemptRow["notifications"]>) {
  const { data: profile, error: profileError } = await withSupabaseTimeout(
    db.from("profiles")
      .select("id,email,phone")
      .eq("id", notification.recipient_user_id)
      .maybeSingle(),
    7000
  ) as {
    data: { id: string; email: string | null; phone: string | null } | null;
    error: { message?: string } | null;
  };
  if (profileError) throw new Error("Recipient contact authority is unavailable.");

  let subscriptions: Array<{ endpoint: string; p256dh: string; auth_secret: string }> | null = null;
  if (notification.channel === "push") {
    const subscriptionResult = await withSupabaseTimeout(db.from("push_subscriptions")
      .select("endpoint,p256dh,auth_secret")
      .eq("user_id", notification.recipient_user_id)
      .eq("enabled", true)
      .order("updated_at", { ascending: false })
      .limit(1), 7000) as {
        data: Array<{ endpoint: string; p256dh: string; auth_secret: string }> | null;
        error: { message?: string } | null;
      };
    if (subscriptionResult.error) throw new Error("Recipient contact authority is unavailable.");
    subscriptions = subscriptionResult.data;
  }

  return {
    userId: notification.recipient_user_id,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    pushEndpoint: subscriptions?.[0]?.endpoint ?? null,
    pushP256dh: subscriptions?.[0]?.p256dh ?? null,
    pushAuth: subscriptions?.[0]?.auth_secret ?? null
  };
}

async function suppressClaimedAttempt(
  db: UnsafeSupabase,
  attemptId: string,
  errorCode: string,
  errorMessage: string
) {
  await withSupabaseTimeout(db
    .from("notification_delivery_attempts")
    .update({
      status: "suppressed",
      request_outcome: "suppressed",
      error_code: errorCode,
      error_message: errorMessage,
      locked_at: null,
      locked_by: null,
      reconciliation_required_at: null
    })
    .eq("id", attemptId), 7000);
}

async function mapAttemptPayload(
  db: UnsafeSupabase,
  attempt: DeliveryAttemptRow,
  env: Partial<NodeJS.ProcessEnv>
): Promise<NotificationDeliveryPayload | null> {
  if (!attempt.notifications) {
    await suppressClaimedAttempt(
      db,
      attempt.id,
      "notification_missing",
      "Delivery attempt was suppressed because its notification record is unavailable."
    );
    return null;
  }
  const notification = attempt.notifications;
  if (
    notification.provider_approval_status !== "approved" ||
    !notification.approved_at ||
    !attempt.approved_at ||
    attempt.request_outcome !== "not_attempted" ||
    attempt.reconciliation_required_at ||
    attempt.dead_lettered_at
  ) {
    await suppressClaimedAttempt(
      db,
      attempt.id,
      "durable_provider_approval_missing",
      "Delivery was suppressed because its durable approval chain is incomplete or no longer sendable."
    );
    return null;
  }
  if (providerChannel(attempt.provider) !== notification.channel) {
    await suppressClaimedAttempt(
      db,
      attempt.id,
      "provider_channel_mismatch",
      "Delivery was suppressed because the approved provider does not match the notification channel."
    );
    return null;
  }
  const { data: organization, error: organizationError } = await withSupabaseTimeout(db
    .from("organizations")
    .select("provider_sends_enabled")
    .eq("id", notification.organization_id)
    .maybeSingle(), 7000) as {
      data: { provider_sends_enabled: boolean } | null;
      error: { message?: string } | null;
    };
  if (organizationError) throw new Error("Organization send authority is unavailable.");
  if (attempt.provider === "sms" && !attempt.transport_provider) {
    await suppressClaimedAttempt(
      db,
      attempt.id,
      "sms_transport_unbound",
      "SMS delivery was suppressed because the approved attempt is not bound to a transport provider."
    );
    return null;
  }
  if (
    attempt.provider === "sms" &&
    attempt.transport_provider !== resolveSmsProvider(env)
  ) {
    await suppressClaimedAttempt(
      db,
      attempt.id,
      "sms_transport_selection_changed",
      "Delivery was suppressed because the approved SMS transport is no longer selected."
    );
    return null;
  }

  const preferencesAllowed = await recipientAllowsProviderDelivery(db, notification);
  if (!preferencesAllowed) {
    await suppressClaimedAttempt(
      db,
      attempt.id,
      "recipient_preference_disabled",
      "Delivery was suppressed because the recipient preference is no longer enabled."
    );
    return null;
  }

  const recipient = await loadRecipientForNotification(db, notification);
  if (attempt.provider === "sms") {
    const phone = normalizeSmsRecipient(recipient.phone);
    if (!phone) {
      await suppressClaimedAttempt(
        db,
        attempt.id,
        "sms_suppression_authority_unavailable",
        "SMS delivery was suppressed because recipient or STOP-suppression authority is unavailable."
      );
      return null;
    }
    const { data: suppression } = await withSupabaseTimeout(db
      .from("sms_contact_suppressions")
      .select("state")
      .eq("organization_id", notification.organization_id)
      .eq("user_id", notification.recipient_user_id)
      .maybeSingle(), 7000) as {
        data: { state: "suppressed" | "subscribed" } | null;
      };
    if (suppression?.state === "suppressed") {
      await suppressClaimedAttempt(
        db,
        attempt.id,
        "sms_contact_suppressed",
        "SMS delivery was suppressed by verified provider opt-out evidence."
      );
      return null;
    }
  }

  const retryCount = attempt.retry_count ?? 0;
  const maxRetries = attempt.max_retries ?? DEFAULT_DELIVERY_MAX_RETRIES;
  return {
    attemptId: attempt.id,
    notificationId: notification.id,
    provider: attempt.provider,
    transportProvider: attempt.transport_provider ?? undefined,
    channel: attempt.channel,
    organizationId: notification.organization_id,
    organizationProviderSendsEnabled: organization?.provider_sends_enabled === true,
    teamId: notification.team_id,
    title: notification.title,
    body: notification.body,
    notificationType: notification.notification_type,
    recipient,
    idempotencyKey: attempt.idempotency_key ?? buildNotificationIdempotencyKey({
      notificationId: notification.id,
      provider: attempt.provider
    }),
    retryCount,
    maxRetries
  };
}

function denyDeliveryAuthority(
  errorCode: string,
  errorMessage: string
): NotificationDeliveryAuthorityDecision {
  return {
    allowed: false,
    errorCode,
    errorMessage
  };
}

function expectedTransportProvider(
  provider: ProviderDeliveryProvider,
  env: Partial<NodeJS.ProcessEnv>
): NotificationDeliveryPayload["transportProvider"] | null {
  if (provider === "email") return "sendgrid";
  if (provider === "web_push") return "web_push";
  return resolveSmsProvider(env);
}

function deliveryBindingMatches(
  attempt: DeliveryAttemptRow,
  payload: NotificationDeliveryPayload
) {
  const notification = attempt.notifications;
  return Boolean(
    notification &&
    attempt.id === payload.attemptId &&
    attempt.notification_id === payload.notificationId &&
    attempt.provider === payload.provider &&
    attempt.transport_provider === payload.transportProvider &&
    attempt.channel === payload.channel &&
    attempt.idempotency_key === payload.idempotencyKey &&
    notification.id === payload.notificationId &&
    notification.organization_id === payload.organizationId &&
    notification.recipient_user_id === payload.recipient.userId &&
    notification.team_id === payload.teamId &&
    notification.notification_type === payload.notificationType &&
    notification.channel === payload.channel &&
    notification.title === payload.title &&
    notification.body === payload.body
  );
}

/**
 * Re-loads send authority after a batch claim and immediately before the
 * provider adapter executes. A denial is returned as a suppressible worker
 * outcome so no provider call occurs and the attempt remains auditable.
 */
export async function recheckNotificationDeliveryAuthority(input: {
  payload: NotificationDeliveryPayload;
  workerId: string;
  env?: Partial<NodeJS.ProcessEnv>;
}): Promise<NotificationDeliveryAuthorityDecision> {
  const workerId = input.workerId.trim();
  if (!workerId) {
    return denyDeliveryAuthority(
      "delivery_worker_identity_missing",
      "Delivery was suppressed because the claiming worker identity is unavailable."
    );
  }

  try {
    const db = adminDb();
    const env = input.env ?? process.env;
    const { data: attempt, error: attemptError } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .select("id,notification_id,provider,transport_provider,channel,status,request_outcome,approved_at,idempotency_key,retry_count,max_retries,next_attempt_at,reconciliation_required_at,dead_lettered_at,locked_at,locked_by,notifications(id,organization_id,recipient_user_id,team_id,notification_type,channel,status,provider_approval_status,approved_at,title,body)")
      .eq("id", input.payload.attemptId)
      .maybeSingle(), 7000) as {
        data: DeliveryAttemptRow | null;
        error: { message?: string } | null;
      };

    if (attemptError) throw new Error("Delivery attempt authority is unavailable.");
    if (!attempt) {
      return denyDeliveryAuthority(
        "delivery_attempt_missing",
        "Delivery was suppressed because the claimed attempt no longer exists."
      );
    }
    if (
      attempt.status !== "queued" ||
      attempt.request_outcome !== "not_attempted" ||
      !attempt.locked_at ||
      attempt.locked_by !== workerId ||
      attempt.reconciliation_required_at ||
      attempt.dead_lettered_at
    ) {
      return denyDeliveryAuthority(
        "delivery_attempt_not_sendable",
        "Delivery was suppressed because the exact claimed attempt is no longer sendable."
      );
    }
    if (!deliveryBindingMatches(attempt, input.payload)) {
      return denyDeliveryAuthority(
        "delivery_approval_binding_changed",
        "Delivery was suppressed because approved content, recipient, scope, or provider binding changed."
      );
    }

    const notification = attempt.notifications;
    if (
      !notification ||
      notification.status !== "pending" ||
      notification.provider_approval_status !== "approved" ||
      !notification.approved_at ||
      !attempt.approved_at ||
      notification.approved_at !== attempt.approved_at
    ) {
      return denyDeliveryAuthority(
        "durable_provider_approval_missing",
        "Delivery was suppressed because its durable notification and attempt approval chain is incomplete."
      );
    }
    if (providerChannel(attempt.provider) !== notification.channel) {
      return denyDeliveryAuthority(
        "provider_channel_mismatch",
        "Delivery was suppressed because the approved provider does not match the notification channel."
      );
    }

    const expectedTransport = expectedTransportProvider(attempt.provider, env);
    if (!expectedTransport || attempt.transport_provider !== expectedTransport) {
      return denyDeliveryAuthority(
        attempt.provider === "sms"
          ? "sms_transport_selection_changed"
          : "provider_transport_binding_changed",
        "Delivery was suppressed because the currently selected provider transport does not match the approved attempt."
      );
    }

    const [
      organizationResult,
      preferencesAllowed,
      recipient,
      suppressionResult
    ] = await Promise.all([
      withSupabaseTimeout(db
        .from("organizations")
        .select("provider_sends_enabled")
        .eq("id", notification.organization_id)
        .maybeSingle(), 7000) as Promise<{
          data: { provider_sends_enabled: boolean } | null;
          error: { message?: string } | null;
        }>,
      recipientAllowsProviderDelivery(db, notification),
      loadRecipientForNotification(db, notification),
      attempt.provider === "sms"
        ? withSupabaseTimeout(db
          .from("sms_contact_suppressions")
          .select("state")
          .eq("organization_id", notification.organization_id)
          .eq("user_id", notification.recipient_user_id)
          .maybeSingle(), 7000) as Promise<{
            data: { state: "suppressed" | "subscribed" } | null;
            error: { message?: string } | null;
          }>
        : Promise.resolve({
          data: null,
          error: null
        })
    ]);

    if (organizationResult.error || suppressionResult.error) {
      throw new Error("Current delivery authority is unavailable.");
    }
    if (organizationResult.data?.provider_sends_enabled !== true) {
      return denyDeliveryAuthority(
        "organization_provider_sends_disabled",
        "Delivery was suppressed because provider sends are currently disabled for this organization."
      );
    }
    if (!preferencesAllowed) {
      return denyDeliveryAuthority(
        "recipient_preference_disabled",
        "Delivery was suppressed because the recipient preference is currently disabled."
      );
    }
    if (suppressionResult.data?.state === "suppressed") {
      return denyDeliveryAuthority(
        "sms_contact_suppressed",
        "Delivery was suppressed by current verified SMS opt-out evidence."
      );
    }
    if (
      (attempt.provider === "email" && !recipient.email?.trim()) ||
      (attempt.provider === "sms" && !normalizeSmsRecipient(recipient.phone)) ||
      (
        attempt.provider === "web_push" &&
        (!recipient.pushEndpoint || !recipient.pushP256dh || !recipient.pushAuth)
      )
    ) {
      return denyDeliveryAuthority(
        "recipient_contact_unavailable",
        "Delivery was suppressed because the recipient's current provider contact is unavailable."
      );
    }

    return {
      allowed: true,
      payload: {
        ...input.payload,
        organizationProviderSendsEnabled: true,
        recipient
      }
    };
  } catch {
    return denyDeliveryAuthority(
      "delivery_authority_unavailable",
      "Delivery was suppressed because current send authority could not be verified."
    );
  }
}

export async function claimQueuedNotificationDeliveries(input: {
  workerId: string;
  limit?: number;
  now?: string;
  env?: Partial<NodeJS.ProcessEnv>;
}) {
  const workerId = input.workerId.trim();
  if (!workerId) return { ok: false, message: "Notification delivery worker id is required.", attempts: [] as NotificationDeliveryPayload[] };

  try {
    const db = adminDb();
    const now = input.now ?? new Date().toISOString();
    const env = input.env ?? process.env;
    const { data, error } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .select("id,notification_id,provider,transport_provider,channel,status,request_outcome,approved_at,idempotency_key,retry_count,max_retries,next_attempt_at,reconciliation_required_at,dead_lettered_at,locked_at,locked_by,notifications(id,organization_id,recipient_user_id,team_id,notification_type,channel,status,provider_approval_status,approved_at,title,body)")
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
        .select("id,notification_id,provider,transport_provider,channel,status,request_outcome,approved_at,idempotency_key,retry_count,max_retries,next_attempt_at,reconciliation_required_at,dead_lettered_at,locked_at,locked_by,notifications(id,organization_id,recipient_user_id,team_id,notification_type,channel,status,provider_approval_status,approved_at,title,body)")
        .maybeSingle(), 7000) as { data: DeliveryAttemptRow | null };

      if (!lockedAttempt) continue;
      const payload = await mapAttemptPayload(db, lockedAttempt, env);
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
    const recordedAt = new Date().toISOString();
    const storedStatus: ProviderDeliveryAttemptStatus = outcome.status === "failed" && outcome.nextAttemptAt ? "queued" : outcome.status;
    const updatePayload = {
      status: storedStatus,
      transport_provider: outcome.transportProvider ?? null,
      request_outcome: outcome.requestOutcome ?? null,
      provider_message_id: outcome.providerMessageId ?? null,
      provider_status: outcome.providerStatus ?? null,
      error_code: outcome.errorCode ?? null,
      error_message: outcome.errorMessage ?? null,
      retry_count: outcome.retryCount,
      next_attempt_at: outcome.nextAttemptAt ?? recordedAt,
      dead_lettered_at: outcome.deadLetteredAt ?? null,
      reconciliation_required_at: outcome.requestOutcome === "indeterminate" ? recordedAt : null,
      provider_response_json: outcome.providerResponse ?? {},
      provider_accepted_at: outcome.requestOutcome === "provider_accepted" ? recordedAt : null,
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

    if (outcome.requestOutcome === "provider_accepted") {
      await withSupabaseTimeout(db.from("notifications").update({ status: "sent", sent_at: recordedAt }).eq("id", attempt.notification_id), 7000);
    } else if (outcome.deadLetteredAt) {
      await withSupabaseTimeout(db.from("notifications").update({ status: "failed" }).eq("id", attempt.notification_id), 7000);
    }

    return {
      ok: true,
      message: outcome.requestOutcome === "provider_accepted"
        ? "Provider acceptance recorded. Verified delivery still requires provider webhook evidence."
        : outcome.requestOutcome === "indeterminate"
          ? "Provider outcome is indeterminate. Automatic retry is blocked pending reconciliation."
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
