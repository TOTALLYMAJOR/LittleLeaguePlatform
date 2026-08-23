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
| What do we build next? | **CONTESTED — see below** | doc |
| What is implemented, and how is it proven? | **CONTESTED — see below** | doc |
| What external gates remain open? | `docs/backlog-closeout-2026-07-27.md` | doc |
| What rules constrain code changes? | `docs/codex-rules.md` | doc |
| How do agents work in this repository? | `AGENTS.md` | doc |
| What is the current product direction? | `docs/product-experience/leaguepilot/lp-ux-016-shared-open-items.md` | doc |
| What are the design tokens? | `app/globals.css` `:root` | **code** |
| What are the routes, labels, and role navigation? | `lib/navigation/route-topology.ts` | **code** |
| What is the database schema and its policies? | `supabase/migrations/` | **code** |
| What are the domain contracts and state machines? | `lib/domain/` | **code** |
| What is the family readiness truth? | *(unbuilt — `lib/open-items.ts` per `lp-ux-016`)* | **code** |

## Contested questions

These are unresolved. Until each is decided, the documents below all carry
`authority: contested` and the checker reports them. Resolving one means
promoting a single file to `authority: active` and demoting the rest to
`authority: historical` with a `superseded_by` pointer.

### C-A — What do we build next?

| Candidate | Last touched | Basis of claim |
| --- | --- | --- |
| `BACKLOG.md` | 2026-07-27 | **Machine-read**: `.agentflow.yaml` `backlog.path` |
| `docs/missing-production-slices-work-plan.md` | 2026-07-29 | Declares `Status: active` |
| `docs/agentflow-missing-production-backlog.md` | 2026-07-29 | Declares itself an execution queue |

The sharp problem: automation obeys `BACKLOG.md`, while the two documents that
describe themselves as active are newer than it and no machine reads them.

`docs/backlog-closeout-2026-07-27.md` is deliberately **not** a candidate here.
The claims made for it by `production-task-board.md` and `backlog-next.md` are
about gates and evidence ("the sole current gate ledger"), which is the
`external-gates` question it already owns cleanly.

Recommendation: **`BACKLOG.md`**. When a machine and prose disagree, move the
prose — changing what automation reads is the riskier edit.

### C-B — What is implemented, and how is it proven?

| Candidate | Last touched | Basis of claim |
| --- | --- | --- |
| `docs/capability-matrix.md` | 2026-08-03 | Carries the per-capability proof-gate columns |
| `docs/Features.md` | 2026-08-15 | Named alongside the matrix by `feature-fit-backlog.md` |

`docs/feature-fit-backlog.md` instructs readers to use **both**, which is the
defect stated as policy.

Recommendation: **`docs/capability-matrix.md`**, because implementation truth in
this repository is inseparable from proof state and the matrix already models
it. `Features.md` becomes `historical` and reads as a changelog.

## Retired

Superseded documents. Kept, never deleted — several are cited as proof evidence
elsewhere. Each declares `superseded_by` in its front matter.

| Retired document | Superseded by |
| --- | --- |
| `docs/backlog-now.md` | `docs/backlog-closeout-2026-07-27.md` |
| `docs/backlog-next.md` | `docs/backlog-closeout-2026-07-27.md` |
| `docs/feature-fit-backlog.md` | `docs/backlog-closeout-2026-07-27.md` |
| `docs/legacy-product-roadmap.md` | `BACKLOG.md` |

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
`product-direction`, `authority-register`.

## Enforcement

`npm run check:governance` (`scripts/verify-governance-authority.mjs`) reads
this file and every governance document and reports violations of the rules in
§"Two standing rules" and the front-matter contract.

It currently runs in **reporting mode**: it prints findings and exits 0. It
becomes enforcing once C-A and C-B are decided. The rule that matters most is
that `.agentflow.yaml` `backlog.path` must equal the active owner of
`execution-queue` — that is what keeps automation and prose from diverging
again.

This checker reads repository files only. It performs no hosted, provider,
network, or production action, and it makes no claim about hosted or production
acceptance.
