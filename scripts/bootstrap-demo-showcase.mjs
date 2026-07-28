import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const repoRoot = resolve(import.meta.dirname, "..");
const envPath = resolve(repoRoot, ".env.local");
const confirmationValue = "load-fictional-data";

const ids = {
  teams: {
    stars: "d4000000-0000-4000-8000-000000000003",
    foxes: "d4000000-0000-4000-8000-000000000004",
  },
  memberships: {
    starsCoach: "d5000000-0000-4000-8000-000000000005",
    foxesCoach: "d5000000-0000-4000-8000-000000000006",
    starsParent: "d5000000-0000-4000-8000-000000000007",
    foxesParent: "d5000000-0000-4000-8000-000000000008",
  },
  players: {
    maya: "d6000000-0000-4000-8000-000000000006",
    eli: "d6000000-0000-4000-8000-000000000007",
    zoe: "d6000000-0000-4000-8000-000000000008",
    owen: "d6000000-0000-4000-8000-000000000009",
  },
  guardians: {
    maya: "d7000000-0000-4000-8000-000000000005",
    eli: "d7000000-0000-4000-8000-000000000006",
    zoe: "d7000000-0000-4000-8000-000000000007",
    owen: "d7000000-0000-4000-8000-000000000008",
  },
  events: {
    starsRockets: "db000000-0000-4000-8000-000000000004",
    foxesWaves: "db000000-0000-4000-8000-000000000005",
    starsFoxes: "db000000-0000-4000-8000-000000000006",
    foxesRockets: "db000000-0000-4000-8000-000000000007",
  },
  channels: {
    stars: "e3000000-0000-4000-8000-000000000003",
    foxes: "e3000000-0000-4000-8000-000000000004",
  },
  messages: {
    starsCoach: "e4000000-0000-4000-8000-000000000005",
    starsParent: "e4000000-0000-4000-8000-000000000006",
    foxesCoach: "e4000000-0000-4000-8000-000000000007",
    foxesParent: "e4000000-0000-4000-8000-000000000008",
  },
  media: {
    starsOpening: "fe000000-0000-4000-8000-000000000003",
    foxesWarmup: "fe000000-0000-4000-8000-000000000004",
    starsTeam: "fe000000-0000-4000-8000-000000000005",
    foxesGame: "fe000000-0000-4000-8000-000000000006",
  },
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(`Missing required environment value: ${keys.join(" or ")}`);
}

function demoPassword(key) {
  return process.env[key] ?? `LP-${randomBytes(18).toString("base64url")}!7a`;
}

function appendEnvDefaults(entries) {
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const existingKeys = new Set(
    current
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
      .filter(Boolean),
  );
  const additions = Object.entries(entries).filter(([key]) => !existingKeys.has(key));
  if (additions.length === 0) return;
  const prefix = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
  appendFileSync(
    envPath,
    `${prefix}\n# Fictional LeaguePilot showcase accounts\n${additions
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
    "utf8",
  );
}

function cleanClone(source, id) {
  const row = { ...source, id };
  for (const column of ["created_at", "updated_at", "inserted_at", "deleted_at"]) {
    delete row[column];
  }
  return row;
}

function setColumns(row, template, columns, value) {
  let changed = false;
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(template, column)) {
      row[column] = value;
      changed = true;
    }
  }
  return changed;
}

function setRequiredColumn(row, template, columns, value, label) {
  if (!setColumns(row, template, columns, value)) {
    throw new Error(`Could not map ${label}; expected one of ${columns.join(", ")}`);
  }
}

async function selectRows(supabase, table, configure = (query) => query) {
  const { data, error } = await configure(supabase.from(table).select("*"));
  if (error) throw new Error(`${table} read failed: ${error.message}`);
  return data ?? [];
}

async function upsertRows(supabase, table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
}

async function upsertAuthUser(supabase, spec, knownUsers) {
  const existing = knownUsers.find(
    (user) => user.email?.toLowerCase() === spec.email.toLowerCase(),
  );
  const attributes = {
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: {
      first_name: spec.firstName,
      last_name: spec.lastName,
      demo_account: true,
    },
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existing.id,
      attributes,
    );
    if (error) throw new Error(`Could not update ${spec.label}: ${error.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser(attributes);
  if (error) throw new Error(`Could not create ${spec.label}: ${error.message}`);
  knownUsers.push(data.user);
  return data.user;
}

async function countWhere(supabase, table, column, values) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  query = Array.isArray(values) ? query.in(column, values) : query.eq(column, values);
  const { count, error } = await query;
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

function futureIso(days, hour = 18) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function main() {
  loadEnvFile(envPath);
  if (process.env.DEMO_TENANT_SEED_CONFIRM !== confirmationValue) {
    throw new Error(
      `Refusing to load demo data. Set DEMO_TENANT_SEED_CONFIRM=${confirmationValue}.`,
    );
  }

  const baseSeed = spawnSync(process.execPath, ["scripts/bootstrap-demo-tenant.mjs"], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (baseSeed.status !== 0) {
    throw new Error("The base fictional demo tenant seed failed; showcase expansion stopped.");
  }

  loadEnvFile(envPath);
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const accountSpecs = {
    starsCoach: {
      label: "Stars coach",
      email: process.env.DEMO_STARS_COACH_EMAIL ?? "demo.stars.coach@example.com",
      password: demoPassword("DEMO_STARS_COACH_PASSWORD"),
      firstName: "Jordan",
      lastName: "Lee",
      role: "coach",
    },
    foxesCoach: {
      label: "Foxes coach",
      email: process.env.DEMO_FOXES_COACH_EMAIL ?? "demo.foxes.coach@example.com",
      password: demoPassword("DEMO_FOXES_COACH_PASSWORD"),
      firstName: "Cameron",
      lastName: "Brooks",
      role: "coach",
    },
    parentThree: {
      label: "Stars parent",
      email: process.env.DEMO_PARENT_THREE_EMAIL ?? "demo.parent.three@example.com",
      password: demoPassword("DEMO_PARENT_THREE_PASSWORD"),
      firstName: "Taylor",
      lastName: "Morgan",
      role: "parent",
    },
    parentFour: {
      label: "Foxes parent",
      email: process.env.DEMO_PARENT_FOUR_EMAIL ?? "demo.parent.four@example.com",
      password: demoPassword("DEMO_PARENT_FOUR_PASSWORD"),
      firstName: "Riley",
      lastName: "Parker",
      role: "parent",
    },
    visitor: {
      label: "unaffiliated visitor",
      email: process.env.DEMO_VISITOR_EMAIL ?? "demo.visitor@example.com",
      password: demoPassword("DEMO_VISITOR_PASSWORD"),
      firstName: "Casey",
      lastName: "Visitor",
      role: "parent",
    },
  };

  appendEnvDefaults({
    DEMO_STARS_COACH_EMAIL: accountSpecs.starsCoach.email,
    DEMO_STARS_COACH_PASSWORD: accountSpecs.starsCoach.password,
    DEMO_FOXES_COACH_EMAIL: accountSpecs.foxesCoach.email,
    DEMO_FOXES_COACH_PASSWORD: accountSpecs.foxesCoach.password,
    DEMO_PARENT_THREE_EMAIL: accountSpecs.parentThree.email,
    DEMO_PARENT_THREE_PASSWORD: accountSpecs.parentThree.password,
    DEMO_PARENT_FOUR_EMAIL: accountSpecs.parentFour.email,
    DEMO_PARENT_FOUR_PASSWORD: accountSpecs.parentFour.password,
    DEMO_VISITOR_EMAIL: accountSpecs.visitor.email,
    DEMO_VISITOR_PASSWORD: accountSpecs.visitor.password,
  });

  const { data: authPage, error: authListError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authListError) throw new Error(`Auth user read failed: ${authListError.message}`);
  const knownUsers = authPage.users;
  const users = {};
  for (const [key, spec] of Object.entries(accountSpecs)) {
    users[key] = await upsertAuthUser(supabase, spec, knownUsers);
  }

  const organizations = await selectRows(supabase, "organizations", (query) =>
    query.eq("name", "LeaguePilot Demo League").limit(1),
  );
  const organization = organizations[0];
  if (!organization) throw new Error("Base demo organization was not found.");

  const seasons = await selectRows(supabase, "seasons", (query) =>
    query.eq("organization_id", organization.id).limit(1),
  );
  if (!seasons[0]) throw new Error("Base demo season was not found.");

  const sourceTeams = await selectRows(supabase, "teams", (query) =>
    query.eq("organization_id", organization.id).order("created_at", { ascending: true }),
  );
  if (sourceTeams.length < 2) throw new Error("Two base demo teams are required.");
  const sourceTeamIds = sourceTeams.slice(0, 2).map((team) => team.id);

  const sourceMemberships = await selectRows(supabase, "team_memberships", (query) =>
    query.in("team_id", sourceTeamIds).eq("status", "active"),
  );
  const coachMembershipTemplate = sourceMemberships.find((row) => row.role === "coach");
  const parentMembershipTemplate = sourceMemberships.find((row) => row.role === "parent");
  if (!coachMembershipTemplate || !parentMembershipTemplate) {
    throw new Error("Active coach and parent membership templates are required.");
  }

  const sourceProfiles = await selectRows(supabase, "profiles", (query) =>
    query.in("id", [coachMembershipTemplate.user_id, parentMembershipTemplate.user_id]),
  );
  const coachProfileTemplate = sourceProfiles.find(
    (row) => row.id === coachMembershipTemplate.user_id,
  );
  const parentProfileTemplate = sourceProfiles.find(
    (row) => row.id === parentMembershipTemplate.user_id,
  );
  if (!coachProfileTemplate || !parentProfileTemplate) {
    throw new Error("Base coach and parent profiles are required.");
  }

  const profileRows = Object.entries(accountSpecs)
    .filter(([key]) => key !== "visitor")
    .map(([key, spec]) => {
      const template = spec.role === "coach" ? coachProfileTemplate : parentProfileTemplate;
      const row = cleanClone(template, users[key].id);
      setColumns(row, template, ["email"], spec.email);
      setColumns(row, template, ["first_name", "given_name"], spec.firstName);
      setColumns(row, template, ["last_name", "family_name"], spec.lastName);
      setColumns(row, template, ["full_name", "display_name"], `${spec.firstName} ${spec.lastName}`);
      setColumns(row, template, ["default_role", "role"], spec.role);
      return row;
    });
  await upsertRows(supabase, "profiles", profileRows);

  const teamSpecs = [
    {
      id: ids.teams.stars,
      template: sourceTeams[0],
      name: "Parkside Stars 7U",
      slug: "parkside-stars-7u",
      shortName: "Stars",
      primary: "#F5B942",
      secondary: "#17324D",
      coachId: users.starsCoach.id,
      mascot: "Stars",
      division: "7U",
    },
    {
      id: ids.teams.foxes,
      template: sourceTeams[1],
      name: "Eastview Foxes 8U",
      slug: "eastview-foxes-8u",
      shortName: "Foxes",
      primary: "#E65A2F",
      secondary: "#173B2C",
      coachId: users.foxesCoach.id,
      mascot: "Foxes",
      division: "8U",
    },
  ];
  const teamRows = teamSpecs.map((spec) => {
    const row = cleanClone(spec.template, spec.id);
    setRequiredColumn(row, spec.template, ["name"], spec.name, "team name");
    setColumns(row, spec.template, ["slug"], spec.slug);
    setColumns(row, spec.template, ["short_name", "display_name"], spec.shortName);
    setColumns(row, spec.template, ["primary_color", "brand_primary_color"], spec.primary);
    setColumns(row, spec.template, ["secondary_color", "brand_secondary_color"], spec.secondary);
    setColumns(row, spec.template, ["coach_user_id"], spec.coachId);
    setColumns(row, spec.template, ["mascot"], spec.mascot);
    setColumns(row, spec.template, ["division"], spec.division);
    setColumns(row, spec.template, ["status"], "active");
    return row;
  });
  await upsertRows(supabase, "teams", teamRows);

  const membershipSpecs = [
    [ids.memberships.starsCoach, coachMembershipTemplate, ids.teams.stars, users.starsCoach.id],
    [ids.memberships.foxesCoach, coachMembershipTemplate, ids.teams.foxes, users.foxesCoach.id],
    [ids.memberships.starsParent, parentMembershipTemplate, ids.teams.stars, users.parentThree.id],
    [ids.memberships.foxesParent, parentMembershipTemplate, ids.teams.foxes, users.parentFour.id],
  ];
  const membershipRows = membershipSpecs.map(([id, template, teamId, userId]) => {
    const row = cleanClone(template, id);
    setRequiredColumn(row, template, ["team_id"], teamId, "membership team");
    setRequiredColumn(row, template, ["user_id", "profile_id"], userId, "membership user");
    setColumns(row, template, ["status"], "active");
    setColumns(row, template, ["accepted_at", "approved_at"], new Date().toISOString());
    return row;
  });
  await upsertRows(supabase, "team_memberships", membershipRows);

  const sourcePlayers = await selectRows(supabase, "players", (query) =>
    query.in("team_id", sourceTeamIds).order("created_at", { ascending: true }),
  );
  if (sourcePlayers.length < 2) throw new Error("Two base demo players are required.");
  const playerSpecs = [
    [ids.players.maya, sourcePlayers[0], ids.teams.stars, "Maya", "M", "6"],
    [ids.players.eli, sourcePlayers[1], ids.teams.stars, "Eli", "R", "12"],
    [ids.players.zoe, sourcePlayers[0], ids.teams.foxes, "Zoe", "P", "4"],
    [ids.players.owen, sourcePlayers[1], ids.teams.foxes, "Owen", "K", "15"],
  ];
  const playerRows = playerSpecs.map(([id, template, teamId, firstName, lastInitial, jersey]) => {
    const row = cleanClone(template, id);
    setRequiredColumn(row, template, ["team_id"], teamId, "player team");
    setColumns(row, template, ["first_name", "given_name"], firstName);
    setColumns(row, template, ["last_initial"], lastInitial);
    setColumns(row, template, ["last_name", "family_name"], lastInitial);
    setColumns(row, template, ["display_name"], `${firstName} ${lastInitial}.`);
    setColumns(row, template, ["jersey", "jersey_number", "number"], jersey);
    setColumns(row, template, ["external_id", "registration_external_id"], null);
    setColumns(row, template, ["status"], "active");
    return row;
  });
  await upsertRows(supabase, "players", playerRows);

  const guardianTemplates = await selectRows(supabase, "player_guardians", (query) =>
    query.in("player_id", sourcePlayers.map((player) => player.id)).eq("status", "active").limit(1),
  );
  const guardianTemplate = guardianTemplates[0];
  if (!guardianTemplate) throw new Error("An active base guardian link is required.");
  const guardianSpecs = [
    [ids.guardians.maya, ids.players.maya, users.parentThree.id],
    [ids.guardians.eli, ids.players.eli, users.parentThree.id],
    [ids.guardians.zoe, ids.players.zoe, users.parentFour.id],
    [ids.guardians.owen, ids.players.owen, users.parentFour.id],
  ];
  const guardianRows = guardianSpecs.map(([id, playerId, guardianId]) => {
    const row = cleanClone(guardianTemplate, id);
    setRequiredColumn(row, guardianTemplate, ["player_id"], playerId, "guardian player");
    setRequiredColumn(
      row,
      guardianTemplate,
      ["parent_user_id", "guardian_profile_id", "guardian_id", "guardian_user_id", "profile_id"],
      guardianId,
      "guardian profile",
    );
    setColumns(row, guardianTemplate, ["status"], "active");
    setColumns(row, guardianTemplate, ["approved_at", "accepted_at", "verified_at"], new Date().toISOString());
    return row;
  });
  await upsertRows(supabase, "player_guardians", guardianRows);

  const sourceEvents = await selectRows(supabase, "events", (query) =>
    query.in("team_id", sourceTeamIds).order("created_at", { ascending: true }),
  );
  const gameTemplate = sourceEvents.find(
    (row) => row.event_type === "game" || row.type === "game",
  ) ?? sourceEvents[0];
  if (!gameTemplate) throw new Error("A base game event is required.");
  const eventSpecs = [
    [ids.events.starsRockets, ids.teams.stars, users.starsCoach.id, "Stars vs. Rockets", 5],
    [ids.events.foxesWaves, ids.teams.foxes, users.foxesCoach.id, "Foxes vs. Waves", 7],
    [ids.events.starsFoxes, ids.teams.stars, users.starsCoach.id, "Stars vs. Foxes", 10],
    [ids.events.foxesRockets, ids.teams.foxes, users.foxesCoach.id, "Foxes vs. Rockets", 13],
  ];
  const eventRows = eventSpecs.map(([id, teamId, coachId, title, day]) => {
    const row = cleanClone(gameTemplate, id);
    setRequiredColumn(row, gameTemplate, ["team_id"], teamId, "event team");
    setRequiredColumn(row, gameTemplate, ["title", "name"], title, "event title");
    setColumns(row, gameTemplate, ["event_type", "type"], "game");
    setColumns(row, gameTemplate, ["starts_at", "start_at", "start_time"], futureIso(day));
    setColumns(row, gameTemplate, ["ends_at", "end_at", "end_time"], futureIso(day, 20));
    setColumns(row, gameTemplate, ["created_by", "organizer_id", "coach_id"], coachId);
    setColumns(row, gameTemplate, ["status"], "scheduled");
    return row;
  });
  await upsertRows(supabase, "events", eventRows);

  const sourceChannels = await selectRows(supabase, "team_chat_channels", (query) =>
    query.in("team_id", sourceTeamIds).limit(1),
  );
  const channelTemplate = sourceChannels[0];
  if (!channelTemplate) throw new Error("A base team chat channel is required.");
  const channelSpecs = [
    [ids.channels.stars, ids.teams.stars, "Stars Team Chat"],
    [ids.channels.foxes, ids.teams.foxes, "Foxes Team Chat"],
  ];
  const channelRows = channelSpecs.map(([id, teamId, name]) => {
    const row = cleanClone(channelTemplate, id);
    setRequiredColumn(row, channelTemplate, ["team_id"], teamId, "chat channel team");
    setColumns(row, channelTemplate, ["name", "title"], name);
    setColumns(row, channelTemplate, ["pinned_message_id"], null);
    return row;
  });
  await upsertRows(supabase, "team_chat_channels", channelRows);

  const sourceMessages = await selectRows(supabase, "team_chat_messages", (query) =>
    query.in("channel_id", sourceChannels.map((channel) => channel.id)).limit(1),
  );
  const messageTemplate = sourceMessages[0];
  if (!messageTemplate) throw new Error("A base team chat message is required.");
  const messageSpecs = [
    [ids.messages.starsCoach, ids.channels.stars, ids.teams.stars, users.starsCoach.id, "coach", "Stars families: arrive 30 minutes early for warmups and jersey check."],
    [ids.messages.starsParent, ids.channels.stars, ids.teams.stars, users.parentThree.id, "parent", "We can bring the team fruit and water for Saturday's game."],
    [ids.messages.foxesCoach, ids.channels.foxes, ids.teams.foxes, users.foxesCoach.id, "coach", "Foxes practice moves to Field 2 this Thursday. Cleats and water bottles, please."],
    [ids.messages.foxesParent, ids.channels.foxes, ids.teams.foxes, users.parentFour.id, "parent", "Owen will be there. I can help with the post-game snack table."],
  ];
  const messageRows = messageSpecs.map(([id, channelId, teamId, senderId, authorRole, body]) => {
    const row = cleanClone(messageTemplate, id);
    setRequiredColumn(row, messageTemplate, ["channel_id"], channelId, "message channel");
    setColumns(row, messageTemplate, ["team_id"], teamId);
    setRequiredColumn(
      row,
      messageTemplate,
      ["author_user_id", "sender_profile_id", "sender_id", "user_id", "author_id"],
      senderId,
      "message sender",
    );
    setRequiredColumn(row, messageTemplate, ["body", "content", "message", "text"], body, "message body");
    setColumns(row, messageTemplate, ["author_role"], authorRole);
    setColumns(row, messageTemplate, ["moderation_status"], "visible");
    setColumns(row, messageTemplate, ["message_kind"], "message");
    setColumns(row, messageTemplate, ["hidden_at", "deleted_at"], null);
    return row;
  });
  await upsertRows(supabase, "team_chat_messages", messageRows);

  const sourceMedia = await selectRows(supabase, "media_items", (query) =>
    query.in("team_id", sourceTeamIds).limit(10),
  );
  const mediaTemplate = sourceMedia.find(
    (row) => row.moderation_status === "approved" || row.status === "approved",
  ) ?? sourceMedia[0];
  if (!mediaTemplate) throw new Error("A base approved media item is required.");
  const mediaSpecs = [
    [ids.media.starsOpening, ids.teams.stars, users.starsCoach.id, "Stars opening-day album", "https://photos.google.com/share/leaguepilot-demo-stars-opening-day"],
    [ids.media.foxesWarmup, ids.teams.foxes, users.foxesCoach.id, "Foxes warmup album", "https://photos.google.com/share/leaguepilot-demo-foxes-warmup"],
    [ids.media.starsTeam, ids.teams.stars, users.starsCoach.id, "Stars team photo album", "https://photos.google.com/share/leaguepilot-demo-stars-team"],
    [ids.media.foxesGame, ids.teams.foxes, users.foxesCoach.id, "Foxes game-day album", "https://photos.google.com/share/leaguepilot-demo-foxes-game-day"],
  ];
  const mediaRows = mediaSpecs.map(([id, teamId, ownerId, title, url]) => {
    const row = cleanClone(mediaTemplate, id);
    setRequiredColumn(row, mediaTemplate, ["team_id"], teamId, "media team");
    setRequiredColumn(row, mediaTemplate, ["title", "name"], title, "media title");
    setRequiredColumn(
      row,
      mediaTemplate,
      ["url", "external_url", "provider_url", "share_url"],
      url,
      "media URL",
    );
    setColumns(row, mediaTemplate, ["created_by", "uploaded_by", "owner_id"], ownerId);
    setColumns(row, mediaTemplate, ["media_type", "provider"], "google_photos");
    setColumns(row, mediaTemplate, ["moderation_status", "status"], "approved");
    setColumns(row, mediaTemplate, ["visibility"], "team");
    return row;
  });
  await upsertRows(supabase, "media_items", mediaRows);

  const allTeams = await selectRows(supabase, "teams", (query) =>
    query.eq("organization_id", organization.id),
  );
  const allTeamIds = allTeams.map((team) => team.id);
  const allChannels = await selectRows(supabase, "team_chat_channels", (query) =>
    query.in("team_id", allTeamIds),
  );
  const { count: activeParentCount, error: activeParentCountError } = await supabase
    .from("team_memberships")
    .select("id", { count: "exact", head: true })
    .in("team_id", allTeamIds)
    .eq("role", "parent")
    .eq("status", "active");
  if (activeParentCountError) {
    throw new Error(`Active parent count failed: ${activeParentCountError.message}`);
  }

  const counts = {
    teams: allTeams.length,
    parents: activeParentCount ?? 0,
    players: await countWhere(supabase, "players", "team_id", allTeamIds),
    gamesAndPractices: await countWhere(supabase, "events", "team_id", allTeamIds),
    messages: await countWhere(
      supabase,
      "team_chat_messages",
      "channel_id",
      allChannels.map((channel) => channel.id),
    ),
    media: await countWhere(supabase, "media_items", "team_id", allTeamIds),
  };

  const requiredMinimums = {
    teams: 4,
    parents: 4,
    players: 9,
    gamesAndPractices: 7,
    messages: 8,
    media: 6,
  };
  for (const [key, minimum] of Object.entries(requiredMinimums)) {
    if (counts[key] < minimum) {
      throw new Error(`Demo showcase ${key} count ${counts[key]} is below ${minimum}.`);
    }
  }

  const visitorTeamGrants = await countWhere(
    supabase,
    "team_memberships",
    "user_id",
    users.visitor.id,
  );
  const visitorOrganizationGrants = await countWhere(
    supabase,
    "organization_memberships",
    "user_id",
    users.visitor.id,
  );
  const visitorGuardianGrants = await countWhere(
    supabase,
    "player_guardians",
    "parent_user_id",
    users.visitor.id,
  );
  if (visitorTeamGrants + visitorOrganizationGrants + visitorGuardianGrants !== 0) {
    throw new Error("Unaffiliated visitor unexpectedly received a protected data grant.");
  }

  console.log(
    JSON.stringify(
      {
        organization: organization.name,
        counts,
        unaffiliatedVisitor: {
          authenticatedIdentityCreated: true,
          protectedGrants: 0,
        },
        providerSends: 0,
        note: "All records and accounts are fictional demo data.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
