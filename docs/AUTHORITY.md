---
authority: active
answers: authority-register
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---

# Authority Register

The root of the documentation tree. Every question this repository answers has
**exactly one owner**. If two documents answer the same question, that is a
defect, and `npm run check:governance` reports it.

This file is itself the owner of the question "who owns what", so it is the only
file permitted to assign ownership.

## Two standing rules

1. **One question, one owner.** The problem is never document count. It is two
   documents answering the same question and drifting apart.
2. **Where code can be the authority, code is the authority.** A document that
   restates code is commentary and must be labelled as such. Code cannot go
   stale silently; prose can, and has.

## Register

| Question | Owner | Kind |
| --- | --- | --- |
| Who owns what? | `docs/AUTHORITY.md` | doc |
| What do we build next? | `BACKLOG.md` | doc |
| What is implemented, and how is it proven? | `docs/capability-matrix.md` | doc |
| What external gates remain open? | `docs/backlog-closeout-2026-07-27.md` | doc |
| What rules constrain code changes? | `docs/codex-rules.md` | doc |
| How do agents work in this repository? | `AGENTS.md` | doc |
| What are the production agent boundaries? | `docs/agentic-architecture.md` | doc |
| What is the current product direction? | `docs/product-experience/leaguepilot/lp-ux-016-shared-open-items.md` | doc |
| What are the design tokens? | `app/globals.css` `:root` | **code** |
| What are the routes, labels, and role navigation? | `lib/navigation/route-topology.ts` | **code** |
| What is the database schema and its policies? | `supabase/migrations/` | **code** |
| What are the domain contracts and state machines? | `lib/domain/` | **code** |
| What is the family readiness truth? | *(unbuilt — `lib/open-items.ts` per `lp-ux-016`)* | **code** |

## Decided

Both questions that were contested at the register's creation are now resolved.

### What do we build next? — `BACKLOG.md`

Decided 2026-08-22. `.agentflow.yaml` `backlog.path` already obeyed it, and when
automation and prose disagree the safer edit is to the prose. `R7` now enforces
that these two can never drift apart again.

Retired in its favour: `docs/missing-production-slices-work-plan.md`,
`docs/agentflow-missing-production-backlog.md`, `docs/legacy-product-roadmap.md`.

`docs/backlog-closeout-2026-07-27.md` was never a candidate. The claims made for
it are about gates and evidence — the `external-gates` question it owns cleanly.

### What is implemented, and how is it proven? — `docs/capability-matrix.md`

Decided 2026-08-22. Implementation truth here is inseparable from proof state,
and the matrix already models it per capability. `docs/Features.md` is retired
and reads as a changelog.

This removes the instruction in `docs/feature-fit-backlog.md` to consult both,
which was the defect stated as policy.

## Retired

Superseded documents. Kept, never deleted — several are cited as proof evidence
elsewhere. Each declares `superseded_by` in its front matter.

| Retired document | Superseded by |
| --- | --- |
| `docs/backlog-now.md` | `docs/backlog-closeout-2026-07-27.md` |
| `docs/backlog-next.md` | `docs/backlog-closeout-2026-07-27.md` |
| `docs/feature-fit-backlog.md` | `docs/backlog-closeout-2026-07-27.md` |
| `docs/legacy-product-roadmap.md` | `BACKLOG.md` |
| `docs/missing-production-slices-work-plan.md` | `BACKLOG.md` |
| `docs/agentflow-missing-production-backlog.md` | `BACKLOG.md` |
| `docs/Features.md` | `docs/capability-matrix.md` |

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `active` | The single owner of its question. At most one per question. |
| `contested` | Claims a question another `contested` doc also claims. A defect awaiting decision. |
| `historical` | Superseded. Requires `superseded_by`. Kept, never deleted. |
| `evidence` | A dated proof record — audits, verification runs, review manifests. Never authoritative, never deleted; proof discipline depends on these surviving. |
| `reference` | A frozen point-in-time packet (for example `docs/enterprise/`). Not maintained, not authoritative. |

## Front-matter contract

Every governance document carries:

```yaml
---
authority: active            # active | contested | historical | evidence | reference
answers: execution-queue     # the question owned; null when the doc answers none
supersedes: []               # paths this doc replaces
superseded_by: null          # path that replaced this doc; required when historical
reviewed: 2026-08-22         # ISO date of last authority review
---
```

`answers` uses a stable slug, not a sentence: `execution-queue`,
`implementation-truth`, `external-gates`, `code-rules`, `agent-workflow`,
`product-direction`, `agent-boundaries`, `authority-register`.

## Enforcement

`npm run check:governance` (`scripts/verify-governance-authority.mjs`) reads
this file and every governance document and reports violations of the rules in
§"Two standing rules" and the front-matter contract.

It runs in **enforcing mode**: errors fail the build. The rule that matters most
is that `.agentflow.yaml` `backlog.path` must equal the active owner of
`execution-queue` — that is what keeps automation and prose from diverging again.

A document that *defers* to a registered owner is compliant and is not reported
("`supabase/migrations/` remain source of truth"). The owner must be named as a
path in the **same sentence** as the claim — a bare word like "migrations", or an
owner mentioned in a neighbouring sentence, does not count. Only the register may
assign ownership; every other document may only defer.

This checker reads repository files only. It performs no hosted, provider,
network, or production action, and it makes no claim about hosted or production
acceptance.
