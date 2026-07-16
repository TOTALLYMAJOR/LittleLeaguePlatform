-- Notification delivery execution metadata.
-- Attempts continue using the existing queued/sent/failed/suppressed status
-- contract. Retry and dead-letter behavior is represented by metadata only.

alter table public.notification_delivery_attempts
  add column if not exists idempotency_key text,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists next_attempt_at timestamptz default now(),
  add column if not exists retry_count integer not null default 0 check (retry_count >= 0),
  add column if not exists max_retries integer not null default 3 check (max_retries >= 0),
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists provider_status text,
  add column if not exists provider_response_json jsonb not null default '{}'::jsonb,
  add column if not exists last_webhook_event_id text;

update public.notification_delivery_attempts
set idempotency_key = notification_id::text || ':' || provider
where idempotency_key is null;

alter table public.notification_delivery_attempts
  alter column idempotency_key set not null;

create unique index if not exists idx_notification_delivery_attempts_idempotency
  on public.notification_delivery_attempts(idempotency_key);

create index if not exists idx_notification_delivery_attempts_worker_claim
  on public.notification_delivery_attempts(status, next_attempt_at)
  where status = 'queued' and dead_lettered_at is null;

create index if not exists idx_notification_delivery_attempts_dead_letter
  on public.notification_delivery_attempts(dead_lettered_at)
  where dead_lettered_at is not null;
