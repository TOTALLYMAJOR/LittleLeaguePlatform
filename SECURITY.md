# Security Policy

## Current Status

This repo is a static prototype. It has no real authentication, database, provider integrations, persisted sessions, or production secrets.

Do not store secrets in this repo.

## Sensitive Domains

Production work must treat these as sensitive:

- Child profile data.
- Parent/guardian contact data.
- Team membership.
- Coach-parent messages.
- Registration requests.
- Invite links and account claims.
- Media links that may expose children.
- Season archive and retention actions.

## Required Production Controls

- Real authentication and role assignment.
- Tenant and team scoped authorization.
- Row-level security for database reads and writes.
- Human approval for child access changes.
- Consent and preference checks before provider sends.
- Audit logs for sensitive actions.
- Retention jobs for chat deletion after season close.
- Provider secrets in managed environment variables only.

## Reporting Issues

For this local workshop repo, document security concerns in `BACKLOG.md` or a new file under `docs/adr/` if the concern changes architecture.

For a deployed production version, define a private disclosure channel before launch.
