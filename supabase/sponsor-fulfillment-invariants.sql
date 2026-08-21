-- Sponsor fulfillment invariants.
--
-- Read-only. Run against any target with psql to check the claims Phase 2 of
-- docs/plans/20260819-feature-sponsor-program.md makes about sponsor delivery. Every query must
-- return zero rows. A non-empty result names the exact rows that break the invariant.
--
-- The headline invariant -- "no deliverable reports delivered without an evidence row" -- cannot be
-- written as a row filter on a state column, because ADR 0003 deliberately leaves no such column
-- to filter on. Invariant 1 checks that absence directly; invariant 2 lists the requirements that
-- a correct reader must therefore never show as delivered.

-- 1. No fulfillment table stores a deliverable state, delivered count, or delivered timestamp.
--    While this returns zero rows, `delivered` is only reachable through evidence.
select
  table_name,
  column_name,
  'stored deliverable state' as violation
from information_schema.columns
where table_schema = 'public'
  and table_name in ('sponsor_fulfillment_requirements', 'sponsor_fulfillment_evidence')
  and (
    column_name in (
      'status',
      'state',
      'delivery_state',
      'deliverable_state',
      'fulfillment_status',
      'delivered_at',
      'delivered_quantity',
      'is_delivered'
    )
    or column_name like 'delivered%'
  );

-- 2. Requirements with no evidence. These are the rows that must never render as delivered on any
--    admin or sponsor-facing surface. This is a report, not a defect: it is the fulfillment gap a
--    league still has to close, and it is expected to be non-empty mid-season.
--
--    Uncomment to review; it is left commented so the file as a whole is a zero-row check.
-- select
--   requirement.organization_id,
--   requirement.agreement_id,
--   requirement.id as requirement_id,
--   requirement.label
-- from public.sponsor_fulfillment_requirements requirement
-- where not exists (
--   select 1
--   from public.sponsor_fulfillment_evidence evidence
--   where evidence.requirement_id = requirement.id
-- );

-- 3. No evidence is dated in the future. A plan is not an observation.
select
  id as evidence_id,
  requirement_id,
  observed_at,
  'future observation' as violation
from public.sponsor_fulfillment_evidence
where observed_at > now() + interval '1 minute';

-- 4. Evidence never crosses a tenant boundary from its requirement.
select
  evidence.id as evidence_id,
  evidence.organization_id as evidence_organization_id,
  requirement.organization_id as requirement_organization_id,
  'cross-organization evidence' as violation
from public.sponsor_fulfillment_evidence evidence
join public.sponsor_fulfillment_requirements requirement
  on requirement.id = evidence.requirement_id
where evidence.organization_id <> requirement.organization_id;

-- 5. Requirements never cross a tenant boundary from their agreement.
select
  requirement.id as requirement_id,
  requirement.organization_id as requirement_organization_id,
  agreement.organization_id as agreement_organization_id,
  'cross-organization requirement' as violation
from public.sponsor_fulfillment_requirements requirement
join public.sponsorship_agreements agreement
  on agreement.id = requirement.agreement_id
where requirement.organization_id <> agreement.organization_id;

-- 6. Pointer evidence always carries its artifact, and written evidence always carries its note.
--    The table constrains this; the query proves the constraint was never dropped.
select
  id as evidence_id,
  kind,
  'evidence with no artifact or observation' as violation
from public.sponsor_fulfillment_evidence
where (kind in ('screenshot', 'link') and artifact_url is null)
   or (kind not in ('screenshot', 'link') and coalesce(trim(note), '') = '');
