# Design QA: Parent Communication Room

Date: 2026-07-24
Route: `/parent/messages`
Approved Figma file: `c28Jx5U8wI2SPWPhbKaMje`

## Reference and implementation

| Viewport | Figma reference | Browser result |
| --- | --- | --- |
| Mobile | `output/figma-assets/communication-room/mobile-reference.png` | `output/playwright/communication-room/mobile-390.png` and `mobile-390-viewport.png` |
| Tablet | `output/figma-assets/communication-room/tablet-reference.png` | `output/playwright/communication-room/tablet-768.png` and `tablet-768-viewport.png` |
| Desktop | `output/figma-assets/communication-room/desktop-reference.png` | `output/playwright/communication-room/desktop-1440.png` and `desktop-1440-viewport.png` |

The combined mobile comparison used for visual judgment is `output/playwright/communication-room/mobile-reference-comparison.png`.

## Visual comparison

- The implementation preserves the Figma hierarchy: family context, three authority-separated lanes, critical first, recent updates, conversation preview, and a constrained composer.
- Desktop adapts the Figma page header to the existing authenticated AppShell. The existing sidebar remains the primary navigation; family and current-event rails occupy the same information roles as the Figma frame.
- Mobile removes the generic role/context panels for this route so Communication Room enters the first viewport. The existing fixed app navigation remains visible at the viewport bottom.
- The production QA tenant currently has no approved critical/update receipts or persisted conversation rows. Empty states are therefore shown instead of fabricating Figma identities or consequential messages.
- Current Supabase family and chat reads are labeled current. Notification receipt evidence is labeled unavailable because the QA data source did not return that evidence; no delivery state is inferred.
- Figma colors, typography, 8/12-pixel radii, quiet borders, lane semantics, and outdoor-readable control sizing are carried through the existing LeaguePilot tokens.

## Interaction and responsive checks

- 390, 768, and 1440 pixel browser runs completed with no document-level horizontal overflow.
- Every visible interactive element inside Communication Room measured at least 44 by 44 pixels.
- Critical, Updates, and Conversation controls jump to their matching sections while the full digest remains visible.
- Child/team context changes do not change account identity.
- The composer holds a draft without sending during browser proof.
- Offline, receipt-unavailable, empty, pending, error, and read-only truth states remain explicit.
- Browser proof emitted no page errors.
- Mobile full-page screenshots place the fixed bottom navigation near the first viewport because of Playwright fixed-element capture behavior; the viewport screenshot proves its runtime bottom position.

## Safety check

- Unapproved notification body text is withheld.
- Published, Delivered, Read, and Acknowledged remain independent.
- Acknowledgment copy says receipt only and names what it does not prove.
- Chat cannot invoke schedule, attendance, transportation, family-access, care-data, or emergency-instruction writes.
- No provider send, access change, or official event mutation was added.

final result: passed
