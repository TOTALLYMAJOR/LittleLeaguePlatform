# 10 — Reference Implementation Brief

2026-07-29. Stage A is complete locally as LP-UX-001 at exact commit `049c4b1e3f85549f4316e075b84d05bd3a56694e`. This brief now governs Stage B, LP-UX-002, from the documentation-baseline commit that follows it. Neither local commit is hosted, deployed, or production acceptance.

## Selected reference slice

**Family Home → What Changed → Next Event → RSVP**, delivered as two bounded stages:

- **Stage A (Slice 1 in 09, complete locally):** one topology- and confirmed-context-driven Family shell across approved family routes.
- **Stage B (Slice 2 in 09, next as LP-UX-002):** the reference surface itself — Home refined on shared primitives (`RsvpControl`, `EventPassport`, `ChangeBand`, `ReadinessStrip`, `StatusChip`, `FamilyFilter`) plus the What-Changed diff adapter over `event_change_logs`.

**Transportation and Communication are NOT in the reference slice.** Rationale: Transportation's semantics are already the repo's strongest and its re-presentation (sheet flow) deserves its own slice after the passport component exists (it builds *on* `EventPassport`); Communication Room is already the most mature surface — touching it first risks the best asset for the least gain. Both are sequenced immediately after (09 P6–P7). The reference slice must prove the system on the surface families use most, with the least workflow risk: Home + RSVP writes through an already-hardened RPC.

## Why this slice proves the system

1. Exercises all five archetype ingredients on one route: overview shell, passport, task action, status vocabulary, readiness aggregation.
2. Touches the hardest convergence problem (shell unification + component promotion) without touching any domain logic.
3. Produces the components every later slice consumes.
4. Its data risk is zero: RSVP writes reuse `save_parent_rsvp_with_versions` untouched; What Changed adds one read adapter.

## Acceptance (Stage B)

1. At 390px, first viewport of `/parent` = header w/ family filter + change band (when changes exist) + Next Event passport with inline RSVP + readiness strip. Seven-questions test: answerable or explicitly flagged in 5 seconds.
2. What Changed shows field-level diffs ("6:00 PM → 5:30 PM") with actor and time, device-local "since you last checked" labeled as device-local; reviewing never acknowledges.
3. One RSVP grammar; 409 `schedule_changed` and `guardian_conflict` produce the distinct plain-language copy; success names the persisted fact.
4. Readiness strip renders only the two honest states; every unresolved item deep-links.
5. `parent-weekly-deep-operations` removed; no route regression (contents reachable at canonical routes).
6. 08 contract clauses A–E pass on the changed routes with proof artifacts (authenticated contrast run, viewport sweep, axe).
7. `npm run typecheck && npm test && npm run build` green; `docs/Features.md` updated; claims stay `done-local`.

## LP-UX-002 Codex handoff prompt (bounded)

The following prompt starts from the completed LP-UX-001 shell and deliberately excludes everything outside Stage B.

---

You are implementing LP-UX-002, the approved LeaguePilot Stage B reference surface, in
the clean worktree for branch `ux/lp-ux-002-saturday-ready`. Read first, in order:
`docs/product-experience/leaguepilot/10-reference-implementation-brief.md` (this file),
`04-production-design-system.md`, `06-saturday-ready-target-state.md` (§1–§4, §7),
`08-accessibility-and-responsive-contract.md`, `docs/codex-rules.md`, `AGENTS.md`.

Hard boundaries (violating any = stop and report):
- Do not modify `lib/domain/**`, any enum, any workflow state, any migration, any API
  contract. The only allowed `lib/` addition is one read adapter
  `lib/supabase/event-change-log-reads.ts` (parent-scoped read of `event_change_logs`
  for the viewer's linked teams, service pattern copied from existing adapters).
- Do not add dependencies or a CSS framework. Extend `app/globals.css` /
  `app/parent/parent-weekly.css` tokens per 04.
- Do not touch coach/admin routes, provider code, or anything under `app/api/**`
  except nothing — no API changes at all.
- Preserve compatibility routes and child-privacy display rules (first name + last
  initial). Acknowledgement semantics are out of scope.
- Preserve the LP-UX-001 shell and route-precedence contract at `049c4b1`; do not
  reimplement shell selection from pathname prefixes or broad capability flags.
- Work only on `ux/lp-ux-002-saturday-ready`; do not push or merge; leave the branch
  for review.

Stage B — reference surface:
1. Create `components/family/` with: `RsvpControl` (3-segment grammar + 409 copy,
   extracted from `parent-weekly-dashboard.tsx`), `EventPassport` (generalize the
   existing passport as the tokenized Navy Panel per 04 §5.3), `ChangeBand`,
   `ReadinessStrip`, `StatusChip` (5 tones per 04 §4), `FamilyFilter` (promote the
   Communication Room child switcher). Consume tokens only — no raw hexes.
2. Refactor `/parent`: global family filter in header; remove the
   `parent-weekly-deep-operations` disclosure; render change bands from the new
   adapter with field-level diffs and a device-local "since you last checked"
   watermark (localStorage, labeled "on this device"); readiness strip per 06 §7
   (two states only, deep links); ack chips on Coach Updates from existing receipt
   data; add `app/parent/loading.tsx` and `app/parent/error.tsx` following the
   messages route's pattern.
3. Replace the off-vocabulary RSVP paints (`.parent-rsvp-glow` green, pre-tinted
   Going buttons) wherever the extracted `RsvpControl` lands in this slice's routes.

Definition of done: acceptance list in this brief §Acceptance; proof artifacts
attached (authenticated contrast run per 08.F.1 — extend
`scripts/verify-theme-contrast-proof.mjs` with a demo-parent session over all family
routes, light mode; Playwright sweep at 320/390/768/1024/1440; axe zero
critical/serious on `/parent`); `npm run typecheck && npm test && npm run build`
green; `docs/Features.md` updated describing the slice as done-local; a summary of
every file touched. If any existing test asserts the old shell/nav behavior, update
the test only where the behavior change is specified above, and list each such
change explicitly in your report.

---

## Out of scope for the reference slice (recorded so it is not lost)

Settings replacement, photos/portal split, family progression, transportation sheets, Communication Room density pass (09 P3–P7); durable per-account change-review receipts (needs schema approval); the report-only authorization gaps from 05 (ICS export, chat read receipts, weather drafts — engineering triage, not UX); consent-writer decision (DEC-MEDIA) that unblocks real Photos.
