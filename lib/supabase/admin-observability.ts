import { seedState } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { PUBLIC_RATE_LIMITS } from "./public-rate-limit";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Observability aggregates staged tables across several migrations; keep
  // dynamic until generated Supabase types cover every production table.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export type ObservabilityStatus = "ok" | "warning" | "danger";
export type ObservabilityHookStatus = "configured" | "missing";

export interface ObservabilityMetric {
  id: string;
  label: string;
  count: number;
  status: ObservabilityStatus;
  detail: string;
  actionHref: string;
}

export interface ObservabilityEvent {
  id: string;
  source: string;
  severity: ObservabilityStatus;
  summary: string;
  createdAt: string;
}

export interface ObservabilityHook {
  label: string;
  status: ObservabilityHookStatus;
  envKey: string;
  boundary: string;
}

export interface ObservabilityObjective {
  label: string;
  target: string;
  current: string;
  status: ObservabilityStatus;
}

type ObservabilityEnv = Record<string, string | undefined>;

interface AuditRow {
  id: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  summary: string;
  created_at: string;
}

interface DeliveryAttemptRow {
  id: string;
  provider: string;
  channel: string;
  status: string;
  error_code?: string | null;
  error_message?: string | null;
  attempted_at: string;
  retry_count?: number | null;
  next_attempt_at?: string | null;
  dead_lettered_at?: string | null;
  provider_status?: string | null;
}

interface ProviderWebhookRow {
  id: string;
  provider: string;
  event_type: string;
  provider_status: string;
  notification_status: string;
  received_at: string;
}

interface PublicRateLimitBucketRow {
  bucket_key: string;
  route_key: string;
  hit_count: number;
  expires_at: string;
  updated_at: string;
}

interface MediaModerationRow {
  id: string;
  title?: string | null;
  moderation_status?: string | null;
  report_count?: number | null;
  created_at: string;
}

interface TeamChatReportRow {
  id: string;
  status: string;
  reason?: string | null;
  created_at: string;
}

interface ChatModerationRow {
  id: string;
  action: string;
  reason?: string | null;
  created_at: string;
}

export interface ObservabilityRows {
  audits: AuditRow[];
  deliveryAttempts: DeliveryAttemptRow[];
  providerWebhooks: ProviderWebhookRow[];
  publicRateLimitBuckets: PublicRateLimitBucketRow[];
  mediaItems: MediaModerationRow[];
  chatReports: TeamChatReportRow[];
  chatModerationEvents: ChatModerationRow[];
}

export interface AdminObservabilityData {
  generatedAt: string;
  source: "supabase" | "local_fallback";
  message: string;
  metrics: ObservabilityMetric[];
  objectives: ObservabilityObjective[];
  hooks: ObservabilityHook[];
  events: ObservabilityEvent[];
}

const webhookFailureTerms = ["bounce", "dropped", "failed", "failure", "undelivered", "deferred", "spamreport", "unsubscribe"];
const authFailureTerms = ["auth", "login", "session"];
const denialTerms = ["rls", "denied", "unauthorized", "forbidden", "permission"];

function textForAudit(row: AuditRow) {
  return `${row.action} ${row.target_type} ${row.summary}`.toLowerCase();
}

function isAuthFailure(row: AuditRow) {
  const text = textForAudit(row);
  return authFailureTerms.some((term) => text.includes(term)) && ["fail", "denied", "unauthorized", "forbidden"].some((term) => text.includes(term));
}

function isRlsDenial(row: AuditRow) {
  const text = textForAudit(row);
  return denialTerms.some((term) => text.includes(term)) && !isAuthFailure(row);
}

function isProviderRetry(row: DeliveryAttemptRow) {
  return row.status === "failed" || row.status === "queued" && (row.retry_count ?? 0) > 0 || Boolean(row.dead_lettered_at);
}

function isWebhookFailure(row: ProviderWebhookRow) {
  const text = `${row.event_type} ${row.provider_status} ${row.notification_status}`.toLowerCase();
  return row.notification_status === "failed" || webhookFailureTerms.some((term) => text.includes(term));
}

function routeLimit(routeKey: string) {
  const policies = Object.values(PUBLIC_RATE_LIMITS);
  return policies.find((policy) => policy.routeKey === routeKey)?.limit ?? Number.POSITIVE_INFINITY;
}

function isPublicThrottle(row: PublicRateLimitBucketRow) {
  return row.hit_count > routeLimit(row.route_key);
}

function isMediaModeration(row: MediaModerationRow) {
  return row.moderation_status === "pending" || row.moderation_status === "hidden" || row.moderation_status === "rejected" || (row.report_count ?? 0) > 0;
}

function isChatModeration(row: TeamChatReportRow | ChatModerationRow) {
  return "status" in row ? row.status === "open" || row.status === "action_taken" : true;
}

function statusForCount(count: number, dangerAt = 5): ObservabilityStatus {
  if (count <= 0) return "ok";
  return count >= dangerAt ? "danger" : "warning";
}

function latestDate(...dates: Array<string | null | undefined>) {
  return dates.filter(Boolean).sort((left, right) => new Date(right!).getTime() - new Date(left!).getTime())[0] ?? new Date().toISOString();
}

function event(id: string, source: string, severity: ObservabilityStatus, summary: string, createdAt: string): ObservabilityEvent {
  return { id, source, severity, summary, createdAt };
}

function observabilityHooks(env: ObservabilityEnv): ObservabilityHook[] {
  return [
    {
      label: "External error dashboard",
      status: env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN ? "configured" : "missing",
      envKey: "SENTRY_DSN",
      boundary: "Optional external exception tracking; Supabase-backed rows remain the source dashboard."
    },
    {
      label: "Metrics drain",
      status: env.OBSERVABILITY_WEBHOOK_URL ? "configured" : "missing",
      envKey: "OBSERVABILITY_WEBHOOK_URL",
      boundary: "Env-gated outbound alert hook; this page does not send alerts by itself."
    },
    {
      label: "Supabase log drain",
      status: env.SUPABASE_LOG_DRAIN_URL ? "configured" : "missing",
      envKey: "SUPABASE_LOG_DRAIN_URL",
      boundary: "Optional hosted log export; RLS and audit proof still need Supabase row evidence."
    }
  ];
}

export function buildAdminObservabilityData(input: {
  rows: ObservabilityRows;
  source: AdminObservabilityData["source"];
  now?: string;
  env?: ObservabilityEnv;
}): AdminObservabilityData {
  const now = input.now ?? new Date().toISOString();
  const authFailures = input.rows.audits.filter(isAuthFailure);
  const rlsDenials = input.rows.audits.filter(isRlsDenial);
  const providerRetries = input.rows.deliveryAttempts.filter(isProviderRetry);
  const webhookFailures = input.rows.providerWebhooks.filter(isWebhookFailure);
  const publicThrottles = input.rows.publicRateLimitBuckets.filter(isPublicThrottle);
  const adminActions = input.rows.audits.filter((row) => row.action.startsWith("admin_") || row.target_type.includes("admin"));
  const mediaModeration = input.rows.mediaItems.filter(isMediaModeration);
  const chatModeration = [
    ...input.rows.chatReports.filter(isChatModeration),
    ...input.rows.chatModerationEvents.filter(isChatModeration)
  ];

  const metrics: ObservabilityMetric[] = [
    {
      id: "auth-failures",
      label: "Auth failures",
      count: authFailures.length,
      status: statusForCount(authFailures.length, 3),
      detail: "Recent login, session, and auth-denial audit signals.",
      actionHref: "/admin/security"
    },
    {
      id: "rls-denials",
      label: "RLS denials",
      count: rlsDenials.length,
      status: statusForCount(rlsDenials.length, 3),
      detail: "Permission/RLS denial audit signals that need tenant-scope review.",
      actionHref: "/admin/security"
    },
    {
      id: "provider-retries",
      label: "Provider retries",
      count: providerRetries.length,
      status: statusForCount(providerRetries.length),
      detail: "Failed, queued-for-retry, or dead-lettered delivery attempts.",
      actionHref: "/admin/operations#provider-delivery-review"
    },
    {
      id: "webhook-failures",
      label: "Webhook failures",
      count: webhookFailures.length,
      status: statusForCount(webhookFailures.length),
      detail: "SendGrid/Twilio bounce, failure, dropped, or undelivered reconciliation events.",
      actionHref: "/admin/operations#provider-delivery-review"
    },
    {
      id: "public-intake-throttles",
      label: "Public-intake throttles",
      count: publicThrottles.length,
      status: statusForCount(publicThrottles.length, 3),
      detail: "Registration or anonymous mobile-usage buckets above their durable limits.",
      actionHref: "/admin/observability"
    },
    {
      id: "admin-actions",
      label: "Admin actions",
      count: adminActions.length,
      status: "ok",
      detail: "Audited admin writes and support actions in the recent operations sample.",
      actionHref: "/admin/operations"
    },
    {
      id: "media-moderation",
      label: "Media moderation",
      count: mediaModeration.length,
      status: statusForCount(mediaModeration.length),
      detail: "Pending, hidden, rejected, or reported media requiring coach/admin awareness.",
      actionHref: "/admin"
    },
    {
      id: "chat-moderation",
      label: "Chat moderation",
      count: chatModeration.length,
      status: statusForCount(chatModeration.length),
      detail: "Open/actioned chat reports plus chat moderation audit events.",
      actionHref: "/team-chat"
    }
  ];

  const events: ObservabilityEvent[] = [
    ...authFailures.map((row) => event(row.id, "Auth", "danger", row.summary, row.created_at)),
    ...rlsDenials.map((row) => event(row.id, "RLS", "danger", row.summary, row.created_at)),
    ...providerRetries.map((row) => event(row.id, "Provider retry", statusForCount(row.dead_lettered_at ? 5 : 1), row.error_message || row.error_code || `${row.provider} ${row.channel} attempt ${row.status}`, row.attempted_at)),
    ...webhookFailures.map((row) => event(row.id, "Webhook", "warning", `${row.provider} ${row.event_type}: ${row.provider_status}`, row.received_at)),
    ...publicThrottles.map((row) => event(row.bucket_key, "Public intake", "warning", `${row.route_key} bucket hit ${row.hit_count} requests`, row.updated_at)),
    ...mediaModeration.map((row) => event(row.id, "Media", "warning", `${row.title ?? "Media item"} is ${row.moderation_status ?? "reported"} with ${row.report_count ?? 0} report(s)`, row.created_at)),
    ...input.rows.chatReports.filter(isChatModeration).map((row) => event(row.id, "Team chat", "warning", `Chat report ${row.status}: ${row.reason ?? "review needed"}`, row.created_at)),
    ...input.rows.chatModerationEvents.map((row) => event(row.id, "Team chat", "ok", `${row.action}: ${row.reason ?? "moderation action"}`, row.created_at))
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 12);

  const objectives: ObservabilityObjective[] = [
    {
      label: "Auth and RLS access boundary",
      target: "0 unresolved auth/RLS failures in the current sample",
      current: `${authFailures.length + rlsDenials.length} signal(s)`,
      status: statusForCount(authFailures.length + rlsDenials.length, 3)
    },
    {
      label: "Provider delivery reconciliation",
      target: "0 dead-lettered or failed retry attempts without review",
      current: `${providerRetries.length + webhookFailures.length} provider signal(s)`,
      status: statusForCount(providerRetries.length + webhookFailures.length)
    },
    {
      label: "Public intake abuse control",
      target: "0 active buckets above configured limits",
      current: `${publicThrottles.length} throttled bucket(s)`,
      status: statusForCount(publicThrottles.length, 3)
    },
    {
      label: "Youth-safety moderation",
      target: "0 unreviewed media or chat reports before launch",
      current: `${mediaModeration.length + chatModeration.length} moderation signal(s)`,
      status: statusForCount(mediaModeration.length + chatModeration.length)
    }
  ];

  return {
    generatedAt: latestDate(now, ...events.map((item) => item.createdAt)),
    source: input.source,
    message: input.source === "supabase"
      ? "Showing Supabase-backed observability from audit rows, provider attempts, webhook reconciliation, public limiter buckets, and moderation records."
      : "Showing local observability fallback until Supabase production rows are available.",
    metrics,
    objectives,
    hooks: observabilityHooks(input.env ?? process.env),
    events
  };
}

function fallbackRows(): ObservabilityRows {
  return {
    audits: seedState.auditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      target_type: event.targetType,
      target_id: event.targetId,
      summary: event.summary,
      created_at: event.createdAt
    })),
    deliveryAttempts: [],
    providerWebhooks: [],
    publicRateLimitBuckets: [],
    mediaItems: seedState.mediaItems.map((item) => ({
      id: item.id,
      title: item.title,
      moderation_status: item.moderationStatus,
      report_count: item.reportCount ?? 0,
      created_at: item.createdAt
    })),
    chatReports: [],
    chatModerationEvents: seedState.chatModerationAuditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      reason: event.reason,
      created_at: event.createdAt
    }))
  };
}

export function fallbackAdminObservabilityData(now?: string) {
  return buildAdminObservabilityData({
    rows: fallbackRows(),
    source: "local_fallback",
    now
  });
}

export async function listAdminObservabilityData(): Promise<AdminObservabilityData> {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [
      { data: audits },
      { data: deliveryAttempts },
      { data: providerWebhooks },
      { data: publicRateLimitBuckets },
      { data: mediaItems },
      { data: chatReports },
      { data: chatModerationEvents }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("audit_events").select("id,action,target_type,target_id,summary,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("notification_delivery_attempts").select("id,provider,channel,status,error_code,error_message,attempted_at,retry_count,next_attempt_at,dead_lettered_at,provider_status").order("attempted_at", { ascending: false }).limit(100),
      db.from("notification_provider_webhook_events").select("id,provider,event_type,provider_status,notification_status,received_at").order("received_at", { ascending: false }).limit(100),
      db.from("public_rate_limit_buckets").select("bucket_key,route_key,hit_count,expires_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      db.from("media_items").select("id,title,moderation_status,report_count,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("team_chat_reports").select("id,status,reason,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("chat_moderation_audit_events").select("id,action,reason,created_at").order("created_at", { ascending: false }).limit(100)
    ]), 7000) as [
      { data: AuditRow[] | null },
      { data: DeliveryAttemptRow[] | null },
      { data: ProviderWebhookRow[] | null },
      { data: PublicRateLimitBucketRow[] | null },
      { data: MediaModerationRow[] | null },
      { data: TeamChatReportRow[] | null },
      { data: ChatModerationRow[] | null }
    ];

    return buildAdminObservabilityData({
      rows: {
        audits: audits ?? [],
        deliveryAttempts: deliveryAttempts ?? [],
        providerWebhooks: providerWebhooks ?? [],
        publicRateLimitBuckets: publicRateLimitBuckets ?? [],
        mediaItems: mediaItems ?? [],
        chatReports: chatReports ?? [],
        chatModerationEvents: chatModerationEvents ?? []
      },
      source: "supabase"
    });
  } catch {
    return fallbackAdminObservabilityData();
  }
}
