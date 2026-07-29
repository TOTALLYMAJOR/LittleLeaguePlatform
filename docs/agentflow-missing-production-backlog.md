# LeaguePilot Missing Production Slice Execution Queue

This reviewed AgentFlow queue executes the LeaguePilot missing-production work
one commit at a time from the current
`agentflow/missing-production-sequence-20260729` lineage.
The full slice inventory and external proof boundaries are governed by
`docs/missing-production-slices-work-plan.md` and
`docs/exceptional-ux-acceptance-audit.md`.

This queue does not deploy, apply migrations to a hosted project, mutate
production data, enable provider sends, enable payments, enable private media
uploads, change DNS, configure secrets, or claim hosted/provider/production
acceptance. Those gates remain explicit in the governing plan.

Completed baseline:

- LPM-001 integrated in AgentFlow build
  `build_5e3e818d-6dc6-4069-8fc9-6498a727b3eb` at integration commit
  `e7bdd57e24b26a01430e93be448b457a3cac19fc`.
- LPM-002A integrated in AgentFlow build
  `build_555180a0-4db6-4c85-8247-2c86185dd785` at integration commit
  `962abe3ff5361ffcf72e855a8b82ff50b2653be5`.
- LPM-003 integrated in AgentFlow build
  `build_c919675f-58c5-4802-8635-de00101dfe4d` at integration commit
  `cca95821e400190b2a3f7134ca2a792558f9a7a3`.
- LPM-004A integrated in AgentFlow build
  `build_4c2a4279-897c-4045-8c1a-9edf0600524e` at integration commit
  `42d16c6a096cc4d5d218268b58e2d6c8a2ba6049`.
- LPM-005A integrated in AgentFlow build
  `build_5827781b-fefd-4baf-87a2-bdf6f5eeeeef` at integration commit
  `4b80b959462fb71a9432a53a83e9ecc38b2583bd`.
- LPM-006A integrated in AgentFlow build
  `build_2df551bf-6d0a-46c0-9738-0809a1dd3a78` at integration commit
  `2c18dd75c65669f516a7224e4b4f86343ba8165f`.
- LPM-007A integrated in AgentFlow build
  `build_b1ea8cf7-a6ed-45e8-88b8-7cf50f38ffb8` at integration commit
  `bd94292720fc8d7ece02f7b2d9989e5d34273b44`.
- LPM-008A integrated in AgentFlow build
  `build_57282bd1-9c97-4a59-8ce5-0f97510dd9fc` at integration commit
  `3089c54c77513f1820eec69bc69ab9d34d5f8c8c`.
- LPM-009A integrated in AgentFlow build
  `build_3888a189-a617-4fbe-b64e-5fc002f30ef2` at integration commit
  `e02940dee117481e46925b9a10180998a159ce5a`.
- LPM-010A integrated in AgentFlow build
  `build_ceede9bf-42ca-4d62-a696-2fba63f5d62b` at integration commit
  `1afe3b4d8feed75e966bc2498fddf3570d4fdd7e`.
- LPM-011A integrated in AgentFlow build
  `build_d1e387bd-3e3a-48f9-9436-56fab08879db` at integration commit
  `36496d82a7fd176354cdf9974d43f005cee9dc09`.

## LPM-012A - Add native app decision readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-native-app-decision-readiness.mjs
  - scripts/verify-native-app-decision-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-native-app-decision-readiness.test.mjs
  - npm test -- app/routes-smoke.test.ts app/api-auth.test.ts app/api-live-actions.test.ts app/public-intake-rate-limit.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: native-app-decision-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-native-app-decision-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-012 native app decision
readiness contracts that already exist in the PWA install provider, mobile
usage route, service worker/offline route, manifest, app shell, route-smoke and
API tests, concept scorecard, tech-stack docs, user manual, and work-plan docs.
The verifier must prove, from repository source, that LeaguePilot remains
PWA-first, install promotion is value-gated, standalone launches and install
prompt outcomes are measured, mobile usage accepts a native-interest signal
without granting product approval, offline behavior is explicit and bounded,
and any future Expo/native path must reuse existing domain contracts, Supabase
session/RLS boundaries, provider gates, and child privacy rules.

The tool must not call Supabase, sign in, run Playwright, seed data, mutate
hosted records, collect real analytics, request push permissions, register app
stores, scaffold Expo, send providers, upload media, deploy, configure secrets,
or claim PWA/mobile browser, production usage, push-provider, app-store, native,
or production acceptance. Its job is to make the local native-decision contract
executable and to name exact blockers before an operator runs approved mobile
browser proof, usage review, push permission proof, offline/reconnect proof,
native product approval, or Expo architecture work.

### Acceptance Criteria

- A new `qa:native-app-decision-readiness` script reads only repository files
  and fails with named blockers when an LPM-012 local readiness contract is
  missing or weakened.
- The verifier checks PWA-first product posture: `docs/tech-stack.md` says the
  first shippable mobile experience is the responsive PWA and Expo/native work
  is justified only by real app-store, camera/media, stronger push, OS
  integration, or offline requirements that PWA cannot meet.
- The verifier checks install and standalone measurement: `app/providers.tsx`
  listens for `beforeinstallprompt` and `appinstalled`, gates install prompt
  eligibility on the value-event key, records `install_prompt_shown`,
  `install_prompt_accepted`, `install_prompt_dismissed`, and
  `standalone_launch`, and posts to `/api/mobile-usage-events`.
- The verifier checks mobile usage boundaries: `/api/mobile-usage-events`
  allows the native-interest event type, remains anonymous-safe, is covered by
  auth and live-action tests, and is protected by public-intake rate limiting.
- The verifier checks offline/PWA shell readiness: `public/manifest.webmanifest`
  and `public/sw.js` are wired to `/offline`, the App Shell exposes offline
  status and mobile navigation, and route-smoke tests prove the manifest,
  service worker, install/standalone metrics, and PWA shell wiring.
- The verifier checks native architecture guardrails: documentation requires
  any approved Expo app to reuse domain models, Supabase session/RLS
  boundaries, provider gates, and child privacy rules, and keeps Expo deferred
  until evidence justifies the extra platform.
- The verifier explicitly names mobile browser proof, production usage metrics
  review, push permission proof, offline/reconnect proof, native product
  approval, Expo architecture review, app-store compliance review, accessibility
  proof, and production native acceptance as open gates.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials, network access,
  Supabase, browser automation, provider dashboard access, app-store access,
  push-provider access, analytics dashboards, Expo scaffolding, native builds,
  media uploads, storage, or external device requests.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; mobile browser proof, production usage metrics review,
  push permission proof, offline/reconnect proof, native product approval, Expo
  architecture review, app-store compliance review, accessibility proof, and
  production native acceptance remain open gates.
