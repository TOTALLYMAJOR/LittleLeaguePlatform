-- Family first-sign-in preferences.
-- The signed-in adult chooses these values. The RPC changes no schedule,
-- guardian, attendance, transportation, communication, or provider-delivery truth.

alter table public.profiles
  add column if not exists preferred_language text not null default 'en',
  add column if not exists translation_enabled boolean not null default false,
  add column if not exists shared_device_previews boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_preferred_language_format_check;
alter table public.profiles
  add constraint profiles_preferred_language_format_check
  check (preferred_language ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$');

create or replace function public.complete_family_first_sign_in(
  target_user_id uuid,
  selected_language text,
  selected_critical_channel text,
  selected_routine_channel text,
  selected_quiet_hours_start time,
  selected_quiet_hours_end time,
  selected_timezone text,
  enable_translation boolean,
  enable_shared_device_previews boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_team_id uuid;
  selected_organization_id uuid;
  completed_at timestamptz := now();
begin
  if selected_language !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then
    raise exception 'Preferred language format is invalid.';
  end if;
  if selected_critical_channel not in ('push', 'email', 'sms')
    or selected_routine_channel not in ('push', 'email', 'sms') then
    raise exception 'Notification channel is invalid.';
  end if;
  if length(trim(selected_timezone)) < 3 then
    raise exception 'Timezone is required.';
  end if;

  select membership.team_id, team.organization_id
  into selected_team_id, selected_organization_id
  from public.team_memberships membership
  join public.teams team on team.id = membership.team_id
  join public.seasons season on season.id = team.season_id
  where membership.user_id = target_user_id
    and membership.role = 'parent'
    and membership.status = 'active'
    and season.status = 'active'
  order by membership.created_at
  limit 1;

  if selected_team_id is null then
    raise exception 'Active parent team access is required.';
  end if;

  update public.profiles
  set preferred_language = selected_language,
      translation_enabled = enable_translation,
      shared_device_previews = enable_shared_device_previews,
      onboarding_completed_at = completed_at,
      updated_at = completed_at
  where id = target_user_id;

  delete from public.notification_preferences
  where user_id = target_user_id
    and team_id = selected_team_id
    and notification_type in ('event_cancelled', 'weather_alert', 'schedule_changed', 'parent_replay_ready');

  insert into public.notification_preferences (
    user_id, organization_id, team_id, channel, notification_type, enabled,
    quiet_hours_start, quiet_hours_end, timezone, opted_in_at
  )
  values
    (target_user_id, selected_organization_id, selected_team_id, selected_critical_channel, 'event_cancelled', true, selected_quiet_hours_start, selected_quiet_hours_end, selected_timezone, completed_at),
    (target_user_id, selected_organization_id, selected_team_id, selected_critical_channel, 'weather_alert', true, selected_quiet_hours_start, selected_quiet_hours_end, selected_timezone, completed_at),
    (target_user_id, selected_organization_id, selected_team_id, selected_routine_channel, 'schedule_changed', true, selected_quiet_hours_start, selected_quiet_hours_end, selected_timezone, completed_at),
    (target_user_id, selected_organization_id, selected_team_id, selected_routine_channel, 'parent_replay_ready', true, selected_quiet_hours_start, selected_quiet_hours_end, selected_timezone, completed_at);

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  )
  values (
    selected_organization_id,
    target_user_id,
    'family_first_sign_in_completed',
    'profile',
    target_user_id::text,
    'Family language, privacy preview, and notification preferences saved by the signed-in adult. No provider message was sent.'
  );

  return jsonb_build_object(
    'user_id', target_user_id,
    'team_id', selected_team_id,
    'organization_id', selected_organization_id,
    'completed_at', completed_at
  );
end;
$$;

revoke all on function public.complete_family_first_sign_in(uuid, text, text, text, time, time, text, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.complete_family_first_sign_in(uuid, text, text, text, time, time, text, boolean, boolean)
  to service_role;
