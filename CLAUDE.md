# LeaguePilot / Little League HQ

Next.js App Router + TypeScript + Supabase. Root-level production scaffold.
The frozen static MVP lives at `public/prototype/` — never edit it.

## Verify before claiming done

```bash
make validate          # docker compose config + npm run typecheck + npm test
npm run build          # also required when the change affects rendering or routes
npm run lint
```

Do not report a slice complete without running these. If a check fails, say so with the output.

## Hard rules

These are boundaries, not preferences. Violating one is a defect even if tests pass.

1. **`lib/domain/` is protected.** Do not modify it without explicit instruction in the current task.
2. **Never change or add enum values, or add workflow states** (`in_review`, `submitted`, `processing`, …) to make a screen or test pass. State transitions go through the existing state machine.
3. **No Supabase client in UI.** `app/` pages, client components, and `components/` never import a Supabase client. Reads and writes go through `lib/supabase/` adapters.
4. **All provider access goes through `lib/services/`.** Weather, maps, payments, notifications, media, and AI providers are never called from UI code.
5. **No autonomous provider sends.** Email, SMS, push, and chat delivery require opt-in checks, delivery logs, and human approval. Provider sends stay disconnected unless a slice explicitly enables them.
6. **Child privacy defaults hold.** Children do not log in. Player display names are first name + last initial. Parent/guardian accounts own child access.
7. **Role boundaries stay visible** in UI, service policy, and tests — admin, coach, parent.
8. Do not describe local reducer state as real persistence, auth, provider delivery, or access grants.

## Before implementing — documentation gate

Count the files the change will touch:

- **1–2 files** → implement directly.
- **3–5 files** → Design Doc (`docs/design/`) + Work Plan (`docs/plans/`) first.
- **6+ files** → Design Doc + Work Plan, plus ADR if any condition below applies.

**ADR required regardless of size** (`docs/adr/NNNN-title.md`, matching the existing `0001-` convention) when the change involves:
contracts nested 3+ levels or used in 3+ places; storage-location or data-flow order changes;
layer/responsibility moves; a new library, framework, or external API; 3+ managed states or
5+ coordinated async processes.

Frontend/fullstack features add a UI Spec (`docs/ui-spec/`) **before** the Design Doc.
Check `docs/adr/` for an existing decision before proposing a new one.
Full criteria and templates: the `documentation-criteria` skill.

## Definition of done for a production slice

Typed domain contracts where needed · role-scoped service or domain policy · UI states for
success, failure, loading, and empty · audit logging for admin or provider-sensitive actions ·
tests for permission boundaries and critical workflow behavior · updated `docs/Features.md`.

## Where the truth lives

Read the relevant one before planning. Do not infer these from code alone.

- **`AGENTS.md`** — repo layout, Docker runbook, per-task skill selection.
- **`docs/codex-rules.md`** — full rule text, violation examples, and the every-task SaaS
  checklist (tenant isolation, actor authorization, audit, idempotency, threat check).
- **`docs/production-task-board.md`** — the applicable task row and extra checks for billing,
  providers, storage, migrations, and releases.
- **`docs/Features.md`** and **`docs/capability-matrix.md`** — shipped capability, provider
  boundary state, remaining production gaps.
- **`docs/agentic-architecture.md`** — human-in-the-loop agent boundaries. Agents recommend,
  draft, and flag; humans approve; services enforce.

## UX work

`docs/product-experience/leaguepilot/` holds a numbered remediation series. Before starting UX
work read the highest-numbered `lp-ux-NNN-*.md` — it records applied fixes, verification status,
and items explicitly deferred pending user approval.

This series is a serial engagement log, **not** the UI Spec convention above. Leave it where it
is; do not migrate it into `docs/ui-spec/`.
