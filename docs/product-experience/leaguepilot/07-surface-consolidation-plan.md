# 07 — Surface Consolidation Plan

Read-only audit deliverable, 2026-07-29. Decisions here are recommendations to the maintainers; no runtime code was changed.

## Page archetypes (the whole parent product fits in five)

| # | Archetype | Question it answers | Layout grammar | Surfaces that adopt it |
| --- | --- | --- | --- | --- |
| A1 | **Family Overview** | "What's happening / what needs us?" | Header + filter, change band, event passport, readiness strip, week agenda, cards rail | `/parent` (only instance) |
| A2 | **Event Workspace (passport)** | "Everything about this one event" | Passport sections in fixed order; action sheets (RSVP, ride) | Event detail (from Home/Schedule), caregiver event view |
| A3 | **Task & Confirmation** | "Answer/confirm/grant this, then see proof" | Focused single-column ≤820px; progressive steps; persisted receipt at end | RSVP needs-reply list, Transportation flow, Family Access progression, caregiver accept, invite accept, season-transition review, setup |
| A4 | **Communication & Activity** | "What are people telling me?" | Lane tabs, priority queue, search, contextual detail | `/parent/messages` (Critical/Updates/Conversation) |
| A5 | **History / Memory / Reference** | "Look back, browse, configure" | Calm list/grid, generous media, low chrome | Schedule (agenda), Practice Replays, Photos, Settings, Account |

Rules: no route invents a sixth layout; every surface declares its archetype; A3 surfaces never exceed one primary action per viewport; A5 surfaces never carry unresolved-action urgency styling.

## Surface-by-surface decisions

### `/parent` — Family Home — **PRESERVE + REFINE** (reference surface)

- Preserve: warm system, What Changed band, Next Up passport with inline RSVP, readiness meters, coach updates, replay card, privacy microcopy, offline honesty.
- Refine: add global family filter; remove "Detailed family operations" `<details>` (contents disperse: Event Passport → A2, Flight Plan handoffs → passport responsibility row, notification receipts → Messages, dashboard panels → their canonical routes); readiness strip per 06 §7; ack chips on coach updates.
- Generalize: passport, RSVP control, change band, readiness strip, status chips become shared components (04).
- Missing states to add: `loading.tsx`, `error.tsx`, populated multi-child header.

### `/parent/messages` — Communication Room — **PRESERVE + REFINE**

- Preserve: three lanes, child/team switcher (the best in the app — promote it to the global shell), search, receipt-lane separation, ack semantics.
- Refine: collapse meta-explanations (one-line ack hint + disclosure); merge three freshness dots into one source line; mobile lane tabs sticky; message detail as contextual panel (desktop) / push view (mobile).
- Reply permissions: keep conversation-lane composer gating as-is (session-derived team-chat route).
- Ack never implies more than receipt (contract, already enforced in RPC).

### `/parent/rsvp` — **COMBINE into Schedule/Home as action; route becomes task view**

- One RSVP grammar (Home's 3-button + 409 handling). Route stays for compatibility, renders A3 "Needs reply" list. Drop from primary nav; badge moves to Schedule tab.

### `/parent/schedule` — **REFINE**

- Keep: agenda grouping, week ribbon, certainty band, 820px reading width, per-child rows.
- Change: inline RSVP (same shared control) instead of link-out; event rows open the A2 passport; "RSVP now" button adopts standard action color (currently green outlier); add family filter.

### `/parent/transportation` — **REFINE to mobile-first flow (06 §5)**

- Preserve semantics wholesale (mutual acceptance, version binding, fail-closed restrictions, privacy copy).
- Re-present as passport-anchored 3-step sheets; route remains as status/history list; state names per 06 §5; surface `needs_review` in What Changed.

### `/parent/family-access` — **RESTRUCTURE as one progression (rename nav to "Family")**

Today: three stacked page components, two `<h1>`s, three unsynchronized child selectors, 6,087px mobile. Target: one A3 surface with a shared child selector and a clear progression:

1. Select child + team → 2. Identify trusted adult → 3. Choose access type — **Guardian (permanent, league-verified)** vs **Caregiver (temporary, ≤14 days, event-boxed)** — visually distinct tiers, never interchangeable → 4. Review exact scope (the fixed caregiver exclusions listed verbatim) → 5. Confirm → 6. Track (Requested / League reviewing / Active / Expires in N days / Revoked).

- Season/team transition reviews render as a review queue at top only when pending (today an empty state occupies the first viewport).
- One-time links keep "shown once" treatment.

### `/parent/photos` + `/team-portal` — **SEPARATE (the one true split)**

Current single `TeamPortalClient` (26 sections, 14,224px mobile) mixes four audiences. Split:

- **Photos (parent, A5):** approved, family-released media only; consent state visible; report action; empty state explains the release pipeline honestly ("Photos appear after safety review and family consent"). Note: real media is currently unreachable end to end (no consent writer — see 05 gaps); the surface must render its honest empty/pending states rather than capability text.
- **Team page (parent, A5):** schedule link, coach contacts, help board, gear — the family-relevant slices.
- **Portal customization (coach/admin):** branding, mascot, acting-user, capability inventory → stays on `/team-portal` for staff roles only; parents never see "Acting user" selectors or capability status text.

### `/parent/practice-recaps` — **PRESERVE concept + REFINE presentation; single name "Practice Replays"**

- Preserve: coach-approved family-memory concept, privacy promise, engagement semantics (private, never ranks a child), team filter.
- Refine: editorial type scale reduced to system scale (memory surfaces get warmth via imagery and spacing, not 5rem headlines); relationship to media permissions stated on-card ("Media appears only with league release + your consent"); "Mark as tried" stays an engagement receipt, never a completion claim.
- Naming: nav label, route title, and feature name converge on Practice Replays; `/parent/practice-recaps` path stays.

### `/parent/settings` — **REPLACE content (currently duplicated dashboard)**

New real Settings (A5), sectioned exactly per brief: Family experience preferences (language, family filter default) · Notifications (channels, quiet hours — writer exists: `notification_preferences`) · Privacy & media (consent visibility, what caregivers/others can see) · Membership & team access (plain-language, links to Family) · Identity & security (→ Account) · Support. Season story content returns to Home/Schedule where it belongs.

### `/account` — **REFINE**

- Plain-language memberships ("Parent on Riverside Rockets · active") — no UUIDs; hero at system scale; sidebar keeps family nav for parents (fix shared-role coercion); brand block loses "Little League HQ demo".

### `/access/status`, `/invite/*`, `/caregiver/*`, `/parent/setup` — **PRESERVE, re-shell (A3)**

- Register missing topology entries so chrome titles are correct; caregiver surfaces keep their deliberately minimal separate shell.

### Shells — **CONSOLIDATE 6 → 3**

| Shell | Serves | Fate of current shells |
| --- | --- | --- |
| Family shell (Parent Weekly grammar, extended) | All `/parent/*`, signed-in parent on shared routes | Absorbs sidebar shell + immersive variant for family routes; video sidebar, YOU-ARE-HERE bar, verified-context table, mid-page Sign out retired from family routes |
| Public shell | `/`, `/schedule`, `/registration`, `/sponsors`, signed-out | Gateway variant folds in as the `/` composition |
| Staff shell | `/coach/*`, `/admin/*`, `/team-portal` staff view | Unchanged this engagement |

SW `offline.html` gets re-skinned to family tokens (5-line CSS change) so the offline fallback isn't a fourth look.

## Content-density contract (applies to every refactor)

- Max two card-nesting levels; page sections ≤7 on overview, ≤4 on task surfaces.
- Mobile page-height budgets: overview ≤4 viewports (~3,400px), task ≤3, reference ≤6. (Today: photos 14,224px, family-access 6,087px, team-chat 5,606px.)
- One `<h1>` per route at `clamp(1.6rem, 3vw, 2.1rem)`; editorial display scale reserved for Home greeting and Replay memory titles.
- Policy/behavioral copy renders as one-line hints + disclosures, never hero headlines.
- Uppercase microcopy limited to 11px+ kickers with 0.08em tracking; never for data values.

## Migration priority

| Priority | Move | Why first |
| --- | --- | --- |
| P1 | Shell convergence + nav fix (03 §5 steps 1–2, 7) | Every other fix inherits it; kills the two-systems perception including dark-mode split |
| P2 | Home refinements + shared RSVP/passport/change-band components | Reference slice (see 09/10) |
| P3 | Schedule inline RSVP + needs-reply task view | Completes the RSVP grammar convergence |
| P4 | Settings replacement + More menu + Account cleanup | Removes the most misleading surfaces cheaply |
| P5 | Photos/portal split | Biggest density win; needs the consent-writer decision to make Photos real |
| P6 | Family progression restructure; transportation sheets | Highest-value workflow re-presentations |
| P7 | Communication Room density pass | Already the most mature surface; polish, not surgery |
