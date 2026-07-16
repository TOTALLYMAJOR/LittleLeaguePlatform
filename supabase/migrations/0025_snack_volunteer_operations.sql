-- Snack and volunteer operations hardening: caps, reminder drafts, and
-- controlled unclaim/cancellation metadata.

alter table public.snack_schedule_slots
  add column if not exists slot_cap integer not null default 1 check (slot_cap between 1 and 10),
  add column if not exists reminder_draft_count integer not null default 0,
  add column if not exists reminder_last_drafted_at timestamptz,
  add column if not exists unclaimed_at timestamptz,
  add column if not exists unclaimed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_reason text;

alter table public.volunteer_signups
  add column if not exists role_cap integer not null default 1 check (role_cap between 1 and 20),
  add column if not exists reminder_draft_count integer not null default 0,
  add column if not exists reminder_last_drafted_at timestamptz,
  add column if not exists unclaimed_at timestamptz,
  add column if not exists unclaimed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_reason text;

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
    'team_broadcast',
    'weather_alert',
    'chat_announcement',
    'volunteer_reminder',
    'snack_reminder'
  ));

create index if not exists idx_snack_schedule_slots_caps
  on public.snack_schedule_slots(team_id, event_id, status, slot_cap);

create index if not exists idx_volunteer_signups_caps
  on public.volunteer_signups(team_id, event_id, role, status, role_cap);
