---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-016 design source

Design-source artboards for the three role homes described in
[`../lp-ux-016-shared-open-items.md`](../lp-ux-016-shared-open-items.md).

| File | Artboard |
| --- | --- |
| `Main.dc.html` | Parent — This Week |
| `Coach.dc.html` | Coach — Saturday |
| `Admin.dc.html` | Admin — Needs a look |
| `canvas.json` | Layout, frame sizes, annotations |

These are **mockups, not application code**. Nothing here is imported by `app/`,
`components/`, or `lib/`, and no build step consumes them. They are checked in so
the design survives the session that produced it and can be re-rendered or
re-skinned later.

## Conventions they follow

- Values are lifted from `app/globals.css` `:root` (resolved, not rounded), not
  from the `04-production-design-system.md` prose. Where the two disagree, code
  won — see the drift table in the parent entry.
- Warm canvas `#fdf8f1`, navy `#1f3a63` / `#142a4a`, action `#c94f17`, ok
  `#057a55`, warning `#92400e`, danger `#b42318`, changed `#4c4ddc`.
- Geist via Google Fonts with a system fallback stack. PNG/PDF export shows the
  fallback face.
- Icons are inline SVG on the lucide grid at stroke-width 2.2 — no emoji, no
  glyph fonts.
- Minimum 44px hit targets; 48px for answer, accept, and acknowledge actions.
- Player names render as first name plus last initial (`AGENTS.md` rule 2).

## Measured heights

Content needs 1222 / 1202 / 1064px against frames of 1280 / 1260 / 1120px.
Verified by rendering the canvas in Chromium and reading the artboard roots. If
you edit content, re-measure — the frame clips, it does not scroll to fit.

## Re-rendering

These files are seeded into a canvas by the `design` skill's helper, which wraps
them in the Claude Design editor payload and publishes the result as an Artifact.
The seeded output is ~2.2 MB and is deliberately **not** committed.

To rebuild, run the skill's `seed-canvas.mjs` against this directory with all
three artboards plus `canvas.json`, then publish the seeded file.
