# Privacy And Security Guardrails

## Product Boundary

Little League HQ handles youth sports operations. Production design must assume child data and parent contact data are sensitive even when the prototype uses fake data.

## Child Privacy Defaults

- Children do not log in.
- Parent or guardian accounts manage access.
- Player display names use first name plus last initial.
- Team spaces are private.
- Chat text is deleted after season close.
- Archived seasons preserve non-chat records as read-only.

## Agent Boundaries

Agents may:

- Recommend registration matches.
- Validate CSVs.
- Draft messages.
- Summarize schedule conflicts.
- Flag media for review.
- Prepare archive readiness summaries.

Agents may not independently:

- Grant private access to child/team data.
- Send SMS, email, or push notifications.
- Publish generated coach/admin messages.
- Remove media links.
- Correct final scores after publication.
- Close a season archive or delete chat text.

## Provider Boundaries

Email, SMS, Web Push, media, AI, and payment adapters require:

- Environment-managed secrets.
- Consent and opt-in checks.
- Delivery logs.
- Retry and failure states.
- Human approval for sensitive sends.
- Audit records for administrative actions.

Adapter code does not authorize execution. Provider sends, media uploads/releases, and payments require both an environment kill switch and an organization feature flag. SMS additionally requires consent, sender registration/A2P readiness, opt-out handling, and cost controls. Payment confirmation requires verified Stripe webhook evidence; a browser return is not payment proof.

## Operational Truth

- Keep record, approval, publication, provider acceptance, delivery, read, acknowledgment, and freshness evidence independent.
- Missing or stale critical evidence renders an unknown/verification state, never success.
- Offline response values stay separate from sync receipts. “Saved on this device” is not a server save.
- Role changes clear role-scoped caches and outboxes before a new server-validated context renders.
- Archived seasons remain read-only in UI, service, and RLS contracts.

## Private Media Lifecycle

- Uploaded files use organization/team-scoped private quarantine paths.
- Validate magic bytes, declared MIME/size/hash, and image decode before processing.
- Re-encode supported images to remove EXIF and hidden metadata.
- Unscanned or failed-scan assets never leave quarantine.
- Parent visibility requires approved family-release scope and current consent evidence.
- Review history, reports, retention date, and storage deletion proof remain auditable.

## AI Source Boundary

- AI requests stay in the authenticated server service and use `store: false`.
- Only approved, current, single-team sources may enter a family-facing draft.
- Private notes, contacts, hidden/unapproved media, deleted content, and mixed-team records are excluded.
- Refusal, malformed Structured Output, stale critical sources, or unresolved safety signals fail closed.
- AI may draft and summarize; it may not publish, notify, grant access, charge, or invoke operational tools.

## Logging Rules

Audit logs should record:

- Actor.
- Role.
- Target record.
- Action.
- Timestamp.
- Before/after summary where safe.
- Agent run ID if an agent contributed.

Audit logs should not store unnecessary child-sensitive free text or deleted chat message bodies.
