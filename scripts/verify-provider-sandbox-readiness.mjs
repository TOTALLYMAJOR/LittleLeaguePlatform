#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  reviewRoute: "app/api/provider-delivery/review/route.ts",
  workerRoute: "app/api/internal/notification-worker/route.ts",
  retryRoute: "app/api/provider-delivery/retry-plan/route.ts",
  acknowledgeRoute: "app/api/notifications/acknowledge/route.ts",

  providerDelivery: "lib/supabase/provider-delivery.ts",
  notificationReceipts: "lib/supabase/notification-receipts.ts",
  providerWebhooks: "lib/supabase/provider-webhooks.ts",

  worker: "lib/services/notifications/worker.ts",
  executor: "lib/services/notifications/executor.ts",
  adapters: "lib/services/notifications/adapters.ts",
  types: "lib/services/notifications/types.ts",
  pingram: "lib/services/notifications/pingram.ts",
  smsProvider: "lib/services/notifications/sms-provider.ts",
  smsSuppression: "lib/services/notifications/sms-contact-suppression.ts",
  webhookVerification: "lib/services/notifications/webhook-verification.ts",

  sendgridWebhookRoute: "app/api/provider-webhooks/sendgrid/route.ts",
  twilioWebhookRoute: "app/api/provider-webhooks/twilio/route.ts",
  pingramWebhookRoute: "app/api/provider-webhooks/pingram/route.ts",

  executionMigration: "supabase/migrations/0021_notification_delivery_execution.sql",
  smsTransportMigration: "supabase/migrations/20260727223340_pingram_sms_transport_safety.sql",
  smsAuthorityMigration: "supabase/migrations/20260727224549_pingram_sms_execution_authority.sql",
  pingramReconciliationMigration: "supabase/migrations/20260727230627_pingram_terminal_reconciliation.sql",

  providerBoundaryTest: "app/provider-boundary.test.ts",
  providerDeliveryTest: "lib/supabase/provider-delivery.test.ts",
  workerTest: "lib/services/notifications/worker.test.ts",
  executorTest: "lib/services/notifications/executor.test.ts",
  adaptersTest: "lib/services/notifications/adapters.test.ts",
  webhookVerificationTest: "lib/services/notifications/webhook-verification.test.ts",
  providerWebhooksTest: "lib/supabase/provider-webhooks.test.ts",
  apiWorkerTest: "app/api-notification-worker.test.ts",
  apiPingramWebhookTest: "app/api-pingram-webhook.test.ts",

  runbook: "docs/runbook.md",
  workPlan: "docs/missing-production-slices-work-plan.md",
  taskBoard: "docs/production-task-board.md"
};

const OPEN_GATES = [
  "real sandbox email, SMS, and Web Push sends",
  "provider dashboard setup",
  "provider secrets",
  "adult QA recipient approval",
  "signed webhook endpoint registration",
  "hosted worker execution",
  "cost monitoring",
  "production-send approval"
];

function combined(sources, keys) {
  return keys.map((key) => sources[key] ?? "").join("\n\n");
}

function fileLabels(keys) {
  return keys.map((key) => DEFAULT_SOURCE_FILES[key] ?? key);
}

function addBlocker(blockers, family, code, keys, message) {
  blockers.push({
    family,
    code,
    paths: fileLabels(keys),
    message
  });
}

function requirePattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  const ok = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
  if (!ok) addBlocker(blockers, family, code, keys, message);
}

export function readRepositorySources(rootDir = process.cwd(), sourceFiles = DEFAULT_SOURCE_FILES) {
  return Object.fromEntries(
    Object.entries(sourceFiles).map(([key, relativePath]) => [
      key,
      readFileSync(resolve(rootDir, relativePath), "utf8")
    ])
  );
}

function verifyProviderApprovalAuthority(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "provider-approval-authority",
    "PROVIDER_REVIEW_SESSION_ACTOR_MISSING",
    ["reviewRoute"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*actorUserId:\s*auth\.user\.id/s,
    "Provider review must derive the reviewer from the verified route session."
  );
  requirePattern(
    blockers,
    sources,
    "provider-approval-authority",
    "PROVIDER_REVIEW_DECISION_PROVIDER_BOUNDING_MISSING",
    ["reviewRoute", "providerDelivery", "smsAuthorityMigration"],
    /new\s+Set\(\["approved",\s*"rejected"\]\)[\s\S]*new\s+Set\(\["email",\s*"sms",\s*"web_push"\]\)[\s\S]*providerChannel\(input\.provider\) !== notification\.channel[\s\S]*provider_channel_mismatch/s,
    "Review must keep approved/rejected decisions, supported providers, and provider/channel matching bounded."
  );
  requirePattern(
    blockers,
    sources,
    "provider-approval-authority",
    "PROVIDER_REVIEW_COACH_ADMIN_AUTHORITY_MISSING",
    ["providerDelivery", "smsAuthorityMigration"],
    /team_memberships[\s\S]*\.eq\("role", "coach"\)[\s\S]*organization_memberships[\s\S]*\.eq\("role", "admin"\)[\s\S]*Only assigned coaches or organization admins can approve provider delivery[\s\S]*review_forbidden/s,
    "Review must require assigned-coach or organization-admin authority in service code and the transaction."
  );
  requirePattern(
    blockers,
    sources,
    "provider-approval-authority",
    "PROVIDER_REVIEW_FEATURE_PREFERENCE_GATE_MISSING",
    ["providerDelivery"],
    /recipientAllowsProviderDelivery[\s\S]*featureGateDecision\(\{[\s\S]*feature:\s*"provider_sends"[\s\S]*provider_sends_enabled[\s\S]*providerConfigured = providerReadiness\.configured && providerGate\.enabled/s,
    "Review must evaluate recipient preferences and the organization provider-sends feature gate before queueing."
  );
  requirePattern(
    blockers,
    sources,
    "provider-approval-authority",
    "PROVIDER_REVIEW_DURABLE_ATTEMPT_MISSING",
    ["providerDelivery", "executionMigration", "smsAuthorityMigration"],
    /review_notification_delivery_transaction[\s\S]*notification_delivery_attempts[\s\S]*idempotency_key[\s\S]*retry_count[\s\S]*max_retries[\s\S]*approved_at/s,
    "Review must create a durable, idempotent attempt row with retry metadata through the service-owned transaction."
  );
  requirePattern(
    blockers,
    sources,
    "provider-approval-authority",
    "PROVIDER_REVIEW_NO_EXTERNAL_SEND_BOUNDARY_MISSING",
    ["providerDelivery", "providerBoundaryTest"],
    /No external send occurred[\s\S]*not\.toContain\("fetch\("\)/s,
    "Review must remain approval/attempt logging only, with tests guarding against external send behavior."
  );
}

function verifySandboxAdapterBinding(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "sandbox-adapter-binding",
    "WORKER_ROUTE_AUTHORITY_MISSING",
    ["workerRoute", "apiWorkerTest"],
    /timingSafeEqual[\s\S]*NOTIFICATION_WORKER_TOKEN[\s\S]*x-leaguepilot-worker-token[\s\S]*expectedAttemptId/s,
    "Worker execution must require a constant-time token check and an expected delivery attempt id."
  );
  requirePattern(
    blockers,
    sources,
    "sandbox-adapter-binding",
    "WORKER_CLAIM_QUERY_MISSING",
    ["providerDelivery"],
    /\.eq\("status", "queued"\)[\s\S]*\.is\("locked_at", null\)[\s\S]*\.lte\("next_attempt_at", now\)[\s\S]*\.update\(\{ locked_at: now, locked_by: workerId \}\)/s,
    "Worker claims must lock only due queued attempts before execution."
  );
  requirePattern(
    blockers,
    sources,
    "sandbox-adapter-binding",
    "WORKER_DURABLE_PRECHECK_MISSING",
    ["providerDelivery"],
    /provider_approval_status !== "approved"[\s\S]*request_outcome !== "not_attempted"[\s\S]*reconciliation_required_at[\s\S]*dead_lettered_at[\s\S]*providerChannel\(attempt\.provider\) !== notification\.channel/s,
    "Claim mapping must recheck durable approval, sendability, reconciliation/dead-letter state, and provider/channel binding."
  );
  requirePattern(
    blockers,
    sources,
    "sandbox-adapter-binding",
    "WORKER_PAYLOAD_BINDING_MISSING",
    ["providerDelivery", "types"],
    /deliveryBindingMatches[\s\S]*attempt\.id === payload\.attemptId[\s\S]*attempt\.notification_id === payload\.notificationId[\s\S]*attempt\.transport_provider === payload\.transportProvider[\s\S]*attempt\.idempotency_key === payload\.idempotencyKey[\s\S]*retryCount[\s\S]*maxRetries/s,
    "Last-moment authority must bind attempt, notification, provider, channel, transport, idempotency key, retry count, and content before sending."
  );
  requirePattern(
    blockers,
    sources,
    "sandbox-adapter-binding",
    "WORKER_ADAPTER_SELECTION_MISSING",
    ["worker", "executor", "adapters", "providerDeliveryTest", "workerTest"],
    /getNotificationDeliveryAdapter[\s\S]*adapter\.provider === provider[\s\S]*adapter\.transportProvider === transportProvider[\s\S]*createConfiguredNotificationAdapters[\s\S]*recheckNotificationDeliveryAuthority[\s\S]*matches a durable SMS transport only to its exact adapter/s,
    "Executor must select the exact adapter and recheck durable authority before any adapter send can run."
  );
}

function verifySuppressionAllowlistCostControls(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "suppression-allowlist-cost-controls",
    "SUPPRESSION_REVIEW_PATHS_MISSING",
    ["providerDelivery", "smsProvider", "smsSuppression", "providerDeliveryTest"],
    /(?=[\s\S]*human_rejected)(?=[\s\S]*recipient_preference_disabled)(?=[\s\S]*provider_not_configured)(?=[\s\S]*SMS_PROVIDER must explicitly select pingram or twilio)(?=[\s\S]*sms_contact_suppressed)(?=[\s\S]*verified SMS STOP)/s,
    "Rejected, preference-disabled, provider-disabled, unknown SMS provider, and STOP evidence must suppress before send."
  );
  requirePattern(
    blockers,
    sources,
    "suppression-allowlist-cost-controls",
    "SUPPRESSION_NO_RETRY_OUTCOME_MISSING",
    ["worker", "workerTest"],
    /requestOutcome: "suppressed"[\s\S]*retryable: false[\s\S]*nextAttemptAt: null[\s\S]*suppresses a claimed attempt when last-moment durable authority is denied/s,
    "Suppressed outcomes must not be retried automatically."
  );
  requirePattern(
    blockers,
    sources,
    "suppression-allowlist-cost-controls",
    "PROVIDER_ALLOWLIST_MISSING",
    ["adapters", "adaptersTest"],
    /PROVIDER_QA_RECIPIENT_ALLOWLIST[\s\S]*PROVIDER_DELIVERY_MODE === "production"[\s\S]*PROVIDER_PRODUCTION_APPROVED === "true"[\s\S]*recipient_not_allowlisted/s,
    "Adapters must require an adult QA allowlist unless explicit production-send approval is configured."
  );
  requirePattern(
    blockers,
    sources,
    "suppression-allowlist-cost-controls",
    "PROVIDER_KILL_SWITCH_MISSING",
    ["adapters", "providerDelivery"],
    /environmentFeatureEnabled\("provider_sends"[\s\S]*provider_sends_kill_switch[\s\S]*organizationProviderSendsEnabled !== true[\s\S]*organization_provider_sends_disabled/s,
    "Adapters must enforce the environment kill switch and organization provider-sends gate."
  );
  requirePattern(
    blockers,
    sources,
    "suppression-allowlist-cost-controls",
    "PROVIDER_COST_DOCS_MISSING",
    ["runbook", "workPlan", "taskBoard"],
    /adult-consented QA allowlist[\s\S]*cost cap[\s\S]*monitoring[\s\S]*rollback[\s\S]*real sandbox sends[\s\S]*production-send approval/s,
    "Docs must name adult-consented QA allowlists, cost caps, monitoring, rollback, real sandbox sends, and production-send approval as open gates."
  );
}

function verifyWebhookSecurity(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "webhook-security",
    "SENDGRID_WEBHOOK_SIGNATURE_MISSING",
    ["webhookVerification", "sendgridWebhookRoute"],
    /verifySendGridEventWebhook[\s\S]*createPublicKey[\s\S]*verify\([\s\S]*x-twilio-email-event-webhook-timestamp[\s\S]*x-twilio-email-event-webhook-signature/s,
    "SendGrid event webhooks must verify the signed raw-body event payload before recording events."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-security",
    "TWILIO_WEBHOOK_SIGNATURE_MISSING",
    ["webhookVerification", "twilioWebhookRoute"],
    /verifyTwilioStatusWebhook[\s\S]*twilio\.validateRequest[\s\S]*x-twilio-signature[\s\S]*TWILIO_STATUS_CALLBACK_URL/s,
    "Twilio status callbacks must use Twilio request validation with the callback URL and form parameters."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-security",
    "PINGRAM_WEBHOOK_HMAC_REPLAY_MISSING",
    ["webhookVerification", "pingramWebhookRoute", "webhookVerificationTest", "apiPingramWebhookTest"],
    /(?=[\s\S]*verifyPingramWebhook)(?=[\s\S]*x-pingram-id)(?=[\s\S]*x-pingram-signature)(?=[\s\S]*x-pingram-timestamp)(?=[\s\S]*createHmac\("sha256")(?=[\s\S]*received\.length === expected\.length && timingSafeEqual\(received, expected\))(?=[\s\S]*rejects altered bodies, stale or future timestamps)(?=[\s\S]*distinct replay keys)/s,
    "Pingram callbacks must verify timestamped HMAC over the raw body and preserve lifecycle-scoped replay keys."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-security",
    "WEBHOOK_DUPLICATE_CLAIM_MISSING",
    ["providerWebhooks", "smsAuthorityMigration"],
    /claim_provider_webhook_event[\s\S]*payload_hash[\s\S]*duplicate[\s\S]*in_progress[\s\S]*processing_lease_id[\s\S]*webhook_evidence_conflict/s,
    "Provider webhook persistence must reject conflicting replays and handle duplicate or in-progress events idempotently."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-security",
    "WEBHOOK_TEST_COVERAGE_MISSING",
    ["providerWebhooksTest", "apiPingramWebhookTest", "webhookVerificationTest"],
    /does not overwrite prior delivery proof[\s\S]*requires tenant-bound recipient authority[\s\S]*rejects altered bodies, stale or future timestamps/s,
    "Focused tests must cover duplicate/contradictory evidence, tenant-bound STOP authority, and signature replay rejection."
  );
}

function verifyDeliveryTruthSeparation(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "delivery-truth-separation",
    "DELIVERY_STATE_TAXONOMY_MISSING",
    ["types", "providerDelivery", "worker", "providerWebhooks", "notificationReceipts"],
    /(?=[\s\S]*"not_attempted")(?=[\s\S]*"provider_accepted")(?=[\s\S]*"indeterminate")(?=[\s\S]*"suppressed")(?=[\s\S]*delivered_at)(?=[\s\S]*read_at)(?=[\s\S]*acknowledged_at)(?=[\s\S]*deadLetteredAt)/s,
    "Provider accepted, delivered, failed, read, acknowledged, suppressed, indeterminate, retry, and dead-letter evidence must remain distinct."
  );
  requirePattern(
    blockers,
    sources,
    "delivery-truth-separation",
    "ACCEPTED_NOT_DELIVERED_BOUNDARY_MISSING",
    ["executor", "providerDelivery", "providerWebhooks", "providerWebhooksTest"],
    /Accepted does not mean delivered[\s\S]*Provider acceptance recorded\. Verified delivery still requires provider webhook evidence[\s\S]*without collapsing delivery, read, or acknowledgment[\s\S]*records downstream failure without denying proved provider acceptance/s,
    "Synchronous provider acceptance must not be treated as delivery, read, or family acknowledgment."
  );
  requirePattern(
    blockers,
    sources,
    "delivery-truth-separation",
    "INDETERMINATE_RECONCILIATION_MISSING",
    ["worker", "providerDelivery", "pingram", "pingramReconciliationMigration", "workerTest", "providerWebhooksTest"],
    /requestOutcome === "indeterminate"[\s\S]*Automatic retry is blocked pending reconciliation[\s\S]*Pingram request outcome is indeterminate[\s\S]*reconcile_pending_provider_webhook_evidence[\s\S]*never automatically retries an indeterminate provider outcome/s,
    "Indeterminate outcomes must block automatic retry and wait for signed reconciliation evidence."
  );
  requirePattern(
    blockers,
    sources,
    "delivery-truth-separation",
    "ACKNOWLEDGMENT_BOUNDARY_MISSING",
    ["acknowledgeRoute", "notificationReceipts"],
    /acknowledgeNotificationReceipt[\s\S]*acknowledged_at[\s\S]*read_at/s,
    "Family acknowledgment must remain a separate receipt action from provider delivery or read evidence."
  );
}

function verifyOpenGatesDocumentation(sources, blockers) {
  for (const gate of OPEN_GATES) {
    requirePattern(
      blockers,
      sources,
      "open-gates-documentation",
      `OPEN_GATE_${gate.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/_$/, "")}_MISSING`,
      ["runbook", "workPlan", "taskBoard"],
      gate,
      `Docs must explicitly keep "${gate}" open after local readiness proof.`
    );
  }
  requirePattern(
    blockers,
    sources,
    "open-gates-documentation",
    "LOCAL_ONLY_VERIFIER_BOUNDARY_MISSING",
    ["runbook", "workPlan", "taskBoard"],
    /qa:provider-sandbox-readiness[\s\S]*local repository readiness proof only[\s\S]*does not call Supabase[\s\S]*send email, SMS, or Web Push/s,
    "Docs must define qa:provider-sandbox-readiness as local repository readiness proof only."
  );
}

export function verifyProviderSandboxReadiness(sources) {
  const blockers = [];
  verifyProviderApprovalAuthority(sources, blockers);
  verifySandboxAdapterBinding(sources, blockers);
  verifySuppressionAllowlistCostControls(sources, blockers);
  verifyWebhookSecurity(sources, blockers);
  verifyDeliveryTruthSeparation(sources, blockers);
  verifyOpenGatesDocumentation(sources, blockers);

  return {
    ok: blockers.length === 0,
    blockers,
    openGates: OPEN_GATES,
    statement: "qa:provider-sandbox-readiness is local repository readiness proof only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send email/SMS/Web Push, call provider dashboards, configure secrets, deploy, or claim hosted/provider/production acceptance."
  };
}

export function formatProviderSandboxReadinessReport(result) {
  const lines = [
    "LPM-007 provider sandbox readiness verifier",
    result.ok ? "Status: PASS" : "Status: FAIL",
    "",
    result.statement,
    "",
    "Open gates before real provider proof:",
    ...result.openGates.map((gate) => `- ${gate}`)
  ];

  if (!result.ok) {
    lines.push("", "Named blockers:");
    for (const blocker of result.blockers) {
      lines.push(
        `- ${blocker.code} [${blocker.family}]`,
        `  Paths: ${blocker.paths.join(", ")}`,
        `  ${blocker.message}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const sources = readRepositorySources();
  const result = verifyProviderSandboxReadiness(sources);
  process.stdout.write(formatProviderSandboxReadinessReport(result));
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
