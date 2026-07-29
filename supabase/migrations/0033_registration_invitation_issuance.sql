-- Prepare one deliverable, fragment-carried invitation as part of the same
-- transaction that approves a registration request. The service creates the
-- raw secret; PostgreSQL receives only its SHA-256 hash.

alter table public.registration_approval_actions
  drop constraint if exists registration_approval_actions_action_check;

alter table public.registration_approval_actions
  add constraint registration_approval_actions_action_check
  check (
    action in (
      'approved',
      'rejected',
      'matched_existing_player',
      'created_player',
      'created_guardian',
      'created_membership',
      'invite_queued',
      'invitation_issued'
    )
  );

alter table public.registration_approval_actions
  drop constraint if exists registration_approval_actions_evidence_note_check;

alter table public.registration_approval_actions
  add constraint registration_approval_actions_evidence_note_check
  check (
    action not in (
      'approved',
      'created_player',
      'created_guardian',
      'created_membership',
      'invite_queued',
      'invitation_issued'
    )
    or length(trim(coalesce(note, ''))) >= 10
  ) not valid;

-- Registration review is performed through server routes that derive the
-- reviewer from the verified session. Direct Data API execution would let a
-- caller supply another profile id, so every review RPC remains service-only.
revoke all on function public.reviewer_can_manage_registration(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reviewer_can_manage_registration(uuid, uuid)
  to service_role;

revoke all on function public.approve_registration_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.approve_registration_request(uuid, uuid, text)
  to service_role;

revoke all on function public.reject_registration_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.reject_registration_request(uuid, uuid, text)
  to service_role;

create or replace function public.approve_registration_request_with_invitation(
  target_registration_request_id uuid,
  reviewer_user_id uuid,
  review_note text,
  target_invite_token_hash text,
  target_invite_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  approval_result jsonb;
  created_invite_id uuid;
  request_organization_id uuid;
begin
  if target_invite_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitation credential must be a SHA-256 hash.';
  end if;
  if target_invite_expires_at <= now()
    or target_invite_expires_at > now() + interval '10 days' then
    raise exception 'Invitation expiry must be within 10 days.';
  end if;

  approval_result := public.approve_registration_request(
    target_registration_request_id,
    reviewer_user_id,
    review_note
  );
  created_invite_id := nullif(approval_result ->> 'parent_invite_id', '')::uuid;

  if created_invite_id is not null then
    update public.parent_invites invite
    set invite_token_hash = target_invite_token_hash,
        expires_at = target_invite_expires_at,
        delivery_status = 'queued',
        sent_count = 0,
        last_sent_at = null,
        resend_timestamps = '{}'
    where invite.id = created_invite_id
      and invite.status = 'pending'
      and invite.accepted_at is null
    returning invite.organization_id into request_organization_id;
    if not found then
      raise exception 'Approved invitation could not be prepared. No registration records were changed.';
    end if;

    insert into public.registration_approval_actions (
      registration_request_id, organization_id, team_id, reviewed_by_user_id,
      action, result_json, note
    )
    select
      request.id, request.organization_id, request.team_id, reviewer_user_id,
      'invitation_issued',
      jsonb_build_object(
        'parent_invite_id', created_invite_id,
        'expires_at', target_invite_expires_at,
        'delivery_mode', 'manual_one_time_link',
        'provider_execution', 'not_started'
      ),
      review_note
    from public.registration_requests request
    where request.id = target_registration_request_id;

    insert into public.audit_events (
      organization_id, actor_user_id, action, target_type, target_id, summary
    ) values (
      request_organization_id, reviewer_user_id,
      'registration_invitation_issued', 'parent_invite', created_invite_id::text,
      'Administrator prepared a one-time invitation for manual handoff. No email, SMS, push, or chat provider executed.'
    );
  end if;

  return approval_result || jsonb_build_object(
    'invite_expires_at',
    case when created_invite_id is null then null else target_invite_expires_at end,
    'provider_execution',
    'not_started'
  );
end;
$$;

revoke all on function public.approve_registration_request_with_invitation(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.approve_registration_request_with_invitation(uuid, uuid, text, text, timestamptz)
  to service_role;
