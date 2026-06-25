-- Keep archived seasons readable but block new write paths against archived
-- team/event rows.

create or replace function public.current_team_season_is_active(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams team
    join public.seasons season on season.id = team.season_id
    where team.id = target_team_id
      and season.status = 'active'
  );
$$;

drop policy if exists "coaches and admins update team branding" on public.teams;
create policy "coaches and admins update active team branding" on public.teams
  for update using (
    public.current_user_can_manage_team(id)
    and public.current_team_season_is_active(id)
  ) with check (
    public.current_user_can_manage_team(id)
    and public.current_team_season_is_active(id)
  );

drop policy if exists "coaches and admins manage events" on public.events;
create policy "coaches and admins manage active season events" on public.events
  for all using (
    public.current_user_can_manage_team(team_id)
    and public.current_team_season_is_active(team_id)
  ) with check (
    public.current_user_can_manage_team(team_id)
    and public.current_team_season_is_active(team_id)
  );

drop policy if exists "parents can upsert linked child rsvps" on public.rsvps;
create policy "parents can upsert active linked child rsvps" on public.rsvps
  for all using (
    parent_user_id = auth.uid()
    and exists (
      select 1
      from public.player_guardians guardian
      join public.players player on player.id = guardian.player_id
      join public.events event on event.id = rsvps.event_id
      where guardian.player_id = rsvps.player_id
        and guardian.parent_user_id = auth.uid()
        and guardian.status = 'active'
        and player.team_id = event.team_id
        and public.current_team_season_is_active(event.team_id)
    )
  ) with check (
    parent_user_id = auth.uid()
    and exists (
      select 1
      from public.player_guardians guardian
      join public.players player on player.id = guardian.player_id
      join public.events event on event.id = rsvps.event_id
      where guardian.player_id = rsvps.player_id
        and guardian.parent_user_id = auth.uid()
        and guardian.status = 'active'
        and player.team_id = event.team_id
        and public.current_team_season_is_active(event.team_id)
    )
  );
