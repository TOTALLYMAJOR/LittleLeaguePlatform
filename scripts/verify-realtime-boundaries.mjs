import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  assertIsolatedQaTarget,
  assertServiceRoleCredential,
  preflightServiceRoleCredential
} from "./qa-target-guard.mjs";

const EXECUTE_CONFIRMATION = "run-ephemeral-realtime-proof";

export function buildRealtimePlan() {
  const runId = randomBytes(9).toString("hex");
  return Object.freeze({
    kind: "leaguepilot-realtime-authorization-proof",
    runId,
    ids: {
      organizations: [randomUUID(), randomUUID()],
      seasons: [randomUUID(), randomUUID()],
      teams: [randomUUID(), randomUUID()],
      channels: [randomUUID(), randomUUID()],
      messages: [randomUUID(), randomUUID(), randomUUID()]
    },
    actors: ["parentA", "coachA", "parentWrongTeam", "coachOtherOrg"].map((name) => ({
      name,
      email: `lp-realtime-${runId}-${name.toLowerCase()}@example.invalid`,
      password: `Qa-${randomBytes(24).toString("base64url")}-8y`
    })),
    fixtureCounts: {
      organizations: 2,
      seasons: 2,
      teams: 2,
      families: 2,
      realtimeActors: 4,
      providerRecords: 0
    },
    checks: [
      ["authorized parent subscription reaches SUBSCRIBED", "allow"],
      ["authorized coach subscription reaches SUBSCRIBED", "allow"],
      ["target-team INSERT reaches authorized parent and coach", "deliver"],
      ["wrong-team actor receives no target-team event", "absent"],
      ["team filter excludes sibling-team INSERT", "absent"],
      ["target-team UPDATE reaches authorized parent and coach", "deliver"],
      ["disconnect stops delivery", "absent"],
      ["reconnect resumes delivery", "deliver"],
      ["duplicate event version is ignored", "deduplicate"],
      ["new change version is applied", "apply"]
    ],
    cleanup: {
      strategy: "delete-exact-randomized-fixtures-only",
      order: [
        "team_chat_messages",
        "team_chat_channels",
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

export function redactRealtimePlan(plan) {
  return {
    kind: plan.kind,
    mode: "plan",
    fixtureCounts: plan.fixtureCounts,
    checks: plan.checks.map(([name, expected]) => ({ name, expected })),
    cleanup: plan.cleanup
  };
}

function requiredEnv(name, env) {
  const value = env[name]?.trim();
  if (!value || value.includes("[YOUR-")) throw new Error(`${name} is required.`);
  return value;
}

export async function guardRealtimeExecution(
  env = process.env,
  { preflight = preflightServiceRoleCredential } = {}
) {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", env);
  const credential = requiredEnv("SUPABASE_SERVICE_ROLE_KEY", env);
  if (env.REALTIME_PROOF_EXECUTE_CONFIRM !== EXECUTE_CONFIRMATION) {
    throw new Error(
      `Mutation requires REALTIME_PROOF_EXECUTE_CONFIRM=${EXECUTE_CONFIRMATION}.`
    );
  }
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
    const target = assertIsolatedQaTarget(url, "Realtime authorization proof");
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

export function createVersionedChangeCollector() {
  const seen = new Set();
  const accepted = [];
  return {
    accept(change) {
      const key = `${change.table}:${change.id}:${change.event}:${change.version}`;
      if (seen.has(key)) return { accepted: false, reason: "duplicate" };
      seen.add(key);
      accepted.push({ id: change.id, event: change.event, version: change.version });
      return { accepted: true, reason: "new-version" };
    },
    count() {
      return accepted.length;
    },
    snapshot() {
      return accepted.map((item) => ({ ...item }));
    }
  };
}

function normalizedChange(payload) {
  const row = payload.new ?? {};
  return {
    table: "team_chat_messages",
    id: row.id,
    event: payload.eventType,
    version: row.edited_at ?? row.created_at
  };
}

function waitFor(condition, label, timeoutMs = 8_000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (condition()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        reject(new Error(`${label} timed out.`));
      }
    }, 25);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function subscribe(client, name, teamId, collector, statuses) {
  const channel = client
    .channel(name)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "team_chat_messages",
        filter: `team_id=eq.${teamId}`
      },
      (payload) => collector.accept(normalizedChange(payload))
    )
    .subscribe((status) => statuses.push(status));
  await waitFor(() => statuses.includes("SUBSCRIBED"), `${name} subscription`);
  return channel;
}

async function createRealtimeFixture(service, plan, users) {
  for (const actor of plan.actors) {
    const result = await service.auth.admin.createUser({
      email: actor.email,
      password: actor.password,
      email_confirm: true,
      user_metadata: {
        display_name: `Ephemeral ${actor.name}`,
        default_role: actor.name.startsWith("parent") ? "parent" : "coach"
      }
    });
    if (result.error || !result.data.user) throw new Error(`Could not create ${actor.name}.`);
    users[actor.name] = result.data.user.id;
  }
  const [orgA, orgB] = plan.ids.organizations;
  const [seasonA, seasonB] = plan.ids.seasons;
  const [teamA, teamB] = plan.ids.teams;
  const now = Date.now();
  const inserts = [
    ["organizations", [
      { id: orgA, name: `Ephemeral Realtime ${plan.runId} A` },
      { id: orgB, name: `Ephemeral Realtime ${plan.runId} B` }
    ]],
    ["seasons", [
      { id: seasonA, organization_id: orgA, name: "Ephemeral", status: "active", starts_at: new Date(now - 86_400_000).toISOString(), ends_at: new Date(now + 2_592_000_000).toISOString() },
      { id: seasonB, organization_id: orgB, name: "Ephemeral", status: "active", starts_at: new Date(now - 86_400_000).toISOString(), ends_at: new Date(now + 2_592_000_000).toISOString() }
    ]],
    ["teams", [
      { id: teamA, organization_id: orgA, season_id: seasonA, division: "QA", name: "Realtime A", coach_user_id: users.coachA },
      { id: teamB, organization_id: orgA, season_id: seasonA, division: "QA", name: "Realtime B" }
    ]],
    ["organization_memberships", [
      { organization_id: orgA, user_id: users.coachA, role: "coach", status: "active" },
      { organization_id: orgB, user_id: users.coachOtherOrg, role: "coach", status: "active" }
    ]],
    ["team_memberships", [
      { team_id: teamA, user_id: users.coachA, role: "coach", status: "active" },
      { team_id: teamA, user_id: users.parentA, role: "parent", status: "active" },
      { team_id: teamB, user_id: users.parentWrongTeam, role: "parent", status: "active" }
    ]],
    ["team_chat_channels", [
      { id: plan.ids.channels[0], organization_id: orgA, season_id: seasonA, team_id: teamA },
      { id: plan.ids.channels[1], organization_id: orgA, season_id: seasonA, team_id: teamB }
    ]]
  ];
  for (const [table, rows] of inserts) {
    const result = await service.from(table).insert(rows);
    if (result.error) throw new Error(`Fixture insert ${table} failed.`);
  }
  return users;
}

async function signInClient(createClient, url, anonKey, actor) {
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

async function cleanupRealtime(service, plan, users) {
  const status = { status: "running", deletedFixtureTables: [], deletedAuthUsers: 0 };
  try {
    for (const table of plan.cleanup.order.filter((name) => name !== "auth.users")) {
      const ids =
        table === "organizations" ? plan.ids.organizations
          : table === "seasons" ? plan.ids.seasons
            : table === "teams" ? plan.ids.teams
              : table === "team_chat_channels" ? plan.ids.channels
                : table === "team_chat_messages" ? plan.ids.messages
                  : null;
      const query = service.from(table).delete();
      const result = ids
        ? await query.in("id", ids)
        : await query.in("user_id", Object.values(users));
      if (result.error) throw new Error(`Cleanup ${table} failed.`);
      status.deletedFixtureTables.push(table);
    }
    for (const id of Object.values(users)) {
      const result = await service.auth.admin.deleteUser(id);
      if (result.error) throw new Error("Cleanup auth user failed.");
      status.deletedAuthUsers += 1;
    }
    status.status = "complete";
  } catch (error) {
    status.status = "incomplete";
    status.error = error instanceof Error ? error.message : "cleanup failed";
  }
  return status;
}

export async function executeRealtimeHarness({
  env = process.env,
  plan = buildRealtimePlan(),
  logger = console.log
} = {}) {
  logger(JSON.stringify(redactRealtimePlan(plan), null, 2));
  const guarded = await guardRealtimeExecution(env);
  const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", env);
  const { createClient } = await import("@supabase/supabase-js");
  const service = createClient(guarded.url, guarded.credential, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const clients = [];
  const channels = [];
  let users = {};
  let cleanup = { status: "not-started" };
  let proofResult;
  try {
    await createRealtimeFixture(service, plan, users);
    const actors = Object.fromEntries(plan.actors.map((actor) => [actor.name, actor]));
    const parent = await signInClient(createClient, guarded.url, anonKey, actors.parentA);
    const coach = await signInClient(createClient, guarded.url, anonKey, actors.coachA);
    const wrongTeam = await signInClient(createClient, guarded.url, anonKey, actors.parentWrongTeam);
    clients.push(parent, coach, wrongTeam);

    const collectors = {
      parent: createVersionedChangeCollector(),
      coach: createVersionedChangeCollector(),
      wrongTeam: createVersionedChangeCollector()
    };
    const statuses = { parent: [], coach: [], wrongTeam: [] };
    channels.push(
      await subscribe(parent, `qa-parent-${plan.runId}`, plan.ids.teams[0], collectors.parent, statuses.parent),
      await subscribe(coach, `qa-coach-${plan.runId}`, plan.ids.teams[0], collectors.coach, statuses.coach),
      await subscribe(wrongTeam, `qa-wrong-${plan.runId}`, plan.ids.teams[0], collectors.wrongTeam, statuses.wrongTeam)
    );

    const insertTime = new Date().toISOString();
    let result = await service.from("team_chat_messages").insert({
      id: plan.ids.messages[0], organization_id: plan.ids.organizations[0],
      season_id: plan.ids.seasons[0], team_id: plan.ids.teams[0],
      channel_id: plan.ids.channels[0], author_user_id: users.coachA,
      author_role: "coach", message_kind: "message", body: "Ephemeral Realtime proof",
      created_at: insertTime
    });
    if (result.error) throw new Error("Target-team Realtime insert failed.");
    await waitFor(() => collectors.parent.count() === 1 && collectors.coach.count() === 1, "target-team INSERT delivery");
    await delay(300);
    if (collectors.wrongTeam.count() !== 0) throw new Error("Wrong-team actor received target-team event.");

    result = await service.from("team_chat_messages").insert({
      id: plan.ids.messages[1], organization_id: plan.ids.organizations[0],
      season_id: plan.ids.seasons[0], team_id: plan.ids.teams[1],
      channel_id: plan.ids.channels[1], author_user_id: users.parentWrongTeam,
      author_role: "parent", message_kind: "message", body: "Ephemeral sibling-team proof"
    });
    if (result.error) throw new Error("Sibling-team Realtime insert failed.");
    await delay(300);
    if (collectors.parent.count() !== 1 || collectors.coach.count() !== 1) {
      throw new Error("Team filter leaked sibling-team event.");
    }

    const version2 = new Date(Date.now() + 1_000).toISOString();
    result = await service.from("team_chat_messages")
      .update({ body: "Ephemeral Realtime update", edited_at: version2 })
      .eq("id", plan.ids.messages[0]);
    if (result.error) throw new Error("Target-team Realtime update failed.");
    await waitFor(() => collectors.parent.count() === 2 && collectors.coach.count() === 2, "target-team UPDATE delivery");

    const duplicate = {
      table: "team_chat_messages", id: plan.ids.messages[0], event: "UPDATE", version: version2
    };
    if (collectors.parent.accept(duplicate).accepted) throw new Error("Duplicate version was not ignored.");

    await parent.removeChannel(channels[0]);
    const beforeDisconnect = collectors.parent.count();
    const version3 = new Date(Date.now() + 2_000).toISOString();
    result = await service.from("team_chat_messages")
      .update({ body: "Ephemeral disconnected update", edited_at: version3 })
      .eq("id", plan.ids.messages[0]);
    if (result.error) throw new Error("Disconnected update failed.");
    await waitFor(() => collectors.coach.count() === 3, "coach delivery during parent disconnect");
    await delay(300);
    if (collectors.parent.count() !== beforeDisconnect) throw new Error("Disconnected client received an event.");

    const reconnectStatuses = [];
    const reconnected = await subscribe(
      parent, `qa-parent-reconnect-${plan.runId}`, plan.ids.teams[0],
      collectors.parent, reconnectStatuses
    );
    channels[0] = reconnected;
    const version4 = new Date(Date.now() + 3_000).toISOString();
    result = await service.from("team_chat_messages")
      .update({ body: "Ephemeral reconnected update", edited_at: version4 })
      .eq("id", plan.ids.messages[0]);
    if (result.error) throw new Error("Reconnect update failed.");
    await waitFor(() => collectors.parent.count() === beforeDisconnect + 1, "delivery after reconnect");
    if (!collectors.parent.snapshot().some((event) => event.version === version4)) {
      throw new Error("New change version was not applied.");
    }
    proofResult = { status: "passed", checkCount: plan.checks.length };
  } finally {
    await Promise.allSettled(
      clients.flatMap((client) => channels.map((channel) => client.removeChannel(channel)))
    );
    cleanup = await cleanupRealtime(service, plan, users);
    logger(JSON.stringify({ cleanup }, null, 2));
    if (cleanup.status !== "complete") throw new Error("Ephemeral fixture cleanup was incomplete.");
  }
  return { ...proofResult, cleanup };
}

export async function main(argv = process.argv.slice(2)) {
  const plan = buildRealtimePlan();
  if (!argv.includes("--execute")) {
    console.log(JSON.stringify(redactRealtimePlan(plan), null, 2));
    return;
  }
  const result = await executeRealtimeHarness({ plan });
  console.log(JSON.stringify(result));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Realtime proof failed.");
    process.exitCode = 1;
  });
}
