# 04 — Production Design System (Family Surfaces)

Specification, 2026-07-29. Substrate rule honored: extend the existing global-CSS token system; no new framework. This system is a consolidation of what shipped in `ffb1c9b` (warm cream/navy/orange) reconciled with the blueprint's semantic-token contract — not a third invention. Where this document amends the blueprint (§8 cobalt) it records the amendment explicitly: the shipped warm palette is adopted as the palette of record because it is live, browser-proven, brief-aligned, and superior for outdoor legibility; the blueprint's *semantic naming* and *component API* are adopted over the shipped raw names.

## 1. Color roles

Single source: `:root` in `app/globals.css`. All literals below already exist there today unless marked NEW. Every component consumes roles, never raw hexes; `parent-weekly.css`'s 39 drifted literals migrate to these roles.

| Role (semantic alias) | Maps to | Value | Use |
| --- | --- | --- | --- |
| `--surface-canvas` | `--bg` | `#fdf8f1` | Page background, family routes |
| `--surface-primary` | `--surface` | `#ffffff` | Cards, sheets |
| `--surface-subtle` | `--surface-soft` / `--surface-strong` | `#fffaf4` / `#f2ede4` | Insets, secondary fills |
| `--text-primary` | `--text` | `#1c2438` | Ink |
| `--text-secondary` | `--muted` | `#68665f` | Support text (4.6:1 on canvas — keep ≥ this) |
| `--line-subtle` | `--line` | `#e7ded1` | Borders |
| **Brand / navy** | `--accent` / `--accent-strong` | `#1f3a63` / `#142a4a` | Brand, links, selected nav, informational emphasis, the Next-Event panel (see §5) |
| **Action (unresolved → act)** | `--action` / `--action-strong` | `#c94f17` / `#9f3b0d` | Primary buttons, needs-reply badges, unresolved chips. 4.55:1 on white at 14px/700 — pin button text to ≥14px/700 or darken to `#b8470f` for headroom (validate before adopting) |
| **Verified / complete** | `--ok` | `#057a55` | Confirmed states, receipts, "nothing unresolved" |
| **Caution** | `--warning` | `#92400e` | Stale, waiting-on-other-party |
| **Critical / safety** | `--danger` | `#b42318` | Genuine safety and critical-lane content ONLY — never decoration, never "unresolved" (that is orange) |
| **Changed** | NEW `--status-changed` | violet-blue family, e.g. `#4c4ddc` (validate 4.5:1 tinted usage) | Blueprint §9 requires changed ≠ critical; today changes borrow warning/orange |
| Team brand | `--team-primary/secondary` | per-team | Decorative context only; never a status carrier (recorded rule) |

Deletions: the 19 scoped sub-palettes collapse into these roles (`--mission-*`, `--replay-*`, `--gateway-*`, `--coord-*`, `--sponsor-*` on family routes); the 14 hard-coded dark panels re-express as the Navy Panel pattern (§5); Tailwind-green `#22c55e` (`.parent-rsvp-glow`) and ad-hoc reds (`#d6472f`, `#e23b3b`) are retired. Fix the `--page` undefined-variable bug in `.verified-context-bar` while it survives.

## 2. Typography

- **Families:** Geist (`--font-parent-sans`) for everything; Fredoka (`--font-parent-display`) *only* for the Home greeting, Replay memory titles, and public hero. Georgia serif is retired (unregistered third family). Rationale: Fredoka everywhere reads juvenile at scale; reserved, it provides family warmth.
- **Scale (8 steps, replaces 143 ad-hoc sizes):** 12 / 14 / 16 / 17 / 19 / 22 / 28 / 34px (existing `--text-*` tokens re-pinned). Base body 16px; critical body 17px (blueprint numerical target). Minimum rendered size 12px — the 0.62–0.68rem stratum (9.9–10.9px badges/tab labels) is eliminated.
- **Page title grammar:** one `h1` per route at `--text-2xl` (22px)/`--text-3xl` (28px), sans, weight 700. Display `clamp()` scaling only on Home greeting, Replay titles, public hero (per governance: no viewport font scaling in operational UI).
- **Weights:** 400 / 600 / 700, plus 500 for chips. The 750/760/780/850/900/950 stratum normalizes to 700 (labels) and 600 (emphasis).
- **Kicker (single implementation):** 12px / 700 / 0.08em / uppercase / `--text-secondary` or `--accent-strong`. Replaces 9 variants. Uppercase appears nowhere else; data values never uppercase.
- **Numerals:** `font-variant-numeric: tabular-nums` on times, scores, counts (already a recorded direction).

## 3. Spacing, width, radius, elevation

- **Spacing:** keep the existing `--sp-1..12` (4px base) scale; `parent-weekly.css` literals migrate onto it.
- **Content widths:** overview surfaces `min(100%, 1152px)`; reading/task surfaces `min(100%, 820px)`; sheets 560px. The 1180/1240 values consolidate to 1152.
- **Radius (blueprint targets, applied):** controls 8px (`--radius-sm` re-pinned), operational surfaces/cards 12px (`--radius`), memory/media 16px (`--radius-lg`), pills `--radius-pill`. The 18/20/24/28/30/34/40px stratum is retired. (`--radius-md`/`--radius-xl` aliases removed — four tokens, two values today.)
- **Elevation:** exactly the three existing warm shadows (`--shadow-sm/--shadow/--shadow-lg`); the ~28 bespoke shadows migrate or drop. Rule: elevation expresses interactivity/priority, never decoration.
- **Card rules:** max nesting 2 bordered surfaces; inner structure uses spacing and `--line-subtle` dividers, not more cards. `.card` base stays as-is.

## 4. Status vocabulary (one system)

One `StatusChip` replaces the 8 parallel badge families. Five tones, each = fill + ink + icon + label (never color alone):

| Tone | Fill / ink | Icon | Canonical labels |
| --- | --- | --- | --- |
| `confirmed` | `--ok-soft` / `--ok` | check-circle | Confirmed · Going · Acknowledged · Accepted · Active |
| `action` | `--action-soft` / `--action-strong` | circle-alert | Needs reply · Needs your confirmation · Unresolved |
| `waiting` | `--warning-soft` / `--warning` | clock | Waiting for league · Offered · Pending review |
| `changed` | changed-soft / `--status-changed` | refresh | Schedule changed · Needs review · New version |
| `critical` | `--danger-soft` / `--danger` | shield-alert | Cancelled · Safety alert · Revoked |

Plus a `neutral` informational chip. Label casing: sentence case; one term per state ("Cancelled" not "Canceled"; "Needs reply" not "Need reply"/"needs action"). Evidence lanes (published/delivered/read/acknowledged) remain a `ReceiptTimeline`, never merged into one chip (contract).

## 5. Component canon

Promote/build once, in `components/family/`, consuming blueprint names where they exist:

1. `PrimaryAction` / `SecondaryAction` / `QuietAction` — three button levels: orange solid (one per viewport), neutral outline, text-navy. `danger` solid reserved for destructive confirms inside sheets. Fix: remove `secondary danger` combination (2.35:1); remove dead `.ghost`; min-height 44px (48px for RSVP/accept/acknowledge); the global `button:disabled { opacity:.5 }` is replaced by explicit disabled paints (the auth-route fix, globalized).
2. `RsvpControl` — 3-segment Going/Maybe/Can't go, selected state in tone colors, 409 conflict copy built in.
3. `EventPassport` — **Navy Panel pattern:** the one sanctioned dark surface (`--accent-strong` family), tokenized, AA-proven inks, used for next-event passports only — preserving Family Home's strongest visual signature while retiring the 13 other hard-coded dark panels.
4. `ChangeBand` (blueprint `StatusBand`/`ChangeDiff`) — changed-tone band with field-level diff rendering.
5. `ReadinessStrip` — evidence-lane aggregation display (06 §7).
6. `FamilyFilter` — promoted Communication Room switcher: Everyone + per-child chips (name + team, never color-only identity), presentation-only.
7. `StatusChip`, `ReceiptTimeline`, `AgendaRow`, `ResponsibilityCard`, `ReplayStory`, `OfflineReceipt` — per blueprint variants.
8. `FormField` — label-above 16px inputs, visible focus ring (§7), inline validation text + icon; sheets for consequential confirmation (44px+ controls, reason fields where RPCs require them).
9. `Alert/Notice` — existing `.notice` tones retained; toasts only for transient success; alerts with actions render inline, never toast.
10. `Timeline` patterns — season story and access-tracking reuse one timeline grammar (existing `Timeline` primitive, adopted).

Adoption rule: existing `components/ui/primitives.tsx` exports are candidates, not baggage — adopt the ~15 that match this canon, delete or quarantine the unmounted remainder (67 exports currently render nowhere; the 10/10 scorecard claims should be re-baselined accordingly).

## 6. Iconography

lucide-react only (already a dependency), one stroke width 2.2, sizes 16/20/24. Semantic bindings fixed product-wide: calendar=schedule, message-circle=conversation, megaphone=official update, shield-check=access/privacy, car-front=transportation, utensils=snacks, camera=media, refresh=changed, check-circle=confirmed, circle-alert=needs action. Emoji/text glyphs ("LL", "+") in primitives are replaced. Icons never carry meaning alone (labels or `aria-label` always).

## 7. Interaction states, motion, accessibility hooks

- **Focus:** one ring: `outline: 2px solid var(--accent); outline-offset: 2px` on every interactive element *including inputs* (today inputs swap to a `#1570ef` shadow — retired). The 48%-alpha orange ring in parent-weekly.css is replaced.
- **Motion:** transform/opacity only, 120–180ms, `--ease`; existing reduced-motion kill-switch retained; sidebar video is retired with the sidebar itself (its reduced-motion hide becomes moot on family routes); no autoplaying media in the family shell.
- **Forced colors:** keep and extend the existing `forced-colors` blocks to the new components.
- **Live regions:** the shell `#live-region` is the single announcement channel; components announce via it (pattern already present).
- **Dark mode (decision):** family routes ship **light-only** until a deliberate dark theme passes an authenticated, all-family-routes contrast proof. Mechanically: scope the existing dark-token block away from the family shell (it already misses most family CSS; today's state is the worst of both). The existing `prefers-color-scheme` block remains for staff surfaces it actually covers. A future dark theme is a backlog item with the same proof bar. (Amends nothing of record: no manual toggle was ever decided; capability-matrix lists dark-mode QA as an open gap.)
- **Outdoor mode:** blueprint's reserved concept stays reserved; the light system's contrast floor (≥4.5:1 body, ≥3:1 large) is the current outdoor answer.

## 8. Verification harness (design-system slice of proof discipline)

The existing `qa:contrast-proof` must be upgraded before any visual claim: authenticate (demo parent), cover all family routes light-mode, keep AA thresholds, and add the specific defects found by inspection as regression fixtures (`secondary danger`, gateway sub-ink, dark `.verified-context-bar`, disabled-button paint). Contrast claims in docs cite proof artifacts, not intent (repo rule).
