# 01 — Current Experience Audit

Read-only audit, 2026-07-29. Evidence: full repository inspection (routes, shells, domain, migrations, CSS, docs, git history) + authenticated runtime browsing as the seeded demo parent at 390×844 and 1440×900, light and dark preference. No screenshots were attached to the engagement brief in this session; the brief's descriptions were verified against locally captured runtime screenshots.

Amendment, 2026-08-03: the automatic inversion and Family light-only deferral described below are historical findings. LP-UX-005 replaced them with an app-wide Light-default, explicit saved Light/Dark selection and authenticated dark-route proof.

## 1. The two-visual-systems hypothesis: resolved

**Finding: the "competing dark operational system" is not a designed system.** In source, every parent-facing surface is light/warm. The dark appearance in the supplied screenshots has three distinct causes:

1. **Auto-inverted dark mode.** `app/globals.css:6274` flips global tokens under `@media (prefers-color-scheme: dark)` — but the block predates ~7,600 lines of later feature CSS (Mission Control, Communication Room, transportation, replays, gateway all have zero dark rules), and `app/parent/parent-weekly.css` (the `/parent` chrome) has no dark handling at all. A dark-preference device therefore renders `/parent` warm-light and every sibling route accidental near-black, with verified breakage (e.g. the "Current access" cell at ~1.05:1 contrast in dark).
2. **Hard-coded dark panels inside light pages.** Fourteen surfaces (`.event-passport` `#0f2740`, `.transportation-next` `#102f49`, `.parent-season-story-header` `#122942`, coach ticker, radar, sponsor headers…) are literal navy hexes with no tokens and no dark-mode counterparts.
3. **Recency.** The warm cream/navy/orange token palette landed two days before this audit (commit `ffb1c9b`, 2026-07-27, replacing a cool indigo/mist system). Older screenshots predate the convergence that has already partially happened.

**Conclusion: yes — the light, warm Family Home system should be the parent-facing design foundation.** Not because it "wins" against a rival, but because (a) it already is the global token direction, (b) it matches the outdoor/high-legibility operating context, (c) the blueprint's palette conflict (cobalt-on-mist) was superseded in practice by a recorded, browser-proven decision (`docs/Features.md` App-wide Weekly Dashboard Visual System), and (d) the "dark system" is unowned fallout, not an alternative. Consequence: dark mode must become deliberate and contrast-proven, or be explicitly scoped out of family routes until it is (04 §8).

## 2. Capability truth (classification per brief)

| Capability | Classification | Basis |
| --- | --- | --- |
| RSVP (per-child, per-event) | LIVE AND AUTHORITATIVE | `save_parent_rsvp_with_versions` RPC: idempotency key, lock + schedule version binding, change logs, guardian+team authorization with executed denial tests |
| Schedule write + versioning | LIVE AND AUTHORITATIVE | Versioned upserts, `event_change_logs` (typed diff + actor + reason), series edits, conflict detection |
| "What changed" for parents | LIVE BUT INCOMPLETE | Banner derived from version number only; change logs write-only (no parent reader); no per-guardian review watermark |
| Official communications + acknowledgement | LIVE AND AUTHORITATIVE | Append-only versions, content hash, in-SQL authority (critical=admin), per-guardian row-locked idempotent ack, superseded/attempt-required fail-closed |
| Team chat (post/moderate/report) | LIVE BUT INCOMPLETE | Post/moderation authorized; read-receipts unauthorized (any user, any message); retention purge structurally a no-op (`retained_until` never written) |
| Transportation lifecycle | LIVE AND AUTHORITATIVE | 5 RPCs; mutual acceptance enforced by DB CHECK; double version re-check on accept; restrictions fail closed; derived `needs_review` on version drift |
| Additional guardians | LIVE AND AUTHORITATIVE | Propose/cancel parent-side, approve/revoke admin-side; approval creates the guardian link; no self-grant path |
| Temporary caregivers | LIVE AND AUTHORITATIVE | Schema-enforced scopes, immutable 7-item prohibition array, ≤14 days, single-use token, exact-email acceptance, revocation with cache-clear signal |
| Practice replays (text/activity) | LIVE AND AUTHORITATIVE | Draft→approve→publish coach flow; family reads published-only; private engagement receipts |
| Replay family media | PROTOTYPE | Thorough consent-gated RPCs exist with no application caller (scripts only) |
| Photos/media pipeline | LIVE BUT INCOMPLETE | Quarantine/scan/release pipeline real but env-gated off; **guardian media-consent capture REQUIRED BUT MISSING** (no writer for `player_media_consents`) — family media unreachable end to end |
| Notifications | LIVE BUT INCOMPLETE (by design) | Draft → human review → gated executor; as configured nothing sends; four evidence lanes kept independent |
| Snack slots / volunteers | LIVE AND AUTHORITATIVE | Compare-and-set cap enforcement, waitlist, transfers, idempotency keys |
| Family handoffs / balance / season transitions | LIVE AND AUTHORITATIVE (handoffs, transitions) / LIVE BUT INCOMPLETE (balance read-only) | See 05 |
| Weather alerts | LIVE BUT INCOMPLETE | Real provider chain, draft-only — but **no authorization check** on draft creation |
| Offline/PWA | LIVE BUT INCOMPLETE | 3-action outbox with owner-generation binding; conservative SW; org gate default-off; reconnect proof open |
| Schedule ICS export | REQUIRED BUT MISSING (authorization) | Cross-tenant read with no membership check |
| Readiness engine (blueprint §12 rules) | DOCUMENTED INTENT | Meters exist; no rule engine, no departure-threshold evaluation |
| Hosted/production behavior of all of the above | UNVERIFIED | All `EXT-*` gates open; local proof only (repo's own ledger) |

## 3. Surface audit (runtime-verified)

Format: purpose · primary question · maturity · principal UX problems. Full per-surface decisions in 07.

**`/parent` Family Home** — family week overview · "what needs us?" · HIGH maturity, reference-grade. Problems: no child switcher (header locked to `children[0]`); buried `<details>` duplicating four pages (card nesting reaches 4 levels, dark passport inside warm card inside disclosure inside page); 3,151px mobile; header drops nav links ≤640px; no loading/error boundaries.

**`/parent/schedule`** — agenda · "when/where for everyone?" · MEDIUM-HIGH. Problems: full orientation chrome (3 meta-panels before content); RSVP links out instead of inline; green `#22c55e` "RSVP now" glow button off-vocabulary (42px, `font-weight: 950`); 820px width is right.

**`/parent/rsvp`** — standalone RSVP · MEDIUM. Problems: second RSVP grammar (4 buttons incl. Cancel); policy sentence as display-scale hero ("Parents answer attendance for linked children only."); no 409 conflict copy; "Going" pre-tinted action color on unanswered cards.

**`/parent/messages` Communication Room** — three-lane comms · HIGH maturity (only route with loading.tsx/error.tsx, design-QA record, best child switcher). Problems: meta-explanation density (ack semantics, human-authority panels compete with content); three freshness dots; long single column on mobile (3,720px).

**`/parent/photos`** — labeled Photos, renders full team-portal capability inventory · LOW as a parent surface. Problems: 14,224px mobile; coach customization ("Acting user", mascot, colors) exposed to parents; capability/status text as family content; identical to `/team-portal`.

**`/parent/practice-recaps` Practice Replays** — coach-approved memories · MEDIUM-HIGH concept, MEDIUM presentation. Problems: triple naming (Parent Replay / Practice Recaps / Replays); editorial serif at `clamp(2.15rem,5vw,4.8rem)` (a third font family, Georgia, unregistered); chrome stack before content; relationship to media consent invisible (and factually unreachable — see §2).

**`/parent/transportation`** — mutual-acceptance rides · HIGH semantics, MEDIUM presentation. Problems: dark hard-coded passport panel; desktop-grid workflow not mobile-first; two-party confirm checkboxes small; invalidation discoverable only by visiting.

**`/parent/family-access`** — guardians/caregivers/transitions · HIGH capability, LOW composition. Problems: three stacked page components, two `<h1>`s, three unsynchronized child selectors, 6,087px mobile, empty review queue occupies first viewport.

**`/parent/settings`** — mislabeled · renders the full dashboard (season story ticker, Next Up, RSVP) duplicated from `/parent`'s disclosure; 18 accordions, 11 sections. Not settings.

**`/account`** — identity/memberships · MEDIUM. Problems: raw membership UUID shown; policy hero; support-role sidebar strips family nav; reached from two different Family-Home header icons.

**`/team-chat`, `/team-portal`** — compat shared routes · parents lose family nav (public-nav coercion defect).

**Public `/`** — gateway · HIGH. 7.4rem display headline; recorded CTA-priority conflict (Sign In vs Request Team Access) unresolved between truth docs.

## 4. The sixteen specific examinations from the brief

1. **Light/dark conflict** — resolved; see §1.
2. **Repeated orientation chrome** — confirmed: "YOU ARE HERE" context-bar + role/org/season/team table + Sign out on every family subpage except `/parent` and `/parent/messages` (`AppShell.tsx:447-482`).
3. **Unused desktop regions** — confirmed: 1240px default `.page` with single-column stacks on subpages; Communication Room right rail spent on meta-explanations.
4. **Excessively long pages** — confirmed: photos 14,224px / portal 14,099px / family-access 6,087px / chat 5,606px (mobile).
5. **Nested card proliferation** — confirmed: up to 4 bordered/shadowed levels on `/parent`; both governance docs forbid cards-in-cards.
6. **Small text/dense labels** — confirmed: 0.62–0.68rem (9.9–10.9px) in nav badges, tab labels, context bars; 143 distinct font sizes.
7. **Low-contrast headings** — partially: heading ink is strong, but `secondary danger` buttons 2.35:1, gateway sub-ink 3.85:1, dark-mode `.verified-context-bar` ≈1.05:1.
8. **Uppercase microcopy excess** — confirmed: 53 uppercase sites, 9 competing kicker implementations (weights 700–900, tracking .055–.12em).
9. **Technical language to parents** — confirmed: UUIDs on Account, "Little League HQ demo" brand block, policy-statement heroes, "schedule version 2" in family copy.
10. **Inconsistent buttons** — confirmed: 12+ styles; same RSVP intent in navy, Tailwind-green, token-green, and orange; dead `.ghost`; broken `secondary danger`.
11. **Inconsistent max widths** — confirmed: 1152 / 1180 / 1240 / 820px + full-bleed.
12. **Different shells/navigation** — confirmed: 6 shells, 3 simultaneous nav models for parents.
13. **Fixed side navigation on family routes** — confirmed on 8 of 10 family routes (280px sticky sidebar with autoplaying video backdrop).
14. **Mobile feasibility** — bottom tab bar shipped and sound; page-length and chrome defeat it.
15. **State coverage** — loading/error boundaries only on messages; denied states triple-implemented; offline handled in 4 layers (good honesty, inconsistent presentation); stale/conflict handled only on Home + transportation.
16. **Actions → authoritative persistence** — the mutating actions on family surfaces are real (see §2); the risk is the inverse: truthful-but-technical presentation (version numbers, receipt lanes) not yet translated into family language.

## 5. Systemic diagnosis

The product does not have a design-quality problem at the token level — the current tokens are good and brief-aligned. It has a **composition and consolidation debt**: 84% of the CSS is per-feature vocabulary (17 class families, 987 classes); a capable primitives library (~80 components) has one importer while each surface re-invents badges (8 systems), kickers (9), and buttons (12+); one 9,716-line component backs nine routes; and successive visual eras (prototype cobalt → indigo/mist → season-certainty → game-day calm → warm weekly) were layered, not migrated — the dark-mode block, the `--page` undefined variable, the `#1570ef` focus ring, and the Magic-Patterns hex drift in `parent-weekly.css` are all strata of that history. The convergence work is therefore mostly *subtraction and promotion*: extend the newest shell everywhere, promote the best existing patterns (weekly header, Communication Room switcher, passport, RSVP grammar) to shared components, and delete the strata.
