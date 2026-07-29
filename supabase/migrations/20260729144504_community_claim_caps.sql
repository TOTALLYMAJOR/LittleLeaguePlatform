-- Serialize snack and volunteer claims so configured caps remain authoritative
-- under concurrent requests.

create or replace function public.claim_snack_slot_compare_and_set(
  p_slot_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  slot_row public.snack_schedule_slots%rowtype;
  assigned_count integer;
begin
  if p_slot_id is null or p_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_request',
      'message', 'Snack claim requires a slot and user.'
    );
  end if;

  select *
  into slot_row
  from public.snack_schedule_slots
  where id = p_slot_id
  for update;

  if slot_row.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Snack slot was not found.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    concat('snack:', slot_row.team_id::text, ':', slot_row.event_id::text),
    0
  ));

  if slot_row.status <> 'open' or slot_row.assigned_parent_user_id is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'already_claimed',
      'message', 'Another family claimed this snack slot first.'
    );
  end if;

  select count(*)
  into assigned_count
  from public.snack_schedule_slots
  where team_id = slot_row.team_id
    and event_id = slot_row.event_id
    and status = 'assigned';

  if assigned_count >= slot_row.slot_cap then
    return jsonb_build_object(
      'ok', false,
      'code', 'cap_reached',
      'message', 'Snack slot cap is already filled.'
    );
  end if;

  update public.snack_schedule_slots
  set assigned_parent_user_id = p_user_id,
      status = 'assigned',
      unclaimed_at = null,
      unclaimed_by_user_id = null,
      cancellation_reason = null
  where id = p_slot_id
    and status = 'open'
    and assigned_parent_user_id is null
  returning * into slot_row;

  if slot_row.assigned_parent_user_id is distinct from p_user_id then
    return jsonb_build_object(
      'ok', false,
      'code', 'already_claimed',
      'message', 'Snack slot changed before this claim was applied.'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Snack slot assigned to your account.',
    'slot', jsonb_build_object(
      'id', slot_row.id,
      'status', slot_row.status,
      'assigned_parent_user_id', slot_row.assigned_parent_user_id,
      'slot_cap', slot_row.slot_cap,
      'reminder_draft_count', slot_row.reminder_draft_count,
      'reminder_last_drafted_at', slot_row.reminder_last_drafted_at
    )
  );
end;
$$;

revoke all on function public.claim_snack_slot_compare_and_set(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_snack_slot_compare_and_set(uuid, uuid)
  to service_role;

create or replace function public.claim_volunteer_role_compare_and_set(
  p_signup_id uuid,
  p_user_id uuid,
  p_action_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  signup_row public.volunteer_signups%rowtype;
  filled_count integer;
begin
  if p_signup_id is null or p_user_id is null or nullif(btrim(p_action_id), '') is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_request',
      'message', 'Volunteer claim requires role, user, and action receipt.'
    );
  end if;

  select *
  into signup_row
  from public.volunteer_signups
  where id = p_signup_id
  for update;

  if signup_row.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Volunteer role was not found.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    concat(
      'volunteer:',
      signup_row.team_id::text,
      ':',
      coalesce(signup_row.event_id::text, 'none'),
      ':',
      signup_row.role
    ),
    0
  ));

  if signup_row.last_action_id = p_action_id
    and signup_row.assigned_user_id = p_user_id
  then
    return jsonb_build_object(
      'ok', true,
      'idempotentReplay', true,
      'message', 'Volunteer role was already assigned to you.'
    );
  end if;

  if signup_row.status <> 'open' or signup_row.assigned_user_id is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'already_claimed',
      'message', 'Another family claimed this volunteer role first. You can join the waitlist.'
    );
  end if;

  select count(*)
  into filled_count
  from public.volunteer_signups
  where team_id = signup_row.team_id
    and event_id is not distinct from signup_row.event_id
    and role = signup_row.role
    and status = 'filled';

  if filled_count >= signup_row.role_cap then
    return jsonb_build_object(
      'ok', false,
      'code', 'cap_reached',
      'message', 'Volunteer role cap is already filled. You can join the waitlist.'
    );
  end if;

  update public.volunteer_signups
  set assigned_user_id = p_user_id,
      status = 'filled',
      last_action_id = p_action_id,
      unclaimed_at = null,
      unclaimed_by_user_id = null,
      cancellation_reason = null
  where id = p_signup_id
    and status = 'open'
    and assigned_user_id is null
  returning * into signup_row;

  if signup_row.assigned_user_id is distinct from p_user_id then
    return jsonb_build_object(
      'ok', false,
      'code', 'already_claimed',
      'message', 'Volunteer role changed before this claim was applied.'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Volunteer role assigned to your account.',
    'signup', jsonb_build_object(
      'id', signup_row.id,
      'status', signup_row.status,
      'assigned_user_id', signup_row.assigned_user_id,
      'role_cap', signup_row.role_cap,
      'reminder_draft_count', signup_row.reminder_draft_count,
      'reminder_last_drafted_at', signup_row.reminder_last_drafted_at
    )
  );
end;
$$;

revoke all on function public.claim_volunteer_role_compare_and_set(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_volunteer_role_compare_and_set(uuid, uuid, text)
  to service_role;
