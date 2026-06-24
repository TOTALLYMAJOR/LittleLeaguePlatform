-- Mobile App Decision metrics for PWA usage and push-notification demand.

create table if not exists public.mobile_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'install_prompt_shown',
    'install_prompt_accepted',
    'install_prompt_dismissed',
    'standalone_launch',
    'push_permission_requested',
    'native_app_interest'
  )),
  route_path text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_mobile_usage_events_type_created
  on public.mobile_usage_events(event_type, created_at desc);

alter table public.mobile_usage_events enable row level security;

drop policy if exists "users create own mobile usage events" on public.mobile_usage_events;
create policy "users create own mobile usage events" on public.mobile_usage_events
  for insert with check (user_id is null or user_id = auth.uid());

drop policy if exists "organization admins read mobile usage events" on public.mobile_usage_events;
create policy "organization admins read mobile usage events" on public.mobile_usage_events
  for select using (
    organization_id is null
    or exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = mobile_usage_events.organization_id
        and membership.user_id = auth.uid()
        and membership.role = 'admin'
        and membership.status = 'active'
    )
  );
