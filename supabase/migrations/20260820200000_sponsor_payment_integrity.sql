-- Forward-only sponsor money-integrity correction for the Phase 1 revenue spine.
-- Previously applied migrations remain immutable. This migration repairs skipped legacy invoices,
-- binds every sponsor relationship to one organization, and makes webhook/manual writes atomic.

-- Stable provider-object replay protection. Stripe can describe one refund in both refund.created
-- and refund.updated events; only the refund object itself represents one monetary movement.
alter table public.sponsor_payment_ledger_entries
  add column if not exists provider_resource_id text;

create unique index if not exists uq_sponsor_payment_ledger_provider_resource
  on public.sponsor_payment_ledger_entries(provider, provider_resource_id)
  where provider_resource_id is not null;

alter table public.payment_evidence
  add column if not exists sponsorship_invoice_id uuid;

-- Composite parent keys allow foreign keys to prove the child row's organization, not merely that
-- a globally unique id exists somewhere.
alter table public.sponsors
  add constraint sponsors_id_organization_key unique (id, organization_id);
alter table public.sponsor_packages
  add constraint sponsor_packages_id_organization_key unique (id, organization_id);
alter table public.seasons
  add constraint seasons_id_organization_key unique (id, organization_id);
alter table public.sponsor_billing_records
  add constraint sponsor_billing_records_id_organization_key unique (id, organization_id);
alter table public.sponsorship_agreements
  add constraint sponsorship_agreements_id_organization_key unique (id, organization_id);
alter table public.sponsorship_invoices
  add constraint sponsorship_invoices_id_organization_key unique (id, organization_id);

alter table public.sponsorship_agreements
  add constraint sponsorship_agreements_sponsor_organization_fk
    foreign key (sponsor_id, organization_id)
    references public.sponsors(id, organization_id) on delete cascade,
  add constraint sponsorship_agreements_package_organization_fk
    foreign key (package_id, organization_id)
    references public.sponsor_packages(id, organization_id),
  add constraint sponsorship_agreements_season_organization_fk
    foreign key (season_id, organization_id)
    references public.seasons(id, organization_id) on delete cascade;

alter table public.sponsorship_invoices
  add constraint sponsorship_invoices_agreement_organization_fk
    foreign key (agreement_id, organization_id)
    references public.sponsorship_agreements(id, organization_id) on delete cascade,
  add constraint sponsorship_invoices_legacy_billing_organization_fk
    foreign key (legacy_billing_record_id, organization_id)
    references public.sponsor_billing_records(id, organization_id);

alter table public.sponsor_payment_ledger_entries
  add constraint sponsor_payment_ledger_invoice_organization_fk
    foreign key (invoice_id, organization_id)
    references public.sponsorship_invoices(id, organization_id) on delete cascade;

alter table public.payment_evidence
  add constraint payment_evidence_sponsor_invoice_organization_fk
    foreign key (sponsorship_invoice_id, organization_id)
    references public.sponsorship_invoices(id, organization_id) on delete set null (sponsorship_invoice_id);

-- Every legacy billing row needs an agreement. Fail loudly if a historical billing row belongs to
-- an organization with no season; silently omitting commercial history is not acceptable.
do $$
begin
  if exists (
    select 1
    from public.sponsor_billing_records record
    where not exists (
      select 1 from public.seasons season where season.organization_id = record.organization_id
    )
  ) then
    raise exception 'Cannot recover sponsor billing rows for an organization without a season';
  end if;
end;
$$;

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
  record.organization_id,
  sponsor.id,
  sponsor.package_id,
  season.id,
  case sponsor.status when 'active' then 'active' when 'expired' then 'expired' else 'draft' end,
  coalesce(sponsor.starts_at, season.starts_at),
  coalesce(sponsor.ends_at, season.ends_at)
from public.sponsor_billing_records record
join public.sponsors sponsor
  on sponsor.id = record.sponsor_id
 and sponsor.organization_id = record.organization_id
join lateral (
  select candidate.id, candidate.starts_at, candidate.ends_at
  from public.seasons candidate
  where candidate.organization_id = record.organization_id
  order by (candidate.status = 'active') desc, candidate.starts_at desc, candidate.id
  limit 1
) season on true
where not exists (
  select 1
  from public.sponsorship_agreements agreement
  where agreement.sponsor_id = record.sponsor_id
    and agreement.organization_id = record.organization_id
    and agreement.status <> 'cancelled'
);

-- Migration 20260819161500 used ON CONFLICT DO NOTHING on invoice_number. Recover every skipped
-- legacy row. A UUID-based suffix is deterministic; the loop only adds a numeric suffix if a
-- human-created invoice already occupies that exact recovery number.
do $$
declare
  record_row record;
  candidate_number text;
  suffix integer;
begin
  for record_row in
    select
      billing.*,
      agreement.id as agreement_id
    from public.sponsor_billing_records billing
    join lateral (
      select candidate.id
      from public.sponsorship_agreements candidate
      where candidate.sponsor_id = billing.sponsor_id
        and candidate.organization_id = billing.organization_id
        and candidate.status <> 'cancelled'
      order by
        case candidate.status
          when 'active' then 0 when 'signed' then 1 when 'sent' then 2
          when 'draft' then 3 when 'expired' then 4 else 5
        end,
        candidate.created_at desc,
        candidate.id
      limit 1
    ) agreement on true
    where not exists (
      select 1
      from public.sponsorship_invoices existing
      where existing.legacy_billing_record_id = billing.id
    )
    order by billing.organization_id, billing.created_at, billing.id
  loop
    candidate_number := record_row.invoice_reference;
    if exists (
      select 1 from public.sponsorship_invoices invoice
      where invoice.organization_id = record_row.organization_id
        and invoice.invoice_number = candidate_number
    ) then
      candidate_number := record_row.invoice_reference || '-legacy-' || replace(record_row.id::text, '-', '');
      suffix := 1;
      while exists (
        select 1 from public.sponsorship_invoices invoice
        where invoice.organization_id = record_row.organization_id
          and invoice.invoice_number = candidate_number
      ) loop
        suffix := suffix + 1;
        candidate_number := record_row.invoice_reference || '-legacy-'
          || replace(record_row.id::text, '-', '') || '-' || suffix::text;
      end loop;
    end if;

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
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      payment_link_issued_at,
      created_by_user_id
    ) values (
      record_row.organization_id,
      record_row.agreement_id,
      candidate_number,
      record_row.amount_cents,
      record_row.currency,
      case record_row.status
        when 'payment_recorded' then 'paid'
        when 'invoice_ready' then 'issued'
        else 'draft'
      end,
      case when record_row.status = 'draft' then null else record_row.created_at end,
      record_row.id,
      record_row.stripe_product_id,
      record_row.stripe_price_id,
      record_row.stripe_invoice_id,
      record_row.stripe_checkout_session_id,
      record_row.stripe_payment_intent_id,
      record_row.payment_link_issued_at,
      record_row.created_by_user_id
    );
  end loop;
end;
$$;

update public.payment_evidence evidence
set sponsorship_invoice_id = invoice.id
from public.sponsorship_invoices invoice
where evidence.sponsorship_invoice_id is null
  and evidence.sponsor_billing_record_id = invoice.legacy_billing_record_id
  and evidence.organization_id = invoice.organization_id;

insert into public.sponsor_payment_ledger_entries (
  organization_id,
  invoice_id,
  kind,
  amount_cents,
  currency,
  provider,
  provider_event_id,
  provider_resource_id,
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
  'legacy-billing-record:' || invoice.legacy_billing_record_id::text,
  coalesce(record.confirmed_at, record.updated_at, now()),
  'Recovered from sponsor_billing_records payment proof. Processor settlement was not re-verified.'
from public.sponsorship_invoices invoice
join public.sponsor_billing_records record
  on record.id = invoice.legacy_billing_record_id
 and record.organization_id = invoice.organization_id
where invoice.status = 'paid'
on conflict (provider, provider_event_id) do nothing;

update public.sponsorship_agreements agreement
set amount_cents = totals.amount_cents
from (
  select invoice.agreement_id, sum(invoice.amount_cents)::integer as amount_cents
  from public.sponsorship_invoices invoice
  where invoice.status <> 'void'
  group by invoice.agreement_id
) totals
where agreement.id = totals.agreement_id
  and agreement.amount_cents is distinct from totals.amount_cents;

create or replace function public.record_sponsor_stripe_event(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_legacy_billing_record_id uuid,
  p_stripe_account_id text,
  p_stripe_event_id text,
  p_provider_event_type text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_kind text,
  p_amount_cents integer,
  p_currency text,
  p_occurred_at timestamptz,
  p_provider_resource_id text,
  p_evidence_json jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_row public.sponsorship_invoices%rowtype;
  ledger_id uuid;
  evidence_id uuid;
  paid_cents bigint;
  refunded_cents bigint;
  disputed_cents bigint;
  next_status text;
begin
  if trim(coalesce(p_stripe_event_id, '')) = ''
    or trim(coalesce(p_provider_resource_id, '')) = ''
    or p_amount_cents < 0
    or p_currency <> 'usd'
    or p_kind not in ('PaymentSucceeded', 'PaymentFailed', 'RefundSucceeded', 'DisputeOpened') then
    raise exception 'Invalid sponsor Stripe event payload' using errcode = '22023';
  end if;

  select * into invoice_row
  from public.sponsorship_invoices invoice
  where invoice.id = p_invoice_id
    and invoice.organization_id = p_organization_id
    and (p_legacy_billing_record_id is null or invoice.legacy_billing_record_id = p_legacy_billing_record_id)
  for update;

  if not found then
    raise exception 'Sponsor invoice does not match organization or legacy billing record'
      using errcode = '23503';
  end if;

  insert into public.payment_evidence (
    organization_id,
    sponsorship_invoice_id,
    sponsor_billing_record_id,
    stripe_account_id,
    stripe_event_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    amount_cents,
    currency,
    provider_event_type,
    signature_verified_at,
    evidence_json
  ) values (
    invoice_row.organization_id,
    invoice_row.id,
    invoice_row.legacy_billing_record_id,
    p_stripe_account_id,
    p_stripe_event_id,
    p_checkout_session_id,
    p_payment_intent_id,
    p_amount_cents,
    p_currency,
    p_provider_event_type,
    now(),
    coalesce(p_evidence_json, '{}'::jsonb)
  )
  on conflict (stripe_event_id) do nothing
  returning id into evidence_id;

  if evidence_id is null then
    select existing.id into evidence_id
    from public.payment_evidence existing
    where existing.stripe_event_id = p_stripe_event_id
      and existing.organization_id = invoice_row.organization_id;

    if evidence_id is null then
      raise exception 'Stripe event id belongs to another organization' using errcode = '23505';
    end if;

    update public.payment_evidence
    set sponsorship_invoice_id = coalesce(sponsorship_invoice_id, invoice_row.id),
        sponsor_billing_record_id = coalesce(sponsor_billing_record_id, invoice_row.legacy_billing_record_id),
        stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id),
        stripe_checkout_session_id = coalesce(stripe_checkout_session_id, p_checkout_session_id)
    where id = evidence_id
      and (sponsorship_invoice_id is null or sponsorship_invoice_id = invoice_row.id);

    if not found then
      raise exception 'Stripe event evidence conflicts with another sponsor invoice' using errcode = '23505';
    end if;
  end if;

  insert into public.sponsor_payment_ledger_entries (
    organization_id,
    invoice_id,
    kind,
    amount_cents,
    currency,
    provider,
    provider_event_id,
    provider_resource_id,
    occurred_at
  ) values (
    invoice_row.organization_id,
    invoice_row.id,
    p_kind,
    p_amount_cents,
    p_currency,
    'stripe',
    p_stripe_event_id,
    p_provider_resource_id,
    p_occurred_at
  )
  on conflict do nothing
  returning id into ledger_id;

  if ledger_id is null and not exists (
    select 1
    from public.sponsor_payment_ledger_entries existing
    where existing.provider = 'stripe'
      and (existing.provider_event_id = p_stripe_event_id or existing.provider_resource_id = p_provider_resource_id)
      and existing.invoice_id = invoice_row.id
      and existing.organization_id = invoice_row.organization_id
      and existing.kind = p_kind
      and existing.amount_cents = p_amount_cents
  ) then
    raise exception 'Stripe event conflicts with an existing sponsor ledger resource'
      using errcode = '23505';
  end if;

  select
    coalesce(sum(entry.amount_cents) filter (where entry.kind = 'PaymentSucceeded'), 0),
    coalesce(sum(entry.amount_cents) filter (where entry.kind = 'RefundSucceeded'), 0),
    coalesce(sum(entry.amount_cents) filter (where entry.kind = 'DisputeOpened'), 0)
  into paid_cents, refunded_cents, disputed_cents
  from public.sponsor_payment_ledger_entries entry
  where entry.invoice_id = invoice_row.id;

  next_status := case
    when paid_cents > 0 and refunded_cents >= paid_cents then 'refunded'
    when greatest(0, paid_cents - refunded_cents) >= invoice_row.amount_cents then 'paid'
    when greatest(0, paid_cents - refunded_cents) > 0 then 'partially_paid'
    when invoice_row.status = 'draft' and p_kind = 'PaymentFailed' then 'draft'
    else 'issued'
  end;

  update public.sponsorship_invoices
  set stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      status = next_status,
      issued_at = case when next_status = 'draft' then issued_at else coalesce(issued_at, p_occurred_at) end
  where id = invoice_row.id;

  if invoice_row.legacy_billing_record_id is not null then
    update public.sponsor_billing_records
    set stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
        stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
        processing_at = case when p_kind = 'PaymentFailed' then now() else null end,
        failed_at = case when p_kind = 'PaymentFailed' then now() else failed_at end,
        confirmed_at = case when next_status = 'paid' and disputed_cents = 0 then coalesce(confirmed_at, p_occurred_at) else null end,
        status = case when next_status = 'paid' and disputed_cents = 0 then 'payment_recorded' else 'invoice_ready' end,
        payment_proof_status = case when next_status = 'paid' and disputed_cents = 0 then 'paid' else 'awaiting_invoice' end
    where id = invoice_row.legacy_billing_record_id
      and organization_id = invoice_row.organization_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'replayed', ledger_id is null,
    'message', case when ledger_id is null
      then 'Stripe sponsor resource already committed. Nothing was counted twice.'
      else 'Verified Stripe sponsor evidence and ledger entry committed atomically.'
    end
  );
end;
$$;

revoke all on function public.record_sponsor_stripe_event(
  uuid, uuid, uuid, text, text, text, text, text, text, integer, text, timestamptz, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_sponsor_stripe_event(
  uuid, uuid, uuid, text, text, text, text, text, text, integer, text, timestamptz, text, jsonb
) to service_role;

create or replace function public.record_manual_sponsor_payment(
  p_invoice_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_amount_cents integer,
  p_occurred_at timestamptz,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_row public.sponsorship_invoices%rowtype;
  ledger_id uuid;
  resource_id text;
  paid_cents bigint;
  refunded_cents bigint;
  disputed_cents bigint;
  next_status text;
begin
  if p_amount_cents <= 0
    or trim(coalesce(p_idempotency_key, '')) = ''
    or length(trim(p_idempotency_key)) > 200 then
    return jsonb_build_object('ok', false, 'message', 'Manual payment amount and idempotency key are invalid.');
  end if;

  select * into invoice_row
  from public.sponsorship_invoices invoice
  where invoice.id = p_invoice_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'The sponsor invoice could not be found.');
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = invoice_row.organization_id
      and membership.user_id = p_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'message', 'Only active organization admins can record a sponsor payment.');
  end if;

  resource_id := 'manual:' || trim(p_idempotency_key);
  insert into public.sponsor_payment_ledger_entries (
    organization_id,
    invoice_id,
    kind,
    amount_cents,
    currency,
    provider,
    provider_event_id,
    provider_resource_id,
    occurred_at,
    recorded_by_user_id,
    note
  ) values (
    invoice_row.organization_id,
    invoice_row.id,
    'PaymentSucceeded',
    p_amount_cents,
    'usd',
    'manual',
    resource_id,
    resource_id,
    p_occurred_at,
    p_actor_user_id,
    p_note
  )
  on conflict do nothing
  returning id into ledger_id;

  if ledger_id is null then
    if exists (
      select 1
      from public.sponsor_payment_ledger_entries existing
      where existing.provider = 'manual'
        and existing.provider_resource_id = resource_id
        and existing.invoice_id = invoice_row.id
        and existing.amount_cents = p_amount_cents
        and existing.recorded_by_user_id = p_actor_user_id
    ) then
      return jsonb_build_object('ok', true, 'replayed', true);
    end if;
    return jsonb_build_object('ok', false, 'message', 'Idempotency key conflicts with another manual payment.');
  end if;

  -- The audit insert shares this function transaction. Any failure rolls the new ledger row back.
  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    invoice_row.organization_id,
    p_actor_user_id,
    'sponsor_manual_payment_recorded',
    'sponsorship_invoice',
    invoice_row.id::text,
    format(
      'Manual sponsor payment of %s cents recorded against invoice %s. No processor settlement evidence is claimed.',
      p_amount_cents,
      invoice_row.id
    )
  );

  select
    coalesce(sum(entry.amount_cents) filter (where entry.kind = 'PaymentSucceeded'), 0),
    coalesce(sum(entry.amount_cents) filter (where entry.kind = 'RefundSucceeded'), 0),
    coalesce(sum(entry.amount_cents) filter (where entry.kind = 'DisputeOpened'), 0)
  into paid_cents, refunded_cents, disputed_cents
  from public.sponsor_payment_ledger_entries entry
  where entry.invoice_id = invoice_row.id;

  next_status := case
    when paid_cents > 0 and refunded_cents >= paid_cents then 'refunded'
    when greatest(0, paid_cents - refunded_cents) >= invoice_row.amount_cents then 'paid'
    when greatest(0, paid_cents - refunded_cents) > 0 then 'partially_paid'
    else 'issued'
  end;

  update public.sponsorship_invoices
  set status = next_status,
      issued_at = coalesce(issued_at, p_occurred_at)
  where id = invoice_row.id;

  if invoice_row.legacy_billing_record_id is not null then
    update public.sponsor_billing_records
    set confirmed_at = case when next_status = 'paid' and disputed_cents = 0 then coalesce(confirmed_at, p_occurred_at) else null end,
        status = case when next_status = 'paid' and disputed_cents = 0 then 'payment_recorded' else 'invoice_ready' end,
        payment_proof_status = case when next_status = 'paid' and disputed_cents = 0 then 'paid' else 'awaiting_invoice' end
    where id = invoice_row.legacy_billing_record_id
      and organization_id = invoice_row.organization_id;
  end if;

  return jsonb_build_object('ok', true, 'replayed', false);
end;
$$;

revoke all on function public.record_manual_sponsor_payment(uuid, uuid, text, integer, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.record_manual_sponsor_payment(uuid, uuid, text, integer, timestamptz, text)
  to service_role;
