-- Team brand profile persistence, launch validation, and monitoring evidence.
-- Binary asset storage, email delivery, and push delivery remain provider-specific.

create table if not exists public.team_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  display_name text not null,
  short_name text not null,
  logo_url text,
  banner_image_url text,
  default_avatar_label text not null,
  primary_color text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  button_color text not null check (button_color ~ '^#[0-9A-Fa-f]{6}$'),
  hero_copy text not null,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  published_by_user_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id)
);

create table if not exists public.team_brand_surface_validation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  brand_profile_id uuid references public.team_brand_profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  coverage_percent integer not null check (coverage_percent between 0 and 100),
  surface_results jsonb not null,
  provider_boundary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.brand_asset_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  brand_profile_id uuid references public.team_brand_profiles(id) on delete set null,
  uploaded_by_user_id uuid not null references public.profiles(id) on delete restrict,
  asset_kind text not null check (asset_kind in ('logo', 'banner')),
  url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null
);

create table if not exists public.brand_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  brand_profile_id uuid references public.team_brand_profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'brand_profile_created',
    'brand_profile_updated',
    'brand_profile_published',
    'brand_asset_uploaded',
    'brand_asset_rejected',
    'brand_render_failed',
    'brand_fallback_used'
  )),
  surface text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.team_brand_profiles enable row level security;
alter table public.team_brand_surface_validation_runs enable row level security;
alter table public.brand_asset_uploads enable row level security;
alter table public.brand_monitoring_events enable row level security;

create policy "team members read published brand profiles" on public.team_brand_profiles
  for select using (
    status = 'published'
    and public.current_user_can_access_team(team_id)
  );

create policy "coaches and admins manage team brand profiles" on public.team_brand_profiles
  for all using (public.current_user_can_manage_team(team_id))
  with check (public.current_user_can_manage_team(team_id));

create policy "coaches and admins manage brand validation runs" on public.team_brand_surface_validation_runs
  for all using (public.current_user_can_manage_team(team_id))
  with check (public.current_user_can_manage_team(team_id));

create policy "coaches and admins manage brand asset uploads" on public.brand_asset_uploads
  for all using (
    (team_id is not null and public.current_user_can_manage_team(team_id))
    or public.current_user_is_org_admin(organization_id)
  )
  with check (
    (team_id is not null and public.current_user_can_manage_team(team_id))
    or public.current_user_is_org_admin(organization_id)
  );

create policy "organization admins read brand monitoring events" on public.brand_monitoring_events
  for select using (public.current_user_is_org_admin(organization_id));

create policy "coaches and admins create brand monitoring events" on public.brand_monitoring_events
  for insert with check (
    (team_id is not null and public.current_user_can_manage_team(team_id))
    or public.current_user_is_org_admin(organization_id)
  );

create index if not exists idx_team_brand_profiles_team on public.team_brand_profiles(team_id);
create index if not exists idx_team_brand_profiles_status on public.team_brand_profiles(organization_id, status);
create index if not exists idx_team_brand_surface_validation_runs_team on public.team_brand_surface_validation_runs(team_id, created_at desc);
create index if not exists idx_brand_asset_uploads_team on public.brand_asset_uploads(team_id, status);
create index if not exists idx_brand_monitoring_events_org_created on public.brand_monitoring_events(organization_id, created_at desc);
create index if not exists idx_brand_monitoring_events_type on public.brand_monitoring_events(event_type, created_at desc);

create trigger touch_team_brand_profiles_updated_at
  before update on public.team_brand_profiles
  for each row execute function public.touch_updated_at();
