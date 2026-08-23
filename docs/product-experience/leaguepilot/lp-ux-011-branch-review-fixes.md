---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-011 Branch Review Fixes

Date: 2026-08-15

Status: `done-local-browser-verified`

Branch: `ux/lp-ux-001-family-shell`

Trigger: user asked to code-review the branch (`ux/lp-ux-001-family-shell`, +6,882/−479 vs `main`) before merging to production. A six-area multi-agent review (routing/redirects, the theme system, the intro overlay, coach/admin changes, landing enhancements, cross-cutting CSS/tests) ran with adversarial verification on every serious finding. 18 agents completed cleanly; **12 confirmed, 0 refuted, 7 unverified minors**. All 12 confirmed findings are fixed below.

## Confirmed Findings — Fixed

| # | Severity | Finding | File | Fix |
|---|---|---|---|---|
| 1 | critical | Replaying the intro right after Skip/dismiss left a dangling, uncancellable `setTimeout` that force-hid the *new* playback ~600ms later | `landing-intro-overlay.tsx` | Store the leave-timer handle in a ref; `dismiss()` clears any prior handle before arming a new one, and `onReplay()` clears it before restarting. Verified: replaying within the old 600ms danger window now survives past that point. |
| 2 | major | No focus containment on the intro overlay — keyboard/AT users could Tab straight into fully-obscured, fully-active landing-page controls (nav, action cards, Replay button) while the overlay visually covered them | `landing-intro-overlay.tsx` | On mount (`phase === "playing"`), set `inert` on the hero section and the public header, move focus to the Skip button, and restore both (inert off, focus back to the pre-overlay active element) on dismiss. Verified via computed `document.activeElement`/`.inert` state at each phase. |
| 3 | major | Mascot-flip finale combined 8 hard-cut badge swaps (~8.3/s) with a full-viewport white flash pulsing at ~7-8 excursions/second — a genuine general-flash/photosensitive-seizure risk, unconditional for any visitor without `prefers-reduced-motion` set | `globals.css` | Removed the full-viewport `.li-mascots::after` white-flash layer and its `li-flash` keyframe entirely. Badge swaps changed from instant on/off (`li-badge-frame`) to soft cross-fades (`0%/100% opacity:0`, `30%/70% opacity:1`), duration extended 0.12s→0.22s per badge. Confirmed via computed style that the `::after` flash layer no longer exists. |
| 4 | major | `.landing-gateway-copy`'s three new content blocks (dedication line, game-day chip, 3-item assurances list) pushed the primary conversion CTAs (Schedule/Sponsors/Sign-in cards) below the fold on ordinary laptop viewports (1440×900, 1366×768), on a hero deliberately built as a single no-scroll viewport | `globals.css` | Shrank `.landing-gateway-copy`'s oversized `clamp(150px, 19vh, 220px)` bottom padding (load-bearing for nothing — it's an independent grid row, not overlap clearance) to `clamp(24px, 4vh, 48px)`, and tightened the inter-child gap. Verified by measuring the actions bar's bounding box: fits inside the viewport at both 1440×900 (bottom 856.8px) and 1366×768 (bottom 727px). |
| 5 | major | The game-day chip's link text and its trailing `<em>See the public schedule →</em>` concatenated with zero space in the actual DOM text (`...August 15See the public schedule`) — a screen-reader and copy/Ctrl-F defect invisible to sighted mouse users because the flex `gap` only affects visual layout, not text content | `page.tsx` | Added an explicit `{" "}` JSX text node between the date text and the `<em>`. Verified via `textContent`: a real space character is now present. |
| 6 | major | `nextGameDay()` computed "today"/the next Saturday from the server process's raw local clock (UTC, absent an explicit `TZ`) instead of the league's actual operating timezone (`America/Chicago`, the convention used elsewhere in this codebase) — the chip could say "Game day is today" on Friday night, or "next Saturday is 7 days away" while it's still Saturday locally, during the UTC/US-Central offset window every evening | `page.tsx` | Compute the weekday via `Intl.DateTimeFormat` with an explicit `timeZone: "America/Chicago"`, and format the resulting date label with the same explicit zone, instead of `Date.prototype.getDay()`/local formatting. (Two independent reviewers in the multi-agent pass — `routing-auth` and `landing-enhancements` — found this same defect from different files/angles; both findings map to this one fix.) |
| 7 | major | The staff sidebar's and the family header's "verified context" bars were changed from always-visible `<div>`s to collapsed-by-default `<details>`, and the `Access: Archived, read-only` vs `Current access` line moved inside the closed detail body with no other passive signal anywhere in the shell — a coach/parent viewing an archived season's stale data would see nothing indicating that without clicking to expand | `AppShell.tsx` | Added a small always-visible `<span className="badge warning">Archived</span>` next to the `<summary>` line (both the family and staff variants), conditional on `activeContext.readOnly`, reusing the app's existing `.badge.warning` convention — no new CSS needed. The rest of the context breakdown stays behind the disclosure. |
| 8 | major | Cross-tab theme sync was a no-op: the `storage` event handler existed and looked correct, but its `useSyncExternalStore` snapshot function (`readTheme()`) only ever reads the *local tab's own* `document.documentElement.dataset.theme` — nothing wrote the new value into the DOM in response to another tab's change, so the snapshot never actually changed and React never re-rendered | `ThemeToggle.tsx` | The `storage` listener now checks `event.key`, derives the new theme from `event.newValue`, and writes it into `document.documentElement.dataset.theme`/`style.colorScheme` *before* notifying the store — so the second tab's DOM (and therefore every `[data-theme="dark"]` CSS rule on the page) actually updates. |
| 9 | major | The new `ThemeToggle` fell under the project's own written 44×44px touch-target minimum (`08-accessibility-and-responsive-contract.md` §B.1) in two of its three placements (public gateway header, coach/admin context-actions bar) — only the family-shell placement happened to be rescued by an unrelated ancestor selector's specificity win | `globals.css` | `.theme-toggle`'s `min-height: 40px` → `44px`, applying uniformly to all three placements instead of depending on incidental cascade wins. |
| 10 | major | `CoachGameDayRadar`'s "People: Nothing needed" checkmark was gated on `missingRsvpCount` (scoped to only the single soonest upcoming event), while the numbered action-queue list directly above it is built from `tasks`, which spans *every* scheduled event — so a coach could see a green "People: Nothing needed" checkmark sitting right next to a live, actionable "RSVP response missing" task row for a later event, undermining trust in the radar | `role-dashboard-experiences.tsx` | Both the People and Plan "Nothing needed" checkmarks now derive from the same `tasks` array the visible queue renders (`tasks.some(t => t.category === "…")`), eliminating the possibility of divergence between the two signals. `missingRsvpCount` stays in the prop contract (still used by callers) but is no longer read for this indicator; documented with an inline comment and a scoped lint suppression rather than touching the caller. |
| 11 | major | A test rewrite for `AdminDeliveryReviewClient`'s new pending-first default filter deleted the *only* assertions covering the reconciliation-required disclaimer copy ("This is not proof of delivery…", "not proved; reconcile first") without replacing them — the compliance-relevant distinction between a confirmed send and an indeterminate provider attempt could silently break with zero CI signal | `coordination-workbenches.test.tsx` | Added a new test with a receipt that is both `providerApprovalStatus: "pending"` (so it appears in the new default view without simulating a filter click, which `renderToStaticMarkup` can't do) *and* reconciliation-required, asserting all five pieces of disclaimer copy the deleted test used to cover. |

## Reviewed and Deliberately Not Changed

- **Parent Replay "Confirm and publish" now approves and publishes in one click** (found as a `minor`, but flagged for extra scrutiny here since it touches the product's human-in-the-loop approval model). Confirmed via `git diff` that this is an intentional collapse, not an accidental regression — it directly implements LP-UX-006's own recommendation #9 ("collapse the practice-recap self-approval checkpoint... the same coach saves, approves, and publishes with no other reviewer"). Parent Replay is coach-authored content self-published to the coach's own team; unlike the admin approval queues (registration, delivery, media), there was never a second reviewer here, so the two-click version was theater, not a safety gate. Left as-is.

## Also Fixed While in the Same Files (not separately confirmed, low-risk)

- `landing-gameday-pulse` animated `box-shadow` in an infinite loop on the persistent landing page — converted to a `transform`/`opacity` ring pulse on a `::after` pseudo-element (compositor-only, matches the file's own stated animation convention). Reduced-motion override updated to match.
- `li-kicker-color` (a one-shot, non-looping color transition at the intro's finale) was left as-is — real perf cost of a single 1.2s transition is negligible; not worth the regression risk of touching it for a non-repeating animation.
- Two ESLint warnings surfaced while editing these files (`react-hooks/exhaustive-deps` on the intro's fallback-timer effect; `no-unused-vars` on `missingRsvpCount` after finding #10's fix) were resolved with scoped, explained suppressions rather than left dangling.

## Verification

- `npm test` — 119 files, 707 tests (1 new: the delivery-reconciliation disclaimer coverage).
- `npm run typecheck`, eslint (all touched files) — clean, zero warnings.
- `npm run build` — clean.
- Browser (Playwright, dev server), `output/playwright/lp-ux-011-review-fixes/`:
  - Hero overflow: actions bar bounding box confirmed inside viewport at both 1440×900 and 1366×768.
  - Game-day chip: `textContent` confirmed to contain a real space before "See the public schedule".
  - Critical timer fix: replaying immediately after Skip (inside the old 600ms danger window) confirmed to survive past that point.
  - Focus containment: confirmed Skip button receives focus on mount, hero + public header both become `inert` while playing and are restored (`inert: false`) on dismiss.
  - Mascot flash: confirmed the `::after` flash layer/animation no longer exists.
- Not independently re-run through the full multi-agent review (would need another full pass + budget); the fixes are targeted, verified individually, and the full suite is green.

## Not Addressed (unverified minors, judgment calls for later)

Six of the seven `minor`-severity findings were not adversarially verified by the workflow and were not acted on this pass — listed here so they aren't lost:
- Filter-heavy intro animation layers (grayscale/saturate + 9 concurrent drop-shadow badges) may drop frames on low-end phones — no device-lab verification exists either way.
- The coach action-queue's single styled-primary action can render `disabled`, with no other button taking over the visually-primary slot in that state.
- `Game-Day Resolution Room` readyTexts entries in `scripts/capture-season-certainty-proof.mjs` are case-mismatched against the CSS-uppercased rendered text (QA-proof-script bug, not a product bug).
- Landing canonical/OG/Twitter metadata is hardcoded to the production domain regardless of deployment environment (affects preview-deployment social unfurls, not production).
