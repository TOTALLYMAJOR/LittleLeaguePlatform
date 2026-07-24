# Feature Implementation Tracker

Production scaffold decision: feature slices live in the root Next.js app with typed local seed fallbacks and Supabase-backed production paths for auth-scoped reads, writes, audits, provider-safe drafts, and admin operations. Real SendGrid, Twilio, Web Push, private-media, Stripe Connect, and OpenAI adapters exist only behind server and organization gates. Their presence is not hosted or operational proof; external delivery, family media release, and payment collection remain disabled until the applicable sandbox, webhook, RLS, consent, and hosted gates pass.

| Feature | Phase | Status | Implemented routes | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| Season Launch Wizard and traced roster commit | Phase 1 - Launch Readiness | Local closed-loop implementation; hosted proof pending | `/admin/imports`; `/api/admin/roster-imports/audit`; `/api/admin/season-launch/commit`; `/rollback` | `lib/domain/domain.test.ts`; `supabase/rls-policy.test.ts`; migration `0024`; transactional PostgreSQL migration/workflow smoke; `npm test`; `npm run typecheck`; `npm run build` | Parses and normalizes CSV rows, blocks errors, requires explicit warning confirmation, stages source evidence, and commits players/guardian links/invites only after active organization-admin approval. Every created row carries import provenance. Safe rollback removes only provenance-created rows and stops when imported players have downstream RSVP, attendance, safety, health, learning, media-consent, caregiver-handoff, or family-balance activity. Commit and rollback are atomic RPCs and execute zero provider sends. Team, coach, schedule, and communications remain separate launch gates. |
| Smart Invite Recovery | Phase 1 - Launch Readiness | Done | `/invite/recover`, `/invite/expired`, `/admin/invites` | `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Checks not found, expired, accepted, active season, and hourly/daily limits; hashes only, no raw token display. |
| Admin Health Dashboard | Phase 1 - Launch Readiness | Done | `/admin/health` | `lib/domain/domain.test.ts`; `lib/supabase/tenant-readiness.test.ts`; `components/feature-panels.test.tsx`; `npm test`; `npm run typecheck`; `npm run qa:tenant-readiness-proof`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:tenant-readiness-proof`; `npm run build` | Computes missing coaches, missing parent links, pending/failed invites, duplicate warnings, empty schedules, media, archive state, and Supabase-scoped tenant setup readiness for the signed-in organization admin. Browser proof captures `/admin/health` and `/admin/teams` under `output/playwright/tenant-readiness/`; production tenant-readiness proof passed against `https://www.leaguepilot.us` on 2026-07-18. |
| Fictional Demo Tenant Seed | Platform Foundation | Done | `scripts/bootstrap-demo-tenant.mjs`; `scripts/capture-demo-tenant-proof.mjs`; `npm run supabase:demo-tenant`; `npm run qa:demo-tenant-proof` | `app/routes-smoke.test.ts`; `node --check scripts/bootstrap-demo-tenant.mjs`; `node --check scripts/capture-demo-tenant-proof.mjs`; `DEMO_TENANT_SEED_CONFIRM=load-fictional-data npm run supabase:demo-tenant`; `npm run qa:demo-tenant-proof`; Supabase readback; `git diff --check` | Guarded Supabase service-role script creates the fictional `LeaguePilot Demo League` with demo admin, coach, and parent auth users plus populated season, teams, players, guardian links, schedule, RSVPs, chat, media links, registration queue, brand evidence, sponsor proof, provider-safe notification records, support, audit, and mobile usage rows. The browser proof signs in DEMO admin/coach/parent users, verifies demo tenant content across role-scoped routes, captures mobile and desktop screenshots under `output/playwright/demo-tenant/`, and confirms provider sends executed at zero. The seed requires `DEMO_TENANT_SEED_CONFIRM=load-fictional-data`, writes demo credentials to `.env.local`, and never executes external email, SMS, push, Stripe, AI, or storage-provider calls. |
| Route Topology and Role IA | Platform Foundation | Done | `/parent/*`, `/coach/*`, `/admin/*`; compatibility `/schedule`, `/team-chat`, `/team-portal`, `/coach/rsvps`, `/coach/parent-replay`, `/admin/themes`, `/admin/security`, `/admin/archive`, `/admin/guardian-links` | `lib/navigation/route-topology.test.ts`; `app/routes-smoke.test.ts`; `app/route-guards.test.ts`; `lib/supabase/route-scopes.test.ts`; `npm run typecheck` | Centralized route topology drives shell nav, command search, mobile nav, canonical aliases, compatibility hiding, and prototype noindex. Server ShellAccess derives role-home switches from the Supabase server session while wrapper routes scope data before render. |
| Season Certainty Home UI | Product UX Foundation | Done | `/parent`, `/coach`, `/admin` | `lib/season-certainty.test.ts`; `components/feature-panels.test.tsx`; `app/routes-smoke.test.ts`; `lib/navigation/route-topology.test.ts`; `npm run typecheck` | Shared `SeasonCertaintyView` read models and role-specific first screens answer each role's first question: Parent Season Story combines guardian-scoped schedule and coach updates with next-event action/privacy; Coach Game-Day Radar organizes assigned-team readiness into people, place, and plan; Admin keeps league health, queues, team status, and security visible. Parent and coach homes include a pausable moving coach-announcement banner built only from their already-scoped team rows. The read models never call Supabase from client UI. |
| Game-Day Calm UI System | Product UX Foundation | Done | `/`, `/auth`, `/parent`, `/parent/schedule`, `/coach`, `/admin`, `/coach/practice-recaps` | `app/routes-smoke.test.ts`; `components/feature-panels.test.tsx`; `lib/navigation/route-topology.test.ts`; `npm run qa:season-certainty-proof`; `npm run typecheck`; `npm test`; `npm run build` | LeaguePilot now uses a light-first navy, mist, white, and restrained-cobalt system with 8px controls, 12px operational surfaces, flatter elevation, tabular operational numerals, and certainty bands. The signed-out route preserves the animated field/ball background. The authenticated desktop navigation uses a subdued, muted, local game-day video loop across the full sidebar with a reduced-motion fallback. Parent Home leads with an image-free Season Story and keeps detailed arrival, field, pack, and player context behind the game-day disclosure; current team-scoped media is not rendered as child imagery because it lacks a verified player binding. Parent Schedule retains grouped event cards, location, truthful RSVP entry points, and role-specific mobile tabs. Coach Home uses a people/place/plan radar with review-only actions; Admin Overview remains a dense launch-blocker queue; Parent Replay makes draft review and the approval checkpoint explicit. The 2026-07-20 migrated local browser matrix confirmed zero document-level overflow at 375, 390, 768, and 1440 pixels across parent, coach, admin, and schedule routes. No persistence, access, or provider-send authority was added by this visual redesign. |
| Public Family Trust Corrections | Product UX Foundation | Local implementation and responsive browser proof complete; hosted proof pending | `/`, `/schedule`, `/registration`, `/auth`; `scripts/capture-public-family-phase0-proof.mjs` | `lib/domain/public-calendar.test.ts`; `app/routes-smoke.test.ts`; `app/route-guards.test.ts`; `components/feature-panels.test.tsx`; `npm run qa:public-family-proof`; `npm run typecheck`; `npm test`; `npm run build` | Request Team Access is the primary signed-out path; Sign In is secondary. The public schedule is an agenda/Event Passport hybrid with explicit unresolved arrival guidance and Apple, Google, Outlook, and download actions instead of raw ICS. Registration and sign-in forms contain no demonstration identities, and public access copy explains review timing, privacy, and next steps. Canonical-organization scoping excludes unrelated and archived teams. The install prompt requires a signed-in RSVP confirmation or critical-message acknowledgment, and the public Parent Replay preview shows a tangible privacy-safe family activity. Local 320/390/768/1440 proof checks reflow, 44px targets, copy, empty fields, and tenant/team exclusion. Production still requires configured public organization/review-window values and hosted browser proof. |
| Family Access Status and Invitation Recovery | Phase 1 - Access and Activation | Local implementation; hosted and complete invitation-lifecycle proof pending | `/access/status`, `/invite/recover`, `/invite/expired`; `/api/registration-requests/status`; `/api/invites/recover` | `app/public-intake-rate-limit.test.ts`; `app/route-guards.test.ts`; `app/routes-smoke.test.ts`; `components/access-activation.test.tsx`; mobile Chromium inspection; `npm run typecheck` | A family can check a request with its reference plus the original email and sees only a masked child match, team, existing review status, and safe next step. Invitation recovery begins blank, returns an enumeration-safe response, and records an organization-scoped admin-review audit only when a matching invitation exists. Both public routes are rate-limited and use no seed fallback. Recovery never resends a provider message, changes invitation status, creates membership, or approves a guardian link. Signed single-use acceptance, provider delivery, first-sign-in setup, and additional-guardian invitation remain separate slices. |
| Family First Sign-In Setup | Phase 1 - Access and Activation | Local implementation; migration/RLS and signed-in browser proof pending | `/parent/setup`; `/api/parent/setup`; `/api/auth/session-landing`; migration `0025` | `app/api-parent-setup.test.ts`; `app/api/auth/session-landing/route.test.ts`; `components/family-first-sign-in.test.tsx`; `lib/supabase/family-onboarding.test.ts`; `app/route-guards.test.ts`; `npm run typecheck` | A newly linked parent is routed to a focused language, translation, shared-device privacy, critical/routine channel, quiet-hours, and timezone setup when migration `0025` is available. The server derives the adult from the verified session; one service-only atomic RPC requires active parent team access, saves the profile and four notification preferences, and writes an attributed audit. Choosing a channel is explicitly not channel verification or provider delivery, and the RPC performs no send. If the migration is unavailable, session landing preserves the existing parent route instead of trapping families. |
| Operational Truth and Verified Context | Platform Foundation | Local implementation; proof promotion pending | Authenticated role surfaces; `lib/operational-truth.ts`; `lib/supabase/shell-access.ts` | `lib/operational-truth.test.ts`; route/topology tests; `npm run typecheck` | Active role, organization, season, and optional team context are server-derived. Record, approval, publication, provider acceptance/delivery, acknowledgment, and freshness are independent evidence lanes. A positive summary requires every critical lane; missing or stale critical evidence renders “Needs verification.” Role changes remount scoped providers, cancel visible work, clear private client caches, and navigate through the server guard. |
| Versioned RSVP and Offline Game-Day Pack | Phase 2 - Game Day Reliability | Local implementation behind gates | `/api/rsvps`; `/api/coach/attendance`; `/api/coach/event-notes`; Field Mode | Outbox, operational truth, API, domain, and browser tests; migration `0023` | RSVP and attendance writes require idempotency keys plus expected record and schedule versions; concurrency or schedule drift returns `409`. Device queues accept only RSVP, attendance, and coach operational notes. Offline replay requires `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED`, `OFFLINE_WRITES_ENABLED`, and the organization flag; provider sends, approvals, roster edits, publishing, and volunteer claims are never queued. |
| Explainable Operations and High-Impact Preview | Phase 1 - Launch Readiness | Local implementation | Admin overview; `/api/admin/impact-preview`; `/api/admin/seasons` | Priority unit tests; API auth tests; browser proof pending | Deterministic priority bands show safety, deadline, event proximity, dependency, authority, and age reasons. Season archive requires a reason, server-recomputed affected counts, an expiring HMAC preview, explicit confirmation, and audit evidence. `IMPACT_PREVIEW_SECRET` must be configured before archive confirmation is available. |
| Provable Communications Delivery | Provider Foundation | Local closed-loop evidence UI and provider adapters; isolated Supabase QA proof complete; external sends disabled by default | `/admin/message-delivery-review`; `/parent`; `/api/provider-delivery/review`; `/api/notifications/acknowledge`; internal notification worker; verified webhook routes | `lib/supabase/notification-receipts.test.ts`; provider/worker tests; migrations `0024` and `20260724143554`; transactional PostgreSQL workflow smoke; isolated QA migration/RLS/browser proof; `npm test`; production-hosted proof pending | Admin review and parent receipt workbenches keep draft, human approval, provider acceptance, verified delivery/failure, read, and explicit acknowledgment separate. Parent acknowledgment is an atomic recipient-scoped RPC and cannot exist before a delivery-attempt record. Privileged registration, retention, and acknowledgment RPC entry points are server-only. Both environment and organization gates are required for provider execution, QA recipients are allowlisted, and verified webhook event IDs are replay-safe. No production SMS claim is allowed before consent, sender/A2P registration, opt-out, and cost-control proof. |
| Private Media Lifecycle | Trust and Safety | Quarantine pipeline; production release disabled | `/api/media/uploads/initiate`; `/complete`; `/family-release`; moderation routes | API auth/RLS source tests; scanner, storage, and hosted proof pending | Uploads use private tenant/team quarantine paths, type/size/hash checks, decode/re-encode and EXIF removal. Family visibility also requires clean scanning evidence, consent, and human family-release approval. `MEDIA_UPLOADS_ENABLED`, the organization flag, and a proven scan adapter must all pass; unscanned files never leave quarantine. The admin media review surface labels storage as link-based until configured and routes approve/reject/hide/restore/remove through the authenticated moderation API when saving changes. |
| Family Balance and Stripe Connect Evidence | Community Operations | Proof-safe reads and gated test-mode integration | `/api/parent/family-balance`; payment Connect/Checkout/webhook routes | Domain/API tests; Stripe sandbox and hosted proof pending | “Family Wallet” is replaced by Family Balance Summary. Seed formulas no longer infer charges, credits, or paid state. Stripe Connect Standard direct connected-account Checkout Sessions carry no LeaguePilot application fee in v1; only a verified webhook can confirm payment. Browser returns never mark an obligation paid. |
| Prompt API Companion | Development Workflow | Done | `tools/prompt-api/`; `.vscode/tasks.json`; `docs/prompt-evolution-timeline.md` | `tools/prompt-api/prompt-api.test.mjs`; `npm run codex:spec`; `npm run codex:debug` | Side-effect-free wrappers generate system-specific specification and debugging prompts for LeaguePilot, QuietPilot, Little Legend Studios, and Champion Coach OS. They print text for review and never execute Codex, call providers, or mutate repositories. |
| Next-Level Command Center | Product UX Foundation | Supporting model | Internal supporting read model | `lib/domain/domain.test.ts`; `npm run typecheck` | The pure domain read model and reusable component remain available for focused workflows, but the inventory-style command center is no longer rendered in the parent, coach, admin, public-home, or Parent Replay primary journeys. Those routes now lead with role-specific operational truth. |
| Parent Dashboard and Family Flight Plan | Phase 2 - Parent Engagement | Local closed-loop implementation; hosted proof pending for new coordination actions | `/parent`, `/parent/schedule`, `/parent/messages`, `/parent/photos`, `/parent/practice-recaps`, `/parent/family-access`, `/parent/settings`; `/api/parent/family-flight-plan/handoff` | `lib/domain/domain.test.ts`; `lib/services/family-flight-plan.test.ts`; `lib/season-certainty.test.ts`; `components/feature-panels.test.tsx`; migration `0024`; transactional PostgreSQL workflow smoke; `npm run qa:season-certainty-proof`; `npm test`; `npm run build` | Parent Home starts with a guardian-scoped Family Flight Plan combining every linked child’s upcoming time, field, RSVP, weather, gear, snack/volunteer obligation, and event overlap before the existing Game Day Calm details. A guardian can confirm or cancel a caregiver label/note for one linked player-event; this creates an audited coordination record, not an account, invite, access grant, or provider message. Children still do not log in. |
| One-Tap RSVP | Phase 2 - Parent Engagement | Done; versioned path requires migration `0023` | `/parent/rsvp`, `/coach/attendance`, `/coach/rsvps`, `/api/rsvps` | `lib/domain/domain.test.ts`; outbox/route tests; `npm test`; `npm run build` | Parent can RSVP only for a linked child. Writes carry a receipt, RSVP lock version, and event schedule version. A competing guardian edit or changed schedule stops the write with a reconciliation response instead of silently overwriting attendance confidence. |
| RSVP Reliability Tracker | Phase 2 - Coach Operations | Done | `/coach` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Coach dashboard derives family response rate, no-response count, late-change count, and reminder mode from assigned-team RSVP records without public parent leaderboards. |
| Adaptive Calendar, Alerts, and Game-Day Resolution Room | Phase 2 - Parent Engagement | Local closed-loop implementation; hosted proof pending for new resolution receipts | `/schedule`, `/parent/schedule`, `/coach/schedule`, `/admin/schedule-venues`; `/api/game-day-resolution` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `lib/supabase/game-day-resolution.test.ts`; `supabase/rls-policy.test.ts`; migration `0024`; transactional PostgreSQL workflow smoke; `npm run qa:season-certainty-proof`; `npm test`; `npm run build` | Parent Schedule remains read-only and guardian-scoped. Coach and admin schedule routes now open a Game-Day Resolution Room that combines the selected event, latest weather draft, RSVP response counts, affected roster, and prior decision receipts. A verified coach/admin must choose monitor, confirm on time, delay, or cancel and enter a reason. The atomic RPC records evidence, applies delay/cancel event changes, writes audit/change logs, and creates pending notification drafts for confirm/delay/cancel; it never executes provider delivery. |
| Notification Preference Center | Phase 2 - Parent Engagement | Done | `/parent`, `/api/notification-preferences`, `/api/notification-preferences/unsubscribe`, `/api/push-subscriptions`, `/api/provider-delivery/retry-plan` | `components/feature-panels.test.tsx`; `app/api-live-actions.test.ts`; `lib/supabase/provider-delivery.test.ts`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof`; `npm test`; `npm run build` | Parent dashboard shows push, email, SMS fallback, urgent-only SMS, quiet hours, and digest frequency as the production messaging contract. Preference, unsubscribe, push-subscription, provider-review, and retry-plan routes derive users from verified sessions. Hosted QA browser proof covers preference save and provider-delivery review rows. External sends remain disconnected. |
| Communication Room and Team Chat | Phase 2 - Parent Engagement | Local implementation, responsive proof, and isolated Supabase QA record proof complete; production-hosted proof pending | `/parent/messages`, `/coach/messages`, `/team-chat`, `/api/team-chat/*`, `/api/notifications/acknowledge` | `components/communication-room.test.tsx`; `components/feature-panels.test.tsx`; `lib/supabase/notification-receipts.test.ts`; `supabase/rls-policy.test.ts`; `npm run qa:communication-room-proof`; `npm run qa:communication-room-record-proof`; `npm run qa:rls-proof`; `npm test`; `npm run build` | The parent route separates Critical, Updates, and Conversation lanes; keeps multi-child/team context in one guardian session; withholds unapproved draft wording; shows Published, Delivered, Read, and Acknowledged independently; makes conversation fallback read-only; and explains that acknowledgment confirms receipt only. Isolated QA proof confirmed two children across two teams, excluded an archived team, persisted a parent reply, recorded recipient acknowledgment plus attributed audit, retained a suppressed delivery attempt, and executed zero provider sends without changing schedule, RSVP, attendance, or transportation truth. Coach and compatibility Team Chat retain their existing branded clubhouse workspace. Production promotion remains separate. |
| Plan → Practice → Parent Replay and Practice Safety | Signature Feature | Local closed-loop implementation; new hosted proof pending | `/coach/practice-recaps`, `/coach/parent-replay`, `/parent/practice-recaps`; `/api/coach/practice-runs`; `/api/coach/parent-replay`, `/approve`, `/publish`; `/team-portal` | `lib/supabase/practice-runs.test.ts`; `lib/services/practice-safety.test.ts`; `lib/supabase/coach-injury-contacts.test.ts`; component/domain/API/AI tests; migration `0024`; transactional PostgreSQL workflow smoke; signed-in coordination browser proof | A coach saves a timed plan, separately starts it, runs a timestamp-recovering water-break reminder, records required post-practice observations, and completes an auditable practice-run receipt. The same assigned-team workbench can intentionally reveal active guardian and emergency phone records for a selected injured player, with medical-decision authority shown as separate evidence. Call buttons open the coach device dialer; LeaguePilot does not place or confirm calls. A Parent Replay draft may cite one completed same-team receipt, and the link is single-use and source-manifested. Completion does not publish; publication creates notification drafts only and does not send. |
| AI Coach Workspace | Signature Feature | Done | `/coach/practice-recaps`, `/coach/parent-replay`, `/api/coach/ai-workspace` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `lib/services/ai-coach/ai-coach-provider.test.ts`; `app/api/coach/ai-workspace/route.test.ts`; `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof` | Deterministic review-only workspace creates New Parent Brief, Team Onboarding Brief for new coaches or added team participants, Weekly Digest, Practice Replay, Announcement Cleaner, Smart FAQ, Coach Inbox Prioritization, Parent Brief Before Game, Season Timeline, Coach Knowledge Base, Action Item Extraction, Safety Monitor, and End-of-Season Storybook drafts from existing announcements, schedule, pinned posts, visible team chat, roster names/jerseys, approved media, volunteer needs, and coach-selected focus areas. The practice recap route loads signed-in Supabase coach scope before provider requests, and missing coach access is gated. Signed-in assigned coaches/admins can request an OpenAI Responses API rewrite through the server route only when `AI_COACH_PROVIDER_ENABLED=true` and `OPENAI_API_KEY` are configured; requests use `store: false`, local privacy filters, source evidence, and the Preview -> Edit -> Approve -> Publish workflow. Evals cover cross-team data, private contacts, hidden media/messages, unsupported provider-send/publish claims, and unsourced private/external claims. Hosted QA proof captured `output/playwright/ai-coach-provider-rewrite-qa-session-live.png`. No automatic publish or provider send is connected. |
| Rookie Coach Assist | Coach Operations | Done | `/coach/practice-recaps`, `/coach/parent-replay` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run typecheck`; `npm run build` | Deterministic local generator helps new volunteer coaches plan age-safe motivation strategies and simple practice blocks for ages 3-6. Output includes Chaos Button 90-second sideline reset copy, Coach Voice Coach phrase replacement, Practice Personality Engine drill adaptation by team energy, Parent Replay seed focus areas, Parent Reinforcement Loop draft copy, source evidence, and safety boundary. No AI provider, automatic publish, external notification send, schema change, or workflow state is connected. |
| Coach Drill Video References | Coach Operations | Done | `/coach/practice-recaps`, `/admin/media-review`, `/api/coach/drill-videos`, `/api/coach/drill-video-assignments`, `/api/admin/drill-videos/review`, `/api/admin/drill-video-sources/review` | `lib/domain/drill-videos.test.ts`; `lib/services/youtube/drill-video-metadata.test.ts`; `app/api-drill-videos.test.ts`; `components/feature-panels.test.tsx`; `supabase/rls-policy.test.ts`; `npm test`; `npm run typecheck`; `npm run build` | Coaches can submit YouTube drill URLs for metadata validation and admin review. Supabase stores video/source/assignment references, source allowlist status, Made-for-Kids and embeddability metadata, audit events, and coach-only practice-plan assignments. Approved videos render through the privacy-enhanced YouTube embed URL inside coach planning. The app does not download, rehost, clip, proxy thumbnails, strip attribution, or make drill videos family-facing in v1. `YOUTUBE_DATA_API_KEY` is required before a submitted URL is saved. |
| Team Portal Feature Hub | Tier 1-3 Product Surface | Done | `/parent/family-access`, `/parent/photos`, `/coach/roster`, `/team-portal`, `/` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `npm test`; `npm run build` | Team-scoped portal displays weekly digest, Game Day Calm Mode essentials, field maps, coach video library, parent education, coach-to-parent translation, skill cards, team quests, weather alert boundary, skill trees, season storybook, memory timeline, volunteer center, and AI learning-plan boundary. Assigned coaches and org admins can update portal colors and mascot through Supabase-backed APIs. Role-specific wrappers minimize team portal data before render. |
| Branded Team Chat | Phase 2 - Parent Engagement | Done for coach and compatibility surfaces | `/coach/messages`, `/team-chat` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `lib/supabase/team-lifecycle.test.ts`; `npm test`; `npm run build` | Coach and compatibility Team Chat use each team's mascot and colors, a branded clubhouse header, quick-topic chips, pinned coach notes, Game-Day Questions, Supabase persistence, read receipts, Realtime subscription wiring, and moderation controls. Supabase team reads sort active team/season rows ahead of archived rows. The parent route now uses the authority-separated Communication Room while preserving the same server services. |
| Multi-Theme System and Theme Designer | Platform Foundation | Done | `/team-portal`, `/admin/branding`, `/admin/themes`, `/api/admin/theme-defaults`, `/api/admin/team-logos` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `app/api-live-actions.test.ts`; `npm test`; `npm run build` | Theme presets exist for soccer, football, baseball, scouts, golf, tennis, swim, and generic. Assigned coaches/admins can apply presets, mascot, and colors through Supabase-backed writes, and admins can save tenant defaults for future teams. `/admin/themes` remains a compatibility route for `/admin/branding`. The admin branding workbench includes a tenant environment studio that previews app menus, team portal, mobile header, message templates, sponsor document proof, and governance boundaries from one focused control surface. It still includes interactive element toggles for mascot mark, mobile header, and Game Day band previews, plus local mascot artwork preview. Durable binary storage, public rendering, email rendering, and push delivery remain provider-gated; admins can still queue reviewed HTTPS logo asset metadata. |
| Coach Dashboard | Phase 2 - Coach Operations | Done | `/coach`, `/coach/schedule`, `/coach/messages`, `/coach/attendance`, `/coach/practice-recaps`, `/coach/roster`, `/coach/weather-fields`, `/coach/drafts`, `/coach/snacks-volunteers`, `/coach/settings` | `lib/season-certainty.test.ts`; `components/feature-panels.test.tsx`; `npm run qa:season-certainty-proof`; `npm test`; `npm run build` | Coach Home starts with a pausable assigned-team announcement banner and Game-Day Radar for the next 15 minutes: next event, RSVP coverage, assigned coaches, location, snack/volunteer gaps, weather drafts, and review-only actions grouped as people, place, and plan. Dense readiness, weather policy, family response, and team-help workflows remain behind disclosure rows. Drafts remain review-only and do not claim provider delivery. Role wrappers use active coach memberships before loading sensitive team data. |
| Admin Dashboard | Phase 1 - Launch Readiness | Done | `/admin`, `/admin/family-access`, `/admin/branding`, `/admin/security-audit`, `/admin/reports-archive`, `/admin/media-review`, `/admin/safety-weather`, `/admin/communications`, `/admin/schedule-venues`, `/admin/message-delivery-review`, `/admin/sponsors`, `/admin/settings`, `/admin/teams` | `lib/season-certainty.test.ts`; `components/feature-panels.test.tsx`; `app/routes-smoke.test.ts`; `npm run qa:season-certainty-proof`; `npm test`; `npm run typecheck`; `npm run qa:tenant-readiness-proof`; `QA_PROOF_BASE_URL=http://127.0.0.1:3020 npm run qa:brand-proof`; `QA_PROOF_BASE_URL=http://127.0.0.1:3020 npm run qa:session-proof`; `npm run build` | Admin Overview keeps organization, season, and role context visible, then answers “What is blocking launch?” with prioritized signals, pending review queues, and compact team status. Lower planning and management tools sit behind an operations workspace disclosure. Focused media and sponsor routes remain guarded. `/admin/sponsors` now leads with an admin-only Community Proof ledger that keeps sponsor record, configured public placement, recap inventory, logo metadata, and billing workflow evidence separate, excludes player data, and explicitly avoids payment, contract, delivered-placement, or impact claims. Message delivery review remains a record-review surface rather than a live-send claim. |
| Registration System | Phase 1 - Access Readiness | Done | `/registration`, `/auth`, `/auth/callback`, `/admin`, `/admin/registrations`, `/admin/guardian-links` | `lib/domain/domain.test.ts`; `lib/supabase/team-lifecycle.test.ts`; `components/feature-panels.test.tsx`; `app/api-live-actions.test.ts`; `app/api-auth.test.ts`; `lib/supabase/registration-approvals.test.ts`; `lib/supabase/guardian-links.test.ts`; `npm test`; `npm run build` | Parent self-registration creates pending review requests. The auth screen supports email/password plus Google and Facebook Supabase OAuth when those providers are configured, exchanging callback codes into the same Supabase session and role landing flow. SSO proves identity only and does not grant team, child, coach, or admin access without membership rows. The client preview accepts server-backed team UUIDs, public registration options prefer active team/season rows, and the Supabase API rejects archived team/season registration attempts. Approval and guardian-link repair require verified organization-admin authority, an existing parent profile, bounded verification evidence, and audited access changes. |
| Money + Sponsors Community Commerce | Phase 2 - Community Operations | Proof-safe balance done; payment collection gated | `/parent`, `/team-portal`, `/admin/sponsors`, `/api/parent/family-balance`, compatibility `/family-wallet`, Stripe Connect routes | Domain/API tests; Stripe sandbox/webhook/RLS/hosted proof pending | Family Balance Summary uses obligation and payment-evidence timestamps and never invents charges, credits, or paid status from seed formulas. League revenue and sponsor placement remain separate from settlement. Gated Stripe Connect Standard creates direct connected-account Checkout Sessions without a LeaguePilot fee; only verified, replay-safe webhook evidence can confirm payment. |
| Community Safety Follow-On Surfaces | Phase 2 - Community Operations | Done | `/parent`, `/team-portal`, `/admin`, `/admin/media-review`, `/admin/safety-weather` | `lib/domain/domain.test.ts`; `components/feature-panels.test.tsx`; `npm run qa:session-proof`; `npm test`; `npm run typecheck`; `npm run build` | One-Tap Volunteer Marketplace packages snack duty, scorekeeper, field prep, fundraising, carpool, team parent, and backup volunteer jobs over the existing authenticated snack/volunteer claim APIs. Volunteer claim authorization derives organization scope through the signup's team instead of assuming an organization column on the signup, and the migrated local QA journey verifies the parent claim row. Equipment Exchange renders moderated parent-to-parent gear listings without public parent contact details. Weather + Safety Decision Assistant documents heat, lightning, air quality, field-closure, and cancellation review evidence without sending provider alerts. Sponsor-Safe Media Gallery frames approved team media with sponsor-safe recap copy while excluding child profiles, private metadata, hidden media, and parent contacts. Family Availability Intelligence summarizes RSVP gaps, open help, and schedule conflicts as aggregate team signals only; it does not rank or shame parents. |
| Snacks, Volunteers, Sponsors | Phase 2 - Community Operations | Done | `/team-portal`, `/coach`, `/admin`, `/admin/sponsors`, `/api/admin/sponsors` | `components/feature-panels.test.tsx`; `app/api-live-actions.test.ts`; `npm test`; `npm run build` | Snack and volunteer claims use authenticated Supabase APIs. Sponsor Management V2 supports admin-only CRUD, placement settings, logo asset rows, pending/active/expired status, audit events, focused `/admin/sponsors` route access, and admin-only Stripe Product/Price/invoice/payment-proof readiness records. The Community Proof ledger presents those existing records without child images or player data and does not infer payment, contract, delivered placement, or sponsor-attributed impact. Live Stripe collection remains gated behind server-side restricted keys and provider configuration. |
| Automatic Team Builder | Phase 1 - Launch Readiness | Done | `/admin` | `components/feature-panels.test.tsx`; `lib/domain/domain.test.ts`; `supabase/rls-policy.test.ts` | Roster maker now includes balanced team-builder previews with sibling/guardian grouping, friend-request consideration, skill-balance scores, target roster warnings, Preview -> Edit -> Approve -> Publish workflow, and admin-only migration tables for future persisted team-build plans. Publishing updates player assignments only through an admin-reviewed domain action with audit proof. |
| PWA, Mobile, Dark Mode | Platform Foundation | Done | all routes, `/offline`, `/api/mobile-usage-events`, `/api/registration-requests` | `app/routes-smoke.test.ts`; `app/public-intake-rate-limit.test.ts`; `QA_PROOF_BASE_URL=http://127.0.0.1:3020 npm run qa:session-proof`; `npm test`; `npm run build` | Manifest, install prompt UX, offline fallback, responsive layout, system dark mode, PWA/native decision usage metrics, and route-level public-intake burst controls are present. The service worker registers in production only, unregisters stale localhost workers during development, uses network-first navigation with `/offline` fallback instead of cache-first private route HTML, and the root layout inlines critical shell CSS while declaring device-width viewport metadata so the mobile tabbar replaces the desktop sidebar before proof-route actions. Parent and coach dashboards reduce mobile data sprawl with calm/command first screens plus disclosure-compressed detail sections. Shared hosted rate limiting remains a deployment concern. |

## Requested Feature Tiers

| Tier | Features | Current scaffold state |
| --- | --- | --- |
| Tier 1 | Team-specific portals, coach practice recap builder, weekly digest, Game Day Calm Mode, field maps | Parent Replay route implements the practice recap builder. Team-specific context, Calm Mode essentials, Game Day question grouping, and field map links are scaffolded through existing team, schedule, RSVP, snack, volunteer, weather draft, and Team Chat data. Parent Home exposes a deeper Game Day Calm Mode directly, while weekly digest remains represented as a planned parent-facing rollup, not a provider send. |
| Tier 2 | Coach video library, parent education center, coach-to-parent translation, skill cards, team quests, weather alerts | Coach Drill Video References now stores approved YouTube metadata/IDs for coach-only practice planning after admin source/video review. Parent Replay still generates parent education notes, parent-friendly translations, skill cards, and team quests. Weather alerts remain approval-gated and no automatic provider send occurs. |
| Tier 3 | Skill trees, season storybook, memory timeline, volunteer center, AI-generated learning plans | Replay focus areas roll up into skill-tree cues, memory moments, and a team timeline that also includes events, media, coach notes, and volunteer moments. AI-generated learning plans are not connected to an AI provider in this scaffold. |
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
