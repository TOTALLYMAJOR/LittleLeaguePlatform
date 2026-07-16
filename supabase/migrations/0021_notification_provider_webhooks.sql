-- Notification provider webhook ingestion and dedupe.

create table if not exists public.notification_provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('sendgrid', 'twilio')),
  event_id text not null,
  provider_message_id text,
  notification_id uuid references public.notifications(id) on delete set null,
  attempt_id uuid references public.notification_delivery_attempts(id) on delete set null,
  event_type text not null,
  provider_status text not null,
  notification_status text not null check (notification_status in ('pending', 'sent', 'failed', 'read')),
  payload_json jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

create index if not exists idx_notification_provider_webhook_events_attempt
  on public.notification_provider_webhook_events(attempt_id, received_at desc);

create index if not exists idx_notification_provider_webhook_events_notification
  on public.notification_provider_webhook_events(notification_id, received_at desc);

alter table public.notification_provider_webhook_events enable row level security;

create policy "team managers read notification provider webhooks" on public.notification_provider_webhook_events
  for select using (
    exists (
      select 1
      from public.notifications notification
      where notification.id = notification_provider_webhook_events.notification_id
        and public.current_user_can_manage_team(notification.team_id)
    )
    or exists (
      select 1
      from public.notification_delivery_attempts attempt
      join public.notifications notification on notification.id = attempt.notification_id
      where attempt.id = notification_provider_webhook_events.attempt_id
        and public.current_user_can_manage_team(notification.team_id)
    )
  );
