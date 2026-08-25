---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# PWA Cache And Branding Invalidation

LeaguePilot uses explicit PWA revision strings so service-worker shell routes, manifest metadata, and brand assets do not depend on browser cache luck.

## Current Contract

- `PWA_CACHE_VERSION`: `2026.07.29.1`
- `PWA_MANIFEST_REVISION`: `2026.07.29.1`
- `PWA_BRAND_ASSET_REVISION`: `brand-2026.07.29.1`
- Service-worker shell cache: `little-league-hq-shell-2026.07.29.1`
- Service-worker runtime cache: `little-league-hq-runtime-2026.07.29.1`

The source contract lives in `lib/domain/pwa-cache.ts`. The static worker and manifest must carry the same values because browsers load them from `public/`.

## Release Rules

1. Bump `PWA_CACHE_VERSION` for any deployed app-shell, offline route, navigation cache, or service-worker behavior change.
2. Bump `PWA_MANIFEST_REVISION` with `PWA_CACHE_VERSION` whenever manifest metadata, install behavior, app name, theme color, or icon references change.
3. Bump `PWA_BRAND_ASSET_REVISION` whenever app icons, team-brand fallback assets, launcher graphics, notification icon defaults, or public brand assets change.
4. Keep `app/layout.tsx`, `app/providers.tsx`, `public/sw.js`, and `public/manifest.webmanifest` aligned with the contract.

## Runtime Behavior

- `app/providers.tsx` registers `/sw.js?v=2026.07.29.1` with `updateViaCache: "none"` and calls `registration.update()` after registration.
- `public/sw.js` precaches only the actor-neutral static offline shell and revisioned branding assets under cache names that include `PWA_CACHE_VERSION`.
- Service-worker activation deletes any cache whose name is not in the current cache set.
- Navigation requests are network-only and fall back to actor-neutral `/offline.html`; authenticated and role-scoped route HTML is never cached.
- Same-origin Next.js static assets use the versioned runtime cache.
- Manifest, favicon, and `/favicons/*` requests are treated as brand assets and use stale-while-revalidate with revisioned URLs.

## Stale-Brand Avoidance

This is the stale-brand avoidance release gate.

The installed app, browser tab metadata, push notification icon, and manifest icon list all include `PWA_BRAND_ASSET_REVISION`. A deployed brand/icon update is production-ready only when the revision string is bumped and the proof command passes:

```bash
npm run qa:pwa-cache-proof
```

The proof checks the shared contract, service worker, manifest, app metadata, service-worker registration, and this doc for the current revision strings. Route smoke tests also assert the worker keeps versioned cache names, deletes old caches, refreshes navigation, and revision-tags brand assets.
