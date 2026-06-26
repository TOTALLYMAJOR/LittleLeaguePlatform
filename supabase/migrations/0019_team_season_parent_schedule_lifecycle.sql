-- Persist the remaining team/season, parent support, RSVP audit, and schedule
-- lifecycle records used by the production app surfaces.

alter table public.players
  add column if not exists roster_status text not null default 'active'
    check (roster_status in ('active', 'inactive', 'archived'));

create table if not exists public.rsvp_change_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  parent_user_id uuid not null references public.profiles(id) on delete cascade,
  previous_response text check (previous_response in ('going', 'not_going', 'maybe', 'cancelled')),
  next_response text not null check (next_response in ('going', 'not_going', 'maybe', 'cancelled')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  parent_user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null check (topic in ('schedule', 'rsvp', 'registration', 'media', 'notifications', 'other')),
  detail text not null,
  status text not null default 'open' check (status in ('open', 'in_review', 'closed')),
  context_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_support_requests_updated_at
  before update on public.support_requests
  for each row execute function public.touch_updated_at();

create index if not exists idx_players_roster_status on public.players(team_id, roster_status);
create index if not exists idx_rsvp_change_logs_parent on public.rsvp_change_logs(parent_user_id, created_at desc);
create index if not exists idx_support_requests_team_status on public.support_requests(team_id, status);

alter table public.rsvp_change_logs enable row level security;
alter table public.support_requests enable row level security;

create policy "parents and staff read rsvp change logs" on public.rsvp_change_logs
  for select using (
    parent_user_id = auth.uid()
    or exists (
      select 1
      from public.events event
      where event.id = rsvp_change_logs.event_id
        and public.current_user_can_manage_team(event.team_id)
    )
  );

create policy "parents insert own rsvp change logs" on public.rsvp_change_logs
  for insert with check (parent_user_id = auth.uid());

create policy "parents and staff read support requests" on public.support_requests
  for select using (
    parent_user_id = auth.uid()
    or public.current_user_is_org_admin(organization_id)
    or (team_id is not null and public.current_user_can_manage_team(team_id))
  );

create policy "parents create own support requests" on public.support_requests
  for insert with check (parent_user_id = auth.uid());

create policy "team staff update support requests" on public.support_requests
  for update using (
    public.current_user_is_org_admin(organization_id)
    or (team_id is not null and public.current_user_can_manage_team(team_id))
  ) with check (
    public.current_user_is_org_admin(organization_id)
    or (team_id is not null and public.current_user_can_manage_team(team_id))
  );
