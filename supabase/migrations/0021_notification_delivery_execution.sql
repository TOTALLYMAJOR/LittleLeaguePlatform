-- Add execution metadata for approval-gated notification delivery attempts.
-- Dead-letter handling uses failed attempts with dead_lettered_at, not a new
-- workflow status.

alter table public.notification_delivery_attempts
  add column if not exists idempotency_key text,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retries integer not null default 3,
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists provider_status text,
  add column if not exists provider_response_json jsonb not null default '{}'::jsonb,
  add column if not exists last_webhook_event_id text;

create unique index if not exists idx_notification_delivery_attempts_idempotency
  on public.notification_delivery_attempts(idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_notification_delivery_attempts_worker_claim
  on public.notification_delivery_attempts(status, next_attempt_at, locked_at)
  where status = 'queued';

create index if not exists idx_notification_delivery_attempts_dead_letter
  on public.notification_delivery_attempts(dead_lettered_at)
  where dead_lettered_at is not null;
