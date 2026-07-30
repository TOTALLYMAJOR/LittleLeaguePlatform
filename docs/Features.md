# Feature Implementation Tracker

Feature slices live in the root Next.js application with typed fallback states and Supabase-backed paths for auth-scoped reads, writes, audits, provider-safe drafts, and admin operations. The [2026-07-27 closeout ledger](backlog-closeout-2026-07-27.md) governs `done-local`, `external`, `decision-required`, and `historical` state. Real SendGrid, explicitly selected Pingram SMS, rollback-only Twilio, Web Push, private-media, Stripe Connect, and OpenAI adapters remain behind server and organization gates; code presence is not hosted, operational, or production proof.

## Integrated Local Work - 2026-07-29

- LP-UX-001 converges confirmed Parent contexts on one topology-derived Family shell and exact Home / Schedule / Messages / Family / More navigation. The corrected local slice also aligns shared-route shell authority with server data scope and keeps ambiguous multi-role shared routes neutral until a supported active role is server-resolved. This is local shell, navigation, and scoped-render proof only; no route move, domain workflow, provider, schema, deployment, or hosted acceptance changed.
- LP-UX-002 is `done-local-accepted` after fresh independent correction review. Saturday Ready now renders guardian-scoped per-child summaries for Everyone; an exact child event or honest empty state; authoritative current-viewer critical-message acknowledgement; neutral/open/accepted/schedule-invalidated transportation semantics from existing projections; exact canonical deep links; one primary landmark; root-owned changed-status tokens; and forced-colors behavior. RSVP writes still use the existing `/api/rsvps` route and `save_parent_rsvp_with_versions` RPC path, and event-change review remains device-local presentation only. No schema, migration, API contract, provider send, coach/admin route, transportation workflow, acknowledgement write semantic, deployment, or production acceptance changed.
- LP-007 and LP-008 now have committed private team-builder inputs plus preview/edit/approve/publish persistence, API, domain, migration, RLS, and component tests. Hosted admin browser publication remains `EXT-HOSTED-SESSION`.
- Actor-bound offline replay/reconnect behavior is covered by `lib/offline/game-day-outbox.test.ts`, `components/offline-sync-status.test.tsx`, and shell/service-worker tests. Offline execution remains disabled by default until hosted multi-actor proof.
- The actor/action RLS, Realtime, and family-lifecycle proof harnesses are committed and locally tested. Their guarded execution against an isolated target remains external; no hosted run is inferred.
- Durable public-intake limiting, organization-scoped admin observability, recurring schedule and managed venue operations, Team Chat report/review/team-scoped retention, and snack/volunteer reminder, unclaim, and atomic-cap paths are integrated locally. Migrations `20260729144500` through `20260729144505` are committed but not applied or read back on a hosted project.
- The stronger existing private-media quarantine, hash, scan, consent, and family-release path remains authoritative; no parallel upload path or hosted storage proof is claimed.
- Mutating session and Communication Room record proof is isolated-QA-only after LP-QA-GUARD-001. Historical production-alias results below are retained as dated evidence, not current commands.
- Current deferred defaults are draft/internal provider records, link-only media, sponsor proof-only billing, PWA-first, and Preview OpenAI out of scope.

## Migration Promotion Status - 2026-07-26

- **Production migration is installed and read back.** After separate explicit approvals, the active LeaguePilot Supabase production project (`dkwghvvlbdnnwzbnscvu`) applied the reviewed 18-migration gap and the follow-on RLS initplan optimization without seed data. Production is aligned at 40 migrations through `20260726182645_optimize_rls_auth_initplans.sql`, and its guarded follow-up plan is empty. This proves ordered schema installation and migration-history readback only.
- **The candidate installs cleanly.** A PostgreSQL 17 reset applied all 40 migrations through `20260726182645_optimize_rls_auth_initplans.sql`. The follow-on migration wraps 72 row-invariant `auth.uid()` calls across the 49 advisor-flagged policies while preserving policy names, commands, roles, grants, RLS enablement, and normalized predicates. The rehearsal also fixed reserved `authorization` aliases in `0028`/`0029`, corrected transportation indexing so multiple offers can await the requester while only one assignment can become final, and repaired an ambiguous additional-guardian revocation function.
- **Preview and focused lifecycle proof remain retained.** The no-production-data preview branch `leaguepilot-migration-gap-qa-20260726` (`gmrvnnkxksqkcxcmydhr`) and production both applied and read back `20260726182645`, and both guarded follow-up plans are empty. Performance Advisor warnings on both targets are now 175 after removing all 49 `auth_rls_initplan` findings. Preview parent, coach, and anonymous RLS checks plus the provider-free transportation and caregiver lifecycle proof pass after the migration. Production received a narrower read-only parent, coach, admin, and anonymous session check; no populated production lifecycle mutation was run.
- **Production schema boundaries were read back after migration 40.** All 92 public tables have RLS. The 58 legacy tables retain RLS-governed Data API DML, the 20 server-adapter tables expose no browser-role DML and retain service-role DML, `btree_gist` is in `extensions`, and the field-reservation exclusion constraint remains valid. Normalized policy, grant, and RLS-state digests plus sampled counts for organizations, profiles, players, guardians, RSVPs, field reservations, registration approval actions, notifications, and delivery attempts are unchanged; provider sends remain disabled for both organizations, and error-level lint/advisors are clean.
- **Operational acceptance remains separate.** Production is control-plane healthy and public/Auth/Storage/Data API smoke checks plus narrowly scoped read-only signed-in RLS checks pass, but signed-in browser journeys, broader cross-tenant and feature lifecycles, provider/webhook behavior, and Realtime change delivery remain open. The remaining 175 `multiple_permissive_policies` warnings require an actor/action review rather than mechanical consolidation. PITR is disabled, the latest observed platform backup predates promotion, and no restore drill has been proven. See `docs/supabase-migration-rehearsal-2026-07-26.md`.

| Feature | Phase | Status | Implemented routes | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| Season Launch Wizard and traced roster commit | Phase 1 - Launch Readiness | Local closed-loop implementation; migration installed/read back on preview and production; feature-specific hosted proof pending | `/admin/imports`; `/api/admin/roster-imports/audit`; `/api/admin/season-launch/commit`; `/rollback` | `lib/domain/domain.test.ts`; `supabase/rls-policy.test.ts`; migration `0024`; transactional PostgreSQL migration/workflow smoke; `npm test`; `npm run typecheck`; `npm run build` | Parses and normalizes CSV rows, blocks errors, requires explicit warning confirmation, stages source evidence, and commits players/guardian links/invites only after active organization-admin approval. Every created row carries import provenance. Safe rollback removes only provenance-created rows and stops when imported players have downstream RSVP, attendance, safety, health, learning, media-consent, caregiver-handoff, or family-balance activity. Commit and rollback are atomic RPCs and execute zero provider sends. Team, coach, schedule, and communications remain separate launch gates. |
| Smart Invite Recovery | Phase 1 - Launch Readiness | Done | `/invite/recover`, `/invite/expired`, `/admin/invites` | `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Checks not found, expired, accepted, active season, and hourly/daily limits; hashes only, no raw token display. |
| Admin Health Dashboard | Phase 1 - Launch Readiness | Done | `/admin/health` | `lib/domain/domain.test.ts`; `lib/supabase/tenant-readiness.test.ts`; `components/feature-panels.test.tsx`; `npm test`; `npm run typecheck`; `npm run qa:tenant-readiness-proof`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:tenant-readiness-proof`; `npm run build` | Computes missing coaches, missing parent links, pending/failed invites, duplicate warnings, empty schedules, media, archive state, and Supabase-scoped tenant setup readiness for the signed-in organization admin. Each deterministic readiness rule now explains its source of truth, responsible authority, aggregate-only privacy boundary, and non-mutating behavior. Browser proof captures `/admin/health` and `/admin/teams` under `output/playwright/tenant-readiness/`; production tenant-readiness proof passed against `https://www.leaguepilot.us` on 2026-07-18. |
| Fictional Demo Tenant Seed | Platform Foundation | Done | `scripts/bootstrap-demo-tenant.mjs`; `scripts/capture-demo-tenant-proof.mjs`; `npm run supabase:demo-tenant`; `npm run qa:demo-tenant-proof` | `app/routes-smoke.test.ts`; `node --check scripts/bootstrap-demo-tenant.mjs`; `node --check scripts/capture-demo-tenant-proof.mjs`; `DEMO_TENANT_SEED_CONFIRM=load-fictional-data npm run supabase:demo-tenant`; `npm run qa:demo-tenant-proof`; Supabase readback; `git diff --check` | Guarded Supabase service-role script creates the fictional `LeaguePilot Demo League` with demo admin, coach, and parent auth users plus populated season, teams, players, guardian links, schedule, RSVPs, chat, media links, registration queue, brand evidence, sponsor proof, provider-safe notification records, support, audit, and mobile usage rows. The browser proof signs in DEMO admin/coach/parent users, verifies demo tenant content across role-scoped routes, captures mobile and desktop screenshots under `output/playwright/demo-tenant/`, and confirms provider sends executed at zero. The seed requires `DEMO_TENANT_SEED_CONFIRM=load-fictional-data`, writes demo credentials to `.env.local`, and never executes external email, SMS, push, Stripe, AI, or storage-provider calls. |
| Route Topology and Role IA | Platform Foundation | Done | `/parent/*`, `/coach/*`, `/admin/*`; compatibility `/schedule`, `/team-chat`, `/team-portal`, `/coach/rsvps`, `/coach/parent-replay`, `/admin/themes`, `/admin/security`, `/admin/archive`, `/admin/guardian-links` | `lib/navigation/route-topology.test.ts`; `app/routes-smoke.test.ts`; `app/route-guards.test.ts`; `lib/supabase/route-scopes.test.ts`; `npm run typecheck` | Centralized route topology drives shell nav, command search, mobile nav, canonical aliases, compatibility hiding, and prototype noindex. Server ShellAccess derives role-home switches from the Supabase server session while wrapper routes scope data before render. |
| LP-UX-001 Family Shell Convergence | Product UX Foundation | Done-local-accepted; hosted route proof pending | `/parent/*`; `/parent/more`; Parent/coach/admin-context `/team-chat`, `/team-portal`; Parent-context `/account`; neutral `/access/status`, `/invite/accept`; signed-out `/parent/more` | `lib/navigation/route-topology.test.ts`; `components/ui/AppShell.test.tsx`; `app/route-guards.test.ts`; `app/api/auth/active-role/route.test.ts`; `scripts/capture-family-shell-proof.mjs`; `output/playwright/family-shell/proof.json`; `npm run qa:family-shell-proof`; `npm run typecheck`; `npm test`; `npm run build`; `git diff --check`; independent correction review found no unresolved P0/P1 | Route topology and the route-authority resolver explicitly classify surface, shell, primary navigation, active role, role source, and shared-route data-scope role. Shared `/team-chat` and `/team-portal` load parent, coach, or admin data only through the same server-resolved role that drives shell/navigation; ambiguous multi-role shared routes stop before private shared data loads. A server-validated active-role cookie can preserve role context only when current memberships still support it; `sessionStorage` is non-authoritative and cannot change shell family after hydration. `/parent/more` uses the parent guard and topology-backed destinations. Browser proof records 80 route-viewport results at 320/390/768/1024/1440, initial-render/hydrated shell markers match, Family dark-device first paint remains light, signed-out More stays public, Account Sign out is keyboard reachable, request/browser errors are zero, and Family axe critical/serious findings are zero. No route moves, domain workflow changes, provider operation, schema, deployment, hosted proof, or production acceptance was added. |
| LP-UX-002 Saturday Ready Reference Surface | Product UX Foundation | Done-local-accepted; hosted proof pending | `/parent`; `/parent/schedule`; `/parent/rsvp`; `/parent/transportation`; `/parent/messages`; `/parent/family-access`; `lib/supabase/event-change-log-reads.ts` | `components/family/readiness.test.tsx`; `components/family/canonical-reachability.test.tsx`; `components/family/family-acceptance-contract.test.tsx`; `components/parent-weekly-dashboard.test.tsx`; `lib/supabase/event-change-log-reads.test.ts`; `app/parent/parent-main-landmark.test.ts`; `tools/family-contrast-routes.test.mjs`; focused tests; `npm run typecheck`; `npm run lint`; `npm test`; `npm run build`; `git diff --check`; `npm run qa:saturday-ready-proof`; `npm run qa:contrast-proof`; `npm run qa:family-shell-proof`; `docs/product-experience/leaguepilot/lp-ux-002-correction-verification.md`; `docs/product-experience/leaguepilot/lp-ux-002-independent-correction-review.md` | Parent Home preserves the approved first-viewport order. A selected child receives an exact guardian-scoped Event Passport and readiness set; Everyone receives compact per-child summaries without representative-event collapse, including honest no-event states and exact child/team/event links. Readiness distinguishes critical-message absent, current-viewer unacknowledged, and current-viewer acknowledged evidence, without implying delivery, agreement, or every-guardian acknowledgement. Existing transportation projections distinguish neutral absence/not-required, open or confirmation-pending action, accepted responsibility, and schedule invalidation without changing mutations. The event-change adapter preserves parent, organization, season, team, and child scope; empty authorized scopes return empty results. Shared changed-status tokens live only at the root, new components have explicit forced-colors contracts, and normal/loading/error states retain one primary landmark. Independent local acceptance records 11 state scenarios and 56 topology-derived authenticated contrast route/mode results with no serious/critical axe findings, unexpected console errors, failed requests, or horizontal overflow. This is local acceptance evidence only, not hosted proof or production acceptance. |
| LP-UX-003 Schedule and RSVP Convergence | Product UX Foundation | Done-local; responsive and hosted proof pending | `/parent/schedule`; `/parent/rsvp`; `/api/rsvps` | `components/feature-panels.test.tsx`; `components/family/components.test.tsx`; `components/family/family-acceptance-contract.test.tsx`; `components/ui/AppShell.test.tsx`; focused tests; `npm run typecheck`; `npm run build`; `git diff --check` | Schedule now owns guardian-scoped inline RSVP actions, honors the shared family filter, and opens the existing Event Passport without inventing arrival time. The compatibility RSVP route is a Needs Reply task list. Both use the same three-answer, version-bound, authenticated control and the existing API/RPC conflict path. The shared control refuses offline writes and does not claim a queued response. No schema, route contract, provider send, access grant, or attendance authority changed. |
| LP-UX-004 Truthful Family Utilities | Product UX Foundation | Done-local; responsive and hosted proof pending | `/parent/settings`; `/parent/more`; `/account`; `/parent/practice-recaps`; `/coach/practice-recaps` | `components/family-first-sign-in.test.tsx`; `components/feature-panels.test.tsx`; `components/ui/AppShell.test.tsx`; `lib/navigation/route-topology.test.ts`; `app/route-guards.test.ts`; focused tests; `npm run typecheck`; `npm run build`; `git diff --check` | Family Settings now renders the existing language, critical/routine channel, quiet-hours, translation, and shared-device preference writer instead of a duplicated dashboard. Media copy explicitly separates preferences from consent and family release. More exposes Practice Replays, Photos, Transportation, Settings, Account, Support, and offline status through guarded topology. Account uses plain-language access labels without rendering raw membership identifiers, preserves the active-role shell, names the current organization in staff branding when available, and keeps safe sign-out. Practice Replays is the converged product label while route paths remain compatible. No provider delivery, media consent, membership grant, schema, or API expansion was added. |
| Season Certainty Home UI | Product UX Foundation | Done | `/parent`, `/coach`, `/admin` | `lib/season-certainty.test.ts`; `components/feature-panels.test.tsx`; `app/routes-smoke.test.ts`; `lib/navigation/route-topology.test.ts`; `npm run typecheck` | Shared `SeasonCertaintyView` read models and role-specific first screens answer each role's first question: Parent Season Story combines guardian-scoped schedule and coach updates with next-event action/privacy; Coach Game-Day Radar organizes assigned-team readiness into people, place, and plan; Admin keeps league health, queues, team status, and security visible. Parent and coach homes include a pausable moving coach-announcement banner built only from their already-scoped team rows. The read models never call Supabase from client UI. |
| Game-Day Calm UI System | Product UX Foundation | Done | `/`, `/auth`, `/parent`, `/parent/schedule`, `/coach`, `/admin`, `/coach/practice-recaps` | `app/routes-smoke.test.ts`; `components/feature-panels.test.tsx`; `lib/navigation/route-topology.test.ts`; `npm run qa:season-certainty-proof`; `npm run typecheck`; `npm test`; `npm run build` | LeaguePilot now uses a light-first navy, mist, white, and restrained-cobalt system with 8px controls, 12px operational surfaces, flatter elevation, tabular operational numerals, and certainty bands. The signed-out route preserves the animated field/ball background. The authenticated desktop navigation uses a subdued, muted, local game-day video loop across the full sidebar with a reduced-motion fallback. Parent Home leads with an image-free Season Story and keeps detailed arrival, field, pack, and player context behind the game-day disclosure; current team-scoped media is not rendered as child imagery because it lacks a verified player binding. Parent Schedule retains grouped event cards, location, truthful RSVP entry points, and role-specific mobile tabs. Coach Home uses a people/place/plan radar with review-only actions; Admin Overview remains a dense launch-blocker queue; Parent Replay makes draft review and the approval checkpoint explicit. The 2026-07-20 migrated local browser matrix confirmed zero document-level overflow at 375, 390, 768, and 1440 pixels across parent, coach, admin, and schedule routes. No persistence, access, or provider-send authority was added by this visual redesign. |
| App-wide Weekly Dashboard Visual System | Product UX Foundation | Local implementation and signed-in responsive browser proof complete; hosted proof pending | Shared shell and primitives across public, parent, coach, admin, registration, team portal, and communication routes | `app/globals.css`; `app/layout.tsx`; `app/routes-smoke.test.ts`; `npm run qa:season-certainty-proof`; `npm run typecheck`; `npm test`; `npm run build` | The warm cream, navy, white, and restrained-orange language established on Parent Home now drives the global semantic tokens, Geist/Fredoka type hierarchy, shared shell, navigation, context bars, cards, controls, notices, public header, and dark-mode equivalents. The signed-in local matrix covered parent, schedule, transportation, caregiver, coach, Parent Replay, admin, and admin schedule surfaces at 375, 390, 768, 1024, and 1440 pixels with no browser errors or document overflow. It also corrected 1024px overflow in the temporary-caregiver builder and admin schedule control room. Existing route structure, server-derived role context, permissions, state labels, Supabase adapters, child-privacy defaults, provider gates, and delivery behavior are unchanged. The visual migration uses the existing global CSS system rather than adding a second component framework. |
| Compact Public Entry Gateway | Product UX Foundation | Local implementation and responsive browser proof complete; hosted proof pending | `/`, `/schedule`, `/sponsors`, `/auth` | `app/routes-smoke.test.ts`; `lib/navigation/route-topology.test.ts`; `scripts/capture-public-family-phase0-proof.mjs`; `npm run qa:public-family-proof`; `npm run typecheck`; `npm test`; `npm run build` | The signed-out homepage is now a bright, high-contrast, first-viewport gateway focused only on public schedule, sponsorship information, and account sign-in. Its positive “Your season, organized.” message replaces negative chase-oriented copy, and its project-owned generated hero shows a community game-day arrival scene without a prominent or identifiable child. The local browser matrix passed home, schedule, registration, and sign-in at 320, 390, 768, and 1440 pixels with no horizontal overflow or undersized main controls. The new public sponsor page is informational: it exposes no child profiles, parent contacts, private media, billing state, checkout, contract, placement-delivery, or impact proof. Existing admin sponsor management remains protected at `/admin/sponsors`. |
| Parent Weekly Dashboard Visual Adaptation | Product UX Foundation | Local implementation and authenticated responsive browser proof complete; hosted route proof pending | `/parent`; `/api/rsvps`; `/api/parent/replays/[replayId]/engagement` | `components/parent-weekly-dashboard.test.tsx`; `scripts/capture-season-certainty-proof.mjs`; `output/playwright/parent-weekly-dashboard/proof.json`; `npm run typecheck`; focused tests; `npm run build`; signed-in 375/390/768/1024/1440 browser matrix | Parent Home now opens with a warm cream, navy, white, and orange weekly-dashboard composition adapted from the supplied Magic Patterns reference. Its player/week summary remains guardian-scoped; hero and schedule RSVP controls retain authenticated idempotency, lock-version, schedule-version, and guardian-conflict rules; home activities come only from published Parent Replays; coach updates come only from scoped announcements; and the progress-style rail is explicitly family logistics rather than athlete scoring. The generated field visual contains no identifiable child. Existing Event Passport, Family Flight Plan, notification, balance, support, and season workflows remain intact behind the native Detailed family operations disclosure. The compact route header keeps schedule, messages, account, command navigation, verified role context, offline notices, and the mobile tab bar. The final local production build rendered against a signed-in QA parent with exact document/client widths and no browser errors at every recorded viewport; screenshots containing private family context were kept out of the repository. No provider send, access grant, child login, athlete ranking, mock streak, reaction count, or new persistence authority was added. |
| Public Family Trust Corrections | Product UX Foundation | Local implementation and responsive browser proof complete; hosted proof pending | `/`, `/schedule`, `/registration`, `/auth`; `scripts/capture-public-family-phase0-proof.mjs`; `scripts/public-family-proof-contract.mjs` | `lib/domain/public-calendar.test.ts`; `app/routes-smoke.test.ts`; `app/route-guards.test.ts`; `components/feature-panels.test.tsx`; `node --test scripts/public-family-proof-contract.test.mjs`; `npm run qa:public-family-proof`; `npm run typecheck`; `npm test`; `npm run build` | The compact homepage prioritizes public schedule, sponsor information, and Sign In; Request Team Access remains available from supporting public routes instead of competing in the first viewport. The public schedule is an agenda/Event Passport hybrid with explicit unresolved arrival guidance and Apple, Google, Outlook, and download actions instead of raw ICS. Registration and sign-in forms contain no demonstration identities, and public access copy explains review timing, privacy, and next steps. The registration route renders passive proof metadata from server environment values: a short irreversible SHA-256 public-organization fingerprint and whether the review window was configured. Canonical-organization scoping excludes unrelated and archived teams. The install prompt still requires a signed-in RSVP confirmation or critical-message acknowledgment. Local 320/390/768/1440 proof checks reflow, 44px targets, copy, empty fields, and tenant/team exclusion without relabeling local proof as hosted proof. After this code is deployed, hosted public-family proof can additionally fail closed on missing or mismatched fingerprint/configured-state evidence and expected review-window copy. Production still requires deployment, configured public organization/review-window values, and hosted browser proof before acceptance. |
| Family Access Status and Invitation Recovery | Phase 1 - Access and Activation | Local implementation; hosted and complete invitation-lifecycle proof pending | `/access/status`, `/invite/recover`, `/invite/expired`; `/api/registration-requests/status`; `/api/invites/recover` | `app/public-intake-rate-limit.test.ts`; `app/route-guards.test.ts`; `app/routes-smoke.test.ts`; `components/access-activation.test.tsx`; mobile Chromium inspection; `npm run typecheck` | A family can check a request with its reference plus the original email and sees only a masked child match, team, existing review status, and safe next step. Invitation recovery begins blank, returns an enumeration-safe response, and records an organization-scoped admin-review audit only when a matching invitation exists. Both public routes are rate-limited and use no seed fallback. Recovery never resends a provider message, changes invitation status, creates membership, or approves a guardian link. Signed single-use acceptance, provider delivery, first-sign-in setup, and additional-guardian invitation remain separate slices. |
| Family First Sign-In Setup | Phase 1 - Access and Activation | Local implementation; migration installed/read back on preview and production; feature-specific RLS and signed-in browser proof pending | `/parent/setup`; `/api/parent/setup`; `/api/auth/session-landing`; migration `0025` | `app/api-parent-setup.test.ts`; `app/api/auth/session-landing/route.test.ts`; `components/family-first-sign-in.test.tsx`; `lib/supabase/family-onboarding.test.ts`; `app/route-guards.test.ts`; `npm run typecheck` | A newly linked parent is routed to a focused language, translation, shared-device privacy, critical/routine channel, quiet-hours, and timezone setup when migration `0025` is available. The server derives the adult from the verified session; one service-only atomic RPC requires active parent team access, saves the profile and four notification preferences, and writes an attributed audit. Choosing a channel is explicitly not channel verification or provider delivery, and the RPC performs no send. If the migration is unavailable, session landing preserves the existing parent route instead of trapping families. |
| One-Time Parent Invitation Issuance and Acceptance | Phase 1 - Access and Activation | Local closed-loop implementation and signed-in responsive review proof; migrations installed/read back on preview and production; feature-specific RLS/populated delivery proof pending | `/admin/registrations`; `/invite/accept`; `/api/admin/registration-requests/*`; `/api/invites/preview`; `/api/invites/accept`; `/auth`; migrations `0026`, `0033` | `app/api-registration-review.test.ts`; `lib/supabase/registration-invitation-issuance.test.ts`; `app/api-invite-acceptance.test.ts`; `components/feature-panels.test.tsx`; `components/invite-acceptance.test.tsx`; `lib/supabase/invite-acceptance.test.ts`; `output/playwright/registration-invitation/proof.json`; `npm run qa:registration-invitation-proof`; `app/route-guards.test.ts`; `npm run typecheck` | A signed-in organization administrator enters a blank evidence note and approves through one atomic wrapper transaction. If the adult already has a verified matching profile, scoped guardian/team access activates without an invitation. Otherwise the server creates a 32-byte one-time secret, sends only its SHA-256 hash into the approval transaction, and returns the fragment-carried link once for manual handoff; the raw secret is not stored. No email, SMS, push, or chat provider executes. Preview reveals only league, team, masked child, masked invited email, and expiry. Acceptance requires a verified exact-email session, pending/unexpired invitation, active season, and existing invited guardian row, then atomically activates only that guardian/team scope and records audit. Wrong-account, accepted, revoked, expired, replay, and missing-scope paths fail closed. Signed-in 375/390/768/1440 admin proof confirms the evidence note begins blank, the reviewer cannot be client-selected, controls meet 44px, and no overflow or browser errors occur. |
| Additional Guardian Review and Invitation | Phase 1 - Access and Activation | Local closed-loop implementation and signed-in degraded-state browser proof; migration installed/read back and lint-repaired on preview and production; feature-specific RLS/populated lifecycle proof pending | `/parent/family-access`; `/admin/guardian-links`; `/api/parent/additional-guardians`; `/api/admin/additional-guardians/*`; migration `0027` | `lib/supabase/additional-guardians.test.ts`; `app/api-additional-guardians.test.ts`; `components/additional-guardian-access.test.tsx`; `output/playwright/additional-guardian/proof.json`; `npm run typecheck`; `npm test`; `npm run build` | A current linked guardian proposes one adult for one child/team using a blank form and sees pending, cancelled, rejected, invitation-ready, accepted, expired, and revoked truth. Standard linked-guardian scope is explicit and excludes custody, medical, transportation, schedule-editing, roster, and publishing authority. Only an active organization administrator may approve or decline with a bounded family-visible reason. Approval revalidates the proposing guardian and active season, creates the exact invited guardian scope atomically, and returns a seven-day one-time fragment link once; it never sends email, SMS, push, or chat. Exact invited-email sign-in activates access through migration `0026`. Parent cancellation, admin rejection, and admin revocation are attributed and audited; revocation removes only the approved child link and removes team membership only when no other active linked child requires it. Signed-in 390px parent/admin proof confirms migration-unavailable failure is explicit, the form stays disabled, existing access remains unchanged, controls meet 48px, pages do not overflow, and browser errors remain zero. Provider delivery remains a separate external gate. |
| Reviewed Season and Team Transition | Phase 5 - Season Continuity | Local closed-loop implementation and signed-in responsive degraded-state proof; migration installed/read back on preview and production; feature-specific RLS/populated lifecycle proof pending | `/parent/family-access`; `/admin/health`; `/api/admin/season-transitions`; `/api/parent/season-transitions/[transitionId]/respond`; migration `0032` | `lib/supabase/season-transitions.test.ts`; `app/api-season-transitions.test.ts`; `components/season-transition-review.test.tsx`; `output/playwright/season-transition/proof.json`; `npm run qa:season-transition-proof`; `npm run typecheck`; `npm test`; `npm run build` | An active organization administrator proposes one child/team move with a bounded reason and expiration. Every current signed-in guardian reviews the same immutable carry/reset scope; application rechecks the exact guardian set, source roster state, active target team/season, expiration, and lock version. The approved source roster row is archived and only child display identity plus accepted guardian relationships create a provenance-linked active target roster row. Jersey, permissions, custody, medical, RSVP, attendance, transportation, caregivers, media consent, notification preferences, and conversation state never carry. An administrator explicitly closes or cancels an unapplied review with an attributed reason. Correction can remove only transition-created rows and restore the exact source status before any downstream family record exists; otherwise a new reviewed correction is required. Every consequential action is attributed and audited, all tables/RPCs are service-only, and no provider message is created or sent. Signed-in parent/admin proof at 375/390/768/1440 records zero overflow, undersized controls, and browser errors. |
| Operational Truth and Verified Context | Platform Foundation | Local implementation; proof promotion pending | Authenticated role surfaces; `lib/operational-truth.ts`; `lib/supabase/shell-access.ts` | `lib/operational-truth.test.ts`; route/topology tests; `npm run typecheck` | Active role, organization, season, and optional team context are server-derived. Record, approval, publication, provider acceptance/delivery, acknowledgment, and freshness are independent evidence lanes. A positive summary requires every critical lane; missing or stale critical evidence renders “Needs verification.” Role changes remount scoped providers, cancel visible work, clear private client caches, and navigate through the server guard. |
| Versioned RSVP and Offline Game-Day Pack | Phase 2 - Game Day Reliability | Local implementation behind gates | `/api/rsvps`; `/api/coach/attendance`; `/api/coach/event-notes`; Field Mode | Outbox, operational truth, API, domain, and browser tests; migration `0023` | RSVP and attendance writes require idempotency keys plus expected record and schedule versions; concurrency or schedule drift returns `409`. Device queues accept only RSVP, attendance, and coach operational notes. Offline replay requires `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED`, `OFFLINE_WRITES_ENABLED`, and the organization flag; provider sends, approvals, roster edits, publishing, and volunteer claims are never queued. |
| Family Mission Control and Event Passport | Phase 2 - Game Day Reliability | Local implementation and signed-in responsive empty-state UI refresh complete; populated/offline/hosted proof pending | `/parent`, `/parent/schedule`, `/parent/rsvp`; `lib/family-mission-control.ts`; `components/family-mission-control.tsx` | `lib/family-mission-control.test.ts`; `components/family-mission-control.test.tsx`; `components/coordination-workbenches.test.tsx`; `output/playwright/parent-ui-refresh/proof.json`; `npm run qa:season-certainty-proof`; `npm run typecheck`; `npm test`; `npm run build` | Parent Home now leads with one guardian-scoped household view, child/team filters, the next Event Passport, a seven-day agenda, and explainable official-time overlaps. The 2026-07-24 Figma-aligned refresh adds a warm family-week hierarchy, privacy-safe game-day imagery, a real-data readiness rail, a compact empty state, and a consistent accessible vector-icon language for daypart, event, location, response, communication, transportation, Replay, and offline cues. Primary event action remains visible while detailed Event Passport facts move into a native disclosure. Official event start, status, and schedule version remain separate from unresolved family logistics: arrival, leave time, separately published field, bring list, and responsible adult are never inferred. RSVP becomes review-required when its confirmed schedule version is older than the event. Every Event Passport names source/freshness, unresolved facts, and the next action. The legacy caregiver record is labeled as a private coordination note and begins blank; it does not assign transportation, authorize pickup, grant access, or change the schedule. Signed-in 375/390/768/1440 local proof shows zero document overflow and zero browser errors against the current no-upcoming-event state. |
| Mutual-Acceptance Transportation | Phase 3 - Responsibility and Temporary Care | Local implementation and signed-in degraded-state responsive proof; migration installed/read back on preview and production, with focused populated lifecycle proof complete on preview; production route-browser/provider proof pending | `/parent/transportation`; `/api/parent/transportation/*`; Event Passport; migration `0028` | `lib/supabase/transportation.test.ts`; `app/api-transportation.test.ts`; `components/family-transportation.test.tsx`; `lib/family-mission-control.test.ts`; `output/playwright/family-transportation/proof.json`; `npm run typecheck`; `npm test`; `npm run build` | Outbound and return responsibility are separate. A guardian request remains unassigned. A different active team guardian’s seat offer records the driver-side acceptance; only the requesting guardian’s explicit second acceptance assigns responsibility at the current official schedule version. Version drift changes assigned responsibility to needs review without erasing history. Recorded pickup restrictions fail closed without revealing restriction details. Either adult can withdraw with an attributed bounded reason, returning the direction to unassigned when operationally possible. Tables and RPCs are service-only, session-derived actors are revalidated in SQL, no home address is collected, and no provider message is created or sent. Signed-in 375/390/768/1440 proof confirms migration-unavailable truth, disabled mutation controls, zero overflow, and zero browser errors. |
| Temporary Caregiver Authorization | Phase 3 - Responsibility and Temporary Care | Local implementation and signed-in degraded-state responsive proof complete; migration installed/read back on preview and production, with focused populated lifecycle proof complete on preview; provider proof pending | `/parent/family-access`; `/caregiver/accept`; `/caregiver`; `/api/parent/caregiver-authorizations/*`; `/api/caregiver/authorizations/*`; migration `0029` | `lib/supabase/temporary-caregivers.test.ts`; `app/api-temporary-caregivers.test.ts`; `components/temporary-caregiver-access.test.tsx`; `output/playwright/family-caregiver/proof.json`; `npm run typecheck`; `npm test`; `npm run build` | A guardian reviews one child/team, 1-10 selected events, a maximum 14-day window, required Event Passport access, and optional pickup. The exact-email caregiver separately accepts; a future window stays accepted-upcoming and exposes no caregiver-portal data until its start. The record never creates guardian membership and permanently excludes medical/health access, custody authority, RSVP/attendance changes, official schedule changes, team publishing, roster/other-child access, and onward delegation. Pickup restrictions fail closed without exposing details. Invitations are one-time fragment secrets, manually shared, rate-limited for preview, hashed at rest, and rotated after acceptance or revocation. Expiry and attributed revocation remove server access; the caregiver surface clears its private cache namespace at next contact. Tables/RPCs are service-only, audit every consequential step, and create no provider message. Signed-in parent, acceptance, and no-access portal proof passes at 375/390/768/1440 with zero overflow and browser errors; migration-unavailable parent actions remain disabled and no private caregiver event data renders. |
| Explainable Operations and High-Impact Preview | Phase 1 - Launch Readiness | Local implementation | Admin overview; `/api/admin/impact-preview`; `/api/admin/seasons` | Priority unit tests; API auth tests; browser proof pending | Deterministic priority bands show safety, deadline, event proximity, dependency, authority, and age reasons. Season archive requires a reason, server-recomputed affected counts, an expiring HMAC preview, explicit confirmation, and audit evidence. `IMPACT_PREVIEW_SECRET` must be configured before archive confirmation is available. |
| Provable Communications Delivery | Provider Foundation | Local Pingram transport, signed webhook, suppression, and reconciliation implementation; isolated Supabase QA proof and branch-Preview secrets staged; external sends disabled | `/admin/message-delivery-review`; `/parent`; `/api/provider-delivery/review`; `/api/notifications/acknowledge`; `/api/provider-webhooks/pingram`; internal notification worker; verified webhook routes | `lib/supabase/notification-receipts.test.ts`; `lib/services/notifications/pingram.test.ts`; `lib/services/notifications/sms-provider.test.ts`; `lib/services/notifications/sms-contact-suppression.test.ts`; `lib/services/notifications/webhook-verification.test.ts`; `app/api-notification-worker.test.ts`; `lib/services/notifications/executor.test.ts`; `lib/supabase/provider-delivery.test.ts`; migrations `0024`, `20260724143554`, `20260727223340`, `20260727224549`, and `20260727230627`; isolated QA migration/RLS proof; `docs/pingram-preview-activation-2026-07-27.md`; `npm test`; production-hosted provider proof pending | Admin review and parent receipt workbenches keep draft, human approval, provider acceptance, verified delivery/failure, read, and explicit acknowledgment separate. `SMS_PROVIDER=pingram` is required to select Pingram; missing or invalid selection stays suppressed, and Twilio remains an explicit rollback transport only. Environment, organization, production-approval/QA-allowlist, consent/preference, sender, and provider-readiness gates all fail closed and are rechecked immediately before execution. The internal worker requires an exact expected-attempt UUID, filters its claim to that row, fails closed when it cannot claim exactly that attempt, and exposes a token-protected, non-secret hosted project/organization authority readback. Pingram webhooks are verified against the raw body before persistence; lifecycle-scoped replay IDs update delivery evidence, while verified STOP/START events atomically persist organization/user suppression without storing raw phone numbers. A START event clears provider STOP suppression but does not silently re-enable a notification preference. Timeouts, connection failures, server errors, or malformed successful responses are recorded as indeterminate and are not automatically retried until reconciled; a signed terminal callback resolves that state without collapsing delivery success and failure. The dedicated approved Vercel automation bypass now reaches the branch Preview callback, and hosted signed/replay proof passed without a send. Sender readiness, both send gates, and the demo-organization gate remain off; no live SMS has been sent. |
| Private Media Lifecycle | Trust and Safety | Quarantine pipeline; production release disabled | `/api/media/uploads/initiate`; `/complete`; `/family-release`; moderation routes | API auth/RLS source tests; scanner, storage, and hosted proof pending | Uploads use private tenant/team quarantine paths, type/size/hash checks, decode/re-encode and EXIF removal. Family visibility also requires clean scanning evidence, consent, and human family-release approval. `MEDIA_UPLOADS_ENABLED`, the organization flag, and a proven scan adapter must all pass; unscanned files never leave quarantine. The admin media review surface labels storage as link-based until configured and routes approve/reject/hide/restore/remove through the authenticated moderation API when saving changes. |
| Family Balance and Stripe Connect Evidence | Community Operations | Proof-safe reads and gated test-mode integration | `/api/parent/family-balance`; payment Connect/Checkout/webhook routes | Domain/API tests; Stripe sandbox and hosted proof pending | “Family Wallet” is replaced by Family Balance Summary. Seed formulas no longer infer charges, credits, or paid state. Stripe Connect Standard direct connected-account Checkout Sessions carry no LeaguePilot application fee in v1; only a verified webhook can confirm payment. Browser returns never mark an obligation paid. |
| Prompt API Companion | Development Workflow | Done | `tools/prompt-api/`; `.vscode/tasks.json`; `docs/prompt-evolution-timeline.md` | `tools/prompt-api/prompt-api.test.mjs`; `npm run codex:spec`; `npm run codex:debug` | Side-effect-free wrappers generate system-specific specification and debugging prompts for LeaguePilot, QuietPilot, Little Legend Studios, and Champion Coach OS. They print text for review and never execute Codex, call providers, or mutate repositories. |
| Next-Level Command Center | Product UX Foundation | Supporting model | Internal supporting read model | `lib/domain/domain.test.ts`; `npm run typecheck` | The pure domain read model and reusable component remain available for focused workflows, but the inventory-style command center is no longer rendered in the parent, coach, admin, public-home, or Parent Replay primary journeys. Those routes now lead with role-specific operational truth. |
| Parent Dashboard and Family Flight Plan | Phase 2 - Parent Engagement | Local closed-loop implementation; hosted proof pending for new coordination actions | `/parent`, `/parent/schedule`, `/parent/messages`, `/parent/photos`, `/parent/practice-recaps`, `/parent/family-access`, `/parent/settings`; `/api/parent/family-flight-plan/handoff` | `lib/domain/domain.test.ts`; `lib/services/family-flight-plan.test.ts`; `lib/season-certainty.test.ts`; `components/feature-panels.test.tsx`; `components/coordination-workbenches.test.tsx`; migration `0024`; transactional PostgreSQL workflow smoke; `npm run qa:season-certainty-proof`; `npm test`; `npm run build` | Parent Home keeps the older Family Flight Plan below Mission Control as a secondary household timeline for linked children, RSVP, weather, and team-help context. Its caregiver form begins blank and saves or removes one guardian-owned coordination note for one linked child/event. Copy and audit summaries explicitly state that this record is not transportation assignment, pickup authorization, app access, an official schedule change, or a provider message. Children still do not log in. |
| One-Tap RSVP | Phase 2 - Parent Engagement | Local UX convergence complete; versioned path requires migration `0023`; hosted proof pending | `/parent/schedule`, `/parent/rsvp`, `/coach/attendance`, `/coach/rsvps`, `/api/rsvps` | `components/family/components.test.tsx`; `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; outbox/route tests; `npm run typecheck`; `npm test`; `npm run build` | Parent Schedule and the compatibility Needs Reply route now use one shared Going / Maybe / Can’t go control for linked children. Schedule adds the shared family filter and opens the existing truth-bounded Event Passport instead of inferring an arrival window. Writes retain the existing idempotency key, RSVP lock version, event schedule version, guardian-conflict, and schedule-change reconciliation path. No schema, route contract, provider send, or attendance authority changed. |
| RSVP Reliability Tracker | Phase 2 - Coach Operations | Done | `/coach` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Coach dashboard derives family response rate, no-response count, late-change count, and reminder mode from assigned-team RSVP records without public parent leaderboards. |
| Adaptive Calendar, Alerts, and Game-Day Resolution Room | Phase 2 - Parent Engagement | Local closed-loop implementation; migration installed/read back on preview and production; populated resolution-receipt proof pending | `/schedule`, `/parent/schedule`, `/coach/schedule`, `/admin/schedule-venues`; `/api/game-day-resolution` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `lib/supabase/game-day-resolution.test.ts`; `supabase/rls-policy.test.ts`; migration `0024`; transactional PostgreSQL workflow smoke; `npm run qa:season-certainty-proof`; `npm test`; `npm run build` | Parent Schedule remains read-only and guardian-scoped. Coach and admin schedule routes now open a Game-Day Resolution Room that combines the selected event, latest weather draft, RSVP response counts, affected roster, and prior decision receipts. A verified coach/admin must choose monitor, confirm on time, delay, or cancel and enter a reason. The atomic RPC records evidence, applies delay/cancel event changes, writes audit/change logs, and creates pending notification drafts for confirm/delay/cancel; it never executes provider delivery. |
| Notification Preference Center | Phase 2 - Parent Engagement | Done local; historical hosted evidence retained | `/parent`, `/api/notification-preferences`, `/api/notification-preferences/unsubscribe`, `/api/push-subscriptions`, `/api/provider-delivery/retry-plan` | `components/feature-panels.test.tsx`; `app/api-live-actions.test.ts`; `lib/supabase/provider-delivery.test.ts`; historical 2026-07-01 session artifact; `npm test`; `npm run build` | Parent dashboard shows push, email, SMS fallback, urgent-only SMS, quiet hours, and digest frequency as the messaging contract. Preference and review routes derive users from verified sessions. External sends remain disconnected. The earlier hosted mutation is historical; current proof must use isolated QA. |
| Communication Room and Official Message Revisions | Phase 4 - Priority Communication | Local implementation and legacy isolated-QA record proof; migration installed/read back; populated revision acceptance pending | `/parent/messages`, `/admin/communications`, `/admin/message-delivery-review`, `/api/official-communications/publish`, `/api/notifications/acknowledge`; migration `0030` | Component/service/API tests; local responsive artifact; guarded `qa:communication-room-record-proof` on isolated QA only; `npm test`; `npm run build` | Critical, Updates, and Conversation remain separate. Publications and corrections are immutable, version-bound, audited, and create pending provider-review records only. LP-QA-GUARD-001 forbids the mutating record proof on production. Remaining browser/session, Realtime, provider, and production acceptance use the closeout ledger gates. |
| Plan → Practice → Parent Replay and Practice Safety | Signature Feature | Local closed-loop coach workflow and signed-in family-story responsive proof complete; migrations installed/read back on preview and production; populated consent-media proof pending | `/coach/practice-recaps`, `/coach/parent-replay`, `/parent/practice-recaps`; `/api/coach/practice-runs`; `/api/coach/parent-replay`, `/approve`, `/publish`; `/api/parent/replays/[replayId]/engagement`; migrations `0024`, `0031` | `lib/supabase/practice-runs.test.ts`; `lib/supabase/family-replays.test.ts`; `components/family-parent-replay.test.tsx`; `app/api-family-replays.test.ts`; `output/playwright/family-parent-replay/proof.json`; `npm run qa:family-replay-proof`; component/domain/API/AI tests; transactional PostgreSQL workflow smoke | A coach saves a plan, separately starts and completes practice with observations, then drafts, reviews, approves, and explicitly publishes a Replay. The parent route no longer reuses the broad Team Portal: it requires an active guardian link and returns only `queued` records with `published_at`, first-name/last-initial child labels, coach attribution, a tangible activity, private save/tried receipts, and a season memory timeline. Drafts are explicitly removed from parent-scoped Team Portal data too. Child media is optional; text remains meaningful without it. Migration `0031` permits media only after administrator review, complete child-subject identification, scan/moderation/family release, accessible alt text/transcript, and current consent from every active guardian of every identified child. Consent, team, storage, and safety state are rechecked on every read; revocation hides media without deleting the Replay. Family engagement is private and never ranks children. Publication and engagement execute zero provider sends. |
| AI Coach Workspace | Signature Feature | Done | `/coach/practice-recaps`, `/coach/parent-replay`, `/api/coach/ai-workspace` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `lib/services/ai-coach/ai-coach-provider.test.ts`; `app/api/coach/ai-workspace/route.test.ts`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof` | Deterministic review-only workspace creates New Parent Brief, Team Onboarding Brief for new coaches or added team participants, Weekly Digest, Practice Replay, Announcement Cleaner, Smart FAQ, Coach Inbox Prioritization, Parent Brief Before Game, Season Timeline, Coach Knowledge Base, Action Item Extraction, Safety Monitor, and End-of-Season Storybook drafts from existing announcements, schedule, pinned posts, visible team chat, roster names/jerseys, approved media, volunteer needs, and coach-selected focus areas. The practice recap route loads signed-in Supabase coach scope before provider requests, and missing coach access is gated. Signed-in assigned coaches/admins can request an OpenAI Responses API rewrite through the server route only when `AI_COACH_PROVIDER_ENABLED=true` and `OPENAI_API_KEY` are configured; requests use `store: false`, local privacy filters, source evidence, and the Preview -> Edit -> Approve -> Publish workflow. Evals cover cross-team data, private contacts, hidden media/messages, unsupported provider-send/publish claims, and unsourced private/external claims. Hosted QA proof captured `output/playwright/ai-coach-provider-rewrite-qa-session-live.png`. No automatic publish or provider send is connected. |
| Rookie Coach Assist | Coach Operations | Done | `/coach/practice-recaps`, `/coach/parent-replay` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run typecheck`; `npm run build` | Deterministic local generator helps new volunteer coaches plan age-safe motivation strategies and simple practice blocks for ages 3-6. Output includes Chaos Button 90-second sideline reset copy, Coach Voice Coach phrase replacement, Practice Personality Engine drill adaptation by team energy, Parent Replay seed focus areas, Parent Reinforcement Loop draft copy, source evidence, and safety boundary. No AI provider, automatic publish, external notification send, schema change, or workflow state is connected. |
| Coach Drill Video References | Coach Operations | Done | `/coach/practice-recaps`, `/admin/media-review`, `/api/coach/drill-videos`, `/api/coach/drill-video-assignments`, `/api/admin/drill-videos/review`, `/api/admin/drill-video-sources/review` | `lib/domain/drill-videos.test.ts`; `lib/services/youtube/drill-video-metadata.test.ts`; `app/api-drill-videos.test.ts`; `components/feature-panels.test.tsx`; `supabase/rls-policy.test.ts`; `npm test`; `npm run typecheck`; `npm run build` | Coaches can submit YouTube drill URLs for metadata validation and admin review. Supabase stores video/source/assignment references, source allowlist status, Made-for-Kids and embeddability metadata, audit events, and coach-only practice-plan assignments. Approved videos render through the privacy-enhanced YouTube embed URL inside coach planning. The app does not download, rehost, clip, proxy thumbnails, strip attribution, or make drill videos family-facing in v1. `YOUTUBE_DATA_API_KEY` is required before a submitted URL is saved. |
| Team Portal Feature Hub | Tier 1-3 Product Surface | Done | `/parent/family-access`, `/parent/photos`, `/coach/roster`, `/team-portal`, `/` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Team-scoped portal displays weekly digest, Game Day Calm Mode essentials, field maps, coach video library, parent education, coach-to-parent translation, skill cards, team quests, weather alert boundary, skill trees, season storybook, memory timeline, volunteer center, and AI learning-plan boundary. Assigned coaches and org admins can update portal colors and mascot through Supabase-backed APIs. Role-specific wrappers minimize team portal data before render. |
| Branded Team Chat | Phase 2 - Parent Engagement | Done for coach and compatibility surfaces | `/coach/messages`, `/team-chat` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `lib/supabase/team-lifecycle.test.ts`; `npm test`; `npm run build` | Coach and compatibility Team Chat use each team's mascot and colors, a branded clubhouse header, quick-topic chips, pinned coach notes, Game-Day Questions, Supabase persistence, read receipts, Realtime subscription wiring, and moderation controls. Supabase team reads sort active team/season rows ahead of archived rows. The parent route now uses the authority-separated Communication Room while preserving the same server services. |
| Multi-Theme System and Theme Designer | Platform Foundation | Done | `/team-portal`, `/admin/branding`, `/admin/themes`, `/api/admin/theme-defaults`, `/api/admin/team-logos` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `app/api-live-actions.test.ts`; `npm test`; `npm run build` | Theme presets exist for soccer, football, baseball, scouts, golf, tennis, swim, and generic. Assigned coaches/admins can apply presets, mascot, and colors through Supabase-backed writes, and admins can save tenant defaults for future teams. `/admin/themes` remains a compatibility route for `/admin/branding`. The admin branding workbench includes a tenant environment studio that previews app menus, team portal, mobile header, message templates, sponsor document proof, and governance boundaries from one focused control surface. It still includes interactive element toggles for mascot mark, mobile header, and Game Day band previews, plus local mascot artwork preview. Durable binary storage, public rendering, email rendering, and push delivery remain provider-gated; admins can still queue reviewed HTTPS logo asset metadata. |
| Coach Dashboard | Phase 2 - Coach Operations | Done | `/coach`, `/coach/schedule`, `/coach/messages`, `/coach/attendance`, `/coach/practice-recaps`, `/coach/roster`, `/coach/weather-fields`, `/coach/drafts`, `/coach/snacks-volunteers`, `/coach/settings` | `lib/season-certainty.test.ts`; `components/feature-panels.test.tsx`; `npm run qa:season-certainty-proof`; `npm test`; `npm run build` | Coach Home starts with a pausable assigned-team announcement banner and Game-Day Radar for the next 15 minutes: next event, RSVP coverage, assigned coaches, location, snack/volunteer gaps, weather drafts, and review-only actions grouped as people, place, and plan. Dense readiness, weather policy, family response, and team-help workflows remain behind disclosure rows. Drafts remain review-only and do not claim provider delivery. Role wrappers use active coach memberships before loading sensitive team data. |
| Admin Dashboard | Phase 1 - Launch Readiness | Done | `/admin`, `/admin/family-access`, `/admin/branding`, `/admin/security-audit`, `/admin/reports-archive`, `/admin/media-review`, `/admin/safety-weather`, `/admin/communications`, `/admin/schedule-venues`, `/admin/message-delivery-review`, `/admin/sponsors`, `/admin/settings`, `/admin/teams` | `lib/season-certainty.test.ts`; `components/feature-panels.test.tsx`; `app/routes-smoke.test.ts`; `npm run qa:season-certainty-proof`; `npm test`; `npm run typecheck`; `npm run qa:tenant-readiness-proof`; `QA_PROOF_BASE_URL=http://127.0.0.1:3020 npm run qa:brand-proof`; `QA_PROOF_BASE_URL=http://127.0.0.1:3020 npm run qa:session-proof`; `npm run build` | Admin Overview keeps organization, season, and role context visible, then answers “What is blocking launch?” with prioritized signals, pending review queues, and compact team status. Lower planning and management tools sit behind an operations workspace disclosure. Focused media and sponsor routes remain guarded. `/admin/sponsors` now leads with an admin-only Community Proof ledger that keeps sponsor record, configured public placement, recap inventory, logo metadata, and billing workflow evidence separate, excludes player data, and explicitly avoids payment, contract, delivered-placement, or impact claims. Message delivery review remains a record-review surface rather than a live-send claim. |
| Registration System | Phase 1 - Access Readiness | Done; production Google/Facebook provider handoff verified | `/registration`, `/auth`, `/auth/callback`, `/admin`, `/admin/registrations`, `/admin/guardian-links` | `lib/domain/domain.test.ts`; `lib/supabase/team-lifecycle.test.ts`; `components/feature-panels.test.tsx`; `app/api-live-actions.test.ts`; `app/api-auth.test.ts`; `lib/supabase/registration-approvals.test.ts`; `lib/supabase/guardian-links.test.ts`; `npm test`; `npm run build` | Parent self-registration creates pending review requests. The auth screen supports email/password plus Google and Facebook Supabase OAuth, exchanging callback codes into the same Supabase session and role landing flow. On 2026-07-28, both providers were enabled in the production Supabase project, the LeaguePilot callback URLs were read back in the redirect allowlist, and live buttons on `https://www.leaguepilot.us/auth` reached the branded Google sign-in and Facebook login screens through the expected Supabase provider callback. Completing an authenticated return still requires a real provider test user. OAuth cancellations and exchange failures return provider-specific guidance on the LeaguePilot auth page. SSO proves identity only and does not grant team, child, coach, or admin access without membership rows. The sign-in surface uses scoped high-contrast labels, helper copy, input borders, and disabled-action states in light and dark mode without changing access authority or form behavior. The client preview accepts server-backed team UUIDs, public registration options prefer active team/season rows, and the Supabase API rejects archived team/season registration attempts. Approval and guardian-link repair require verified organization-admin authority, an existing parent profile, bounded verification evidence, and audited access changes. |
| Money + Sponsors Community Commerce | Phase 2 - Community Operations | Proof-safe balance done; LPM-009 sponsor Stripe local readiness complete; payment collection gated | `/parent`, `/team-portal`, `/admin/sponsors`, `/api/parent/family-balance`, compatibility `/family-wallet`, Stripe Connect routes | `npm run qa:sponsor-stripe-readiness`; sponsor API/service/UI tests; Stripe sandbox/webhook/RLS/hosted proof pending | Family Balance Summary uses obligation and payment-evidence timestamps and never invents charges, credits, or paid status from seed formulas. League revenue and sponsor placement remain separate from settlement. `qa:sponsor-stripe-readiness` covers local repository readiness for proof-only versus sandbox boundaries, server-side Checkout Session contracts, server-only key handling, webhook settlement truth, admin/public privacy separation, and open payment gates. Gated Stripe Connect Standard creates direct connected-account Checkout Sessions without a LeaguePilot fee; only verified, replay-safe webhook evidence can confirm payment. Stripe sandbox account setup, restricted key creation, webhook endpoint registration, signing-secret configuration, sandbox Checkout Session proof, signed webhook replay/duplicate proof, refund/failure proof, hosted admin proof, finance reconciliation, and production payment approval remain open. |
| Community Safety Follow-On Surfaces | Phase 2 - Community Operations | Done | `/parent`, `/team-portal`, `/admin`, `/admin/media-review`, `/admin/safety-weather` | `lib/domain/domain.test.ts`; `components/feature-panels.test.tsx`; `npm run qa:session-proof`; `npm run qa:weather-provider-readiness`; `npm test`; `npm run typecheck`; `npm run build` | One-Tap Volunteer Marketplace packages snack duty, scorekeeper, field prep, fundraising, carpool, team parent, and backup volunteer jobs over the existing authenticated snack/volunteer claim APIs. Volunteer claim authorization derives organization scope through the signup's team instead of assuming an organization column on the signup, and the migrated local QA journey verifies the parent claim row. Equipment Exchange renders moderated parent-to-parent gear listings without public parent contact details. Weather + Safety Decision Assistant documents heat, lightning, air quality, field-closure, and cancellation review evidence without sending provider alerts. `npm run qa:weather-provider-readiness` is local repository readiness proof only for National Weather Service first, Open-Meteo fallback, optional Tomorrow.io, draft enforcement, session-derived reviewer authority, event/team scope, provider fallback, idempotent/auditable draft creation boundary, and provider-send separation; hosted weather credential proof, fallback behavior, signed-in coach/admin draft proof, Supabase readback, parent delivery, provider sandbox/webhook proof, realtime/offline behavior, accessibility, and production acceptance remain open gates. Sponsor-Safe Media Gallery frames approved team media with sponsor-safe recap copy while excluding child profiles, private metadata, hidden media, and parent contacts. Family Availability Intelligence summarizes RSVP gaps, open help, and schedule conflicts as aggregate team signals only; it does not rank or shame parents. |
| Snacks, Volunteers, Sponsors | Phase 2 - Community Operations | Local implementation done; LPM-010 sponsor fulfillment local readiness complete; hosted/provider/finance proof pending | `/team-portal`, `/coach`, `/admin`, `/admin/sponsors`, `/api/admin/sponsors` | `npm run qa:sponsor-fulfillment-readiness`; `components/feature-panels.test.tsx`; `components/sponsor-hub.test.tsx`; `lib/supabase/sponsors.test.ts`; `lib/supabase/sponsor-operations.test.ts`; `app/api-live-actions.test.ts`; `npm test`; `npm run build` | Snack and volunteer claims use authenticated Supabase APIs. Sponsor Management V2 supports organization-admin CRUD, placement settings, logo review rows, pending/active/expired status, audit events, focused `/admin/sponsors` route access, and admin-only Stripe Product/Price/invoice/payment-proof readiness records. The focused Sponsor Hub adds a mobile-friendly overview, attention queue, searchable sponsor directory, record editor, fulfillment setup checks, and CSV export over organization-scoped records. `qa:sponsor-fulfillment-readiness` covers local repository readiness for approved active placement filters, Team Portal scope, admin placement authority, approved logo reads, submitted-logo review queues, fail-closed sponsor data, fulfillment/report separation, renewal delivery gates, public and parent privacy, and open fulfillment gates. It serializes no profile/contact dataset, recognizes approved logos only, and counts revenue only from persisted paid records with provider-confirmed timestamps. Degraded reads fail closed without editable seed rows. It does not infer payment, contract, delivered placement, renewal delivery, observed placement rendering, approved logo asset proof, recap/report artifact acceptance, renewal email sandbox delivery, public placement leak QA, accessibility, finance reconciliation, production payment approval, or production sponsor acceptance. Live Stripe collection and renewal email remain gated behind server-side provider configuration, consent, review, and delivery evidence. |
| Automatic Team Builder | Phase 1 - Launch Readiness | Done local; isolated-QA browser/RLS acceptance pending | `/admin`; `/api/admin/team-builder-inputs`; `/api/admin/team-builder-plans` | `components/team-builder-workbench.test.tsx`; `app/api-team-builder.test.ts`; `lib/domain/domain.test.ts`; `lib/supabase/team-builder-inputs.test.ts`; `lib/supabase/team-builder-plans.test.ts`; `supabase/team-builder-production.test.ts`; migrations `20260727145702_complete_private_team_builder_publish.sql` and `20260729144506_team_builder_player_metadata.sql` | Authorized admins can use private birthdate-derived age/age band, cutoff-age labels, evaluation sources and notes, sibling/guardian, friend-request, skill-balance, lock, and roster constraints through persisted Preview -> Edit -> Approve -> Publish plans with audit evidence. The preview supports both private persisted profiles and review-safe metadata while keeping player display to first name plus last initial. Parent/public child detail is not exposed. Connected isolated-QA migration/readback, publish, cross-org, and browser proof remain `EXT-HOSTED-SESSION` and `EXT-RLS-ACTOR-ACTION`; local migration presence is not hosted application proof. |
| PWA, Mobile, Dark Mode | Platform Foundation | Done local; hosted reconnect proof pending | all routes, `/offline`, `/api/mobile-usage-events`, `/api/registration-requests` | `app/routes-smoke.test.ts`; `app/public-intake-rate-limit.test.ts`; `lib/offline/game-day-outbox.test.ts`; `components/offline-sync-status.test.tsx`; `npm run qa:native-app-decision-readiness`; isolated-local browser proof; `npm test`; `npm run build` | Manifest, value-gated install prompt UX, offline fallback, responsive layout, dark mode, usage metrics, durable public intake rate limiting, and actor/context-bound offline outbox foundations are present. The service worker uses network-first navigation with `/offline` fallback rather than cache-first private HTML. Environment, organization, current-session, role, context, version, and reconnect checks fail closed. PWA-first remains the deferred default; the readiness verifier is source-only, and hosted reconnect/conflict, production usage, accessibility, push-provider, app-store, native-product, and production acceptance remain external. |

## Requested Feature Tiers

| Tier | Features | Current implementation state |
| --- | --- | --- |
| Tier 1 | Team-specific portals, coach practice recap builder, weekly digest, Game Day Calm Mode, field maps | Parent Replay implements the practice recap builder. Team-specific context, Calm Mode essentials, Game Day question grouping, and field map links use existing team, schedule, RSVP, snack, volunteer, weather draft, and Team Chat data. Weekly digest remains a parent-facing rollup, not a provider send. |
| Tier 2 | Coach video library, parent education center, coach-to-parent translation, skill cards, team quests, weather alerts | Coach Drill Video References now stores approved YouTube metadata/IDs for coach-only practice planning after admin source/video review. Parent Replay still generates parent education notes, parent-friendly translations, skill cards, and team quests. Weather alerts remain approval-gated and no automatic provider send occurs. |
| Tier 3 | Skill trees, season storybook, memory timeline, volunteer center, AI-generated learning plans | Replay focus areas roll up into skill-tree cues, memory moments, and a team timeline that also includes events, media, coach notes, and volunteer moments. Optional OpenAI rewrites are authenticated and review-only where configured; Preview OpenAI remains out of scope. |
| Signature | Parent Replay | Implemented as the differentiated coaching loop: after practice, coach selects 2-3 focus areas and the app generates parent-ready activities, translations, healthy aggregate engagement, and a memory artifact. |

## Original Feature Notes

1. Smart Invite Recovery
User Value

Parents often lose invite links, change phones, miss emails, or forward links incorrectly. Invite recovery reduces support requests for coaches and admins.

MVP Behavior

Parents can enter their email or phone number and request a new invite link.

System checks:

Is this email/phone connected to an existing parent invite?
Is the invite expired?
Has the parent already registered?
Is the season still active?
Recommended Schema
parent_invites
- id
- organization_id
- team_id
- player_id
- email
- phone
- invite_token_hash
- status -- pending, accepted, expired, revoked
- sent_count
- last_sent_at
- expires_at
- accepted_at
- created_at
- updated_at
Rules
Invite links should expire after 7–14 days.
Resend limit: max 3 per hour, 10 per day.
Store hashed invite tokens, not raw tokens.
Audit every resend.
MVP Screens
“Resend Invite” screen
Invite expired page
Admin invite status view
2. Parent Dashboard
User Value

Parents want one simple place to answer:
“What do I need to know about my child’s team?”

MVP Behavior

                                                                                                                                                         
RSVP Needed
Recent Media
3. One-Tap RSVP
User Value

Coaches need to know who is coming to games and practices without chasing parents in group chats.

MVP Behavior

For each event, parent can choose:

Going
Not Going
Maybe

Coach can view attendance summary.

Recommended Schema
events
- id
- organization_id
- team_id
- season_id
- title
- event_type -- game, practice, team_event
- starts_at
- ends_at
- location_name
- location_address
- status -- scheduled, cancelled, completed
- created_at
- updated_at

rsvps
- id
- event_id
- player_id
- parent_user_id
- response -- going, not_going, maybe
- note
- responded_at
- created_at
- updated_at
Permission Rules
Parent can RSVP only for their child.
Coach can view RSVP summaries for assigned teams.
Org admin can view all RSVP data.
Archived season RSVP data is read-only.
Coach Attendance View
Event: Saturday Game

Going: 9
Maybe: 2
Not Going: 1
No Response: 3
4. Schedule Change Alerts
User Value

This is one of the most appreciated features because parents hate missing last-minute schedule changes.

MVP Behavior

When a coach or org admin changes an event time, location, or status, the system notifies affected parents.

Trigger Events

Send alerts when:

Game/practice time changes
Location changes
Event is cancelled
New event is added
Recommended Schema
notifications
- id
- organization_id
- recipient_user_id
- team_id
- event_id nullable
- notification_type -- schedule_changed, event_cancelled, new_event, invite_sent
- title
- body
- channel -- push, email, sms
- status -- pending, sent, failed, read
- created_at
- sent_at
- read_at
MVP Notification Channels

Recommended order:

Push notification
Email fallback
SMS only for urgent changes or invite recovery

SMS should be limited in MVP because it adds cost.

Alert Example
Schedule changed:
Tigers vs Hawks is now Saturday at 10:30 AM at Field 3.
5. CSV Duplicate Detection
User Value

Bad roster imports create confusion immediately. Duplicate detection prevents messy teams, wrong parent links, and repeated invites.

MVP Behavior

Before finalizing import, the admin sees possible duplicates.

Detect duplicates by:

Same player name + same team
Same parent email
Same parent phone
Same jersey number within team
Same player name across same season
Recommended Import Flow
Upload CSV
Validate required columns
Normalize names/emails/phones
Preview rows
Detect duplicates
Show warnings/errors
Admin resolves issues
Commit import
Send invites
Log import action
Recommended Schema
roster_imports
- id
- organization_id
- season_id
- uploaded_by_user_id
- filename
- status -- uploaded, validated, committed, failed
- total_rows
- valid_rows
- warning_rows
- error_rows
- created_at
- committed_at

roster_import_rows
- id
- roster_import_id
- row_number
- raw_data_json
- normalized_data_json
- status -- valid, warning, error, skipped
- issue_codes_json
- created_at
Example Issue Codes
missing_parent_email
duplicate_player_same_team
duplicate_parent_phone
invalid_phone
invalid_email
duplicate_jersey_number
MVP Recommendation

Warnings should not always block import.

Blocking errors:

Missing player name
Missing team
Invalid required parent contact
Duplicate exact player already on same team

Warnings:

Duplicate jersey number
Similar player name
Parent email used for another player
6. Admin Health Dashboard
User Value

Org admins need to know whether the season is ready before launch.

MVP Behavior

Admin dashboard shows operational problems.

Suggested Cards
Teams without coaches
Players without parent contact
Pending parent invites
Failed SMS/email invites
Duplicate roster warnings
Teams with no upcoming events
Recent media uploads
Archived season status
Recommended Queries
-- Teams missing coaches
SELECT teams.id, teams.name
FROM teams
LEFT JOIN team_memberships 
  ON team_memberships.team_id = teams.id 
  AND team_memberships.role = 'coach'
  AND team_memberships.status = 'active'
WHERE team_memberships.id IS NULL;

-- Pending invites
SELECT COUNT(*)
FROM parent_invites
WHERE status = 'pending'
AND expires_at > now();

-- Players without parent links
SELECT players.id, players.first_name, players.last_initial
FROM players
LEFT JOIN player_guardians
  ON player_guardians.player_id = players.id
WHERE player_guardians.id IS NULL;
Recommended Additional Schema
player_guardians
- id
- player_id
- parent_user_id nullable
- parent_invite_id nullable
- relationship -- mother, father, guardian, other
- status -- invited, active, removed
- created_at
- updated_at
Recommended MVP Priority Order
Phase 1: Launch Readiness

Build these first:

CSV duplicate detection
Smart invite recovery
Admin health dashboard

Reason: these help the organization successfully onboard teams and parents.

Phase 2: Parent Engagement

Build next:

Parent dashboard
One-tap RSVP
Schedule change alerts

Reason: these are the features parents and coaches will feel every week.

Suggested MVP Navigation
Org Admin
Dashboard
Teams
Rosters
CSV Imports
Invites
Schedule
Media
Audit Logs
Settings
Coach
My Teams
Roster
Schedule
RSVPs
Messages
Media
Parent
Home
Schedule
RSVP
Roster
Media
Notifications
MVP Success Metrics

Track these after launch:

Invite acceptance rate
Average time from invite sent to account created
Number of failed invites
Percentage of players linked to parents
RSVP response rate
Schedule alert open rate
Weekly active parents
Number of support requests per team
CSV import error rate
My Recommendation

For the contractor-buildable MVP, I would define the first release around this:

Admin can import rosters cleanly.
Parents can reliably join.
Coaches can manage schedules and RSVPs.
Parents can see what matters immediately.
Admins can detect launch problems before families complain.

That gives the product a strong operational foundation before adding more advanced media, chat, payments, or tournament features.

## Demo showcase bootstrap

The guarded `seed:demo-showcase` workflow expands the fixed fictional `LeaguePilot Demo League` tenant to at least four teams, four parent memberships, nine players, seven scheduled events, eight chat messages, and six moderated media links. It also creates an unaffiliated visitor identity with zero organization, team, coach, or guardian grants so authentication can be demonstrated separately from protected team access.

Run it only against the intended Supabase project:

```bash
DEMO_TENANT_SEED_CONFIRM=load-fictional-data npm run seed:demo-showcase
```

The workflow is idempotent, uses `.env.local` for Supabase and fictional demo-account credentials, performs no email/SMS/push/social provider sends, and does not turn public social signup into a team-access grant. Media remains approved link-based demo content; private upload/storage and provider delivery are not implied.

This slice maps to the Tenant Onboarding Readiness lane in `docs/production-task-board.md`. Tenant scope is the fixed fictional organization and season; actor scope is service-role seeding plus role-bound demo users; isolation remains enforced by active memberships/guardian links and RLS; failure recovery is fixed-ID upsert reruns; the primary abuse case is an authenticated but unapproved identity attempting to reach team data.

## Authentication and Sponsor Hub polish

The authentication surface uses scoped LeaguePilot blue typography while preserving semantic notice colors and enabled-button contrast. Sponsor Hub attention-list copy wraps within the mobile viewport instead of widening the protected admin route.
