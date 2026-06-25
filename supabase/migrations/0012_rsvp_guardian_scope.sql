-- Tighten RSVP writes so a parent cannot RSVP for an unlinked player or a
-- player/event pair that crosses teams.

drop policy if exists "parents can upsert own rsvps" on public.rsvps;

create policy "parents can upsert linked child rsvps" on public.rsvps
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
    )
  );
