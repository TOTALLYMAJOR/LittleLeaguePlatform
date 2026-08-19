-- Establishes durable per-guardian event-change awareness while protecting the family scope in SQL.
-- Receipt retention follows the source event-change log: rows are retained for the lifetime of the
-- log and are deleted automatically when that log or the guardian profile is deleted.

create table if not exists public.event_change_receipts (
  id uuid primary key default gen_random_uuid(),
  event_change_log_id uuid not null references public.event_change_logs(id) on delete cascade,
  parent_user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  seen_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_change_log_id, parent_user_id),
  check (acknowledged_at is null or seen_at is not null)
);

create index if not exists idx_event_change_receipts_parent_change
  on public.event_change_receipts(parent_user_id, event_change_log_id);

create index if not exists idx_event_change_receipts_organization
  on public.event_change_receipts(organization_id, created_at desc);

alter table public.event_change_receipts enable row level security;

revoke all on table public.event_change_receipts from public, anon, authenticated;
grant select on table public.event_change_receipts to authenticated;
grant select, insert, update, delete on table public.event_change_receipts to service_role;

create policy "parents read own linked event change receipts"
  on public.event_change_receipts
  for select
  to authenticated
  using (
    parent_user_id = (select auth.uid())
    and exists (
      select 1
      from public.event_change_logs change_log
      join public.events event
        on event.id = change_log.event_id
       and event.organization_id = change_log.organization_id
       and event.team_id = change_log.team_id
      join public.players player
        on player.organization_id = change_log.organization_id
       and player.season_id = event.season_id
       and player.team_id = change_log.team_id
      join public.player_guardians guardian
        on guardian.player_id = player.id
       and guardian.parent_user_id = event_change_receipts.parent_user_id
       and guardian.status = 'active'
      where change_log.id = event_change_receipts.event_change_log_id
    )
  );

create or replace function public.acknowledge_event_change(
  p_event_change_log_id uuid,
  p_parent_user_id uuid,
  p_operation text default 'acknowledged'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  change_row record;
  receipt_row public.event_change_receipts%rowtype;
  normalized_operation text := lower(trim(coalesce(p_operation, '')));
  already_recorded boolean := false;
  now_value timestamptz := now();
begin
  if p_event_change_log_id is null or p_parent_user_id is null
     or normalized_operation not in ('seen', 'acknowledged') then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_input',
      'message', 'Event change receipt requires a change, guardian, and supported operation.'
    );
  end if;

  if (
    (select auth.uid()) is distinct from p_parent_user_id
    and coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'Event change is not available to this guardian.'
    );
  end if;

  select
    change_log.id,
    change_log.organization_id,
    change_log.team_id,
    change_log.change_type,
    event.season_id
  into change_row
  from public.event_change_logs change_log
  join public.events event
    on event.id = change_log.event_id
   and event.organization_id = change_log.organization_id
   and event.team_id = change_log.team_id
  where change_log.id = p_event_change_log_id;

  if change_row.id is null or not exists (
    select 1
    from public.players player
    join public.player_guardians guardian
      on guardian.player_id = player.id
     and guardian.parent_user_id = p_parent_user_id
     and guardian.status = 'active'
    where player.organization_id = change_row.organization_id
      and player.season_id = change_row.season_id
      and player.team_id = change_row.team_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'Event change is not available to this guardian.'
    );
  end if;

  if normalized_operation = 'acknowledged'
     and change_row.change_type not in ('time_changed', 'location_changed', 'cancelled') then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_operation',
      'message', 'This event change does not require acknowledgment.'
    );
  end if;

  insert into public.event_change_receipts (
    event_change_log_id,
    parent_user_id,
    organization_id
  ) values (
    p_event_change_log_id,
    p_parent_user_id,
    change_row.organization_id
  )
  on conflict (event_change_log_id, parent_user_id) do nothing;

  select *
  into receipt_row
  from public.event_change_receipts
  where event_change_log_id = p_event_change_log_id
    and parent_user_id = p_parent_user_id
  for update;

  if normalized_operation = 'seen' then
    already_recorded := receipt_row.seen_at is not null;
    if not already_recorded then
      update public.event_change_receipts
      set seen_at = now_value,
          updated_at = now_value
      where id = receipt_row.id
      returning * into receipt_row;
    end if;
  else
    already_recorded := receipt_row.acknowledged_at is not null;
    if not already_recorded then
      update public.event_change_receipts
      set seen_at = coalesce(seen_at, now_value),
          acknowledged_at = now_value,
          updated_at = now_value
      where id = receipt_row.id
      returning * into receipt_row;

      insert into public.audit_events (
        organization_id,
        actor_user_id,
        action,
        target_type,
        target_id,
        summary
      ) values (
        change_row.organization_id,
        p_parent_user_id,
        'event_change_acknowledged',
        'event_change_log',
        p_event_change_log_id::text,
        'Guardian acknowledged a high-impact event change. Provider delivery evidence remains separate.'
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', case when already_recorded then 'already_recorded' else 'recorded' end,
    'message', case
      when normalized_operation = 'acknowledged' and already_recorded then 'Event change was already acknowledged.'
      when normalized_operation = 'acknowledged' then 'Event change acknowledged.'
      when already_recorded then 'Event change was already marked seen.'
      else 'Event change marked seen.'
    end,
    'operation', normalized_operation,
    'idempotentReplay', already_recorded,
    'seenAt', receipt_row.seen_at,
    'acknowledgedAt', receipt_row.acknowledged_at
  );
end;
$$;

revoke all on function public.acknowledge_event_change(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.acknowledge_event_change(uuid, uuid, text)
  to authenticated, service_role;
