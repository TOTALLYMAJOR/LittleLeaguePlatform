import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationName = readdirSync(join(process.cwd(), "supabase", "migrations"))
  .find((name) => name.endsWith("_complete_private_team_builder_publish.sql"));
const migration = migrationName
  ? readFileSync(join(process.cwd(), "supabase", "migrations", migrationName), "utf8")
  : "";
const normalizedMigration = migration.replace(/\s+/g, " ");
const planService = readFileSync(
  join(process.cwd(), "lib", "supabase", "team-builder-plans.ts"),
  "utf8"
);

function functionSql(name: string) {
  const match = migration.match(new RegExp(
    `create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`
  ));
  expect(match, `${name} must be defined in the team-builder migration`).not.toBeNull();
  return match?.[0] ?? "";
}

function approvedPlayerSetMatchesCurrent(
  approvedPlayerIds: string[],
  currentPlayerIds: string[]
) {
  const approved = new Set(approvedPlayerIds);
  const current = new Set(currentPlayerIds);

  return approved.size === approvedPlayerIds.length
    && approved.size === current.size
    && [...approved].every((playerId) => current.has(playerId));
}

describe("private team-builder production contract", () => {
  it("removes direct browser access to private profiles and plans", () => {
    expect(migrationName).toMatch(/^\d{14}_complete_private_team_builder_publish\.sql$/);
    expect(normalizedMigration).toContain(
      "alter table public.player_team_builder_profiles enable row level security"
    );
    expect(normalizedMigration).toContain(
      "constraint player_team_builder_profiles_player_tenant_fkey foreign key (organization_id, season_id, player_id)"
    );
    expect(normalizedMigration).toContain(
      "revoke all on table public.player_team_builder_profiles from public, anon, authenticated"
    );
    expect(normalizedMigration).toContain(
      "grant select on table public.player_team_builder_profiles to service_role"
    );
    expect(normalizedMigration).not.toContain(
      "grant select, insert, update on table public.player_team_builder_profiles"
    );
    expect(normalizedMigration).toContain(
      "drop policy if exists \"organization admins manage team build plans\" on public.team_build_plans"
    );
    expect(normalizedMigration).toContain(
      "revoke all on table public.team_build_plans from public, anon, authenticated"
    );
    expect(normalizedMigration).toContain(
      "grant select, insert, update on table public.team_build_plans to service_role"
    );
    expect(migration).not.toMatch(
      /create policy[\s\S]*organization admins manage team build plans[\s\S]*for all/i
    );
    expect(migration).not.toContain("alter table public.players\n  add column birth_date");
    expect(migration).not.toContain("evaluation_note");
  });

  it("enforces tenant-composite ownership and organization-scoped action keys", () => {
    expect(normalizedMigration).toContain(
      "foreign key (organization_id, season_id) references public.seasons (organization_id, id)"
    );
    expect(normalizedMigration).toContain(
      "foreign key (organization_id, season_id, team_id) references public.teams (organization_id, season_id, id)"
    );
    expect(normalizedMigration).toContain(
      "foreign key (organization_id, plan_id) references public.team_build_plans (organization_id, id)"
    );
    expect(normalizedMigration).toContain(
      "foreign key (organization_id, season_id, plan_id) references public.team_build_plans (organization_id, season_id, id)"
    );
    expect(normalizedMigration).toContain(
      "on public.team_build_plans (organization_id, client_action_id)"
    );
    expect(normalizedMigration).toContain(
      "on public.team_build_plans (organization_id, publish_action_id)"
    );
    expect(normalizedMigration).toContain(
      "on public.team_build_plan_actions (organization_id, action_id)"
    );
    expect(migration).not.toMatch(/action_id uuid not null unique/);
  });

  it("binds idempotency to the complete request and safely converges concurrent creates", () => {
    const saveSql = functionSql("save_team_build_plan");
    const normalizedSave = saveSql.replace(/\s+/g, " ");

    for (const binding of [
      "'actionType', requested_action_type",
      "'actorUserId', target_actor_user_id",
      "'organizationId', target_organization_id",
      "'seasonId', target_season_id",
      "'planId', target_plan_id",
      "'expectedLockVersion', expected_lock_version",
      "'assignments', target_assignments"
    ]) {
      expect(normalizedSave).toContain(binding);
    }
    expect(normalizedSave).toContain(
      "request_fingerprint := encode(digest(jsonb_build_object("
    );
    const createLock = normalizedSave.indexOf(
      "perform pg_catalog.pg_advisory_xact_lock("
    );
    const actionReadback = normalizedSave.indexOf(
      "from public.team_build_plan_actions action"
    );
    const planInsert = normalizedSave.indexOf(
      "insert into public.team_build_plans"
    );
    expect(createLock).toBeGreaterThan(-1);
    expect(actionReadback).toBeGreaterThan(createLock);
    expect(planInsert).toBeGreaterThan(actionReadback);
    expect(normalizedSave).toContain(
      "action_row.request_fingerprint <> request_fingerprint"
    );
    expect(normalizedSave).toContain(
      "Action identifier was already used for a different team build request."
    );
    expect(normalizedSave).toContain(
      "on conflict (organization_id, client_action_id) where client_action_id is not null do nothing"
    );
    expect(normalizedSave).toContain(
      "where plan.organization_id = target_organization_id and plan.season_id = target_season_id and plan.client_action_id = target_action_id"
    );
    expect(normalizedSave).toContain(
      "where action.organization_id = target_organization_id and action.action_id = target_action_id"
    );
    expect(normalizedSave).toContain(
      "action_type, request_fingerprint, resulting_version"
    );
    expect(planService).toMatch(
      /db\.from\("teams"\)[\s\S]*?\.eq\("status", "active"\)[\s\S]*?\.order\("name", \{ ascending: true \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)/
    );
    expect(planService).toMatch(
      /db\.from\("players"\)[\s\S]*?\.eq\("roster_status", "active"\)[\s\S]*?\.order\("id", \{ ascending: true \}\)/
    );

    for (const [functionName, actionType] of [
      ["approve_team_build_plan", "approve"],
      ["publish_team_build_plan", "publish"]
    ] as const) {
      const transitionSql = functionSql(functionName).replace(/\s+/g, " ");
      expect(transitionSql).toContain(`'actionType', '${actionType}'`);
      expect(transitionSql).toContain("'actorUserId', target_actor_user_id");
      expect(transitionSql).toContain("'organizationId', plan_row.organization_id");
      expect(transitionSql).toContain("'seasonId', plan_row.season_id");
      expect(transitionSql).toContain(`action_row.action_type <> '${actionType}'`);
      expect(transitionSql).toContain(
        "action_row.request_fingerprint <> request_fingerprint"
      );
      expect(transitionSql).toContain(
        "Action identifier was already used for a different team build request."
      );
    }
  });

  it("locks the complete season scope and requires exact roster-set equality before publish", () => {
    const publishSql = functionSql("publish_team_build_plan");
    const seasonLock = publishSql.indexOf("select season.status");
    const teamLock = publishSql.indexOf("perform team.id");
    const playerLock = publishSql.indexOf("perform player.id");
    const assignmentValidation = publishSql.indexOf("select count(*) into assignment_count");
    const playerUpdate = publishSql.indexOf("update public.players player");
    const teamLockSql = publishSql.slice(teamLock, playerLock);
    const playerLockSql = publishSql.slice(playerLock, assignmentValidation);
    const validationSql = publishSql.slice(assignmentValidation, playerUpdate);

    expect(seasonLock).toBeGreaterThan(-1);
    expect(teamLock).toBeGreaterThan(seasonLock);
    expect(playerLock).toBeGreaterThan(teamLock);
    expect(assignmentValidation).toBeGreaterThan(playerLock);
    expect(playerUpdate).toBeGreaterThan(assignmentValidation);
    expect(publishSql).toMatch(/order by team\.id\s+for update/);
    expect(publishSql).toMatch(/order by player\.id\s+for update/);
    expect(teamLockSql).toMatch(
      /team\.organization_id = plan_row\.organization_id[\s\S]*team\.season_id = plan_row\.season_id/
    );
    expect(teamLockSql).not.toContain("team.division = plan_row.division");
    expect(playerLockSql).toMatch(
      /player\.organization_id = plan_row\.organization_id[\s\S]*player\.season_id = plan_row\.season_id/
    );
    expect(playerLockSql).not.toContain("join public.teams");
    expect(validationSql).toMatch(
      /from jsonb_array_elements\(plan_row\.assignments\) item[\s\S]*left join public\.players player[\s\S]*left join public\.teams source_team[\s\S]*source_team\.division = plan_row\.division[\s\S]*source_team\.status = 'active'[\s\S]*where player\.id is null[\s\S]*source_team\.id is null/
    );
    expect(validationSql).toMatch(
      /from public\.players player[\s\S]*join public\.teams source_team[\s\S]*source_team\.division = plan_row\.division[\s\S]*source_team\.status = 'active'[\s\S]*and not exists \([\s\S]*from jsonb_array_elements\(plan_row\.assignments\) item[\s\S]*where \(item->>'playerId'\)::uuid = player\.id/
    );
    expect(publishSql.slice(playerUpdate)).toMatch(
      /exists \(\s*select 1\s*from public\.teams target_team[\s\S]*target_team\.id = assignment\.team_id[\s\S]*target_team\.status = 'active'/
    );
    expect(publishSql).toContain(
      "Atomic publish did not update the complete approved assignment set."
    );
  });

  it("rejects a same-count player swap in the roster-set regression model", () => {
    expect(approvedPlayerSetMatchesCurrent(
      ["approved-player"],
      ["replacement-player"]
    )).toBe(false);
    expect(approvedPlayerSetMatchesCurrent(
      ["approved-player"],
      ["approved-player"]
    )).toBe(true);
    expect(approvedPlayerSetMatchesCurrent(
      ["approved-player", "approved-player"],
      ["approved-player"]
    )).toBe(false);
  });

  it("makes private profile persistence and audit one service-only transaction", () => {
    const profileSql = functionSql("save_player_team_builder_profile");
    const profileWrite = profileSql.indexOf(
      "insert into public.player_team_builder_profiles"
    );
    const auditWrite = profileSql.indexOf("insert into public.audit_events");
    const result = profileSql.indexOf("return jsonb_build_object");

    expect(profileSql).toContain("security definer");
    expect(profileSql).toMatch(
      /membership\.organization_id = target_organization_id[\s\S]*membership\.user_id = target_actor_user_id[\s\S]*membership\.role = 'admin'[\s\S]*membership\.status = 'active'/
    );
    expect(profileSql).toMatch(
      /player\.organization_id = target_organization_id[\s\S]*player\.season_id = target_season_id[\s\S]*player\.id = target_player_id/
    );
    expect(profileWrite).toBeGreaterThan(-1);
    expect(auditWrite).toBeGreaterThan(profileWrite);
    expect(result).toBeGreaterThan(auditWrite);
    expect(normalizedMigration).toContain(
      "revoke all on function public.save_player_team_builder_profile( uuid, uuid, uuid, uuid, date, text, smallint ) from public, anon, authenticated"
    );
    expect(normalizedMigration).toContain(
      "grant execute on function public.save_player_team_builder_profile( uuid, uuid, uuid, uuid, date, text, smallint ) to service_role"
    );
  });
});
