-- Sponsor fulfillment evidence capture: one atomic, replay-safe write.
--
-- Follow-up to 20260819190000_sponsor_fulfillment_evidence.sql, closing two findings from the
-- 2026-08-19 review of Phase 2 (docs/plans/20260819-feature-sponsor-program.md).
--
-- 1. The adapter wrote evidence and its audit event as two independent inserts and ignored the
--    audit result, so an admin-sensitive write could succeed while its audit trail silently did
--    not. Evidence is append-only, so a failed audit could not be undone afterwards either.
-- 2. Evidence carried no natural key, so a retried request -- the response lost, the button
--    pressed twice -- recorded a second observation. Because delivered quantity is a count of
--    evidence rows, one observation retried twice could satisfy a requirement promising two.
--
-- Both are fixed here rather than in the adapter, because only the database can make the two
-- inserts one transaction and only a constraint can make the retry a no-op for every writer.

-- ---------------------------------------------------------------------------
-- 1. The natural key of an observation.
--
--    The same staff member recording the same kind of proof, for the same requirement, of the same
--    artifact or note, at the same observed moment, is one observation however many times it is
--    submitted. Two genuinely different observations differ in at least one of those columns --
--    most obviously observed_at, which is the moment the benefit was seen.
--
--    `nulls not distinct` is what makes this hold for written evidence, where artifact_url is null,
--    and for pointer evidence, where note is null. Without it PostgreSQL treats every null as
--    unique and the constraint would never fire on exactly the rows it exists to catch.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_sponsor_fulfillment_evidence_observation'
      and conrelid = 'public.sponsor_fulfillment_evidence'::regclass
  ) then
    alter table public.sponsor_fulfillment_evidence
      add constraint uq_sponsor_fulfillment_evidence_observation
      unique nulls not distinct (requirement_id, kind, observed_at, artifact_url, note);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Capture, as one transaction.
--
--    Authority is re-derived here against the requirement's own organization rather than trusted
--    from the caller. The adapter checks it too; this is the copy that holds when a writer reaches
--    the database another way, which service_role always can.
--
--    A replay returns the observation that already exists, with ok true and replayed true, so a
--    retried request is indistinguishable from the first at the call site and still writes nothing
--    twice. The audit event is written only on a genuine first capture: replaying a request is not
--    a new administrative action.
-- ---------------------------------------------------------------------------

create or replace function public.record_sponsor_fulfillment_evidence(
  p_requirement_id uuid,
  p_actor_user_id uuid,
  p_kind text,
  p_observed_at timestamptz,
  p_artifact_url text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  requirement_row public.sponsor_fulfillment_requirements%rowtype;
  evidence_id uuid;
begin
  select * into requirement_row
  from public.sponsor_fulfillment_requirements
  where id = p_requirement_id;

  -- A requirement that does not exist and a requirement the actor may not touch return the same
  -- answer. Distinguishing them would let an unauthorized caller test whether an id is real.
  if requirement_row.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'Active organization admin access is required to record fulfillment evidence.'
    );
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = requirement_row.organization_id
      and membership.user_id = p_actor_user_id
      and membership.role = 'admin'
      and membership.status = 'active'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'Active organization admin access is required to record fulfillment evidence.'
    );
  end if;

  insert into public.sponsor_fulfillment_evidence (
    organization_id,
    requirement_id,
    kind,
    observed_at,
    artifact_url,
    note,
    captured_by_user_id
  )
  values (
    requirement_row.organization_id,
    requirement_row.id,
    p_kind,
    p_observed_at,
    p_artifact_url,
    p_note,
    p_actor_user_id
  )
  on conflict on constraint uq_sponsor_fulfillment_evidence_observation do nothing
  returning id into evidence_id;

  if evidence_id is null then
    select id into evidence_id
    from public.sponsor_fulfillment_evidence
    where requirement_id = requirement_row.id
      and kind = p_kind
      and observed_at = p_observed_at
      and artifact_url is not distinct from p_artifact_url
      and note is not distinct from p_note;

    return jsonb_build_object(
      'ok', true,
      'replayed', true,
      'evidence_id', evidence_id,
      'blocked', requirement_row.blocked_at is not null,
      'requirement_label', requirement_row.label
    );
  end if;

  -- Same transaction as the evidence row. If this insert raises, the observation is rolled back
  -- with it, so there is no evidence the audit trail cannot account for.
  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  )
  values (
    requirement_row.organization_id,
    p_actor_user_id,
    'sponsor_fulfillment_evidence_captured',
    'sponsor_fulfillment_requirement',
    -- audit_events.target_id is text, so the cast is written out rather than left to an
    -- implicit assignment conversion.
    requirement_row.id::text,
    format(
      '%s evidence observed at %s recorded for "%s". Delivery state is folded from evidence and is not stored.',
      p_kind,
      p_observed_at,
      requirement_row.label
    )
  );

  return jsonb_build_object(
    'ok', true,
    'replayed', false,
    'evidence_id', evidence_id,
    'blocked', requirement_row.blocked_at is not null,
    'requirement_label', requirement_row.label
  );
end;
$$;

revoke all on function public.record_sponsor_fulfillment_evidence(uuid, uuid, text, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.record_sponsor_fulfillment_evidence(uuid, uuid, text, timestamptz, text, text)
  to service_role;
