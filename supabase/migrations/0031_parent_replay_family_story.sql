-- Privacy-safe family story media and private household engagement.
-- This migration never publishes a Replay, grants family access, changes
-- consent, or sends a provider message.

alter table public.parent_replay_engagement
  add column if not exists saved_at timestamptz;

create table if not exists public.parent_replay_family_media (
  id uuid primary key default gen_random_uuid(),
  parent_replay_id uuid not null references public.parent_replays(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id) on delete restrict,
  subject_player_ids uuid[] not null,
  alt_text text not null check (char_length(trim(alt_text)) between 10 and 500),
  transcript text,
  consent_snapshot_json jsonb not null default '{}'::jsonb,
  consent_snapshot_hash text not null check (consent_snapshot_hash ~ '^[0-9a-f]{64}$'),
  approved_by_user_id uuid not null references public.profiles(id) on delete restrict,
  approved_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_user_id uuid references public.profiles(id) on delete restrict,
  revocation_reason text,
  created_at timestamptz not null default now(),
  unique (parent_replay_id, media_item_id),
  check (cardinality(subject_player_ids) between 1 and 25),
  check (transcript is null or char_length(trim(transcript)) between 3 and 5000),
  check ((revoked_at is null) = (revoked_by_user_id is null)),
  check (revocation_reason is null or char_length(trim(revocation_reason)) between 10 and 1000)
);

create index if not exists idx_parent_replay_family_media_replay
  on public.parent_replay_family_media(parent_replay_id, approved_at desc)
  where revoked_at is null;

alter table public.parent_replay_family_media enable row level security;
revoke all on table public.parent_replay_family_media from public, anon, authenticated;
grant all on table public.parent_replay_family_media to service_role;

drop policy if exists "families and team staff read replay engagement"
  on public.parent_replay_engagement;
drop policy if exists "parents manage own replay engagement"
  on public.parent_replay_engagement;
create policy "parents read own replay engagement"
  on public.parent_replay_engagement
  for select using (parent_user_id = auth.uid());

create or replace function public.publish_parent_replay_family_media(
  target_parent_replay_id uuid,
  target_media_item_id uuid,
  target_subject_player_ids uuid[],
  target_alt_text text,
  target_transcript text,
  reviewing_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  replay_row public.parent_replays%rowtype;
  media_row public.media_items%rowtype;
  consent_snapshot jsonb;
  publication_row public.parent_replay_family_media%rowtype;
begin
  if cardinality(target_subject_player_ids) < 1 or cardinality(target_subject_player_ids) > 25 then
    raise exception 'Identify every child visible in this media.';
  end if;
  if cardinality(target_subject_player_ids) <> (
    select count(distinct subject.player_id)
    from unnest(target_subject_player_ids) subject(player_id)
  ) then
    raise exception 'Each identified child may appear only once.';
  end if;
  if char_length(trim(target_alt_text)) < 10 or char_length(trim(target_alt_text)) > 500 then
    raise exception 'Accessible media description is required.';
  end if;

  select * into replay_row
  from public.parent_replays
  where id = target_parent_replay_id
  for share;
  if not found or replay_row.published_at is null then
    raise exception 'Only a published Parent Replay can include family media.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = replay_row.organization_id
      and membership.user_id = reviewing_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Family Replay media requires league administrator review.';
  end if;

  select * into media_row
  from public.media_items
  where id = target_media_item_id
    and team_id = replay_row.team_id
  for share;
  if not found
    or media_row.moderation_status <> 'approved'
    or media_row.family_release_approved_at is null
    or media_row.storage_deleted_at is not null
    or (media_row.private_object_path is not null and media_row.scan_completed_at is null) then
    raise exception 'Media review, safety scan, and family release must all be current.';
  end if;

  if exists (
    select 1
    from unnest(target_subject_player_ids) subject(player_id)
    left join public.players player
      on player.id = subject.player_id
      and player.team_id = replay_row.team_id
    where player.id is null
  ) then
    raise exception 'Every identified child must belong to this Replay team.';
  end if;

  if exists (
    select 1
    from unnest(target_subject_player_ids) subject(player_id)
    where not exists (
      select 1
      from public.player_guardians guardian
      where guardian.player_id = subject.player_id
        and guardian.status = 'active'
        and guardian.parent_user_id is not null
    )
  ) then
    raise exception 'Every identified child needs a current guardian before family media can be used.';
  end if;

  if exists (
    select 1
    from unnest(target_subject_player_ids) subject(player_id)
    join public.player_guardians guardian
      on guardian.player_id = subject.player_id
      and guardian.status = 'active'
    where guardian.parent_user_id is null
      or not exists (
        select 1
        from public.player_media_consents consent
        where consent.player_id = subject.player_id
          and consent.guardian_user_id = guardian.parent_user_id
          and consent.scope = 'team_family'
          and consent.granted_at is not null
          and consent.revoked_at is null
      )
  ) then
    raise exception 'Current family media consent is required for every identified child.';
  end if;

  select jsonb_build_object(
    'subjectPlayerIds', target_subject_player_ids,
    'consents', coalesce(jsonb_agg(jsonb_build_object(
      'playerId', consent.player_id,
      'guardianUserId', consent.guardian_user_id,
      'consentId', consent.id,
      'grantedAt', consent.granted_at
    ) order by consent.player_id, consent.guardian_user_id), '[]'::jsonb),
    'familyReleaseApprovedAt', media_row.family_release_approved_at,
    'moderationStatus', media_row.moderation_status,
    'scanCompletedAt', media_row.scan_completed_at
  )
  into consent_snapshot
  from public.player_media_consents consent
  where consent.player_id = any(target_subject_player_ids)
    and consent.scope = 'team_family'
    and consent.granted_at is not null
    and consent.revoked_at is null;

  insert into public.parent_replay_family_media (
    parent_replay_id, organization_id, team_id, media_item_id,
    subject_player_ids, alt_text, transcript, consent_snapshot_json,
    consent_snapshot_hash, approved_by_user_id
  ) values (
    replay_row.id, replay_row.organization_id, replay_row.team_id, media_row.id,
    target_subject_player_ids, trim(target_alt_text), nullif(trim(target_transcript), ''),
    consent_snapshot,
    encode(digest(consent_snapshot::text, 'sha256'), 'hex'),
    reviewing_user_id
  )
  on conflict (parent_replay_id, media_item_id) do update
  set subject_player_ids = excluded.subject_player_ids,
      alt_text = excluded.alt_text,
      transcript = excluded.transcript,
      consent_snapshot_json = excluded.consent_snapshot_json,
      consent_snapshot_hash = excluded.consent_snapshot_hash,
      approved_by_user_id = excluded.approved_by_user_id,
      approved_at = now(),
      revoked_at = null,
      revoked_by_user_id = null,
      revocation_reason = null
  returning * into publication_row;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    replay_row.organization_id, reviewing_user_id,
    'parent_replay_family_media_published', 'parent_replay_family_media',
    publication_row.id::text,
    format('League administrator reviewed accessible family media for Parent Replay with %s identified child subject(s).', cardinality(target_subject_player_ids))
  );

  return jsonb_build_object(
    'ok', true,
    'family_media_id', publication_row.id,
    'provider_execution', 'not_started'
  );
end;
$$;

create or replace function public.revoke_parent_replay_family_media(
  target_family_media_id uuid,
  revoking_user_id uuid,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  publication_row public.parent_replay_family_media%rowtype;
begin
  if char_length(trim(target_reason)) < 10 or char_length(trim(target_reason)) > 1000 then
    raise exception 'A revocation reason of 10 to 1000 characters is required.';
  end if;
  select * into publication_row
  from public.parent_replay_family_media
  where id = target_family_media_id
  for update;
  if not found then raise exception 'Family Replay media is unavailable.'; end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = publication_row.organization_id
      and membership.user_id = revoking_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Only a league administrator can remove family Replay media.';
  end if;
  if publication_row.revoked_at is null then
    update public.parent_replay_family_media
    set revoked_at = now(),
        revoked_by_user_id = revoking_user_id,
        revocation_reason = trim(target_reason)
    where id = publication_row.id;
    insert into public.audit_events (
      organization_id, actor_user_id, action, target_type, target_id, summary
    ) values (
      publication_row.organization_id, revoking_user_id,
      'parent_replay_family_media_revoked', 'parent_replay_family_media',
      publication_row.id::text,
      'League administrator removed media from the family Replay. Replay text and activity remain available.'
    );
  end if;
  return jsonb_build_object('ok', true, 'family_media_id', publication_row.id);
end;
$$;

create or replace function public.record_parent_replay_engagement(
  target_parent_replay_id uuid,
  target_parent_user_id uuid,
  target_operation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  replay_row public.parent_replays%rowtype;
  engagement_row public.parent_replay_engagement%rowtype;
begin
  if target_operation not in ('viewed', 'activity_completed', 'saved') then
    raise exception 'Choose a supported Parent Replay action.';
  end if;
  select * into replay_row
  from public.parent_replays
  where id = target_parent_replay_id;
  if not found or replay_row.published_at is null then
    raise exception 'Published Parent Replay is unavailable.';
  end if;
  if not exists (
    select 1
    from public.player_guardians guardian
    join public.players player on player.id = guardian.player_id
    where guardian.parent_user_id = target_parent_user_id
      and guardian.status = 'active'
      and player.team_id = replay_row.team_id
  ) then
    raise exception 'Parent Replay is unavailable to this family.';
  end if;

  insert into public.parent_replay_engagement (
    parent_replay_id, parent_user_id, viewed_at, activity_completed_at, saved_at
  ) values (
    replay_row.id,
    target_parent_user_id,
    case when target_operation = 'viewed' then now() else null end,
    case when target_operation = 'activity_completed' then now() else null end,
    case when target_operation = 'saved' then now() else null end
  )
  on conflict (parent_replay_id, parent_user_id) do update
  set viewed_at = case
        when target_operation = 'viewed' then coalesce(parent_replay_engagement.viewed_at, now())
        else parent_replay_engagement.viewed_at
      end,
      activity_completed_at = case
        when target_operation = 'activity_completed' then coalesce(parent_replay_engagement.activity_completed_at, now())
        else parent_replay_engagement.activity_completed_at
      end,
      saved_at = case
        when target_operation = 'saved' then coalesce(parent_replay_engagement.saved_at, now())
        else parent_replay_engagement.saved_at
      end
  returning * into engagement_row;

  if target_operation in ('activity_completed', 'saved') then
    insert into public.audit_events (
      organization_id, actor_user_id, action, target_type, target_id, summary
    ) values (
      replay_row.organization_id, target_parent_user_id,
      'parent_replay_' || target_operation, 'parent_replay',
      replay_row.id::text,
      case
        when target_operation = 'saved' then 'Guardian saved a published Parent Replay for their private family view.'
        else 'Guardian marked a Parent Replay activity tried. This does not rank the child or family.'
      end
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'parent_replay_id', replay_row.id,
    'viewed_at', engagement_row.viewed_at,
    'activity_completed_at', engagement_row.activity_completed_at,
    'saved_at', engagement_row.saved_at
  );
end;
$$;

revoke all on function public.publish_parent_replay_family_media(uuid, uuid, uuid[], text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_parent_replay_family_media(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.record_parent_replay_engagement(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.publish_parent_replay_family_media(uuid, uuid, uuid[], text, text, uuid)
  to service_role;
grant execute on function public.revoke_parent_replay_family_media(uuid, uuid, text)
  to service_role;
grant execute on function public.record_parent_replay_engagement(uuid, uuid, text)
  to service_role;
