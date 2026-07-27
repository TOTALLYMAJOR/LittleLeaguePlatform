-- Bind SMS attempts to a concrete transport, preserve ambiguous request
-- outcomes for reconciliation, and keep provider STOP state durable without
-- storing raw phone numbers.

alter table public.notification_delivery_attempts
  add column if not exists transport_provider text,
  add column if not exists request_outcome text,
  add column if not exists reconciliation_required_at timestamptz;

alter table public.notification_delivery_attempts
  drop constraint if exists notification_delivery_attempts_transport_provider_check,
  add constraint notification_delivery_attempts_transport_provider_check
    check (
      transport_provider is null
      or transport_provider in ('sendgrid', 'twilio', 'pingram', 'web_push')
    );

alter table public.notification_delivery_attempts
  drop constraint if exists notification_delivery_attempts_request_outcome_check,
  add constraint notification_delivery_attempts_request_outcome_check
    check (
      request_outcome is null
      or request_outcome in (
        'not_attempted',
        'suppressed',
        'provider_accepted',
        'rejected',
        'indeterminate'
      )
    );

create unique index if not exists idx_notification_delivery_attempts_transport_message
  on public.notification_delivery_attempts(transport_provider, provider_message_id)
  where transport_provider is not null and provider_message_id is not null;

alter table public.provider_webhook_events
  add column if not exists event_type text,
  add column if not exists provider_message_id text;

create table if not exists public.sms_contact_suppressions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_fingerprint text not null,
  state text not null default 'suppressed'
    check (state in ('suppressed', 'subscribed')),
  source text not null
    check (source in ('pingram_webhook', 'user_preference', 'admin')),
  provider text not null
    check (provider in ('pingram', 'twilio', 'leaguepilot')),
  provider_event_id text,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, contact_fingerprint)
);

create index if not exists idx_sms_contact_suppressions_lookup
  on public.sms_contact_suppressions(organization_id, user_id, contact_fingerprint, state);

alter table public.sms_contact_suppressions enable row level security;

drop policy if exists "users and organization admins read sms suppressions"
  on public.sms_contact_suppressions;
create policy "users and organization admins read sms suppressions"
  on public.sms_contact_suppressions
  for select
  using (
    user_id = (select auth.uid())
    or public.current_user_is_org_admin(organization_id)
  );

revoke all on table public.sms_contact_suppressions from anon;
grant select on table public.sms_contact_suppressions to authenticated;
grant all on table public.sms_contact_suppressions to service_role;
