# LP-UX-019 Staff Workspace Visual Convergence

Date: 2026-08-19 (US/Central)
Status: Historical local slice; visual palette superseded by LP-UX-020

## Outcome

This historical slice temporarily applied a compact operational language based
on the supplied quote-workspace reference: a charcoal navigation rail, muted gold
selection and action cues, a warm neutral canvas, editorial staff headings,
compact authority strips, fine borders, and restrained card elevation. LP-UX-020
subsequently replaced that palette and typography with the current spectrum.

This is a visual convergence, not a workflow rewrite. The existing route
topology, role resolution, tenant scope, child privacy, provider gates, server
reads, mutations, and Family shell semantics remain authoritative and unchanged.
One responsive safety correction lets the existing Family header brand shrink at
320 pixels so its shortcuts no longer overflow the viewport.

## Design read

- Mode: redesign-preserve
- Design variance: 3. The route structure and component composition stay stable.
- Motion intensity: 2. Existing interaction feedback remains, with no decorative
  animation added.
- Visual density: 7. The staff workspace stays operationally dense while reducing
  oversized chrome and card weight.
- System: LeaguePilot's existing native CSS system and Lucide icon family. No new
  component library or icon family was introduced.

## Source translation

Reference:
`/home/administrator/projects_new/quoteflow-price-book-foundation/output/playwright/quote-workspace/current-desktop.png`

| Reference element | LeaguePilot translation |
| --- | --- |
| Dark quote navigation rail | Staff-only coach/admin rail; Family keeps its established header and mobile shell |
| Gold quote selection and send action | Muted gold active navigation, attention counts, and primary staff actions |
| Warm paper canvas | Warm ivory staff canvas with low-contrast surface borders |
| Editorial quote title | Georgia staff workspace and command headings, scoped away from Family routes |
| Connected-preview evidence strip | Existing route and verified-context bars compressed into quiet authority evidence |
| Quote cards and tables | Existing LeaguePilot cards, disclosures, and tables with smaller radius and restrained elevation |
| Quote-specific photo and brand logo | Not copied; LeaguePilot retains its own brand mark, game-day assets, and real role-scoped content |

## Implementation boundary

- `app/globals.css` retains this historical `[data-product-shell="staff"]` layer
  for provenance; the later LP-UX-020 block is the final cascade authority and
  supplies the current Light/Dark counterparts.
- `app/layout.tsx` mirrors the desktop rail essentials in the critical first-paint
  CSS so the old pale rail does not flash before the main stylesheet loads, and
  mirrors the Family header's responsive overflow guard.
- `app/parent/parent-weekly.css` contains only the matching Family header sizing
  guard; it does not adopt the staff visual treatment.
- `components/ui/AppShell.tsx`, `lib/navigation/route-topology.ts`, and all route
  data loaders remain unchanged.
- `scripts/capture-workspace-visual-proof.mjs` performs read-only authenticated
  local capture for Admin, Coach, and Parent at 390 and 1440 pixels in Light and
  Dark modes.

## SaaS constants

| Field | Concrete answer |
| --- | --- |
| Tenant context | Existing server-resolved organization, season, team, guardian, and user context only |
| Tenant propagation and isolation | No data path changed; the shell retains `data-route-authority`, `data-resolved-role`, and `data-data-scope-role`, and route guards remain the proof boundary |
| Actor authorization | Existing parent, coach, and organization-admin session checks remain unchanged; styling grants no action |
| Lifecycle and state | No state value or transition changed |
| Configuration | Existing user-selected Light/Dark theme only; no new environment or tenant flag |
| Audit and observability | Local screenshots, `proof.json`, focused source tests, and design comparison evidence |
| Failure and idempotency | No persistence, provider call, or repeatable write was added; missing access still renders the existing privacy-safe neutral state |
| Security threat check | No new IDOR, tenant spoofing, mass assignment, privilege escalation, export, webhook, provider-send, or billing surface |

## Validation boundary

The visual harness authenticated fictional demo roles and performed scoped reads
only. It did not click application mutations, call delivery/payment providers,
deploy, alter Supabase data, or establish hosted or production acceptance. Its
Family Dark captures were later found to contain a partially recompiled older
palette, so the LP-UX-019 artifact set is historical and is not current acceptance
evidence. LP-UX-020's settled-server matrix is the current local visual proof.
