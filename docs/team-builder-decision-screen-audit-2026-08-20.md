# Team Builder Decision Screen Audit - 2026-08-20

This audit reviews a proposed Team Builder scenario-comparison screen against a ten-category UI rubric plus five decision-screen questions, and records the rebuild that closes the findings.

## Verdict

**The reviewed design is not shippable as drawn: 11/30, with five release blockers.** The design understands its hardest problem — it is the only LeaguePilot decision surface that states its own authority boundary in plain language — but four separate mechanisms above that statement undermine it. The recommendation is contradicted by the numbers printed beside it, metric colour makes claims the system has not defined, the two halves of each scenario card cannot be reconciled, and the authority assurance is static copy on a four-step flow that ends in publication. A rebuild that closes every finding is recorded in `docs/prototypes/team-builder-decision-screen.html`.

## Source Truth And Scope

- Reviewed artifact: a single static 1536px capture of the proposed screen at step 1 of 4. No Figma file, running build, or branch was available to this review.
- **This is not an audit of shipped code.** `components/team-builder-workbench.tsx` (364 lines) implements a different surface — private player inputs, friend constraints, and plan scope. It contains no scenarios, recommendation, metrics, or publish stepper. The reviewed design is a proposal, not the current build.
- Runtime, responsive, and interaction findings below are inferred from layout geometry and are marked `unproven` where they could not be observed. Contrast was designed against targets but not measured with a checker; no screen reader was run.
- Numeric claims are computed from values legible in the capture and are reproducible from the tables below.
- Public interface impact: none. No routes, APIs, schemas, migrations, domain contracts, or provider behavior are changed by this audit or by the prototype, which is a docs artifact with no runtime integration and is not served.

## Rubric

| Score | Meaning |
| --- | --- |
| `0` Missing | Not addressed. |
| `1` Weak | Present but confusing or fragile. |
| `2` Good | Works for normal cases. |
| `3` Excellent | Clear, resilient, accessible, and proven with edge cases. |

Any failure involving authorization, privacy, destructive actions, misleading state, keyboard access, or unreadable contrast is a release blocker regardless of total score.

## Release Blockers

### B1 - The recommendation contradicts the numbers printed next to it

"Competitive balance" carries the Recommended badge, but on every measure the card displays, "Family convenience" is equal or better except one. The screen never states which objective the recommendation optimises for.

| Measure | A - Competitive balance | B - Family convenience | Better |
| --- | ---: | ---: | --- |
| Strength variance | 0.18 | 0.31 | A |
| Coach coverage | 100% | 100% | tie |
| Requests satisfied | 78% | 91% | B |
| Avg travel | 14 min | 9 min | B |
| Relaxed constraints | 7 | 5 | B |
| Required decisions | 2 | 1 | B |

A wins one of six. If strength variance is the league's dominant objective, that priority is the most important fact on the page, and it appears nowhere — presumably buried behind `Inputs & constraints` in the far corner, furthest from the decision.

### B2 - Metric colour has no defined meaning and contradicts itself

Green, amber, and plain dark text all appear in the metric row with no legend and no consistent rule.

- **Better value, worse colour.** `14 min` and `9 min` render green; `12 min` renders plain dark. Twelve is better than fourteen.
- **Worse value, better colour.** Requests satisfied `78%` is green; coach coverage `83%` is amber. Different metrics may carry different thresholds, but the screen never says so.
- **Direction unstated.** Strength variance is green at `0.18` and at `0.31`. Nothing tells an administrator whether lower is better.

### B3 - The two halves of each card do not reconcile

| Scenario | Satisfied | Relaxed | Req. decision | Sum | Implied by % |
| --- | ---: | ---: | ---: | ---: | ---: |
| A - Competitive balance | 42 | 7 | 2 | 51 | ~54 |
| B - Family convenience | 49 | 5 | 1 | 55 | ~54 |
| C - Coach coverage | 47 | 6 | 2 | 55 | ~54 |

The percentages are self-consistent against a fixed pool of roughly 54 requests (42/54 = 78%, 49/54 = 91%). The counts are not: they total 51, 55, and 55. Either denominators genuinely differ per scenario, in which case the card must say so, or the fixtures are wrong. The vocabulary compounds it: "Requests satisfied" above and "Satisfied" below invite a reconciliation the numbers cannot survive.

### B4 - The authority disclaimer is static on a four-step flow

"Recommendation only. No roster or coach access has changed" is the screen's strongest claim and its most fragile. It is fixed footer copy on a persistent bar across a flow that continues through `Confirm coaches` and `Approve & publish`. If that bar persists unchanged, the sentence becomes false at exactly the moment its accuracy matters most. The line must be derived from system state, naming what has and has not changed at each step.

### B5 - Metric judgements are carried by colour with no text equivalent

The status rows pair icon, word, and number, so they survive greyscale, forced-colors, and colour blindness. The metric row above them encodes good/warning purely as hue on the digits — a WCAG 1.4.1 failure that removes the entire evaluative layer for anyone who cannot resolve the colour.

## Significant, Not Blocking

| ID | Finding |
| --- | --- |
| S1 | Card A has a heavy border and a solid button reading "Select scenario A". The styling reads as already chosen; the label reads as not yet chosen. One signal is lying. |
| S2 | Four orange calls to action, two of them solid. The relationship between selecting a card and "Select for review" in the footer is never stated. |
| S3 | Only card A is named. B and C carry no letters anywhere, so an administrator cannot say "let's go with B". |
| S4 | "Why scenario A?" describes A but never compares. No "why not B", and no way to see B's or C's tradeoffs without committing. |
| S5 | Cards A and B use the slot under the metrics for a rationale; card C uses it for a warning and therefore has no rationale. One slot, two jobs. |
| S6 | "Required decision: 2" is shown on every card and actionable from none. Nothing says what the decisions are or whether they block publication. |
| S7 | The same warning triangle marks a summary count, a tradeoff, and a genuine coach gap that likely prevents publishing. Three severities, one treatment. |
| S8 | No generation timestamp, no staleness signal, no data-completeness disclosure. On a screen whose pitch is transparency, undisclosed staleness is the sharpest available failure. |
| S9 | `Inputs & constraints` is the only revise path and the only back-out, sits furthest from the scenarios, and gives no indication that changing it discards the comparison. |

## Scorecard

| Category | Score | Note |
| --- | :---: | --- |
| Purpose and clarity | 2 | Audience and job are unmistakable in under five seconds. The primary action is not. |
| Information hierarchy | 2 | Metrics sit in identical positions across cards, so the eye compares without reading. Undercut by vocabulary collision and unnamed B/C. |
| Workflow | 1 | Four-step spine is correctly ordered. No visible back or cancel, no gating, no prevention of invalid selection, two competing select actions. |
| Product truth | 1 | Carries the best line on the screen, then contradicts it four ways. |
| States and resilience | 0 | Not addressed. "No feasible scenario" is the most important state a constraint solver has and is not designed. |
| Accessibility | 1 | Status rows are correct. Metric row is colour-only. Focus, keyboard, names, contrast all unproven. |
| Responsive behaviour | 0 | Not addressed, and this is the hard case. Metric labels already wrap at 1440; at 1024 each card falls to ~245px and cannot hold a four-column grid. Below 768, stacking destroys the comparison. |
| Efficiency | 2 | Best-executed category. Three scenarios in one view, context persists in the header. No sort or best-in-column emphasis. |
| Visual quality | 2 | Coherent and product-like. Deductions for inconsistent metric colour and the rationale/warning slot collision. |
| Evidence and acceptance | 0 | No evidence of realistic data, and the fixtures are internally inconsistent per B3. |
| **Total** | **11/30** | |

## Five Decision-Screen Questions

| # | Question | Verdict |
| --- | --- | --- |
| Q1 | Can the administrator compare scenarios without opening each one? | Partly (2). Yes at summary level — the real achievement. No sort, no best-in-column, B and C unnamed. |
| Q2 | Can they explain why one scenario is recommended? | No (1). The panel describes A, never justifies A over B. See B1. |
| Q3 | Can they see every relaxed constraint and affected person? | No (1). Tradeoffs reconcile to the card count (4 + 3 = 7), which is worth keeping, but it is counts only, scenario A only, and every child sits behind one link. |
| Q4 | Is it unmistakable that selecting does not publish? | Partly (2). Stated explicitly in plain language. Weakened by two competing select actions and by being static copy. |
| Q5 | Are roster publication and coach-access changes separately confirmed? | Partly (2). Structurally correct — steps 3 and 4 are distinct. Neither confirmation is shown, so proportionality is unproven. |

## Not Assessable From A Static Image

Recorded as `unproven`, not as passed. Each requires checking in a running build.

- **Contrast.** The amber values look borderline. Large `83%` likely clears 3:1 as large text; the smaller amber warning line is the one to measure against 4.5:1. Measure all three semantic colours plus grey metric labels and inactive stepper text.
- **Keyboard and focus.** Whether the card is clickable while containing a button (a nested-interactive problem), tab order across cards, visible focus on the stepper, and whether steps 2-4 are correctly disabled.
- **Accessible names.** Status icons, both header dropdowns, and the chevron on "Inspect player-level reasons".
- **Forced colors and dark mode.** The evaluative layer is colour-carried. Status rows degrade acceptably; the metric row does not degrade, it disappears.
- **Touch targets and the sticky bar** at 390px, where two footer buttons will wrap over already-dense content.
- **Zoom to 200% and long text** — real scenario names and cards carrying three warnings instead of one.

## Fix Order

Sequenced by what unblocks release, then by what makes the screen honest.

1. **State the objective that drives the recommendation.** Put the league's priority next to the badge. Without it the badge is an unsupported claim; with it, most of B1 dissolves.
2. **Give every metric a stated direction and threshold, in text.** "Lower is better, target under 0.25." Colour then reinforces a visible rule, fixing B2 and B5 together.
3. **Make the counts and the percentage reconcile, visibly.** Show the denominator and make the status counts sum to it.
4. **Derive the authority line from system state,** naming what has and has not changed at each step.
5. **Resolve select-versus-selected.** One primary action. Card buttons choose and read "Chosen" once chosen; the footer commits. Name B and C.
6. **Design the failure and freshness states** — generating, no feasible scenario, partial, stale inputs, concurrent edit. "No feasible scenario" is the most likely real-world state and currently has no design.
7. **Decide the sub-1024 comparison pattern.** The card grid breaks before 1024 and stacking defeats the purpose.
8. **Re-run with adversarial fixtures** — zero coach coverage, long team names, many warnings, and the intended admin role rather than a superuser.

## Rebuild

`docs/prototypes/team-builder-decision-screen.html` is a self-contained working rebuild that closes every finding above. It is a design artifact only: no build integration, no data access, no routes.

Structural change: measures became rows and scenarios became columns, so comparison is a straight read across and survives to 320px via a sticky measure column rather than stacking.

| Finding | Closed by |
| --- | --- |
| B1 | The objective is on screen with its source and is switchable. Changing it visibly moves the Recommended badge. |
| B2 | Every value carries its own target in text, then `Meets target` / `Below target` / `Blocks publishing`. |
| B3 | Tallies total exactly 54 on every scenario and match the percentages. Verified programmatically. |
| B4 | The dock line is derived from progress: nothing changed, in review, coaches confirmed, published. |
| B5 | Colour only ever reinforces a word already present. |
| S1-S9 | Radio-button choice reading "Chosen", one primary action, all three scenarios lettered, per-person relaxed-request lists, actionable decisions, severity separated, provenance bar with staleness, and an explicit warning that editing inputs discards the comparison. |
| States | Seven switchable states: generating, ready, inputs changed, partial, no solution, edit conflict, solver failure. |
| Q5 | Roster publication and coach access are independent checkboxes. Either can be done alone; only publication requires typing to confirm. |

Verified in Chromium across 320 / 390 / 768 / 1024 / 1440: no horizontal overflow at any width, no page errors through the full flow, publish correctly gated behind unresolved decisions and coach coverage. Contrast and screen-reader behavior remain unverified.

## References

- `components/team-builder-workbench.tsx` - the currently shipped Team Builder surface, which this proposal does not describe.
- `docs/ui-ux-100-implementation-scorecard.md` - global UI pattern evidence and scoring precedent.
- `docs/ui-wireframe-screen-specs.md` - design and frontend planning artifact conventions.

## Update History

| Date | Version | Changes | Author |
| --- | --- | --- | --- |
| 2026-08-20 | 1.0 | Initial audit and rebuild | Claude (Opus 5) via Claude Code |
