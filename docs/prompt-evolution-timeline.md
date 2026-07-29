# Prompt Evolution Timeline

Date: 2026-07-19

This timeline turns recurring product-development instructions into reusable starting patterns. Entries are ordered within each product system. “Verified” means the cited repository or handoff evidence was inspected for this timeline. “Corroborated” means current git history supports the pattern, but the complete originating prompt was not available. “Context record” means the pattern comes from earlier Codex work and should be refreshed against that repository before it is used as release evidence.

No secret values, private family data, credentials, provider payloads, or child-identifying records are included.

## LeaguePilot

| Date | Prompt or instruction stage | Instruction shift | Authority and proof change | Recurring failure corrected | Effective starting pattern | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-06-28 | Root Next.js scaffold, role gates, and UI specifications | Move from a preserved static prototype to route-native parent, coach, and admin surfaces. | Identity alone does not grant role access; production slices require server session and scoped service/RLS evidence. | Prototype state was easy to mistake for persistence or access authority. | Audit routes, service boundaries, and role resolution before redesigning a surface. | Verified: git `61ddc20`, repo `AGENTS.md`, `docs/codex-rules.md`. |
| 2026-07-01 to 2026-07-16 | Authenticated writes, QA sessions, provider review, and tenant readiness | Advance from feature presence to signed-in writes, Supabase readback, tenant setup, and explicit provider-review records. | A saved notification remains a draft or attempt record; provider delivery needs separate execution and evidence. | UI and local reducer success could overstate hosted, provider, or tenant readiness. | Trace actor, tenant, team, record, audit, provider boundary, and browser proof end to end. | Corroborated: notification/auth/tenant git history and repository QA scripts. |
| 2026-07-17 to 2026-07-19 | Game-Day Calm design handoff | Replace inventory-heavy dashboards with a parent action center, coach sideline board, and admin launch queues. | Preserve role, privacy, approval, and provider gates while translating infrastructure terminology into plain operational language. | Equal-card repetition, duplicate navigation, tiny metadata, and one universal shell obscured role needs. | Start from each role’s three-second question and keep the certainty band near the top. | Verified: dated UI handoff, acceptance checklist, Linear token reference, and Game-Day Calm git history. |
| 2026-07-19 | Operational-truth hardening | Replace one optimistic certainty value with independent record, approval, publication, delivery, acknowledgment, and freshness evidence lanes. | Positive summaries require all critical evidence; unknown or stale critical evidence becomes “Needs verification.” Existing workflow enums remain authoritative. | “Confirmed,” “sent,” “saved,” and “paid” could collapse several materially different truths. | Define context, permission, evidence, freshness, priority, delivery, conflict, and sync contracts before polishing workflows. | Verified: accepted hardening plan and additive migration/read-model implementation. |
| 2026-07-19 | Gated operational enhancements | Add versioned RSVP, field/offline capture, explainable priorities, provider adapters, closed-loop Replay, private media, volunteer concurrency, and payment evidence. | Offline records, provider acceptance, family release, and webhook-confirmed payment remain separate; environment and organization gates fail closed. | A sophisticated surface could imply production capability before sandbox, RLS, webhook, and hosted proof. | Implement locally behind two-level gates, then promote proof one layer at a time. | Verified: local source changes; hosted/provider/RLS promotion still requires the release gates. |

### Converged LeaguePilot pattern

```text
verified context
→ independent operational evidence
→ role-scoped read model
→ human approval
→ idempotent service mutation
→ audit/provider evidence
→ browser, RLS, hosted, and operational proof kept separate
```

## QuietPilot

| Date | Prompt or instruction stage | Instruction shift | Authority and proof change | Recurring failure corrected | Effective starting pattern | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Prior program phase | Quote and proposal workflow | Model quote creation, proposal handoff, and customer review as different operations. | Operator authority and customer-token authority are not interchangeable. | UI copy could imply that proposal creation meant customer acceptance. | Name the actor, commercial artifact, transition, and proof source before implementation. | Context record; refresh against current repo docs before release use. |
| Later program phase | Payment and activation proof | Add payment handoff and browser-return handling without treating a return URL as settlement. | Webhook/payment evidence, job activation, and operational readiness remain separate. | “Accepted,” “paid,” and “ready” drifted into one optimistic lifecycle. | Build an explicit lifecycle/proof registry and prohibit stronger labels than the evidence supports. | Context record; current repository history corroborates governed workflow work. |
| 2026-07-19 | Application-service and workspace isolation | Decompose the quote workflow while preserving a facade, accepted commercial snapshots, integration dispatch, and authorized workspace context. | Tenant/workspace authority is enforced before downstream commercial or machine operations. | Large services hid ownership and made cross-workspace coupling harder to see. | Canonical context → focused collaborator → idempotent transition → proof-safe handoff. | Corroborated: git `73ca3f8d`, `a21f04d8`, `04a20ee2`, `85d25597`, `f41f1996`. |

### Converged QuietPilot pattern

```text
identity and workspace authority
→ accepted commercial snapshot
→ focused application service
→ idempotent integration dispatch
→ payment/activation/readiness evidence kept independent
```

## Little Legend Studios

| Date | Prompt or instruction stage | Instruction shift | Authority and proof change | Recurring failure corrected | Effective starting pattern | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Initial project phase | Creative journey and preview-session capability | Build parent-led child projects, preview sessions, and media-generation workflows. | Feature presence did not yet establish owner authentication or project isolation. | A usable route could obscure missing parent/child ownership checks. | Start every creative journey with parent identity, child/project ownership, and expiring preview authority. | Context record; repository currently has no committed `main` baseline. |
| 2026-07-19 review | Architecture, auth, and readiness audit | Shift from a broad feature inventory to exact route/API journeys and critical auth findings. | Email correlation is not sufficient ownership proof; unauthenticated preview overwrite is a critical boundary failure. | Readiness scores were tempting before the exact feature and authority path were resolved. | Resolve the named feature, inspect the real API/browser path, then score implementation, deployment, recovery, monitoring, and operations separately. | Context record; the local repository has no git commits to chronologize. |
| 2026-07-19 build-documentation request | Visible backlog and implementation readiness | Make missing work discoverable and implementation-oriented before adding more surface area. | Documentation should distinguish planned work from verified capability. | Important security/build gaps were trapped in one-off audit conversation. | Maintain a visible gap register with owner boundary, evidence level, and validation command. | Context record; refresh against current working tree before acting. |

### Converged Little Legend pattern

```text
named feature
→ parent and project ownership
→ exact browser/API journey
→ privacy and overwrite checks
→ isolated smoke environment
→ readiness scored only from evidence
```

## Champion Coach OS

| Date | Prompt or instruction stage | Instruction shift | Authority and proof change | Recurring failure corrected | Effective starting pattern | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-06-25 | Agentic decision-governance canon | Introduce candidate hypotheses, explicit alternatives, cohort replay, outcome learning, and promotion drafts. | Agents propose and assemble evidence; promotion remains a governed human/system decision. | Generated insight could be mistaken for an approved decision. | Canonical truth → comparison → candidate → validation evidence → governed promotion. | Corroborated: git `23a7201` through `5af4683`. |
| 2026-06-25 | Elite Decision Intelligence expansion | Add feature extraction, replay batches, learning loops, and performance intelligence. | Synthetic replay supports engineering checks but not causal or hosted validity. | Rich telemetry and “elite” naming could imply scientific validation. | Declare the claim, required evidence class, feature flag, and falsification path before building intelligence. | Corroborated: git `44465c2`, `8c0a546`, `ee2dc6b`, `071f098`. |
| 2026-07-19 review | Repo-truth implementation methodology | Encode bounded prompts using canonical truth, comparison, authority filtering, vertical slices, and documentation closure. | A renamed method remains a candidate pattern until independently reproduced. | New terminology was being treated as novelty or maturity evidence. | Reuse the six-stage repo-truth prompt and record independent validation runs before promotion. | Context record plus current repository methodology artifacts; refresh before formal maturity promotion. |

### Converged Champion Coach pattern

```text
canonical source
→ comparison and authority filtering
→ bounded vertical slice
→ falsifiable validation
→ documentation closure
→ candidate maturity until independent replication
```

## Level-three starter for a new project

Begin with these questions instead of a feature list:

1. What records are authoritative, and which are only drafts, caches, proposals, or generated suggestions?
2. Which identity, tenant, role, and object relationships grant each action?
3. Which state transitions require a human, a provider, a webhook, or an audit record?
4. What is the weakest acceptable proof level for this request: local, browser, provider sandbox, hosted, or operational?
5. What must fail closed when evidence is missing, stale, mixed-scope, or contradictory?
6. Which existing route, service, enum, and test contract must remain stable?

Generate a project-specific starting prompt with:

```bash
npm run codex:spec -- --system LeaguePilot --goal "Describe the bounded goal" --proofLevel local
npm run codex:debug -- --system LeaguePilot --symptom "Describe current behavior" --expected "Describe expected behavior"
```

The commands print prompts for review. They do not invoke Codex, edit files, call providers, or mutate repositories.
