import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  captureQaAppInvocation,
  runGuardedQaMutation
} from "./qa-target-guard.mjs";

const envFile = ".env.local";
const baseUrl = process.env.QA_PROOF_BASE_URL || "http://127.0.0.1:3020";
const appInvocation = captureQaAppInvocation();
const screenshotDir = "output/playwright";
const qaIds = {
  organization: "11111111-1111-4111-8111-111111111111",
  season: "22222222-2222-4222-8222-222222222222",
  team: "33333333-3333-4333-8333-333333333331",
  archivedTeam: "33333333-3333-4333-8333-333333333333",
  playerMason: "44444444-4444-4444-8444-444444444441",
  game: "55555555-5555-4555-8555-555555555551",
  mediaProof: "99999999-9999-4999-8999-999999999993",
  snackOpen: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  volunteerOpen: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"
};

function parseEnvLine(line) {
  if (!line || line.trim().startsWith("#")) return null;
  const separator = line.indexOf("=");
  if (separator === -1) return null;
  return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^"|"$/g, "")];
}

function loadLocalEnv() {
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;
    const [key, value] = entry;
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("[YOUR-")) throw new Error(`${name} is required.`);
  return value;
}

function jwtRole(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).role;
  } catch {
    return undefined;
  }
}

function requireAnonKey() {
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (jwtRole(anonKey) === "service_role") {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY must be the Supabase anon key, not the service role key.");
  }
  return anonKey;
}

function requireServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function createQaAdminClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 200;

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) break;
    page += 1;
  }

  throw new Error(`QA auth user was not found for ${email}. Run npm run supabase:qa-users first.`);
}

function chromiumExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.HOME ? `${process.env.HOME}/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome` : ""
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

async function signIn(page, email, password) {
  await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const landingPage = page.waitForURL(
    (url) => url.pathname !== "/auth",
    { timeout: 15_000, waitUntil: "networkidle" }
  );
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await page.getByText("Signed in.", { exact: false }).waitFor({ timeout: 15_000 });
  await landingPage;
}

async function assertText(page, expected) {
  await page.getByText(expected, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 15_000 });
}

async function assertAnyText(page, expectedOptions) {
  const errors = [];
  for (const expected of expectedOptions) {
    try {
      await assertText(page, expected);
      return;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`Expected at least one text option: ${expectedOptions.join(" | ")}. ${errors[0] ?? ""}`);
}

async function clickAndAssertText(locator, page, expected) {
  await locator.click();
  await assertText(page, expected);
}

function parentReplayProofDraft() {
  const generatedAt = new Date().toISOString();
  return {
    title: "QA Parent Replay private-write proof",
    summary: "Coach-reviewed QA replay proof for catching, throwing, and teamwork.",
    homeActivities: [
      {
        duration: "30_seconds",
        title: "Two-hand catch check",
        coachCue: "Watch the ball into the glove.",
        parentGoal: "Keep the home practice short and confident.",
        steps: ["Stand five steps apart.", "Make three soft tosses.", "Celebrate a calm ready stance."]
      },
      {
        duration: "2_minutes",
        title: "Target throws",
        coachCue: "Step toward the target.",
        parentGoal: "Practice accuracy without pressure.",
        steps: ["Pick a safe target.", "Make five gentle throws.", "Reset after each throw."]
      },
      {
        duration: "5_minutes",
        title: "Teamwork cheer",
        coachCue: "Call out one helpful teammate moment.",
        parentGoal: "Reinforce sportsmanship after practice.",
        steps: ["Ask what went well.", "Name one teammate effort.", "End with tomorrow's goal."]
      }
    ],
    parentTranslations: [
      {
        coachTerm: "Ready position",
        parentInstruction: "Hands open, knees soft, eyes on the ball."
      }
    ],
    microCoachingStreak: {
      label: "QA team practice streak",
      completedFamilies: 1,
      totalFamilies: 1,
      completionRate: 100
    },
    memoryMoment: {
      title: "QA practice memory",
      detail: "The team practiced short, confident reps before provider review."
    },
    coachVideo: {
      title: "Demo catch-and-throw rhythm",
      url: "https://example.com/qa-parent-replay-video",
      note: "Review-only coaching video recommendation."
    },
    parentTip: "Keep the rep count low and praise the ready stance first.",
    teamQuest: "Before the next practice, each family tries three calm catches.",
    skillCards: ["Catching: watch the ball", "Throwing: step and point", "Teamwork: name one helper"],
    parentEducation: "This QA replay remains coach-approved and queues notification drafts only.",
    generatedAt
  };
}

async function authenticatedBrowserRequest(page, method, url, payload) {
  return page.evaluate(async ({ method: requestMethod, url: requestUrl, payload: requestPayload }) => {
    const decodeBase64Url = (value) => {
      const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return atob(padded);
    };

    const accessTokenFromSessionValue = (value) => {
      if (!value) return "";
      const decodedValue = decodeURIComponent(value);
      const jsonText = decodedValue.startsWith("base64-")
        ? decodeBase64Url(decodedValue.slice("base64-".length))
        : decodedValue;
      const parsedSession = JSON.parse(jsonText);
      if (typeof parsedSession?.access_token === "string") return parsedSession.access_token;
      if (typeof parsedSession?.currentSession?.access_token === "string") {
        return parsedSession.currentSession.access_token;
      }
      if (Array.isArray(parsedSession) && typeof parsedSession[0] === "string") return parsedSession[0];
      return "";
    };

    const tokenKey = Object.keys(window.localStorage).find((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));
    const rawSession = tokenKey ? window.localStorage.getItem(tokenKey) : "";
    const authCookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("sb-") && part.includes("-auth-token="));
    const cookieSession = authCookie ? authCookie.split("=").slice(1).join("=") : "";
    const accessToken = accessTokenFromSessionValue(rawSession) || accessTokenFromSessionValue(cookieSession);
    if (!accessToken) {
      return { status: 0, body: { ok: false, message: "Browser Supabase session token was not found." } };
    }

    const response = await fetch(requestUrl, {
      method: requestMethod,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      ...(requestMethod === "GET" ? {} : { body: JSON.stringify(requestPayload) })
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");
    return { status: response.status, body };
  }, { method, url, payload });
}

function authenticatedBrowserPost(page, url, payload) {
  return authenticatedBrowserRequest(page, "POST", url, payload);
}

function authenticatedBrowserGet(page, url) {
  return authenticatedBrowserRequest(page, "GET", url);
}

async function resetQaMediaProofItem(supabase) {
  const { data, error } = await supabase
    .from("media_items")
    .upsert({
      id: qaIds.mediaProof,
      organization_id: qaIds.organization,
      team_id: qaIds.team,
      title: "QA browser proof media",
      media_type: "google_photos",
      url: "https://photos.google.com/share/qa-browser-proof-media",
      moderation_status: "approved",
      visibility: "team",
      report_count: 0,
      hidden_at: null,
      removed_at: null,
      reviewed_by_user_id: null,
      reviewed_at: null
    }, { onConflict: "id" })
    .select("id,moderation_status,visibility,report_count")
    .single();

  if (error || !data) throw new Error("QA media proof item could not be prepared.");
  return data;
}

async function createQaRegistrationRequest(supabase, input) {
  const requestId = randomUUID();
  const nonce = `${input.action}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { data, error } = await supabase
    .from("registration_requests")
    .insert({
      id: requestId,
      organization_id: qaIds.organization,
      season_id: qaIds.season,
      team_id: qaIds.team,
      parent_name: `QA ${input.action} Parent`,
      parent_email: `qa.${nonce}@example.test`,
      player_first_name: input.action === "approve" ? "ProofApprove" : "ProofReject",
      player_last_initial: input.action === "approve" ? "A" : "R",
      status: "pending"
    })
    .select("id,parent_email,player_first_name,status")
    .single();

  if (error || !data) throw new Error(`QA ${input.action} registration request could not be created.`);
  return data;
}

async function assertMediaReportRows(supabase, input) {
  const { data: mediaItem, error: mediaError } = await supabase
    .from("media_items")
    .select("id,moderation_status,report_count")
    .eq("id", qaIds.mediaProof)
    .single();

  if (
    mediaError ||
    !mediaItem ||
    mediaItem.moderation_status !== "pending" ||
    mediaItem.report_count !== input.startingReportCount + 1
  ) {
    throw new Error("Media report browser proof did not persist the expected pending media row.");
  }

  const { data: auditEvents, error: auditError } = await supabase
    .from("audit_events")
    .select("id,actor_user_id,action,target_type,target_id,created_at")
    .eq("actor_user_id", input.parentUserId)
    .eq("action", "media_reported")
    .eq("target_type", "media_item")
    .eq("target_id", qaIds.mediaProof)
    .gte("created_at", input.proofStartedAt);

  if (auditError || !auditEvents?.length) {
    throw new Error("Media report browser proof did not write the expected audit event.");
  }
}

async function assertMediaModerationRows(supabase, input) {
  const { data: mediaItem, error: mediaError } = await supabase
    .from("media_items")
    .select("id,moderation_status,visibility,reviewed_by_user_id,hidden_at,removed_at")
    .eq("id", qaIds.mediaProof)
    .single();

  if (
    mediaError ||
    !mediaItem ||
    mediaItem.moderation_status !== "hidden" ||
    mediaItem.visibility !== "organization" ||
    mediaItem.reviewed_by_user_id !== input.adminUserId ||
    !mediaItem.hidden_at ||
    mediaItem.removed_at
  ) {
    throw new Error("Media moderation browser proof did not persist the expected hidden media row.");
  }

  const { data: auditEvents, error: auditError } = await supabase
    .from("audit_events")
    .select("id,actor_user_id,action,target_type,target_id,created_at")
    .eq("actor_user_id", input.adminUserId)
    .eq("action", "media_hidden")
    .eq("target_type", "media_item")
    .eq("target_id", qaIds.mediaProof)
    .gte("created_at", input.proofStartedAt);

  if (auditError || !auditEvents?.length) {
    throw new Error("Media moderation browser proof did not write the expected admin audit event.");
  }
}

async function assertRegistrationReviewRows(supabase, input) {
  const { data: request, error: requestError } = await supabase
    .from("registration_requests")
    .select("id,status,reviewed_by_user_id,reviewed_at")
    .eq("id", input.requestId)
    .single();

  if (
    requestError ||
    !request ||
    request.status !== input.status ||
    request.reviewed_by_user_id !== input.adminUserId ||
    !request.reviewed_at
  ) {
    throw new Error(`Registration ${input.status} browser proof did not persist the expected request state.`);
  }

  const { data: actions, error: actionError } = await supabase
    .from("registration_approval_actions")
    .select("id,action,reviewed_by_user_id,registration_request_id,created_at")
    .eq("registration_request_id", input.requestId)
    .eq("reviewed_by_user_id", input.adminUserId)
    .gte("created_at", input.proofStartedAt);

  if (actionError || !actions?.some((action) => action.action === input.status)) {
    throw new Error(`Registration ${input.status} browser proof did not write the expected approval-action row.`);
  }

  if (input.status === "approved" && !actions.some((action) => action.action === "created_player")) {
    throw new Error("Registration approval browser proof did not create the expected player action row.");
  }

  const { data: auditEvents, error: auditError } = await supabase
    .from("audit_events")
    .select("id,actor_user_id,action,target_type,target_id,created_at")
    .eq("actor_user_id", input.adminUserId)
    .eq("action", `registration_request_${input.status}`)
    .eq("target_type", "registration_request")
    .eq("target_id", input.requestId)
    .gte("created_at", input.proofStartedAt);

  if (auditError || !auditEvents?.length) {
    throw new Error(`Registration ${input.status} browser proof did not write the expected admin audit event.`);
  }
}

async function assertMediaConsentRows(supabase, input) {
  const { data: consent, error: consentError } = await supabase
    .from("player_media_consents")
    .select("id,player_id,guardian_user_id,scope,granted_at,revoked_at")
    .eq("player_id", qaIds.playerMason)
    .eq("guardian_user_id", input.parentUserId)
    .eq("scope", "team_family")
    .single();
  if (
    consentError
    || !consent
    || consent.player_id !== qaIds.playerMason
    || consent.guardian_user_id !== input.parentUserId
    || (input.granted ? (!consent.granted_at || consent.revoked_at) : !consent.revoked_at)
  ) {
    throw new Error(`Parent media-consent browser proof did not persist the expected ${input.granted ? "granted" : "revoked"} row.`);
  }

  const action = input.granted ? "player_media_consent_granted" : "player_media_consent_revoked";
  const { data: auditEvents, error: auditError } = await supabase
    .from("audit_events")
    .select("id,actor_user_id,action,target_type,target_id,created_at")
    .eq("actor_user_id", input.parentUserId)
    .eq("action", action)
    .eq("target_type", "player")
    .eq("target_id", qaIds.playerMason)
    .gte("created_at", input.proofStartedAt);
  if (auditError || !auditEvents?.length) {
    throw new Error(`Parent media-consent browser proof did not write the expected ${action} audit event.`);
  }
}

async function assertTeamBuilderPublicationRows(supabase, input) {
  const { data: plan, error: planError } = await supabase
    .from("team_build_plans")
    .select("id,organization_id,season_id,status,assignments,lock_version,published_by_user_id,published_at,provider_execution")
    .eq("id", input.planId)
    .single();
  if (
    planError
    || !plan
    || plan.organization_id !== qaIds.organization
    || plan.season_id !== qaIds.season
    || plan.status !== "published"
    || plan.published_by_user_id !== input.adminUserId
    || !plan.published_at
    || plan.provider_execution !== "not_started"
    || !Array.isArray(plan.assignments)
    || !plan.assignments.length
  ) {
    throw new Error("Team-builder browser proof did not persist a complete published plan.");
  }

  const { data: actions, error: actionError } = await supabase
    .from("team_build_plan_actions")
    .select("action_type,actor_user_id,plan_id,resulting_version")
    .eq("plan_id", input.planId)
    .eq("actor_user_id", input.adminUserId);
  if (actionError || !["preview", "approve", "publish"].every((type) => actions?.some((action) => action.action_type === type))) {
    throw new Error("Team-builder browser proof did not persist the preview, approval, and publish action ledger.");
  }

  const assignments = plan.assignments.map((assignment) => ({
    playerId: String(assignment.playerId ?? ""),
    teamId: String(assignment.teamId ?? "")
  }));
  const { data: players, error: playerError } = await supabase
    .from("players")
    .select("id,team_id,organization_id,season_id")
    .in("id", assignments.map((assignment) => assignment.playerId));
  if (
    playerError
    || players?.length !== assignments.length
    || assignments.some((assignment) => !players.some((player) => (
      player.id === assignment.playerId
      && player.team_id === assignment.teamId
      && player.organization_id === qaIds.organization
      && player.season_id === qaIds.season
    )))
  ) {
    throw new Error("Team-builder browser proof did not atomically publish every approved player assignment.");
  }

  const { data: auditEvents, error: auditError } = await supabase
    .from("audit_events")
    .select("id,actor_user_id,action,target_type,target_id")
    .eq("actor_user_id", input.adminUserId)
    .eq("action", "team_build_plan_published")
    .eq("target_type", "team_build_plan")
    .eq("target_id", input.planId);
  if (auditError || !auditEvents?.length) {
    throw new Error("Team-builder browser proof did not persist the publish audit event.");
  }
}

async function assertParentActionRows(supabase, parentUserId) {
  const { data: rsvp, error: rsvpError } = await supabase
    .from("rsvps")
    .select("event_id,player_id,parent_user_id,response")
    .eq("event_id", qaIds.game)
    .eq("player_id", qaIds.playerMason)
    .single();
  if (rsvpError || !rsvp || rsvp.parent_user_id !== parentUserId || rsvp.response !== "going") {
    throw new Error("Parent RSVP browser action did not persist the expected Supabase row.");
  }

  const { data: snack, error: snackError } = await supabase
    .from("snack_schedule_slots")
    .select("id,assigned_parent_user_id,status")
    .eq("id", qaIds.snackOpen)
    .single();
  if (snackError || !snack || snack.assigned_parent_user_id !== parentUserId || snack.status !== "assigned") {
    throw new Error("Parent snack browser action did not assign the expected Supabase row.");
  }

  const { data: volunteer, error: volunteerError } = await supabase
    .from("volunteer_signups")
    .select("id,assigned_user_id,status")
    .eq("id", qaIds.volunteerOpen)
    .single();
  if (volunteerError || !volunteer || volunteer.assigned_user_id !== parentUserId || volunteer.status !== "filled") {
    throw new Error("Parent volunteer browser action did not fill the expected Supabase row.");
  }

  const { data: preferences, error: preferenceError } = await supabase
    .from("notification_preferences")
    .select("id,user_id,team_id,channel,notification_type,enabled")
    .eq("user_id", parentUserId)
    .eq("team_id", qaIds.team)
    .eq("channel", "push")
    .eq("notification_type", "schedule_changed");
  if (preferenceError || !preferences?.some((preference) => preference.enabled === false)) {
    throw new Error("Parent notification preference browser action did not persist the expected Supabase row.");
  }
}

async function assertParentReplayPublishRows(supabase, input) {
  const { data: replay, error: replayError } = await supabase
    .from("parent_replays")
    .select("id,team_id,coach_user_id,status,focus_areas,title")
    .eq("id", input.parentReplayId)
    .single();
  if (
    replayError ||
    !replay ||
    replay.team_id !== qaIds.team ||
    replay.coach_user_id !== input.coachUserId ||
    replay.status !== "queued" ||
    !["catching", "throwing", "teamwork"].every((area) => replay.focus_areas?.includes(area))
  ) {
    throw new Error("Parent Replay browser proof did not persist the expected reviewed replay row.");
  }

  const { data: notifications, error: notificationError } = await supabase
    .from("notifications")
    .select("id,recipient_user_id,team_id,notification_type,channel,status,provider_approval_status,created_at")
    .eq("team_id", qaIds.team)
    .eq("notification_type", "parent_replay_ready")
    .eq("channel", "email")
    .gte("created_at", input.proofStartedAt)
    .order("created_at", { ascending: false });
  if (notificationError || !notifications?.length) {
    throw new Error("Parent Replay browser proof did not queue a pending parent notification draft.");
  }
  const notification = notifications[0];
  if (
    notification.team_id !== qaIds.team ||
    notification.recipient_user_id !== input.parentUserId ||
    notification.status !== "pending" ||
    notification.provider_approval_status !== "pending"
  ) {
    throw new Error("Parent Replay notification draft did not preserve the expected pending provider boundary.");
  }

  const { data: auditEvents, error: auditError } = await supabase
    .from("audit_events")
    .select("id,actor_user_id,action,target_type,target_id")
    .eq("actor_user_id", input.coachUserId)
    .eq("action", "parent_replay_published")
    .eq("target_type", "parent_replay")
    .eq("target_id", input.parentReplayId);
  if (auditError || !auditEvents?.length) {
    throw new Error("Parent Replay browser proof did not write the expected coach audit event.");
  }

  return notification.id;
}

async function assertCoachWeeklyUpdateRows(supabase, input) {
  const { data: announcement, error: announcementError } = await supabase
    .from("announcements")
    .select("id,team_id,author_user_id,title,body,created_at")
    .eq("team_id", qaIds.team)
    .eq("author_user_id", input.coachUserId)
    .eq("body", input.body)
    .gte("created_at", input.proofStartedAt)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    announcementError ||
    !announcement ||
    announcement.team_id !== qaIds.team ||
    announcement.author_user_id !== input.coachUserId ||
    announcement.title !== input.title ||
    announcement.body !== input.body
  ) {
    throw new Error("Coach weekly update browser proof did not persist the expected announcement row.");
  }

  const { data: notifications, error: notificationError } = await supabase
    .from("notifications")
    .select("id,recipient_user_id,team_id,notification_type,channel,status,provider_approval_status,title,body,created_at")
    .eq("team_id", qaIds.team)
    .eq("notification_type", "team_broadcast")
    .eq("channel", "email")
    .eq("body", input.body)
    .gte("created_at", input.proofStartedAt)
    .order("created_at", { ascending: false });
  if (notificationError || !notifications?.length) {
    throw new Error("Coach weekly update browser proof did not queue pending team-broadcast notification drafts.");
  }

  const expectedDraft = notifications.find((notification) => (
    notification.recipient_user_id === input.parentUserId &&
    notification.status === "pending" &&
    notification.provider_approval_status === "pending" &&
    notification.title === input.title &&
    notification.body === input.body
  ));
  if (!expectedDraft) {
    throw new Error("Coach weekly update notification draft did not preserve the expected pending provider boundary.");
  }

  const notificationIds = notifications.map((notification) => notification.id);
  const { data: attempts, error: attemptError } = await supabase
    .from("notification_delivery_attempts")
    .select("id,notification_id,status")
    .in("notification_id", notificationIds);
  if (attemptError) {
    throw new Error("Coach weekly update proof could not verify provider delivery attempts.");
  }
  if (attempts?.length) {
    throw new Error("Coach weekly update browser proof created provider delivery attempts before approval.");
  }

  return {
    announcementId: announcement.id,
    notificationIds
  };
}

async function assertProviderDeliveryReviewRows(supabase, input) {
  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .select("id,status,provider_approval_status,approved_by_user_id,approved_at")
    .eq("id", input.notificationId)
    .single();
  if (
    notificationError ||
    !notification ||
    notification.status !== "pending" ||
    notification.provider_approval_status !== "approved" ||
    notification.approved_by_user_id !== input.adminUserId ||
    !notification.approved_at
  ) {
    throw new Error("Provider delivery browser proof did not persist the expected approved notification review row.");
  }

  const { data: attempts, error: attemptError } = await supabase
    .from("notification_delivery_attempts")
    .select("id,notification_id,provider,channel,status,error_code,error_message,attempted_at")
    .eq("notification_id", input.notificationId)
    .eq("provider", "email")
    .order("attempted_at", { ascending: false });
  const attempt = attempts?.[0];
  if (
    attemptError ||
    !attempt ||
    attempt.channel !== "email" ||
    !["queued", "suppressed"].includes(attempt.status)
  ) {
    throw new Error("Provider delivery browser proof did not write the expected queued or suppressed delivery-attempt row.");
  }

  const { data: auditEvents, error: auditError } = await supabase
    .from("audit_events")
    .select("id,actor_user_id,action,target_type,target_id")
    .eq("actor_user_id", input.adminUserId)
    .eq("action", "provider_delivery_approved")
    .eq("target_type", "notification")
    .eq("target_id", input.notificationId);
  if (auditError || !auditEvents?.length) {
    throw new Error("Provider delivery browser proof did not write the expected admin audit event.");
  }
}

async function proveCoachWeeklyUpdateWrite(browser, supabase) {
  const [coach, parent] = await Promise.all([
    findUserByEmail(supabase, requireEnv("QA_COACH_EMAIL")),
    findUserByEmail(supabase, requireEnv("QA_PARENT_EMAIL"))
  ]);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();
  const proofStartedAt = new Date(Date.now() - 2000).toISOString();
  const proofId = `qa-weekly-${Date.now()}`;
  const title = "Weekly update for Tiny Tigers";
  const body = [
    `QA hosted weekly update proof ${proofId}.`,
    "Please review RSVP gaps, snack coverage, and field arrival details.",
    "This proof must create pending team broadcast drafts only; no provider send should occur."
  ].join("\n");

  try {
    await signIn(page, requireEnv("QA_COACH_EMAIL"), requireEnv("QA_COACH_PASSWORD"));
    await page.goto(`${baseUrl}/coach?qa_weekly_update=${proofId}`, { waitUntil: "networkidle" });
    await page.locator("summary").filter({ hasText: "Drafts and team help" }).click();
    await assertText(page, "Coach weekly update builder");
    await assertText(page, "Saving creates an announcement and pending notification drafts only");
    await page.locator("textarea").first().fill(body);
    await clickAndAssertText(
      page.getByRole("button", { name: "Save weekly update draft" }).first(),
      page,
      "Weekly update saved with"
    );
    await assertText(page, "No provider send occurred.");

    const proofRows = await assertCoachWeeklyUpdateRows(supabase, {
      coachUserId: coach.id,
      parentUserId: parent.id,
      title,
      body,
      proofStartedAt
    });

    const screenshotPath = join(screenshotDir, "coach-weekly-update-qa-session-live.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA coach weekly update browser write verified against Supabase rows (${screenshotPath}, announcement ${proofRows.announcementId}, ${proofRows.notificationIds.length} notification draft(s))`);
  } finally {
    await context.close();
  }
}

async function proveSignedOutParentAccess(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();

  try {
    for (const route of [
      { path: "/parent", screenshot: "parent-session-bound-signed-out.png" },
      { path: "/parent/rsvp", screenshot: "parent-rsvp-session-bound-signed-out.png" }
    ]) {
      await page.goto(`${baseUrl}${route.path}?qa_signed_out=${Date.now()}`, { waitUntil: "networkidle" });
      await assertText(page, "Sign in to see family records.");
      await assertText(page, "Private child, team, RSVP, media, weather, snack, volunteer, and coach workflow rows stay hidden");
      const screenshotPath = join(screenshotDir, route.screenshot);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Signed-out parent: ${route.path} access gate verified (${screenshotPath})`);
    }
  } finally {
    await context.close();
  }
}

async function proveCoachProviderPrivateWrites(browser, supabase) {
  const [coach, admin, parent] = await Promise.all([
    findUserByEmail(supabase, requireEnv("QA_COACH_EMAIL")),
    findUserByEmail(supabase, requireEnv("QA_ADMIN_EMAIL")),
    findUserByEmail(supabase, requireEnv("QA_PARENT_EMAIL"))
  ]);

  const coachContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const coachPage = await coachContext.newPage();
  const proofStartedAt = new Date(Date.now() - 2000).toISOString();
  let notificationId = "";

  try {
    await signIn(coachPage, requireEnv("QA_COACH_EMAIL"), requireEnv("QA_COACH_PASSWORD"));
    await coachPage.goto(`${baseUrl}/coach/parent-replay?qa_private_write=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(coachPage, "Parent Replay turns every practice into help parents can use tonight.");
    await assertText(coachPage, "Preview - Edit - Approve - Publish");

    const replayResult = await authenticatedBrowserPost(coachPage, "/api/coach/parent-replay", {
      teamId: qaIds.team,
      focusAreas: ["catching", "throwing", "teamwork"],
      draft: parentReplayProofDraft()
    });
    if (replayResult.status !== 201 || !replayResult.body?.ok || !replayResult.body.parentReplay?.id) {
      throw new Error(`Parent Replay browser API proof failed: ${replayResult.body?.message ?? replayResult.status}`);
    }
    const parentReplayId = replayResult.body.parentReplay.id;

    const earlyPublishResult = await authenticatedBrowserPost(coachPage, "/api/coach/parent-replay/publish", {
      parentReplayId
    });
    if (earlyPublishResult.status !== 409 || earlyPublishResult.body?.code !== "approval_required") {
      throw new Error("Parent Replay browser proof did not block publication before human approval.");
    }

    const approvalResult = await authenticatedBrowserPost(coachPage, "/api/coach/parent-replay/approve", {
      parentReplayId
    });
    if (approvalResult.status !== 200 || !approvalResult.body?.ok) {
      throw new Error(`Parent Replay approval browser proof failed: ${approvalResult.body?.message ?? approvalResult.status}`);
    }

    const publishResult = await authenticatedBrowserPost(coachPage, "/api/coach/parent-replay/publish", {
      parentReplayId
    });
    if (publishResult.status !== 200 || !publishResult.body?.ok) {
      throw new Error(`Parent Replay publication browser proof failed: ${publishResult.body?.message ?? publishResult.status}`);
    }

    notificationId = await assertParentReplayPublishRows(supabase, {
      parentReplayId,
      coachUserId: coach.id,
      parentUserId: parent.id,
      proofStartedAt
    });

    const screenshotPath = join(screenshotDir, "coach-parent-replay-private-write-live.png");
    await coachPage.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA coach Parent Replay private write verified against Supabase rows (${screenshotPath})`);
  } finally {
    await coachContext.close();
  }

  const adminContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const adminPage = await adminContext.newPage();

  try {
    await signIn(adminPage, requireEnv("QA_ADMIN_EMAIL"), requireEnv("QA_ADMIN_PASSWORD"));
    await adminPage.goto(`${baseUrl}/admin/operations?qa_private_write=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(adminPage, "Provider inventory");
    await assertText(adminPage, "Approval queues");

    const reviewResult = await authenticatedBrowserPost(adminPage, "/api/provider-delivery/review", {
      notificationId,
      decision: "approved",
      provider: "email"
    });
    if (reviewResult.status !== 200 || !reviewResult.body?.ok) {
      throw new Error(`Provider delivery browser API proof failed: ${reviewResult.body?.message ?? reviewResult.status}`);
    }

    await assertProviderDeliveryReviewRows(supabase, {
      notificationId,
      adminUserId: admin.id
    });

    const screenshotPath = join(screenshotDir, "provider-delivery-review-qa-session-live.png");
    await adminPage.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA admin provider delivery review verified against Supabase rows (${screenshotPath})`);
  } finally {
    await adminContext.close();
  }
}

async function proveRole(browser, input) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();

  try {
    await signIn(page, input.email, input.password);

    for (const route of input.routes) {
      const proofUrl = `${baseUrl}${route.path}?qa_proof=${Date.now()}`;
      await page.goto(proofUrl, { waitUntil: "networkidle" });
      for (const text of route.expectedText) await assertText(page, text);
      for (const textOptions of route.expectedAnyText ?? []) await assertAnyText(page, textOptions);
      for (const action of route.actions ?? []) {
        await page.getByRole("button", { name: action.buttonName }).first().click();
        await assertText(page, action.expectedText);
      }
      const screenshotPath = join(screenshotDir, route.screenshot);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`${input.label}: ${route.path} verified (${screenshotPath})`);
    }
  } finally {
    await context.close();
  }
}

async function proveParentLiveActions(browser, supabase) {
  const parent = await findUserByEmail(supabase, requireEnv("QA_PARENT_EMAIL"));
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();

  try {
    await signIn(page, requireEnv("QA_PARENT_EMAIL"), requireEnv("QA_PARENT_PASSWORD"));

    await page.goto(`${baseUrl}/parent/rsvp?qa_parent_action=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(page, "RSVP details are current for your approved family access.");
    await clickAndAssertText(page.getByRole("button", { name: "Going" }).first(), page, "RSVP saved to current team records.");

    await page.goto(`${baseUrl}/parent?qa_parent_action=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(page, "Team details are current and scoped to your approved family access.");
    await clickAndAssertText(page.getByRole("button", { name: "Claim snack slot" }).first(), page, "Snack slot saved to Supabase.");
    await clickAndAssertText(page.getByRole("button", { name: "Claim volunteer role" }).first(), page, "Volunteer role assigned to your account.");
    await clickAndAssertText(
      page.locator("div.stack.compact").filter({ hasText: "PUSH" }).first().getByRole("button", { name: "Off" }),
      page,
      "Notification preference saved to Supabase."
    );

    await assertParentActionRows(supabase, parent.id);
    const screenshotPath = join(screenshotDir, "parent-live-actions-qa-session-live.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA parent live actions verified against Supabase rows (${screenshotPath})`);
  } finally {
    await context.close();
  }
}

async function proveMediaReportAndModerationWrites(browser, supabase) {
  const [parent, admin] = await Promise.all([
    findUserByEmail(supabase, requireEnv("QA_PARENT_EMAIL")),
    findUserByEmail(supabase, requireEnv("QA_ADMIN_EMAIL"))
  ]);
  const preparedMedia = await resetQaMediaProofItem(supabase);
  const proofStartedAt = new Date(Date.now() - 2000).toISOString();

  const parentContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const parentPage = await parentContext.newPage();

  try {
    await signIn(parentPage, requireEnv("QA_PARENT_EMAIL"), requireEnv("QA_PARENT_PASSWORD"));
    await parentPage.goto(`${baseUrl}/parent?qa_media_report=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(parentPage, "Showing Supabase roster, guardian, schedule, RSVP, and media rows.");
    await assertText(parentPage, "QA browser proof media");

    const reportResult = await authenticatedBrowserPost(parentPage, "/api/media/report", {
      mediaItemId: qaIds.mediaProof,
      reason: "QA browser proof family media report."
    });
    if (reportResult.status !== 200 || !reportResult.body?.ok) {
      throw new Error(`Media report browser API proof failed: ${reportResult.body?.message ?? reportResult.status}`);
    }

    await assertMediaReportRows(supabase, {
      parentUserId: parent.id,
      startingReportCount: preparedMedia.report_count ?? 0,
      proofStartedAt
    });

    const screenshotPath = join(screenshotDir, "media-report-qa-session-live.png");
    await parentPage.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA parent media report verified against Supabase rows (${screenshotPath})`);
  } finally {
    await parentContext.close();
  }

  const adminContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const adminPage = await adminContext.newPage();

  try {
    await signIn(adminPage, requireEnv("QA_ADMIN_EMAIL"), requireEnv("QA_ADMIN_PASSWORD"));
    await adminPage.goto(`${baseUrl}/admin?qa_media_moderation=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(adminPage, "Media governance");
    await assertText(adminPage, "QA browser proof media");

    const moderationResult = await authenticatedBrowserPost(adminPage, "/api/media/moderation", {
      mediaItemId: qaIds.mediaProof,
      status: "hidden",
      visibility: "organization",
      reason: "QA browser proof admin moderation."
    });
    if (moderationResult.status !== 200 || !moderationResult.body?.ok) {
      throw new Error(`Media moderation browser API proof failed: ${moderationResult.body?.message ?? moderationResult.status}`);
    }

    await assertMediaModerationRows(supabase, {
      adminUserId: admin.id,
      proofStartedAt
    });

    const screenshotPath = join(screenshotDir, "media-moderation-qa-session-live.png");
    await adminPage.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA admin media moderation verified against Supabase rows (${screenshotPath})`);
  } finally {
    await adminContext.close();
  }
}

async function proveRegistrationReviewWrites(browser, supabase) {
  const admin = await findUserByEmail(supabase, requireEnv("QA_ADMIN_EMAIL"));
  const [approvalRequest, rejectionRequest] = await Promise.all([
    createQaRegistrationRequest(supabase, { action: "approve" }),
    createQaRegistrationRequest(supabase, { action: "reject" })
  ]);
  const proofStartedAt = new Date(Date.now() - 2000).toISOString();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();

  try {
    await signIn(page, requireEnv("QA_ADMIN_EMAIL"), requireEnv("QA_ADMIN_PASSWORD"));
    await page.goto(`${baseUrl}/admin/registrations?qa_registration_review=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(page, "Registration review");
    await assertText(page, "Pending queue");
    await assertText(page, approvalRequest.player_first_name);
    await assertText(page, rejectionRequest.player_first_name);

    const approvalResult = await authenticatedBrowserPost(page, `/api/admin/registration-requests/${approvalRequest.id}/approve`, {
      note: "QA browser proof approval."
    });
    if (approvalResult.status !== 200 || !approvalResult.body?.ok) {
      throw new Error(`Registration approval browser API proof failed: ${approvalResult.body?.message ?? approvalResult.status}`);
    }
    await assertRegistrationReviewRows(supabase, {
      requestId: approvalRequest.id,
      status: "approved",
      adminUserId: admin.id,
      proofStartedAt
    });
    const approvalScreenshotPath = join(screenshotDir, "registration-approval-qa-session-live.png");
    await page.screenshot({ path: approvalScreenshotPath, fullPage: true });

    const rejectionResult = await authenticatedBrowserPost(page, `/api/admin/registration-requests/${rejectionRequest.id}/reject`, {
      note: "QA browser proof rejection."
    });
    if (rejectionResult.status !== 200 || !rejectionResult.body?.ok) {
      throw new Error(`Registration rejection browser API proof failed: ${rejectionResult.body?.message ?? rejectionResult.status}`);
    }
    await assertRegistrationReviewRows(supabase, {
      requestId: rejectionRequest.id,
      status: "rejected",
      adminUserId: admin.id,
      proofStartedAt
    });
    const rejectionScreenshotPath = join(screenshotDir, "registration-rejection-qa-session-live.png");
    await page.screenshot({ path: rejectionScreenshotPath, fullPage: true });

    console.log(`QA admin registration approve/reject verified against Supabase rows (${approvalScreenshotPath}, ${rejectionScreenshotPath})`);
  } finally {
    await context.close();
  }
}

async function proveParentConsentAndAuthorization(browser, supabase) {
  const parent = await findUserByEmail(supabase, requireEnv("QA_PARENT_EMAIL"));
  const proofStartedAt = new Date(Date.now() - 2000).toISOString();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: { "Cache-Control": "no-cache" }
  });
  const page = await context.newPage();

  try {
    await signIn(page, requireEnv("QA_PARENT_EMAIL"), requireEnv("QA_PARENT_PASSWORD"));
    await page.goto(`${baseUrl}/parent/photos?qa_media_consent=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(page, "Media consent");

    const grantResult = await authenticatedBrowserPost(page, "/api/parent/media-consents", {
      playerId: qaIds.playerMason,
      granted: true
    });
    if (grantResult.status !== 200 || !grantResult.body?.ok || grantResult.body?.granted !== true) {
      throw new Error(`Parent media-consent grant browser API proof failed: ${grantResult.body?.message ?? grantResult.status}`);
    }
    await assertMediaConsentRows(supabase, {
      parentUserId: parent.id,
      granted: true,
      proofStartedAt
    });

    const calendarDenial = await authenticatedBrowserGet(
      page,
      `/api/schedule/export?teamId=${qaIds.archivedTeam}`
    );
    if (calendarDenial.status !== 403 || calendarDenial.body?.ok !== false) {
      throw new Error("Signed-in parent calendar export was not denied for an unauthorized team.");
    }

    const weatherDenial = await authenticatedBrowserPost(page, "/api/weather-alerts/draft", {
      eventId: qaIds.game
    });
    if (
      weatherDenial.status !== 400
      || weatherDenial.body?.ok !== false
      || !/coach|admin|authoriz|permission/i.test(String(weatherDenial.body?.message ?? ""))
    ) {
      throw new Error("Signed-in parent weather drafting was not denied before provider lookup.");
    }

    const revokeResult = await authenticatedBrowserPost(page, "/api/parent/media-consents", {
      playerId: qaIds.playerMason,
      granted: false
    });
    if (revokeResult.status !== 200 || !revokeResult.body?.ok || revokeResult.body?.granted !== false) {
      throw new Error(`Parent media-consent revoke browser API proof failed: ${revokeResult.body?.message ?? revokeResult.status}`);
    }
    await assertMediaConsentRows(supabase, {
      parentUserId: parent.id,
      granted: false,
      proofStartedAt
    });

    const screenshotPath = join(screenshotDir, "parent-media-consent-authorization-qa-session-live.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA parent media consent and unauthorized calendar/weather denials verified against hosted rows (${screenshotPath})`);
  } finally {
    await context.close();
  }
}

async function proveTeamBuilderPublication(browser, supabase) {
  const admin = await findUserByEmail(supabase, requireEnv("QA_ADMIN_EMAIL"));
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { "Cache-Control": "no-cache" }
  });
  const page = await context.newPage();

  try {
    await signIn(page, requireEnv("QA_ADMIN_EMAIL"), requireEnv("QA_ADMIN_PASSWORD"));
    await page.goto(`${baseUrl}/admin/teams?qa_team_builder=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(page, "Private team builder");

    const workbenchResult = await authenticatedBrowserGet(
      page,
      `/api/admin/team-builder-plans?organizationId=${qaIds.organization}`
    );
    const workbench = workbenchResult.body;
    if (workbenchResult.status !== 200 || !workbench?.ok) {
      throw new Error(`Team-builder hosted workbench proof failed: ${workbench?.message ?? workbenchResult.status}`);
    }
    const activeSeason = workbench.seasons?.find((season) => season.status === "active");
    const inputTeamIds = new Set((workbench.inputs ?? []).map((input) => input.teamId));
    const eligibleTeam = workbench.teams?.find((team) => (
      team.status === "active"
      && team.seasonId === activeSeason?.id
      && inputTeamIds.has(team.id)
    ));
    if (!activeSeason || !eligibleTeam) {
      throw new Error("Team-builder hosted proof requires an active season, active division team, and rostered player inputs.");
    }

    const previewActionId = randomUUID();
    const previewResult = await authenticatedBrowserPost(page, "/api/admin/team-builder-plans", {
      action: "preview",
      actionId: previewActionId,
      organizationId: qaIds.organization,
      seasonId: activeSeason.id,
      division: eligibleTeam.division,
      targetRosterSize: 10,
      expectedLockVersion: 0,
      friendRequests: []
    });
    if (previewResult.status !== 200 || !previewResult.body?.ok || !previewResult.body?.plan?.id) {
      throw new Error(`Team-builder preview browser API proof failed: ${previewResult.body?.message ?? previewResult.status}`);
    }

    const planId = previewResult.body.plan.id;
    const approveResult = await authenticatedBrowserPost(page, "/api/admin/team-builder-plans", {
      action: "approve",
      actionId: randomUUID(),
      planId,
      expectedLockVersion: previewResult.body.plan.lockVersion
    });
    if (approveResult.status !== 200 || !approveResult.body?.ok || approveResult.body?.plan?.status !== "approved") {
      throw new Error(`Team-builder approval browser API proof failed: ${approveResult.body?.message ?? approveResult.status}`);
    }

    const publishActionId = randomUUID();
    const publishLockVersion = approveResult.body.plan.lockVersion;
    const publishResult = await authenticatedBrowserPost(page, "/api/admin/team-builder-plans", {
      action: "publish",
      actionId: publishActionId,
      planId,
      expectedLockVersion: publishLockVersion
    });
    if (publishResult.status !== 200 || !publishResult.body?.ok || publishResult.body?.plan?.status !== "published") {
      throw new Error(`Team-builder publish browser API proof failed: ${publishResult.body?.message ?? publishResult.status}`);
    }

    const replayResult = await authenticatedBrowserPost(page, "/api/admin/team-builder-plans", {
      action: "publish",
      actionId: publishActionId,
      planId,
      expectedLockVersion: publishLockVersion
    });
    if (replayResult.status !== 200 || !replayResult.body?.ok || replayResult.body?.idempotent !== true) {
      throw new Error("Team-builder publish replay did not return the completed idempotent transaction.");
    }

    await assertTeamBuilderPublicationRows(supabase, { planId, adminUserId: admin.id });
    const screenshotPath = join(screenshotDir, "admin-team-builder-publication-qa-session-live.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA admin team-builder preview, approval, atomic publish, and replay verified against hosted rows (${screenshotPath}, plan ${planId})`);
  } finally {
    await context.close();
  }
}

export async function main({ guard = runGuardedQaMutation } = {}) {
  loadLocalEnv();
  requireAnonKey();
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireServiceRoleKey();

  return guard({
    action: "QA session proof",
    appBaseUrl: baseUrl,
    appInvocation,
    serviceRoleCredential: serviceRoleKey,
    supabaseUrl
  }, async () => {
  const supabase = createQaAdminClient(supabaseUrl, serviceRoleKey);
  mkdirSync(screenshotDir, { recursive: true });

  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  try {
    await proveSignedOutParentAccess(browser);

    await proveRole(browser, {
      label: "QA parent",
      email: requireEnv("QA_PARENT_EMAIL"),
      password: requireEnv("QA_PARENT_PASSWORD"),
      routes: [
        {
          path: "/parent",
          screenshot: "parent-qa-session-live.png",
          expectedText: [
            "Team details are current and scoped to your approved family access.",
            "Next event confirmed",
            "Tiny Tigers"
          ],
          expectedAnyText: [
            ["Opening weekend notes", "QA hosted weekly update proof", "Weekly update for Tiny Tigers"]
          ]
        },
        {
          path: "/parent/rsvp",
          screenshot: "parent-rsvp-qa-session-live.png",
          expectedText: [
            "RSVP details are current for your approved family access.",
            "Tiny Tigers vs Rookie Rockets",
            "Parents answer attendance for linked children only."
          ]
        }
      ]
    });

    await proveParentLiveActions(browser, supabase);

    await proveParentConsentAndAuthorization(browser, supabase);

    await proveRole(browser, {
      label: "QA coach",
      email: requireEnv("QA_COACH_EMAIL"),
      password: requireEnv("QA_COACH_PASSWORD"),
      routes: [
        {
          path: "/coach",
          screenshot: "coach-qa-session-live.png",
          expectedText: [
            "Team details are current and scoped to your approved coach assignment.",
            "Tiny Tigers",
            "weather drafts",
            "Field Mode"
          ]
        }
      ]
    });

    await proveCoachWeeklyUpdateWrite(browser, supabase);

    await proveCoachProviderPrivateWrites(browser, supabase);

    await proveMediaReportAndModerationWrites(browser, supabase);

    await proveRegistrationReviewWrites(browser, supabase);

    await proveTeamBuilderPublication(browser, supabase);

    await proveRole(browser, {
      label: "QA admin",
      email: requireEnv("QA_ADMIN_EMAIL"),
      password: requireEnv("QA_ADMIN_PASSWORD"),
      routes: [
        {
          path: "/admin/operations",
          screenshot: "admin-operations-qa-session-live.png",
          expectedText: [
            "Admin operations",
            "Provider inventory",
            "Approval queues"
          ]
        },
        {
          path: "/admin/security",
          screenshot: "admin-security-qa-session-live.png",
          expectedText: [
            "Security proof",
            "RLS and audit boundaries",
            "Proof checks"
          ]
        }
      ]
    });
  } finally {
    await browser.close();
  }
  });
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
