-- These security-definer helpers are evaluated by authenticated-user RLS
-- policies. Keep that required execution path explicit, but remove PostgreSQL's
-- default PUBLIC grant so anonymous callers cannot invoke them as Data API RPCs.
revoke execute on function public.current_team_is_active(uuid) from public, anon;
revoke execute on function public.current_team_season_is_active(uuid) from public, anon;
revoke execute on function public.current_user_can_access_team(uuid) from public, anon;
revoke execute on function public.current_user_can_manage_player(uuid) from public, anon;
revoke execute on function public.current_user_can_manage_team(uuid) from public, anon;
revoke execute on function public.current_user_can_read_profile(uuid) from public, anon;
revoke execute on function public.current_user_is_org_admin(uuid) from public, anon;
revoke execute on function public.current_user_is_player_guardian(uuid) from public, anon;

grant execute on function public.current_team_is_active(uuid) to authenticated, service_role;
grant execute on function public.current_team_season_is_active(uuid) to authenticated, service_role;
grant execute on function public.current_user_can_access_team(uuid) to authenticated, service_role;
grant execute on function public.current_user_can_manage_player(uuid) to authenticated, service_role;
grant execute on function public.current_user_can_manage_team(uuid) to authenticated, service_role;
grant execute on function public.current_user_can_read_profile(uuid) to authenticated, service_role;
grant execute on function public.current_user_is_org_admin(uuid) to authenticated, service_role;
grant execute on function public.current_user_is_player_guardian(uuid) to authenticated, service_role;
