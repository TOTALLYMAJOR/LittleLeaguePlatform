import { createSupabaseAdminClient } from "./admin";
import { getProviderDeliveryReadiness } from "./provider-delivery";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Admin operations aggregates staged tables and settings; keep dynamic until
  // generated Supabase types cover the full migration set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface AdminOperationSettings {
  organizationId: string;
  organizationName: string;
  activeSeasonName: string;
  activeSeasonStatus: "active" | "archived" | "unavailable";
  timezone: string;
}

export interface AdminProviderInventoryItem {
  provider: string;
  channel: string;
  status: "configured" | "missing" | "not_applicable";
  boundary: string;
}

export interface AdminApprovalQueueItem {
  queue: string;
  count: number;
  actionHref: string;
  boundary: string;
}

export interface AdminAuditLogItem {
  id: string;
  action: string;
  targetType: string;
  summary: string;
  createdAt: string;
}

export interface AdminOperationsData {
  settings: AdminOperationSettings;
  providerInventory: AdminProviderInventoryItem[];
  approvalQueues: AdminApprovalQueueItem[];
  auditLogs: AdminAuditLogItem[];
  message: string;
}

function providerStatus(envKey: string): "configured" | "missing" {
  return process.env[envKey] ? "configured" : "missing";
}

function notificationProviderStatus(): "configured" | "missing" {
  return (
    getProviderDeliveryReadiness("email").configured ||
    getProviderDeliveryReadiness("sms").configured ||
    getProviderDeliveryReadiness("web_push").configured
  ) ? "configured" : "missing";
}

function unavailableOperationsData(organizationId: string, message: string): AdminOperationsData {
  return {
    settings: {
      organizationId,
      organizationName: organizationId ? "Authorized organization" : "Unavailable",
      activeSeasonName: "Unavailable",
      activeSeasonStatus: "unavailable",
      timezone: "America/Chicago"
    },
    providerInventory: [],
    approvalQueues: [],
    auditLogs: [],
    message
  };
}

export async function listAdminOperationsData({ organizationId }: { organizationId: string }): Promise<AdminOperationsData> {
  const scopedOrganizationId = organizationId.trim();
  if (!scopedOrganizationId) {
    return unavailableOperationsData("", "Admin operations are unavailable because no organization scope was supplied.");
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const results = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").eq("id", scopedOrganizationId).limit(1),
      db.from("seasons").select("id,name,status").eq("organization_id", scopedOrganizationId).order("starts_at", { ascending: false }).limit(1),
      db.from("registration_requests").select("id,status").eq("organization_id", scopedOrganizationId).eq("status", "pending"),
      db.from("notifications").select("id,status,provider_approval_status").eq("organization_id", scopedOrganizationId).eq("status", "pending"),
      db.from("media_items").select("id,moderation_status").eq("organization_id", scopedOrganizationId).eq("moderation_status", "pending"),
      db.from("audit_events").select("id,action,target_type,summary,created_at").eq("organization_id", scopedOrganizationId).order("created_at", { ascending: false }).limit(20)
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null; error?: unknown },
      { data: Array<{ id: string; name: string; status: "active" | "archived" }> | null; error?: unknown },
      { data: Array<{ id: string; status: string }> | null; error?: unknown },
      { data: Array<{ id: string; status: string; provider_approval_status?: string | null }> | null; error?: unknown },
      { data: Array<{ id: string; moderation_status?: string | null }> | null; error?: unknown },
      { data: Array<{ id: string; action: string; target_type: string; summary: string; created_at: string }> | null; error?: unknown }
    ];

    if (results.some((result) => result.error)) {
      return unavailableOperationsData(scopedOrganizationId, "Admin operations data is temporarily unavailable. Queue and audit counts are withheld rather than shown as zero.");
    }

    const [
      { data: organizations },
      { data: seasons },
      { data: registrationRequests },
      { data: notifications },
      { data: mediaItems },
      { data: auditEvents }
    ] = results;

    const organization = organizations?.[0];
    const season = seasons?.[0];
    if (!organization || !season) {
      return unavailableOperationsData(scopedOrganizationId, "Admin operations data is unavailable because the authorized organization or its current season could not be loaded.");
    }

    return {
      settings: {
        organizationId: organization.id,
        organizationName: organization.name,
        activeSeasonName: season.name,
        activeSeasonStatus: season.status,
        timezone: "America/Chicago"
      },
      providerInventory: [
      { provider: "Supabase Auth", channel: "auth", status: "configured", boundary: "Verified session required before private mutations." },
      { provider: "Tomorrow.io", channel: "weather", status: providerStatus("TOMORROW_API_KEY"), boundary: "Creates weather drafts only; parent delivery stays approval-gated." },
      { provider: "Google Maps", channel: "maps", status: providerStatus("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"), boundary: "Stores map URLs/embed URLs; no route tracking." },
      { provider: "YouTube Data API", channel: "drill_video_metadata", status: providerStatus("YOUTUBE_DATA_API_KEY"), boundary: "Validates metadata for coach-only drill video references; no video download, rehost, clipping, or parent-facing display." },
      { provider: "Email/SMS/Web Push", channel: "notifications", status: notificationProviderStatus(), boundary: "Provider sends remain disconnected; approval creates queued or suppressed delivery-attempt records after preference and readiness checks." }
      ],
      approvalQueues: [
        { queue: "Registration review", count: registrationRequests?.length ?? 0, actionHref: "/admin/registrations", boundary: "Approval creates guardian/team access only after admin review." },
        { queue: "Provider delivery review", count: notifications?.filter((item) => item.provider_approval_status !== "approved").length ?? 0, actionHref: "/admin/message-delivery-review", boundary: "Pending notification records are not external sends." },
        { queue: "Media moderation", count: mediaItems?.length ?? 0, actionHref: "/admin/media-review", boundary: "Reported media can be hidden while review is pending." }
      ],
      auditLogs: (auditEvents ?? []).map((event) => ({
        id: event.id,
        action: event.action,
        targetType: event.target_type,
        summary: event.summary,
        createdAt: event.created_at
      })),
      message: "Showing Supabase admin operations data for one authorized organization."
    };
  } catch {
    return unavailableOperationsData(scopedOrganizationId, "Admin operations data is temporarily unavailable. Queue and audit counts are withheld rather than shown as zero.");
  }
}
