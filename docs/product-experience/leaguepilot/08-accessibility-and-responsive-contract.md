---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# 08 — Accessibility and Responsive Contract

Binding contract for all family-surface work, 2026-07-29. Baseline: WCAG 2.2 AA (blueprint §19.17). This document turns the blueprint's acceptance items plus audit findings into testable clauses. Claims of compliance require proof artifacts (repo rule); today's contrast proof is unauthenticated and covers 9 of 61 routes, so **no current surface may claim this contract is met**.

## A. Contrast and color

1. Body text ≥4.5:1; large text (≥24px, or ≥18.66px bold) ≥3:1; non-text UI (borders of inputs, focus rings, chip icons) ≥3:1.
2. Color never carries meaning alone: every status = tone + icon + label (04 §4). Child identity is never color-coded (name + team label).
3. Known defects to fix and pin as regressions: `button.secondary.danger` 2.35:1; `.landing-gateway-action.is-primary small` 3.85:1; dark-mode `.verified-context-bar` ≈1.05:1; global `button:disabled { opacity:.5 }` (replace with explicit disabled paints, as already done for `/auth` only); `--page` undefined variable; `--action` on white has 0.05 headroom — pin usage ≥14px/700 or darken.
4. Theme selection: all routes default to light, ignore the device color preference, and switch together only after an explicit Light/Dark selection. The authenticated all-Family-route dark proof passed locally on 2026-08-03 (`lp-ux-005-manual-global-theme.md`); no surface may regress to automatic or accidental inversion.
5. Team branding never reduces status/text contrast below thresholds (existing recorded rule; per-team contrast check belongs in the brand publish path).

## B. Targets, input, one-handed use

1. Touch targets ≥44×44px; consequential actions (RSVP, accept ride, acknowledge critical) ≥48px. Known violations to fix: `.parent-rsvp-glow` 42px (compact 34px), inline RSVP circles 42px, duty links 30px, season-status 30px.
2. Primary event action within thumb reach on mobile (bottom third or sticky bottom bar); destructive/authority actions behind a confirm sheet, never one accidental tap.
3. Full keyboard operability: visible focus (one ring system, inputs included), logical order, skip-link (deduplicate the two competing `.skip-link` definitions), focus return on sheet/dialog close (command-palette pattern already does this), no keyboard traps.
4. No hover-only content, no gesture-only actions, no automatic carousels (blueprint global patterns; the coach announcement ticker's pause control satisfies this on staff surfaces — do not import tickers into family surfaces).

## C. Structure and semantics

1. One `h1` per route; heading levels do not skip; the current multi-`h1` composites (family-access, Home's embedded pages) are non-conforming.
2. Landmarks: single `main` per page; nav labeled; the status/receipt regions use `role="status"` / polite live region (existing `#live-region` is the single channel).
3. All 12 canonical states (loading, empty, pending, offline, error, cancelled, changed, expired, completed, denied, conflict, success) render textually — spinners/skeletons carry `aria-busy` + text.
4. Tables/lists: agenda rows are lists with per-row context (child, team, time, status) readable by screen reader in one pass — no essential-text truncation (blueprint §19.2).
5. Forms: label-above always; errors as text+icon adjacent to field, announced politely; never placeholder-as-label.

## D. Reflow, zoom, motion, environment

1. 400% reflow → single column, no horizontal scroll; 200% zoom → no loss of content or function. (Communication Room already has a recorded 400% one-column rule — generalize it.)
2. `prefers-reduced-motion`: existing global kill-switch retained; no content-bearing animation; no autoplaying video in the family shell.
3. `forced-colors`: keep and extend existing blocks to all new components (chips, sheets, filter, passport).
4. Language: `lang` attribute correct; family copy at plain-language reading level; translated-overflow tolerance in chips and buttons (min-width strategies, no fixed-width labels).

## E. Responsive contract

| Breakpoint | Shell | Rules |
| --- | --- | --- |
| <640px | Family header (compact) + bottom tabs | Single column; sticky date headers on agenda; sheets full-screen; page-height budgets (07): overview ≤4 viewports, task ≤3, reference ≤6 |
| 640–899px | Same | Two-column card rails allowed; passports full-width |
| ≥900px | Family header (wide) + rail/tabs from same 5 destinations | Overview 1152px; reading/task 820px; passport + action rail 8/4 grid (blueprint desktop composition); no fixed sidebar on family routes |

1. One breakpoint system (the shell's 900px + component 640px), replacing the current scattered 410/640/760/820/900/1023px set.
2. No document-level horizontal overflow at 320, 390, 768, 1024, 1440 (existing proof widths, unified).
3. Safe-area insets honored on the tab bar (already done) and on sheets (new).
4. Offline/freshness truth visible at every width: compact "Updated 4:10 PM · offline" line, never hidden on mobile.

## F. Proof harness (definition of done for this contract)

1. Upgrade `scripts/verify-theme-contrast-proof.mjs`: authenticated demo-parent session, all family routes, light mode (dark added only when a dark theme ships), regression fixtures from A.3.
2. Playwright sweeps at the five widths for every changed route: overflow check, target-size audit (existing 44px checks in QA scripts — generalize), first-viewport screenshot.
3. axe-core (or equivalent) pass per changed route: zero critical/serious.
4. Manual/moderated items stay open and honest (repo ledger): screen-reader walkthrough of Home→RSVP→ride, 200%/400% checks, outdoor sunlight readability, one-handed timed task. These are `EXT`-class evidence; docs must not claim them from automated runs.
5. Every PR touching family surfaces cites: contrast proof artifact, viewport sweep artifact, axe result. Claims without artifacts are non-conforming (matches repo proof discipline).
