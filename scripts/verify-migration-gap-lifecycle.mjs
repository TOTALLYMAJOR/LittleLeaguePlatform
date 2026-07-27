#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  assertIsolatedQaTarget,
  assertServiceRoleCredential
} from "./qa-target-guard.mjs";

const ENV_FILE = ".env.local";
const ISOLATED_TARGET_CONFIRMATION =
  "I_CONFIRM_THIS_IS_AN_ISOLATED_NONPRODUCTION_TARGET";
const ISOLATED_TARGET_ENV = "MIGRATION_GAP_ISOLATED_TARGET_CONFIRM";

const EMAILS = {
  admin: "migration-gap.admin@example.com",
  requester: "migration-gap.requester@example.com",
  coGuardian: "migration-gap.co-guardian@example.com",
  driver: "migration-gap.driver@example.com",
  competitor: "migration-gap.competitor@example.com",
  outsider: "migration-gap.outsider@example.com",
  caregiver: "migration-gap.caregiver@example.com"
};

const IDS = {
  organization: "a1100000-0000-4000-8000-000000000001",
  season: "a1100000-0000-4000-8000-000000000002",
  team: "a1100000-0000-4000-8000-000000000003",
  requesterPlayer: "a1100000-0000-4000-8000-000000000004",
  driverPlayer: "a1100000-0000-4000-8000-000000000005",
  event: "a1100000-0000-4000-8000-000000000006",
  requesterMembership: "a1100000-0000-4000-8000-000000000007",
  driverMembership: "a1100000-0000-4000-8000-000000000008",
  requesterGuardian: "a1100000-0000-4000-8000-000000000009",
  driverGuardian: "a1100000-0000-4000-8000-000000000010",
  adminMembership: "a1100000-0000-4000-8000-000000000011",
  coGuardianMembership: "a1100000-0000-4000-8000-000000000012",
  coGuardianLink: "a1100000-0000-4000-8000-000000000013",
  competitorPlayer: "a1100000-0000-4000-8000-000000000014",
  competitorMembership: "a1100000-0000-4000-8000-000000000015",
  competitorGuardian: "a1100000-0000-4000-8000-000000000016",
  otherSeason: "a1100000-0000-4000-8000-000000000017",
  otherTeam: "a1100000-0000-4000-8000-000000000018",
  outsiderPlayer: "a1100000-0000-4000-8000-000000000019",
  outsiderMembership: "a1100000-0000-4000-8000-000000000020",
  outsiderGuardian: "a1100000-0000-4000-8000-000000000021",
  targetSeason: "a1100000-0000-4000-8000-000000000022",
  targetTeam: "a1100000-0000-4000-8000-000000000023",
  mediaItem: "a1100000-0000-4000-8000-000000000024",
  parentReplay: "a1100000-0000-4000-8000-000000000025",
  requesterConsent: "a1100000-0000-4000-8000-000000000026",
  coGuardianConsent: "a1100000-0000-4000-8000-000000000027"
};

const LIFECYCLE_CASES = Object.freeze([
  "same-team-competing-transportation-offers",
  "caregiver-expiry-and-cache-clearing",
  "official-communication-correction-and-acknowledgment",
  "media-consent-revocation-and-retention",
  "multi-guardian-season-transition"
]);

const sensitiveValues = new Set();

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if (
    value.length >= 2 &&
    ((value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadLocalEnvReadOnly() {
  if (!existsSync(ENV_FILE)) return;

  for (const rawLine of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = normalized.indexOf("=");
    if (separator < 1) continue;

    const key = normalized.slice(0, separator).trim();
    if (!key || key === ISOLATED_TARGET_ENV || key in process.env) continue;
    process.env[key] = parseEnvValue(normalized.slice(separator + 1));
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value || value.includes("[YOUR-")) {
    throw new Error(`${name} is required.`);
  }
  sensitiveValues.add(value);
  return value;
}

function decodeJwtRole(value) {
  const parts = value.split(".");
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(`${normalized}${padding}`, "base64").toString("utf8")
    );
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function assertKeySeparation(anonKey, serviceRoleKey) {
  if (anonKey === serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be different keys."
    );
  }

  if (anonKey.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is a secret key; use an anon JWT or publishable key."
    );
  }
  if (serviceRoleKey.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is a publishable key; use a service-role JWT or secret key."
    );
  }

  const anonRole = decodeJwtRole(anonKey);
  if (anonRole && anonRole !== "anon") {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_ANON_KEY has JWT role ${anonRole}; an anon key is required.`
    );
  }

  const serviceRole = decodeJwtRole(serviceRoleKey);
  if (serviceRole && serviceRole !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY has JWT role ${serviceRole}; a service-role key is required.`
    );
  }
}

function isLocalSupabaseHost(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

function assertSafeTarget(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use http or https.");
  }

  const local = isLocalSupabaseHost(parsed.hostname);
  const targetBoundConfirmation =
    `${ISOLATED_TARGET_CONFIRMATION}:${parsed.hostname}`;
  const isolatedConfirmed =
    process.env[ISOLATED_TARGET_ENV] === targetBoundConfirmation;

  if (!local && !isolatedConfirmed) {
    throw new Error(
      `Refusing non-local Supabase target ${parsed.hostname}. Supply ${ISOLATED_TARGET_ENV}=${targetBoundConfirmation} in the current process only for that exact disposable, isolated, non-production target.`
    );
  }
  if (!local && parsed.protocol !== "https:") {
    throw new Error("A confirmed non-local Supabase target must use https.");
  }

  return {
    hostname: parsed.hostname,
    local,
    isolatedConfirmed
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertUuid(value, label) {
  assert(
    typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      ),
    `${label} did not return a UUID.`
  );
}

function randomPassword() {
  const value = `MigrationGap-${randomBytes(24).toString("base64url")}-1aA!`;
  sensitiveValues.add(value);
  return value;
}

function randomInviteTokenHash() {
  const rawToken = randomBytes(32).toString("base64url");
  sensitiveValues.add(rawToken);
  const hash = createHash("sha256").update(rawToken).digest("hex");
  sensitiveValues.add(hash);
  return hash;
}

function isoHoursFrom(timestamp, hours) {
  return new Date(timestamp + hours * 60 * 60 * 1000).toISOString();
}

function cleanErrorMessage(error) {
  let message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown failure";

  for (const secret of sensitiveValues) {
    if (secret.length >= 8) message = message.split(secret).join("[redacted]");
  }

  return message
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-jwt]")
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, "[redacted-key]");
}

function serviceClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function anonClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

async function preflightTable(db, table) {
  const { error } = await db.from(table).select("*").limit(1);
  if (error) {
    throw new Error(
      `Migration preflight failed for public.${table}: ${error.message}. Apply the complete migration chain, including 0028 and 0029, and confirm service-role Data API grants.`
    );
  }
}

async function findUserByEmail(db, email) {
  const perPage = 200;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Auth identity lookup failed: ${error.message}`);
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found;
    if (data.users.length < perPage) return null;
  }

  throw new Error("Auth identity lookup exceeded 20,000 users.");
}

async function upsertAuthUser(db, input) {
  const existing = await findUserByEmail(db, input.email);

  if (existing) {
    const { data, error } = await db.auth.admin.updateUserById(existing.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: {
        display_name: input.displayName,
        default_role: "parent",
        migration_gap_fixture: true
      }
    });
    if (error) {
      throw new Error(`Auth identity refresh failed for ${input.label}: ${error.message}`);
    }
    return data.user;
  }

  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.displayName,
      default_role: "parent",
      migration_gap_fixture: true
    }
  });
  if (error) {
    throw new Error(`Auth identity creation failed for ${input.label}: ${error.message}`);
  }
  return data.user;
}

async function signInAndAssertIdentity(url, anonKey, input) {
  const db = anonClient(url, anonKey);
  const { data, error } = await db.auth.signInWithPassword({
    email: input.email,
    password: input.password
  });
  if (error) {
    throw new Error(`Anon-key sign-in failed for ${input.label}: ${error.message}`);
  }
  assert(
    data.user?.id === input.expectedUserId,
    `Anon-key sign-in returned the wrong identity for ${input.label}.`
  );
  await db.auth.signOut();
}

async function upsertRow(db, table, row) {
  const { data, error } = await db.from(table).upsert(row).select("id").single();
  if (error) {
    throw new Error(`${table} fixture upsert failed: ${error.message}`);
  }
  return data;
}

async function deleteRows(db, table, filters) {
  let query = db.from(table).delete();
  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }
  const { error } = await query;
  if (error) {
    throw new Error(`${table} fixture cleanup failed: ${error.message}`);
  }
}

async function exactCount(db, table, filters) {
  let query = db.from(table).select("id", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(`${table} count failed: ${error.message}`);
  }
  assert(typeof count === "number", `${table} did not return an exact count.`);
  return count;
}

async function exactSentProviderCount(db, organizationId) {
  const { count, error } = await db
    .from("notification_delivery_attempts")
    .select("id,notifications!inner(organization_id)", { count: "exact", head: true })
    .eq("status", "sent")
    .eq("notifications.organization_id", organizationId);
  if (error) {
    throw new Error(`Provider-send count failed: ${error.message}`);
  }
  assert(typeof count === "number", "Provider-send count was unavailable.");
  return count;
}

async function readMany(db, table, columns, filters) {
  let query = db.from(table).select(columns);
  for (const [column, value] of Object.entries(filters)) {
    query =
      value === null
        ? query.is(column, null)
        : Array.isArray(value)
          ? query.in(column, value)
          : query.eq(column, value);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`${table} service-role readback failed: ${error.message}`);
  }
  return data;
}

async function updateRows(db, table, values, filters) {
  let query = db.from(table).update(values);
  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const { error } = await query;
  if (error) {
    throw new Error(`${table} fixture update failed: ${error.message}`);
  }
}

async function insertRow(db, table, row) {
  const { data, error } = await db.from(table).insert(row).select("id").single();
  if (error) {
    throw new Error(`${table} fixture insert failed: ${error.message}`);
  }
  return data;
}

async function rpc(db, name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) {
    throw new Error(`${name} failed: ${error.message}`);
  }
  assert(data && typeof data === "object", `${name} did not return a JSON object.`);
  return data;
}

async function expectRpcFailure(db, name, args, expectedMessagePart) {
  const beforeAuditCount = await exactCount(db, "audit_events", {
    organization_id: IDS.organization
  });
  const { error } = await db.rpc(name, args);
  assert(error, `${name} unexpectedly succeeded.`);
  assert(
    error.message.toLowerCase().includes(expectedMessagePart.toLowerCase()),
    `${name} failed for an unexpected reason: ${error.message}`
  );
  const afterAuditCount = await exactCount(db, "audit_events", {
    organization_id: IDS.organization
  });
  assert(
    afterAuditCount === beforeAuditCount,
    `${name} denial left partial audit evidence.`
  );
}

function fulfilled(results) {
  return results.filter((result) => result.status === "fulfilled");
}

function rejected(results) {
  return results.filter((result) => result.status === "rejected");
}

async function beginCaseEvidence(db, name) {
  assert(LIFECYCLE_CASES.includes(name), `Unknown lifecycle case ${name}.`);
  const providerSendsBefore = await exactSentProviderCount(db, IDS.organization);
  assert(
    providerSendsBefore === 0,
    `${name} requires a fixture organization with zero prior provider sends.`
  );
  return {
    name,
    phases: ["setup"],
    notificationsBefore: await exactCount(db, "notifications", {
      organization_id: IDS.organization
    }),
    providerSendsBefore
  };
}

function recordCasePhase(evidence, phase) {
  const allowed = [
    "authorized_mutation",
    "denied_mutation",
    "concurrency_or_stale_version",
    "readback",
    "audit_evidence",
    "notification_draft_count",
    "provider_send_count",
    "cleanup"
  ];
  assert(allowed.includes(phase), `Unsupported lifecycle evidence phase ${phase}.`);
  if (!evidence.phases.includes(phase)) evidence.phases.push(phase);
}

async function finishCaseEvidence(
  db,
  evidence,
  { expectedNotificationDelta, cleanupAssertion }
) {
  const notificationsAfter = await exactCount(db, "notifications", {
    organization_id: IDS.organization
  });
  assert(
    notificationsAfter - evidence.notificationsBefore === expectedNotificationDelta,
    `${evidence.name} produced an unexpected notification-draft count.`
  );
  recordCasePhase(evidence, "notification_draft_count");

  const providerSendsAfter = await exactSentProviderCount(db, IDS.organization);
  assert(
    providerSendsAfter === 0 &&
      providerSendsAfter === evidence.providerSendsBefore,
    `${evidence.name} attempted a provider send.`
  );
  recordCasePhase(evidence, "provider_send_count");

  await cleanupAssertion();
  recordCasePhase(evidence, "cleanup");

  const requiredPhases = [
    "setup",
    "authorized_mutation",
    "denied_mutation",
    "concurrency_or_stale_version",
    "readback",
    "audit_evidence",
    "notification_draft_count",
    "provider_send_count",
    "cleanup"
  ];
  assert(
    requiredPhases.every((phase) => evidence.phases.includes(phase)),
    `${evidence.name} is missing required lifecycle evidence.`
  );
  return {
    name: evidence.name,
    phases: evidence.phases,
    notificationDraftDelta: notificationsAfter - evidence.notificationsBefore,
    providerSendDelta: providerSendsAfter - evidence.providerSendsBefore
  };
}

async function readOne(db, table, columns, id) {
  const { data, error } = await db.from(table).select(columns).eq("id", id).single();
  if (error) {
    throw new Error(`${table} service-role readback failed: ${error.message}`);
  }
  return data;
}

async function seedFixtures(db, actors, times) {
  await upsertRow(db, "profiles", {
    id: actors.admin.id,
    display_name: "Migration Gap Administrator",
    email: EMAILS.admin,
    default_role: "admin"
  });
  await upsertRow(db, "profiles", {
    id: actors.requester.id,
    display_name: "Migration Gap Requester",
    email: EMAILS.requester,
    default_role: "parent"
  });
  await upsertRow(db, "profiles", {
    id: actors.coGuardian.id,
    display_name: "Migration Gap Co-guardian",
    email: EMAILS.coGuardian,
    default_role: "parent"
  });
  await upsertRow(db, "profiles", {
    id: actors.driver.id,
    display_name: "Migration Gap Driver",
    email: EMAILS.driver,
    default_role: "parent"
  });
  await upsertRow(db, "profiles", {
    id: actors.competitor.id,
    display_name: "Migration Gap Competing Driver",
    email: EMAILS.competitor,
    default_role: "parent"
  });
  await upsertRow(db, "profiles", {
    id: actors.outsider.id,
    display_name: "Migration Gap Other-team Guardian",
    email: EMAILS.outsider,
    default_role: "parent"
  });
  await upsertRow(db, "profiles", {
    id: actors.caregiver.id,
    display_name: "Migration Gap Caregiver",
    email: EMAILS.caregiver,
    default_role: "parent"
  });

  await upsertRow(db, "organizations", {
    id: IDS.organization,
    name: "Migration Gap Isolated QA",
    provider_sends_enabled: false
  });
  await upsertRow(db, "seasons", {
    id: IDS.season,
    organization_id: IDS.organization,
    name: "Migration Gap Active Season",
    status: "active",
    starts_at: times.seasonStartsAt,
    ends_at: times.seasonEndsAt,
    archived_at: null
  });
  await upsertRow(db, "seasons", {
    id: IDS.otherSeason,
    organization_id: IDS.organization,
    name: "Migration Gap Other Active Season",
    status: "active",
    starts_at: times.seasonStartsAt,
    ends_at: times.seasonEndsAt,
    archived_at: null
  });
  await upsertRow(db, "seasons", {
    id: IDS.targetSeason,
    organization_id: IDS.organization,
    name: "Migration Gap Target Active Season",
    status: "active",
    starts_at: times.seasonStartsAt,
    ends_at: times.seasonEndsAt,
    archived_at: null
  });
  await upsertRow(db, "teams", {
    id: IDS.team,
    organization_id: IDS.organization,
    season_id: IDS.season,
    division: "QA",
    name: "Migration Gap Team",
    coach_user_id: null,
    mascot: "Compass",
    primary_color: "#174EA6",
    secondary_color: "#FBBC04",
    theme_key: "baseball",
    status: "active",
    archived_at: null
  });
  await upsertRow(db, "teams", {
    id: IDS.otherTeam,
    organization_id: IDS.organization,
    season_id: IDS.otherSeason,
    division: "QA",
    name: "Migration Gap Other Team",
    coach_user_id: null,
    mascot: "Scope",
    primary_color: "#0B8043",
    secondary_color: "#F6BF26",
    theme_key: "baseball",
    status: "active",
    archived_at: null
  });
  await upsertRow(db, "teams", {
    id: IDS.targetTeam,
    organization_id: IDS.organization,
    season_id: IDS.targetSeason,
    division: "QA",
    name: "Migration Gap Transition Target",
    coach_user_id: null,
    mascot: "Future",
    primary_color: "#8E24AA",
    secondary_color: "#F4511E",
    theme_key: "baseball",
    status: "active",
    archived_at: null
  });
  await upsertRow(db, "organization_memberships", {
    id: IDS.adminMembership,
    organization_id: IDS.organization,
    user_id: actors.admin.id,
    role: "admin",
    status: "active"
  });
  await upsertRow(db, "team_memberships", {
    id: IDS.requesterMembership,
    team_id: IDS.team,
    user_id: actors.requester.id,
    role: "parent",
    status: "active"
  });
  await upsertRow(db, "team_memberships", {
    id: IDS.coGuardianMembership,
    team_id: IDS.team,
    user_id: actors.coGuardian.id,
    role: "parent",
    status: "active"
  });
  await upsertRow(db, "team_memberships", {
    id: IDS.competitorMembership,
    team_id: IDS.team,
    user_id: actors.competitor.id,
    role: "parent",
    status: "active"
  });
  await upsertRow(db, "team_memberships", {
    id: IDS.outsiderMembership,
    team_id: IDS.otherTeam,
    user_id: actors.outsider.id,
    role: "parent",
    status: "active"
  });
  await upsertRow(db, "team_memberships", {
    id: IDS.driverMembership,
    team_id: IDS.team,
    user_id: actors.driver.id,
    role: "parent",
    status: "active"
  });
  await upsertRow(db, "players", {
    id: IDS.requesterPlayer,
    organization_id: IDS.organization,
    season_id: IDS.season,
    team_id: IDS.team,
    first_name: "Casey",
    last_initial: "R",
    jersey: "28",
    roster_status: "active"
  });
  await upsertRow(db, "players", {
    id: IDS.competitorPlayer,
    organization_id: IDS.organization,
    season_id: IDS.season,
    team_id: IDS.team,
    first_name: "Morgan",
    last_initial: "C",
    jersey: "30",
    roster_status: "active"
  });
  await upsertRow(db, "players", {
    id: IDS.outsiderPlayer,
    organization_id: IDS.organization,
    season_id: IDS.otherSeason,
    team_id: IDS.otherTeam,
    first_name: "Taylor",
    last_initial: "O",
    jersey: "31",
    roster_status: "active"
  });
  await upsertRow(db, "players", {
    id: IDS.driverPlayer,
    organization_id: IDS.organization,
    season_id: IDS.season,
    team_id: IDS.team,
    first_name: "Jordan",
    last_initial: "D",
    jersey: "29",
    roster_status: "active"
  });
  await upsertRow(db, "player_guardians", {
    id: IDS.requesterGuardian,
    player_id: IDS.requesterPlayer,
    parent_user_id: actors.requester.id,
    parent_invite_id: null,
    relationship: "guardian",
    status: "active"
  });
  await upsertRow(db, "player_guardians", {
    id: IDS.coGuardianLink,
    player_id: IDS.requesterPlayer,
    parent_user_id: actors.coGuardian.id,
    parent_invite_id: null,
    relationship: "guardian",
    status: "active"
  });
  await upsertRow(db, "player_guardians", {
    id: IDS.competitorGuardian,
    player_id: IDS.competitorPlayer,
    parent_user_id: actors.competitor.id,
    parent_invite_id: null,
    relationship: "guardian",
    status: "active"
  });
  await upsertRow(db, "player_guardians", {
    id: IDS.outsiderGuardian,
    player_id: IDS.outsiderPlayer,
    parent_user_id: actors.outsider.id,
    parent_invite_id: null,
    relationship: "guardian",
    status: "active"
  });
  await upsertRow(db, "player_guardians", {
    id: IDS.driverGuardian,
    player_id: IDS.driverPlayer,
    parent_user_id: actors.driver.id,
    parent_invite_id: null,
    relationship: "guardian",
    status: "active"
  });
  await upsertRow(db, "events", {
    id: IDS.event,
    organization_id: IDS.organization,
    team_id: IDS.team,
    season_id: IDS.season,
    title: "Migration Gap Lifecycle Game",
    event_type: "game",
    starts_at: times.eventStartsAt,
    ends_at: times.eventEndsAt,
    location_name: "Isolated QA Field",
    location_address: null,
    opponent: "Harness",
    status: "scheduled",
    schedule_version: 1
  });
  await upsertRow(db, "media_items", {
    id: IDS.mediaItem,
    organization_id: IDS.organization,
    team_id: IDS.team,
    title: "Migration Gap Reviewed Family Media",
    media_type: "google_photos",
    url: "https://example.invalid/migration-gap-family-media",
    moderation_status: "approved",
    reviewed_by_user_id: actors.admin.id,
    reviewed_at: times.fixtureObservedAt,
    private_object_path: "migration-gap/private/family-media.jpg",
    content_mime_type: "image/jpeg",
    content_size_bytes: 1024,
    content_sha256: "1".repeat(64),
    processing_started_at: times.fixtureObservedAt,
    processing_completed_at: times.fixtureObservedAt,
    scan_completed_at: times.fixtureObservedAt,
    scan_provider: "fixture-only",
    scan_evidence_json: { fixture: true },
    family_release_approved_at: times.fixtureObservedAt,
    family_release_approved_by_user_id: actors.admin.id,
    consent_basis: "explicit-team-family",
    retention_delete_after: times.retentionDeleteAfter,
    storage_deleted_at: null
  });
  await upsertRow(db, "parent_replays", {
    id: IDS.parentReplay,
    organization_id: IDS.organization,
    season_id: IDS.season,
    team_id: IDS.team,
    coach_user_id: actors.admin.id,
    focus_areas: ["teamwork"],
    title: "Migration Gap Family Story",
    summary: "Provider-free lifecycle proof.",
    home_activities: [{ title: "Talk together" }],
    coach_video: {},
    parent_tip: "Ask what felt fun.",
    team_quest: "Name one teammate contribution.",
    skill_cards: [],
    parent_education: "Private family reflection.",
    status: "queued",
    reviewed_by_user_id: actors.admin.id,
    reviewed_at: times.fixtureObservedAt,
    published_at: times.fixtureObservedAt,
    approved_at: times.fixtureObservedAt,
    approved_by_user_id: actors.admin.id
  });
  await upsertRow(db, "player_media_consents", {
    id: IDS.requesterConsent,
    organization_id: IDS.organization,
    team_id: IDS.team,
    player_id: IDS.requesterPlayer,
    guardian_user_id: actors.requester.id,
    scope: "team_family",
    evidence_json: { fixture: true },
    granted_at: times.fixtureObservedAt,
    revoked_at: null
  });
  await upsertRow(db, "player_media_consents", {
    id: IDS.coGuardianConsent,
    organization_id: IDS.organization,
    team_id: IDS.team,
    player_id: IDS.requesterPlayer,
    guardian_user_id: actors.coGuardian.id,
    scope: "team_family",
    evidence_json: { fixture: true },
    granted_at: times.fixtureObservedAt,
    revoked_at: null
  });
}

function assertAudit(audits, expected) {
  for (const item of expected) {
    const match = audits.find(
      (audit) =>
        audit.action === item.action &&
        audit.target_type === item.targetType &&
        audit.target_id === item.targetId &&
        audit.actor_user_id === item.actorUserId
    );
    assert(match, `Missing attributed audit event ${item.action}.`);
  }
}

async function runTransportationCase(db, actors) {
  const evidence = await beginCaseEvidence(
    db,
    "same-team-competing-transportation-offers"
  );
  await deleteRows(db, "transportation_requests", {
    event_id: IDS.event,
    player_id: IDS.requesterPlayer
  });
  const requestsBeforeDenial = await exactCount(db, "transportation_requests", {
    event_id: IDS.event
  });

  await expectRpcFailure(
    db,
    "request_event_transportation",
    {
      target_event_id: IDS.event,
      target_player_id: IDS.driverPlayer,
      requesting_user_id: actors.requester.id,
      target_direction: "outbound",
      expected_schedule_version: 1
    },
    "active guardian link"
  );
  await expectRpcFailure(
    db,
    "request_event_transportation",
    {
      target_event_id: IDS.event,
      target_player_id: IDS.outsiderPlayer,
      requesting_user_id: actors.outsider.id,
      target_direction: "outbound",
      expected_schedule_version: 1
    },
    "scope could not be verified"
  );
  assert(
    (await exactCount(db, "transportation_requests", {
      event_id: IDS.event
    })) === requestsBeforeDenial,
    "Wrong-family or cross-team transportation denial left a partial request."
  );
  recordCasePhase(evidence, "denied_mutation");

  const requestResult = await rpc(db, "request_event_transportation", {
    target_event_id: IDS.event,
    target_player_id: IDS.requesterPlayer,
    requesting_user_id: actors.requester.id,
    target_direction: "outbound",
    expected_schedule_version: 1
  });
  assert(requestResult.state === "open", "Transportation request did not open.");

  const offersBeforeOutsider = await exactCount(db, "transportation_offers", {
    request_id: requestResult.request_id
  });
  await expectRpcFailure(
    db,
    "offer_event_transportation",
    {
      target_request_id: requestResult.request_id,
      offering_user_id: actors.outsider.id,
      seat_count: 2
    },
    "on this team"
  );
  assert(
    (await exactCount(db, "transportation_offers", {
      request_id: requestResult.request_id
    })) === offersBeforeOutsider &&
      (await exactCount(db, "transportation_assignments", {
        request_id: requestResult.request_id
      })) === 0,
    "Cross-team transportation denial left a partial offer or assignment."
  );

  const offerResults = await Promise.all([
    rpc(db, "offer_event_transportation", {
      target_request_id: requestResult.request_id,
      offering_user_id: actors.driver.id,
      seat_count: 2
    }),
    rpc(db, "offer_event_transportation", {
      target_request_id: requestResult.request_id,
      offering_user_id: actors.competitor.id,
      seat_count: 3
    })
  ]);
  recordCasePhase(evidence, "authorized_mutation");

  const acceptanceResults = await Promise.allSettled(
    offerResults.map((offer) =>
      rpc(db, "accept_transportation_assignment", {
        target_assignment_id: offer.assignment_id,
        accepting_user_id: actors.requester.id,
        expected_schedule_version: 1
      })
    )
  );
  assert(
    fulfilled(acceptanceResults).length === 1 &&
      rejected(acceptanceResults).length === 1,
    "Competing transportation acceptance did not converge on one final outcome."
  );
  recordCasePhase(evidence, "concurrency_or_stale_version");

  const assignments = await readMany(
    db,
    "transportation_assignments",
    "id,status,offer_id,driver_user_id,withdrawal_reason,assigned_at",
    { request_id: requestResult.request_id }
  );
  const offers = await readMany(
    db,
    "transportation_offers",
    "id,status,offered_by_user_id,withdrawn_at",
    { request_id: requestResult.request_id }
  );
  assert(
    assignments.filter((row) => row.status === "assigned").length === 1 &&
      assignments.filter((row) => row.status === "withdrawn").length === 1,
    "Competing assignments did not preserve one winner and one rejected outcome."
  );
  assert(
    offers.filter((row) => row.status === "accepted").length === 1 &&
      offers.filter((row) => row.status === "withdrawn").length === 1,
    "Competing offers did not preserve accepted and rejected evidence."
  );
  recordCasePhase(evidence, "readback");

  const winner = assignments.find((row) => row.status === "assigned");
  const audits = await readMany(
    db,
    "audit_events",
    "action,target_type,target_id,actor_user_id",
    { target_id: [requestResult.request_id, ...assignments.map((row) => row.id)] }
  );
  assertAudit(audits, [
    {
      action: "transportation_requested",
      targetType: "transportation_request",
      targetId: requestResult.request_id,
      actorUserId: actors.requester.id
    },
    {
      action: "transportation_assignment_accepted",
      targetType: "transportation_assignment",
      targetId: winner.id,
      actorUserId: actors.requester.id
    }
  ]);
  recordCasePhase(evidence, "audit_evidence");

  return finishCaseEvidence(db, evidence, {
    expectedNotificationDelta: 0,
    cleanupAssertion: async () => {
      await rpc(db, "withdraw_transportation_assignment", {
        target_assignment_id: winner.id,
        withdrawing_user_id: actors.requester.id,
        withdrawal_explanation: "Lifecycle proof cleanup releases assigned responsibility."
      });
      await rpc(db, "withdraw_transportation_request", {
        target_request_id: requestResult.request_id,
        withdrawing_user_id: actors.requester.id,
        withdrawal_explanation: "Lifecycle proof cleanup closes the open request."
      });
      const finalRequest = await readOne(
        db,
        "transportation_requests",
        "id,status,withdrawal_reason",
        requestResult.request_id
      );
      assert(
        finalRequest.status === "withdrawn",
        "Transportation cleanup left a current request."
      );
    }
  });
}

async function runCaregiverCase(db, actors, times) {
  const evidence = await beginCaseEvidence(
    db,
    "caregiver-expiry-and-cache-clearing"
  );
  await deleteRows(db, "temporary_caregiver_authorizations", {
    player_id: IDS.requesterPlayer
  });

  const wrongScopeHash = randomInviteTokenHash();
  const beforeWrongScope = await exactCount(
    db,
    "temporary_caregiver_authorizations",
    { player_id: IDS.outsiderPlayer }
  );
  await expectRpcFailure(
    db,
    "create_temporary_caregiver_authorization",
    {
      target_player_id: IDS.outsiderPlayer,
      authorizing_user_id: actors.requester.id,
      target_caregiver_email: EMAILS.caregiver,
      target_event_ids: [IDS.event],
      allow_pickup: false,
      target_starts_at: times.caregiverStartsAt,
      target_expires_at: times.caregiverExpiresAt,
      target_invite_token_hash: wrongScopeHash,
      target_invite_expires_at: times.inviteExpiresAt
    },
    "active guardian link"
  );
  assert(
    (await exactCount(db, "temporary_caregiver_authorizations", {
      player_id: IDS.outsiderPlayer
    })) === beforeWrongScope,
    "Denied caregiver creation left a partial authorization."
  );

  const initialInviteHash = randomInviteTokenHash();
  const createResult = await rpc(db, "create_temporary_caregiver_authorization", {
    target_player_id: IDS.requesterPlayer,
    authorizing_user_id: actors.requester.id,
    target_caregiver_email: EMAILS.caregiver,
    target_event_ids: [IDS.event],
    allow_pickup: true,
    target_starts_at: times.caregiverStartsAt,
    target_expires_at: times.caregiverExpiresAt,
    target_invite_token_hash: initialInviteHash,
    target_invite_expires_at: times.inviteExpiresAt
  });
  await expectRpcFailure(
    db,
    "accept_temporary_caregiver_authorization",
    {
      target_invite_token_hash: initialInviteHash,
      accepting_user_id: actors.driver.id
    },
    "exact caregiver email"
  );
  recordCasePhase(evidence, "denied_mutation");

  const acceptResult = await rpc(
    db,
    "accept_temporary_caregiver_authorization",
    {
      target_invite_token_hash: initialInviteHash,
      accepting_user_id: actors.caregiver.id
    }
  );
  assert(
    ["accepted_upcoming", "active"].includes(acceptResult.state),
    "Exact-email caregiver acceptance failed."
  );
  recordCasePhase(evidence, "authorized_mutation");

  const revokeResult = await rpc(
    db,
    "revoke_temporary_caregiver_authorization",
    {
      target_authorization_id: createResult.authorization_id,
      revoking_user_id: actors.requester.id,
      revocation_explanation: "Guardian ended temporary access during lifecycle proof."
    }
  );
  assert(
    revokeResult.state === "revoked" &&
      revokeResult.cache_action === "clear_at_next_contact",
    "Caregiver revocation did not explicitly require cache clearing."
  );

  const expiredHash = randomInviteTokenHash();
  const expiredCreate = await rpc(
    db,
    "create_temporary_caregiver_authorization",
    {
      target_player_id: IDS.requesterPlayer,
      authorizing_user_id: actors.requester.id,
      target_caregiver_email: EMAILS.caregiver,
      target_event_ids: [IDS.event],
      allow_pickup: false,
      target_starts_at: times.caregiverStartsAt,
      target_expires_at: times.caregiverExpiresAt,
      target_invite_token_hash: expiredHash,
      target_invite_expires_at: times.inviteExpiresAt
    }
  );
  await updateRows(
    db,
    "temporary_caregiver_authorizations",
    {
      starts_at: isoHoursFrom(Date.now(), -48),
      expires_at: isoHoursFrom(Date.now(), -24),
      invite_expires_at: isoHoursFrom(Date.now(), -25)
    },
    { id: expiredCreate.authorization_id }
  );
  await expectRpcFailure(
    db,
    "accept_temporary_caregiver_authorization",
    {
      target_invite_token_hash: expiredHash,
      accepting_user_id: actors.caregiver.id
    },
    "expired"
  );
  recordCasePhase(evidence, "concurrency_or_stale_version");

  const rows = await readMany(
    db,
    "temporary_caregiver_authorizations",
    "id,caregiver_user_id,revoked_at,revocation_reason,starts_at,expires_at,invite_expires_at,invite_token_hash",
    { id: [createResult.authorization_id, expiredCreate.authorization_id] }
  );
  const revokedRow = rows.find((row) => row.id === createResult.authorization_id);
  const expiredRow = rows.find((row) => row.id === expiredCreate.authorization_id);
  assert(
      revokedRow.revoked_at &&
      revokedRow.caregiver_user_id === actors.caregiver.id &&
      new Date(expiredRow.invite_expires_at).getTime() < Date.now() &&
      new Date(expiredRow.expires_at).getTime() < Date.now() &&
      expiredRow.caregiver_user_id === null,
    "Caregiver revocation or independent expiry readback is incomplete."
  );
  recordCasePhase(evidence, "readback");

  const audits = await readMany(
    db,
    "audit_events",
    "action,target_type,target_id,actor_user_id",
    { target_id: [createResult.authorization_id, expiredCreate.authorization_id] }
  );
  assertAudit(audits, [
    {
      action: "temporary_caregiver_authorized",
      targetType: "temporary_caregiver_authorization",
      targetId: createResult.authorization_id,
      actorUserId: actors.requester.id
    },
    {
      action: "temporary_caregiver_accepted",
      targetType: "temporary_caregiver_authorization",
      targetId: createResult.authorization_id,
      actorUserId: actors.caregiver.id
    },
    {
      action: "temporary_caregiver_revoked",
      targetType: "temporary_caregiver_authorization",
      targetId: createResult.authorization_id,
      actorUserId: actors.requester.id
    }
  ]);
  recordCasePhase(evidence, "audit_evidence");

  return finishCaseEvidence(db, evidence, {
    expectedNotificationDelta: 0,
    cleanupAssertion: async () => {
      await rpc(db, "revoke_temporary_caregiver_authorization", {
        target_authorization_id: expiredCreate.authorization_id,
        revoking_user_id: actors.requester.id,
        revocation_explanation: "Lifecycle proof cleanup closes expired invitation evidence."
      });
      const activeCount = await exactCount(
        db,
        "temporary_caregiver_authorizations",
        { player_id: IDS.requesterPlayer, revoked_at: null }
      );
      assert(activeCount === 0, "Caregiver cleanup left active authorization rows.");
    }
  });
}

async function runOfficialCommunicationCase(db, actors) {
  const evidence = await beginCaseEvidence(
    db,
    "official-communication-correction-and-acknowledgment"
  );
  const publicationBase = {
    target_event_id: IDS.event,
    target_category: "official_update",
    target_priority: "action_required",
    expected_schedule_version: 1
  };
  const threadsBeforeDenial = await exactCount(
    db,
    "official_communication_threads",
    { event_id: IDS.event }
  );

  await expectRpcFailure(
    db,
    "publish_official_communication_version",
    {
      ...publicationBase,
      target_thread_id: null,
      publishing_user_id: actors.requester.id,
      target_action: "published",
      target_title: "Arrival reminder",
      target_body: "Please arrive twenty minutes before warmups.",
      publication_reason: "Wrong-actor denial proof for official publishing.",
      expected_thread_version: 0,
      action_idempotency_key: `migration-gap-wrong-actor-${Date.now()}`
    },
    "coach or league administrator"
  );
  assert(
    (await exactCount(db, "official_communication_threads", {
      event_id: IDS.event
    })) === threadsBeforeDenial,
    "Wrong-actor official publication left a partial thread."
  );
  recordCasePhase(evidence, "denied_mutation");

  const published = await rpc(db, "publish_official_communication_version", {
    ...publicationBase,
    target_thread_id: null,
    publishing_user_id: actors.admin.id,
    target_action: "published",
    target_title: "Arrival reminder",
    target_body: "Please arrive twenty minutes before warmups.",
    publication_reason: "Administrator reviewed the first official version.",
    expected_thread_version: 0,
    action_idempotency_key: `migration-gap-publish-${Date.now()}`
  });
  assert(
    published.version_number === 1 &&
      published.provider_execution === "not_started",
    "Official publication did not create provider-free version one."
  );
  recordCasePhase(evidence, "authorized_mutation");

  const v1Notifications = await readMany(
    db,
    "notifications",
    "id,recipient_user_id,status,official_communication_version_id",
    { official_communication_version_id: published.version_id }
  );
  assert(
    v1Notifications.length === published.notification_count,
    "Version-one notification drafts do not match publication evidence."
  );

  const correctionAttempts = await Promise.allSettled([
    rpc(db, "publish_official_communication_version", {
      ...publicationBase,
      target_thread_id: published.thread_id,
      publishing_user_id: actors.admin.id,
      target_action: "corrected",
      target_title: "Corrected arrival reminder",
      target_body: "Please arrive thirty minutes before warmups.",
      publication_reason: "Correct the reviewed arrival time before the event.",
      expected_thread_version: 1,
      action_idempotency_key: `migration-gap-correction-a-${Date.now()}`
    }),
    rpc(db, "publish_official_communication_version", {
      ...publicationBase,
      target_thread_id: published.thread_id,
      publishing_user_id: actors.admin.id,
      target_action: "corrected",
      target_title: "Competing arrival correction",
      target_body: "Please arrive twenty-five minutes before warmups.",
      publication_reason: "Competing stale correction must not become current.",
      expected_thread_version: 1,
      action_idempotency_key: `migration-gap-correction-b-${Date.now()}`
    })
  ]);
  assert(
    fulfilled(correctionAttempts).length === 1 &&
      rejected(correctionAttempts).length === 1,
    "Concurrent official corrections did not converge on one current version."
  );
  const corrected = fulfilled(correctionAttempts)[0].value;
  assert(corrected.version_number === 2, "Current correction is not version two.");
  recordCasePhase(evidence, "concurrency_or_stale_version");

  const staleAcknowledgment = await rpc(
    db,
    "acknowledge_notification_receipt",
    {
      p_notification_id: v1Notifications[0].id,
      p_recipient_user_id: v1Notifications[0].recipient_user_id
    }
  );
  assert(
    staleAcknowledgment.ok === false &&
      staleAcknowledgment.code === "superseded",
    "Superseded official wording was acknowledgeable."
  );
  assert(
    (await exactCount(db, "notification_delivery_attempts", {
      notification_id: v1Notifications[0].id
    })) === 0,
    "Superseded acknowledgment denial left partial delivery evidence."
  );

  const currentNotifications = await readMany(
    db,
    "notifications",
    "id,recipient_user_id,status,official_communication_version_id",
    { official_communication_version_id: corrected.version_id }
  );
  assert(
    currentNotifications.length === corrected.notification_count,
    "Corrected notification-draft count is incomplete."
  );
  const currentNotification = currentNotifications.find(
    (row) => row.recipient_user_id === actors.requester.id
  );
  assert(currentNotification, "Current requester notification draft is missing.");

  const forbiddenAcknowledgment = await rpc(
    db,
    "acknowledge_notification_receipt",
    {
      p_notification_id: currentNotification.id,
      p_recipient_user_id: actors.outsider.id
    }
  );
  assert(
    forbiddenAcknowledgment.ok === false &&
      forbiddenAcknowledgment.code === "forbidden",
    "Wrong-family recipient could acknowledge an official message."
  );
  const currentAfterForbidden = await readOne(
    db,
    "notifications",
    "id,status,read_at",
    currentNotification.id
  );
  assert(
    currentAfterForbidden.status === "pending" &&
      currentAfterForbidden.read_at === null &&
      (await exactCount(db, "notification_delivery_attempts", {
        notification_id: currentNotification.id
      })) === 0,
    "Wrong-family acknowledgment denial left partial read or delivery evidence."
  );

  await insertRow(db, "notification_delivery_attempts", {
    notification_id: currentNotification.id,
    provider: "in_app_harness",
    provider_message_id: null,
    channel: "email",
    status: "queued",
    error_code: null,
    error_message: null
  });
  const acknowledgment = await rpc(db, "acknowledge_notification_receipt", {
    p_notification_id: currentNotification.id,
    p_recipient_user_id: actors.requester.id
  });
  assert(
    acknowledgment.ok === true &&
      acknowledgment.messageVersionId === corrected.version_id &&
      acknowledgment.messageVersionNumber === 2,
    "Acknowledgment did not bind to the current official version."
  );

  const failedProjection = await rpc(
    db,
    "record_official_communication_projection",
    {
      target_version_id: corrected.version_id,
      target_surface: "family_schedule",
      target_status: "failed",
      status_explanation: "Harness observed stale family schedule wording.",
      reporting_user_id: actors.admin.id
    }
  );
  assert(
    failedProjection.open_required_projection_count === 1,
    "Projection failure did not open an incident."
  );
  const repairedProjection = await rpc(
    db,
    "record_official_communication_projection",
    {
      target_version_id: corrected.version_id,
      target_surface: "family_schedule",
      target_status: "ready",
      status_explanation: "Harness confirmed corrected wording on family schedule.",
      reporting_user_id: actors.admin.id
    }
  );
  assert(
    repairedProjection.open_required_projection_count === 0,
    "Projection repair did not resolve required propagation."
  );

  const thread = await readOne(
    db,
    "official_communication_threads",
    "id,current_version_id,current_version_number,state",
    published.thread_id
  );
  const incidentRows = await readMany(
    db,
    "official_communication_incidents",
    "version_id,status,resolved_at,resolved_by_user_id,resolution_note",
    { version_id: corrected.version_id }
  );
  const notificationReadback = await readOne(
    db,
    "notifications",
    "id,status,read_at,official_communication_version_id",
    currentNotification.id
  );
  assert(
    thread.current_version_id === corrected.version_id &&
      thread.current_version_number === 2 &&
      incidentRows.length === 1 &&
      incidentRows[0].status === "resolved" &&
      incidentRows[0].resolved_by_user_id === actors.admin.id &&
      notificationReadback.status === "read",
    "Official correction, incident resolution, or acknowledgment readback failed."
  );
  recordCasePhase(evidence, "readback");

  const audits = await readMany(
    db,
    "audit_events",
    "action,target_type,target_id,actor_user_id",
    {
      target_id: [
        published.version_id,
        corrected.version_id,
        `${corrected.version_id}:family_schedule`,
        currentNotification.id
      ]
    }
  );
  assertAudit(audits, [
    {
      action: "official_communication_published",
      targetType: "official_communication_version",
      targetId: published.version_id,
      actorUserId: actors.admin.id
    },
    {
      action: "official_communication_corrected",
      targetType: "official_communication_version",
      targetId: corrected.version_id,
      actorUserId: actors.admin.id
    },
    {
      action: "notification_acknowledged",
      targetType: "notification",
      targetId: currentNotification.id,
      actorUserId: actors.requester.id
    }
  ]);
  recordCasePhase(evidence, "audit_evidence");

  return finishCaseEvidence(db, evidence, {
    expectedNotificationDelta:
      published.notification_count + corrected.notification_count,
    cleanupAssertion: async () => {
      await deleteRows(db, "notifications", { event_id: IDS.event });
      const remainingDrafts = await exactCount(db, "notifications", {
        event_id: IDS.event
      });
      const retainedVersions = await exactCount(
        db,
        "official_communication_versions",
        { thread_id: published.thread_id }
      );
      assert(
        remainingDrafts === 0 && retainedVersions === 2,
        "Official communication cleanup failed to remove drafts or retain immutable history."
      );
    }
  });
}

async function runMediaConsentCase(db, actors) {
  const evidence = await beginCaseEvidence(
    db,
    "media-consent-revocation-and-retention"
  );
  await updateRows(
    db,
    "player_media_consents",
    { granted_at: new Date().toISOString(), revoked_at: null },
    { id: IDS.requesterConsent }
  );
  const publicationsBeforeDenial = await exactCount(
    db,
    "parent_replay_family_media",
    { parent_replay_id: IDS.parentReplay }
  );

  await expectRpcFailure(
    db,
    "publish_parent_replay_family_media",
    {
      target_parent_replay_id: IDS.parentReplay,
      target_media_item_id: IDS.mediaItem,
      target_subject_player_ids: [IDS.requesterPlayer],
      target_alt_text: "Casey R. and teammates stand together after practice.",
      target_transcript: "Team members thank one another.",
      reviewing_user_id: actors.requester.id
    },
    "administrator review"
  );
  await expectRpcFailure(
    db,
    "publish_parent_replay_family_media",
    {
      target_parent_replay_id: IDS.parentReplay,
      target_media_item_id: IDS.mediaItem,
      target_subject_player_ids: [IDS.outsiderPlayer],
      target_alt_text: "A child from another team appears in the image.",
      target_transcript: "Cross-team subject scope denial.",
      reviewing_user_id: actors.admin.id
    },
    "replay team"
  );
  assert(
    (await exactCount(db, "parent_replay_family_media", {
      parent_replay_id: IDS.parentReplay
    })) === publicationsBeforeDenial,
    "Denied media publication left a partial family-media row."
  );
  recordCasePhase(evidence, "denied_mutation");

  const published = await rpc(db, "publish_parent_replay_family_media", {
    target_parent_replay_id: IDS.parentReplay,
    target_media_item_id: IDS.mediaItem,
    target_subject_player_ids: [IDS.requesterPlayer],
    target_alt_text: "Casey R. and teammates stand together after practice.",
    target_transcript: "Team members thank one another.",
    reviewing_user_id: actors.admin.id
  });
  assert(
    published.ok === true && published.provider_execution === "not_started",
    "Reviewed family media publication failed."
  );
  recordCasePhase(evidence, "authorized_mutation");

  const beforeRevocation = await readOne(
    db,
    "parent_replay_family_media",
    "id,consent_snapshot_json,consent_snapshot_hash,revoked_at",
    published.family_media_id
  );
  assert(
    beforeRevocation.revoked_at === null &&
      Array.isArray(beforeRevocation.consent_snapshot_json.consents) &&
      beforeRevocation.consent_snapshot_json.consents.length === 2,
    "Family media did not retain both guardian consent receipts."
  );

  await updateRows(
    db,
    "player_media_consents",
    { revoked_at: new Date().toISOString() },
    { id: IDS.requesterConsent }
  );
  await expectRpcFailure(
    db,
    "publish_parent_replay_family_media",
    {
      target_parent_replay_id: IDS.parentReplay,
      target_media_item_id: IDS.mediaItem,
      target_subject_player_ids: [IDS.requesterPlayer],
      target_alt_text: "Casey R. and teammates stand together after practice.",
      target_transcript: "Stale consent must not republish family media.",
      reviewing_user_id: actors.admin.id
    },
    "current family media consent"
  );
  recordCasePhase(evidence, "concurrency_or_stale_version");

  const revoked = await rpc(db, "revoke_parent_replay_family_media", {
    target_family_media_id: published.family_media_id,
    revoking_user_id: actors.admin.id,
    target_reason: "Guardian revoked team-family media consent during proof."
  });
  assert(revoked.ok === true, "Family media revocation failed.");

  await expectRpcFailure(
    db,
    "record_parent_replay_engagement",
    {
      target_parent_replay_id: IDS.parentReplay,
      target_parent_user_id: actors.outsider.id,
      target_operation: "saved"
    },
    "unavailable to this family"
  );
  const retainedTextEngagement = await rpc(
    db,
    "record_parent_replay_engagement",
    {
      target_parent_replay_id: IDS.parentReplay,
      target_parent_user_id: actors.requester.id,
      target_operation: "saved"
    }
  );
  assert(
    retainedTextEngagement.ok === true && retainedTextEngagement.saved_at,
    "Consent revocation incorrectly removed retained Replay text."
  );

  const finalPublication = await readOne(
    db,
    "parent_replay_family_media",
    "id,media_item_id,consent_snapshot_json,consent_snapshot_hash,revoked_at,revoked_by_user_id,revocation_reason",
    published.family_media_id
  );
  const mediaItem = await readOne(
    db,
    "media_items",
    "id,storage_deleted_at,retention_delete_after",
    IDS.mediaItem
  );
  assert(
    finalPublication.revoked_at &&
      finalPublication.revoked_by_user_id === actors.admin.id &&
      finalPublication.consent_snapshot_hash ===
        beforeRevocation.consent_snapshot_hash &&
      mediaItem.storage_deleted_at === null &&
      mediaItem.retention_delete_after,
    "Revocation did not retain consent history and storage-retention evidence."
  );
  recordCasePhase(evidence, "readback");

  const audits = await readMany(
    db,
    "audit_events",
    "action,target_type,target_id,actor_user_id",
    { target_id: [published.family_media_id, IDS.parentReplay] }
  );
  assertAudit(audits, [
    {
      action: "parent_replay_family_media_published",
      targetType: "parent_replay_family_media",
      targetId: published.family_media_id,
      actorUserId: actors.admin.id
    },
    {
      action: "parent_replay_family_media_revoked",
      targetType: "parent_replay_family_media",
      targetId: published.family_media_id,
      actorUserId: actors.admin.id
    },
    {
      action: "parent_replay_saved",
      targetType: "parent_replay",
      targetId: IDS.parentReplay,
      actorUserId: actors.requester.id
    }
  ]);
  recordCasePhase(evidence, "audit_evidence");

  return finishCaseEvidence(db, evidence, {
    expectedNotificationDelta: 0,
    cleanupAssertion: async () => {
      const retained = await readOne(
        db,
        "parent_replay_family_media",
        "id,revoked_at,consent_snapshot_hash",
        published.family_media_id
      );
      assert(
        retained.revoked_at && retained.consent_snapshot_hash,
        "Media cleanup removed required revoked-retention evidence."
      );
    }
  });
}

async function acceptAllGuardians(db, transitionId, actors) {
  const firstWave = await Promise.allSettled([
    rpc(db, "respond_to_season_transition", {
      target_transition_id: transitionId,
      responding_guardian_user_id: actors.requester.id,
      target_decision: "accepted",
      target_note: "Primary guardian reviewed carry-forward and reset fields.",
      expected_lock_version: 1
    }),
    rpc(db, "respond_to_season_transition", {
      target_transition_id: transitionId,
      responding_guardian_user_id: actors.coGuardian.id,
      target_decision: "accepted",
      target_note: "Co-guardian reviewed carry-forward and reset fields.",
      expected_lock_version: 1
    })
  ]);
  assert(
    fulfilled(firstWave).length === 1 && rejected(firstWave).length === 1,
    "Concurrent guardian review did not reject exactly one stale response."
  );
  const firstResult = fulfilled(firstWave)[0].value;
  const firstGuardianRows = await readMany(
    db,
    "season_transition_guardian_reviews",
    "guardian_user_id,decision,decided_at",
    { transition_id: transitionId }
  );
  const pendingGuardian = firstGuardianRows.find(
    (row) => row.decision === "pending"
  );
  assert(
    firstResult.lock_version === 2 && pendingGuardian,
    "Concurrent guardian review did not preserve one pending decision."
  );
  const completed = await rpc(db, "respond_to_season_transition", {
    target_transition_id: transitionId,
    responding_guardian_user_id: pendingGuardian.guardian_user_id,
    target_decision: "accepted",
    target_note: "Guardian refreshed and accepted the current review version.",
    expected_lock_version: 2
  });
  assert(
    completed.state === "guardian_accepted" && completed.lock_version === 3,
    "Multi-guardian review did not reach one accepted current version."
  );
  return completed;
}

async function runSeasonTransitionCase(db, actors, times) {
  const evidence = await beginCaseEvidence(
    db,
    "multi-guardian-season-transition"
  );
  await deleteRows(db, "season_transition_reviews", {
    source_player_id: IDS.requesterPlayer
  });
  const transitionsBeforeDenial = await exactCount(
    db,
    "season_transition_reviews",
    { source_player_id: IDS.requesterPlayer }
  );

  await expectRpcFailure(
    db,
    "propose_season_transition",
    {
      target_source_player_id: IDS.requesterPlayer,
      target_team_id: IDS.targetTeam,
      proposing_user_id: actors.requester.id,
      target_reason: "Wrong actor must not propose a season transition.",
      target_expires_at: times.transitionExpiresAt
    },
    "league administrator"
  );
  assert(
    (await exactCount(db, "season_transition_reviews", {
      source_player_id: IDS.requesterPlayer
    })) === transitionsBeforeDenial,
    "Wrong-actor transition proposal left a partial review."
  );
  recordCasePhase(evidence, "denied_mutation");

  const proposed = await rpc(db, "propose_season_transition", {
    target_source_player_id: IDS.requesterPlayer,
    target_team_id: IDS.targetTeam,
    proposing_user_id: actors.admin.id,
    target_reason: "Move the family to the reviewed next-season roster.",
    target_expires_at: times.transitionExpiresAt
  });
  assert(
    proposed.guardian_review_count === 2 &&
      proposed.provider_execution === "not_started",
    "Season transition did not require both current guardians."
  );
  recordCasePhase(evidence, "authorized_mutation");

  const accepted = await acceptAllGuardians(db, proposed.transition_id, actors);
  recordCasePhase(evidence, "concurrency_or_stale_version");

  await expectRpcFailure(
    db,
    "apply_season_transition",
    {
      target_transition_id: proposed.transition_id,
      applying_user_id: actors.admin.id,
      expected_lock_version: 2
    },
    "every current guardian"
  );
  await expectRpcFailure(
    db,
    "apply_season_transition",
    {
      target_transition_id: proposed.transition_id,
      applying_user_id: actors.requester.id,
      expected_lock_version: accepted.lock_version
    },
    "league administrator"
  );

  const applied = await rpc(db, "apply_season_transition", {
    target_transition_id: proposed.transition_id,
    applying_user_id: actors.admin.id,
    expected_lock_version: accepted.lock_version
  });
  assert(
    applied.state === "applied" && applied.guardian_link_count === 2,
    "Reviewed season transition did not apply exactly two guardian links."
  );

  const targetPlayer = await readOne(
    db,
    "players",
    "id,first_name,last_initial,jersey,roster_status,source_season_transition_review_id",
    applied.target_player_id
  );
  const targetGuardians = await readMany(
    db,
    "player_guardians",
    "parent_user_id,relationship,status,source_season_transition_review_id",
    { player_id: applied.target_player_id }
  );
  const resetCounts = await Promise.all([
    exactCount(db, "rsvps", { player_id: applied.target_player_id }),
    exactCount(db, "transportation_requests", {
      player_id: applied.target_player_id
    }),
    exactCount(db, "temporary_caregiver_authorizations", {
      player_id: applied.target_player_id
    }),
    exactCount(db, "player_media_consents", {
      player_id: applied.target_player_id
    })
  ]);
  assert(
    targetPlayer.first_name === "Casey" &&
      targetPlayer.last_initial === "R" &&
      targetPlayer.jersey === null &&
      targetGuardians.length === 2 &&
      resetCounts.every((count) => count === 0),
    "Season transition carried a reset-required downstream field."
  );

  const reverted = await rpc(db, "revert_season_transition", {
    target_transition_id: proposed.transition_id,
    reverting_user_id: actors.admin.id,
    target_reason: "Safe correction removes only transition-created rows."
  });
  assert(reverted.state === "reverted", "Safe season correction failed.");
  assert(
    (await exactCount(db, "players", { id: applied.target_player_id })) === 0,
    "Safe correction retained the transition-created player."
  );

  const expiring = await rpc(db, "propose_season_transition", {
    target_source_player_id: IDS.requesterPlayer,
    target_team_id: IDS.targetTeam,
    proposing_user_id: actors.admin.id,
    target_reason: "Independent expiry proof for guardian review.",
    target_expires_at: times.transitionExpiresAt
  });
  await updateRows(
    db,
    "season_transition_reviews",
    {
      created_at: isoHoursFrom(Date.now(), -48),
      expires_at: isoHoursFrom(Date.now(), -24)
    },
    { id: expiring.transition_id }
  );
  await expectRpcFailure(
    db,
    "respond_to_season_transition",
    {
      target_transition_id: expiring.transition_id,
      responding_guardian_user_id: actors.requester.id,
      target_decision: "accepted",
      target_note: "Expired review must fail closed.",
      expected_lock_version: 1
    },
    "changed or expired"
  );
  const expired = await rpc(db, "close_season_transition", {
    target_transition_id: expiring.transition_id,
    closing_user_id: actors.admin.id,
    target_reason: "Expired review is closed with durable evidence.",
    expected_lock_version: 1
  });
  assert(expired.state === "expired", "Season review expiry was not explicit.");

  const downstreamProposal = await rpc(db, "propose_season_transition", {
    target_source_player_id: IDS.requesterPlayer,
    target_team_id: IDS.targetTeam,
    proposing_user_id: actors.admin.id,
    target_reason: "Downstream refusal proof for a second reviewed move.",
    target_expires_at: times.transitionExpiresAt
  });
  const downstreamAccepted = await acceptAllGuardians(
    db,
    downstreamProposal.transition_id,
    actors
  );
  const downstreamApplied = await rpc(db, "apply_season_transition", {
    target_transition_id: downstreamProposal.transition_id,
    applying_user_id: actors.admin.id,
    expected_lock_version: downstreamAccepted.lock_version
  });
  await insertRow(db, "rsvps", {
    event_id: IDS.event,
    player_id: downstreamApplied.target_player_id,
    parent_user_id: actors.requester.id,
    response: "going",
    note: "Downstream refusal fixture"
  });
  await expectRpcFailure(
    db,
    "revert_season_transition",
    {
      target_transition_id: downstreamProposal.transition_id,
      reverting_user_id: actors.admin.id,
      target_reason: "This correction must refuse downstream deletion."
    },
    "downstream family records"
  );

  const transitions = await readMany(
    db,
    "season_transition_reviews",
    "id,state,target_player_id,lock_version,correction_reason,reverted_at",
    {
      id: [
        proposed.transition_id,
        expiring.transition_id,
        downstreamProposal.transition_id
      ]
    }
  );
  assert(
    transitions.find((row) => row.id === proposed.transition_id)?.state ===
      "reverted" &&
      transitions.find((row) => row.id === expiring.transition_id)?.state ===
        "expired" &&
      transitions.find((row) => row.id === downstreamProposal.transition_id)
        ?.state === "applied",
    "Transition readback did not preserve reverted, expired, and refused outcomes."
  );
  recordCasePhase(evidence, "readback");

  const audits = await readMany(
    db,
    "audit_events",
    "action,target_type,target_id,actor_user_id",
    {
      target_id: [
        proposed.transition_id,
        expiring.transition_id,
        downstreamProposal.transition_id
      ]
    }
  );
  assertAudit(audits, [
    {
      action: "season_transition_reverted",
      targetType: "season_transition_review",
      targetId: proposed.transition_id,
      actorUserId: actors.admin.id
    },
    {
      action: "season_transition_expired",
      targetType: "season_transition_review",
      targetId: expiring.transition_id,
      actorUserId: actors.admin.id
    },
    {
      action: "season_transition_applied",
      targetType: "season_transition_review",
      targetId: downstreamProposal.transition_id,
      actorUserId: actors.admin.id
    }
  ]);
  recordCasePhase(evidence, "audit_evidence");

  return finishCaseEvidence(db, evidence, {
    expectedNotificationDelta: 0,
    cleanupAssertion: async () => {
      await deleteRows(db, "rsvps", {
        player_id: downstreamApplied.target_player_id
      });
      const cleanupRevert = await rpc(db, "revert_season_transition", {
        target_transition_id: downstreamProposal.transition_id,
        reverting_user_id: actors.admin.id,
        target_reason: "Cleanup follows downstream refusal after removing fixture row."
      });
      assert(
        cleanupRevert.state === "reverted" &&
          (await exactCount(db, "players", {
            id: downstreamApplied.target_player_id
          })) === 0,
        "Season transition cleanup left a transition-created roster row."
      );
    }
  });
}

async function main() {
  loadLocalEnvReadOnly();

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const target = assertSafeTarget(url);
  assertIsolatedQaTarget(url, "Migration-gap lifecycle proof");
  assertServiceRoleCredential(serviceRoleKey);
  assertKeySeparation(anonKey, serviceRoleKey);

  const db = serviceClient(url, serviceRoleKey);

  await Promise.all([
    preflightTable(db, "transportation_requests"),
    preflightTable(db, "transportation_offers"),
    preflightTable(db, "transportation_assignments"),
    preflightTable(db, "temporary_caregiver_authorizations"),
    preflightTable(db, "temporary_caregiver_authorization_events"),
    preflightTable(db, "official_communication_threads"),
    preflightTable(db, "official_communication_versions"),
    preflightTable(db, "official_communication_projections"),
    preflightTable(db, "official_communication_incidents"),
    preflightTable(db, "parent_replay_family_media"),
    preflightTable(db, "player_media_consents"),
    preflightTable(db, "season_transition_reviews"),
    preflightTable(db, "season_transition_guardian_reviews"),
    preflightTable(db, "audit_events"),
    preflightTable(db, "notifications"),
    preflightTable(db, "notification_delivery_attempts")
  ]);

  const credentials = {
    admin: {
      label: "league administrator",
      email: EMAILS.admin,
      password: randomPassword(),
      displayName: "Migration Gap Administrator"
    },
    requester: {
      label: "requesting guardian",
      email: EMAILS.requester,
      password: randomPassword(),
      displayName: "Migration Gap Requester"
    },
    coGuardian: {
      label: "co-guardian",
      email: EMAILS.coGuardian,
      password: randomPassword(),
      displayName: "Migration Gap Co-guardian"
    },
    driver: {
      label: "offering guardian",
      email: EMAILS.driver,
      password: randomPassword(),
      displayName: "Migration Gap Driver"
    },
    competitor: {
      label: "competing same-team driver",
      email: EMAILS.competitor,
      password: randomPassword(),
      displayName: "Migration Gap Competing Driver"
    },
    outsider: {
      label: "other-team guardian",
      email: EMAILS.outsider,
      password: randomPassword(),
      displayName: "Migration Gap Other-team Guardian"
    },
    caregiver: {
      label: "exact-email caregiver",
      email: EMAILS.caregiver,
      password: randomPassword(),
      displayName: "Migration Gap Caregiver"
    }
  };

  const actors = {
    admin: await upsertAuthUser(db, credentials.admin),
    requester: await upsertAuthUser(db, credentials.requester),
    coGuardian: await upsertAuthUser(db, credentials.coGuardian),
    driver: await upsertAuthUser(db, credentials.driver),
    competitor: await upsertAuthUser(db, credentials.competitor),
    outsider: await upsertAuthUser(db, credentials.outsider),
    caregiver: await upsertAuthUser(db, credentials.caregiver)
  };
  assertUuid(actors.admin.id, "League administrator identity");
  assertUuid(actors.requester.id, "Requesting guardian identity");
  assertUuid(actors.coGuardian.id, "Co-guardian identity");
  assertUuid(actors.driver.id, "Offering guardian identity");
  assertUuid(actors.competitor.id, "Competing driver identity");
  assertUuid(actors.outsider.id, "Other-team guardian identity");
  assertUuid(actors.caregiver.id, "Caregiver identity");

  const now = Date.now();
  const times = {
    seasonStartsAt: isoHoursFrom(now, -24 * 30),
    seasonEndsAt: isoHoursFrom(now, 24 * 180),
    caregiverStartsAt: isoHoursFrom(now, 24),
    eventStartsAt: isoHoursFrom(now, 48),
    eventEndsAt: isoHoursFrom(now, 49),
    caregiverExpiresAt: isoHoursFrom(now, 72),
    inviteExpiresAt: isoHoursFrom(now, 6),
    transitionExpiresAt: isoHoursFrom(now, 24 * 7),
    fixtureObservedAt: isoHoursFrom(now, -1),
    retentionDeleteAfter: isoHoursFrom(now, 24 * 30)
  };

  await seedFixtures(db, actors, times);

  await Promise.all([
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.admin,
      expectedUserId: actors.admin.id
    }),
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.requester,
      expectedUserId: actors.requester.id
    }),
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.coGuardian,
      expectedUserId: actors.coGuardian.id
    }),
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.driver,
      expectedUserId: actors.driver.id
    }),
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.competitor,
      expectedUserId: actors.competitor.id
    }),
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.outsider,
      expectedUserId: actors.outsider.id
    }),
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.caregiver,
      expectedUserId: actors.caregiver.id
    })
  ]);

  const caregiverMembershipsBefore = await exactCount(db, "team_memberships", {
    team_id: IDS.team,
    user_id: actors.caregiver.id
  });
  assert(
    caregiverMembershipsBefore === 0,
    "Dedicated caregiver identity already has a team membership; remove that fixture collision before rerunning."
  );

  const organizationReadback = await readOne(
    db,
    "organizations",
    "id,provider_sends_enabled",
    IDS.organization
  );
  assert(
    organizationReadback.provider_sends_enabled === false,
    "Harness organization must keep provider sends disabled."
  );

  const caseEvidence = [];
  caseEvidence.push(await runTransportationCase(db, actors));
  caseEvidence.push(await runCaregiverCase(db, actors, times));
  caseEvidence.push(await runOfficialCommunicationCase(db, actors));
  caseEvidence.push(await runMediaConsentCase(db, actors));
  caseEvidence.push(await runSeasonTransitionCase(db, actors, times));

  const caregiverMembershipsAfter = await exactCount(db, "team_memberships", {
    team_id: IDS.team,
    user_id: actors.caregiver.id
  });
  assert(
    caregiverMembershipsAfter === caregiverMembershipsBefore,
    "Temporary caregiver lifecycle unexpectedly created team membership."
  );
  assert(
    caseEvidence.length === LIFECYCLE_CASES.length &&
      LIFECYCLE_CASES.every((name) =>
        caseEvidence.some((item) => item.name === name)
      ),
    "Not every guarded family lifecycle produced evidence."
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        target: {
          hostname: target.hostname,
          safety: target.local ? "local" : "explicitly-confirmed-isolated-nonproduction"
        },
        fixtures: {
          organizationId: IDS.organization,
          teamId: IDS.team,
          eventId: IDS.event,
          authIdentities: Object.keys(actors).length,
          anonKeySignInsVerified: Object.keys(actors).length
        },
        lifecycleCases: caseEvidence,
        providerBoundary: {
          providerSendsEnabled: false,
          providerSendCount: await exactSentProviderCount(db, IDS.organization),
          providerCallsAttemptedByHarness: 0
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`Migration-gap lifecycle verification failed: ${cleanErrorMessage(error)}`);
  process.exitCode = 1;
});
