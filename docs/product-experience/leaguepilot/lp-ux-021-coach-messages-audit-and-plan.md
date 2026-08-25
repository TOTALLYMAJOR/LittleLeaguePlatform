---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-25
---
# LP-UX-021 Coach Messages Audit and Plan

Date: 2026-08-19 (US/Central)
Status: Read-only audit and plan. No source file modified. Not implemented.

Full document (audit, defect register, layout diagram, slices):
https://claude.ai/code/artifact/fff53089-f010-40d1-9b76-0c4711113a50

## Scope

`/coach/messages` -> `CoachMessagesSurface` (`app/coach/_surfaces.tsx:99`) ->
`TeamChatClient` (`components/feature-panels.tsx:9330-9879`). The same component
serves `/team-chat` for parents and admins.

Composition and behaviour findings were read from the working tree on
`ux/lp-ux-001-family-shell` and cross-checked against `lib/domain/chat.ts` and
`lib/supabase/route-scopes.ts`. A live signed-in render was not captured: the dev
server on `:3020` intermittently returns 500 for one client chunk while other
sessions recompile, so the page does not hydrate and the sign-in button stays
disabled. Rendered evidence used instead is the existing
`output/playwright/ui100-{desktop,mobile}-team-chat.png`. Its palette and shell
chrome predate LP-UX-019 and are not restated as findings.

## Lane claim

This plan owns composition and information design only:

- `components/feature-panels.tsx` (`TeamChatClient` only)
- `app/coach/_surfaces.tsx` (`CoachMessagesSurface` only)
- one scoped chat block in `app/globals.css` (`.chat-*`, `.clubhouse-chat-*`)

It does not own and will not edit: the shell palette layers in `app/globals.css`,
`app/layout.tsx` critical CSS, `app/parent/parent-weekly.css`,
`components/ui/AppShell.tsx`, `lib/navigation/route-topology.ts`, route guards,
adapters, providers, or `lib/domain/`.

## Resolved coordination record for LP-UX-019 and LP-UX-020

Both slices state that `app/globals.css` owns the final staff shell visual layer,
and both mirror their palette into `app/layout.tsx` critical CSS to prevent a
flash of the previous palette. LP-UX-019 lands warm ivory canvas, muted gold, and
a charcoal rail. LP-UX-020 lands mist blue canvas, navy hierarchy, and burnt
orange primary actions. These are not additive. Whichever writes last defines the
product, and the other slice's proof screenshots then evidence a skin that is no
longer present.

The later LP-UX-020 direction resolves this conflict: LP-UX-020 is the current
palette and final cascade authority, while LP-UX-019 is retained as a historical
experiment. LP-UX-021 slice 3 must inherit LP-UX-020 tokens.

Downstream dependency: LP-UX-021 slice 3 (replace hard-coded chat panel hex with
shell tokens) may proceed only against LP-UX-020 and its fresh browser proof.

## Highest-severity findings

1. Six controls look interactive and do nothing: the broadcast `Toggle` renders
   `role="switch"` with `aria-checked` and no `onChange` (`:9578`); the four topic
   chips are plain spans (`:9543-9548`); the typing indicator is a constant
   (`:9781`). Presence is an avatar stack built from the scoped user list
   (`:9541`). This is a `CLAUDE.md` hard rule 8 problem, not a styling problem.
2. The header status badge is hard-coded to `Read-only` on every render
   (`:9488`), while the same screen's broadcast row reads "Open thread" and the
   access line says the coach may post.
3. Opening the route marks every visible message read on mount (`:9408-9415`),
   whether or not it was scrolled to, discarding the unread signal the coach nav
   badge depends on.
4. A coach with more than one assigned team is locked to `teams[0]`
   (`_surfaces.tsx:108`), and the team switcher still renders disabled
   (`:9512`).
5. The conversation panel hard-codes `#101828`, `#172033`, `#b8c4d6`, `#fff`
   (`globals.css:8439-8455`), so it does not inherit the current LP-UX-020 theme.
6. `.broadcast-mode` has no dark-panel treatment and renders near-black on the
   dark conversation ground.
7. The dark panel overflows its column at 390px; several strings clip because
   `overflow: hidden` hides the spill rather than reflowing it.

Sixteen findings total, ranked, with evidence, in the linked document.

## Plan summary

Five principles: the conversation is the page; nothing renders that is not
derived from real data; state is asserted once; one composer with two modes;
inherit the shell tokens.

Five slices, ordered so honesty and correctness land before recomposition:

1. Delete the fiction and fix the hard-coded permission badge. 1-2 files, direct.
2. Honest unread and real multi-team scope. 2-3 files, Design Doc.
3. Token the chat panel, fix contrast and mobile overflow. 1 file, direct, gated
   on the 019/020 decision.
4. Recompose: authority bar, attention strip, next-event strip, single sticky
   composer, density contract, reference disclosure. 3-5 files, UI Spec ->
   Design Doc -> Work Plan.
5. Absorb `/coach/drafts` as a third segment via the existing `compatibility()`
   route pattern. 4-6 files, full gate. Separable; hold it if in-flight nav work
   makes it awkward.

Extracting `TeamChatClient` out of the 9,879-line `feature-panels.tsx` is correct
eventually but is deliberately not bundled into slice 4.

## Boundaries

No route, guard, adapter, provider, enum, state transition, migration, or
`lib/domain/` change is proposed. No claim of hosted or production acceptance.
LP-QA-GUARD-001 still applies: no row-mutating proof outside an isolated QA
target.

## Addendum: LP-UX-019 proof set integrity (2026-08-20)

`output/playwright/lp-ux-019-workspace-visual/proof.json`, generated 2026-08-20
00:02Z, records a serious `color-contrast` violation on `/parent` in Dark at both
390 and 1440, with headings at 1.02:1 and 1.15:1. It did not block because
`proof.json` sets `enforceAxe: false` for `/parent`. Admin and Coach are clean in
both themes and both viewports.

The reported colors do not match the working tree. The failing ground is
`#111821` / `#19232f`, the previous family Dark tokens; the failing ink is
`#1c2438`, the previous family Light token. The tree now holds `#071326` and
`#071b44`. A single coherent stylesheet cannot produce a Dark ground with Light
ink from a superseded palette, so this run captured a partially recompiled
stylesheet. The dev server was returning 500 for client chunks during the same
window.

Consequences:

1. LP-UX-019 cites this folder as its validation. The run should be repeated
   against a settled server before the Family result is treated as a real defect
   or the Admin/Coach results are treated as a pass.
2. Independently, `app/parent/parent-weekly.css` still carries light-only
   literals with no Dark counterpart: `#6b6559` x9, `#1f3a63` x11, `#a64a18` x2,
   `#1c2438` x3. Most are covered by the `:is()` Dark blocks at 3335-3390.
   `.parent-weekly-schedule-copy > span` (1165) is not; that block lists
   `.parent-weekly-schedule-copy p` and misses the span.
3. The proof route list is `/admin`, `/coach`, `/parent` only.
   `/coach/messages` has never been captured under the new staff shell, which is
   the surface holding the hard-coded palette island in finding 5 above. Adding
   it to the harness route list should precede LP-UX-021 slice 3.

## Addendum: competitor read and plan revisions

References supplied: a consumer team app (TeamSnap class, iOS) and Baseline, a
facility operations portal. Four transferable patterns, each with a concrete
revision to the plan above.

1. **The counter atom.** The consumer app repeats one micro-pattern everywhere
   (going / not going / no reply, as three coloured counters) in its Up Next card
   and on every event row. LeaguePilot already owns the vocabulary --
   `RSVP_RESPONSES` is `going / not_going / maybe / cancelled` -- but presents it
   as "RSVP 2/3" on Coach Home and not at all on Messages.
   *Revision:* adopt one counter atom, reused in the attention strip, the
   next-event strip, and any event row, and align Coach Home to it. No enum
   change; `cancelled` is a lifecycle state and stays out of the atom.

2. **Up Next carries more than slice 4 specified.** The plan proposed a one-line
   strip (time, field, map). The reference packs a date block, event type, time
   range, venue, opponent, a weather chip and the three counters into roughly
   140px, and it is the most-used object on the screen.
   *Revision:* the next-event strip takes the fuller form. All fields already
   exist: `upcomingGame.startsAt / locationName / locationAddress / opponent`,
   `eventType` for the type stripe, `weatherAlerts` for the chip, and the counter
   atom linking to `/coach/attendance`.

3. **Team identity belongs in the title bar.** The reference makes the team a
   disclosure on the page title, always visible, one tap to switch.
   *Revision:* slice 2's multi-team fix becomes a title-bar disclosure in the
   authority bar with per-team unread, rendered only when
   `coachTeamIds.length > 1`. The toolbar card is removed rather than repaired.

4. **Baseline confirms the segmented view and the colour discipline.** Its
   Calendar / Repeat / Hours / Grid switcher is the same move as
   Thread / Announcements / Drafts, which supports slice 5 as a conventional
   shape. Its grid also pairs a ground and an ink on every block, which is
   precisely the discipline the chat panel lacks in findings 5 and 6.

5. **Honest roster affordance.** The reference shows an avatar cluster followed
   by "View the roster" -- a link to a real roster, not a presence claim.
   *Revision:* slice 1 replaces the fake presence stack with this rather than
   deleting the component. Same visual, and it links to `/coach/roster`, which
   the coach nav already carries.

**Not to copy.** The consumer app's chip row (Offers / Create team / Create
Event) and photos-first hero are a growth surface. LeaguePilot's differentiator
is approved sends, child privacy defaults, audit on moderation, and no child
accounts. Take the density and the atoms, not the storefront.

**No action needed:** `/coach/messages` is already a coach mobile tab
(`route-topology.ts:484`), so chat-as-peer-destination is already matched.
