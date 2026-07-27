-- Resolve ambiguous Pingram send requests when a verified terminal lifecycle
-- callback proves that Pingram accepted and tracked the request. Delivery and
-- downstream failure remain distinct attempt statuses.

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

-- Repair attempts reconciled before this correction was installed. The signed
-- terminal event is retained as the evidence source; no provider call occurs.
with terminal_pingram_evidence as (
  select
    attempt.id as attempt_id,
    max(event.signature_verified_at) as verified_at
  from public.notification_delivery_attempts attempt
  join public.provider_webhook_events event
    on event.provider = 'pingram'
    and event.event_type in ('SMS_DELIVERED', 'SMS_FAILED')
    and (
      event.notification_delivery_attempt_id = attempt.id
      or (
        attempt.transport_provider = 'pingram'
        and attempt.provider_message_id is not null
        and event.provider_message_id = attempt.provider_message_id
      )
    )
  group by attempt.id
)
update public.notification_delivery_attempts attempt
set
  request_outcome = case
    when attempt.request_outcome = 'indeterminate' then 'provider_accepted'
    else attempt.request_outcome
  end,
  provider_accepted_at = case
    when attempt.request_outcome = 'indeterminate'
      then coalesce(attempt.provider_accepted_at, evidence.verified_at)
    else attempt.provider_accepted_at
  end,
  reconciliation_required_at = null,
  error_code = case
    when attempt.request_outcome = 'indeterminate' then null
    else attempt.error_code
  end,
  error_message = case
    when attempt.request_outcome = 'indeterminate' then null
    else attempt.error_message
  end
from terminal_pingram_evidence evidence
where attempt.id = evidence.attempt_id
  and (
    attempt.request_outcome = 'indeterminate'
    or attempt.reconciliation_required_at is not null
  );
