-- Sponsor fulfillment: what a league promised, and what it can prove it delivered.
-- ADR 0003 (docs/adr/0003-sponsor-revenue-spine-persistence.md), Phase 2 of
-- docs/plans/20260819-feature-sponsor-program.md.
--
-- The point of this migration is a negative one. Neither table has a state, status, or delivered
-- column. A requirement records what was sold; evidence records an observation that it happened.
-- Deliverable state is folded from those two facts at read time by deriveDeliverableState in
-- lib/domain/sponsor-program.ts, which makes `delivered` unreachable without an evidence row
-- because there is no column an optimistic write could set instead.
--
-- Sponsors are commercial third parties. Nothing here references a player, guardian, profile other
-- than the capturing staff member, team membership, or media row.

-- ---------------------------------------------------------------------------
-- 0. Composite-key target on the Phase 1 spine.
--
--    Every table below stores organization_id and is read through an RLS policy that trusts it.
--    A single-column foreign key to the parent leaves that trust unbacked: a writer that bypasses
--    RLS -- and service_role always does -- can point a child row at a parent in another
--    organization while stamping its own. The composite foreign keys added in sections 1 and 2
--    make that unrepresentable, and they need a matching unique key here to reference.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_sponsorship_agreements_id_organization'
      and conrelid = 'public.sponsorship_agreements'::regclass
  ) then
    alter table public.sponsorship_agreements
      add constraint uq_sponsorship_agreements_id_organization unique (id, organization_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Requirements - one row per benefit the package promised.
-- ---------------------------------------------------------------------------

create table if not exists public.sponsor_fulfillment_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Composite rather than a plain reference to sponsorship_agreements(id): a requirement cannot
  -- name an agreement that belongs to a different organization than the one it stamps on itself.
  agreement_id uuid not null,
  kind text not null check (kind in (
    'league_homepage_logo',
    'sport_homepage_logo',
    'team_page_logo',
    'sponsor_directory',
    'newsletter_placement',
    'field_banner',
    'season_recap'
  )),
  label text not null check (length(trim(label)) > 0),
  required_quantity integer not null default 1 check (required_quantity > 0),
  -- Blocked is the one deliverable condition a human asserts rather than one the system observes,
  -- so it is stored. It is a reason with a timestamp, not a workflow state: it suppresses a
  -- deliverable claim, and it can never produce `delivered`.
  blocked_at timestamptz,
  blocked_reason text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    blocked_at is null
    or (blocked_reason is not null and length(trim(blocked_reason)) > 0)
  ),
  unique (agreement_id, kind),
  -- The key evidence points at. It is what lets a child row's organization be checked against its
  -- parent's by the database rather than by the adapter that wrote it.
  unique (id, organization_id),
  foreign key (agreement_id, organization_id)
    references public.sponsorship_agreements(id, organization_id)
    on delete cascade
);

create index if not exists idx_sponsor_fulfillment_requirements_agreement
  on public.sponsor_fulfillment_requirements(agreement_id, kind);

create index if not exists idx_sponsor_fulfillment_requirements_organization
  on public.sponsor_fulfillment_requirements(organization_id, created_at desc);

create trigger touch_sponsor_fulfillment_requirements_updated_at
  before update on public.sponsor_fulfillment_requirements
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Evidence - an observation that a promised benefit actually ran.
--
--    observed_at is when the staff member saw it, which is not when they recorded it. The two are
--    stored separately so a recap can report the real exposure window rather than the data-entry
--    date.
-- ---------------------------------------------------------------------------

create table if not exists public.sponsor_fulfillment_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Composite for the same reason as the requirement above: evidence cannot be attached to a
  -- requirement in another organization, whatever organization_id the writer supplies.
  requirement_id uuid not null,
  kind text not null check (kind in (
    'screenshot',
    'link',
    'event_recap',
    'attendance_summary',
    'campaign_note'
  )),
  observed_at timestamptz not null,
  artifact_url text check (artifact_url is null or artifact_url ~* '^https://'),
  note text,
  captured_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  -- A screenshot or a link is a pointer to an artifact; without the pointer it proves nothing.
  -- A recap, attendance summary, or campaign note is a written observation, so it requires a note.
  check (kind not in ('screenshot', 'link') or artifact_url is not null),
  check (
    kind in ('screenshot', 'link')
    or (note is not null and length(trim(note)) > 0)
  ),
  foreign key (requirement_id, organization_id)
    references public.sponsor_fulfillment_requirements(id, organization_id)
    on delete cascade
);

-- (requirement_id, observed_at, id) is the exact read order the adapter uses. The id column is in
-- the index because two pieces of evidence observed in the same minute must still list in a stable
-- order.
create index if not exists idx_sponsor_fulfillment_evidence_requirement
  on public.sponsor_fulfillment_evidence(requirement_id, observed_at, id);

create index if not exists idx_sponsor_fulfillment_evidence_organization
  on public.sponsor_fulfillment_evidence(organization_id, observed_at desc);

-- Evidence dated in the future is not an observation, it is a plan. The route rejects it first;
-- this trigger is what makes the rule true for every connection, including the service-role
-- adapter client. A check constraint cannot express it because now() is not immutable.
--
-- The one-minute allowance absorbs clock skew between the application host and the database. It is
-- deliberately far smaller than any window in which a scheduling mistake could hide.
create or replace function public.sponsor_fulfillment_evidence_not_future()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.observed_at > now() + interval '1 minute' then
    raise exception
      'sponsor fulfillment evidence cannot be observed in the future'
      using errcode = '22007';
  end if;

  return new;
end;
$$;

create trigger sponsor_fulfillment_evidence_not_future
  before insert or update on public.sponsor_fulfillment_evidence
  for each row execute function public.sponsor_fulfillment_evidence_not_future();

-- Append-only, enforced at the table exactly as sponsor_payment_ledger_entries is in Phase 1.
--
-- Withholding the grant is not sufficient on its own. A grant is additive, so withholding update
-- and delete does not withdraw a privilege service_role already holds through the default
-- privileges Supabase applies to new tables in this schema; section 3 revokes those explicitly, and
-- this trigger is what makes the rule hold for the table owner and any future grant as well.
--
-- Evidence is the only thing standing between a deliverable and an unproven `delivered` claim, so
-- an observation is corrected by recording a further observation, never by editing the record of
-- what was seen.
--
-- Referential cascade cleanup is still permitted, on the same test Phase 1 uses: when the parent
-- requirement, organization, or agreement is deleted, PostgreSQL removes the child rows after the
-- parent row is gone, so the lookup below finds nothing and the delete passes. A direct delete,
-- where the parent still exists, is rejected.
create or replace function public.sponsor_fulfillment_evidence_append_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (
      select 1 from public.sponsor_fulfillment_requirements where id = old.requirement_id
    ) then
      return old;
    end if;

    raise exception
      'sponsor_fulfillment_evidence is append-only; record a further observation instead of deleting one'
      using errcode = '42501';
  end if;

  raise exception
    'sponsor_fulfillment_evidence is append-only; % is not permitted', tg_op
    using errcode = '42501';
end;
$$;

create trigger sponsor_fulfillment_evidence_append_only
  before update or delete on public.sponsor_fulfillment_evidence
  for each row execute function public.sponsor_fulfillment_evidence_append_only();

-- ---------------------------------------------------------------------------
-- 3. Row level security, mirroring the Phase 1 spine: organization-admin reads, and writes only
--    through the service-role adapter after requireActiveOrganizationAdmin has authorized the
--    actor.
-- ---------------------------------------------------------------------------

alter table public.sponsor_fulfillment_requirements enable row level security;
alter table public.sponsor_fulfillment_evidence enable row level security;

revoke all on table public.sponsor_fulfillment_requirements from public, anon, authenticated;
revoke all on table public.sponsor_fulfillment_evidence from public, anon, authenticated;

grant select on table public.sponsor_fulfillment_requirements to authenticated;
grant select on table public.sponsor_fulfillment_evidence to authenticated;

grant select, insert, update, delete on table public.sponsor_fulfillment_requirements to service_role;

-- Evidence is append-only. The revoke is what withdraws the update and delete privileges
-- service_role already holds through this schema's default privileges; the grant that follows only
-- adds, it never takes away, so the revoke has to come first. The trigger in section 2 enforces the
-- same rule for the table owner, which no grant can restrain.
revoke update, delete on table public.sponsor_fulfillment_evidence from service_role;
grant select, insert on table public.sponsor_fulfillment_evidence to service_role;

create policy "organization admins read sponsor fulfillment requirements"
  on public.sponsor_fulfillment_requirements
  for select
  to authenticated
  using (public.current_user_is_org_admin(organization_id));

create policy "organization admins read sponsor fulfillment evidence"
  on public.sponsor_fulfillment_evidence
  for select
  to authenticated
  using (public.current_user_is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- 4. Backfill requirements from the package benefits each live agreement was sold against.
--
--    distinct on collapses a package that lists the same benefit kind twice: on conflict cannot
--    see rows inserted by the same statement, so the duplicate has to be removed before the insert
--    rather than absorbed after it.
-- ---------------------------------------------------------------------------

insert into public.sponsor_fulfillment_requirements (
  organization_id,
  agreement_id,
  kind,
  label,
  required_quantity
)
select distinct on (benefit.agreement_id, benefit.kind)
  benefit.organization_id,
  benefit.agreement_id,
  benefit.kind,
  benefit.label,
  benefit.required_quantity
from (
  select
    agreement.organization_id,
    agreement.id as agreement_id,
    entry->>'kind' as kind,
    coalesce(nullif(trim(entry->>'label'), ''), entry->>'kind') as label,
    case
      when jsonb_typeof(entry->'quantity') = 'number' then greatest(1, (entry->>'quantity')::integer)
      else 1
    end as required_quantity
  from public.sponsorship_agreements agreement
  join public.sponsor_packages package on package.id = agreement.package_id
  cross join lateral jsonb_array_elements(package.benefits) as entry
  where agreement.status <> 'cancelled'
    and entry->>'kind' in (
      'league_homepage_logo',
      'sport_homepage_logo',
      'team_page_logo',
      'sponsor_directory',
      'newsletter_placement',
      'field_banner',
      'season_recap'
    )
) benefit
on conflict (agreement_id, kind) do nothing;
