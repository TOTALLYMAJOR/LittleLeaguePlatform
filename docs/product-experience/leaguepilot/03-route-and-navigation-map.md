---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# 03 — Route and Navigation Map

Read-only audit plus LP-UX-001 implementation update, 2026-07-29. Evidence: `lib/navigation/route-topology.ts`, `components/ui/AppShell.tsx`, `app/parent/_surfaces.tsx`, authenticated runtime browsing at 320, 390, 768, 1024, and 1440 pixels.

## LP-UX-001 implementation update

The shell-convergence portion of this map is implemented locally and corrected as LP-UX-001 on 2026-07-30. Route topology now declares `surfaceFamily`, `shellFamily`, `primaryNavigationFamily`, optional `familyMobileTab`, and topology-backed More-menu metadata. The route-authority resolver combines that metadata with server-derived confirmed active context; a broad `canParent` capability by itself cannot select the family shell. On ambiguous shared routes for a confirmed multi-role adult, the server must resolve a supported active role before shared data loads; otherwise the route renders neutral choice/approval copy with no broader data scope.

- Family primary navigation is one topology-derived set on mobile and desktop: **Home** (`/parent`), **Schedule** (`/parent/schedule`), **Messages** (`/parent/messages`), **Family** (`/parent/family-access`), and **More** (`/parent/more`).
- Secondary parent routes stay out of primary navigation and map to the appropriate active tab. `/parent/rsvp` maps to Schedule; Practice Replays, Photos, Transportation, Settings, Account, Support, and Offline map to More.
- Parent-owned routes plus `/account`, `/team-chat`, and `/team-portal` retain the family shell only when the server-resolved active context is Parent. Staff-owned and staff-scoped shared routes retain the staff shell. `/access/status` and `/invite/accept` are explicit neutral transition surfaces. Caregiver and public authority boundaries remain separate.
- The family shell removes the staff sidebar/video and duplicate context bars, and integrates role, organization, season, team, linked-player count, access status, and the global Light/Dark selector into the compact header. Since LP-UX-005, it defaults to Light and follows the same saved explicit theme as every other shell; device preference does not select the app theme.
- `/parent/more` is the lightweight destination menu. Sign out moved to Account. No route was deleted, aliased, or moved, and no domain, provider, permission, schema, or staff-route behavior changed.

Authenticated local proof is recorded by `scripts/capture-family-shell-proof.mjs` and `output/playwright/family-shell/proof.json`. It covers 80 route-viewport results: parent routes, parent/coach/admin shared-route contexts for `/team-chat` and `/team-portal`, neutral transition routes, signed-out `/parent/more`, and a Coach shell regression at 320, 390, 768, 1024, and 1440 pixels. The harness records JavaScript-disabled initial render and hydrated render markers for shell, resolved role, and data scope. Axe critical/serious checks apply to every family-context result; Coach remains a shell-regression check because its pre-existing dark-surface contrast is outside LP-UX-001.

The inventory and defect list below record the pre-implementation audit that produced this change.

## 1. Pre-implementation parent-facing route inventory

### Canonical family routes (topology group "Family", role `parent`)

| Route | Nav label | Renders | Shell today | Verdict |
| --- | --- | --- | --- | --- |
| `/parent` | Home | `ParentWeeklyDashboard` + collapsed `<details>` with 4 more page-components | Parent Weekly shell (unique: top header, no sidebar) | Reference surface. The buried "Detailed family operations" duplicates other routes. |
| `/parent/schedule` | Schedule | `ScheduleAlertsClient → ParentScheduleFeed` | Sidebar + full chrome | Keep destination; re-shell. |
| `/parent/rsvp` | RSVP | `ParentRsvpClient` (4-button model) | Sidebar + full chrome | Demote from primary nav — see §4. |
| `/parent/messages` | Messages | `CommunicationRoom` (3 lanes) | Sidebar, chrome suppressed ("immersive") | Keep destination; re-shell. |
| `/parent/photos` | Photos | `TeamPortalClient` — same component as `/team-portal`, 26 sections | Sidebar + full chrome | Mislabeled capability inventory; split (see 07). |
| `/parent/practice-recaps` | Practice Recaps | `FamilyParentReplay` | Sidebar + full chrome | Keep as memory surface under a single name. |
| `/parent/family-access` | Family Access | 3 stacked page components (season transitions + additional guardian + caregiver), 2 `<h1>`s | Sidebar + full chrome | Keep capability; restructure as one progression. |
| `/parent/transportation` | Transportation | `ParentTransportationClient` | Sidebar + full chrome | Keep; strongest workflow semantics of the subpages. |
| `/parent/settings` | Settings | `ParentDashboardClient` — byte-identical to the panel buried in `/parent` | Sidebar + full chrome | Not settings. Replace with real settings; retire duplicate rendering. |
| `/parent/setup` | (hidden; prefix-matches "Home") | `FamilyFirstSignInClient` | Sidebar + full chrome; hard `redirect()` gates | Keep as onboarding step; fix topology entry. |

### Shared/compat and support routes parents actually touch

| Route | Topology role | Problem today |
| --- | --- | --- |
| `/team-chat` | shared → canonical `/parent/messages` | Signed-in parent sees the **public** nav (Calendar / Sign up / Account), losing all Family navigation. |
| `/team-portal` | shared → canonical `/parent/family-access` (mislabeled canonical; content is the portal) | Same public-nav defect; identical content to `/parent/photos`. |
| `/account` | support | The `/parent` header's two account affordances land here; sidebar loses every Family route. Exposes raw membership UUID. |
| `/schedule` | Family group, "Calendar" | Public read-only view; signed-in parents get public nav. |
| `/access/status`, `/invite/accept` | not in topology | Generic "Start here" chrome; no family context. |
| `/caregiver`, `/caregiver/accept` | support, hidden | Correctly separate — caregivers must not see the guardian shell. |
| `/offline` | support, hidden | Duplicates `OfflineSyncStatus` (shell + page); SW serves a third, unrelated `offline.html`. |

### Navigation-affecting defects (pre-implementation evidence)

1. `getPrimaryNavEntries` coerces `shared`/`prototype` roles to `public` → parents on `/team-chat`, `/team-portal`, `/access/status`, `/` (signed-in) lose family navigation entirely (`route-topology.ts:261-273`, `AppShell.tsx:365-438`).
2. The Parent Weekly header (only `/parent`) hard-codes a *different* nav (Schedule, Messages, Account, Menu) than both the sidebar (9 items) and the mobile tab bar (5 items: Today, Schedule, RSVP, Messages, More) — three simultaneous navigation models for the same role.
3. At ≤640px `/parent`'s header drops Schedule and Account links (`parent-weekly.css:1122-1125`).
4. Attention badges exist only for `/parent/rsvp` and `/parent/messages`; other unresolved states (transportation, access reviews) surface no badge.
5. Mobile "More" tab maps to `/parent/settings` — which is the duplicated dashboard, not a menu.
6. `/parent/setup` and `/invite/accept` and `/access/status` are absent from topology, so their chrome titles are wrong.

## 2. Decision inputs

- The blueprint (governing contract, §5) already decided a 5-item bottom nav: **Home, Schedule, Messages, Replay, More**.
- The engagement brief proposes: **Home, Schedule, Messages, Family/Players, More**.
- Shipped mobile tabs today: **Today(Home), Schedule, RSVP, Messages, More(→settings)**.

All three agree on Home / Schedule / Messages / More. The contested fifth slot is RSVP vs Replay vs Family.

## 3. Recommended canonical parent IA

### Primary navigation (identical set on mobile bottom bar and desktop)

| Slot | Label | Route | Rationale |
| --- | --- | --- | --- |
| 1 | **Home** | `/parent` | Family week, What Changed, Next Event, readiness. |
| 2 | **Schedule** | `/parent/schedule` | All children agenda; RSVP inline per event (see §4). |
| 3 | **Messages** | `/parent/messages` | Critical / Updates / Conversation lanes; ack receipts. |
| 4 | **Family** | `/parent/family` (today `/parent/family-access`) | Children, guardians, caregiver access, season/team transitions — "who can see and do what for my family". Matches the brief's Family/Players slot. |
| 5 | **More** | `/parent/more` (new lightweight menu page) | Practice Replays, Photos, Transportation entry, Settings, Account, Support, offline status. |

Why **Family** over the blueprint's **Replay** in slot 4: Replay is a weekly memory surface with one item per practice cadence (demo shows 1 published memory); Family Access is where trust, safety, and unresolved review states live, and the brief's guardian-authority questions ("Who can see my family's information?") are primary product promises. Replay stays one tap away in More and as a Home card (its actual entry point today). This is a deliberate, evidence-based amendment to blueprint §5 and must be recorded as such, not a silent override.

### Where everything else lives

| Capability | Destination | Access path |
| --- | --- | --- |
| RSVP | Action inside Schedule rows + Next Event card on Home | Badge on Schedule tab when responses are outstanding; `/parent/rsvp` retained as compatibility route rendering the same task view filtered to "needs reply" |
| Transportation | Workflow inside the Event Passport (per-event) + status list under More → Transportation | Home "ride not set" chip → event passport → request/offer/accept |
| Practice Replays | Home card + More → Practice Replays | Single name everywhere: **Practice Replays** (drop the Parent Replay / Practice Recaps split) |
| Photos | More → Photos (family-safe media only, split from portal capability inventory) | |
| Team portal (branding, capability state) | Not a parent destination. Coach/admin surface; parents get the family-relevant slices (schedule, media, help board) in their own archetypes | |
| Settings | More → Settings (real preferences: notifications, language, quiet hours, media consent visibility) | |
| Account | More → Account (identity, memberships in plain language, security, sign out) | |
| Family Access status / invite recovery | Family tab (signed-in); public gate pages keep public shell | |
| Caregiver portal | Separate minimal shell, unchanged | |

### RSVP: separate destination or action?

**Both, with a clear distinction — but the action is primary.** Evidence: RSVP is already inline on Home (3-button model with 409 conflict handling and schedule-version binding — the most production-grade interaction in the app) and linked-out from Schedule rows. The standalone `/parent/rsvp` page uses a *different* 4-button model with no conflict copy, creating two interaction grammars for the same authoritative write. Converge on the Home grammar; keep a "Needs reply" task view (reachable from Home's need-reply chip and Schedule's certainty band) rather than a top-level nav slot. RSVP as nav slot optimizes for the app's convenience ("where do RSVPs live?") over the family's question ("what does Saturday need from us?").

## 4. Shell convergence target (implemented by LP-UX-001)

One signed-in family shell, two responsive presentations:

- **Mobile (<900px):** sticky compact header (brand + child/team filter + alerts), content, fixed 5-tab bottom bar. No sidebar ever.
- **Desktop (≥900px):** same header grammar widened; primary nav as slim left rail or top tabs derived from the *same* 5 destinations (not the current 9-item sidebar); max content width 1152px (the Parent Weekly value) for overview surfaces, 820px (the Schedule value) for task/reading surfaces.
- The Parent Weekly header becomes the shell for **all** family routes; the video-backdrop sidebar, "YOU ARE HERE" context bar, verified-context table, and mid-page Sign out are retired from family routes (Sign out moves to Account; role/season context moves into the header's family filter).
- Fix `getPrimaryNavEntries` so shared routes render the family nav for parents.
- Caregiver and public shells remain distinct (they are authority boundaries, not styling variants).

## 5. Migration map (route level)

| Step | Change | Type |
| --- | --- | --- |
| 1 | **Implemented locally:** extend the Parent Weekly shell by explicit topology metadata plus a confirmed active role context; do not infer it from a pathname prefix or broad capability flag | Shell only, no route moves |
| 2 | **Implemented locally:** retire context-bar/verified-context-bar on family routes; move Sign out to Account | Shell |
| 3 | **Partially implemented locally:** introduce `/parent/more` and repoint More; real Settings content remains deferred | New thin page |
| 4 | Split `/parent/photos`: family media view stays; portal capability inventory remains at `/team-portal` for coach/admin | Content split |
| 5 | Rename nav "Family Access" → "Family"; alias `/parent/family` → existing page; restructure into progression (see 07) | Rename + restructure |
| 6 | `/parent/rsvp` becomes "Needs reply" task view using the Home RSVP grammar; drop from primary nav, keep route | Consolidation |
| 7 | **Implemented locally:** topology entries for `/parent/setup`, `/access/status`, `/invite/accept`; resolve shared-role navigation from confirmed or preserved context | Bug-fix tier |

Compatibility guarantee: no route is deleted; `/team-chat`, `/team-portal`, `/parent/rsvp`, `/parent/practice-recaps` keep working (recorded repo rule).
