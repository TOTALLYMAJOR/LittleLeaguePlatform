# LeaguePilot UX Convergence Engagement — Status

Engagement: Production-grade parent experience convergence (audit, experience architecture, and bounded implementation).
Audit completed and LP-UX-001 implemented locally: 2026-07-29. Corrections completed locally: 2026-07-30.

## Current phase

**LP-UX-001 FAMILY SHELL CONVERGENCE IS DONE-LOCAL-CORRECTED.** The reviewed shell-only slice on `ux/lp-ux-001-family-shell` has a local correction commit that aligns shared-route shell authority with server data scope, removes delayed client-only role discovery from first render, guards `/parent/more` through parent access, and regenerates expanded browser proof.

This state means local code, tests, build, and authenticated browser evidence only. Nothing was pushed, merged, deployed, promoted, or accepted on a hosted environment. No route move, domain behavior, provider operation, permission weakening, schema, migration, or staff business logic changed.

## Deliverables (all in this directory)

1. `01-current-experience-audit.md` — two-systems hypothesis resolved; capability classifications; 16 brief examinations answered; systemic diagnosis.
2. `02-role-and-operating-context.md` — actors, operating conditions, non-negotiable trust rules, engineering constraints.
3. `03-route-and-navigation-map.md` — route inventory, nav defects, recommended IA (Home/Schedule/Messages/Family/More), RSVP decision, migration map.
4. `04-production-design-system.md` — color roles, typography, spacing/radius/elevation, one status vocabulary, component canon, dark-mode decision.
5. `05-saturday-ready-current-state.md` — step-by-step trace; workflow completable today; gaps; report-only authorization findings.
6. `06-saturday-ready-target-state.md` — target loop, per-step specs, honesty constraints.
7. `07-surface-consolidation-plan.md` — 5 archetypes, per-surface decisions, shells 6→3, density contract, priorities P1–P7.
8. `08-accessibility-and-responsive-contract.md` — testable clauses + proof harness upgrade.
9. `09-first-five-implementation-slices.md` — bounded slices 1–5 + deferred list.
10. `10-reference-implementation-brief.md` — reference slice (Family Home → What Changed → Next Event → RSVP), acceptance, bounded Codex handoff prompt.
11. `lp-ux-001-correction-verification.md` — independent-review correction summary, exact local gates, and browser proof manifest summary.

## Headline findings (full detail in 01)

- The warm light Family Home system remains the visual foundation (token palette shipped 2026-07-27, commit `ffb1c9b`). The accidental `prefers-color-scheme` inversion identified by this audit was retired on 2026-08-03: Light is now the first-visit default, and a deliberate, locally contrast-proven Dark theme is available only by explicit user selection (`lp-ux-005-manual-global-theme.md`).
- Six shells, three simultaneous parent nav models, 9,716-line `feature-panels.tsx`, `/parent/settings` = duplicated dashboard, `/parent/photos` = team-portal capability inventory (14,224px mobile).
- Domain truth is strong: RSVP, transportation (mutual acceptance), official comms + acknowledgement, guardians/caregivers, season transitions are LIVE AND AUTHORITATIVE with version binding and in-SQL authorization. The UX debt is composition, not capability.
- "What Changed" is version-derived; `event_change_logs` (full field diffs) is write-only — the highest-leverage single upgrade.
- Report-only security findings passed to maintainers (05 §gaps): ICS export cross-tenant read, chat read-receipt authz, weather-draft authz, missing media-consent writer, chat retention no-op.

## Decisions of record made by this engagement

1. Light family system = foundation (evidence-based; resolves brief hypothesis).
2. Parent IA: Home / Schedule / Messages / Family / More; RSVP is an action + task view, not a nav destination (records an explicit amendment to blueprint §5's "Replay" slot).
3. Warm palette adopted as palette of record; blueprint's semantic token names and component API adopted over raw names (recorded amendment of blueprint §8 cobalt).
4. Theme selection (amended 2026-08-03): the deliberate, authenticated, contrast-proven dark theme now exists locally. All routes default to Light and follow a saved explicit Light/Dark selection; device preference does not select the app theme.
5. Reference slice: Family Home → What Changed → Next Event → RSVP (Stage A shell + Stage B surface); Transportation and Communication follow in later slices.

## Git status at end of engagement

LP-UX-001 branch: `ux/lp-ux-001-family-shell`, based on `472790cff6ace95bd9329080f073eb77086da22e`. The exact implementation commit is `049c4b1e3f85549f4316e075b84d05bd3a56694e` with message `ux(parent): converge family shell and navigation`. The production-experience documents are preserved in the separate baseline commit that follows it. No push, merge, rebase, deployment, or promotion is inferred.

## LP-UX-001 local evidence

- `output/playwright/family-shell/proof.json` records 80 route-viewport results across parent, coach, admin, neutral, and signed-out contexts at 320, 390, 768, 1024, and 1440 pixels.
- All axe-checked Family results have zero critical/serious violations, no document overflow, 44px minimum shell controls, visible keyboard focus, the explicit light Family theme under dark device preference, exact mobile tabs, active destinations, and no family sidebar video or duplicate context bars.
- Shared-route browser proof covers `/team-chat` and `/team-portal` in parent, coach, and administrator contexts. Initial JavaScript-disabled render and hydrated render keep the same shell, resolved role, and data-scope marker.
- Neutral transition proof covers `/access/status` and `/invite/accept`; signed-out proof covers `/parent/more`; Account proof covers reachable keyboard focus for Sign out.
- `npm run qa:contrast-proof` passes its existing nine-route light, dark, and team-theme contract. Coach retains a pre-existing dark-device contrast issue outside the LP-UX-001 family boundary; it is not relabeled as fixed.
- `npm run typecheck`, the complete 672-test Vitest suite, focused shell tests, and `npm run build` pass. ESLint exits zero with pre-existing warnings outside the slice. `npm audit` still reports nine high-severity development-toolchain findings whose complete suggested fix requires a breaking ESLint upgrade.
- The proof uses authenticated demo sessions and does not run row mutations or provider sends.

## Remaining work (next engagement)

1. Review the local LP-UX-001 commit and decide whether to publish it separately; hosted route proof remains a later, explicit action.
2. LP-UX-002 may begin as a separate local slice after this branch is reconciled, without broadening LP-UX-001 into Home/content/domain work.
3. Triage the report-only security findings independently of UX work.
4. Slices 3–5 (09), then P6–P7 (transportation sheets, Communication Room density).

## Continuation prompt (self-contained)

You are continuing the LeaguePilot UX convergence engagement at
`/home/administrator/projects/youth-sports-platform-mvp-v3`. The read-only audit and
experience-architecture phase and LP-UX-001 are COMPLETE LOCALLY. Read `docs/product-experience/leaguepilot/`
files 00 through 10 in order; 00 (this file) lists decisions of record and remaining
work. Constraints that survive into implementation: docs/codex-rules.md strict rules;
no second CSS framework; compatibility routes preserved; child-privacy display rules;
acknowledgement = receipt only; claims stay done-local without hosted proof; QA guard
LP-QA-GUARD-001 (no row-mutating proofs outside isolated QA). Keep later slices on
separate branches and do not infer hosted acceptance from LP-UX-001 local evidence.
