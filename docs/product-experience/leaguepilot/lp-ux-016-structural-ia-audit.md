# lp-ux-016 — Structural IA, navigation, and page-hierarchy audit

Date: 2026-08-16
Branch: `claude/leaguepilot-ux-audit-xqaz0m`
Scope: information architecture, navigation, page hierarchy, action placement,
responsive behavior, perceived density. **Not** a visual rebrand — tokens,
palette, typography, iconography, and component styling are unchanged.

---

## 1. Current-state summary

LeaguePilot runs three role products behind one Next.js App Router shell:

| Surface | Routes | Shell | Mobile pattern |
| --- | --- | --- | --- |
| Public | `/`, `/schedule`, `/registration`, `/auth`, `/sponsors` | `public-app-shell` header | header only |
| Family (parent) | 11 routes under `/parent` | `parent-weekly-app-shell` top header | 5-tab bar + `/parent/more` |
| Staff (coach) | 10 routes under `/coach` | sidebar + context bars | 5-tab bar, no overflow |
| Staff (admin) | 18 routes under `/admin` | sidebar + context bars | 5-tab bar, no overflow |
| Support | `/account`, `/invite/*`, `/caregiver*`, `/access/status`, `/offline` | neutral shell | — |

Route metadata is centralized in `lib/navigation/route-topology.ts`, which is a
genuine strength: role access, nav visibility, command-palette visibility,
mobile priority, and shell family are all declared in one place. The problems
are not in the plumbing; they are in the **grouping, the chrome, and the page
templates** built on top of it.

### The three most serious problems

**1. Staff mobile was a dead end.**
Below 900px `.sidebar.app-sidebar` is `display: none` and the five-item
`.mobile-tabbar` becomes the only navigation. The command palette existed but
its only triggers were `Cmd/Ctrl+K` and a Menu button that lives *exclusively in
the family header*. So a coach on a phone could reach 5 of 10 destinations, and
an admin 5 of 18 — Schedule, Snacks & Volunteers, Weather & Fields, Drafts,
Registrations detail, Memberships, Invites, Health, Imports, Branding, Sponsors,
Reports & Archive, and Settings had no reachable entry point at all. This
affects every coach and admin on a phone, which is the sideline and field
context the product is built for. Severity: critical.

**2. Every staff page opened with two stacked chrome bars of generic prose.**
`AppShell` rendered a `.context-bar` ("You are here / Coach tools: Schedule /
Use this area for RSVPs, Parent Replay, team messages…") *and* a five-column
`.verified-context-bar`, and only then the page's own `.hero`. That is three
full-width blocks — roughly 160–220px on desktop and considerably more when the
context grid wraps on mobile — before any page content. The prose was
per-*role*, not per-page, so it repeated the sidebar section name and taught
nothing after the first visit, while the two bars also held the Back button, the
theme toggle, and two always-on status badges (one of which just said "Signed
in"). Secondary chrome outranked the primary task on every screen.
Severity: critical.

**3. Nav sections were named after lifecycle, not jobs; page titles were
sentences.**
The admin sidebar had a group called **"Launch"** holding Overview,
Registrations, Teams, Family Access, Invites, Memberships, and Health — seven
unrelated daily destinations under a label describing a one-time event. A second
group named "Operations" contained an item named "Operations". Coach had six
groups for ten items (Command, Calendar, Team, Communication, Replay, Tools),
which is nearly one heading per link and therefore no grouping at all.
Meanwhile page `h1`s were sentences ("Manage team records by organization,
season, and division.") that did not match the nav label that got you there
("Teams"), so nothing on screen confirmed where you had landed.
Severity: high.

### Additional confirmed findings

| # | Finding | Who | Severity |
| --- | --- | --- | --- |
| 4 | `/coach/settings` rendered the coach *home* surface while being `navVisible:false`, `commandVisible:false`, `searchable:false` — unreachable from anywhere in the UI, and a duplicate if reached | coach | high |
| 5 | Signed-out `/coach` and `/parent` rendered their access gate at `h2`; the pages had **no `h1`** and therefore no name | prospective staff/parents | high |
| 6 | Command palette was keyboard-only on desktop with no visible launcher | coach, admin | high |
| 7 | `/coach` and `/admin` had no `loading.tsx` or `error.tsx` (only `/parent` did) | all staff | medium |
| 8 | Decorative metric cards presented constants as data — e.g. Family Access showed a card reading "Boundary: **admin**"; Settings & Providers showed Organization/Season/Status already carried by the context bar | admin | medium |
| 9 | Missing empty states — Family Access, security proof, archived seasons, and approval queues rendered empty grids with no guidance | admin | medium |
| 10 | Security & Audit listed covered and uncovered checks with identical weight, so "what needs my attention" required reading all of them | admin | medium |
| 11 | Three controls below the 44px touch minimum: skip-intro (36px), landing game-day link (38px), offline "Return home" (25px) | all | medium |
| 12 | `/admin` Overview appeared to carry a second product inside one disclosure. **Corrected on inspection:** LP-UX-007 (`aa38e37`) added an early return for the overview surface, orphaning ~640 lines of `showOverview`-guarded UI below it. None of it had rendered since. See §5.7 | admin | high |

---

## 2. Revised information architecture

Global navigation stays role-scoped; only the **sections** change.

### Coach — 6 groups → 5, named for jobs

```
Today        Today
Team         RSVPs · Team Portal · Snacks & Volunteers
Schedule     Schedule · Weather & Fields
Communication  Messages · Drafts to Review · Parent Replay
Account      Account
```

### Admin — "Launch" grab-bag dissolved into four job-named sections

```
Today                  Overview · Health
Registration & Access  Registrations · Invites · Memberships · Family Access
Season Operations      Teams · Schedule & Venues · Imports
Communication          Communications · Message Delivery Review
Trust & Safety         Media Review · Security & Audit
League Setup           Branding · Sponsors · Settings & Providers · Reports & Archive
Account                Account
```

Distribution moves from 7/3/2/2/1/2/1 (with one section holding seven unrelated
items) to 2/4/3/2/2/4/1, and every heading now names a job rather than a
lifecycle stage or a technical grouping.

Label changes: `/admin/operations` "Operations" → **"Settings & Providers"**
(it was an item named after its own section, and the page is org settings +
provider inventory + queues + audit log). `/coach` "Home" → **"Today"**,
matching the label the mobile tab bar already used. All other product
terminology is preserved.

Route lifecycle change: `/coach/settings` becomes a **compatibility alias** to
`/coach` with `canonicalHref: "/coach"`. It renders the coach home surface, so
it was a phantom destination rather than a page; the route still resolves.

---

## 3. Workflow comparison

### A. Coach handles a game-day change from a phone

| | |
| --- | --- |
| **Current** | Open `/coach` on phone → need Weather & Fields → not in the 5 tabs → no menu button → no sidebar → **dead end**. Real-world resolution is to find a laptop or guess a URL. |
| **Friction** | Total loss of 5 of 10 destinations at the exact moment and device the task happens on. |
| **Revised** | Sticky staff top bar with **All pages** → command palette lists every accessible destination with search → Weather & Fields. Attention count rides on the button so the coach sees there is something waiting before opening it. |
| **Improvement** | Task becomes possible on mobile at all; 2 taps instead of a device switch. |

### B. Admin triages the daily queue

| | |
| --- | --- |
| **Current** | Land on `/admin` → scroll past "You are here / League office: Overview" prose bar → past the 5-column context grid → reach content. To find Memberships, scan a seven-item section called "Launch". |
| **Friction** | ~200px of repeated chrome before content; section name gives no clue which of seven links is right. |
| **Revised** | One 44px context strip (identity collapsed, help collapsed) → content immediately. Memberships sits under "Registration & Access" with three siblings that share its job. |
| **Improvement** | Content reaches the first viewport; destination is chosen by section name instead of by reading all labels. |

### C. Admin repairs a missing guardian link

| | |
| --- | --- |
| **Current** | `/admin/family-access` → `h1` is a sentence, nav said "Family Access" → 3 metric cards, one of which reads "Boundary: admin" → cards for each broken link. If there are none, an empty grid with nothing else. |
| **Friction** | Page name unconfirmed; a constant presented as a metric; no completion state. |
| **Revised** | `h1` **Family Access** (matches nav) + purpose subtitle + a single status badge that says how many links need repair. Counts move into the section's own sentence. When the queue is clear, an explicit empty state confirms it and links to Registrations as the next step. |
| **Improvement** | Page identity, workload, and next action are readable without scrolling; "done" is a state rather than an absence. |

### D. Prospective coach hits the access gate

| | |
| --- | --- |
| **Current** | `/coach` signed out → no `h1` at all → two side-by-side cards, each starting at `h2`, with the CTA buried in the left card. |
| **Friction** | Screen readers and skim-readers get no page name; the action competes with explanatory text. |
| **Revised** | `PageHeader` names the area ("Coach tools"), states the blocker as the subtitle, and carries **one** primary action. The cards below explain what stays protected. |
| **Improvement** | Correct heading hierarchy; one unambiguous next step. |

---

## 4. Prioritized implementation plan

**Critical — done in this branch**
1. Staff mobile navigation entry point (top bar + command palette).
2. Collapse duplicate shell chrome into one context strip.
3. Visible command-palette launcher on desktop.

**High impact — done in this branch**
4. Regroup and relabel coach/admin navigation sections.
5. Standardize staff page headers: name matches nav label, purpose as subtitle, status as badge/notice, one primary action.
6. Fix `/coach/settings` phantom route.
7. Give gated pages a real `h1`.

**Medium impact — done in this branch**
8. `loading.tsx` / `error.tsx` for `/coach` and `/admin`.
9. Real empty states for family access, security proof, archived seasons, approval queues.
10. Attention-first ordering on Security & Audit and Settings & Providers; reference material into disclosures.
11. Touch targets to 44px.

**High impact — done in this branch (second pass)**
12. Remove the unreachable admin workspace and finish the staff page template (§5.7).

**Deferred — needs product-owner input, see §7**
13. Table column prioritization inside `components/feature-panels.tsx`.

---

## 5. Implemented changes

### 5.1 Navigation grouping — `lib/navigation/route-topology.ts`
`RouteNavigationGroup` reduced from 16 lifecycle/technical names to 12
job-named sections. Every coach, admin, support, public, and shared route
reassigned. `/coach` relabeled "Today"; `/admin/operations` relabeled
"Settings & Providers"; `/coach/settings` converted to a compatibility alias.
Desktop: sidebar sections carry job names. Mobile: unchanged tab set.
Access rules, `allowedRoles`, `requiresActiveAdmin`, and all role resolution
logic are untouched.

### 5.2 Shell chrome — `components/ui/AppShell.tsx`, `app/globals.css`
Two stacked bars become one `.context-bar`:
* left — role · organization · season · team as a single line inside a
  `<details>`; expanding reveals the same five-field grid as before, restyled
  as `.verified-context-details` without its former wrapper;
* left, secondary — route-specific help behind a "What is this page for?"
  disclosure (the generic per-role blurb is gone; it duplicated the sidebar);
* right — attention badge **only when non-zero or errored**, theme toggle, Back.

Sign-in-required and permission-denied are promoted from a badge to an explicit
`.shell-access-notice`. Desktop: one ~44px strip replaces ~160–220px. Mobile:
the strip stacks to one column; Back is hidden below 640px where the browser and
tab bar already provide it.

### 5.3 Staff mobile entry — `AppShell.tsx`, `app/globals.css`
New `.staff-mobile-bar`: sticky, `display:none` above 900px, showing brand/org
and an **All pages** button that opens the existing command dialog, with the
attention count attached. New `.sidebar-footer` holds a `.command-launch`
button with a `⌘K` hint on desktop. Both reuse the dialog's existing focus
management (`showModal`, focus-to-input, focus restore).

### 5.4 Staff page template — `app/admin/_surfaces.tsx`
Family Access, Security & Audit, Reports & Archive, Settings & Providers, and
Teams converted from ad-hoc `.hero` + metric strip + card wall to
`PageHeader` (existing primitive) + attention-first sections + disclosures:
* `h1` is the nav label; the old sentence `h1` becomes the subtitle;
* runtime `data.message` moves from subtitle to a status `notice`;
* decorative metric cards removed; counts folded into section copy or a badge;
* Security & Audit splits into "Needs attention" and a collapsed "Covered
  checks"; Settings & Providers leads with "Waiting on you"; Teams promotes the
  management workbench above the divisions/seasons reference lists.

### 5.5 Access gate — `components/feature-panels.tsx`
`privateAccessGate` now leads with `PageHeader`, giving the signed-out `/coach`
and `/parent` pages an `h1` and a single primary action. The duplicate CTA in
the explanation card is removed.

### 5.6 States — `app/coach/{loading,error}.tsx`, `app/admin/{loading,error}.tsx`
Skeleton loading and focus-managed error boundaries mirroring the existing
`/parent` pair, each naming what was *not* changed and offering both retry and a
route back to the role home.

### 5.7 Unreachable admin workspace — `components/feature-panels.tsx`, `components/season-certainty-cards.tsx`
The deferred "split the Overview" item turned out to be a dead-code problem, not
an IA problem. LP-UX-007 made the admin home queue-only by adding
`if (showOverview) return (...)` near the top of `AdminDashboardClient`. Every
`showOverview`-guarded block *below* that return — the family-message composer,
team management, season planning, tournament preview, lineup board, roster
chips, queued-message and registration-queue cards, and the readiness card —
became unreachable and has not rendered since.

Removed: those three branches, plus the state, memos and handlers that only fed
them (communication composer state and `queueCommunication`, lineup positions
and `assignLineupPlayer`, season planning and `previewBalancedTeamBuild`, and
eight derived values used only by the dead readiness card), plus
`TeamStatusTable`, `RegistrationQueueCard`, `SecurityStatusCard` whose only call
site was that block, plus the CSS that styled the removed markup.

Restoring those cards to the Overview was considered and rejected: LP-UX-007
records "queue-only Admin home" as a deliberate goal, and a cleanup pass should
not silently reverse a documented product decision.

Changed: `/admin` Overview leads with a `PageHeader` and a badge counting queues
that need attention, then pending reviews, then league health; its own
role/organization/season strip is removed because the shell context strip now
carries it, and the health card's `h1` drops to `h2` so the page has exactly one
`h1`. Media Review and Sponsors move from the ad-hoc `admin-focus-hero` to the
same `PageHeader` template.

Net: **-698 / +55 lines**. Lint returns to the single pre-existing warning.

### Assumptions recorded
* "Today" is a better name than "Home" for the coach landing page, because the
  page is a readiness board and the mobile tab bar already used that word.
* `/coach/settings` was intended as a settings page but currently renders coach
  home; aliasing rather than nav-listing avoids advertising a duplicate. If a
  real coach settings surface is built, it should become a `route()` again.
* Route-specific help text is worth keeping for learnability but not worth
  permanent screen space, hence the disclosure.

---

## 6. QA report

Build: `npm run build` — pass. Types: `tsc --noEmit` — pass.
Tests: **129 files / 739 tests — pass** (baseline was also 129/739; two
assertions were updated to match intentional changes, none removed).

Browser proof (Chromium, production standalone build) at **390 / 768 / 1280 /
1440** across `/`, `/schedule`, `/registration`, `/auth`, `/admin`, `/coach`,
`/parent`, `/sponsors`, `/offline`, `/access/status` — 40 route/width runs:

| Check | Result |
| --- | --- |
| HTTP status | 200 on all 40 |
| Document horizontal overflow | 0px on all 40 |
| Page errors / console errors | none |
| `main#main-content` landmark | exactly 1 per page |
| Pages with no `h1` | none (was: `/coach`, `/parent`) |
| Interactive targets below 44px | none except the off-screen skip link (was: 3 at a 40px threshold, 7 at 44px) |

Other verification:
* Navigation behavior — role filtering, role-switch entries, compatibility
  redirect targets, and mobile tab sets all still asserted by
  `lib/navigation/route-topology.test.ts`.
* Permission-dependent views — `canAccessRouteEntry`, `requiresActiveAdmin`,
  and every `require*PageAccess` call site are unchanged; admin surfaces still
  return `AdminAccessDeniedSurface` before loading data.
* Keyboard — `Cmd/Ctrl+K` still opens the palette; the two new launchers are
  `<button>`; the two new context disclosures are native `<details>`/`<summary>`
  with visible `:focus-visible` outlines; dialog focus trap and restore
  untouched.
* Empty/loading/error — new empty states on four admin sections; new loading
  and error boundaries on `/coach` and `/admin`.

### Regression risks
* **CSS**: `.verified-context-bar` selectors were deleted along with the element.
  Two dark-theme rules were re-scoped to `.verified-context-details`. No other
  rule referenced the removed wrapper (`grep` count: 0).
* **Group renames** are compile-checked by the `RouteNavigationGroup` union, so
  a missed reassignment is a type error, not a silent blank section.
* **Not verified in-browser**: authenticated coach/admin/parent shells. This
  environment has no Supabase credentials, so signed-in surfaces render their
  access gates. The staff sidebar, mobile top bar, and context strip are proved
  by types, unit tests, and CSS review, but a signed-in browser pass on a QA
  tenant is still owed.

---

## 7. Remaining decisions (product-owner input required)

1. **Was any of the removed admin workspace meant to come back?** The composer,
   lineup board, and season planning tools described in §5.7 had been
   unreachable since `aa38e37`, so removing them changes nothing a user could
   do today. If any of them was meant to return to a dedicated route rather
   than be dropped, that intent is not recorded anywhere in the repo and the
   code should be recovered from history rather than rebuilt.

2. **Coach settings.** Is `/coach/settings` meant to be a real page? If yes it
   needs a surface and a nav slot; if no, the alias is the end state.

3. **Mobile tab composition for staff.** The five coach tabs (Today, RSVPs,
   Replay, Messages, Team) omit Schedule, and the five admin tabs omit
   Registrations-adjacent queues that carry attention badges. The "All pages"
   button now covers the gap, but which five deserve permanent tabs is a
   usage-frequency question, not a structural one.
