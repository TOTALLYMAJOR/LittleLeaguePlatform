-- Keep the existing named RPC contract while removing the PL/pgSQL ambiguity
-- between its revocation_reason argument and the table column of the same name.
create or replace function public.revoke_additional_guardian_access(
  target_request_id uuid,
  revoking_user_id uuid,
  revocation_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.additional_guardian_requests%rowtype;
  accepted_user_id uuid;
begin
  if char_length(trim(revocation_reason)) < 10 or char_length(trim(revocation_reason)) > 500 then
    raise exception 'Revocation reason must be 10 to 500 characters.';
  end if;
  select * into request_row
  from public.additional_guardian_requests
  where id = target_request_id
  for update;
  if not found then raise exception 'Request is unavailable.'; end if;
  if request_row.approved_at is null or request_row.revoked_at is not null then
    raise exception 'Only current approved access can be revoked.';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = request_row.organization_id
      and membership.user_id = revoking_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    raise exception 'Active organization administrator access is required.';
  end if;

  select accepted_by_user_id into accepted_user_id
  from public.parent_invites
  where id = request_row.parent_invite_id;

  update public.parent_invites
  set status = case when status = 'pending' then 'revoked' else status end,
      updated_at = now()
  where id = request_row.parent_invite_id;

  update public.player_guardians
  set status = 'removed',
      updated_at = now()
  where parent_invite_id = request_row.parent_invite_id
    and player_id = request_row.player_id;

  if accepted_user_id is not null and not exists (
    select 1
    from public.player_guardians guardian
    join public.players player on player.id = guardian.player_id
    where guardian.parent_user_id = accepted_user_id
      and guardian.status = 'active'
      and player.team_id = request_row.team_id
  ) then
    update public.team_memberships
    set status = 'removed',
        updated_at = now()
    where team_id = request_row.team_id
      and user_id = accepted_user_id
      and role = 'parent';
  end if;

  update public.additional_guardian_requests
  set revoked_at = now(),
      revoked_by_user_id = revoking_user_id,
      revocation_reason = trim($3)
  where id = request_row.id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    request_row.organization_id,
    revoking_user_id,
    'additional_guardian_access_revoked',
    'additional_guardian_request',
    request_row.id::text,
    'An organization administrator revoked the additional guardian child scope and corrected team membership when no other linked child required it.'
  );

  return jsonb_build_object('request_id', request_row.id, 'state', 'revoked');
end;
$$;

revoke all on function public.revoke_additional_guardian_access(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.revoke_additional_guardian_access(uuid, uuid, text)
  to service_role;
