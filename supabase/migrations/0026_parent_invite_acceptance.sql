-- One-time parent invitation acceptance.
-- Identity is verified by Supabase Auth; the approved child/team scope comes
-- only from the existing invite and guardian rows.

alter table public.parent_invites
  add column if not exists accepted_by_user_id uuid references public.profiles(id) on delete set null;

create or replace function public.accept_parent_invite_by_hash(
  target_invite_token_hash text,
  accepting_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.parent_invites%rowtype;
  profile_email text;
  team_season_status text;
begin
  select *
  into invite_row
  from public.parent_invites
  where invite_token_hash = target_invite_token_hash
  for update;

  if not found then raise exception 'Invitation is invalid.'; end if;
  if invite_row.status = 'accepted' then raise exception 'Invitation was already accepted.'; end if;
  if invite_row.status = 'revoked' then raise exception 'Invitation was revoked.'; end if;
  if invite_row.status = 'expired' or invite_row.expires_at <= now() then
    update public.parent_invites set status = 'expired' where id = invite_row.id;
    raise exception 'Invitation expired.';
  end if;

  select lower(email) into profile_email from public.profiles where id = accepting_user_id;
  if profile_email is null or profile_email <> lower(invite_row.email) then
    raise exception 'Signed-in email does not match this invitation.';
  end if;

  select season.status
  into team_season_status
  from public.teams team
  join public.seasons season on season.id = team.season_id
  where team.id = invite_row.team_id
    and team.organization_id = invite_row.organization_id;
  if team_season_status is distinct from 'active' then
    raise exception 'Invitation team is not in an active season.';
  end if;

  update public.player_guardians
  set parent_user_id = accepting_user_id,
      status = 'active',
      updated_at = now()
  where parent_invite_id = invite_row.id
    and player_id = invite_row.player_id
    and status = 'invited';
  if not found then raise exception 'Approved guardian scope is unavailable.'; end if;

  insert into public.team_memberships (team_id, user_id, role, status)
  values (invite_row.team_id, accepting_user_id, 'parent', 'active')
  on conflict (team_id, user_id, role)
  do update set status = 'active', updated_at = now();

  update public.parent_invites
  set status = 'accepted',
      accepted_at = now(),
      accepted_by_user_id = accepting_user_id,
      updated_at = now()
  where id = invite_row.id;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    invite_row.organization_id,
    accepting_user_id,
    'parent_invite_accepted',
    'parent_invite',
    invite_row.id::text,
    'Signed-in adult accepted the previously approved child and team invitation scope. No provider message was sent.'
  );

  return jsonb_build_object(
    'invite_id', invite_row.id,
    'organization_id', invite_row.organization_id,
    'team_id', invite_row.team_id,
    'player_id', invite_row.player_id,
    'accepted_at', now()
  );
end;
$$;

revoke all on function public.accept_parent_invite_by_hash(text, uuid)
  from public, anon, authenticated;
grant execute on function public.accept_parent_invite_by_hash(text, uuid)
  to service_role;
