# Hosting Status - 2026-06-28

## Production Deployment

- Platform: Vercel
- Project: `mbmapps/youth-sports-platform-mvp-v3`
- Deployment id: `dpl_BRYzXxggGfNqacAq3899DXyHvj1W`
- Deployment URL: `https://youth-sports-platform-mvp-v3-b8oo30r8w-mbmapps.vercel.app`
- Primary aliases:
  - `https://www.leaguepilot.us`
  - `https://leaguepilot.us`
  - `https://youth-sports-platform-mvp-v3.vercel.app`
- Vercel state: `Ready`

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
- Still open: Vercel remote build still emits `Found lockfile missing swc dependencies`. Next's local lockfile patch and `npm install` cycle did not produce a stable committed lockfile shape, so this remains a non-blocking warning to revisit separately.

## Remaining Production-Readiness Blockers

Hosting is complete, but production readiness is not complete until these separate proof gates are closed:

- Hosted browser smoke evidence is still needed for signed-out, parent, coach, and admin routes.
- Vercel production Supabase values still need hosted browser smoke to prove they target the intended production project and preserve auth/RLS boundaries.
- Vercel Preview OpenAI env values are not configured yet; Vercel CLI rejected all-branch Preview via stdin and rejected the production branch `main` as a Preview branch.
- Provider sends remain disconnected unless a send worker, provider adapters, webhooks, suppression rules, and retry proof are added.
- AI Coach Workspace provider rewrites are connected through `/api/coach/ai-workspace` for signed-in assigned coaches/admins only, but output remains draft/review-only and cannot publish or send automatically.
- Hosted browser smoke still needs browser artifacts from the deployed URL.

## Networking Posture

- Vercel Static IP is not required for the current launch path because the app should use Supabase HTTPS APIs with Supabase Auth and RLS.
- Do not enable Supabase Postgres/pooler network restrictions for the Vercel app unless a fixed-egress path is added first.
- Keep direct migration/proof access separate from browser/runtime access, with service-role keys restricted to server-side CI or admin tooling.
