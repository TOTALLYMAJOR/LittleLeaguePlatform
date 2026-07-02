# Hosting Status - 2026-06-28

## Production Deployment

- Platform: Vercel
- Project: `mbmapps/youth-sports-platform-mvp-v3`
- Deployment id: `dpl_EwvgSQY6ws7u7GmSnSAFtu9V9Zfi`
- Deployment URL: `https://youth-sports-platform-mvp-v3-ltvfwabzi-mbmapps.vercel.app`
- Primary aliases:
  - `https://www.leaguepilot.us`
  - `https://leaguepilot.us`
  - `https://youth-sports-platform-mvp-v3.vercel.app`
- Vercel state: `Ready`

## 2026-07-01 Hosted Proof Update

- Vercel Production `NEXT_PUBLIC_SUPABASE_ANON_KEY` was corrected from a `service_role` JWT to an `anon` JWT. `SUPABASE_SERVICE_ROLE_KEY` remains server-only and has the `service_role` JWT role.
- The corrected environment was rebuilt by redeploying the previous production deployment instead of packaging the dirty local worktree.
- `https://www.leaguepilot.us` now aliases deployment `dpl_D8kTCkYhtrn6VA7VXrJAwM9kbYmf`.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:session-proof` passed after `npm run supabase:qa-users`, proving signed-out gates, signed-in parent and coach routes, parent RSVP/snack/volunteer/preference writes against Supabase rows, and signed-in admin `/admin/operations` plus `/admin/security`.
- Hosted route smoke captured `/`, `/auth`, `/registration`, `/coach/parent-replay`, `/team-chat`, `/admin`, and `/offline` screenshots under `output/playwright/`.
- `npm run qa:rls-proof` passed against the configured Supabase project.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:brand-proof` passed and captured `output/playwright/brand-launch-validation.png`.

## 2026-07-02 AI Provider Proof Update

- `https://www.leaguepilot.us` now aliases deployment `dpl_EwvgSQY6ws7u7GmSnSAFtu9V9Zfi`.
- `/coach/parent-replay` now loads signed-in Supabase coach scope before Parent Replay and AI Coach Workspace provider requests.
- `QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:ai-coach-proof` passed and captured `output/playwright/ai-coach-provider-rewrite-qa-session-live.png`.
- AI provider output remained draft/review-only; no publish or provider send occurred.

## Verified During Deployment

- `npm run build` passed locally before deployment.
- Vercel production build passed with Next.js 16.2.9.
- Vercel inspect confirmed the production deployment is ready and aliased.
- Vercel production env names exist for:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `AI_COACH_PROVIDER_ENABLED`
  - `OPENAI_AI_COACH_MODEL`
- Manual GitHub `Supabase QA proof` passed after deployment in run https://github.com/TOTALLYMAJOR/LittleLeaguePlatform/actions/runs/28328007719, covering `qa:rls-proof`, `qa:session-proof`, `qa:brand-proof`, and screenshot artifact upload against the QA Supabase project.
- Local OpenAI Responses API smoke passed with `store: false` and `gpt-5.5` after key rotation.

## Non-Blocking Warnings

- Resolved: the root `.env` file was removed from the project directory so Vercel env handling is used.
- Resolved: the Turbopack NFT trace warning through `next.config.ts`, `lib/supabase/security-proof.ts`, and `app/admin/security/page.tsx` no longer appears in the local production build.
- Still open: the Vercel production build still emits `Found lockfile missing swc dependencies`. Local `npm run typecheck` and `npm run build` passed on 2026-07-02, but Vercel still reports the warning, so this remains a non-blocking lockfile follow-up.

## Remaining Production-Readiness Blockers

Hosting and current hosted browser proof are complete for deployment `dpl_EwvgSQY6ws7u7GmSnSAFtu9V9Zfi`, but production readiness is not complete until these separate proof gates are closed:

- Vercel Preview OpenAI env values are intentionally unset until a named non-production preview branch is chosen.
- Provider sends remain disconnected for launch as draft/internal records only unless a send worker, provider adapters, webhooks, suppression rules, and retry proof are explicitly scoped.
- AI Coach Workspace provider rewrites are connected through `/api/coach/ai-workspace` for signed-in assigned coaches/admins only, and output remains draft/review-only with no automatic publish or send.

## Networking Posture

- Vercel Static IP is not required for the current launch path because the app should use Supabase HTTPS APIs with Supabase Auth and RLS.
- Do not enable Supabase Postgres/pooler network restrictions for the Vercel app unless a fixed-egress path is added first.
- Keep direct migration/proof access separate from browser/runtime access, with service-role keys restricted to server-side CI or admin tooling.
