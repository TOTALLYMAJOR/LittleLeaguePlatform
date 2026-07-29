-- Guardian verification hardening.
-- A registration email match is a correlation signal only. Durable guardian
-- access still requires an active organization-admin review with evidence.

create or replace function public.reviewer_can_manage_registration(
  target_registration_request_id uuid,
  reviewer_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.registration_requests request
    join public.organization_memberships membership
      on membership.organization_id = request.organization_id
     and membership.user_id = reviewer_user_id
     and membership.role = 'admin'
     and membership.status = 'active'
    where request.id = target_registration_request_id
  );
$$;

-- Existing action history is retained. New approval/grant actions must carry
-- review evidence, so direct RPC callers cannot bypass the application note.
alter table public.registration_approval_actions
  add constraint registration_approval_actions_evidence_note_check
  check (
    action not in ('approved', 'created_player', 'created_guardian', 'created_membership', 'invite_queued')
    or length(trim(coalesce(note, ''))) >= 10
  ) not valid;
