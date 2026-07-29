import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";
import type {
  NotificationDeliveryRequestOutcome,
  NotificationDeliveryTransportProvider
} from "@/lib/services/notifications/types";

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
  transportProvider?: NotificationDeliveryTransportProvider;
  attemptStatus: "not_requested" | "queued" | "sent" | "failed" | "suppressed";
  requestOutcome?: NotificationDeliveryRequestOutcome;
  approvedAt?: string;
  providerAcceptedAt?: string;
  deliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  reconciliationRequiredAt?: string;
  errorMessage?: string;
}

export interface OfficialCommunicationHistoryEntry {
  versionId: string;
  versionNumber: number;
  action: "published" | "corrected" | "withdrawn";
  title: string;
  body: string;
  reason: string;
  approvedByName?: string;
  publishedAt: string;
}

export interface OfficialCommunicationRevision {
  threadId: string;
  versionId: string;
  versionNumber: number;
  action: "published" | "corrected" | "withdrawn";
  priority: "routine" | "action_required" | "disruption" | "critical";
  reason: string;
  approvedByUserId: string;
  approvedByName?: string;
  publishedAt: string;
  eventScheduleVersion: number;
  threadState: "published" | "withdrawn";
  requiredProjectionCount: number;
  readyProjectionCount: number;
  partialPropagation: boolean;
  history: OfficialCommunicationHistoryEntry[];
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
  officialRevision?: OfficialCommunicationRevision;
}

type NotificationAttemptRow = {
  id: string;
  provider: "email" | "sms" | "web_push";
  transport_provider: NotificationDeliveryTransportProvider | null;
  status: "queued" | "sent" | "failed" | "suppressed";
  request_outcome: NotificationDeliveryRequestOutcome | null;
  approved_at: string | null;
  provider_accepted_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
  reconciliation_required_at: string | null;
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

type OfficialVersionRow = {
  id: string;
  thread_id: string;
  version_number: number;
  action: OfficialCommunicationRevision["action"];
  priority: OfficialCommunicationRevision["priority"];
  title: string;
  body: string;
  reason: string;
  approved_by_user_id: string;
  published_at: string;
  event_schedule_version: number;
};

type OfficialThreadRow = {
  id: string;
  state: OfficialCommunicationRevision["threadState"];
  current_version_id: string;
};

type OfficialProjectionRow = {
  version_id: string;
  required: boolean;
  status: "ready" | "pending" | "failed" | "withdrawn";
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
      transportProvider: attempt?.transport_provider ?? undefined,
      attemptStatus: attempt?.status ?? "not_requested",
      requestOutcome: attempt?.request_outcome ?? undefined,
      approvedAt: attempt?.approved_at ?? undefined,
      providerAcceptedAt: attempt?.provider_accepted_at ?? undefined,
      deliveredAt: attempt?.delivered_at ?? undefined,
      readAt: attempt?.read_at ?? undefined,
      acknowledgedAt: attempt?.acknowledged_at ?? undefined,
      reconciliationRequiredAt: attempt?.reconciliation_required_at ?? undefined,
      errorMessage: attempt?.error_message ?? undefined
    }
  };
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

async function enrichOfficialCommunicationReceipts(
  db: UnsafeSupabase,
  receipts: NotificationReceipt[]
): Promise<NotificationReceipt[]> {
  if (!receipts.length) return receipts;
  try {
    const notificationIds = receipts.map((receipt) => receipt.notificationId);
    const { data: links, error: linksError } = await withSupabaseTimeout(db
      .from("official_communication_notification_links")
      .select("notification_id,version_id")
      .in("notification_id", notificationIds), 7000) as {
        data: Array<{ notification_id: string; version_id: string }> | null;
        error?: { message?: string } | null;
      };
    if (linksError || !links?.length) return receipts;
    const versionIds = [...new Set(links.map((link) => link.version_id))];
    const { data: linkedVersions, error: versionError } = await withSupabaseTimeout(db
      .from("official_communication_versions")
      .select("id,thread_id,version_number,action,priority,title,body,reason,approved_by_user_id,published_at,event_schedule_version")
      .in("id", versionIds), 7000) as { data: OfficialVersionRow[] | null; error?: { message?: string } | null };
    if (versionError || !linkedVersions?.length) return receipts;
    const threadIds = [...new Set(linkedVersions.map((version) => version.thread_id))];
    const [{ data: threads, error: threadError }, { data: history, error: historyError }] = await withSupabaseTimeout(Promise.all([
      db.from("official_communication_threads")
        .select("id,state,current_version_id")
        .in("id", threadIds),
      db.from("official_communication_versions")
        .select("id,thread_id,version_number,action,priority,title,body,reason,approved_by_user_id,published_at,event_schedule_version")
        .in("thread_id", threadIds)
        .order("version_number", { ascending: false })
    ]), 7000) as [
      { data: OfficialThreadRow[] | null; error?: { message?: string } | null },
      { data: OfficialVersionRow[] | null; error?: { message?: string } | null }
    ];
    if (threadError || historyError) return receipts;
    const currentVersions = (history ?? []).filter((version) => (
      threads?.some((thread) => thread.id === version.thread_id && thread.current_version_id === version.id)
    ));
    const currentVersionIds = currentVersions.map((version) => version.id);
    const approverIds = [...new Set((history ?? []).map((version) => version.approved_by_user_id))];
    const [{ data: projections }, { data: approvers }] = await withSupabaseTimeout(Promise.all([
      currentVersionIds.length
        ? db.from("official_communication_projections")
          .select("version_id,required,status")
          .in("version_id", currentVersionIds)
        : Promise.resolve({ data: [] }),
      approverIds.length
        ? db.from("profiles").select("id,display_name").in("id", approverIds)
        : Promise.resolve({ data: [] })
    ]), 7000) as [
      { data: OfficialProjectionRow[] | null; error?: { message?: string } | null },
      { data: Array<{ id: string; display_name: string }> | null; error?: { message?: string } | null }
    ];
    const linkByNotificationId = new Map(links.map((link) => [link.notification_id, link.version_id]));
    const versionById = new Map((history ?? []).map((version) => [version.id, version]));
    const threadById = new Map((threads ?? []).map((thread) => [thread.id, thread]));
    const approverById = new Map((approvers ?? []).map((profile) => [profile.id, profile.display_name]));

    return receipts.flatMap((receipt): NotificationReceipt[] => {
      const linkedVersionId = linkByNotificationId.get(receipt.notificationId);
      if (!linkedVersionId) return [receipt];
      const linkedVersion = versionById.get(linkedVersionId);
      const thread = linkedVersion ? threadById.get(linkedVersion.thread_id) : undefined;
      if (!linkedVersion || !thread) return [];
      if (thread.current_version_id !== linkedVersion.id) return [];
      const requiredProjections = (projections ?? []).filter((projection) => (
        projection.version_id === linkedVersion.id && projection.required
      ));
      const readyProjectionCount = requiredProjections.filter((projection) => projection.status === "ready").length;
      const versionHistory = (history ?? [])
        .filter((version) => version.thread_id === linkedVersion.thread_id)
        .map((version): OfficialCommunicationHistoryEntry => ({
          versionId: version.id,
          versionNumber: version.version_number,
          action: version.action,
          title: version.title,
          body: version.body,
          reason: version.reason,
          approvedByName: approverById.get(version.approved_by_user_id),
          publishedAt: version.published_at
        }));
      return [{
        ...receipt,
        title: linkedVersion.title,
        body: linkedVersion.body,
        officialRevision: {
          threadId: linkedVersion.thread_id,
          versionId: linkedVersion.id,
          versionNumber: linkedVersion.version_number,
          action: linkedVersion.action,
          priority: linkedVersion.priority,
          reason: linkedVersion.reason,
          approvedByUserId: linkedVersion.approved_by_user_id,
          approvedByName: approverById.get(linkedVersion.approved_by_user_id),
          publishedAt: linkedVersion.published_at,
          eventScheduleVersion: linkedVersion.event_schedule_version,
          threadState: thread.state,
          requiredProjectionCount: requiredProjections.length,
          readyProjectionCount,
          partialPropagation: requiredProjections.some((projection) => projection.status !== "ready"),
          history: versionHistory
        }
      }];
    });
  } catch {
    // Migration 0030 is intentionally optional until ordered promotion.
    return receipts;
  }
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
  "notification_delivery_attempts(id,provider,transport_provider,status,request_outcome,approved_at,provider_accepted_at,delivered_at,read_at,acknowledged_at,reconciliation_required_at,error_message,attempted_at)"
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
    const db = dbClient();
    const { data, error } = await withSupabaseTimeout(db
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

    const receipts = (data ?? []).map((row) => mapNotificationReceipt(
      row,
      row.approved_by_user_id ? approverNames.get(row.approved_by_user_id) : undefined
    ));
    return {
      ok: true,
      message: "Notification receipts loaded for the signed-in recipient.",
      receipts: await enrichOfficialCommunicationReceipts(db, receipts)
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
    const db = dbClient();
    const { data, error } = await withSupabaseTimeout(db
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
      receipts: await enrichOfficialCommunicationReceipts(
        db,
        (data ?? []).map((row) => mapNotificationReceipt(row))
      )
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
