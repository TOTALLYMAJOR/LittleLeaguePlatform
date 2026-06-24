-- Provider Integrations V2: approval-gated notification delivery attempts.

alter table public.notifications
  add column if not exists provider_approval_status text not null default 'pending'
    check (provider_approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

create index if not exists idx_notifications_provider_approval
  on public.notifications(team_id, provider_approval_status, status);
