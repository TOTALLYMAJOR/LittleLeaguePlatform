---
name: LeaguePilot
description: The Organized Clubhouse for private, role-aware youth-sports operations.
colors:
  sky-paper: "#f7fbff"
  clubhouse-white: "#ffffff"
  sky-soft: "#eff6ff"
  sky-strong: "#e2efff"
  dugout-navy: "#071b44"
  slate-blue: "#4a5f7f"
  field-line: "#c9dcf2"
  league-blue: "#1248b3"
  league-blue-deep: "#0a347f"
  league-blue-soft: "#e7f0ff"
  action-orange: "#c43a00"
  action-orange-deep: "#9d2f00"
  action-orange-soft: "#fff0e8"
  success-green: "#057a55"
  success-green-soft: "#d8f8e7"
  caution-gold: "#8a5900"
  caution-gold-soft: "#fff4bf"
  danger-red: "#b42318"
  danger-red-soft: "#fee4e2"
typography:
  display:
    fontFamily: "Fredoka, Arial Rounded MT Bold, ui-rounded, sans-serif"
    fontSize: "clamp(2.15rem, 4vw, 3.65rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.08em"
rounded:
  compact: "9px"
  control: "12px"
  surface: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
  4xl: "40px"
  5xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.action-orange}"
    textColor: "{colors.clubhouse-white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.sky-strong}"
    textColor: "{colors.dugout-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.clubhouse-white}"
    textColor: "{colors.dugout-navy}"
    rounded: "{rounded.surface}"
    padding: "20px"
  input:
    backgroundColor: "{colors.clubhouse-white}"
    textColor: "{colors.dugout-navy}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
---

# Design System: LeaguePilot

## Overview

**Creative North Star: "The Organized Clubhouse"**

LeaguePilot should feel like the best-run clubhouse at the field: immediately welcoming to families, dependable under game-day pressure, and orderly enough that volunteer coaches and league administrators can find the next action without decoding the interface. Its warmth comes from rounded silhouettes, sky-and-field color cues, friendly display type, and real community imagery. Its authority comes from disciplined hierarchy, explicit state language, and role-aware navigation.

The system is tactile and friendly rather than decorative. Surfaces feel like labeled boards, cards, and trays that can be scanned and acted on. Public and family experiences may be more expressive; staff workspaces become denser and quieter while retaining the same colors, type voice, spacing rhythm, and action hierarchy.

**Key Characteristics:**

- Sky blue, clubhouse white, and dugout navy establish calm and trust.
- Orange is a scarce action signal, not ambient decoration.
- Fredoka gives headings a youth-sports warmth; Geist keeps operational text precise.
- Rounded, lightly lifted surfaces provide structure without looking corporate or clinical.
- Status, authority, and proof boundaries are stated in words as well as color.
- Motion is brief and purposeful, with reduced-motion behavior treated as a first-class state.

## Colors

The palette combines a bright game-day sky with serious navy structure, using orange for decisive action and semantic colors for truthful operational state.

### Primary

- **League Blue**: Brand marks, active navigation, focus indicators, and trusted informational emphasis.
- **Dugout Navy**: Primary text and high-authority structure.
- **Action Orange**: Primary calls to action and rare game-day emphasis.

### Secondary

- **Sky Soft and Sky Strong**: Grouped controls, selected states, quiet panels, and hover feedback.
- **Slate Blue**: Supporting copy, metadata, and secondary navigation.

### Neutral

- **Sky Paper**: Default page canvas.
- **Clubhouse White**: Primary surface layer.
- **Field Line**: Borders, dividers, and structural separation.

### Named Rules

**The One Action Color Rule.** Orange identifies the strongest available action or a true operational alert. Do not spread it across passive decoration.

**The State Has Language Rule.** Success, warning, danger, and informational color must be paired with a readable label, icon, or explanatory text.

## Typography

**Display Font:** Fredoka, with rounded system fallbacks
**Body Font:** Geist, with system sans-serif fallbacks
**Label/Mono Font:** Geist for labels; the system monospace stack for identifiers and sensitive values

**Character:** Fredoka makes public promises and major wayfinding feel human and memorable. Geist carries instructions, data, forms, and operational detail without losing friendliness.

### Hierarchy

- **Display** (700, responsive clamp, 1.04 line-height): Primary page promises and major family-facing headings.
- **Headline** (700, 1.35rem, 1.22 line-height): Section landmarks and card-group titles.
- **Title** (700, 1rem, 1.35 line-height): Card and workflow titles.
- **Body** (400, 1rem, 1.55 line-height): Instructions, context, and explanatory copy.
- **Label** (700, 0.75rem, 0.08em tracking, uppercase when used as an eyebrow): Status categories, metadata, and navigation grouping.

### Named Rules

**The Warm Head, Clear Body Rule.** Use Fredoka to orient and welcome; use Geist for every sentence the user must understand or act on.

## Layout

The layout follows a 4px base rhythm and favors clear content lanes over ornamental grids. Signed-in desktop shells pair a compact sticky sidebar with a fluid main workspace capped near 1240px. Public landing compositions may expand to roughly 1320px and use broader asymmetry to balance copy with real imagery. Cards and workflow groups use 12–24px internal gaps, with 32–48px reserved for major section separation.

Responsive behavior collapses rather than shrinks. Around 900px, the staff sidebar yields to mobile navigation. Public and family compositions move to one column between roughly 760px and 640px. Controls preserve 44px targets, dense tables gain bounded scrolling or alternate layouts, and essential state stays ahead of secondary context.

## Elevation & Depth

The system uses ambient, low-chroma blue shadows to separate actionable surfaces from the page canvas. Depth is structural rather than theatrical: small shadows support compact controls, medium shadows lift standard cards, and large shadows are reserved for raised or interactive surfaces. Dark theme shifts emphasis toward tonal layering and restrained borders.

### Shadow Vocabulary

- **Quiet Lift** (`0 2px 7px rgba(27, 81, 145, 0.06)`): Compact disclosures and small controls.
- **Clubhouse Surface** (`0 10px 28px rgba(27, 81, 145, 0.08)`): Standard cards and work areas.
- **Game-Day Lift** (`0 18px 44px rgba(27, 81, 145, 0.12)`): Interactive, raised, or public hero surfaces.

### Named Rules

**The Useful Lift Rule.** Elevation signals grouping, interactivity, or priority. A shadow without one of those jobs is noise.

## Shapes

Controls use gently rounded 9–12px corners, primary surfaces use 16px corners, and badges or binary controls use full pills. Borders remain thin and cool-toned. The recurring silhouette is sturdy and friendly: never sharp enough to feel administrative, never inflated enough to feel toy-like.

## Components

Components are tactile and friendly: generous targets, obvious states, and enough depth to clarify grouping without slowing scanning.

### Buttons

- **Shape:** 12px corners, 44px minimum height, compact horizontal padding.
- **Primary:** Action Orange with white text; hover deepens the orange and adds only a quiet lift.
- **Secondary:** Sky Strong with navy text and a Field Line border.
- **Ghost:** Transparent with a League Blue outline and a Sky Soft hover fill.
- **Hover / Focus:** Brief 180ms state transitions; focus uses a clearly separated League Blue ring.

### Chips

- **Style:** Full pill, Sky Strong fill, Field Line border, compact bold label.
- **State:** Use chips for filters, categories, and removable selections—not as a substitute for a primary action.

### Cards / Containers

- **Corner Style:** Friendly 16px surface radius.
- **Background:** Clubhouse White over Sky Paper.
- **Shadow Strategy:** Clubhouse Surface by default; flat and raised variants must reflect hierarchy.
- **Border:** One-pixel Field Line border.
- **Internal Padding:** 20px default, adjusted only for established compact or spacious variants.

### Inputs / Fields

- **Style:** White surface, Field Line stroke, 12px corners, and a 44px minimum target.
- **Focus:** League Blue border with a soft external ring.
- **Error / Disabled:** Error uses Danger Red with explanatory copy; disabled controls remain legible and visibly unavailable.

### Navigation

Navigation uses minimum 44px targets, strong active-state contrast, and role-aware grouping. Desktop staff navigation is compact and persistent; mobile navigation prioritizes the current role's essential destinations. Labels may collapse visually only when accessible names remain intact.

### Status Badges

Status badges use semantic soft fills and dark readable text. Pulse is reserved for genuinely changing or waiting state, never decoration.

## Do's and Don'ts

### Do:

- **Do** lead each workflow with current state, why it matters, and the next permitted action.
- **Do** preserve the blue-and-orange hierarchy across public, family, coach, and administrative surfaces.
- **Do** use real labels alongside semantic color and maintain visible keyboard focus.
- **Do** let family-facing screens breathe while making staff density intentional and scannable.
- **Do** provide reduced-motion behavior for nonessential animation.

### Don't:

- **Don't** use Action Orange as general decoration or allow multiple competing primary actions.
- **Don't** imply persistence, delivery, approval, or live provider state through visual polish alone.
- **Don't** hide role, team, or authority context when it changes what the user may do.
- **Don't** add playful motion that delays a task, loops without purpose, or obscures recovery.
- **Don't** replace the incumbent identity with generic SaaS gradients, glass panels, or anonymous dashboard chrome.
