alter table public.organization_memberships enable row level security;
alter table public.team_memberships enable row level security;
alter table public.player_guardians enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.weather_alerts enable row level security;

drop policy if exists organization_memberships_select_by_scope on public.organization_memberships;
create policy organization_memberships_select_by_scope on public.organization_memberships
  for select
  using (user_id = auth.uid() or public.rls_user_is_org_admin(organization_id));

drop policy if exists organization_memberships_insert_by_org_admin on public.organization_memberships;
create policy organization_memberships_insert_by_org_admin on public.organization_memberships
  for insert
  with check (public.rls_user_is_org_admin(organization_id));

drop policy if exists organization_memberships_update_by_org_admin on public.organization_memberships;
create policy organization_memberships_update_by_org_admin on public.organization_memberships
  for update
  using (public.rls_user_is_org_admin(organization_id))
  with check (public.rls_user_is_org_admin(organization_id));

drop policy if exists organization_memberships_delete_by_org_admin on public.organization_memberships;
create policy organization_memberships_delete_by_org_admin on public.organization_memberships
  for delete
  using (public.rls_user_is_org_admin(organization_id));

drop policy if exists team_memberships_select_by_team_scope on public.team_memberships;
create policy team_memberships_select_by_team_scope on public.team_memberships
  for select
  using (public.rls_user_can_access_team(team_id));

drop policy if exists team_memberships_insert_by_team_staff on public.team_memberships;
create policy team_memberships_insert_by_team_staff on public.team_memberships
  for insert
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists team_memberships_update_by_team_staff on public.team_memberships;
create policy team_memberships_update_by_team_staff on public.team_memberships
  for update
  using (public.rls_user_can_manage_team(team_id))
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists team_memberships_delete_by_team_staff on public.team_memberships;
create policy team_memberships_delete_by_team_staff on public.team_memberships
  for delete
  using (public.rls_user_can_manage_team(team_id));

drop policy if exists player_guardians_select_by_team_scope on public.player_guardians;
create policy player_guardians_select_by_team_scope on public.player_guardians
  for select
  using (
    exists (
      select 1
      from public.players player
      where player.id = player_guardians.player_id
        and public.rls_user_can_access_team(player.team_id)
    )
  );

drop policy if exists player_guardians_insert_by_team_staff on public.player_guardians;
create policy player_guardians_insert_by_team_staff on public.player_guardians
  for insert
  with check (
    exists (
      select 1
      from public.players player
      where player.id = player_guardians.player_id
        and public.rls_user_can_manage_team(player.team_id)
    )
  );

drop policy if exists player_guardians_update_by_team_staff on public.player_guardians;
create policy player_guardians_update_by_team_staff on public.player_guardians
  for update
  using (
    exists (
      select 1
      from public.players player
      where player.id = player_guardians.player_id
        and public.rls_user_can_manage_team(player.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.players player
      where player.id = player_guardians.player_id
        and public.rls_user_can_manage_team(player.team_id)
    )
  );

drop policy if exists player_guardians_delete_by_team_staff on public.player_guardians;
create policy player_guardians_delete_by_team_staff on public.player_guardians
  for delete
  using (
    exists (
      select 1
      from public.players player
      where player.id = player_guardians.player_id
        and public.rls_user_can_manage_team(player.team_id)
    )
  );

drop policy if exists teams_select_by_scope on public.teams;
create policy teams_select_by_scope on public.teams
  for select
  using (public.rls_user_can_access_team(id));

drop policy if exists teams_insert_by_org_admin on public.teams;
create policy teams_insert_by_org_admin on public.teams
  for insert
  with check (public.rls_user_is_org_admin(organization_id));

drop policy if exists teams_update_by_staff_scope on public.teams;
create policy teams_update_by_staff_scope on public.teams
  for update
  using (
    public.rls_user_is_org_admin(organization_id)
    or public.rls_user_is_assigned_coach(id)
  )
  with check (
    public.rls_user_is_org_admin(organization_id)
    or public.rls_user_is_assigned_coach(id)
  );

drop policy if exists teams_delete_by_org_admin on public.teams;
create policy teams_delete_by_org_admin on public.teams
  for delete
  using (public.rls_user_is_org_admin(organization_id));

drop policy if exists players_select_by_team_scope on public.players;
create policy players_select_by_team_scope on public.players
  for select
  using (public.rls_user_can_access_team(team_id));

drop policy if exists players_insert_by_team_staff on public.players;
create policy players_insert_by_team_staff on public.players
  for insert
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists players_update_by_team_staff on public.players;
create policy players_update_by_team_staff on public.players
  for update
  using (public.rls_user_can_manage_team(team_id))
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists players_delete_by_team_staff on public.players;
create policy players_delete_by_team_staff on public.players
  for delete
  using (public.rls_user_can_manage_team(team_id));

drop policy if exists events_select_by_team_scope on public.events;
create policy events_select_by_team_scope on public.events
  for select
  using (public.rls_user_can_access_team(team_id));

drop policy if exists events_insert_by_team_staff on public.events;
create policy events_insert_by_team_staff on public.events
  for insert
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists events_update_by_team_staff on public.events;
create policy events_update_by_team_staff on public.events
  for update
  using (public.rls_user_can_manage_team(team_id))
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists events_delete_by_team_staff on public.events;
create policy events_delete_by_team_staff on public.events
  for delete
  using (public.rls_user_can_manage_team(team_id));

drop policy if exists rsvps_select_by_team_scope on public.rsvps;
create policy rsvps_select_by_team_scope on public.rsvps
  for select
  using (public.rls_user_can_access_team(team_id));

drop policy if exists rsvps_insert_by_parent_or_staff on public.rsvps;
create policy rsvps_insert_by_parent_or_staff on public.rsvps
  for insert
  with check (
    public.rls_user_can_manage_team(team_id)
    or (
      parent_user_id = auth.uid()
      and public.rls_parent_can_access_player(player_id)
      and public.rls_parent_can_access_team(team_id)
    )
  );

drop policy if exists rsvps_update_by_parent_or_staff on public.rsvps;
create policy rsvps_update_by_parent_or_staff on public.rsvps
  for update
  using (
    public.rls_user_can_manage_team(team_id)
    or (
      parent_user_id = auth.uid()
      and public.rls_parent_can_access_player(player_id)
      and public.rls_parent_can_access_team(team_id)
    )
  )
  with check (
    public.rls_user_can_manage_team(team_id)
    or (
      parent_user_id = auth.uid()
      and public.rls_parent_can_access_player(player_id)
      and public.rls_parent_can_access_team(team_id)
    )
  );

drop policy if exists rsvps_delete_by_parent_or_staff on public.rsvps;
create policy rsvps_delete_by_parent_or_staff on public.rsvps
  for delete
  using (
    public.rls_user_can_manage_team(team_id)
    or (
      parent_user_id = auth.uid()
      and public.rls_parent_can_access_player(player_id)
      and public.rls_parent_can_access_team(team_id)
    )
  );

drop policy if exists notifications_select_by_recipient_or_staff on public.notifications;
create policy notifications_select_by_recipient_or_staff on public.notifications
  for select
  using (
    (recipient_user_id = auth.uid() and public.rls_user_can_access_team(team_id))
    or public.rls_user_can_manage_team(team_id)
  );

drop policy if exists notifications_insert_by_team_staff on public.notifications;
create policy notifications_insert_by_team_staff on public.notifications
  for insert
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists notifications_update_by_recipient_or_staff on public.notifications;
create policy notifications_update_by_recipient_or_staff on public.notifications
  for update
  using (
    (recipient_user_id = auth.uid() and public.rls_user_can_access_team(team_id))
    or public.rls_user_can_manage_team(team_id)
  )
  with check (
    (recipient_user_id = auth.uid() and public.rls_user_can_access_team(team_id))
    or public.rls_user_can_manage_team(team_id)
  );

drop policy if exists notifications_delete_by_recipient_or_staff on public.notifications;
create policy notifications_delete_by_recipient_or_staff on public.notifications
  for delete
  using (
    (recipient_user_id = auth.uid() and public.rls_user_can_access_team(team_id))
    or public.rls_user_can_manage_team(team_id)
  );

drop policy if exists messages_select_by_team_scope on public.messages;
create policy messages_select_by_team_scope on public.messages
  for select
  using (public.rls_user_can_access_team(team_id));

drop policy if exists messages_insert_by_team_member on public.messages;
create policy messages_insert_by_team_member on public.messages
  for insert
  with check (
    public.rls_user_can_access_team(team_id)
    and author_user_id = auth.uid()
    and author_role = public.rls_user_role()
    and moderation_status = 'visible'
  );

drop policy if exists messages_update_by_author_or_staff on public.messages;
create policy messages_update_by_author_or_staff on public.messages
  for update
  using (
    public.rls_user_can_manage_team(team_id)
    or (
      author_user_id = auth.uid()
      and public.rls_user_can_access_team(team_id)
      and moderation_status = 'visible'
    )
  )
  with check (
    public.rls_user_can_manage_team(team_id)
    or (
      author_user_id = auth.uid()
      and public.rls_user_can_access_team(team_id)
    )
  );

drop policy if exists messages_delete_by_author_or_staff on public.messages;
create policy messages_delete_by_author_or_staff on public.messages
  for delete
  using (
    public.rls_user_can_manage_team(team_id)
    or (
      author_user_id = auth.uid()
      and public.rls_user_can_access_team(team_id)
    )
  );

drop policy if exists weather_alerts_select_by_team_scope on public.weather_alerts;
create policy weather_alerts_select_by_team_scope on public.weather_alerts
  for select
  using (public.rls_user_can_access_team(team_id));

drop policy if exists weather_alerts_insert_by_team_staff on public.weather_alerts;
create policy weather_alerts_insert_by_team_staff on public.weather_alerts
  for insert
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists weather_alerts_update_by_team_staff on public.weather_alerts;
create policy weather_alerts_update_by_team_staff on public.weather_alerts
  for update
  using (public.rls_user_can_manage_team(team_id))
  with check (public.rls_user_can_manage_team(team_id));

drop policy if exists weather_alerts_delete_by_team_staff on public.weather_alerts;
create policy weather_alerts_delete_by_team_staff on public.weather_alerts
  for delete
  using (public.rls_user_can_manage_team(team_id));
