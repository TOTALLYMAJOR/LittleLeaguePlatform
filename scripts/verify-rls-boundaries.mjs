import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  assertIsolatedQaTarget,
  assertServiceRoleCredential
} from "./qa-target-guard.mjs";

const envFile = ".env.local";

const ids = {
  playerMason: "44444444-4444-4444-8444-444444444441",
  playerAvery: "44444444-4444-4444-8444-444444444442",
  playerArchivedTeam: "44444444-4444-4444-8444-444444444444",
  game: "55555555-5555-4555-8555-555555555551",
  archivedGame: "55555555-5555-4555-8555-555555555553",
  eventChangeLinked: "5a555555-5555-4555-8555-555555555551",
  eventChangeUnlinked: "5a555555-5555-4555-8555-555555555552",
  weather: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1"
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

function anonClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function serviceClient() {
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  assertServiceRoleCredential(serviceRoleKey, "RLS proof");
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function signIn(emailKey, passwordKey) {
  const supabase = anonClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv(emailKey),
    password: requireEnv(passwordKey)
  });
  if (error || !data.user) throw new Error(`Could not sign in ${emailKey}: ${error?.message ?? "missing user"}`);
  return supabase;
}

function assertNoError(error, label) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function assertRows(data, count, label) {
  if (!Array.isArray(data) || data.length !== count) {
    throw new Error(`${label}: expected ${count} row(s), received ${Array.isArray(data) ? data.length : "non-array"}.`);
  }
}

function assertDenied(result, label) {
  if (result.error) return;
  assertRows(result.data, 0, label);
}

async function main() {
  loadLocalEnv();
  assertIsolatedQaTarget(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), "RLS proof");

  const parent = await signIn("QA_PARENT_EMAIL", "QA_PARENT_PASSWORD");
  const coach = await signIn("QA_COACH_EMAIL", "QA_COACH_PASSWORD");
  const anonymous = anonClient();
  const service = serviceClient();

  const parentPlayerRead = await parent
    .from("players")
    .select("id,first_name")
    .eq("id", ids.playerMason);
  assertNoError(parentPlayerRead.error, "parent linked player read");
  assertRows(parentPlayerRead.data, 1, "parent linked player read");

  const parentOrgMembershipRead = await parent
    .from("organization_memberships")
    .select("id");
  assertNoError(parentOrgMembershipRead.error, "parent org membership read");
  assertRows(parentOrgMembershipRead.data, 0, "parent cannot read org admin memberships");

  const parentOtherTeamPlayerRead = await parent
    .from("players")
    .select("id,first_name")
    .eq("id", ids.playerArchivedTeam);
  assertNoError(parentOtherTeamPlayerRead.error, "parent cross-team player read denial");
  assertRows(parentOtherTeamPlayerRead.data, 0, "parent cannot read cross-team players");

  const parentWeatherUpdate = await parent
    .from("weather_alerts")
    .update({ status: "queued" })
    .eq("id", ids.weather)
    .select("id,status");
  assertNoError(parentWeatherUpdate.error, "parent weather update denial");
  assertRows(parentWeatherUpdate.data, 0, "parent cannot update weather alerts");

  const parentUserResult = await parent.auth.getUser();
  if (!parentUserResult.data.user) throw new Error("parent session user is required for RSVP denial proof.");
  const parentUnlinkedRsvp = await parent
    .from("rsvps")
    .upsert({
      event_id: ids.game,
      player_id: ids.playerAvery,
      parent_user_id: parentUserResult.data.user.id,
      response: "going"
    }, { onConflict: "event_id,player_id" })
    .select("id");
  assertDenied(parentUnlinkedRsvp, "parent cannot RSVP for unlinked player");

  const parentUserId = parentUserResult.data.user.id;
  const firstAcknowledgment = await parent.rpc("acknowledge_event_change", {
    p_event_change_log_id: ids.eventChangeLinked,
    p_parent_user_id: parentUserId,
    p_operation: "acknowledged"
  });
  assertNoError(firstAcknowledgment.error, "parent linked event change acknowledgment");
  if (!firstAcknowledgment.data?.ok || !firstAcknowledgment.data.acknowledgedAt) {
    throw new Error("parent linked event change acknowledgment: expected durable acknowledgment evidence.");
  }

  const repeatedAcknowledgment = await parent.rpc("acknowledge_event_change", {
    p_event_change_log_id: ids.eventChangeLinked,
    p_parent_user_id: parentUserId,
    p_operation: "acknowledged"
  });
  assertNoError(repeatedAcknowledgment.error, "parent linked event change idempotent replay");
  if (
    !repeatedAcknowledgment.data?.ok
    || repeatedAcknowledgment.data.acknowledgedAt !== firstAcknowledgment.data.acknowledgedAt
  ) {
    throw new Error("parent linked event change idempotent replay: expected the original timestamp.");
  }

  const outOfScopeAcknowledgment = await parent.rpc("acknowledge_event_change", {
    p_event_change_log_id: ids.eventChangeUnlinked,
    p_parent_user_id: parentUserId,
    p_operation: "acknowledged"
  });
  assertNoError(outOfScopeAcknowledgment.error, "parent event change SQL denial response");
  if (outOfScopeAcknowledgment.data?.ok || outOfScopeAcknowledgment.data?.code !== "forbidden") {
    throw new Error("parent cannot acknowledge an out-of-scope event change: expected SQL forbidden result.");
  }
  const outOfScopeReceiptRead = await service
    .from("event_change_receipts")
    .select("id")
    .eq("event_change_log_id", ids.eventChangeUnlinked)
    .eq("parent_user_id", parentUserId);
  assertNoError(outOfScopeReceiptRead.error, "out-of-scope event change receipt readback");
  assertRows(outOfScopeReceiptRead.data, 0, "out-of-scope event change created no receipt row");

  const coachWeatherUpdate = await coach
    .from("weather_alerts")
    .update({ status: "draft" })
    .eq("id", ids.weather)
    .select("id,status");
  assertNoError(coachWeatherUpdate.error, "coach weather update");
  assertRows(coachWeatherUpdate.data, 1, "coach can update assigned-team weather alerts");

  const archivedEventUpdate = await coach
    .from("events")
    .update({ location_name: "Archived Field Edited" })
    .eq("id", ids.archivedGame)
    .select("id,location_name");
  assertDenied(archivedEventUpdate, "coach cannot update archived-season events");

  const anonymousTeamRead = await anonymous
    .from("teams")
    .select("id")
    .limit(1);
  assertNoError(anonymousTeamRead.error, "anonymous team read denial");
  assertRows(anonymousTeamRead.data, 0, "anonymous cannot read private teams");

  console.log("RLS boundary proof passed for QA parent, QA coach, and anonymous clients.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
