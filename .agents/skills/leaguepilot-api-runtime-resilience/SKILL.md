---
name: leaguepilot-api-runtime-resilience
description: Review or implement LeaguePilot / Little League HQ API, route-handler, Supabase access, auth/session, RLS, provider-boundary, modularity, runtime resilience, degraded-state, or fault-tolerance changes. Use when the user asks whether a route is safe, whether Supabase/Auth boundaries are correct, whether provider/runtime failures are handled, or whether a production slice is resilient.
---

# LeaguePilot API Runtime Resilience

Use this skill to keep API, data, and resilience work tied to this repo's Next.js + Supabase seams. Do not turn this into a generic API-design review.

## Workflow

1. Classify the request.
   - Use the normal Builder path for ordinary route/API/resilience fixes.
   - Use read-only review mode when the user asks for review, audit, report-only, or no patch.
   - Use a stronger launch/safety pass for auth, RLS, child privacy, migrations, provider delivery, hosted readiness, secrets, payment proof, or production runtime posture.
2. Read the narrow authority stack before making claims.
   - Repo rules and product truth: `AGENTS.md`, `docs/codex-rules.md`, `docs/Features.md`, `docs/capability-matrix.md`, and `docs/agentic-architecture.md`.
   - API/session boundaries: the touched `app/api/**/route.ts`, `lib/supabase/route-auth.ts`, `lib/supabase/access-control.ts`, `lib/supabase/server.ts`, the relevant `lib/supabase/*` adapter, and focused API tests.
   - Supabase schema and RLS: `docs/supabase-data-model.md`, `supabase/migrations/*`, `supabase/rls-policy.test.ts`, and `scripts/verify-rls-boundaries.mjs`.
   - Runtime/provider resilience: `lib/supabase/timeout.ts`, `lib/supabase/provider-delivery.ts`, `lib/services/*`, `docs/runbook.md`, `docs/hosting-status-2026-06-28.md`, and `docs/production-audit-action-items.md`.
   - UI resilience: the touched page/component, `components/feature-panels.tsx` or `components/features/*`, `docs/ui-wireframe-screen-specs.md`, and `docs/brand-governance.md`.
3. Preserve the layer contract.
   - Route handlers parse transport, derive actor identity from the verified Supabase session, validate request shape, map responses, and delegate.
   - Supabase adapters enforce role/team/guardian access, perform persistence, and write audit or provider-safe records when required.
   - Domain modules in `lib/domain/` own deterministic rules and must not import Next.js runtime APIs, Supabase clients, or provider SDKs.
   - UI routes/components do not call Supabase directly and do not invent access grants.
   - Provider calls go through `lib/services/` or provider-boundary services, with consent, approval, and delivery-log gates before any live send.
4. Separate implementation proof from hosted proof.
   - "Supabase-backed" means code paths and QA rows support the claim for the configured project.
   - "RLS covered" requires route tests or `npm run qa:rls-proof`, not only UI button hiding.
   - "Provider-ready" means draft/approval/log records exist; it is not the same as live email, SMS, push, Stripe, AI, or native distribution.
   - "Production ready" requires hosted/provider evidence, secrets separation, and environment-specific proof.
5. Patch the smallest seam when implementation is requested.
   - Prefer existing `lib/supabase/*`, `lib/services/*`, and `lib/domain/*` patterns over new abstractions.
   - Add session and role checks before persistence.
   - Add degraded states for unavailable Supabase/provider data without upgrading seed fallback into production truth.
   - Add idempotent audit/provider records for admin or provider-sensitive actions.

## Validation

Run the smallest meaningful gates first:

- API/session work: focused route tests, `npm test`, and `npm run typecheck`.
- Supabase/RLS work: `npm run qa:rls-proof` when QA credentials are available.
- Browser/session proof: `npm run qa:session-proof` or Playwright route evidence when the route experience matters.
- Brand/admin surface proof: `npm run qa:brand-proof` when theme/brand launch surfaces change.
- Production build proof: `npm run build` before claiming the app still builds.
- Always include `git diff --check` for edited files.

Report results as `covered`, `partial`, or `not covered`. Name remaining risk explicitly, especially when hosted proof, provider callbacks, RLS proof, child privacy proof, or browser evidence was not run.
