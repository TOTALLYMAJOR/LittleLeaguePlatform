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

Future email, SMS, push, auth, and media integrations require:

- Environment-managed secrets.
- Consent and opt-in checks.
- Delivery logs.
- Retry and failure states.
- Human approval for sensitive sends.
- Audit records for administrative actions.

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
