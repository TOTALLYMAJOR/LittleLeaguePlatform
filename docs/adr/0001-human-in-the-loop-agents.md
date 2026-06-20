# ADR 0001 - Human-In-The-Loop Agents

## Status

Accepted

## Context

The product handles youth sports data, parent contact information, team access, messaging, media links, and retention-sensitive chat records. The static prototype includes simulated workflows that could become risky if production agents were allowed to mutate records or send provider messages without approval.

## Decision

Agents will assist but not independently perform sensitive actions.

Agents may validate, draft, summarize, recommend, rank, and flag. The service layer enforces permissions, provider policy, audit logging, and retention. Human approval is required for child access changes, CSV imports, invite sends, push notifications, generated message publication, media moderation, score corrections, and archive close.

## Consequences

This keeps the product safer for families and simpler to audit. It also means some workflows require approval queue design before they can be automated end to end.

## Verification

- Sensitive workflows have explicit approval states.
- Provider calls are made by services after policy checks, not directly by agent output.
- Audit events link actor, action, target, and agent run where applicable.
- Tests cover permission failures and approval requirements.
