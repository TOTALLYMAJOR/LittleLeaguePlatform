create or replace function public.rls_user_is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'admin'
      and membership.status = 'active'
  );
$$;

create or replace function public.rls_user_is_assigned_coach(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_memberships membership
    where membership.team_id = target_team_id
      and membership.user_id = auth.uid()
      and membership.role = 'coach'
      and membership.status = 'active'
  )
  or exists (
    select 1
    from public.teams team
    where team.id = target_team_id
      and team.coach_user_id = auth.uid()
  );
$$;

create or replace function public.rls_parent_can_access_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.player_guardians guardian
    where guardian.player_id = target_player_id
      and guardian.parent_user_id = auth.uid()
      and guardian.status = 'active'
  );
$$;

create or replace function public.rls_parent_can_access_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.player_guardians guardian
    join public.players player
      on player.id = guardian.player_id
    where player.team_id = target_team_id
      and guardian.parent_user_id = auth.uid()
      and guardian.status = 'active'
  );
$$;

create or replace function public.rls_user_can_access_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams team
    where team.id = target_team_id
      and (
        public.rls_user_is_org_admin(team.organization_id)
        or public.rls_user_is_assigned_coach(team.id)
        or public.rls_parent_can_access_team(team.id)
      )
  );
$$;

create or replace function public.rls_user_can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams team
    where team.id = target_team_id
      and (
        public.rls_user_is_org_admin(team.organization_id)
        or public.rls_user_is_assigned_coach(team.id)
      )
  );
$$;

create or replace function public.rls_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid();
$$;
