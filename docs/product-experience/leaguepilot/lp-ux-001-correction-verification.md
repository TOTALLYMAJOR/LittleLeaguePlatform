# LP-UX-001 Correction Verification

Date: 2026-07-30

Status: `done-local-accepted`

Reviewed implementation commit: `049c4b1e3f85549f4316e075b84d05bd3a56694e`

Correction branch: `ux/lp-ux-001-family-shell`

Base for original LP-UX-001 slice: `472790cff6ace95bd9329080f073eb77086da22e`

## Correction Summary

LP-UX-001 now resolves shell, navigation, active role, and shared-route data scope from one route-authority contract. The invariant is:

`displayed shell role === server data-scope role`

Shared routes that cannot resolve a supported active role render neutral choice/approval copy before loading private shared rows. `sessionStorage` remains only as non-authoritative convenience state; it is not read to choose shell family. A server-readable active-role cookie is set only by an authenticated, membership-validated route.

`/parent/more` now uses `requireParentPageAccess()` before rendering Family content and builds its destinations from route topology metadata.

## Multi-Role Behavior

- Route-required parent/coach/admin pages take the required route role when membership supports it.
- Single-role users on `/team-chat` and `/team-portal` infer that one role.
- Valid server-persisted or explicit role context is honored only if current memberships still include that role.
- Ambiguous multi-role shared routes without a valid active role stop before shared private data loads.
- `/access/status` and `/invite/accept` remain neutral transition routes.

## Verification Results

| Gate | Command | Exit |
| --- | --- | --- |
| Focused route-context, shell, guard, active-role, neutral-page tests | `TMPDIR=/tmp TEMP=/tmp TMP=/tmp npx vitest run components/access-activation.test.tsx components/invite-acceptance.test.tsx app/api/auth/active-role/route.test.ts lib/navigation/route-topology.test.ts components/ui/AppShell.test.tsx app/route-guards.test.ts` | 0 |
| TypeScript | `npm run typecheck` | 0 |
| ESLint | `npm run lint` | 0, with 17 pre-existing warnings |
| Full Vitest | `npm test` | 0, 114 files / 672 tests |
| Production build | `npm run build` | 0 |
| Diff whitespace | `git diff --check` | 0 |
| Proof script syntax | `node --check scripts/capture-family-shell-proof.mjs` | 0 |
| Browser proof matrix | `QA_PROOF_BASE_URL=http://127.0.0.1:3100 npm run qa:family-shell-proof` | 0 |

## Browser Proof Manifest

Manifest: `output/playwright/family-shell/proof.json`

Generated at: `2026-07-30T05:33:47.138Z`

Result count: 80 route-viewport results at 320, 390, 768, 1024, and 1440 pixels.

Covered contexts:

- Parent: `/parent`, `/parent/schedule`, `/parent/messages`, `/parent/family-access`, `/parent/more`, `/account`, `/team-chat`, `/team-portal`
- Coach: `/team-chat`, `/team-portal`, `/coach`
- Admin: `/team-chat`, `/team-portal`
- Neutral: `/access/status`, `/invite/accept`
- Signed-out: `/parent/more`

Proof checks:

- Initial JavaScript-disabled render and hydrated render keep the same shell, resolved role, and data-scope marker.
- Family shell remains light under dark device preference.
- Shared routes expose parent, coach, or admin shell/data-scope markers coherently.
- Signed-out `/parent/more` uses the public shell.
- Account Sign out is visible and keyboard focusable at all five widths.
- Console page errors: 0.
- Failed requests: 0.
- Family axe critical/serious violations: 0.
- First-render/hydration shell mismatches: 0.

## Deviations And Residual Risks

No hosted, deployed, production, provider, migration, or RLS readback proof was performed. The browser proof uses configured local demo sessions and does not mutate rows or send providers.

No ready-made true multi-role demo browser credential was present in the local environment. Multi-role behavior is covered by route-authority unit tests; browser proof covers parent, coach, and admin shared-route contexts separately.

## Independent Acceptance

Verdict: `ready-with-documented-debt`.

No unresolved P0 or P1 authorization or data-scope defect was found in the independent correction review. The route authority resolver, server-validated role cookie, shared-route scoping, `/parent/more` guard, and first-render markers were found coherent in source and proof.

Accepted non-blocking debt:

- P2: true multi-role browser coverage is still unavailable; behavior remains covered by unit fixtures and separate parent, coach, and admin browser sessions.
- P3: browser markers prove shell metadata but do not independently inspect every returned payload against server query scope.
- P3: screenshot paths referenced by proof metadata are local artifacts; hosted, RLS, provider, migration, and production proof remain absent.
- P3: prior documentation drift in `10-reference-implementation-brief.md` was not a runtime defect.

LP-UX-002 may proceed as a separate local slice from the corrected LP-UX-001 baseline. This acceptance is local only and does not imply push, merge, deployment, hosted proof, provider operation, migration proof, or production acceptance.
