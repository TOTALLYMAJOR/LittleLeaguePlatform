# Family Experience Readiness Review

Date: 2026-07-24

Scope: the approved six-stage family cycle, all nineteen required journeys, the Communication Room, administrator readiness, and the public-surface corrections defined in `docs/family-experience-blueprint.md`.

## Verdict

The safe local implementation queue is complete through Phase 5. Every required journey has an implementation seam, an authority boundary, family-facing states, tests, and a documented proof path. Every phase also has responsive browser evidence for at least one primary surface at the viewports relevant to that surface.

This is not a production-readiness claim. The connected LeaguePilot Supabase project was verified read-only on 2026-07-24 and still contains migrations only through `0021`, with one `main` branch. Migrations `0022` through `0033` and `20260724143554_security_definer_execution_hardening.sql` are not installed there. Provider delivery, populated lifecycle proof, hosted proof for the latest slices, assistive-technology testing, moderated family comprehension, and durable privacy-safe product analytics remain separate gates.

Evidence labels:

- **Proven by artifacts**: repository code, automated tests, stored local browser evidence, or current read-only provider evidence exists.
- **Strong inference**: the implementation boundary is coherent, but the target environment or populated lifecycle has not been exercised.
- **Missing evidence**: the claim needs a provider, hosted environment, assistive technology, moderated study, or approved migration run that has not occurred.

## Six-stage closure

| Stage | Local implementation | Current evidence | Production closure gate |
| --- | --- | --- | --- |
| 1. Discover and request | Complete | Public CTA, agenda, calendar actions, blank forms, request receipt/status, 320/390/768/1440 proof | Configure public tenant/review-window values and repeat hosted proof |
| 2. Verify and activate | Complete behind staged migrations | Admin-reviewed verification, atomic one-time issuance, acceptance, wrong-account/expired/revoked handling, first-sign-in route | Promote `0025`-`0027` and `0033`; prove issuance/acceptance, identity match, cross-family RLS, and independent provider delivery |
| 3. Configure and orient | Complete behind staged migration | Language, translation, quiet hours, critical/routine preferences, Mission Control | Promote `0025`; prove verified channels, populated family data, offline/reconnect, and hosted behavior |
| 4. Coordinate the week | Complete behind staged migrations | Multi-child model, Event Passport, versioned RSVP/attendance, mutual rides, temporary care, responsive proof | Promote `0023`, `0024`, `0028`, and `0029`; prove populated concurrency, isolation, revocation, and offline behavior |
| 5. Handle change and learn | Complete behind staged migrations | Authority-separated Communication Room, immutable official revisions, disruption projections, current-version acknowledgment, private Parent Replay | Promote `0030` and `0031`; prove populated four-surface propagation, provider receipts, media consent/revocation, and hosted behavior |
| 6. Transition and renew | Complete behind staged migration | Reviewed additional guardian flow, season transition, source archival, safe correction, explainable aggregate readiness | Promote `0027` and `0032`; prove multi-guardian concurrency, historical access, downstream refusal, and hosted behavior |

## Required-journey audit

| Journey | Artifact-backed state | What remains unproven |
| --- | --- | --- |
| Public discovery | **Proven by artifacts**: access-first home and responsive public agenda | Hosted configuration, deployment, screen reader, forced colors, and moderated five-second comprehension |
| Requesting team access | **Proven by artifacts**: blank request, receipt, review timing, privacy and next-step copy | Hosted organization/review-window configuration and provider-assisted follow-up |
| Guardian-child-team verification | **Proven by artifacts**: active-admin review and bounded evidence policy | Stronger real-world identity evidence and hosted cross-family proof |
| Invitation and first sign-in | **Proven by artifacts** locally through atomic reviewed issuance, one-time fragment secret, hashed storage, and exact-email acceptance | `0025`/`0026`/`0033` promotion, provider delivery, and full hosted lifecycle |
| Notification and language setup | **Proven by artifacts** behind `0025` | Migration/RLS, actual channel verification, translation QA, and provider fallback |
| Family Mission Control | **Proven by artifacts** with responsive signed-in empty-state proof | Populated household, performance, offline/reconnect, and hosted proof |
| Multi-child family schedule | **Proven by artifacts** in the guardian-scoped read model and filters | Populated sibling conflict and organization-isolation browser proof |
| Event Passport | **Proven by artifacts**: official source/version/freshness plus explicit unresolved facts | Populated five-second study, offline pack freshness, and hosted proof |
| RSVP and attendance | **Proven by artifacts**: idempotency, record/schedule versions, and reconciliation | `0023` promotion, two-guardian concurrency, offline replay, and audit readback |
| Transportation assignment | **Proven by artifacts**: request, offer, two-party acceptance, schedule drift, withdrawal | `0028` promotion and populated same-team/cross-team/restriction proof |
| Temporary-caregiver authorization | **Proven by artifacts**: one child/team, selected events, exact email, future start, expiry, revocation, fixed prohibitions | `0029` promotion and populated acceptance/cache-clear/restriction proof |
| Priority communication | **Proven by artifacts**: Critical, Updates, and Conversation remain authority-separated | `0030` promotion, provider sandbox/webhooks, offline behavior, and hosted proof |
| Weather or schedule disruption | **Proven by artifacts**: human-reviewed resolution plus exact official revision projections | `0024`/`0030` promotion and one populated revision across every projection |
| Critical-message acknowledgment | **Proven by artifacts**: delivery/read/acknowledgment are distinct and superseded versions fail closed | Current-version populated concurrency, provider delivery evidence, escalation timing, and hosted proof |
| Parent Replay | **Proven by artifacts**: published-only family story, activity, timeline, private engagement, consent-aware optional media | `0031` promotion, media attach/revoke lifecycle, retention, accessibility, and moderated emotional-value study |
| Additional guardian invitation | **Proven by artifacts**: current guardian proposes; admin reviews; scope and revocation are explicit | `0027` promotion, secure provider delivery, and populated multi-guardian lifecycle |
| Season transition or team change | **Proven by artifacts**: all-current-guardian review, separate admin application, source archival, fixed reset scope, explicit close, safe correction | `0032` promotion, multi-guardian concurrency, expiration, historical access, and downstream-refusal proof |
| Administrator readiness review | **Proven by artifacts**: aggregate rules expose status, source, authority, privacy boundary, and deterministic explanation | Populated transition failures, owner/escalation analytics, hosted proof, and admin study |
| Public-Surface Corrections | **Proven by artifacts** across all Phase 0 corrections | Hosted proof and moderated/assistive-technology evidence |

## Live provider posture

Read-only Supabase evidence collected on 2026-07-24:

- Project `dkwghvvlbdnnwzbnscvu` has one branch: `main`.
- Migration history ends at `0021_notification_delivery_execution`.
- The security advisor still reports externally facing `SECURITY DEFINER` execution warnings for legacy mutation/maintenance functions. The staged hardening migration revokes the high-impact mutation and maintenance entry points while preserving policy helper behavior for review.
- The advisor also reports mutable search paths for `touch_updated_at` and `digest`, public-schema `btree_gist`, and disabled leaked-password protection.
- Relevant remediation: [function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [public SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

No provider or database mutation was performed during this review.

## Remaining queue in dependency order

1. **Authorize a non-production migration target.** Use a dedicated Supabase development/QA branch or project; do not test the unproven chain on production first.
2. **Promote the ordered schema chain.** Apply `0022` through `0033`, followed by the security-definer hardening migration, with migration installation and advisor readback after each risk band.
3. **Run real-session RLS and lifecycle proof.** Cover cross-organization, cross-team, cross-family, wrong-role, multi-guardian concurrency, expiry, revocation, correction, and downstream-refusal cases.
4. **Run populated family browser proof.** Exercise the six-stage cycle with at least two children, two guardians, two teams, a schedule change, a ride, temporary care, a critical revision, and a published Replay.
5. **Prove provider channels independently.** Invitation delivery and critical-message escalation require approved sandbox sends, delivery/webhook evidence, retry/suppression behavior, and zero silent authority changes.
6. **Deploy the exact validated commit and repeat hosted proof.** Configure public tenant values, run all route matrices, and preserve hosted evidence separately from local evidence.
7. **Complete human/accessibility evidence.** Keyboard, screen reader, forced colors, 200% zoom, 400% reflow, translated overflow, outdoor/one-hand use, and moderated five-second comprehension remain required.
8. **Connect the analytics plan deliberately.** Existing `data-analytics-event` hooks and PWA usage records are implementation seams, not a durable family-product analytics claim. Before persistence, approve the allowlist, pseudonymous dimensions, retention, deletion, and exclusion of child names, message bodies, health/custody text, addresses, secrets, and free-form notes.

## Local validation baseline

- `npm test`: 411 tests passed across 76 files.
- `npm run typecheck`: passed.
- `npm run build`: passed with 89 routes generated.
- `npm audit --audit-level=high`: zero vulnerabilities.
- `npm run lint`: zero errors and zero warnings.
- Phase-specific responsive proof is stored under `output/playwright/`, including public family, registration invitation review, Mission Control, transportation, temporary care, official communications, Parent Replay, and season transition.

## Next authorized action

Approve and identify a non-production Supabase target for the ordered `0022`-`0033` migration and populated real-session proof run. Production promotion, external provider sends, and hosted release remain distinct approvals after that evidence passes.
