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
  requester: "migration-gap.requester@example.com",
  driver: "migration-gap.driver@example.com",
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
  driverGuardian: "a1100000-0000-4000-8000-000000000010"
};

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
    query = query.eq(column, value);
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(`${table} count failed: ${error.message}`);
  }
  assert(typeof count === "number", `${table} did not return an exact count.`);
  return count;
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
  const { error } = await db.rpc(name, args);
  assert(error, `${name} unexpectedly succeeded.`);
  assert(
    error.message.toLowerCase().includes(expectedMessagePart.toLowerCase()),
    `${name} failed for an unexpected reason: ${error.message}`
  );
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
    id: actors.requester.id,
    display_name: "Migration Gap Requester",
    email: EMAILS.requester,
    default_role: "parent"
  });
  await upsertRow(db, "profiles", {
    id: actors.driver.id,
    display_name: "Migration Gap Driver",
    email: EMAILS.driver,
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
  await upsertRow(db, "team_memberships", {
    id: IDS.requesterMembership,
    team_id: IDS.team,
    user_id: actors.requester.id,
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
}

function assertTransportationReadback(request, offer, assignment, actors) {
  assert(request.status === "matched", "Transportation request did not become matched.");
  assert(
    request.requested_by_user_id === actors.requester.id,
    "Transportation request actor readback is incorrect."
  );
  assert(request.schedule_version === 1, "Transportation request version is incorrect.");

  assert(offer.status === "accepted", "Transportation offer did not become accepted.");
  assert(
    offer.offered_by_user_id === actors.driver.id,
    "Transportation offer actor readback is incorrect."
  );
  assert(offer.seats === 2, "Transportation offer seat count is incorrect.");

  assert(assignment.status === "assigned", "Transportation assignment is not assigned.");
  assert(
    assignment.requested_by_user_id === actors.requester.id,
    "Transportation assignment requester is incorrect."
  );
  assert(
    assignment.driver_user_id === actors.driver.id,
    "Transportation assignment driver is incorrect."
  );
  assert(
    assignment.driver_accepted_at &&
      assignment.requester_accepted_at &&
      assignment.assigned_at,
    "Transportation mutual-acceptance timestamps are incomplete."
  );
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
    preflightTable(db, "audit_events"),
    preflightTable(db, "notifications")
  ]);

  const credentials = {
    requester: {
      label: "requesting guardian",
      email: EMAILS.requester,
      password: randomPassword(),
      displayName: "Migration Gap Requester"
    },
    driver: {
      label: "offering guardian",
      email: EMAILS.driver,
      password: randomPassword(),
      displayName: "Migration Gap Driver"
    },
    caregiver: {
      label: "exact-email caregiver",
      email: EMAILS.caregiver,
      password: randomPassword(),
      displayName: "Migration Gap Caregiver"
    }
  };

  const actors = {
    requester: await upsertAuthUser(db, credentials.requester),
    driver: await upsertAuthUser(db, credentials.driver),
    caregiver: await upsertAuthUser(db, credentials.caregiver)
  };
  assertUuid(actors.requester.id, "Requesting guardian identity");
  assertUuid(actors.driver.id, "Offering guardian identity");
  assertUuid(actors.caregiver.id, "Caregiver identity");

  const now = Date.now();
  const times = {
    seasonStartsAt: isoHoursFrom(now, -24 * 30),
    seasonEndsAt: isoHoursFrom(now, 24 * 180),
    caregiverStartsAt: isoHoursFrom(now, 24),
    eventStartsAt: isoHoursFrom(now, 48),
    eventEndsAt: isoHoursFrom(now, 49),
    caregiverExpiresAt: isoHoursFrom(now, 72),
    inviteExpiresAt: isoHoursFrom(now, 6)
  };

  await seedFixtures(db, actors, times);

  await Promise.all([
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.requester,
      expectedUserId: actors.requester.id
    }),
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.driver,
      expectedUserId: actors.driver.id
    }),
    signInAndAssertIdentity(url, anonKey, {
      ...credentials.caregiver,
      expectedUserId: actors.caregiver.id
    })
  ]);

  await deleteRows(db, "transportation_requests", {
    event_id: IDS.event,
    player_id: IDS.requesterPlayer
  });
  await deleteRows(db, "temporary_caregiver_authorizations", {
    player_id: IDS.requesterPlayer
  });

  const caregiverMembershipsBefore = await exactCount(db, "team_memberships", {
    team_id: IDS.team,
    user_id: actors.caregiver.id
  });
  assert(
    caregiverMembershipsBefore === 0,
    "Dedicated caregiver identity already has a team membership; remove that fixture collision before rerunning."
  );

  const notificationsBefore = await exactCount(db, "notifications", {
    organization_id: IDS.organization
  });

  const requestResult = await rpc(db, "request_event_transportation", {
    target_event_id: IDS.event,
    target_player_id: IDS.requesterPlayer,
    requesting_user_id: actors.requester.id,
    target_direction: "outbound",
    expected_schedule_version: 1
  });
  assert(requestResult.state === "open", "Transportation request RPC returned the wrong state.");
  assertUuid(requestResult.request_id, "Transportation request RPC");

  const offerResult = await rpc(db, "offer_event_transportation", {
    target_request_id: requestResult.request_id,
    offering_user_id: actors.driver.id,
    seat_count: 2
  });
  assert(
    offerResult.state === "awaiting_requester_acceptance",
    "Transportation offer RPC returned the wrong state."
  );
  assertUuid(offerResult.offer_id, "Transportation offer RPC");
  assertUuid(offerResult.assignment_id, "Transportation assignment offer RPC");

  const assignmentResult = await rpc(db, "accept_transportation_assignment", {
    target_assignment_id: offerResult.assignment_id,
    accepting_user_id: actors.requester.id,
    expected_schedule_version: 1
  });
  assert(
    assignmentResult.state === "assigned",
    "Transportation acceptance RPC returned the wrong state."
  );

  const requestReadback = await readOne(
    db,
    "transportation_requests",
    "id,status,requested_by_user_id,schedule_version",
    requestResult.request_id
  );
  const offerReadback = await readOne(
    db,
    "transportation_offers",
    "id,status,offered_by_user_id,seats",
    offerResult.offer_id
  );
  const assignmentReadback = await readOne(
    db,
    "transportation_assignments",
    "id,status,requested_by_user_id,driver_user_id,driver_accepted_at,requester_accepted_at,assigned_at",
    offerResult.assignment_id
  );
  assertTransportationReadback(requestReadback, offerReadback, assignmentReadback, actors);

  const initialInviteHash = randomInviteTokenHash();
  const caregiverCreateResult = await rpc(
    db,
    "create_temporary_caregiver_authorization",
    {
      target_player_id: IDS.requesterPlayer,
      authorizing_user_id: actors.requester.id,
      target_caregiver_email: EMAILS.caregiver,
      target_event_ids: [IDS.event],
      allow_pickup: true,
      target_starts_at: times.caregiverStartsAt,
      target_expires_at: times.caregiverExpiresAt,
      target_invite_token_hash: initialInviteHash,
      target_invite_expires_at: times.inviteExpiresAt
    }
  );
  assert(
    caregiverCreateResult.state === "awaiting_caregiver_acceptance",
    "Caregiver authorization create RPC returned the wrong state."
  );
  assertUuid(caregiverCreateResult.authorization_id, "Caregiver authorization create RPC");

  await expectRpcFailure(
    db,
    "accept_temporary_caregiver_authorization",
    {
      target_invite_token_hash: initialInviteHash,
      accepting_user_id: actors.driver.id
    },
    "exact caregiver email"
  );

  const caregiverAcceptResult = await rpc(
    db,
    "accept_temporary_caregiver_authorization",
    {
      target_invite_token_hash: initialInviteHash,
      accepting_user_id: actors.caregiver.id
    }
  );
  assert(
    ["accepted_upcoming", "active"].includes(caregiverAcceptResult.state),
    "Caregiver acceptance RPC returned the wrong state."
  );

  const caregiverAcceptedReadback = await readOne(
    db,
    "temporary_caregiver_authorizations",
    "id,caregiver_user_id,caregiver_accepted_at,activated_at,invite_token_hash",
    caregiverCreateResult.authorization_id
  );
  assert(
    caregiverAcceptedReadback.caregiver_user_id === actors.caregiver.id &&
      caregiverAcceptedReadback.caregiver_accepted_at &&
      caregiverAcceptedReadback.activated_at,
    "Caregiver exact-email acceptance readback is incomplete."
  );
  assert(
    typeof caregiverAcceptedReadback.invite_token_hash === "string" &&
      /^[0-9a-f]{64}$/.test(caregiverAcceptedReadback.invite_token_hash) &&
      caregiverAcceptedReadback.invite_token_hash !== initialInviteHash,
    "Caregiver acceptance did not rotate the invitation proof."
  );
  const acceptedInviteHash = caregiverAcceptedReadback.invite_token_hash;
  sensitiveValues.add(acceptedInviteHash);

  const caregiverRevokeResult = await rpc(
    db,
    "revoke_temporary_caregiver_authorization",
    {
      target_authorization_id: caregiverCreateResult.authorization_id,
      revoking_user_id: actors.requester.id,
      revocation_explanation: "Migration-gap lifecycle harness completed safely."
    }
  );
  assert(
    caregiverRevokeResult.state === "revoked",
    "Caregiver revocation RPC returned the wrong state."
  );

  const caregiverFinalReadback = await readOne(
    db,
    "temporary_caregiver_authorizations",
    "id,organization_id,team_id,player_id,authorized_by_user_id,caregiver_email,caregiver_user_id,allowed_actions,caregiver_accepted_at,activated_at,revoked_at,revoked_by_user_id,revocation_reason,invite_token_hash",
    caregiverCreateResult.authorization_id
  );
  assert(
    caregiverFinalReadback.organization_id === IDS.organization &&
      caregiverFinalReadback.team_id === IDS.team &&
      caregiverFinalReadback.player_id === IDS.requesterPlayer,
    "Caregiver authorization scope readback is incorrect."
  );
  assert(
    caregiverFinalReadback.authorized_by_user_id === actors.requester.id &&
      caregiverFinalReadback.caregiver_user_id === actors.caregiver.id &&
      caregiverFinalReadback.caregiver_email === EMAILS.caregiver,
    "Caregiver authorization actors are incorrect."
  );
  assert(
    caregiverFinalReadback.allowed_actions.includes("view_selected_event_passports") &&
      caregiverFinalReadback.allowed_actions.includes("pickup_selected_events"),
    "Caregiver least-privilege actions are incomplete."
  );
  assert(
    caregiverFinalReadback.revoked_at &&
      caregiverFinalReadback.revoked_by_user_id === actors.requester.id &&
      caregiverFinalReadback.revocation_reason ===
        "Migration-gap lifecycle harness completed safely.",
    "Caregiver revocation readback is incomplete."
  );
  assert(
    typeof caregiverFinalReadback.invite_token_hash === "string" &&
      /^[0-9a-f]{64}$/.test(caregiverFinalReadback.invite_token_hash) &&
      caregiverFinalReadback.invite_token_hash !== acceptedInviteHash,
    "Caregiver revocation did not rotate the invitation proof."
  );
  sensitiveValues.add(caregiverFinalReadback.invite_token_hash);

  const { data: caregiverEventRows, error: caregiverEventError } = await db
    .from("temporary_caregiver_authorization_events")
    .select("authorization_id,event_id,authorized_schedule_version")
    .eq("authorization_id", caregiverCreateResult.authorization_id);
  if (caregiverEventError) {
    throw new Error(
      `Caregiver selected-event readback failed: ${caregiverEventError.message}`
    );
  }
  assert(
    caregiverEventRows.length === 1 &&
      caregiverEventRows[0].event_id === IDS.event &&
      caregiverEventRows[0].authorized_schedule_version === 1,
    "Caregiver selected-event scope or schedule version is incorrect."
  );

  const expectedAudits = [
    {
      action: "transportation_requested",
      targetType: "transportation_request",
      targetId: requestResult.request_id,
      actorUserId: actors.requester.id
    },
    {
      action: "transportation_offered",
      targetType: "transportation_assignment",
      targetId: offerResult.assignment_id,
      actorUserId: actors.driver.id
    },
    {
      action: "transportation_assignment_accepted",
      targetType: "transportation_assignment",
      targetId: offerResult.assignment_id,
      actorUserId: actors.requester.id
    },
    {
      action: "temporary_caregiver_authorized",
      targetType: "temporary_caregiver_authorization",
      targetId: caregiverCreateResult.authorization_id,
      actorUserId: actors.requester.id
    },
    {
      action: "temporary_caregiver_accepted",
      targetType: "temporary_caregiver_authorization",
      targetId: caregiverCreateResult.authorization_id,
      actorUserId: actors.caregiver.id
    },
    {
      action: "temporary_caregiver_revoked",
      targetType: "temporary_caregiver_authorization",
      targetId: caregiverCreateResult.authorization_id,
      actorUserId: actors.requester.id
    }
  ];

  const auditTargetIds = [
    requestResult.request_id,
    offerResult.assignment_id,
    caregiverCreateResult.authorization_id
  ];
  const { data: audits, error: auditError } = await db
    .from("audit_events")
    .select("action,target_type,target_id,actor_user_id")
    .eq("organization_id", IDS.organization)
    .in("target_id", auditTargetIds);
  if (auditError) {
    throw new Error(`Audit service-role readback failed: ${auditError.message}`);
  }
  assertAudit(audits, expectedAudits);

  const caregiverMembershipsAfter = await exactCount(db, "team_memberships", {
    team_id: IDS.team,
    user_id: actors.caregiver.id
  });
  assert(
    caregiverMembershipsAfter === caregiverMembershipsBefore,
    "Caregiver acceptance unexpectedly changed team membership."
  );

  const notificationsAfter = await exactCount(db, "notifications", {
    organization_id: IDS.organization
  });
  assert(
    notificationsAfter === notificationsBefore,
    "Migration lifecycle unexpectedly created provider notification work."
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
          authIdentities: 3,
          anonKeySignInsVerified: 3
        },
        migration0028: {
          requestId: requestResult.request_id,
          offerId: offerResult.offer_id,
          assignmentId: offerResult.assignment_id,
          requestState: requestReadback.status,
          offerState: offerReadback.status,
          assignmentState: assignmentReadback.status,
          mutualAcceptanceVerified: true
        },
        migration0029: {
          authorizationId: caregiverCreateResult.authorization_id,
          exactEmailIdentityAnonSignInVerified: true,
          serviceRoleRpcEmailMismatchRejected: true,
          serviceRoleRpcExactEmailAcceptanceVerified: true,
          rpcInvocationAuthority: "service_role",
          selectedEventScheduleVersionVerified: true,
          inviteProofRotatedOnAcceptance: true,
          inviteProofRotatedOnRevocation: true,
          finalState: caregiverRevokeResult.state,
          teamMembershipCreated: false
        },
        audit: {
          attributedLifecycleEventsVerified: expectedAudits.length
        },
        providerBoundary: {
          providerSendsEnabled: false,
          notificationsBefore,
          notificationsAfter,
          notificationDelta: notificationsAfter - notificationsBefore,
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
