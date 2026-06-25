-- Add team lifecycle status so teams can be archived without deleting roster,
-- schedule, RSVP, or audit history.

alter table public.teams
  add column if not exists status text not null default 'active' check (status in ('active', 'archived')),
  add column if not exists archived_at timestamptz;

create index if not exists idx_teams_organization_status on public.teams(organization_id, status);

create or replace function public.current_team_is_active(target_team_id uuid)
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
      and team.status = 'active'
  );
$$;

drop policy if exists "coaches and admins update active team branding" on public.teams;
create policy "coaches and admins update active team branding" on public.teams
  for update using (
    public.current_user_can_manage_team(id)
    and public.current_team_is_active(id)
    and public.current_team_season_is_active(id)
  ) with check (
    public.current_user_can_manage_team(id)
    and public.current_team_is_active(id)
    and public.current_team_season_is_active(id)
  );
