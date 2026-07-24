-- Restrict privileged helper entry points to the server-only service role.
--
-- RLS predicate helpers such as current_user_can_access_team intentionally
-- remain executable by anon/authenticated because table policies call them
-- and each helper scopes its decision to auth.uid(). The functions below are
-- mutation/maintenance entry points or internal trigger helpers and must not
-- be independently callable through the Data API.

alter function public.touch_updated_at()
  set search_path = pg_catalog, public;

alter function public.digest(text, text)
  set search_path = pg_catalog, public, extensions;

revoke all on function public.handle_new_user()
  from public, anon, authenticated;

revoke all on function public.reviewer_can_manage_registration(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reviewer_can_manage_registration(uuid, uuid)
  to service_role;

revoke all on function public.approve_registration_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.approve_registration_request(uuid, uuid, text)
  to service_role;

revoke all on function public.reject_registration_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.reject_registration_request(uuid, uuid, text)
  to service_role;

revoke all on function public.purge_expired_team_chat_messages(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_expired_team_chat_messages(timestamptz)
  to service_role;
