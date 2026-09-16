# LP-UX-023: Parent invitation account creation and SMS consent

Date: 2026-09-16
Status: Implemented and verified locally

## Outcome

The approved parent invitation route now provides the account-creation capability shown in the supplied reference while preserving LeaguePilot's existing access, child-privacy, and provider-send boundaries.

- A verified invitation changes the page heading to `Join {team name}` and shows the approved league, team, masked child match, masked invited email, and expiry.
- New parents receive one focused account form with required full name, invited email, password, and adult mobile phone.
- Existing parents can sign in with the invited email and complete the same name, phone, and optional SMS choice without creating a second account.
- The SMS checkbox is optional, visible, and unchecked by default. It names the recurring message purpose, examples, variable frequency, message/data rates, STOP, HELP, Terms, Privacy Policy, and the fact that consent is not a condition of account creation, invitation acceptance, or use.
- Account creation and invitation acceptance do not send an SMS, email, push notification, or chat message.

## Authority and persistence

- Supabase Auth creates or verifies the adult identity; children do not create accounts.
- `/api/invites/accept` ignores caller-supplied user identity and uses the verified session user.
- The existing approved invitation remains the only authority for organization, team, child, and guardian scope.
- Migration `20260916190000_parent_invite_sms_consent.sql` adds a service-only `parent_sms_consents` evidence table and a transactional acceptance RPC.
- The RPC validates full name and E.164-like phone, accepts the approved invitation, updates the adult profile, records the disclosure version only after an affirmative checkbox, enables SMS preferences only for schedule changes, cancellations, and weather alerts, and writes an audit event.
- An unchecked box records no SMS consent and creates no SMS preference. Existing STOP suppression remains authoritative if a previously suppressed adult later opts in.

## SaaS task template

- Applicable production-board rows: Registration approval and assigned-team activation; LP-005 registration approval browser flow; provider delivery remains separately postponed.
- Tenant context: organization and team are derived from the persisted parent invitation; child scope remains the invitation's masked, approved player.
- Tenant isolation: the service-only acceptance RPC reuses the invitation's organization/team/player rows and does not accept caller-selected tenant identifiers.
- Actor authorization: the route derives `accepting_user_id` from the authenticated session; the existing RPC requires the signed-in profile email to match the invitation email.
- Lifecycle/state: the existing pending/accepted/expired/revoked invitation states are unchanged. No new workflow state was introduced.
- Configuration: Supabase Auth and ordered migration deployment are environment-gated. Provider delivery remains disabled.
- Audit/observability: invitation acceptance and contact completion create separate audit events; affirmative consent is versioned in `parent_sms_consents`.
- Failure/idempotency: invalid/expired/revoked invitations, wrong email, inactive season, missing guardian scope, invalid contact details, and duplicate acceptance fail closed. The transaction rolls back if profile, consent, preference, or audit persistence fails.
- Security threat check: caller-supplied user, organization, team, child, and consent-version spoofing are rejected or ignored; raw invite tokens are not persisted or placed in analytics; the browser receives only masked child and email labels.

## Local verification

- Red/green TDD: the new parent-form, session-derived API payload, validation, normalization, and service-RPC contract tests failed against the previous implementation, then passed after implementation.
- Focused test result: 3 files and 8 tests passed.
- Typecheck passed after adding the new table and RPC to `lib/supabase/database.types.ts`.
- Browser proof used a locally intercepted invitation-preview response only; no hosted row or provider was mutated.
- Desktop full-page evidence: `output/playwright/parent-invite-account-consent/desktop-full.png`.
- Mobile full-page evidence at 390 by 844: `output/playwright/parent-invite-account-consent/mobile-full.png`.
- Browser accessibility snapshot exposed one H1, labeled required inputs, an unchecked SMS checkbox with its complete accessible name, adjacent legal links, and the existing public footer.
- Browser console: 0 errors and 0 warnings.

## Remaining gates

- Apply and read back the ordered migration in the intended Supabase environment.
- Prove new-account email confirmation returns to the pending invitation and prove existing-account acceptance with a real signed-in parent.
- Prove the consent row, profile phone, three preferences, invitation state, guardian link, membership, and both audit events through direct hosted readback.
- Confirm operator identity, mailing address, privacy mailbox, final disclosure wording, A2P/provider registration, STOP/HELP webhook behavior, suppression, and production approval with the release owner and qualified legal/provider reviewers.
- Do not claim provider delivery, hosted readiness, or production legal acceptance from this local implementation.
