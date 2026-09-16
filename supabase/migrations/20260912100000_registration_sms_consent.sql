-- Preserve explicit pre-auth SMS consent on the public registration request.
-- Consent is optional, grants no account/team access, and triggers no provider send.

alter table public.registration_requests
  add column if not exists parent_phone text,
  add column if not exists sms_opted_in_at timestamptz,
  add column if not exists sms_consent_version text;

alter table public.registration_requests
  drop constraint if exists registration_requests_sms_consent_complete_check;

alter table public.registration_requests
  add constraint registration_requests_sms_consent_complete_check
  check (
    (sms_opted_in_at is null and parent_phone is null and sms_consent_version is null)
    or
    (
      sms_opted_in_at is not null
      and parent_phone ~ '^\+[1-9][0-9]{7,14}$'
      and sms_consent_version = 'registration-v1'
    )
  );

comment on column public.registration_requests.sms_opted_in_at is
  'Adult SMS consent timestamp captured during public access request; not an access grant or delivery result.';
