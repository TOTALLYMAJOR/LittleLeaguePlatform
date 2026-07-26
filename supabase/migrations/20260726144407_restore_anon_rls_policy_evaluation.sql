-- Anonymous table reads still evaluate RLS expressions even when they return
-- no rows. Grant only the anon API role the helper execution needed for that
-- evaluation; the preceding migration's broad PUBLIC revocation remains.
grant execute on function public.current_team_is_active(uuid) to anon;
grant execute on function public.current_team_season_is_active(uuid) to anon;
grant execute on function public.current_user_can_access_team(uuid) to anon;
grant execute on function public.current_user_can_manage_player(uuid) to anon;
grant execute on function public.current_user_can_manage_team(uuid) to anon;
grant execute on function public.current_user_can_read_profile(uuid) to anon;
grant execute on function public.current_user_is_org_admin(uuid) to anon;
grant execute on function public.current_user_is_player_guardian(uuid) to anon;
