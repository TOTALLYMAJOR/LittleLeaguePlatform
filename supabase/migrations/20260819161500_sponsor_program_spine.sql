-- Sponsor revenue spine: Sponsor -> Agreement -> Package -> Invoice -> append-only Payment Ledger.
-- ADR 0003 (docs/adr/0003-sponsor-revenue-spine-persistence.md).
--
-- LeaguePilot owns agreement status, amount, paid total, outstanding balance, and active/expired
-- state. A payment processor supplies settlement evidence only. Balances are never stored: they are
-- folded from the ledger on read by lib/domain/sponsor-program.ts.
--
-- Live charge collection remains gated by the existing payment gate. A league that has not enabled
-- a processor records a cheque as a ledger entry with provider = 'manual'.
--
-- sponsors.status keeps its existing pending/active/expired values and continues to mean
-- business-entity state. Deal state now lives on sponsorship_agreements.status. No sponsor-facing
-- workflow state is stored anywhere; it is derived.

-- ---------------------------------------------------------------------------
-- 1. Adopt the existing sponsor_packages table rather than creating a second one.
--    Before this migration it was written only by scripts/bootstrap-demo-tenant.mjs and read by
--    no application code.
-- ---------------------------------------------------------------------------

alter table public.sponsor_packages
  add column if not exists season_id uuid references public.seasons(id) on delete cascade,
  add column if not exists currency text not null default 'usd';

alter table public.sponsor_packages
  drop constraint if exists sponsor_packages_currency_check;
alter table public.sponsor_packages
  add constraint sponsor_packages_currency_check check (currency = 'usd');

alter table public.sponsor_packages
  drop constraint if exists sponsor_packages_benefits_is_array;
alter table public.sponsor_packages
  add constraint sponsor_packages_benefits_is_array
  check (jsonb_typeof(benefits) = 'array');

create index if not exists idx_sponsor_packages_org_season
  on public.sponsor_packages(organization_id, season_id);

-- ---------------------------------------------------------------------------
-- 2. Agreements - the per-season deal.
-- ---------------------------------------------------------------------------

create table if not exists public.sponsorship_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  package_id uuid references public.sponsor_packages(id) on delete set null,
  season_id uuid not null references public.seasons(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'signed', 'active', 'expired', 'cancelled')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  starts_at timestamptz,
  ends_at timestamptz,
  signed_at timestamptz,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

-- A sponsor may hold at most one live agreement per season. Cancelled agreements are excluded so a
-- deal can be re-cut after cancellation without deleting history.
create unique index if not exists uq_sponsorship_agreements_sponsor_season_live
  on public.sponsorship_agreements(sponsor_id, season_id)
  where status <> 'cancelled';

create index if not exists idx_sponsorship_agreements_org_season
  on public.sponsorship_agreements(organization_id, season_id);

create index if not exists idx_sponsorship_agreements_sponsor
  on public.sponsorship_agreements(sponsor_id, created_at desc);

create trigger touch_sponsorship_agreements_updated_at
  before update on public.sponsorship_agreements
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Invoices - money owed against one agreement.
--    legacy_billing_record_id preserves the link to sponsor_billing_records so the existing gated
--    Stripe Checkout path keeps working through the migration window.
-- ---------------------------------------------------------------------------

create table if not exists public.sponsorship_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agreement_id uuid not null references public.sponsorship_agreements(id) on delete cascade,
  invoice_number text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'partially_paid', 'paid', 'void', 'refunded')),
  issued_at timestamptz,
  legacy_billing_record_id uuid references public.sponsor_billing_records(id) on delete set null,
  stripe_product_id text,
  stripe_price_id text,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  payment_link_issued_at timestamptz,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create index if not exists idx_sponsorship_invoices_agreement
  on public.sponsorship_invoices(agreement_id, created_at desc);

create unique index if not exists uq_sponsorship_invoices_legacy_billing_record
  on public.sponsorship_invoices(legacy_billing_record_id)
  where legacy_billing_record_id is not null;

create trigger touch_sponsorship_invoices_updated_at
  before update on public.sponsorship_invoices
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Payment ledger - append-only. This is the only source of paid/outstanding/refund/dispute
--    totals. There is deliberately no balance column anywhere in this schema.
--
--    unique (provider, provider_event_id) is the replay guard: a redelivered processor event
--    inserts nothing and the adapter treats the conflict as success.
-- ---------------------------------------------------------------------------

create table if not exists public.sponsor_payment_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.sponsorship_invoices(id) on delete cascade,
  kind text not null
    check (kind in ('PaymentSucceeded', 'PaymentFailed', 'RefundSucceeded', 'DisputeOpened')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  provider text not null check (provider in ('stripe', 'manual')),
  provider_event_id text not null check (length(trim(provider_event_id)) > 0),
  occurred_at timestamptz not null default now(),
  recorded_by_user_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists idx_sponsor_payment_ledger_invoice
  on public.sponsor_payment_ledger_entries(invoice_id, occurred_at);

create index if not exists idx_sponsor_payment_ledger_organization
  on public.sponsor_payment_ledger_entries(organization_id, occurred_at desc);

-- Append-only is enforced at the table, not only in policy. RLS alone is insufficient because
-- createSupabaseAdminClient connects as service_role, which bypasses row level security entirely.
--
-- Referential cascade cleanup is still permitted: when a parent invoice, organization, or season is
-- deleted, PostgreSQL removes the child rows after the parent row is gone, so the parent lookup
-- below finds nothing and the delete is allowed through. A direct delete, where the parent still
-- exists, is rejected.
create or replace function public.sponsor_payment_ledger_append_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (
      select 1 from public.sponsorship_invoices where id = old.invoice_id
    ) then
      return old;
    end if;

    raise exception
      'sponsor_payment_ledger_entries is append-only; delete a ledger entry by voiding the invoice instead'
      using errcode = '42501';
  end if;

  raise exception
    'sponsor_payment_ledger_entries is append-only; % is not permitted', tg_op
    using errcode = '42501';
end;
$$;

create trigger sponsor_payment_ledger_entries_append_only
  before update or delete on public.sponsor_payment_ledger_entries
  for each row execute function public.sponsor_payment_ledger_append_only();

-- ---------------------------------------------------------------------------
-- 5. Row level security. Reads are organization-admin scoped; writes travel through the
--    service-role adapter after requireActiveOrganizationAdmin has authorized the actor.
-- ---------------------------------------------------------------------------

alter table public.sponsorship_agreements enable row level security;
alter table public.sponsorship_invoices enable row level security;
alter table public.sponsor_payment_ledger_entries enable row level security;

revoke all on table public.sponsorship_agreements from public, anon, authenticated;
revoke all on table public.sponsorship_invoices from public, anon, authenticated;
revoke all on table public.sponsor_payment_ledger_entries from public, anon, authenticated;

grant select on table public.sponsorship_agreements to authenticated;
grant select on table public.sponsorship_invoices to authenticated;
grant select on table public.sponsor_payment_ledger_entries to authenticated;

grant select, insert, update, delete on table public.sponsorship_agreements to service_role;
grant select, insert, update, delete on table public.sponsorship_invoices to service_role;

-- Deliberately no update or delete grant: the ledger is append-only for every connection.
grant select, insert on table public.sponsor_payment_ledger_entries to service_role;

create policy "organization admins read sponsorship agreements"
  on public.sponsorship_agreements
  for select
  to authenticated
  using (public.current_user_is_org_admin(organization_id));

create policy "organization admins read sponsorship invoices"
  on public.sponsorship_invoices
  for select
  to authenticated
  using (public.current_user_is_org_admin(organization_id));

create policy "organization admins read sponsor payment ledger entries"
  on public.sponsor_payment_ledger_entries
  for select
  to authenticated
  using (public.current_user_is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- 6. Backfill. Every sponsor that is currently active or pending receives an agreement for the
--    organization's active season, so no existing sponsor loses its deal record when deal state
--    moves off sponsors.status.
--
--    getSponsorPlacement and its five siblings still read sponsors.status, and this migration
--    changes neither that column's constraint nor any stored value, so public placement output is
--    unchanged. The output comparison in lib/domain/__tests__ guards that for future work.
-- ---------------------------------------------------------------------------

insert into public.sponsorship_agreements (
  organization_id,
  sponsor_id,
  package_id,
  season_id,
  status,
  starts_at,
  ends_at
)
select
  sponsor.organization_id,
  sponsor.id,
  sponsor.package_id,
  season.id,
  case sponsor.status
    when 'active' then 'active'
    when 'expired' then 'expired'
    else 'draft'
  end,
  coalesce(sponsor.starts_at, season.starts_at),
  coalesce(sponsor.ends_at, season.ends_at)
from public.sponsors sponsor
join lateral (
  select s.id, s.starts_at, s.ends_at
  from public.seasons s
  where s.organization_id = sponsor.organization_id
  order by (s.status = 'active') desc, s.starts_at desc
  limit 1
) season on true
where not exists (
  select 1
  from public.sponsorship_agreements existing
  where existing.sponsor_id = sponsor.id
    and existing.season_id = season.id
    and existing.status <> 'cancelled'
);

-- Carry forward existing sponsor billing proof records as invoices against the backfilled
-- agreements. Stripe identifiers are preserved so an in-flight Checkout session is never orphaned.
insert into public.sponsorship_invoices (
  organization_id,
  agreement_id,
  invoice_number,
  amount_cents,
  currency,
  status,
  issued_at,
  legacy_billing_record_id,
  stripe_product_id,
  stripe_price_id,
  stripe_invoice_id,
  created_by_user_id
)
select
  record.organization_id,
  agreement.id,
  record.invoice_reference,
  record.amount_cents,
  record.currency,
  case record.status
    when 'payment_recorded' then 'paid'
    when 'invoice_ready' then 'issued'
    else 'draft'
  end,
  case when record.status = 'draft' then null else record.created_at end,
  record.id,
  record.stripe_product_id,
  record.stripe_price_id,
  record.stripe_invoice_id,
  record.created_by_user_id
from public.sponsor_billing_records record
join public.sponsorship_agreements agreement
  on agreement.sponsor_id = record.sponsor_id
 and agreement.organization_id = record.organization_id
 and agreement.status <> 'cancelled'
where not exists (
  select 1
  from public.sponsorship_invoices existing
  where existing.legacy_billing_record_id = record.id
)
on conflict (organization_id, invoice_number) do nothing;

-- Migrated invoices that were already marked paid need a ledger entry, otherwise the folded total
-- would contradict the invoice status the league already saw.
insert into public.sponsor_payment_ledger_entries (
  organization_id,
  invoice_id,
  kind,
  amount_cents,
  currency,
  provider,
  provider_event_id,
  occurred_at,
  note
)
select
  invoice.organization_id,
  invoice.id,
  'PaymentSucceeded',
  invoice.amount_cents,
  invoice.currency,
  'manual',
  'legacy-billing-record:' || invoice.legacy_billing_record_id::text,
  coalesce(record.confirmed_at, record.updated_at, now()),
  'Migrated from sponsor_billing_records payment proof. Processor settlement evidence was not re-verified during migration.'
from public.sponsorship_invoices invoice
join public.sponsor_billing_records record
  on record.id = invoice.legacy_billing_record_id
where invoice.status = 'paid'
on conflict (provider, provider_event_id) do nothing;

-- Agreement amounts follow the invoice that was raised against them.
update public.sponsorship_agreements agreement
set amount_cents = invoice.amount_cents
from public.sponsorship_invoices invoice
where invoice.agreement_id = agreement.id
  and agreement.amount_cents = 0
  and invoice.amount_cents > 0;
