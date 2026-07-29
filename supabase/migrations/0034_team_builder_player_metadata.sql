-- Team Builder player metadata for admin-only local preview planning.
-- This extends the existing team_build_plans table instead of creating a new
-- exposed table. Existing RLS remains the authority: organization admins manage
-- team build plans, and family-facing roster displays keep privacy-safe names.

alter table public.team_build_plans
  add column if not exists player_metadata jsonb not null default '{}'::jsonb,
  add column if not exists plan_constraints jsonb not null default '{}'::jsonb,
  add column if not exists metadata_review_notes text[] not null default '{}';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_build_plans_player_metadata_shape_check'
      and conrelid = 'public.team_build_plans'::regclass
  ) then
    alter table public.team_build_plans
      add constraint team_build_plans_player_metadata_shape_check
      check (
        jsonb_typeof(player_metadata) = 'object'
        and player_metadata::text !~* '"(birthdate|birth_date|date_of_birth|dob)"'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_build_plans_plan_constraints_shape_check'
      and conrelid = 'public.team_build_plans'::regclass
  ) then
    alter table public.team_build_plans
      add constraint team_build_plans_plan_constraints_shape_check
      check (jsonb_typeof(plan_constraints) = 'object');
  end if;
end $$;

create index if not exists idx_team_build_plans_player_metadata
  on public.team_build_plans
  using gin (player_metadata);

create index if not exists idx_team_build_plans_plan_constraints
  on public.team_build_plans
  using gin (plan_constraints);

alter table public.team_build_plans enable row level security;

comment on column public.team_build_plans.player_metadata is
  'Admin-only Team Builder review metadata keyed by player id: age band, cutoff-age label, evaluation rating/source, and review notes. Full birthdates are intentionally excluded.';

comment on column public.team_build_plans.plan_constraints is
  'Admin-only Team Builder constraint inputs such as sibling, guardian, friend-request, target-roster, age-band, and evaluation-balance settings.';

comment on column public.team_build_plans.metadata_review_notes is
  'Admin-visible review notes for Team Builder metadata readiness; not displayed on family roster surfaces.';
