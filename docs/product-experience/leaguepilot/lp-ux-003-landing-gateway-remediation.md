# LP-UX-003 Landing Gateway Remediation

Date: 2026-08-03

Status: `done-local-unverified-in-browser`

Branch: `ux/lp-ux-001-family-shell`

Trigger: user screenshot of `/` while signed in with a device in dark mode — hero headline invisible (navy on navy), Schedule/Sponsors card text invisible (near-white on white), sidebar brand washed out, `Offline syncNo saved actions…` footer text run together, sign-in onboarding copy shown to a signed-in user.

## Root-Cause Findings (verified against source)

1. **Gateway palette scoped to the signed-out shell.** The five `--gateway-*` custom properties were defined only on `.public-app-shell-gateway` (`app/globals.css` ~13526), a class `AppShell` applies only in its signed-out branch (`components/ui/AppShell.tsx` ~279). Signed-in `/` rendered inside `.shell.app-shell > .main` with every `var(--gateway-*)` invalid at computed-value time: the `.landing-gateway` background collapsed to transparent (exposing dark-mode `--bg` `#111821`), while the H1 kept hard-coded `#102f4b` and the card row kept hard-coded `rgb(255 255 255 / 92%)` — the observed invisible text in both directions. This is the "accidental inversion" state 04 §7 and 08 A.4 prohibit.
2. **No redirect for signed-in users.** `app/page.tsx` rendered the marketing hero unconditionally; no `middleware.ts` exists. Route topology marks `/` `navVisible:false, commandVisible:false` — a pure gateway, not a destination.
3. **Account CTA ignored the persisted active role.** `accountHref` checked `canParent` before `canCoach`, so a dual-role parent+coach always got `/parent` regardless of the validated `leaguepilot-active-role` cookie already exposed as `access.activeRole`.
4. **Staff-shell brand looped coaches back to the gateway.** The staff/neutral sidebar brand was hard-coded `href="/"` while the family shell deliberately links `/parent`.
5. **`OfflineSyncStatus` unstyled outside the family shell.** Rendered on every signed-in route (`AppShell.tsx` ~500) but its only CSS was scoped to `.main.parent-weekly-main` (`app/parent/parent-weekly.css` ~416), so `/`, `/coach`, `/admin`, `/account`, `/offline` got bare inline elements with no spacing, plus internal jargon copy ("sync receipts").
6. **Non-bugs:** the floating circular button over the hero photo is the Next.js dev-mode DevTools indicator, not product UI. Signed-out dark mode was never broken — the gateway is a deliberate forced-light island there.

## Changes Applied

| # | Change | Files |
|---|--------|-------|
| 1 | Signed-in visitors to `/` now `redirect()` to their role home. Precedence: `access.activeRole` (when the matching capability is confirmed) → `canParent` → `canCoach` → `canAdmin` → `/account`. Account card simplified to signed-out copy (`Sign in` → `/auth`). | `app/page.tsx` |
| 2 | Staff/neutral sidebar brand links to the resolved role home (`brandHomeHref` from `activeProductRole`: coach → `/coach`, admin → `/admin`, parent → `/parent`, else `/`). | `components/ui/AppShell.tsx` |
| 3 | `--gateway-*` palette now also declared on `.landing-gateway` itself, making the forced-light island self-contained in any shell. Hard-coded hexes intentionally kept — they are the island's design; swapping `#102f4b` for `--gateway-ink` (`#17324d`) would alter it. Zero visual diff signed-out. | `app/globals.css` |
| 4 | `.offline-sync-status` base styles moved to `globals.css` unscoped (family shell keeps only width/centering override). Copy rewritten: empty state `Nothing waiting to sync.`; footnote `Counts only. Message contents and player details are never shown here.` Truthful state labels (Queued/Retrying/Conflict/Sign-in required/Review required/Synced) unchanged. | `app/globals.css`, `app/parent/parent-weekly.css`, `components/offline-sync-status.tsx`, `components/offline-sync-status.test.tsx` |

Consequence of change 1: the contradictory signed-in chrome on `/` (the "Start here / Sign in, sign up…" context bar, "Back" at root, "Sign up" nav item, triple privacy assurances) is now unreachable — those surfaces were not separately edited.

## Verification

- `npm test` — 114 files, 672 tests, all passing (includes updated `offline-sync-status.test.tsx`; `routes-smoke.test.ts` gateway source assertions unaffected).
- `npm run typecheck` — clean.
- `npm run build` — production build succeeds, all routes compile.
- Not yet done: an in-browser signed-in dark-mode screenshot pass (the original repro). Suggested check: signed-in visit to `/` redirects; brand click from `/coach` stays in coach home; `/coach` and `/account` footer renders as a bordered card with separated lines.

## Explicitly Deferred (not approved yet — see session task list)

1. **Staff sidebar dark-mode contrast** (washed-out brand over cream video scrim; light sidebar beside dark main). Mechanism: `app/layout.tsx` critical CSS hard-codes `.sidebar.app-sidebar` background `#fdf8f1`; `.sidebar-video-backdrop span` hard-codes cream gradients (`globals.css` ~7939) while `.brand` text uses dark-mode `var(--text)`. Docs record staff-shell dark theming as known debt (04 §7, 08 A.4) — needs a deliberate decision, not a drive-by fix.
2. **`.landing-gateway-action.is-primary small` 3.85:1 contrast** — doc-pinned known defect, untouched.
3. **`10-reference-implementation-brief.md` working-tree revert** — uncommitted modification appears to erase the Stage A completion record and LP-UX-002 handoff prompt. Confirm intent with the user before committing anything; keep it out of the landing-fix commit.
4. Sidebar brand subtitle still reads `Little League HQ demo` (demo scaffolding copy).
5. Signed-out landing still has no coach-facing path or copy ("Coach a team?" entry) — persona-fit gap, larger design decision.

## Handoff Notes

- Nothing is committed; all changes are in the working tree on `ux/lp-ux-001-family-shell` alongside pre-existing unrelated modifications (`10-reference-implementation-brief.md` — see deferred item 3, `next-env.d.ts`, untracked screenshots).
- Full audit evidence (four parallel auditors, file:line traces) lives in the session workflow journal; the findings above are the deduplicated, source-verified subset.
