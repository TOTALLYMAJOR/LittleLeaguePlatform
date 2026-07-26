-- Cache the request-scoped authenticated user once per statement in the 49
-- existing RLS policies flagged by Supabase's auth_rls_initplan advisor.
-- Policy names, commands, roles, permissiveness, row predicates, and write
-- checks stay unchanged; only request-constant user-ID calls gain scalar subqueries.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local search_path = pg_catalog, public;

alter policy "team staff manage coach event notes"
  on public.coach_event_notes
  using (current_user_can_manage_team(team_id))
  with check ((current_user_can_manage_team(team_id) and (author_user_id = (select auth.uid()))));

alter policy "coaches read reviewed drill video sources"
  on public.drill_video_sources
  using ((current_user_is_org_admin(organization_id) or (exists ( select 1
   from (teams team
     join team_memberships membership on ((membership.team_id = team.id)))
  where ((team.organization_id = drill_video_sources.organization_id) and (membership.user_id = (select auth.uid())) and (membership.role = 'coach'::text) and (membership.status = 'active'::text))))));

alter policy "coaches read approved drill videos"
  on public.drill_videos
  using ((current_user_is_org_admin(organization_id) or (created_by_user_id = (select auth.uid())) or ((approval_status = 'approved'::text) and (exists ( select 1
   from (teams team
     join team_memberships membership on ((membership.team_id = team.id)))
  where ((team.organization_id = drill_videos.organization_id) and (membership.user_id = (select auth.uid())) and (membership.role = 'coach'::text) and (membership.status = 'active'::text)))))));

alter policy "coaches submit drill videos for their organizations"
  on public.drill_videos
  with check (((provider = 'youtube'::text) and (current_user_is_org_admin(organization_id) or (exists ( select 1
   from (teams team
     join team_memberships membership on ((membership.team_id = team.id)))
  where ((team.organization_id = drill_videos.organization_id) and (membership.user_id = (select auth.uid())) and (membership.role = 'coach'::text) and (membership.status = 'active'::text)))))));

alter policy "linked families and team staff read attendance"
  on public.event_attendance
  using ((current_user_can_manage_team(team_id) or (exists ( select 1
   from player_guardians guardian
  where ((guardian.player_id = event_attendance.player_id) and (guardian.parent_user_id = (select auth.uid())) and (guardian.status = 'active'::text))))));

alter policy "guardians create own family handoff plans"
  on public.family_event_handoffs
  with check (((requested_by_user_id = (select auth.uid())) and (exists ( select 1
   from ((player_guardians guardian
     join players player on ((player.id = guardian.player_id)))
     join events event on ((event.id = family_event_handoffs.event_id)))
  where ((guardian.player_id = family_event_handoffs.player_id) and (guardian.parent_user_id = (select auth.uid())) and (guardian.status = 'active'::text) and (player.team_id = family_event_handoffs.team_id) and (event.team_id = family_event_handoffs.team_id))))));

alter policy "guardians read own family handoff plans"
  on public.family_event_handoffs
  using (((requested_by_user_id = (select auth.uid())) and (exists ( select 1
   from ((player_guardians guardian
     join players player on ((player.id = guardian.player_id)))
     join events event on ((event.id = family_event_handoffs.event_id)))
  where ((guardian.player_id = family_event_handoffs.player_id) and (guardian.parent_user_id = (select auth.uid())) and (guardian.status = 'active'::text) and (player.team_id = family_event_handoffs.team_id) and (event.team_id = family_event_handoffs.team_id))))));

alter policy "guardians update own family handoff plans"
  on public.family_event_handoffs
  using ((requested_by_user_id = (select auth.uid())))
  with check (((requested_by_user_id = (select auth.uid())) and (exists ( select 1
   from ((player_guardians guardian
     join players player on ((player.id = guardian.player_id)))
     join events event on ((event.id = family_event_handoffs.event_id)))
  where ((guardian.player_id = family_event_handoffs.player_id) and (guardian.parent_user_id = (select auth.uid())) and (guardian.status = 'active'::text) and (player.team_id = family_event_handoffs.team_id) and (event.team_id = family_event_handoffs.team_id))))));

alter policy "guardians and admins read family obligations"
  on public.family_obligations
  using (((guardian_user_id = (select auth.uid())) or current_user_is_org_admin(organization_id)));

alter policy "organization admins manage fee definitions"
  on public.fee_definitions
  using (current_user_is_org_admin(organization_id))
  with check ((current_user_is_org_admin(organization_id) and (created_by_user_id = (select auth.uid()))));

alter policy "coaches and admins manage game day resolution reviews"
  on public.game_day_resolution_reviews
  using (current_user_can_manage_team(team_id))
  with check ((current_user_can_manage_team(team_id) and (actor_user_id = (select auth.uid()))));

alter policy "team staff create media review history"
  on public.media_review_history
  with check (((reviewer_user_id = (select auth.uid())) and (exists ( select 1
   from media_items media
  where ((media.id = media_review_history.media_item_id) and current_user_can_manage_team(media.team_id))))));

alter policy "organization admins read mobile usage events"
  on public.mobile_usage_events
  using (((organization_id is null) or (exists ( select 1
   from organization_memberships membership
  where ((membership.organization_id = mobile_usage_events.organization_id) and (membership.user_id = (select auth.uid())) and (membership.role = 'admin'::text) and (membership.status = 'active'::text))))));

alter policy "users create own mobile usage events"
  on public.mobile_usage_events
  with check (((user_id is null) or (user_id = (select auth.uid()))));

-- 0002 declared this name with a trailing "s", but that UTF-8 identifier is
-- 64 bytes. PostgreSQL stores only the first 63 bytes, so the catalog name
-- intentionally ends in the singular "attempt".
alter policy "notification recipients and team managers read delivery attempt"
  on public.notification_delivery_attempts
  using ((exists ( select 1
   from notifications notification
  where ((notification.id = notification_delivery_attempts.notification_id) and ((notification.recipient_user_id = (select auth.uid())) or current_user_can_manage_team(notification.team_id))))));

alter policy "users manage own notification preferences"
  on public.notification_preferences
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "users can mark own notifications read"
  on public.notifications
  using ((recipient_user_id = (select auth.uid())))
  with check ((recipient_user_id = (select auth.uid())));

alter policy "users can read own notifications"
  on public.notifications
  using (((recipient_user_id = (select auth.uid())) or current_user_can_manage_team(team_id)));

alter policy "actors create scoped offline action receipts"
  on public.offline_action_receipts
  with check (((actor_user_id = (select auth.uid())) and (current_user_can_manage_team(team_id) or (exists ( select 1
   from (players player
     join player_guardians guardian on ((guardian.player_id = player.id)))
  where ((player.team_id = offline_action_receipts.team_id) and (guardian.parent_user_id = (select auth.uid())) and (guardian.status = 'active'::text)))))));

alter policy "actors read own offline action receipts"
  on public.offline_action_receipts
  using (((actor_user_id = (select auth.uid())) or current_user_can_manage_team(team_id) or current_user_is_org_admin(organization_id)));

alter policy "members can read their org memberships"
  on public.organization_memberships
  using (((user_id = (select auth.uid())) or current_user_is_org_admin(organization_id)));

alter policy "organization members can read organizations"
  on public.organizations
  using ((exists ( select 1
   from organization_memberships membership
  where ((membership.organization_id = organizations.id) and (membership.user_id = (select auth.uid())) and (membership.status = 'active'::text)))));

alter policy "parents read own replay engagement"
  on public.parent_replay_engagement
  using ((parent_user_id = (select auth.uid())));

alter policy "guardians and admins read payment evidence"
  on public.payment_evidence
  using ((current_user_is_org_admin(organization_id) or (exists ( select 1
   from family_obligations obligation
  where ((obligation.id = payment_evidence.family_obligation_id) and (obligation.guardian_user_id = (select auth.uid())))))));

alter policy "guardians and staff read media consent"
  on public.player_media_consents
  using (((guardian_user_id = (select auth.uid())) or current_user_can_manage_team(team_id) or current_user_is_org_admin(organization_id)));

alter policy "guardians manage own media consent"
  on public.player_media_consents
  using ((guardian_user_id = (select auth.uid())))
  with check (((guardian_user_id = (select auth.uid())) and (exists ( select 1
   from player_guardians guardian
  where ((guardian.player_id = player_media_consents.player_id) and (guardian.parent_user_id = (select auth.uid())) and (guardian.status = 'active'::text))))));

alter policy "coaches and admins manage practice run receipts"
  on public.practice_run_receipts
  using (current_user_can_manage_team(team_id))
  with check ((current_user_can_manage_team(team_id) and (coach_user_id = (select auth.uid()))));

alter policy "profiles can insert own profile"
  on public.profiles
  with check ((id = (select auth.uid())));

alter policy "profiles can update own basic profile"
  on public.profiles
  using ((id = (select auth.uid())))
  with check ((id = (select auth.uid())));

alter policy "users manage own push subscriptions"
  on public.push_subscriptions
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "parents and staff read rsvp change logs"
  on public.rsvp_change_logs
  using (((parent_user_id = (select auth.uid())) or (exists ( select 1
   from events event
  where ((event.id = rsvp_change_logs.event_id) and current_user_can_manage_team(event.team_id))))));

alter policy "parents insert own rsvp change logs"
  on public.rsvp_change_logs
  with check ((parent_user_id = (select auth.uid())));

alter policy "parents can upsert active linked child rsvps"
  on public.rsvps
  using (((parent_user_id = (select auth.uid())) and (exists ( select 1
   from ((player_guardians guardian
     join players player on ((player.id = guardian.player_id)))
     join events event on ((event.id = rsvps.event_id)))
  where ((guardian.player_id = rsvps.player_id) and (guardian.parent_user_id = (select auth.uid())) and (guardian.status = 'active'::text) and (player.team_id = event.team_id) and current_team_season_is_active(event.team_id))))))
  with check (((parent_user_id = (select auth.uid())) and (exists ( select 1
   from ((player_guardians guardian
     join players player on ((player.id = guardian.player_id)))
     join events event on ((event.id = rsvps.event_id)))
  where ((guardian.player_id = rsvps.player_id) and (guardian.parent_user_id = (select auth.uid())) and (guardian.status = 'active'::text) and (player.team_id = event.team_id) and current_team_season_is_active(event.team_id))))));

alter policy "members can read seasons"
  on public.seasons
  using ((exists ( select 1
   from organization_memberships membership
  where ((membership.organization_id = seasons.organization_id) and (membership.user_id = (select auth.uid())) and (membership.status = 'active'::text)))));

alter policy "parents and staff read support requests"
  on public.support_requests
  using (((parent_user_id = (select auth.uid())) or current_user_is_org_admin(organization_id) or ((team_id is not null) and current_user_can_manage_team(team_id))));

alter policy "parents create own support requests"
  on public.support_requests
  with check ((parent_user_id = (select auth.uid())));

alter policy "team members create chat attachments"
  on public.team_chat_attachments
  with check ((current_user_can_access_team(team_id) and (uploaded_by_user_id = (select auth.uid())) and (exists ( select 1
   from team_chat_messages message
  where ((message.id = team_chat_attachments.message_id) and (message.team_id = team_chat_attachments.team_id))))));

alter policy "users manage own chat reads"
  on public.team_chat_message_reads
  using (((user_id = (select auth.uid())) and (exists ( select 1
   from team_chat_messages message
  where ((message.id = team_chat_message_reads.message_id) and current_user_can_access_team(message.team_id))))))
  with check (((user_id = (select auth.uid())) and (exists ( select 1
   from team_chat_messages message
  where ((message.id = team_chat_message_reads.message_id) and current_user_can_access_team(message.team_id))))));

alter policy "authors can edit own visible chat messages"
  on public.team_chat_messages
  using (((author_user_id = (select auth.uid())) and (moderation_status = 'visible'::text)))
  with check (((author_user_id = (select auth.uid())) and current_user_can_access_team(team_id)));

alter policy "team members can create chat messages"
  on public.team_chat_messages
  with check ((current_user_can_access_team(team_id) and (author_user_id = (select auth.uid())) and (moderation_status = 'visible'::text)));

alter policy "users manage own chat reactions"
  on public.team_chat_reactions
  using (((user_id = (select auth.uid())) and (exists ( select 1
   from team_chat_messages message
  where ((message.id = team_chat_reactions.message_id) and current_user_can_access_team(message.team_id))))))
  with check (((user_id = (select auth.uid())) and (exists ( select 1
   from team_chat_messages message
  where ((message.id = team_chat_reactions.message_id) and current_user_can_access_team(message.team_id))))));

alter policy "team members create chat reports"
  on public.team_chat_reports
  with check ((current_user_can_access_team(team_id) and (reporter_user_id = (select auth.uid())) and (exists ( select 1
   from team_chat_messages message
  where ((message.id = team_chat_reports.message_id) and (message.team_id = team_chat_reports.team_id))))));

alter policy "members can read team memberships"
  on public.team_memberships
  using (((user_id = (select auth.uid())) or current_user_can_manage_team(team_id)));

alter policy "requesters and staff update volunteer transfers"
  on public.volunteer_transfer_requests
  using (((requested_by_user_id = (select auth.uid())) or current_user_can_manage_team(team_id)))
  with check (((requested_by_user_id = (select auth.uid())) or current_user_can_manage_team(team_id)));

alter policy "users and team staff read volunteer transfers"
  on public.volunteer_transfer_requests
  using (((requested_by_user_id = (select auth.uid())) or (requested_recipient_user_id = (select auth.uid())) or current_user_can_manage_team(team_id)));

alter policy "users request own volunteer transfers"
  on public.volunteer_transfer_requests
  with check (((requested_by_user_id = (select auth.uid())) and (exists ( select 1
   from team_memberships membership
  where ((membership.team_id = volunteer_transfer_requests.team_id) and (membership.user_id = (select auth.uid())) and (membership.status = 'active'::text))))));

alter policy "users and team staff read volunteer waitlists"
  on public.volunteer_waitlist_entries
  using (((user_id = (select auth.uid())) or current_user_can_manage_team(team_id)));

alter policy "users join own volunteer waitlists"
  on public.volunteer_waitlist_entries
  with check (((user_id = (select auth.uid())) and (exists ( select 1
   from team_memberships membership
  where ((membership.team_id = volunteer_waitlist_entries.team_id) and (membership.user_id = (select auth.uid())) and (membership.status = 'active'::text))))));

alter policy "users withdraw own volunteer waitlists"
  on public.volunteer_waitlist_entries
  using (((user_id = (select auth.uid())) or current_user_can_manage_team(team_id)))
  with check (((user_id = (select auth.uid())) or current_user_can_manage_team(team_id)));

commit;
