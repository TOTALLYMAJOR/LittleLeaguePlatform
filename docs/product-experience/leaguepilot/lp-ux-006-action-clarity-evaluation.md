# LP-UX-006 Action Clarity Evaluation

Date: 2026-08-03

Status: `evaluation-complete` — slices 1–3 applied locally; remaining items are the Codex implementation plan below.

Branch: `ux/lp-ux-001-family-shell`

Trigger: user (viewing as admin and coach) reports difficulty determining what actions are available on a given page and "what is being asked of me."

Method: five parallel evaluators (coach surfaces, admin surfaces, shell attention signals, screenshot evidence, doc intent) over 52 page inventories, 69 findings, synthesized against heuristics H1–H7 (defined in §Evaluation Frame below).

## Verdict

Determining "what is being asked of me" as coach or admin is genuinely hard, and the cause is mechanical:

1. **Status signals and resolving controls are systematically severed.** 5 of 12 coach routes render an identical dashboard clone (`app/coach/_surfaces.tsx:120-122`), so CTAs land on a copy of the page just left; three admin queue counts linked to pages that cannot resolve them; the coach RSVP CTA is a client-side no-op that falsely reports "saved as a draft" (`components/feature-panels.tsx:3170-3172`); weather-draft review is unfulfillable anywhere in the codebase (`lib/domain/weather.ts:3-12` hardcodes `needs_review` with no clearing path).
2. **Attention systems contradict each other.** The coach home ran four counters in three counting schemes; nav badges disagree with page content (admin sidebar "1" vs card "7 registrations items need review"); shell badges cover only 3 of ~12 ask types, so a badge's absence means nothing.
3. **Labels and hierarchy invert the ask.** The only filled/primary button on the coach home was the least urgent action; CTAs speak system language ("Open", "Queue schedule alert records", "primary priority, score 470"); the drafts-for-review consequence model lived in fine print below the buttons.

Docs confirm this is a scoping artifact, not a design failure: the action-clarity grammar (one primary per viewport, deep-linked two-state readiness strip, verb-first labels) was specified and shipped **for parent surfaces only**; coach/admin were explicitly excluded (02 §1:19, 06 §90, 07 §88). The fix patterns already exist in-product (`/parent/schedule`, `/admin/sponsors`, `/admin/communications`, `/admin/imports`) and in `ui-wireframe-screen-specs.md`.

## Evaluation Frame

H1 one unmistakable primary action per screen or an explicit all-clear · H2 verb-first user-language labels naming object + outcome · H3 every count/badge pairs with the control that resolves it · H4 consequence transparency at point of action · H5 above-the-fold task orientation at 390/1440 · H6 consistent primary/secondary grammar · H7 zero states that say "you're done."

## Scorecard

| Route | Clarity | Worst gap |
|---|---|---|
| /coach | unclear | Four contradictory counters in three schemes; primary button was least-urgent action; 390px fold is identity metadata + marquee, zero verbs |
| /coach/attendance | mixed | Badge + "Nudge missing replies" route here, but page has ZERO interactive controls (`feature-panels.tsx:5966-6006`) |
| /coach/rsvps | mixed | Same dead end, second nav name ("RSVPs" mobile vs "Attendance" desktop) |
| /coach/drafts | unclear | Dashboard clone; "Drafts to Review" card links to itself (`season-certainty.ts:432-436`); the drafts queue the whole model depends on has no enumerable list and no badge |
| /coach/messages | mixed | Only page whose badge chain works — but its two "Send" buttons deliver instantly while everything else drafts, with identical styling |
| /coach/snacks-volunteers | unclear | Dashboard clone; claim buttons ~6 screens down in last collapsed disclosure (`feature-panels.tsx:3592-3625`) |
| /coach/weather-fields | unclear | Dashboard clone; the promised review action does not exist in the codebase — counter can only go up |
| /coach/practice-recaps | mixed | Five primary-styled buttons, two h1 heroes; self-approval checkpoint reads as external ask. Best consequence copy in the app though |
| /coach/roster | mixed | Nav says Roster, page is Team Portal branding; roster ~20 cards deep |
| /coach/schedule | unclear | Two stacked workbenches, two primaries, ~15 ops-telemetry cards shown to a volunteer |
| /coach/settings | unclear | Dashboard clone; no settings exist. Purest instance of the complaint |
| /admin | unclear | ~60 controls; every queue CTA is the bare word "Open"; zero-count queues render as pending; scoring internals printed ("score 470") |
| /admin/registrations | mixed | Model queue labels, but Approve silently disabled by a ≥10-char note in a different card |
| /admin/operations (= /admin/settings) | unclear | Passive dump; 2 of 3 queue links misrouted (fixed in slice 2); duplicate nav identity |
| /admin/teams | unclear | "Fix setup" routes here but page opens on generic guide, not the team's gap |
| /admin/communications | clear | Model page; silent 5-condition publish disable is its one gap |
| /admin/family-access | mixed | Headline task ("Repair missing parent-player links") has zero controls |
| /admin/media-review | mixed | No pending/done separation; six equal buttons per item; no done state |
| /admin/schedule-venues (= /admin/safety-weather) | unclear | Accent "Review impact and save" button only scrolls (`feature-panels.tsx:6638`); duplicate nav identity |
| /admin/sponsors | clear | THE model admin page (ranked attention list, real done state) — but legacy duplicate CRUD still on /admin home |
| /admin/message-delivery-review | mixed | Opens on filter "all", mixing decisions with history; no "N await your approval" |
| /admin/imports, /admin/memberships, /admin/branding | clear/mixed | Best staged flows; branding badges lack fix verbs |
| /admin/security, /health, /invites, /reports-archive | mixed | Status without action or done state; source paths and RLS jargon in UI |
| /team-portal (coach view) | unclear | Routing-architecture prose as page subtitle; no coach task stated |

## Systemic Patterns (fix these, not pages)

1. **Route collapse / alias sprawl** — clones and aliases teach users that navigation doesn't change the ask (12 routes affected).
2. **Broken or fictitious status→action chains** — counts whose resolving control is absent, misrouted, impossible, or a lying no-op.
3. **Competing attention systems** — sidebar badges, ticker, radar: different schemes, contradictions, none clickable.
4. **No cross-page "next thing"** — `shell-attention.ts` knows 3 ask types; zero badges is indistinguishable from fetch failure; context bar describes areas, never state.
5. **System language at the point of decision** — "Open", "Queue … records", score dumps, snake_case events, architecture prose.
6. **Draft-consequence opacity** — the ADR-0001 "automation recommends; humans approve" contract lives in fine print, contradicted by instant-send outliers and silently disabled buttons.
7. **Done states rendered as pending work** — zero-count queues keep pending styling/CTAs; media review interleaves approved with pending; a clear Saturday reads as empty panels.
8. **Inverted visual grammar + fold starvation** — filled button ≠ the thing to do; 390px first viewport has zero verbs; 12+ button styles on record (01 §4.10).

## Applied Locally (slices 1–3, commits 1a96f96 + next)

- Slice 1: coach radar counters unified to task language; "All clear" state; verb-first labels; drafts disclaimer moved above the buttons and reworded.
- Slice 2: three misrouted admin queue links fixed (`admin-operations.ts:145-146` → /admin/message-delivery-review and /admin/media-review; `season-certainty.ts:470` Branding issues → /admin/sponsors); "1 weather draft needs review" grammar; "Queue schedule alert records" → "Save schedule change (drafts family alerts for review)".
- Slice 3 (styling prerequisite): one-primary-per-viewport grammar on the coach radar — the top unresolved ask (People → Plan → Place) gets the filled button, everything else `.secondary`, "Save weekly update draft" demoted, redundant bare-count chip removed. No new CSS was needed: filled = default button, outline = `.secondary` already exist globally.

## NEXT ITEMS FOR CODEX — implementation plan, in order

Work on branch `ux/lp-ux-001-family-shell`. After each item: `npm run typecheck && npm test`, screenshots to `output/playwright/`, record results by appending to this doc (or as lp-ux-007 if scope grows). Verify cited file:line before editing — slices 1–3 may have shifted lines.

1. **Kill the fictitious actions (H4, medium).** `components/feature-panels.tsx:3170-3172`: "Draft RSVP reminder" must persist a real draft record surfaced on /coach/drafts, or be removed — never emit "saved as a draft" from a no-op. `lib/domain/weather.ts:3-12`: build weather-draft approve/dismiss where the count points, or stop counting unresolvable drafts in the queue and relabel to what is possible.
2. **One number, one scheme, one link on the coach radar (H3, small).** Replace the remaining dual scheme (`reviewCount` item-sum header vs `groupedActionCount` category queue, `role-dashboard-experiences.tsx` + `feature-panels.tsx:2917`) with a single enumerated task list whose header count equals visible rows and anchors to the queue.
3. **Scoped surfaces for the coach clone routes (H1/H3, large).** /coach/drafts = enumerable pending-draft list with per-item Review; /coach/snacks-volunteers = claim UI first (expand `feature-panels.tsx:575-605, 3592-3625`); /coach/weather-fields = approval queue with resolve controls; /coach/settings = real settings or remove from nav; /coach/attendance = per-family reminder action beside each "No response" row (wireframe spec §4 "Queue RSVP reminder draft", `ui-wireframe-screen-specs.md:341-356`).
4. **Done states (H7, small).** Collapse admin zero-count queues to one "All clear: N queues" line (`season-certainty.ts:464-476`, `season-certainty-cards.tsx:414-428`); covered radar rows get checkmark + "Nothing needed" instead of buttons; media review defaults to pending-only with a real done state (`feature-panels.tsx:4776-4830`); delivery review defaults to "pending" with "N await your approval" (`coordination-workbenches.tsx:148, 227-236`).
5. **Consequence + preconditions at point of action (H4, medium).** One-line sub-caption per action group ("Saves a draft — reviewed before families see anything"); distinct treatment + "Send to team now" phrasing for the two instant-send chat actions (`feature-panels.tsx ~9569/~9717`); inline explanations on every silently-disabled approval button (`feature-panels.tsx:5933/5940`, `additional-guardian-access.tsx:339/346`, `official-communication-workbench.tsx:265`, `coordination-workbenches.tsx:509/1046`). Fix the scroll-anchor styled as a save button (`feature-panels.tsx:6638`).
6. **End /admin at the queues (H1/H2, medium).** Remove the inlined legacy composer, sponsor CRUD, and media queue from /admin home (dedicated routes exist); hide scoring internals behind a disclosure (`season-certainty-cards.tsx:44-59`); replace every bare "Open" with a verb-first per-queue CTA (`season-certainty.ts:920-921`); link the 8 health metrics and Suggested-reviews cards to their resolving surfaces (`season-certainty-cards.tsx:394-412`, `assistive-suggestions.ts:20-37`); implement the spec'd "Fix next hold" primary.
7. **Shell attention expansion (H3/H7, medium).** Extend `lib/navigation/shell-attention.ts:64-108` to every queue with a route; derive nav badges and page counts from one selector (add a test asserting badge == queue length); count in user units; visible badge meaning (not aria-only); "All caught up" context-bar state distinct from fetch failure (`shell-access.ts:513-516`).
8. **Mobile 390 fold (H5, medium).** Collapse the Role/Org/Season/Team/Access strip to one line + disclosure; static single-line announcement instead of marquee; remove/dim sidebar autoplay video; top task + its button as first card (`AppShell.tsx:395-407, 478-507`; `role-dashboard-experiences.tsx:23-58`).
9. **Split stacked workbenches; dedupe nav identity (H1/H6, large).** /coach/schedule and /admin/schedule-venues become the Resolution Room with event-editing behind an affordance and telemetry moved to admin ops; collapse alias pairs (settings=operations, safety-weather=schedule-venues, security=security-audit, themes=branding) and dual names (Attendance/RSVPs, Practice Recaps/Parent Replay) to one name each (`route-topology.ts:200-233`); collapse the practice-recap self-approval checkpoint to "Confirm and publish".
10. **Staff copy table (H2, small).** Extend 04 §4 vocabulary discipline to coach/admin; adopt "each state names who acts next" (06 §5) for every queue row, gate card, and status chip. Remaining quick wins while there: pluralize admin pending-card templates; rename mobile "Providers" → "Message approvals"; /coach/roster → "Team Portal"; session-expiry toast "Pending review" → "Session expiring" (`AppShell.tsx:537-543`); drop score internals from queue rows; remove architecture prose from /team-portal subtitle (`AppShell.tsx:77`).

Hard boundaries: no API/schema changes except where item 1 requires a draft-persistence path (prefer an existing outbox/draft table; if a migration is unavoidable, stop and propose first). Preserve child-privacy rules, role boundaries, and the drafts-for-review approval gates. Do not touch `10-reference-implementation-brief.md`.

## Doc Alignment (why this is completion, not critique)

The exact complaint was diagnosed before: prompt-evolution-timeline.md:15 records "start from each role's three-second question"; Features.md:32 claims the orientation half shipped. The action half — every signal paired with its resolving control — is the unfinished half. The parent-side contract (06 §7 two-state readiness strip; 04 §5.1 three button levels, one orange solid per viewport; wireframe publish-confirmation pattern :350 and disabled-CTA explanation rule :134) is the ready-made spec; these items extend it to the staff shell.
