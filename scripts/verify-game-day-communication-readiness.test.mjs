import assert from "node:assert/strict";
import test from "node:test";

import {
  formatGameDayCommunicationReadinessReport,
  readRepositorySources,
  verifyGameDayCommunicationReadiness
} from "./verify-game-day-communication-readiness.mjs";

const fixtureSources = readRepositorySources();

function cloneSources() {
  return { ...fixtureSources };
}

function codesFor(result, family) {
  return result.blockers
    .filter((blocker) => blocker.family === family)
    .map((blocker) => blocker.code);
}

test("passes against repository source fixtures without hosted credentials or network access", () => {
  const result = verifyGameDayCommunicationReadiness(cloneSources());

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(formatGameDayCommunicationReadinessReport(result), /local repository-source readiness proof only/);
  assert.match(formatGameDayCommunicationReadinessReport(result), /hosted browser proof/);
  assert.match(formatGameDayCommunicationReadinessReport(result), /Supabase readback/);
  assert.match(formatGameDayCommunicationReadinessReport(result), /provider sandbox\/webhook proof/);
  assert.match(formatGameDayCommunicationReadinessReport(result), /realtime\/offline production behavior/);
});

test("fails game-day decision authority when the route stops using the verified actor", () => {
  const sources = cloneSources();
  sources.gameDayRoute = sources.gameDayRoute.replace(
    "actorUserId: auth.user.id",
    "actorUserId: String(body.actorUserId)"
  );

  const result = verifyGameDayCommunicationReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "game-day-decision-authority").includes("GAME_DAY_ROUTE_SESSION_ACTOR_MISSING"));
});

test("fails schedule-version and audit readiness when pending-only game-day notification evidence is weakened", () => {
  const sources = cloneSources();
  sources.gameDayMigration = sources.gameDayMigration.replace(
    "'email',\n        'pending'",
    "'email',\n        'sent'"
  );

  const result = verifyGameDayCommunicationReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "schedule-version-audit-evidence").includes("GAME_DAY_PENDING_ONLY_RECIPIENTS_MISSING"));
});

test("fails official revision authority when immutable version rows are weakened", () => {
  const sources = cloneSources();
  sources.officialMigration = sources.officialMigration.replaceAll(
    "official_communication_versions_immutable",
    "official_communication_versions_mutable"
  );

  const result = verifyGameDayCommunicationReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "official-communication-revision-authority").includes("OFFICIAL_IMMUTABLE_VERSION_ROWS_MISSING"));
});

test("fails family current-version readback when partial-propagation UI is removed", () => {
  const sources = cloneSources();
  sources.communicationRoom = sources.communicationRoom.replace(
    "This update has not reached every required family surface.",
    "This update was published."
  );
  sources.communicationRoomTest = sources.communicationRoomTest.replace(
    "has not reached every required family surface",
    "was published"
  );

  const result = verifyGameDayCommunicationReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "family-current-version-readback").includes("COMMUNICATION_ROOM_REVISION_UI_MISSING"));
});

test("fails offline reconnect behavior when 409 conflicts no longer stop sync", () => {
  const sources = cloneSources();
  sources.offlineOutbox = sources.offlineOutbox.replace(
    "if (conflict) break;",
    "if (conflict) continue;"
  );

  const result = verifyGameDayCommunicationReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "offline-reconnect-conflict-behavior").includes("OFFLINE_CONFLICT_409_MISSING"));
});
