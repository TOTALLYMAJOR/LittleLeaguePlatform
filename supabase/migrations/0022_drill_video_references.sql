create table if not exists public.drill_video_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('youtube')),
  external_channel_id text not null,
  title text not null,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'blocked')),
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_channel_id)
);

create table if not exists public.drill_videos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('youtube', 'vimeo', 'native', 'licensed')),
  external_video_id text not null,
  canonical_url text not null,
  title text not null,
  thumbnail_url text not null,
  sport text not null,
  skill_category text not null,
  age_band text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  coach_instructions text,
  safety_notes text,
  source_channel text,
  source_channel_id text,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'retired')),
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  review_notes text,
  made_for_kids_status boolean,
  embeddable boolean not null default false,
  last_validated_at timestamptz,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_video_id),
  constraint drill_videos_approved_requires_validation
    check (
      approval_status <> 'approved'
      or (
        approved_by_user_id is not null
        and approved_at is not null
        and embeddable = true
        and last_validated_at is not null
      )
    )
);

create table if not exists public.drill_video_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  drill_video_id uuid not null references public.drill_videos(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  assigned_by_user_id uuid not null references public.profiles(id) on delete restrict,
  usage_context text not null default 'practice_plan' check (usage_context in ('practice_plan', 'practice_recap')),
  notes text,
  visible_to_families boolean not null default false check (visible_to_families = false),
  created_at timestamptz not null default now()
);

create trigger touch_drill_video_sources_updated_at
  before update on public.drill_video_sources
  for each row execute function public.touch_updated_at();

create trigger touch_drill_videos_updated_at
  before update on public.drill_videos
  for each row execute function public.touch_updated_at();

create index if not exists idx_drill_videos_org_status
  on public.drill_videos(organization_id, approval_status, provider);

create index if not exists idx_drill_videos_source_channel
  on public.drill_videos(organization_id, provider, source_channel_id);

create index if not exists idx_drill_video_assignments_team
  on public.drill_video_assignments(team_id, created_at desc);

create unique index if not exists idx_drill_video_assignments_unique_target
  on public.drill_video_assignments(
    drill_video_id,
    team_id,
    coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid),
    usage_context
  );

alter table public.drill_video_sources enable row level security;
alter table public.drill_videos enable row level security;
alter table public.drill_video_assignments enable row level security;

create policy "org admins manage drill video sources" on public.drill_video_sources
  for all using (public.current_user_is_org_admin(organization_id))
  with check (public.current_user_is_org_admin(organization_id));

create policy "coaches read reviewed drill video sources" on public.drill_video_sources
  for select using (
    public.current_user_is_org_admin(organization_id)
    or exists (
      select 1
      from public.teams team
      join public.team_memberships membership
        on membership.team_id = team.id
      where team.organization_id = drill_video_sources.organization_id
        and membership.user_id = auth.uid()
        and membership.role = 'coach'
        and membership.status = 'active'
    )
  );

create policy "coaches submit drill videos for their organizations" on public.drill_videos
  for insert with check (
    provider = 'youtube'
    and (
      public.current_user_is_org_admin(organization_id)
      or exists (
        select 1
        from public.teams team
        join public.team_memberships membership
          on membership.team_id = team.id
        where team.organization_id = drill_videos.organization_id
          and membership.user_id = auth.uid()
          and membership.role = 'coach'
          and membership.status = 'active'
      )
    )
  );

create policy "coaches read approved drill videos" on public.drill_videos
  for select using (
    public.current_user_is_org_admin(organization_id)
    or created_by_user_id = auth.uid()
    or (
      approval_status = 'approved'
      and exists (
        select 1
        from public.teams team
        join public.team_memberships membership
          on membership.team_id = team.id
        where team.organization_id = drill_videos.organization_id
          and membership.user_id = auth.uid()
          and membership.role = 'coach'
          and membership.status = 'active'
      )
    )
  );

create policy "org admins review drill videos" on public.drill_videos
  for update using (public.current_user_is_org_admin(organization_id))
  with check (public.current_user_is_org_admin(organization_id));

create policy "coaches manage coach-only drill assignments" on public.drill_video_assignments
  for all using (
    visible_to_families = false
    and public.current_user_can_manage_team(team_id)
  ) with check (
    visible_to_families = false
    and public.current_user_can_manage_team(team_id)
  );
