# Theme Contrast Regression Proof

Run route-level contrast proof with:

```bash
QA_PROOF_BASE_URL=https://www.leaguepilot.us npm run qa:contrast-proof
```

Without `QA_PROOF_BASE_URL`, the command targets `http://127.0.0.1:3020`.

## Route Matrix

The proof checks `/parent`, `/parent/rsvp`, `/coach`, `/coach/rsvps`, `/team-portal`, `/team-chat`, `/admin`, `/admin/operations`, and `/admin/themes` in light and dark color schemes. Team-theme checks also cover `/team-portal`, `/team-chat`, and `/admin/themes`, where team branding tokens and previews are visible.

## Thresholds

Accepted thresholds are WCAG AA contrast ratios:

- Normal visible text: `4.5:1`
- Large or bold visible text: `3:1`

The command can be tuned with `QA_CONTRAST_MIN_NORMAL`, `QA_CONTRAST_MIN_LARGE`, and `QA_CONTRAST_MAX_FAILURES`.

## Evidence

Passing runs print a route/mode summary. Failing runs save screenshots under `output/playwright/theme-contrast-*.png` and print the failing selector, text sample, computed foreground/background colors, measured ratio, and required threshold.
