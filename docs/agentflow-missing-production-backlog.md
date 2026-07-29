# LeaguePilot Missing Production Slice Execution Queue

This reviewed AgentFlow queue executes the LeaguePilot missing-production work
one commit at a time from the current `codex/ui-ux-100-shell-chat` lineage.
The full slice inventory and external proof boundaries are governed by
`docs/missing-production-slices-work-plan.md` and
`docs/exceptional-ux-acceptance-audit.md`.

This queue does not deploy, apply migrations to a hosted project, mutate
production data, enable provider sends, enable payments, enable private media
uploads, change DNS, configure secrets, or claim hosted/provider/production
acceptance. Those gates remain explicit in the governing plan.

## LPM-001 - Finalize production proof baseline ledger

```yaml
estimate_hours: 3
depends_on: []
owns:
  - docs/missing-production-slices-work-plan.md
  - docs/exceptional-ux-acceptance-audit.md
  - docs/production-proof-baseline-2026-07-29.md
  - docs/production-task-board.md
validate:
  - npm run check:skills
  - npx vitest run app/route-guards.test.ts app/routes-smoke.test.ts app/provider-boundary.test.ts lib/navigation/route-topology.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: production-proof-baseline-ledger
    type: local-proof-boundary-ledger
    version: 1.0.0
    path: docs/production-proof-baseline-2026-07-29.md
consumes: []
```

Finalize the local production-proof baseline before any hosted, provider,
payment, private-media, or native slice begins. Use current repository state as
the authority. Preserve the dirty source checkout boundary: unrelated parent
dashboard source edits, generated Playwright output, `.history`, and preserved
AgentFlow task worktrees are not part of this slice.

The ledger must record branch/upstream state, dirty-tree caveats, validation
commands, local proof results, skipped external proof with exact required
inputs, and the open remote gates for RLS, Realtime, backup/PITR/restore,
hosted role browser proof, provider sends, Stripe/payment, private media, and
native app decisions.

### Acceptance Criteria

- The baseline ledger records the current branch, current HEAD, upstream
  relationship, dirty-tree caveats, prior AgentFlow cleanup state, and the
  exact proof boundary between local implementation, hosted verification,
  provider operation, production acceptance, and external decision gates.
- `docs/missing-production-slices-work-plan.md` remains the governing
  dependency-ordered task inventory for LPM-001 through LPM-012 and identifies
  which slices are locally executable versus hosted, provider, payment, media,
  storage, or product-decision gated.
- `docs/exceptional-ux-acceptance-audit.md` remains consistent with the
  baseline ledger and does not mark live provider sends, Stripe settlement,
  private media upload/scanning, native app distribution, production Realtime,
  backup/PITR/restore, or full hosted lifecycle proof as complete.
- Required QA variables for `npm run qa:rls-proof` are listed, but the command
  is not run unless an isolated QA target is configured and confirmed. No
  provider sends, hosted mutations, production mutations, deployments, or
  migrations are performed.
- The focused route/provider/navigation tests, skill check, typecheck, build,
  and whitespace validation pass or have exact blockers recorded in the
  baseline ledger.
