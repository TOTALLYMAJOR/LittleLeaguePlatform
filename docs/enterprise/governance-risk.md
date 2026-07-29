# Governance Framework, Risk Register, And Threat Model

Status: draft. This document extends `docs/codex-rules.md`, `docs/privacy-security.md`, and `docs/agentic-architecture.md`.

## Governance Framework

| Domain | Decision rights | Required evidence |
| --- | --- | --- |
| Product truth | Product/engineering owner updates capability docs. | `docs/Features.md`, `docs/capability-matrix.md`, release notes. |
| Auth and RLS | Engineering owner plus security review. | Route tests, RLS tests, `qa:rls-proof`, migration review. |
| Child privacy | Product/engineering/security approval. | Privacy doc update, policy tests, UX copy review. |
| Provider sends | Product approval plus provider/security review. | Consent checks, delivery logs, suppression, retry, sandbox proof, hosted proof. |
| Billing | Product/finance/security approval. | Stripe contract, webhook signature proof, audit, reconciliation plan. |
| AI/provider output | Product/security review. | Evals, source evidence, privacy filters, review-only proof. |
| Deployment/env | Engineering owner. | Runbook update, env inventory, hosted smoke, rollback note. |
| Release | Engineering owner. | Tests, build, QA proof, release notes, known issues. |

## Non-Negotiable Policies

- Registration request is not access.
- Parent access requires approved guardian/player/team scope.
- Notification record is not a sent message.
- Weather alert is draft until reviewed or approved.
- AI output is draft/review-only until approved and published by a human.
- Sponsor billing proof is not settled payment.
- Service-role keys are never client-side.
- UI hiding is not authorization.

## STRIDE Threat Model

| Threat | Example risk | Current mitigation | Remaining work |
| --- | --- | --- | --- |
| Spoofing | User submits another actor ID or team ID. | Route session checks and access-control helpers derive actor from Supabase session. | Keep field-level schemas tight and test mass-assignment paths. |
| Tampering | Parent edits another child's RSVP or media state. | Guardian/player/event checks and RLS policies. | Add remaining browser proof for media and registration admin flows. |
| Repudiation | Admin/provider action cannot be traced. | Audit events, approval actions, delivery attempts, proof screenshots. | Standardize release QA report format and log retention. |
| Information disclosure | Cross-team data leaks through UI, export, chat, AI prompt, or media. | RLS, scoped route wrappers, AI evals, approved-media filters. | Expand admin hosted scope proof and export leakage tests. |
| Denial of service | Public registration or usage endpoint receives bursts. | Documented as open hardening item. | Add rate limits or provider firewall rules. |
| Elevation of privilege | Coach acts as org admin or parent sees admin data. | Role checks, route guards, RLS tests. | Continue testing new admin/coach route families. |

## Risk Register

| ID | Risk | Severity | Status | Mitigation |
| --- | --- | --- | --- | --- |
| R-001 | Public intake endpoints lack explicit abuse controls. | High | Open | LP-010 rate limiting/firewall slice. |
| R-002 | Live provider sends could bypass consent or approval if rushed. | High | Controlled | Keep provider execution disconnected until provider-send slice completes. |
| R-003 | Media upload storage could expose child media without tenant paths or review. | High | Deferred | Keep link-based media unless storage scope is approved and proven. |
| R-004 | Registration approval could grant guardian access without enough verification. | High | Open hardening | LP-006 guardian verification policy and tests. |
| R-005 | Admin exports could leak cross-tenant data. | High | Partially controlled | Require admin scope proof and export tests. |
| R-006 | Preview provider env could expose production secrets. | Medium | Deferred | Keep Preview OpenAI env unset until named non-prod branch target exists. |
| R-007 | Sponsor billing records could be mistaken for paid invoices. | Medium | Controlled | Keep proof-only wording unless Stripe collection is implemented. |
| R-008 | Native app scope could split policy enforcement. | Medium | Deferred | PWA first; Expo only reuses domain/service contracts after evidence. |

## Review Gates

- Any schema/RLS change: migration review, RLS proof, route test or browser proof.
- Any provider send: provider contract, consent, approval, retry, logs, webhook proof, hosted smoke.
- Any AI provider expansion: evals, source constraints, privacy filters, review-only UX.
- Any billing/payment expansion: restricted keys, webhook signature proof, settlement wording, finance reconciliation.
- Any public endpoint expansion: abuse controls, input validation, monitoring, and failure semantics.
