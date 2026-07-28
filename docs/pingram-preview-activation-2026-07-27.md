# Pingram Preview Activation Record — 2026-07-27

## Scope

This record covers only:

- Git branch `codex/ui-ux-100-shell-chat`;
- Vercel branch Preview for that Git branch;
- isolated Supabase preview project `gmrvnnkxksqkcxcmydhr`;
- demo organization `d1000000-0000-4000-8000-000000000001`; and
- the Pingram account/environment selected by the reviewed server credential.

Production Vercel configuration, production Supabase project
`dkwghvvlbdnnwzbnscvu`, and real-family recipients are outside this activation.

## Confirmed configuration

- Pingram initially returned no events-webhook configuration. The exact stable
  branch Preview callback was then registered and read back at
  `/api/provider-webhooks/pingram`.
- The callback subscribes only to `SMS_DELIVERED`, `SMS_FAILED`,
  `SMS_UNSUBSCRIBE`, `SMS_SUBSCRIBE`, and `SMS_INBOUND`.
- Pingram generated the HMAC webhook secret; it was transferred directly into
  branch-scoped Vercel configuration without being printed or committed.
- The selected Pingram sender is present in the provider number inventory,
  active, and reports `a2pStatus=testing`. This is sandbox/QA readiness, not
  production A2P approval.
- The branch Preview has server-only values for the Pingram API credential,
  sender, webhook HMAC, local contact-digest HMAC, and notification-worker
  authorization. The branch also has the isolated Supabase URL and keys.
- Supabase preview has migrations
  `20260727223340_pingram_sms_transport_safety`,
  `20260727224549_pingram_sms_execution_authority`, and
  `20260727230627_pingram_terminal_reconciliation`.
- Public requests to the callback are currently intercepted by Vercel
  Authentication with `401 Protected deployment` before LeaguePilot signature
  verification runs. Hosted signed-callback and replay proof is therefore not
  complete.

## Gates retained

- `PROVIDER_SENDS_ENABLED=false`
- `PROVIDER_DELIVERY_MODE=qa`
- `PROVIDER_PRODUCTION_APPROVED=false`
- `PINGRAM_SMS_SENDER_READY=false`
- no `PROVIDER_QA_RECIPIENT_ALLOWLIST`
- demo organization `provider_sends_enabled=false`

No SMS was attempted. Provider acceptance and carrier delivery therefore remain
unproven.

## Remaining QA-send blockers

The branch Preview is protected by Vercel Authentication. Pingram's webhook
contract accepts a URL and event list but no custom bypass header. Vercel
documents a query-parameter automation bypass for third-party webhooks, but
that credential is project-wide rather than path-scoped: disclosure would
bypass authentication for every protected Preview route in this project. Do
not create or register that bypass without explicit security-setting approval,
or place the webhook on a separately isolated public host.

The repository contains fictional seed contacts only, and the seeded preview
parents do not have a phone number suitable for carrier delivery. Pingram's
sandbox uses real carrier paths; it does not document a magic non-delivery test
recipient. A single adult-controlled E.164 number with explicit consent is
required before the allowlist and organization gate can be enabled.

After callback reachability is safely resolved and that recipient is supplied
privately, the operator must:

1. store it only on one demo-parent preview profile and create an enabled SMS
   preference with a non-null opt-in timestamp;
2. allowlist only that number;
3. create and atomically approve one fresh SMS notification;
4. prove the entire due, unlocked global worker queue contains exactly that one
   attempt;
5. invoke the worker once with `limit=1`;
6. disable the demo organization immediately afterward; and
7. distinguish provider acceptance from signed `SMS_DELIVERED` or `SMS_FAILED`
   callback evidence.

Timeouts, connection failures, server errors, and malformed responses remain
indeterminate and must not be retried automatically.
