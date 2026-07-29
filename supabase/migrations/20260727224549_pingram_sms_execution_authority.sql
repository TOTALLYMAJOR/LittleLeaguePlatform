-- Make provider approval atomic and service-owned, preserve STOP state across
-- phone/key changes, and reconcile delivery callbacks that race send outcomes.

alter table public.provider_webhook_events
  add column if not exists provider_callback_id text,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_lease_id uuid;

create index if not exists idx_provider_webhook_events_pending_message
  on public.provider_webhook_events(provider, provider_message_id, signature_verified_at)
  where processed_at is null and provider_message_id is not null;

create unique index if not exists idx_sms_contact_suppressions_user
  on public.sms_contact_suppressions(organization_id, user_id);

revoke insert, update, delete
  on table public.notification_delivery_attempts
  from anon, authenticated;

drop policy if exists "team managers create delivery attempts"
  on public.notification_delivery_attempts;

-- Notification read/acknowledgment is mediated by the existing service-only
-- receipt RPC. Browser roles must not mutate approved provider content.
revoke update on table public.notifications from anon, authenticated;

drop policy if exists "users can mark own notifications read"
  on public.notifications;

create or replace function public.claim_provider_webhook_event(
  p_provider text,
  p_provider_event_id text,
  p_provider_callback_id text,
  p_notification_delivery_attempt_id uuid,
  p_event_type text,
  p_provider_message_id text,
  p_signature_verified_at timestamptz,
  p_payload_hash text,
  p_received_at timestamptz,
  p_processing_lease_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  event_row public.provider_webhook_events%rowtype;
begin
  if p_provider not in ('sendgrid', 'twilio', 'pingram')
    or nullif(trim(p_provider_event_id), '') is null
    or nullif(trim(p_event_type), '') is null
    or p_processing_lease_id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_webhook_claim');
  end if;

  insert into public.provider_webhook_events (
    provider,
    provider_event_id,
    provider_callback_id,
    notification_delivery_attempt_id,
    event_type,
    provider_message_id,
    signature_verified_at,
    payload_hash,
    received_at,
    processing_started_at,
    processing_lease_id
  ) values (
    p_provider,
    p_provider_event_id,
    p_provider_callback_id,
    p_notification_delivery_attempt_id,
    p_event_type,
    p_provider_message_id,
    p_signature_verified_at,
    p_payload_hash,
    p_received_at,
    now(),
    p_processing_lease_id
  )
  on conflict (provider, provider_event_id) do nothing
  returning * into event_row;

  if event_row.id is not null then
    return jsonb_build_object(
      'ok', true,
      'claimed', true,
      'duplicate', false,
      'id', event_row.id
    );
  end if;

  select *
  into event_row
  from public.provider_webhook_events
  where provider = p_provider
    and provider_event_id = p_provider_event_id
  for update;

  if event_row.id is null or event_row.payload_hash <> p_payload_hash then
    return jsonb_build_object('ok', false, 'code', 'webhook_evidence_conflict');
  end if;
  if event_row.processed_at is not null then
    return jsonb_build_object(
      'ok', true,
      'claimed', false,
      'duplicate', true,
      'id', event_row.id
    );
  end if;
  if event_row.processing_error is null
    and event_row.processing_started_at is not null
    and event_row.processing_started_at > now() - interval '90 seconds' then
    return jsonb_build_object(
      'ok', true,
      'claimed', false,
      'duplicate', false,
      'in_progress', true,
      'id', event_row.id
    );
  end if;

  update public.provider_webhook_events
  set
    provider_callback_id = coalesce(provider_callback_id, p_provider_callback_id),
    notification_delivery_attempt_id = coalesce(
      notification_delivery_attempt_id,
      p_notification_delivery_attempt_id
    ),
    event_type = coalesce(event_type, p_event_type),
    provider_message_id = coalesce(provider_message_id, p_provider_message_id),
    processing_started_at = now(),
    processing_lease_id = p_processing_lease_id,
    processing_error = null
  where id = event_row.id;

  return jsonb_build_object(
    'ok', true,
    'claimed', true,
    'duplicate', true,
    'id', event_row.id
  );
end;
$$;

revoke all on function public.claim_provider_webhook_event(
  text, text, text, uuid, text, text, timestamptz, text, timestamptz, uuid
) from public, anon, authenticated;
grant execute on function public.claim_provider_webhook_event(
  text, text, text, uuid, text, text, timestamptz, text, timestamptz, uuid
) to service_role;

create or replace function public.review_notification_delivery_transaction(
  p_notification_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_provider text,
  p_transport_provider text,
  p_attempt_status text,
  p_request_outcome text,
  p_error_code text default null,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  notification_row public.notifications%rowtype;
  attempt_row public.notification_delivery_attempts%rowtype;
  now_value timestamptz := now();
  idempotency_value text;
begin
  if p_decision not in ('approved', 'rejected') then
    return jsonb_build_object('ok', false, 'code', 'invalid_decision');
  end if;
  if p_provider not in ('email', 'sms', 'web_push') then
    return jsonb_build_object('ok', false, 'code', 'invalid_provider');
  end if;
  if p_attempt_status not in ('queued', 'suppressed') then
    return jsonb_build_object('ok', false, 'code', 'invalid_attempt_status');
  end if;
  if (p_attempt_status = 'queued' and p_request_outcome <> 'not_attempted')
    or (p_attempt_status = 'suppressed' and p_request_outcome <> 'suppressed') then
    return jsonb_build_object('ok', false, 'code', 'invalid_request_outcome');
  end if;
  if p_decision = 'rejected' and p_attempt_status <> 'suppressed' then
    return jsonb_build_object('ok', false, 'code', 'rejected_attempt_must_be_suppressed');
  end if;
  if p_attempt_status = 'queued' and p_transport_provider is null then
    return jsonb_build_object('ok', false, 'code', 'transport_required');
  end if;
  if p_transport_provider is not null and (
    (p_provider = 'email' and p_transport_provider <> 'sendgrid')
    or (p_provider = 'web_push' and p_transport_provider <> 'web_push')
    or (p_provider = 'sms' and p_transport_provider not in ('pingram', 'twilio'))
  ) then
    return jsonb_build_object('ok', false, 'code', 'transport_provider_mismatch');
  end if;

  select *
  into notification_row
  from public.notifications
  where id = p_notification_id
  for update;

  if notification_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'notification_not_found');
  end if;
  if not (
    (p_provider = 'email' and notification_row.channel = 'email')
    or (p_provider = 'sms' and notification_row.channel = 'sms')
    or (p_provider = 'web_push' and notification_row.channel = 'push')
  ) then
    return jsonb_build_object('ok', false, 'code', 'provider_channel_mismatch');
  end if;
  if not (
    exists (
      select 1
      from public.team_memberships membership
      where membership.team_id = notification_row.team_id
        and membership.user_id = p_actor_user_id
        and membership.role = 'coach'
        and membership.status = 'active'
    )
    or exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = notification_row.organization_id
        and membership.user_id = p_actor_user_id
        and membership.role = 'admin'
        and membership.status = 'active'
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'review_forbidden');
  end if;

  idempotency_value := notification_row.id::text || ':' || p_provider;
  select *
  into attempt_row
  from public.notification_delivery_attempts
  where idempotency_key = idempotency_value
  for update;

  if attempt_row.id is not null then
    if notification_row.provider_approval_status = p_decision
      and attempt_row.status = p_attempt_status
      and attempt_row.request_outcome = p_request_outcome
      and attempt_row.transport_provider is not distinct from p_transport_provider then
      return jsonb_build_object(
        'ok', true,
        'idempotent_replay', true,
        'notification', jsonb_build_object(
          'id', notification_row.id,
          'provider_approval_status', notification_row.provider_approval_status,
          'approved_at', notification_row.approved_at
        ),
        'attempt', jsonb_build_object(
          'id', attempt_row.id,
          'provider', attempt_row.provider,
          'transport_provider', attempt_row.transport_provider,
          'channel', attempt_row.channel,
          'status', attempt_row.status,
          'request_outcome', attempt_row.request_outcome,
          'attempted_at', attempt_row.attempted_at,
          'idempotency_key', attempt_row.idempotency_key,
          'next_attempt_at', attempt_row.next_attempt_at,
          'retry_count', attempt_row.retry_count,
          'max_retries', attempt_row.max_retries
        )
      );
    end if;
    return jsonb_build_object('ok', false, 'code', 'review_conflict');
  end if;

  if notification_row.provider_approval_status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'notification_already_reviewed');
  end if;

  update public.notifications
  set
    provider_approval_status = p_decision,
    approved_by_user_id = p_actor_user_id,
    approved_at = now_value
  where id = notification_row.id
  returning * into notification_row;

  insert into public.notification_delivery_attempts (
    notification_id,
    provider,
    transport_provider,
    channel,
    status,
    request_outcome,
    idempotency_key,
    next_attempt_at,
    retry_count,
    max_retries,
    approved_at,
    error_code,
    error_message
  ) values (
    notification_row.id,
    p_provider,
    p_transport_provider,
    notification_row.channel,
    p_attempt_status,
    p_request_outcome,
    idempotency_value,
    now_value,
    0,
    3,
    case when p_decision = 'approved' then now_value else null end,
    p_error_code,
    p_error_message
  )
  returning * into attempt_row;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    notification_row.organization_id,
    p_actor_user_id,
    'provider_delivery_' || p_decision,
    'notification',
    notification_row.id::text,
    format('%s delivery %s; attempt status %s.', p_provider, p_decision, p_attempt_status)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent_replay', false,
    'notification', jsonb_build_object(
      'id', notification_row.id,
      'provider_approval_status', notification_row.provider_approval_status,
      'approved_at', notification_row.approved_at
    ),
    'attempt', jsonb_build_object(
      'id', attempt_row.id,
      'provider', attempt_row.provider,
      'transport_provider', attempt_row.transport_provider,
      'channel', attempt_row.channel,
      'status', attempt_row.status,
      'request_outcome', attempt_row.request_outcome,
      'attempted_at', attempt_row.attempted_at,
      'idempotency_key', attempt_row.idempotency_key,
      'next_attempt_at', attempt_row.next_attempt_at,
      'retry_count', attempt_row.retry_count,
      'max_retries', attempt_row.max_retries
    )
  );
end;
$$;

revoke all on function public.review_notification_delivery_transaction(
  uuid, uuid, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.review_notification_delivery_transaction(
  uuid, uuid, text, text, text, text, text, text, text
) to service_role;

create or replace function public.apply_pingram_sms_contact_state_transaction(
  p_provider_event_id text,
  p_processing_lease_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_contact_fingerprint text,
  p_state text,
  p_observed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  event_row public.provider_webhook_events%rowtype;
begin
  if p_state not in ('suppressed', 'subscribed')
    or p_contact_fingerprint is null
    or p_contact_fingerprint !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_contact_state');
  end if;

  select *
  into event_row
  from public.provider_webhook_events
  where provider = 'pingram'
    and provider_event_id = p_provider_event_id
  for update;

  if event_row.id is null
    or event_row.processing_lease_id is distinct from p_processing_lease_id
    or event_row.event_type is distinct from (
      case when p_state = 'suppressed' then 'SMS_UNSUBSCRIBE' else 'SMS_SUBSCRIBE' end
    ) then
    return jsonb_build_object('ok', false, 'code', 'contact_event_authority_mismatch');
  end if;
  if event_row.processed_at is not null then
    return jsonb_build_object('ok', true, 'idempotent_replay', true);
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id)
    or not exists (
      select 1
      from public.notifications
      where organization_id = p_organization_id
        and recipient_user_id = p_user_id
        and channel = 'sms'
    ) then
    return jsonb_build_object('ok', false, 'code', 'contact_authority_not_found');
  end if;

  insert into public.sms_contact_suppressions (
    organization_id,
    user_id,
    contact_fingerprint,
    state,
    source,
    provider,
    provider_event_id,
    observed_at,
    updated_at
  ) values (
    p_organization_id,
    p_user_id,
    p_contact_fingerprint,
    p_state,
    'pingram_webhook',
    'pingram',
    p_provider_event_id,
    p_observed_at,
    p_observed_at
  )
  on conflict (organization_id, user_id)
  do update set
    contact_fingerprint = excluded.contact_fingerprint,
    state = excluded.state,
    source = excluded.source,
    provider = excluded.provider,
    provider_event_id = excluded.provider_event_id,
    observed_at = excluded.observed_at,
    updated_at = excluded.updated_at;

  if p_state = 'suppressed' then
    update public.notification_preferences
    set
      enabled = false,
      opted_in_at = null,
      opted_out_at = p_observed_at,
      updated_at = p_observed_at
    where user_id = p_user_id
      and channel = 'sms'
      and (
        organization_id = p_organization_id
        or team_id in (
          select id from public.teams where organization_id = p_organization_id
        )
      );
  end if;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    summary
  ) values (
    p_organization_id,
    p_user_id,
    case
      when p_state = 'suppressed' then 'sms_provider_unsubscribe'
      else 'sms_provider_subscribe'
    end,
    'profile',
    p_user_id::text,
    case
      when p_state = 'suppressed'
        then 'Verified Pingram STOP evidence suppressed SMS locally.'
      else 'Verified Pingram START evidence cleared provider STOP suppression; notification preferences remain independently enforced.'
    end
  );

  update public.provider_webhook_events
  set
    processed_at = now(),
    processing_error = null,
    processing_started_at = null,
    processing_lease_id = null
  where id = event_row.id;

  return jsonb_build_object('ok', true, 'idempotent_replay', false);
end;
$$;

revoke all on function public.apply_pingram_sms_contact_state_transaction(
  text, uuid, uuid, uuid, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_pingram_sms_contact_state_transaction(
  text, uuid, uuid, uuid, text, text, timestamptz
) to service_role;

create or replace function public.reconcile_pending_provider_webhook_evidence()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  provider_name text;
  delivered_value timestamptz;
  failed_value timestamptz;
  verified_value timestamptz;
  latest_event public.provider_webhook_events%rowtype;
begin
  if new.provider_message_id is null or new.transport_provider is null then
    return new;
  end if;

  provider_name := case new.transport_provider
    when 'sendgrid' then 'sendgrid'
    when 'twilio' then 'twilio'
    when 'pingram' then 'pingram'
    else null
  end;
  if provider_name is null then
    return new;
  end if;

  select
    max(signature_verified_at) filter (
      where event_type in ('delivered', 'SMS_DELIVERED')
    ),
    max(signature_verified_at) filter (
      where event_type in ('failed', 'undelivered', 'bounce', 'dropped', 'spamreport', 'SMS_FAILED')
    ),
    max(signature_verified_at)
  into delivered_value, failed_value, verified_value
  from public.provider_webhook_events
  where provider = provider_name
    and provider_message_id = new.provider_message_id
    and processed_at is null;

  if verified_value is null then
    return new;
  end if;

  select *
  into latest_event
  from public.provider_webhook_events
  where provider = provider_name
    and provider_message_id = new.provider_message_id
    and processed_at is null
  order by signature_verified_at desc, received_at desc
  limit 1;

  update public.notification_delivery_attempts
  set
    delivered_at = coalesce(delivered_at, delivered_value),
    webhook_verified_at = case
      when webhook_verified_at is null then verified_value
      else greatest(webhook_verified_at, verified_value)
    end,
    provider_status = latest_event.event_type,
    last_webhook_event_id = latest_event.provider_event_id,
    status = case
      when delivered_value is not null then 'sent'
      when failed_value is not null and delivered_at is null then 'failed'
      else status
    end,
    request_outcome = case
      when provider_name = 'pingram'
        and request_outcome = 'indeterminate'
        and (delivered_value is not null or failed_value is not null)
        then 'provider_accepted'
      else request_outcome
    end,
    provider_accepted_at = case
      when provider_name = 'pingram'
        and request_outcome = 'indeterminate'
        and (delivered_value is not null or failed_value is not null)
        then coalesce(provider_accepted_at, delivered_value, failed_value)
      else provider_accepted_at
    end,
    reconciliation_required_at = case
      when provider_name = 'pingram'
        and (delivered_value is not null or failed_value is not null)
        then null
      else reconciliation_required_at
    end,
    error_code = case
      when provider_name = 'pingram'
        and request_outcome = 'indeterminate'
        and (delivered_value is not null or failed_value is not null)
        then null
      else error_code
    end,
    error_message = case
      when provider_name = 'pingram'
        and request_outcome = 'indeterminate'
        and (delivered_value is not null or failed_value is not null)
        then null
      else error_message
    end
  where id = new.id;

  if delivered_value is not null then
    update public.notifications
    set
      status = case when status = 'read' then status else 'sent' end,
      sent_at = coalesce(sent_at, delivered_value)
    where id = new.notification_id;
  elsif failed_value is not null then
    update public.notifications
    set status = 'failed'
    where id = new.notification_id
      and status <> 'read';
  end if;

  update public.provider_webhook_events
  set
    notification_delivery_attempt_id = new.id,
    processed_at = now(),
    processing_error = null,
    processing_started_at = null,
    processing_lease_id = null
  where provider = provider_name
    and provider_message_id = new.provider_message_id
    and processed_at is null;

  return new;
end;
$$;

revoke all on function public.reconcile_pending_provider_webhook_evidence()
  from public, anon, authenticated;
grant execute on function public.reconcile_pending_provider_webhook_evidence()
  to service_role;

drop trigger if exists reconcile_pending_provider_webhook_evidence
  on public.notification_delivery_attempts;
create trigger reconcile_pending_provider_webhook_evidence
  after insert or update of provider_message_id, transport_provider
  on public.notification_delivery_attempts
  for each row
  when (new.provider_message_id is not null)
  execute function public.reconcile_pending_provider_webhook_evidence();
