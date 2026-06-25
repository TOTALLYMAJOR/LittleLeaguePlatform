-- Sponsor billing proof and automatic team-builder plan persistence.
-- These tables keep money/proof workflows admin-only and separate from
-- child-facing sponsor placement or roster display until reviewed.

create table if not exists public.sponsor_billing_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  stripe_product_id text,
  stripe_price_id text,
  stripe_invoice_id text,
  invoice_reference text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'draft' check (status in ('draft', 'invoice_ready', 'payment_recorded')),
  payment_proof_status text not null default 'not_requested' check (payment_proof_status in ('not_requested', 'awaiting_invoice', 'paid')),
  public_display_separated boolean not null default true,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_build_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  division text not null,
  target_roster_size integer not null check (target_roster_size > 0),
  status text not null default 'preview' check (status in ('preview', 'edited', 'approved', 'published')),
  constraints jsonb not null default '{}'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  warnings text[] not null default '{}',
  created_by_user_id uuid references public.profiles(id) on delete set null,
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sponsor_billing_records_sponsor_id on public.sponsor_billing_records(sponsor_id);
create index if not exists idx_team_build_plans_org_season_division on public.team_build_plans(organization_id, season_id, division);

create trigger touch_sponsor_billing_records_updated_at
  before update on public.sponsor_billing_records
  for each row execute function public.touch_updated_at();

create trigger touch_team_build_plans_updated_at
  before update on public.team_build_plans
  for each row execute function public.touch_updated_at();

alter table public.sponsor_billing_records enable row level security;
alter table public.team_build_plans enable row level security;

create policy "organization admins manage sponsor billing records" on public.sponsor_billing_records
  for all using (public.current_user_is_org_admin(organization_id))
  with check (public.current_user_is_org_admin(organization_id));

create policy "organization admins manage team build plans" on public.team_build_plans
  for all using (public.current_user_is_org_admin(organization_id))
  with check (public.current_user_is_org_admin(organization_id));
