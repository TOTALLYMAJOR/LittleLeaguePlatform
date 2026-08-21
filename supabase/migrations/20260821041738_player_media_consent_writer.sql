-- Atomic, service-only parent media-consent writer.
-- The application derives target_guardian_user_id from the verified session;
-- this function independently rechecks the active guardian/player/team scope.

create or replace function public.record_parent_media_consent(
  target_player_id uuid,
  target_guardian_user_id uuid,
  target_granted boolean,
  target_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_row record;
  existing_row public.player_media_consents%rowtype;
  consent_row public.player_media_consents%rowtype;
  currently_granted boolean;
  next_action text;
begin
  if target_player_id is null or target_guardian_user_id is null then
    raise exception 'Player and verified guardian identity are required.';
  end if;
  if jsonb_typeof(coalesce(target_evidence, '{}'::jsonb)) <> 'object'
    or octet_length(coalesce(target_evidence, '{}'::jsonb)::text) > 2048 then
    raise exception 'Consent evidence must be a bounded JSON object.';
  end if;

  select
    player.organization_id,
    player.team_id,
    team.status as team_status,
    season.status as season_status
  into player_row
  from public.players player
  join public.teams team
    on team.id = player.team_id
    and team.organization_id = player.organization_id
  join public.seasons season
    on season.id = player.season_id
    and season.organization_id = player.organization_id
  where player.id = target_player_id
    and exists (
      select 1
      from public.player_guardians guardian
      where guardian.player_id = player.id
        and guardian.parent_user_id = target_guardian_user_id
        and guardian.status = 'active'
    );

  if not found then
    raise exception 'Only an active guardian can change this player media consent.';
  end if;
  if target_granted
    and (player_row.team_status is distinct from 'active'
      or player_row.season_status is distinct from 'active') then
    raise exception 'Media consent can only be granted for an active team and season.';
  end if;

  select *
  into existing_row
  from public.player_media_consents consent
  where consent.player_id = target_player_id
    and consent.guardian_user_id = target_guardian_user_id
    and consent.scope = 'team_family'
  for update;

  currently_granted := found
    and existing_row.granted_at is not null
    and existing_row.revoked_at is null;
  if currently_granted = target_granted then
    return jsonb_build_object(
      'consent_id', existing_row.id,
      'player_id', target_player_id,
      'granted', currently_granted,
      'replayed', true
    );
  end if;

  insert into public.player_media_consents (
    organization_id,
    team_id,
    player_id,
    guardian_user_id,
    scope,
    evidence_json,
    granted_at,
    revoked_at
  ) values (
    player_row.organization_id,
    player_row.team_id,
    target_player_id,
    target_guardian_user_id,
    'team_family',
    coalesce(target_evidence, '{}'::jsonb),
    case when target_granted then now() else null end,
    case when target_granted then null else now() end
  )
  on conflict (player_id, guardian_user_id, scope)
  do update set
    organization_id = excluded.organization_id,
    team_id = excluded.team_id,
    evidence_json = excluded.evidence_json,
    granted_at = case when target_granted then now() else public.player_media_consents.granted_at end,
    revoked_at = case when target_granted then null else now() end
  returning * into consent_row;

  next_action := case when target_granted
    then 'player_media_consent_granted'
    else 'player_media_consent_revoked'
  end;
  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    player_row.organization_id,
    target_guardian_user_id,
    next_action,
    'player',
    target_player_id::text,
    case when target_granted
      then 'Verified guardian granted team-family media consent for this player.'
      else 'Verified guardian revoked team-family media consent for this player.'
    end
  );

  return jsonb_build_object(
    'consent_id', consent_row.id,
    'player_id', target_player_id,
    'organization_id', player_row.organization_id,
    'team_id', player_row.team_id,
    'granted', target_granted,
    'replayed', false
  );
end;
$$;

revoke all on function public.record_parent_media_consent(uuid, uuid, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_parent_media_consent(uuid, uuid, boolean, jsonb)
  to service_role;
