# Hosting Status - 2026-06-28

## Production Deployment

- Platform: Vercel
- Project: `mbmapps/youth-sports-platform-mvp-v3`
- Deployment id: `dpl_2ms2Fz5BTdsMjPwnsSod8uXbiHA3`
- Deployment URL: `https://youth-sports-platform-mvp-v3-61x9xetq3-mbmapps.vercel.app`
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

## Non-Blocking Warnings

- Vercel warned that the repository has a `.env` file and recommends Vercel env handling.
- Vercel warned that the lockfile is missing SWC optional dependencies and suggested running Next locally to patch them.
- Turbopack emitted an NFT trace warning through `next.config.ts`, `lib/supabase/security-proof.ts`, and `app/admin/security/page.tsx`.

## Remaining Production-Readiness Blockers

Hosting is complete, but production readiness is not complete until these separate proof gates are closed:

- Hosted browser smoke evidence is still needed for signed-out, parent, coach, and admin routes.
- QA proof secrets are not visible in Vercel env listing; run the Supabase QA proof workflow before real-family use.
- Provider sends remain disconnected unless a send worker, provider adapters, webhooks, suppression rules, and retry proof are added.
- AI Coach Workspace remains deterministic and review-only; no AI provider is connected.
- Hosted browser smoke still needs browser artifacts; the deploy skill used for this task confirms Vercel readiness but does not fetch the deployed URL.
