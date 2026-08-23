---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# Enterprise Artifact Packet

Status: initial repo-grounded packet prepared 2026-07-16.

This directory turns the existing LeaguePilot docs into an enterprise-ready artifact set. Each document separates current implementation truth from draft target state and deferred provider decisions.

## Artifact Index

| Enterprise artifact | Prepared source | Current status |
| --- | --- | --- |
| Software Requirements Specification | `docs/enterprise/srs.md` | Drafted from current routes, docs, and proof boundaries. |
| Business capability model | `docs/enterprise/business-capability-model.md` | Drafted with maturity and gap labels. |
| Use cases, journeys, process maps | `docs/enterprise/user-journeys.md` | Drafted for parent, coach, admin, provider, media, and archive flows. |
| Data model and ERD | `docs/enterprise/data-model-erd.md`; `docs/supabase-data-model.md`; `supabase/migrations/` | Drafted overview plus canonical migration sources. |
| ADRs | `docs/adr/0000-template.md`; `docs/adr/0001-human-in-the-loop-agents.md` | Existing ADR baseline; more ADRs needed for Supabase/Auth, provider sends, and deployment. |
| Current and target architecture | `docs/enterprise/architecture.md`; `docs/agentic-architecture.md` | Drafted with Mermaid diagrams and target integration posture. |
| Technology reference model | `docs/enterprise/architecture.md`; `docs/tech-stack.md` | Drafted and linked to current stack guidance. |
| Integration reference architecture | `docs/enterprise/architecture.md`; `docs/enterprise/api-specification.md` | Drafted for Supabase, provider delivery, weather, AI, media, billing, and mobile. |
| API specifications | `docs/api/openapi.yaml`; `docs/enterprise/api-specification.md` | Initial OpenAPI draft for current route handlers. |
| Solution overview and module design | `docs/enterprise/architecture.md`; `docs/enterprise/business-capability-model.md` | Drafted. |
| Navigation and wayfinding UX artifacts | `docs/enterprise/navigation-wayfinding-artifacts.md` | Added for kid-friendly route guidance, screenshot evidence, user journeys, information architecture, and shell design. |
| Roadmap | `docs/production-task-board.md`; `docs/backlog-now.md`; `docs/backlog-next.md` | Existing execution board and backlog remain canonical. |
| Governance framework | `docs/enterprise/governance-risk.md`; `docs/codex-rules.md`; `docs/privacy-security.md` | Drafted from current privacy, child safety, and provider rules. |
| Software development plan | `docs/enterprise/deployment-operations.md`; `docs/runbook.md`; `docs/codex-rules.md` | Initial lifecycle and validation plan drafted. |
| Risk and threat model | `docs/enterprise/governance-risk.md` | STRIDE-style initial model drafted. |
| Test plan and traceability matrix | `docs/enterprise/test-release-plan.md` | Drafted with requirement-to-proof traceability. |
| QA and test reports | `docs/enterprise/test-release-plan.md`; `docs/production-audit-action-items.md`; `docs/build-progress.md` | Current evidence linked; release-specific reports still per release. |
| Release notes and version description | `docs/enterprise/test-release-plan.md`; `CHANGELOG.md` if added later | Template drafted; dedicated changelog can be restored if release process requires it. |
| Coding standards report | `docs/enterprise/test-release-plan.md` | Initial evidence model drafted. |
| Installation and deployment manual | `docs/enterprise/deployment-operations.md`; `docs/runbook.md` | Drafted. |
| Operations and runbook manual | `docs/enterprise/deployment-operations.md`; `docs/runbook.md` | Drafted with monitoring and incident gaps. |
| User manual and admin guide | `docs/enterprise/user-journeys.md`; route docs still needed | Journey-level draft exists; end-user manual remains open. |
| README and docs structure | `README.md`; this index | Updated. |

## Minimal Enterprise-Ready Subset

| Subset item | Current source | Status |
| --- | --- | --- |
| SRS | `docs/enterprise/srs.md` | Drafted. |
| Target architecture diagram and ADRs | `docs/enterprise/architecture.md`; `docs/adr/` | Drafted; ADR backlog identified. |
| API specs | `docs/api/openapi.yaml` | Initial draft; field-level schemas should tighten as contracts stabilize. |
| Data model/ERD | `docs/enterprise/data-model-erd.md`; `docs/supabase-data-model.md` | Drafted overview; migrations remain source of truth. |
| Test plan and QA report | `docs/enterprise/test-release-plan.md` | Drafted and linked to current validation evidence. |
| Deployment and operations manuals | `docs/enterprise/deployment-operations.md`; `docs/runbook.md` | Drafted. |
| Release notes and README | `docs/enterprise/test-release-plan.md`; `README.md` | README updated; release template drafted. |

## Maintenance Rules

- Update `docs/Features.md`, `docs/capability-matrix.md`, and this packet when a capability changes state.
- Do not mark provider sends, Stripe collection, media uploads, OpenAI output, or native mobile distribution production-ready unless implementation and hosted/provider proof both exist.
- Keep RLS, route tests, browser proof, and release notes tied to exact commands and artifacts.
- Add a new ADR for major changes to auth, deployment, provider sends, data retention, billing, AI provider posture, or mobile architecture.
