-- Complete an approved parent invitation with adult contact details and an
-- explicit, optional SMS choice. Account/team access continues to come only
-- from the previously approved invitation. This function sends no message.

create table if not exists public.parent_sms_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  consent_version text not null,
  disclosure_text text not null,
  source text not null check (source = 'parent_invite'),
  consented_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, team_id, user_id, consent_version)
);

alter table public.parent_sms_consents enable row level security;

revoke all on table public.parent_sms_consents from public, anon, authenticated;
grant select, insert, update on table public.parent_sms_consents to service_role;

create or replace function public.accept_parent_invite_with_contact(
  target_invite_token_hash text,
  accepting_user_id uuid,
  parent_display_name text,
  parent_mobile_phone text,
  record_sms_consent boolean,
  consent_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acceptance_result jsonb;
  accepted_organization_id uuid;
  accepted_team_id uuid;
  accepted_at timestamptz := now();
  normalized_name text := regexp_replace(trim(parent_display_name), '\s+', ' ', 'g');
  consent_disclosure constant text :=
    'By checking this box and providing my mobile number, I agree to receive recurring SMS messages from LeaguePilot about team access and essential team updates, including schedule changes, cancellations, and weather alerts. Message frequency may vary. Message and data rates may apply. Reply STOP to opt out. Reply HELP for help. Consent is not a condition of creating an account, accepting this invitation, or using LeaguePilot. Terms of Service and Privacy Policy apply.';
begin
  if normalized_name = '' or position(' ' in normalized_name) = 0 then
    raise exception 'Enter your full name.';
  end if;
  if parent_mobile_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Enter a mobile number with country code.';
  end if;
  if consent_version <> 'parent-invite-essential-updates-v1' then
    raise exception 'SMS consent disclosure version is invalid.';
  end if;

  acceptance_result := public.accept_parent_invite_by_hash(
    target_invite_token_hash,
    accepting_user_id
  );
  accepted_organization_id := (acceptance_result ->> 'organization_id')::uuid;
  accepted_team_id := (acceptance_result ->> 'team_id')::uuid;

  update public.profiles
  set display_name = normalized_name,
      phone = parent_mobile_phone,
      updated_at = accepted_at
  where id = accepting_user_id;
  if not found then raise exception 'Signed-in parent profile is unavailable.'; end if;

  if record_sms_consent then
    insert into public.parent_sms_consents (
      organization_id, team_id, user_id, phone, consent_version,
      disclosure_text, source, consented_at, revoked_at, updated_at
    ) values (
      accepted_organization_id, accepted_team_id, accepting_user_id,
      parent_mobile_phone, consent_version, consent_disclosure,
      'parent_invite', accepted_at, null, accepted_at
    )
    on conflict (organization_id, team_id, user_id, consent_version)
    do update set
      phone = excluded.phone,
      disclosure_text = excluded.disclosure_text,
      consented_at = excluded.consented_at,
      revoked_at = null,
      updated_at = excluded.updated_at;

    delete from public.notification_preferences
    where user_id = accepting_user_id
      and organization_id = accepted_organization_id
      and team_id = accepted_team_id
      and channel = 'sms'
      and notification_type in ('schedule_changed', 'event_cancelled', 'weather_alert');

    insert into public.notification_preferences (
      user_id, organization_id, team_id, channel, notification_type,
      enabled, opted_in_at, opted_out_at
    )
    select
      accepting_user_id,
      accepted_organization_id,
      accepted_team_id,
      'sms',
      notification_type,
      true,
      accepted_at,
      null
    from unnest(array['schedule_changed', 'event_cancelled', 'weather_alert'])
      as notification_type;
  end if;

  insert into public.audit_events (
    organization_id, actor_user_id, action, target_type, target_id, summary
  ) values (
    accepted_organization_id,
    accepting_user_id,
    'parent_invite_contact_completed',
    'parent_invite',
    acceptance_result ->> 'invite_id',
    case when record_sms_consent
      then 'Parent contact completed with explicit SMS consent. No provider message was sent.'
      else 'Parent contact completed without SMS consent. SMS remains disabled and no provider message was sent.'
    end
  );

  return acceptance_result || jsonb_build_object(
    'phone_recorded', true,
    'sms_opted_in', record_sms_consent,
    'sms_consent_version', case when record_sms_consent then consent_version else null end,
    'provider_execution', 'not_started'
  );
end;
$$;

revoke all on function public.accept_parent_invite_with_contact(text, uuid, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.accept_parent_invite_with_contact(text, uuid, text, text, boolean, text)
  to service_role;

comment on table public.parent_sms_consents is
  'Auditable adult SMS consent captured during parent invitation acceptance; not an access grant or provider delivery result.';
