-- Atomic registration review workflow.
-- Approval creates player + guardian access records safely:
-- - if a matching parent profile exists, it creates an active guardian link and team membership;
-- - if no matching parent profile exists, it creates a pending invite and invited guardian link;
-- - every step is recorded in registration_approval_actions and audit_events.

create unique index if not exists idx_profiles_email_lower_unique
  on public.profiles (lower(email));

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
    where request.id = target_registration_request_id
      and (
        exists (
          select 1
          from public.organization_memberships membership
          where membership.organization_id = request.organization_id
            and membership.user_id = reviewer_user_id
            and membership.role = 'admin'
            and membership.status = 'active'
        )
        or exists (
          select 1
          from public.team_memberships membership
          where membership.team_id = request.team_id
            and membership.user_id = reviewer_user_id
            and membership.role = 'coach'
            and membership.status = 'active'
        )
      )
  );
$$;

create or replace function public.approve_registration_request(
  target_registration_request_id uuid,
  reviewer_user_id uuid,
  review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.registration_requests%rowtype;
  parent_profile_id uuid;
  created_player_id uuid;
  created_guardian_id uuid;
  created_invite_id uuid;
  created_membership_id uuid;
  action_ids uuid[] := '{}';
  action_id uuid;
  invite_token_hash text;
begin
  select *
  into request_row
  from public.registration_requests
  where id = target_registration_request_id
  for update;

  if not found then
    raise exception 'Registration request not found.';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Only pending registration requests can be approved.';
  end if;

  if not public.reviewer_can_manage_registration(target_registration_request_id, reviewer_user_id) then
    raise exception 'Reviewer cannot manage this registration request.';
  end if;

  insert into public.players (
    organization_id,
    season_id,
    team_id,
    first_name,
    last_initial
  )
  values (
    request_row.organization_id,
    request_row.season_id,
    request_row.team_id,
    request_row.player_first_name,
    request_row.player_last_initial
  )
  returning id into created_player_id;

  insert into public.registration_approval_actions (
    registration_request_id,
    organization_id,
    team_id,
    reviewed_by_user_id,
    action,
    result_json,
    note
  )
  values (
    request_row.id,
    request_row.organization_id,
    request_row.team_id,
    reviewer_user_id,
    'created_player',
    jsonb_build_object('player_id', created_player_id),
    review_note
  )
  returning id into action_id;
  action_ids := array_append(action_ids, action_id);

  select id
  into parent_profile_id
  from public.profiles
  where lower(email) = lower(request_row.parent_email)
  limit 1;

  if parent_profile_id is not null then
    insert into public.team_memberships (
      team_id,
      user_id,
      role,
      status
    )
    values (
      request_row.team_id,
      parent_profile_id,
      'parent',
      'active'
    )
    on conflict (team_id, user_id, role)
    do update set status = 'active'
    returning id into created_membership_id;

    insert into public.player_guardians (
      player_id,
      parent_user_id,
      relationship,
      status
    )
    values (
      created_player_id,
      parent_profile_id,
      'guardian',
      'active'
    )
    returning id into created_guardian_id;

    insert into public.registration_approval_actions (
      registration_request_id,
      organization_id,
      team_id,
      reviewed_by_user_id,
      action,
      result_json,
      note
    )
    values (
      request_row.id,
      request_row.organization_id,
      request_row.team_id,
      reviewer_user_id,
      'created_membership',
      jsonb_build_object('membership_id', created_membership_id, 'parent_user_id', parent_profile_id),
      review_note
    )
    returning id into action_id;
    action_ids := array_append(action_ids, action_id);

    insert into public.registration_approval_actions (
      registration_request_id,
      organization_id,
      team_id,
      reviewed_by_user_id,
      action,
      result_json,
      note
    )
    values (
      request_row.id,
      request_row.organization_id,
      request_row.team_id,
      reviewer_user_id,
      'created_guardian',
      jsonb_build_object('guardian_id', created_guardian_id, 'status', 'active'),
      review_note
    )
    returning id into action_id;
    action_ids := array_append(action_ids, action_id);
  else
    invite_token_hash := encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex');

    insert into public.parent_invites (
      organization_id,
      team_id,
      player_id,
      email,
      phone,
      invite_token_hash,
      status,
      delivery_status,
      sent_count,
      expires_at
    )
    values (
      request_row.organization_id,
      request_row.team_id,
      created_player_id,
      lower(request_row.parent_email),
      null,
      invite_token_hash,
      'pending',
      'queued',
      0,
      now() + interval '10 days'
    )
    returning id into created_invite_id;

    insert into public.player_guardians (
      player_id,
      parent_invite_id,
      relationship,
      status
    )
    values (
      created_player_id,
      created_invite_id,
      'guardian',
      'invited'
    )
    returning id into created_guardian_id;

    insert into public.registration_approval_actions (
      registration_request_id,
      organization_id,
      team_id,
      reviewed_by_user_id,
      action,
      result_json,
      note
    )
    values (
      request_row.id,
      request_row.organization_id,
      request_row.team_id,
      reviewer_user_id,
      'invite_queued',
      jsonb_build_object('parent_invite_id', created_invite_id, 'email', lower(request_row.parent_email)),
      review_note
    )
    returning id into action_id;
    action_ids := array_append(action_ids, action_id);

    insert into public.registration_approval_actions (
      registration_request_id,
      organization_id,
      team_id,
      reviewed_by_user_id,
      action,
      result_json,
      note
    )
    values (
      request_row.id,
      request_row.organization_id,
      request_row.team_id,
      reviewer_user_id,
      'created_guardian',
      jsonb_build_object('guardian_id', created_guardian_id, 'status', 'invited'),
      review_note
    )
    returning id into action_id;
    action_ids := array_append(action_ids, action_id);
  end if;

  update public.registration_requests
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by_user_id = reviewer_user_id
  where id = request_row.id;

  insert into public.registration_approval_actions (
    registration_request_id,
    organization_id,
    team_id,
    reviewed_by_user_id,
    action,
    result_json,
    note
  )
  values (
    request_row.id,
    request_row.organization_id,
    request_row.team_id,
    reviewer_user_id,
    'approved',
    jsonb_build_object(
      'player_id', created_player_id,
      'guardian_id', created_guardian_id,
      'parent_user_id', parent_profile_id,
      'parent_invite_id', created_invite_id,
      'membership_id', created_membership_id
    ),
    review_note
  )
  returning id into action_id;
  action_ids := array_append(action_ids, action_id);

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  )
  values (
    request_row.organization_id,
    reviewer_user_id,
    'registration_request_approved',
    'registration_request',
    request_row.id::text,
    'Registration approved; player, guardian, invite or membership, and approval action records were created.'
  );

  return jsonb_build_object(
    'registration_request_id', request_row.id,
    'player_id', created_player_id,
    'guardian_id', created_guardian_id,
    'parent_user_id', parent_profile_id,
    'parent_invite_id', created_invite_id,
    'membership_id', created_membership_id,
    'approval_action_ids', action_ids
  );
end;
$$;

create or replace function public.reject_registration_request(
  target_registration_request_id uuid,
  reviewer_user_id uuid,
  rejection_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.registration_requests%rowtype;
  action_id uuid;
begin
  select *
  into request_row
  from public.registration_requests
  where id = target_registration_request_id
  for update;

  if not found then
    raise exception 'Registration request not found.';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Only pending registration requests can be rejected.';
  end if;

  if not public.reviewer_can_manage_registration(target_registration_request_id, reviewer_user_id) then
    raise exception 'Reviewer cannot manage this registration request.';
  end if;

  update public.registration_requests
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by_user_id = reviewer_user_id
  where id = request_row.id;

  insert into public.registration_approval_actions (
    registration_request_id,
    organization_id,
    team_id,
    reviewed_by_user_id,
    action,
    result_json,
    note
  )
  values (
    request_row.id,
    request_row.organization_id,
    request_row.team_id,
    reviewer_user_id,
    'rejected',
    jsonb_build_object('reason', rejection_note),
    rejection_note
  )
  returning id into action_id;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  )
  values (
    request_row.organization_id,
    reviewer_user_id,
    'registration_request_rejected',
    'registration_request',
    request_row.id::text,
    'Registration request rejected with an approval-action record.'
  );

  return jsonb_build_object(
    'registration_request_id', request_row.id,
    'approval_action_id', action_id
  );
end;
$$;
