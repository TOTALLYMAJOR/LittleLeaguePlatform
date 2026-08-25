---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-25
---
# LP-UX-020 Spectrum App Theme

Date: 2026-08-19 (US/Central)
Status: Local source and browser validation complete

## Outcome

LeaguePilot now carries one recognizable visual system across staff, Family,
public, shared, and neutral surfaces: light-blue structure, white work surfaces,
deep-navy information hierarchy, orange primary actions, yellow review states,
and green verified-success states. The system translates the supplied Team
Builder direction without replacing LeaguePilot's real page composition.

This is a redesign-preserve slice. Canonical routes, server-resolved roles,
tenant and child scope, provider gates, mutations, lifecycle states, and privacy
fallbacks remain authoritative and unchanged.

## Generated references

- Desktop:
  `/home/administrator/.codex/generated_images/01a01aee-7569-7af1-9823-842d19146f1b/exec-28c5d6a1-0a03-4ba8-b05c-8375706b0305.png`
- Mobile:
  `/home/administrator/.codex/generated_images/01a01aee-7569-7af1-9823-842d19146f1b/exec-13fac31d-ba01-4784-82f2-9892df6909e5.png`

Both references were generated from the supplied image before source changes.
The mobile frame is a fresh standalone composition, not a crop of the desktop.

## Design read

- Mode: redesign-preserve / app-wide visual-system evolution.
- Design variance: 3. Route structure and production component composition stay
  stable while the shared skin changes materially.
- Motion intensity: 2. Existing interaction feedback remains; no decorative
  motion or new animation system is added.
- Visual density: 7. Staff pages remain compact and operational; Family and
  public surfaces retain their established reading order.
- System: LeaguePilot's existing native CSS and Lucide icon family. No new
  component framework, icon package, font package, or theme dependency is added.

## Visual contract

| Role | Light treatment | Dark counterpart |
| --- | --- | --- |
| Page canvas | Mist blue `#f7fbff` | Deep navy `#071326` |
| Primary surface | White `#ffffff` | Navy surface `#0c1d35` |
| Structural surface | Powder blue `#eff6ff` | Ink blue `#09182c` |
| Information hierarchy | Ink navy `#071b44`; cobalt `#1248b3` | White `#f5f9ff`; sky blue `#8fbcff` |
| Primary action | Burnt orange `#c43a00` | Same contrast-safe orange |
| Review/warning | Amber `#8a5900` on pale yellow `#fff4bf` | Sunflower `#ffd45a` on translucent yellow |
| Verified success | Existing green semantics | Existing light-green semantics |

Orange is reserved for consequential primary actions, selected navigation edges,
and attention counts. Yellow indicates review or caution and never substitutes
for an error. Cobalt provides information, focus, and navigation hierarchy. All
interactive controls retain the existing 44-pixel minimum target contract.

## Source translation

| Reference element | LeaguePilot translation |
| --- | --- |
| Pale-blue navigation rail | Staff desktop rail and Family/public header structure |
| White work canvas | Cards, tables, forms, disclosures, and public action surfaces |
| Orange scenario selection | Existing primary actions and active navigation edge |
| Yellow required-decision counts | Existing warning/review states only |
| Navy title and outline icons | Existing Geist hierarchy and Lucide route icons |
| Compact card grid | Existing route content retains its own data and workflow composition |
| Mobile bottom tabs | Existing topology-derived tabs receive the same blue/orange active treatment |

## Implementation boundary

- `app/globals.css` owns the app-wide semantic palette, complementary Dark mode,
  the final staff shell layer, public gateway overrides, and mobile tab state.
- `app/parent/parent-weekly.css` preserves the Family shell structure while
  adopting the shared color roles for header, cards, navigation, and notices.
- `app/layout.tsx` mirrors the staff and Family essentials in critical CSS so the
  prior palette does not flash before the main styles load.
- `components/ui/AppShell.tsx`, `lib/navigation/route-topology.ts`, route guards,
  API handlers, Supabase adapters, and provider code are unchanged.
- `scripts/capture-workspace-visual-proof.mjs` provides read-only authenticated
  Admin, Coach, and Parent proof at 390 and 1440 pixels in both themes.

## SaaS constants

| Field | Concrete answer |
| --- | --- |
| Tenant context | Existing server-resolved organization, season, team, guardian, and user context only |
| Tenant propagation and isolation | No data path changed; `data-route-authority`, `data-resolved-role`, and `data-data-scope-role` remain the shell proof boundary |
| Actor authorization | Existing parent, coach, and organization-admin checks remain unchanged; visual emphasis grants no action |
| Lifecycle and state | No enum, state value, transition, or state machine changed |
| Configuration | Existing explicit Light/Dark user selection only; no tenant flag or environment variable |
| Audit and observability | Focused source tests, read-only screenshots, visual comparison, overflow/focus/browser-error checks, and axe results |
| Failure and idempotency | No persistence or provider call was added; unresolved access continues to use the existing neutral privacy-safe rendering |
| Security threat check | No new IDOR, tenant spoofing, mass assignment, privilege escalation, export, webhook, delivery, payment, or billing surface |

## Acceptance boundary

The local browser harness signs into fictional demo roles and performs route
reads only. It does not click mutations, write Supabase rows, call delivery or
payment providers, deploy, or establish hosted/production acceptance. A source
implementation and local screenshot are evidence of the local presentation
only.

## Local validation result

- The read-only authenticated matrix passed all 12 Admin, Coach, and Parent
  combinations at 390 and 1440 pixels in explicit Light and Dark modes.
- Every authenticated result retained the expected product shell, route
  authority, resolved role, and data-scope role; no horizontal overflow, page
  error, request failure, or serious/critical axe finding was recorded.
- Four additional signed-out public screenshots cover Light and Dark at the same
  viewports with no document overflow or page error.
- Browser artifacts and `proof.json` are under
  `output/playwright/lp-ux-020-spectrum-theme/`.
- Visual inspection confirms the desktop navigation, operational cards, Family
  header and bottom tabs, public gateway, orange action hierarchy, and yellow
  review cues match the generated direction without importing mock content.
