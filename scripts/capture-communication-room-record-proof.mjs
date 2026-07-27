import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  assertIsolatedQaTarget,
  assertQaApplicationTarget,
  assertServiceRoleCredential,
  captureQaAppInvocation,
  preflightQaApplicationIdentity,
  preflightServiceRoleCredential
} from "./qa-target-guard.mjs";

const envFile = ".env.local";
const baseUrl = process.env.COMMUNICATION_ROOM_BASE_URL || "http://127.0.0.1:3021";
const appInvocation = captureQaAppInvocation();
const outputDir = "output/playwright/communication-room";
const organizationId = "11111111-1111-4111-8111-111111111111";
const primaryTeamId = "33333333-3333-4333-8333-333333333331";
const otherTeamId = "33333333-3333-4333-8333-333333333332";
const eventId = "55555555-5555-4555-8555-555555555551";

function loadLocalEnv() {
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^"|"$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("[YOUR-")) throw new Error(`${name} is required.`);
  return value;
}

async function findUserByEmail(db, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 200) break;
  }
  return null;
}

async function requireQaContext(db) {
  const parentEmail = requireEnv("QA_PARENT_EMAIL");
  if (!parentEmail.toLowerCase().endsWith("@example.com")) {
    throw new Error("Safety stop: Communication Room proof requires an @example.com QA parent.");
  }
  const [parent, admin, organization] = await Promise.all([
    findUserByEmail(db, parentEmail),
    findUserByEmail(db, requireEnv("QA_ADMIN_EMAIL")),
    db.from("organizations").select("id,name").eq("id", organizationId).maybeSingle()
  ]);
  if (!parent || !admin) throw new Error("Safety stop: configured QA users were not found.");
  if (organization.error || organization.data?.name !== "Little League HQ") {
    throw new Error("Safety stop: the fixed fictional QA organization was not found.");
  }
  return { parent, admin, organization: organization.data };
}

async function preflightAcknowledgment(db) {
  const columns = await db
    .from("notification_delivery_attempts")
    .select("id,approved_at,provider_accepted_at,delivered_at,read_at,acknowledged_at")
    .limit(1);
  const rpc = await db.rpc("acknowledge_notification_receipt", {
    p_notification_id: "00000000-0000-0000-0000-000000000000",
    p_recipient_user_id: "00000000-0000-0000-0000-000000000000"
  });
  return {
    ready: !columns.error && !rpc.error,
    evidenceColumns: columns.error ? { available: false, code: columns.error.code } : { available: true },
    acknowledgmentRpc: rpc.error ? { available: false, code: rpc.error.code } : { available: true }
  };
}

async function seedCriticalQaReceipt(db, context, runId) {
  const title = `QA proof ${runId}: fictional field closure drill`;
  const now = new Date().toISOString();
  const notification = await db
    .from("notifications")
    .insert({
      organization_id: organizationId,
      recipient_user_id: context.parent.id,
      team_id: primaryTeamId,
      event_id: eventId,
      notification_type: "event_cancelled",
      title,
      body: "QA proof only. No real schedule changed. Review this fictional field closure drill and confirm receipt.",
      channel: "email",
      status: "pending",
      provider_approval_status: "approved",
      approved_by_user_id: context.admin.id,
      approved_at: now
    })
    .select("id")
    .single();
  if (notification.error || !notification.data) {
    throw new Error(`Critical QA notification could not be created: ${notification.error?.message ?? "unknown error"}`);
  }

  const attempt = await db
    .from("notification_delivery_attempts")
    .insert({
      notification_id: notification.data.id,
      provider: "email",
      channel: "email",
      status: "suppressed",
      error_code: "qa_proof_no_send",
      error_message: "Fictional QA record. External provider delivery intentionally suppressed.",
      approved_at: now,
      idempotency_key: `communication-room-proof:${runId}`
    })
    .select("id")
    .single();
  if (attempt.error || !attempt.data) {
    throw new Error(`Suppressed QA delivery attempt could not be created: ${attempt.error?.message ?? "unknown error"}`);
  }

  return { title, notificationId: notification.data.id, attemptId: attempt.data.id };
}

function projectRef() {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
}

async function addParentSession(context) {
  const auth = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await auth.auth.signInWithPassword({
    email: requireEnv("QA_PARENT_EMAIL"),
    password: requireEnv("QA_PARENT_PASSWORD")
  });
  if (error || !data.session) throw new Error(error?.message ?? "QA parent session was not returned.");
  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  await context.addCookies([{
    name: `sb-${projectRef()}-auth-token`,
    value: `base64-${encodedSession}`,
    domain: new URL(baseUrl).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 60 * 60
  }]);
}

loadLocalEnv();
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabaseTarget = assertIsolatedQaTarget(supabaseUrl, "Communication Room proof");
assertQaApplicationTarget(baseUrl, appInvocation);
assertServiceRoleCredential(serviceRoleKey);
await preflightQaApplicationIdentity(baseUrl, supabaseTarget, { invocation: appInvocation });
await preflightServiceRoleCredential(supabaseUrl, serviceRoleKey);

mkdirSync(outputDir, { recursive: true });
const db = createClient(
  supabaseUrl,
  serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const qaContext = await requireQaContext(db);
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const acknowledgmentPreflight = await preflightAcknowledgment(db);
const criticalReceipt = acknowledgmentPreflight.ready
  ? await seedCriticalQaReceipt(db, qaContext, runId)
  : null;
const executablePath = process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({
  headless: true,
  ...(executablePath && existsSync(executablePath) ? { executablePath } : {})
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  supabaseProjectRef: projectRef(),
  proofBoundary: "Signed-in local browser against fixed fictional QA records. No provider send, official schedule mutation, or real-family identity is used.",
  qaOrganization: qaContext.organization.name,
  multiChildContext: { status: "pending" },
  replyPersistence: { status: "pending" },
  criticalAcknowledgment: {
    status: acknowledgmentPreflight.ready ? "pending" : "blocked",
    preflight: acknowledgmentPreflight,
    blocker: acknowledgmentPreflight.ready
      ? undefined
      : "Configured Supabase schema is missing migration-backed delivery evidence columns and/or acknowledge_notification_receipt."
  }
};

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addParentSession(context);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/parent/messages?populated_record_proof=${runId}`, {
    timeout: 60_000,
    waitUntil: "networkidle"
  });
  await page.getByRole("heading", { name: "Communication Room" }).waitFor();
  await page.getByRole("button", { name: /All teams.*2 linked/i }).waitFor();
  await page.getByRole("button", { name: /Mason T\./i }).waitFor();
  await page.getByRole("button", { name: /Sam R\./i }).waitFor();
  if (await page.getByText("Archived Tigers", { exact: true }).count()) {
    throw new Error("Archived, unlinked team leaked into the parent Communication Room.");
  }
  report.multiChildContext = {
    status: "passed",
    children: ["Mason T.", "Sam R."],
    linkedTeams: ["Tiny Tigers", "Rookie Rockets"],
    excludedTeams: ["Archived Tigers"]
  };

  await page.getByRole("button", { name: /Conversation/i }).click();
  await page.getByLabel("Team").selectOption(otherTeamId);
  const replyBody = `QA persistence proof ${runId}: Can you confirm the fictional equipment checklist?`;
  await page.getByLabel("Reply").fill(replyBody);
  await page.getByRole("button", { name: "Send reply" }).click();
  await page.getByText("Your reply is saved in the team conversation.", { exact: true }).last().waitFor();
  const replyReadback = await db
    .from("team_chat_messages")
    .select("id,team_id,author_user_id,body,moderation_status")
    .eq("author_user_id", qaContext.parent.id)
    .eq("team_id", otherTeamId)
    .eq("body", replyBody)
    .single();
  if (replyReadback.error || replyReadback.data?.moderation_status !== "visible") {
    throw new Error(`QA reply persistence readback failed: ${replyReadback.error?.message ?? "row unavailable"}`);
  }
  report.replyPersistence = {
    status: "passed",
    messageId: replyReadback.data.id,
    teamId: replyReadback.data.team_id,
    authorMatchesSignedInParent: replyReadback.data.author_user_id === qaContext.parent.id,
    providerSendsExecuted: 0
  };

  if (criticalReceipt) {
    const card = page.locator(".communication-message-card.critical").filter({ hasText: criticalReceipt.title });
    await card.getByRole("button", { name: "I reviewed this" }).click();
    await page.getByText("Receipt confirmed. This does not record attendance, agreement, or completion.", { exact: true }).last().waitFor();
    const [attemptReadback, auditReadback] = await Promise.all([
      db.from("notification_delivery_attempts").select("id,status,provider_accepted_at,delivered_at,read_at,acknowledged_at").eq("id", criticalReceipt.attemptId).single(),
      db.from("audit_events").select("id,actor_user_id,action,target_type,target_id").eq("action", "notification_acknowledged").eq("target_id", criticalReceipt.notificationId).limit(1)
    ]);
    if (attemptReadback.error || !attemptReadback.data?.acknowledged_at || auditReadback.error || !auditReadback.data?.length) {
      throw new Error("Critical acknowledgment did not produce both receipt and audit readback.");
    }
    report.criticalAcknowledgment = {
      status: "passed",
      notificationId: criticalReceipt.notificationId,
      attemptId: criticalReceipt.attemptId,
      attemptStatus: attemptReadback.data.status,
      providerAccepted: Boolean(attemptReadback.data.provider_accepted_at),
      delivered: Boolean(attemptReadback.data.delivered_at),
      acknowledged: Boolean(attemptReadback.data.acknowledged_at),
      auditEventId: auditReadback.data[0].id,
      attendanceChanged: false,
      transportationChanged: false,
      providerSendsExecuted: 0
    };
  }

  await page.screenshot({
    fullPage: true,
    path: join(outputDir, "populated-record-mobile.png")
  });
  if (pageErrors.length) throw new Error(`Communication Room emitted page errors: ${pageErrors.join(" | ")}`);
  await context.close();
} finally {
  await browser.close();
  writeFileSync(
    join(outputDir, "populated-record-proof.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
}

if (report.criticalAcknowledgment.status === "blocked") {
  console.error("Communication Room populated-record proof is partial: critical acknowledgment is blocked by the configured Supabase migration state.");
  process.exitCode = 2;
} else {
  console.log("Communication Room populated-record proof passed.");
}
