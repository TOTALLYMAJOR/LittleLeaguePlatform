import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  assertIsolatedQaTarget,
  assertServiceRoleCredential,
  preflightServiceRoleCredential
} from "./qa-target-guard.mjs";

const EXECUTE_CONFIRMATION = "run-ephemeral-rls-proof";
const ACTOR_NAMES = ["adminA", "coachA", "coachB", "parentA", "parentB", "parentOtherOrg"];

function fixtureId() {
  return randomUUID();
}

function secretPassword() {
  return `Qa-${randomBytes(24).toString("base64url")}-9z`;
}

export function buildActorActionPlan() {
  const runId = randomBytes(9).toString("hex");
  const ids = {
    organizations: [fixtureId(), fixtureId()],
    seasons: [fixtureId(), fixtureId()],
    teams: [fixtureId(), fixtureId()],
    players: [fixtureId(), fixtureId(), fixtureId()],
    events: [fixtureId(), fixtureId()],
    channels: [fixtureId(), fixtureId()],
    messages: [fixtureId(), fixtureId(), fixtureId()],
    handoffs: [fixtureId(), fixtureId()]
  };

  return Object.freeze({
    kind: "leaguepilot-rls-actor-action-proof",
    runId,
    ids,
    actors: ACTOR_NAMES.map((name) => ({
      name,
      email: `lp-rls-${runId}-${name.toLowerCase()}@example.invalid`,
      password: secretPassword()
    })),
    fixtureCounts: {
      organizations: 2,
      seasons: 2,
      teams: 2,
      families: 2,
      players: 3,
      events: 2,
      chatChannels: 2,
      providerRecords: 0
    },
    waves: [
      {
        name: "organization-and-team",
        checks: [
          ["adminA reads own organization", "allow"],
          ["coachA reads assigned team", "allow"],
          ["wrong-role parentA cannot update team", "deny"],
          ["cross-team coachA cannot read sibling team player", "deny"],
          ["cross-organization parentA cannot read other organization", "deny"],
          ["cross-organization adminA cannot update other organization season", "deny"]
        ]
      },
      {
        name: "roster-and-family",
        checks: [
          ["coachA reads assigned-team player", "allow"],
          ["coachA updates assigned-team player", "allow"],
          ["parentA reads linked family handoff", "allow"],
          ["cross-family parentB cannot read parentA family handoff", "deny"],
          ["cross-family parentA cannot create handoff for parentB player", "deny"],
          ["cross-team coachA cannot update sibling-team player", "deny"],
          ["cross-organization coachA cannot read other organization season", "deny"]
        ]
      },
      {
        name: "schedule",
        checks: [
          ["parentA reads assigned-team event", "allow"],
          ["coachA updates assigned-team event", "allow"],
          ["wrong-role parentA cannot update event", "deny"],
          ["cross-team coachA cannot update sibling-team event", "deny"],
          ["cross-organization adminA cannot update other organization season schedule", "deny"]
        ]
      },
      {
        name: "team-chat",
        checks: [
          ["parentA reads assigned-team message", "allow"],
          ["parentA creates assigned-team message", "allow"],
          ["cross-team parentA cannot read sibling-team message", "deny"],
          ["cross-team coachA cannot create sibling-team message", "deny"],
          ["cross-organization coachA cannot read other organization", "deny"]
        ]
      }
    ],
    cleanup: {
      strategy: "delete-exact-randomized-fixtures-only",
      order: [
        "family_event_handoffs",
        "team_chat_messages",
        "team_chat_channels",
        "events",
        "player_guardians",
        "players",
        "team_memberships",
        "organization_memberships",
        "teams",
        "seasons",
        "organizations",
        "auth.users"
      ],
      status: "planned"
    }
  });
}

export function redactActorActionPlan(plan) {
  return {
    kind: plan.kind,
    mode: "plan",
    fixtureCounts: plan.fixtureCounts,
    actorCount: plan.actors.length,
    waves: plan.waves.map((wave) => ({
      name: wave.name,
      checks: wave.checks.map(([name, expected]) => ({ name, expected }))
    })),
    cleanup: plan.cleanup
  };
}

function requiredEnv(name, env) {
  const value = env[name]?.trim();
  if (!value || value.includes("[YOUR-")) throw new Error(`${name} is required.`);
  return value;
}

function assertExecuteConfirmation(env) {
  if (env.RLS_PROOF_EXECUTE_CONFIRM !== EXECUTE_CONFIRMATION) {
    throw new Error(
      `Mutation requires RLS_PROOF_EXECUTE_CONFIRM=${EXECUTE_CONFIRMATION}.`
    );
  }
}

export async function guardActorActionExecution(
  env = process.env,
  { preflight = preflightServiceRoleCredential } = {}
) {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", env);
  const credential = requiredEnv("SUPABASE_SERVICE_ROLE_KEY", env);
  assertExecuteConfirmation(env);
  // Both synchronous guards intentionally run before the network preflight and
  // before @supabase/supabase-js is imported or any client can be created.
  const guardNames = [
    "SUPABASE_QA_TARGET_REF",
    "SUPABASE_QA_PARENT_PROJECT_REF",
    "SUPABASE_QA_TARGET_CONFIRM"
  ];
  const previous = Object.fromEntries(
    guardNames.map((name) => [name, process.env[name]])
  );
  try {
    for (const name of guardNames) {
      if (env[name] === undefined) delete process.env[name];
      else process.env[name] = env[name];
    }
    const target = assertIsolatedQaTarget(url, "Actor/action RLS proof");
    assertServiceRoleCredential(credential);
    await preflight(url, credential);
    return { url, credential, target };
  } finally {
    for (const name of guardNames) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

function assertNoError(result, label) {
  if (result.error) throw new Error(`${label} failed.`);
}

function assertAllowed(result, label) {
  assertNoError(result, label);
  if (!Array.isArray(result.data) || result.data.length !== 1) {
    throw new Error(`${label}: expected one visible row.`);
  }
}

function assertDenied(result, label) {
  if (result.error) return;
  if (!Array.isArray(result.data) || result.data.length !== 0) {
    throw new Error(`${label}: expected denial or zero visible rows.`);
  }
}

async function insertRows(client, table, rows) {
  const result = await client.from(table).insert(rows);
  assertNoError(result, `fixture insert ${table}`);
}

async function createFixture(client, plan, users) {
  const [orgA, orgB] = plan.ids.organizations;
  const [seasonA, seasonB] = plan.ids.seasons;
  const [teamA, teamB] = plan.ids.teams;
  const [playerA, playerSameTeam, playerOtherTeam] = plan.ids.players;
  const [eventA, eventB] = plan.ids.events;
  const [channelA, channelB] = plan.ids.channels;
  for (const actor of plan.actors) {
    const result = await client.auth.admin.createUser({
      email: actor.email,
      password: actor.password,
      email_confirm: true,
      user_metadata: {
        display_name: `Ephemeral ${actor.name}`,
        default_role: actor.name.startsWith("parent")
          ? "parent"
          : actor.name.startsWith("coach")
            ? "coach"
            : "admin"
      }
    });
    if (result.error || !result.data.user) throw new Error(`Could not create ${actor.name}.`);
    users[actor.name] = result.data.user.id;
  }

  const now = Date.now();
  await insertRows(client, "organizations", [
    { id: orgA, name: `Ephemeral QA ${plan.runId} A` },
    { id: orgB, name: `Ephemeral QA ${plan.runId} B` }
  ]);
  await insertRows(client, "seasons", [
    {
      id: seasonA,
      organization_id: orgA,
      name: "Ephemeral QA",
      status: "active",
      starts_at: new Date(now - 86_400_000).toISOString(),
      ends_at: new Date(now + 86_400_000 * 30).toISOString()
    },
    {
      id: seasonB,
      organization_id: orgB,
      name: "Ephemeral QA",
      status: "active",
      starts_at: new Date(now - 86_400_000).toISOString(),
      ends_at: new Date(now + 86_400_000 * 30).toISOString()
    }
  ]);
  await insertRows(client, "teams", [
    { id: teamA, organization_id: orgA, season_id: seasonA, division: "QA", name: "QA A", coach_user_id: users.coachA },
    { id: teamB, organization_id: orgA, season_id: seasonA, division: "QA", name: "QA B", coach_user_id: users.coachB }
  ]);
  await insertRows(client, "organization_memberships", [
    { organization_id: orgA, user_id: users.adminA, role: "admin", status: "active" },
    { organization_id: orgA, user_id: users.coachA, role: "coach", status: "active" },
    { organization_id: orgA, user_id: users.coachB, role: "coach", status: "active" },
    { organization_id: orgB, user_id: users.parentOtherOrg, role: "coach", status: "active" }
  ]);
  await insertRows(client, "team_memberships", [
    { team_id: teamA, user_id: users.coachA, role: "coach", status: "active" },
    { team_id: teamB, user_id: users.coachB, role: "coach", status: "active" },
    { team_id: teamA, user_id: users.parentA, role: "parent", status: "active" },
    { team_id: teamA, user_id: users.parentB, role: "parent", status: "active" }
  ]);
  await insertRows(client, "players", [
    { id: playerA, organization_id: orgA, season_id: seasonA, team_id: teamA, first_name: "Proof", last_initial: "A" },
    { id: playerSameTeam, organization_id: orgA, season_id: seasonA, team_id: teamA, first_name: "Proof", last_initial: "B" },
    { id: playerOtherTeam, organization_id: orgA, season_id: seasonA, team_id: teamB, first_name: "Proof", last_initial: "C" }
  ]);
  await insertRows(client, "player_guardians", [
    { player_id: playerA, parent_user_id: users.parentA, relationship: "guardian", status: "active" },
    { player_id: playerSameTeam, parent_user_id: users.parentB, relationship: "guardian", status: "active" }
  ]);
  const eventRows = [
    [eventA, orgA, seasonA, teamA],
    [eventB, orgA, seasonA, teamB]
  ].map(([id, organization_id, season_id, team_id], index) => ({
    id,
    organization_id,
    season_id,
    team_id,
    title: `Ephemeral QA ${index + 1}`,
    event_type: "practice",
    starts_at: new Date(now + 3_600_000).toISOString(),
    ends_at: new Date(now + 7_200_000).toISOString(),
    status: "scheduled"
  }));
  await insertRows(client, "events", eventRows);
  await insertRows(client, "team_chat_channels", [
    { id: channelA, organization_id: orgA, season_id: seasonA, team_id: teamA },
    { id: channelB, organization_id: orgA, season_id: seasonA, team_id: teamB }
  ]);
  await insertRows(client, "team_chat_messages", [
    {
      id: plan.ids.messages[0], organization_id: orgA, season_id: seasonA, team_id: teamA,
      channel_id: channelA, author_user_id: users.coachA, author_role: "coach",
      message_kind: "message", body: "Ephemeral proof row"
    },
    {
      id: plan.ids.messages[1], organization_id: orgA, season_id: seasonA, team_id: teamB,
      channel_id: channelB, author_user_id: users.coachB, author_role: "coach",
      message_kind: "message", body: "Ephemeral proof row"
    }
  ]);
  await insertRows(client, "family_event_handoffs", [
    {
      id: plan.ids.handoffs[0], organization_id: orgA, team_id: teamA, event_id: eventA,
      player_id: playerA, requested_by_user_id: users.parentA, caregiver_label: "Ephemeral guardian"
    },
    {
      id: plan.ids.handoffs[1], organization_id: orgA, team_id: teamA, event_id: eventA,
      player_id: playerSameTeam, requested_by_user_id: users.parentB, caregiver_label: "Ephemeral guardian"
    }
  ]);
  return users;
}

async function actorClient(createClient, url, anonKey, actor) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const result = await client.auth.signInWithPassword({
    email: actor.email,
    password: actor.password
  });
  if (result.error || !result.data.user) throw new Error(`Could not sign in ${actor.name}.`);
  return client;
}

async function runMatrix(clients, plan, users) {
  const { adminA, coachA, parentA, parentB } = clients;
  const [orgA, orgB] = plan.ids.organizations;
  const [teamA, teamB] = plan.ids.teams;
  const [playerA, playerSameTeam, playerOtherTeam] = plan.ids.players;
  const [eventA, eventB] = plan.ids.events;

  assertAllowed(await adminA.from("organizations").select("id").eq("id", orgA), "admin own organization read");
  assertAllowed(await coachA.from("teams").select("id").eq("id", teamA), "coach assigned team read");
  assertDenied(await parentA.from("teams").update({ mascot: "Denied" }).eq("id", teamA).select("id"), "wrong-role team write");
  assertDenied(await coachA.from("players").select("id").eq("id", playerOtherTeam), "cross-team player read");
  assertDenied(await parentA.from("organizations").select("id").eq("id", orgB), "cross-organization read");
  assertDenied(await adminA.from("seasons").update({ name: "Denied" }).eq("id", plan.ids.seasons[1]).select("id"), "cross-organization season write");

  assertAllowed(await coachA.from("players").select("id").eq("id", playerA), "coach player read");
  assertAllowed(await coachA.from("players").update({ jersey: "QA" }).eq("id", playerA).select("id"), "coach player write");
  assertAllowed(await parentA.from("family_event_handoffs").select("id").eq("id", plan.ids.handoffs[0]), "own-family handoff read");
  assertDenied(await parentB.from("family_event_handoffs").select("id").eq("id", plan.ids.handoffs[0]), "cross-family handoff read");
  assertDenied(await parentA.from("family_event_handoffs").insert({
    organization_id: orgA, team_id: teamA, event_id: eventA, player_id: playerSameTeam,
    requested_by_user_id: users.parentA, caregiver_label: "Denied guardian"
  }).select("id"), "cross-family handoff write");
  assertDenied(await coachA.from("players").update({ jersey: "Denied" }).eq("id", playerOtherTeam).select("id"), "cross-team player write");
  assertDenied(await coachA.from("seasons").select("id").eq("id", plan.ids.seasons[1]), "cross-organization season read");

  assertAllowed(await parentA.from("events").select("id").eq("id", eventA), "parent event read");
  assertAllowed(await coachA.from("events").update({ location_name: "Ephemeral QA" }).eq("id", eventA).select("id"), "coach event write");
  assertDenied(await parentA.from("events").update({ location_name: "Denied" }).eq("id", eventA).select("id"), "wrong-role event write");
  assertDenied(await coachA.from("events").update({ location_name: "Denied" }).eq("id", eventB).select("id"), "cross-team event write");
  assertDenied(await adminA.from("seasons").update({ name: "Denied schedule" }).eq("id", plan.ids.seasons[1]).select("id"), "cross-organization schedule write");

  assertAllowed(await parentA.from("team_chat_messages").select("id").eq("id", plan.ids.messages[0]), "parent chat read");
  assertAllowed(await parentA.from("team_chat_messages").insert({
    id: plan.ids.messages[2],
    organization_id: orgA, season_id: plan.ids.seasons[0], team_id: teamA,
    channel_id: plan.ids.channels[0], author_user_id: users.parentA, author_role: "parent",
    message_kind: "message", body: "Ephemeral actor/action proof"
  }).select("id"), "parent chat write");
  assertDenied(await parentA.from("team_chat_messages").select("id").eq("id", plan.ids.messages[1]), "cross-team chat read");
  assertDenied(await coachA.from("team_chat_messages").insert({
    organization_id: orgA, season_id: plan.ids.seasons[0], team_id: teamB,
    channel_id: plan.ids.channels[1], author_user_id: users.coachA,
    author_role: "coach", message_kind: "message", body: "Denied proof row"
  }).select("id"), "cross-team chat write");
  assertDenied(await coachA.from("organizations").select("id").eq("id", orgB), "cross-organization chat-scope read");
}

async function cleanupFixture(client, plan, users) {
  const cleanup = { status: "running", deletedFixtureTables: [], deletedAuthUsers: 0 };
  try {
    for (const table of plan.cleanup.order.filter((name) => name !== "auth.users")) {
      const ids =
        table === "organizations" ? plan.ids.organizations
          : table === "seasons" ? plan.ids.seasons
            : table === "teams" ? plan.ids.teams
              : table === "players" ? plan.ids.players
                : table === "events" ? plan.ids.events
                  : table === "team_chat_channels" ? plan.ids.channels
                    : table === "team_chat_messages" ? plan.ids.messages
                      : table === "family_event_handoffs" ? plan.ids.handoffs
                        : null;
      const query = client.from(table).delete();
      const userColumn = table === "player_guardians" ? "parent_user_id" : "user_id";
      const result = ids
        ? await query.in("id", ids)
        : await query.in(userColumn, Object.values(users));
      assertNoError(result, `cleanup ${table}`);
      cleanup.deletedFixtureTables.push(table);
    }
    for (const userId of Object.values(users)) {
      const result = await client.auth.admin.deleteUser(userId);
      if (result.error) throw new Error("cleanup auth user failed.");
      cleanup.deletedAuthUsers += 1;
    }
    cleanup.status = "complete";
  } catch (error) {
    cleanup.status = "incomplete";
    cleanup.error = error instanceof Error ? error.message : "cleanup failed";
  }
  return cleanup;
}

export async function executeActorActionHarness({
  env = process.env,
  plan = buildActorActionPlan(),
  logger = console.log
} = {}) {
  logger(JSON.stringify(redactActorActionPlan(plan), null, 2));
  const guarded = await guardActorActionExecution(env);
  const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", env);
  const { createClient } = await import("@supabase/supabase-js");
  const service = createClient(guarded.url, guarded.credential, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  let users = {};
  let cleanup = { status: "not-started" };
  let proofResult;
  try {
    await createFixture(service, plan, users);
    const clients = {};
    for (const actor of plan.actors) {
      clients[actor.name] = await actorClient(createClient, guarded.url, anonKey, actor);
    }
    await runMatrix(clients, plan, users);
    proofResult = {
      status: "passed",
      waveCount: plan.waves.length,
      checkCount: plan.waves.flatMap((wave) => wave.checks).length
    };
  } finally {
    cleanup = await cleanupFixture(service, plan, users);
    logger(JSON.stringify({ cleanup }, null, 2));
    if (cleanup.status !== "complete") throw new Error("Ephemeral fixture cleanup was incomplete.");
  }
  return { ...proofResult, cleanup };
}

export async function main(argv = process.argv.slice(2)) {
  const plan = buildActorActionPlan();
  if (!argv.includes("--execute")) {
    console.log(JSON.stringify(redactActorActionPlan(plan), null, 2));
    return;
  }
  const result = await executeActorActionHarness({ plan });
  console.log(JSON.stringify(result));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Actor/action proof failed.");
    process.exitCode = 1;
  });
}
