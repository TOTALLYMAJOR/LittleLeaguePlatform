---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# 09 — First Five Implementation Slices

Bounded, sequential slices for the implementation phase. Slice 1 is complete locally at `049c4b1`; later slices remain separate. Each slice honors: codex strict rules (no domain edits, no enum/state changes, UI never calls Supabase directly), no second CSS framework, compatibility routes preserved, AGENTS.md Definition of Done (states + tests + tracker update), and the repo's proof discipline (claims stay `done-local` until hosted proof).

## Slice 1 — One family shell (P1, done-local as LP-UX-001)

**Outcome:** confirmed Parent contexts render inside one metadata-driven Family shell; the two-systems perception, including the accidental dark-mode split, is removed locally.

- `components/ui/AppShell.tsx`: select the Family shell from route metadata plus confirmed or explicitly preserved Parent context; `access.canParent` alone is insufficient. Suppress duplicate context chrome only after the Family header renders equivalent verified context; move Sign out into Account.
- Weekly header nav derives from `route-topology.ts`; shared Account and Team routes retain the active confirmed role context, ambiguous multi-role shared entry fails neutral, and staff routes retain staff chrome.
- Mobile tab set: Home / Schedule / Messages / Family / More; "More" repointed from `/parent/settings` to a new thin `/parent/more` menu page (A5).
- Dark mode decision executed (per 04): the explicit Family surface remains light until a proven dark theme exists; staff theme behavior is unchanged.
- Topology entries added for `/parent/setup`, `/access/status`, `/invite/accept`.
- Proof: focused shell/topology tests, full local test/build gates, and authenticated Playwright at 320/390/768/1024/1440. `output/playwright/family-shell/proof.json` records 35 Family axe checks with zero critical/serious violations plus five Coach shell regressions.
- Non-goals: no page content changes; sidebar shell untouched for coach/admin.

## Slice 2 — Shared family primitives + Home refinement (P2, LP-UX-002 reference slice)

**Outcome:** the reference components exist once and Home uses them (see 10 for full brief).

- Extract from `parent-weekly-dashboard.tsx` into `components/family/`: `RsvpControl` (3-button grammar + 409 copy + version binding), `EventPassport` (generalize existing variants), `ChangeBand`, `ReadinessStrip`, `StatusChip` (single status vocabulary), `FamilyFilter` (promote the Communication Room switcher).
- Home: global family filter in header; remove `parent-weekly-deep-operations` `<details>`; readiness strip per 06 §7; ack chips on Coach Updates; add `loading.tsx` / `error.tsx`.
- What Changed v1: new read adapter over `event_change_logs` (`lib/supabase/`), field-level diff copy, device-local "since you last checked" watermark labeled as device-local. No schema change.
- Tests: component tests for each primitive (conflict copy, fail-closed states), adapter test, Playwright first-viewport proof at 390px.

## Slice 3 — Schedule + RSVP convergence (P3)

**Outcome:** one RSVP grammar product-wide; Schedule is the second archetype-complete surface.

- `ParentScheduleFeed`: inline `RsvpControl` per child-row (replacing link-outs), event rows open `EventPassport` (A2) as sheet/panel; standard action color on "RSVP now" (kill the green outlier); family filter honored.
- `/parent/rsvp` re-rendered as "Needs reply" A3 task list using the same components; removed from primary nav; badges repointed to Schedule tab.
- Tests: RSVP write path unchanged (component-level only); Playwright: answer → 409 replay → conflict copy.

## Slice 4 — Truthful utility surfaces (P4)

**Outcome:** the most misleading surfaces stop lying about what they are.

- Real `/parent/settings` (A5): notification preferences (existing `notification_preferences` writer), language, quiet hours, privacy/media visibility explanation, links to Family and Account. Duplicated dashboard removed.
- `/parent/more` menu completed: Practice Replays, Photos, Transportation, Settings, Account, Support, offline status.
- `/account`: plain-language memberships (no UUIDs), family nav retained, system-scale heading; brand block string fixed ("Little League HQ demo" → org name).
- Naming convergence: "Practice Replays" everywhere (nav, titles, feature copy); route path unchanged.
- Tests: settings write round-trip (preferences), Playwright sweep.

## Slice 5 — Photos/portal split (P5)

**Outcome:** parents get a family media surface; capability inventory stops rendering for parents.

- `/parent/photos`: new A5 parent media view — approved + family-released items only (existing scoped read path), consent state, report action (existing writer), honest empty state explaining the release pipeline.
- `/team-portal`: staff-only rendering of portal customization/capability content; parents hitting it get the family Team page slice (schedule link, coach contacts, help board).
- Flag to maintainers (decision, not part of slice): `player_media_consents` has no writer; until one exists (DEC-MEDIA territory), Photos will honestly show empty/pending states.
- Tests: audience-scoping tests (parent never receives branding/acting-user data), Playwright mobile height budget (≤6 viewports).

## Deferred beyond five (recorded, not lost)

Family progression restructure (07 §family-access), transportation sheet flow (06 §5), Communication Room density pass (P7), durable per-account change-review receipts (needs schema approval), outdoor high-contrast mode, dark theme done deliberately.

## Slice discipline

Each slice: one PR-sized branch, `docs/Features.md` updated, no cross-slice refactors, Playwright proof at 390/768/1440 attached, `npm run typecheck && npm test && npm run build` green, contrast proof green. Report-only security gaps from 05 (ICS export, chat read receipts, weather drafts) are engineering fixes outside these UX slices and should be triaged independently — they should not ride along inside UI PRs.
