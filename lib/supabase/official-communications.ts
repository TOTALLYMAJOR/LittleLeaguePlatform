import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Migration 0030 intentionally leads generated provider types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, parameters: Record<string, unknown>): any;
};

export type OfficialCommunicationAction = "published" | "corrected" | "withdrawn";
export type OfficialCommunicationCategory = "official_disruption" | "critical_instruction" | "official_update";
export type OfficialCommunicationPriority = "routine" | "action_required" | "disruption" | "critical";

export interface OfficialCommunicationThreadView {
  id: string;
  organizationId: string;
  teamId: string;
  eventId: string;
  category: OfficialCommunicationCategory;
  state: "published" | "withdrawn";
  currentVersionNumber: number;
  currentVersionId: string;
  title: string;
  body: string;
  reason: string;
  priority: OfficialCommunicationPriority;
  approvedByUserId: string;
  approvedByName?: string;
  publishedAt: string;
  eventScheduleVersion: number;
  requiredProjectionCount: number;
  readyProjectionCount: number;
  openIncident: boolean;
}

export interface OfficialCommunicationReviewData {
  ok: boolean;
  message: string;
  threads: OfficialCommunicationThreadView[];
}

export interface PublishOfficialCommunicationInput {
  actorUserId: string;
  threadId?: string;
  eventId: string;
  action: OfficialCommunicationAction;
  category: OfficialCommunicationCategory;
  priority: OfficialCommunicationPriority;
  title: string;
  body: string;
  reason: string;
  expectedThreadVersion: number;
  expectedScheduleVersion: number;
  idempotencyKey: string;
}

export interface PublishOfficialCommunicationResult {
  ok: boolean;
  message: string;
  threadId?: string;
  versionId?: string;
  versionNumber?: number;
  eventScheduleVersion?: number;
  notificationCount?: number;
  providerExecution?: "not_started";
  idempotentReplay?: boolean;
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

const safePublishMessages = new Set([
  "Choose a supported publication type, priority, and action.",
  "Message type and priority do not match.",
  "Published title and message are required.",
  "A publication reason of 10 to 1000 characters is required.",
  "A durable action receipt is required.",
  "Official event is unavailable.",
  "Archived teams and seasons are read-only.",
  "Official event details changed. Review the current version before publishing.",
  "Only an assigned coach or league administrator can publish an official update.",
  "Critical instructions require a league administrator.",
  "Publish the attributed official schedule change before its disruption message.",
  "A new official message must start at version one.",
  "Official message thread is unavailable for this event.",
  "Use correction or withdrawal for an existing official message.",
  "A correction or withdrawal must keep the original message category.",
  "Official message changed. Review the current version before correcting it."
]);

function safeMessage(message?: string) {
  const normalized = message?.split("\n")[0]?.trim() ?? "";
  return safePublishMessages.has(normalized)
    ? normalized
    : "Official message could not be published. Review the current event and try again.";
}

export async function publishOfficialCommunicationVersion(
  input: PublishOfficialCommunicationInput
): Promise<PublishOfficialCommunicationResult> {
  if (!input.actorUserId) return { ok: false, message: "A signed-in team publisher is required." };
  if (!input.eventId || !input.title.trim() || !input.body.trim()) {
    return { ok: false, message: "Choose an event and enter the official title and message." };
  }
  if (input.reason.trim().length < 10) {
    return { ok: false, message: "Explain why this message is being published or changed." };
  }

  try {
    const { data, error } = await withSupabaseTimeout(dbClient().rpc(
      "publish_official_communication_version",
      {
        target_thread_id: input.threadId ?? null,
        target_event_id: input.eventId,
        publishing_user_id: input.actorUserId,
        target_action: input.action,
        target_category: input.category,
        target_priority: input.priority,
        target_title: input.title.trim(),
        target_body: input.body.trim(),
        publication_reason: input.reason.trim(),
        expected_thread_version: input.expectedThreadVersion,
        expected_schedule_version: input.expectedScheduleVersion,
        action_idempotency_key: input.idempotencyKey
      }
    ), 7000) as {
      data: {
        thread_id?: string;
        version_id?: string;
        version_number?: number;
        event_schedule_version?: number;
        notification_count?: number;
        provider_execution?: "not_started";
        idempotent_replay?: boolean;
      } | null;
      error: { message?: string } | null;
    };
    if (error || !data?.version_id) return { ok: false, message: safeMessage(error?.message) };
    return {
      ok: true,
      message: data.idempotent_replay
        ? "This reviewed action was already recorded."
        : `Official message version ${data.version_number} published. ${data.notification_count ?? 0} in-app recipient record(s) were created; external delivery has not started.`,
      threadId: data.thread_id,
      versionId: data.version_id,
      versionNumber: data.version_number,
      eventScheduleVersion: data.event_schedule_version,
      notificationCount: data.notification_count,
      providerExecution: data.provider_execution,
      idempotentReplay: data.idempotent_replay
    };
  } catch {
    return { ok: false, message: "Official message records are unavailable. Nothing was published." };
  }
}

export async function listOfficialCommunicationReviewData(input: {
  organizationIds: string[];
}): Promise<OfficialCommunicationReviewData> {
  const organizationIds = [...new Set(input.organizationIds.filter(Boolean))];
  if (!organizationIds.length) {
    return { ok: false, message: "League administrator access is required.", threads: [] };
  }
  try {
    const db = dbClient();
    const { data: threadRows, error } = await withSupabaseTimeout(db
      .from("official_communication_threads")
      .select("id,organization_id,team_id,event_id,category,state,current_version_number,current_version_id")
      .in("organization_id", organizationIds)
      .order("updated_at", { ascending: false })
      .limit(50), 7000) as {
        data: Array<{
          id: string;
          organization_id: string;
          team_id: string;
          event_id: string;
          category: OfficialCommunicationCategory;
          state: "published" | "withdrawn";
          current_version_number: number;
          current_version_id: string;
        }> | null;
        error: { message?: string } | null;
      };
    if (error) {
      return {
        ok: false,
        message: "Official message history will appear after the communication migration is promoted.",
        threads: []
      };
    }
    if (!threadRows?.length) {
      return { ok: true, message: "No official messages have been published yet.", threads: [] };
    }
    const versionIds = threadRows.map((thread) => thread.current_version_id).filter(Boolean);
    const [{ data: versionRows }, { data: projections }, { data: incidents }] = await withSupabaseTimeout(Promise.all([
      db.from("official_communication_versions")
        .select("id,title,body,reason,priority,approved_by_user_id,published_at,event_schedule_version")
        .in("id", versionIds),
      db.from("official_communication_projections")
        .select("version_id,required,status")
        .in("version_id", versionIds),
      db.from("official_communication_incidents")
        .select("version_id,status")
        .in("version_id", versionIds)
    ]), 7000) as [
      { data: Array<{ id: string; title: string; body: string; reason: string; priority: OfficialCommunicationPriority; approved_by_user_id: string; published_at: string; event_schedule_version: number }> | null },
      { data: Array<{ version_id: string; required: boolean; status: string }> | null },
      { data: Array<{ version_id: string; status: string }> | null }
    ];
    const approverIds = [...new Set((versionRows ?? []).map((version) => version.approved_by_user_id))];
    const { data: profiles } = approverIds.length
      ? await withSupabaseTimeout(db.from("profiles").select("id,display_name").in("id", approverIds), 7000) as {
        data: Array<{ id: string; display_name: string }> | null;
      }
      : { data: [] as Array<{ id: string; display_name: string }> };
    const versions = new Map((versionRows ?? []).map((version) => [version.id, version]));
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
    const threads = threadRows.flatMap((thread): OfficialCommunicationThreadView[] => {
      const version = versions.get(thread.current_version_id);
      if (!version) return [];
      const required = (projections ?? []).filter((projection) => projection.version_id === version.id && projection.required);
      return [{
        id: thread.id,
        organizationId: thread.organization_id,
        teamId: thread.team_id,
        eventId: thread.event_id,
        category: thread.category,
        state: thread.state,
        currentVersionNumber: thread.current_version_number,
        currentVersionId: thread.current_version_id,
        title: version.title,
        body: version.body,
        reason: version.reason,
        priority: version.priority,
        approvedByUserId: version.approved_by_user_id,
        approvedByName: names.get(version.approved_by_user_id),
        publishedAt: version.published_at,
        eventScheduleVersion: version.event_schedule_version,
        requiredProjectionCount: required.length,
        readyProjectionCount: required.filter((projection) => projection.status === "ready").length,
        openIncident: (incidents ?? []).some((incident) => incident.version_id === version.id && incident.status === "open")
      }];
    });
    return { ok: true, message: "Showing immutable official-message history and propagation evidence.", threads };
  } catch {
    return { ok: false, message: "Official message history is unavailable.", threads: [] };
  }
}
