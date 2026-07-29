-- Keep retention maintenance within the team authorized by the route.

alter function public.purge_expired_team_chat_messages(timestamptz)
  set search_path = pg_catalog, public;

revoke all on function public.purge_expired_team_chat_messages(timestamptz)
  from service_role;

create or replace function public.purge_expired_team_chat_messages_for_team(
  p_team_id uuid,
  p_retention_cutoff timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  purged_count integer;
begin
  if p_team_id is null or p_retention_cutoff is null then
    raise exception 'Team-scoped retention requires team and cutoff.'
      using errcode = '22023';
  end if;

  update public.team_chat_messages
  set
    body = '[deleted after retention period]',
    moderation_status = 'deleted',
    deleted_at = coalesce(deleted_at, now()),
    moderation_reason = coalesce(moderation_reason, 'Deleted by retention policy.')
  where team_id = p_team_id
    and retained_until is not null
    and retained_until <= p_retention_cutoff
    and moderation_status <> 'deleted';

  get diagnostics purged_count = row_count;
  return purged_count;
end;
$$;

revoke all on function public.purge_expired_team_chat_messages_for_team(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_expired_team_chat_messages_for_team(uuid, timestamptz)
  to service_role;
