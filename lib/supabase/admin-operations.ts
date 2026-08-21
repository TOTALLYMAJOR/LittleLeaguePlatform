import { seedState } from "@/lib/domain";
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
  activeSeasonStatus: "active" | "archived";
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

function fallbackOperationsData(organizationId: string): AdminOperationsData {
  const includeSeed = organizationId === seedState.organization.id;
  const pendingRegistrations = includeSeed
    ? seedState.registrationRequests.filter((request) => request.status === "pending").length
    : 0;
  const pendingNotifications = includeSeed
    ? seedState.notifications.filter((notification) => notification.status === "pending").length
    : 0;

  return {
    settings: {
      organizationId,
      organizationName: includeSeed ? seedState.organization.name : "Authorized league",
      activeSeasonName: includeSeed ? seedState.activeSeason.name : "No active season loaded",
      activeSeasonStatus: includeSeed ? seedState.activeSeason.status : "archived",
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
      { queue: "Registration review", count: pendingRegistrations, actionHref: "/admin/registrations", boundary: "Approval creates guardian/team access only after admin review." },
      { queue: "Provider delivery review", count: pendingNotifications, actionHref: "/admin/security", boundary: "Pending notification records are not external sends." },
      { queue: "Media moderation", count: includeSeed ? seedState.mediaItems.filter((item) => item.moderationStatus === "pending").length : 0, actionHref: "/admin", boundary: "Reported media can be hidden while review is pending." }
    ],
    auditLogs: (includeSeed ? seedState.auditEvents : []).slice(0, 10).map((event) => ({
      id: event.id,
      action: event.action,
      targetType: event.targetType,
      summary: event.summary,
      createdAt: event.createdAt
    })),
    message: "Showing local operation records until Supabase admin operations data is available."
  };
}

export async function listAdminOperationsData(input: {
  organizationId: string;
}): Promise<AdminOperationsData> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) return fallbackOperationsData("");

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [
      { data: organizations },
      { data: seasons },
      { data: registrationRequests },
      { data: notifications },
      { data: mediaItems },
      { data: auditEvents }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").eq("id", organizationId).limit(1),
      db.from("seasons").select("id,organization_id,name,status").eq("organization_id", organizationId).order("starts_at", { ascending: false }).limit(1),
      db.from("registration_requests").select("id,organization_id,status").eq("organization_id", organizationId).eq("status", "pending"),
      db.from("notifications").select("id,organization_id,status,provider_approval_status").eq("organization_id", organizationId).eq("status", "pending"),
      db.from("media_items").select("id,organization_id,moderation_status").eq("organization_id", organizationId).eq("moderation_status", "pending"),
      db.from("audit_events").select("id,organization_id,action,target_type,summary,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(20)
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; name: string; status: "active" | "archived" }> | null },
      { data: Array<{ id: string; status: string }> | null },
      { data: Array<{ id: string; status: string; provider_approval_status?: string | null }> | null },
      { data: Array<{ id: string; moderation_status?: string | null }> | null },
      { data: Array<{ id: string; action: string; target_type: string; summary: string; created_at: string }> | null }
    ];

    const organization = organizations?.[0];
    const season = seasons?.[0];
    if (!organization || !season) return fallbackOperationsData(organizationId);

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
      message: "Showing Supabase admin operations data."
    };
  } catch {
    return fallbackOperationsData(organizationId);
  }
}
