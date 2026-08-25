---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-009 Non-Domain Lint Hardening

Date: 2026-08-03

Status: `done-local-verified`

Branch: `ux/lp-ux-001-family-shell`

Continuation: resolves the non-protected lint debt recorded by LP-UX-008 without changing domain rules, route authority, persistence, provider delivery, or hosted configuration. This maintenance slice changes four implementation/test files and does not meet an ADR condition: it introduces no dependency, contract, storage, lifecycle, or architectural change. `10-reference-implementation-brief.md` remains untouched.

## Production Boundary

- **Rendering:** browser-local mascot data URLs now use explicit 72-by-72 unoptimized Next images. No remote image loader, storage provider, upload contract, or public asset URL changed.
- **Offline replay:** parent and coach replay scopes are created inside their effects from the same session-derived actor and organization/season/team primitives. Replay authorization, opt-in gates, idempotency keys, and fail-closed session behavior are unchanged.
- **Accessibility:** the demonstration sortable control no longer places `aria-sort` on a button, where that attribute is invalid. It exposes the current state through an accessible label and a `data-sort` rendering hook.
- **Scope safety:** only non-domain React/UI and verification-script warnings were remediated. The two warnings under protected `lib/domain/**` remain outside this slice.
- **User behavior:** dead derived values had no consumers and were removed. No visible action, count, route, or persisted state was removed.

## Applied Changes

1. Removed seven unused parent, coach, and admin derived values from the shared feature-panel module.
2. Removed freshly allocated offline-scope objects from effect closure dependencies and constructed the same scope at the replay call site.
3. Added the missing coach identity dependency to the field-pack cache effect.
4. Replaced two raw browser-local mascot preview images with explicitly sized, unoptimized `next/image` components.
5. Replaced invalid button `aria-sort` usage with an accessible sort-state label and covered the rendered contract in the primitive test.
6. Removed an unused provider-readiness helper with no callers.

## Verification

- Full Vitest: 117 files, 698 tests passed.
- Focused React/UI Vitest: `components/feature-panels.test.tsx` and `components/ui/primitives.test.tsx` — 2 files, 36 tests passed.
- Provider-readiness Node test file — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed with 0 errors and 2 protected-domain warnings, reduced from 16 warnings.
- `npm run build` — passed; 104 static pages generated and standalone assets assembled by `postbuild`.
- `git diff --check` — passed.
- Browser proof — not rerun because the visible layout, copy, routes, and persisted behavior are unchanged; the only image change preserves a browser-local preview with explicit dimensions, while the full Next production build exercises its compilation path.

## Explicitly Deferred

1. `lib/domain/money-sponsors.ts` retains one unused helper warning. It requires an explicit domain-scope decision to remove, restore a consumer, or expose it as a supported rule.
2. `lib/domain/venues.ts` retains one unused query warning. It requires an explicit domain-scope decision because removing it could conceal intended venue filtering behavior.
3. Hosted browser acceptance, deployment, provider sends, and production acceptance remain separate external gates.
4. The LP-UX-008 cross-instance RSVP reminder uniqueness constraint remains deferred pending explicit schema approval.
5. `10-reference-implementation-brief.md` was not touched.
