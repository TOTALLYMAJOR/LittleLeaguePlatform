-- Team logo metadata. Binary upload/storage is provider-specific and remains
-- outside this table; records are reviewed before use in team branding.

create table if not exists public.team_logo_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  uploaded_by_user_id uuid not null references public.profiles(id) on delete restrict,
  url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  policy_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null
);

alter table public.team_logo_assets enable row level security;

create policy "organization admins manage team logo assets" on public.team_logo_assets
  for all using (public.current_user_is_org_admin(organization_id))
  with check (public.current_user_is_org_admin(organization_id));

create policy "team members read approved team logo assets" on public.team_logo_assets
  for select using (
    status = 'approved'
    and team_id is not null
    and public.current_user_can_access_team(team_id)
  );
