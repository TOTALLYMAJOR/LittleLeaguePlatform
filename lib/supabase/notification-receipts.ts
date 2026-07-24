import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Notification evidence spans staged migrations. Keep this adapter dynamic
  // until generated Supabase types cover every provider-evidence column.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, parameters: Record<string, unknown>): any;
};

export interface NotificationDeliveryEvidence {
  attemptId?: string;
  provider?: "email" | "sms" | "web_push";
  attemptStatus: "not_requested" | "queued" | "sent" | "failed" | "suppressed";
  approvedAt?: string;
  providerAcceptedAt?: string;
  deliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  errorMessage?: string;
}

export interface NotificationReceipt {
  notificationId: string;
  organizationId: string;
  teamId: string;
  eventId?: string;
  recipientUserId: string;
  title: string;
  body: string;
  channel: "push" | "email" | "sms";
  notificationType: string;
  notificationStatus: "pending" | "sent" | "failed" | "read";
  providerApprovalStatus: "pending" | "approved" | "rejected";
  approvedByUserId?: string;
  approvedByName?: string;
  createdAt: string;
  sentAt?: string;
  notificationReadAt?: string;
  evidence: NotificationDeliveryEvidence;
}

type NotificationAttemptRow = {
  id: string;
  provider: "email" | "sms" | "web_push";
  status: "queued" | "sent" | "failed" | "suppressed";
  approved_at: string | null;
  provider_accepted_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
  error_message: string | null;
  attempted_at: string;
};

type NotificationRow = {
  id: string;
  organization_id: string;
  team_id: string;
  event_id: string | null;
  recipient_user_id: string;
  title: string;
  body: string;
  channel: "push" | "email" | "sms";
  notification_type: string;
  status: "pending" | "sent" | "failed" | "read";
  provider_approval_status: "pending" | "approved" | "rejected";
  approved_by_user_id?: string | null;
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
  notification_delivery_attempts: NotificationAttemptRow[] | null;
};

function latestAttempt(attempts: NotificationAttemptRow[] | null | undefined) {
  return [...(attempts ?? [])]
    .sort((left, right) => Date.parse(right.attempted_at) - Date.parse(left.attempted_at))[0];
}

export function mapNotificationReceipt(row: NotificationRow, approvedByName?: string): NotificationReceipt {
  const attempt = latestAttempt(row.notification_delivery_attempts);
  return {
    notificationId: row.id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    eventId: row.event_id ?? undefined,
    recipientUserId: row.recipient_user_id,
    title: row.title,
    body: row.body,
    channel: row.channel,
    notificationType: row.notification_type,
    notificationStatus: row.status,
    providerApprovalStatus: row.provider_approval_status,
    approvedByUserId: row.approved_by_user_id ?? undefined,
    approvedByName,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? undefined,
    notificationReadAt: row.read_at ?? undefined,
    evidence: {
      attemptId: attempt?.id,
      provider: attempt?.provider,
      attemptStatus: attempt?.status ?? "not_requested",
      approvedAt: attempt?.approved_at ?? undefined,
      providerAcceptedAt: attempt?.provider_accepted_at ?? undefined,
      deliveredAt: attempt?.delivered_at ?? undefined,
      readAt: attempt?.read_at ?? undefined,
      acknowledgedAt: attempt?.acknowledged_at ?? undefined,
      errorMessage: attempt?.error_message ?? undefined
    }
  };
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

const receiptSelect = [
  "id",
  "organization_id",
  "team_id",
  "event_id",
  "recipient_user_id",
  "title",
  "body",
  "channel",
  "notification_type",
  "status",
  "provider_approval_status",
  "approved_by_user_id",
  "created_at",
  "sent_at",
  "read_at",
  "notification_delivery_attempts(id,provider,status,approved_at,provider_accepted_at,delivered_at,read_at,acknowledged_at,error_message,attempted_at)"
].join(",");

export async function listParentNotificationReceipts(input: {
  parentUserId: string;
  limit?: number;
}) {
  if (!input.parentUserId) {
    return {
      ok: false,
      message: "Notification receipts require a signed-in parent.",
      receipts: [] as NotificationReceipt[]
    };
  }

  try {
    const { data, error } = await withSupabaseTimeout(dbClient()
      .from("notifications")
      .select(receiptSelect)
      .eq("recipient_user_id", input.parentUserId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(input.limit ?? 12, 1), 50)), 7000) as {
        data: NotificationRow[] | null;
        error: { message?: string } | null;
      };

    if (error) {
      return {
        ok: false,
        message: "Notification receipt evidence is unavailable. No delivery state was inferred.",
        receipts: [] as NotificationReceipt[]
      };
    }

    const approverIds = Array.from(new Set((data ?? [])
      .map((row) => row.approved_by_user_id)
      .filter((value): value is string => Boolean(value))));
    const approvers = approverIds.length
      ? await withSupabaseTimeout(dbClient()
        .from("profiles")
        .select("id,display_name")
        .in("id", approverIds), 7000) as {
          data: Array<{ id: string; display_name: string }> | null;
          error: { message?: string } | null;
        }
      : { data: [], error: null };
    const approverNames = new Map((approvers.data ?? []).map((profile) => [profile.id, profile.display_name]));

    return {
      ok: true,
      message: "Notification receipts loaded for the signed-in recipient.",
      receipts: (data ?? []).map((row) => mapNotificationReceipt(
        row,
        row.approved_by_user_id ? approverNames.get(row.approved_by_user_id) : undefined
      ))
    };
  } catch {
    return {
      ok: false,
      message: "Notification receipt evidence could not reach team records.",
      receipts: [] as NotificationReceipt[]
    };
  }
}

export async function listOrganizationNotificationReceipts(input: {
  organizationIds: string[];
  limit?: number;
}) {
  const organizationIds = Array.from(new Set(input.organizationIds.filter(Boolean)));
  if (!organizationIds.length) {
    return {
      ok: false,
      message: "Delivery review requires organization-admin scope.",
      receipts: [] as NotificationReceipt[]
    };
  }

  try {
    const { data, error } = await withSupabaseTimeout(dbClient()
      .from("notifications")
      .select(receiptSelect)
      .in("organization_id", organizationIds)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(input.limit ?? 40, 1), 100)), 7000) as {
        data: NotificationRow[] | null;
        error: { message?: string } | null;
      };

    if (error) {
      return {
        ok: false,
        message: "Organization delivery evidence is unavailable.",
        receipts: [] as NotificationReceipt[]
      };
    }

    return {
      ok: true,
      message: "Organization delivery evidence loaded without collapsing approval, acceptance, delivery, read, or acknowledgment.",
      receipts: (data ?? []).map((row) => mapNotificationReceipt(row))
    };
  } catch {
    return {
      ok: false,
      message: "Organization delivery evidence could not reach team records.",
      receipts: [] as NotificationReceipt[]
    };
  }
}

export async function acknowledgeNotificationReceipt(input: {
  notificationId: string;
  parentUserId: string;
}) {
  if (!input.notificationId || !input.parentUserId) {
    return { ok: false, message: "Notification acknowledgment requires notification and recipient." };
  }

  try {
    const db = dbClient();
    const { data, error } = await withSupabaseTimeout(db.rpc("acknowledge_notification_receipt", {
      p_notification_id: input.notificationId,
      p_recipient_user_id: input.parentUserId
    }), 7000) as {
      data: Record<string, unknown> | null;
      error: { message?: string } | null;
    };
    if (error || !data) return { ok: false, message: "Notification acknowledgment could not be recorded." };
    return data;
  } catch {
    return { ok: false, message: "Notification acknowledgment could not reach team records." };
  }
}
