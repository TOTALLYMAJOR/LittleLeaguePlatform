-- Allow coach/admin weekly updates to persist provider-safe team broadcast drafts.

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in (
    'schedule_changed',
    'event_cancelled',
    'new_event',
    'invite_sent',
    'invite_recovered',
    'parent_replay_ready',
    'team_broadcast'
  ));
