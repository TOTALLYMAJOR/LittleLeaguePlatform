# Product Direction — August 2026

Date: 2026-08-18
Status: Recommendation. Not an authorization to build, and not a claim of production readiness.
Authority: This document ranks direction only. Open gates remain owned by
[`docs/backlog-closeout-2026-07-27.md`](backlog-closeout-2026-07-27.md).

## Method

Five directions scored 1–10 on impact toward a product that is both fun and effective, ordered by
score. Evidence is drawn from repository contracts, the LP-UX engagement record, and August 2026
market sources listed at the end.

Interview preparation artifacts now exist in
[`docs/research/leaguepilot-community-discovery-interview-guide.md`](research/leaguepilot-community-discovery-interview-guide.md)
and [`docs/research/leaguepilot-role-journey-map.md`](research/leaguepilot-role-journey-map.md).
They are hypothesis and planning inputs only until real interviews are completed and synthesized.

## Situation

The repository holds near-complete local capability and approximately zero production proof.
`docs/feature-fit-backlog.md` classifies most of the product as `Covered`; the closeout ledger
holds eleven `external` gates and five `decision-required` gates. The constraint on this product
is not features. It is delivery, proof, trust, and composition.

The competitive frame matters because it removes options:

- TeamSnap ONE (November 2025) unified registration, payments, scheduling, communication, live
  streaming, and AI highlights, with an **exclusive** XbotGo camera partnership.
- GameChanger (Dick's Sporting Goods) auto-timestamps plays, generates highlight clips, writes
  game recaps, and produces play-by-play audio.
- Spond is genuinely free with no gated features.
- Both incumbents are explicitly racing to become the only app a youth sports family opens.

LeaguePilot cannot win breadth, video, or price. It can win **coordination truth** and the
**coach-to-parent teaching loop**, both of which are already built here and absent there.

## Ranked directions

### 1. Turn on real delivery — `DEC-PROVIDER` → `EXT-PROVIDER-SENDS` — 10/10

Every provider record is draft/internal. RSVP nudges, transportation handoffs, weather
disruption, and critical-message acknowledgment are all implemented and none of them arrive.

A coordination product whose coordination signal cannot leave the building is a database with
opinions. Nothing else on this list clears a 4 until this ships, because every loop below is a
notification loop underneath.

The gate is the most completely specified one in the ledger: consent and preference enforcement,
recipient allowlist, human approval, sandbox execution, suppression, idempotent retry, verified
webhooks, delivery logs, cost controls, hosted monitoring. Twilio and SendGrid skills are already
in the agent workflow.

Cost: moderate, mostly operational. Risk: the one gate where failure sends a wrong message to a
real family, which is why the approval-gate design in `docs/agentic-architecture.md` is correct
and should not be relaxed to ship faster.

### 2. Make schedule-change awareness provable, not device-local — 9/10

**Correction of record:** the LP-UX finding that `event_change_logs` is write-only is stale. As of
this branch the read path exists and is good — `lib/supabase/event-change-log-reads.ts` (360 lines)
produces labelled field-level diffs across start time, end time, arrival time, venue, field,
status, family instruction, uniform, and equipment, scoped to guardian-linked children, and
`components/family/change-band.tsx` renders it with a real failure state.

The remaining gap is narrower and more valuable than the original finding. The "since you last
looked" watermark is a `localStorage` key. That means:

1. It does not cross devices. A parent who reads on a phone sees everything again on a laptop.
2. It advances automatically on render, so a change is marked seen whether or not a human read it.
3. There is no server record that a family saw a time, venue, or cancellation change — so for the
   changes that actually carry safety consequence, nothing is provable.

Meanwhile the server-side acknowledgment pattern already exists for official communications:
`acknowledged_at` on notification delivery attempts, authorized in SQL (`0023`, `0024`, `0030`),
exposed through `lib/supabase/notification-receipts.ts` and `app/api/notifications/acknowledge`.

Extending that proven pattern to high-impact event changes converts a pleasant UI band into a
receipt. That is the differentiator: incumbents notify, they do not prove. See
[`docs/design/event-change-acknowledgment-design.md`](design/event-change-acknowledgment-design.md).

Cost: low. Risk: low.

### 3. Close the five report-only security findings and make RLS primary — 8/10

No fun value. Ranked third because it is a precondition for being allowed to exist. From
`docs/product-experience/leaguepilot/05-saturday-ready-current-state.md`:

1. `app/api/schedule/export/route.ts` authenticates but never checks team or organization
   membership, over an unfiltered cross-org `events` read. Any authenticated user holding a team
   UUID can read another organization's children's schedule and venues.
2. `lib/supabase/team-chat.ts:617` — read-receipt writes have no membership check.
3. `lib/supabase/operations.ts:1545` — weather-alert draft creation has no coach/admin
   authorization and can trigger third-party provider calls on anyone's behalf.
4. `player_media_consents` has no application writer, silently dead-ending family media release.
5. `team_chat_messages.retained_until` is never populated, so season-close chat purge is a
   permanent no-op and the stated deletion commitment is unenforceable.

Underneath all five: the service-role client is used everywhere, so correct RLS policies that
would have blocked items 1–3 are bypassed. RLS is defense-in-depth only, with four executed
403-denial tests repo-wide. `EXT-RLS-ACTOR-ACTION` already scopes the remediation.

This product sells trust to volunteer league boards against free competitors. One cross-tenant
disclosure of children's schedules ends that conversation permanently.

### 4. Make Parent Replay the pitch, and give the child something to see — 8/10

The only capability here that no major competitor has, and the market supplies the argument:

- Roughly 40% of volunteer coaches quit within their first year, attributed to 16–20 hours per
  week of administrative work and parent friction.
- Recreational leagues are contracting under rising cost and record dropout.

Incumbents are optimizing the *watching* of the game — a fight that is over, and was won by
companies with exclusive hardware deals and retail balance sheets. Nobody owns the five minutes in
the driveway on Thursday.

The loop is already local: 30-second, 2-minute, and 5-minute home activities, skill cards, team
quest, streaks, coach-to-parent translation, Game Day Calm Mode
(`lib/domain/parent-replay.ts`, `lib/domain/rookie-coach-assist.ts`).

The upgrade: the loop currently ends at the parent. Give the **child** a visible artifact — a
skill card that fills in, a streak the child owns — so the app is opened voluntarily rather than
dutifully. This is where the "fun" in the product actually lives.

Dependencies: needs direction 1 for delivery. `Human-Reviewed AI Drafts` remains `Defer`; ship the
deterministic version, which is already built and needs no provider decision.

### 5. Commit to the family-first spine and cut the composition debt — 7/10

A guardian coordinates several children across several teams without switching accounts. The
incumbents are team-centric by architecture; the parent with three children in two leagues is the
most-drowning user in this market and the worst-served. The data model already supports it.

What blocks it is composition, not capability, as the LP-UX audit states: a 9,876-line
`components/feature-panels.tsx`, six shells, three simultaneous parent navigation models, and
`/parent/settings` duplicating the dashboard. The Home / Schedule / Messages / Family / More
information architecture is already a decision of record.

Market evidence for ranking this above new features: adoption rate dominates feature count — a
perfect app half the parents never sign up for loses to a simple one everybody uses. Spond is free
and simple. LeaguePilot will not out-feature free; it can out-clarify it.

Not ranked higher because LP-UX-001 through LP-UX-016 are already reducing this debt, and because
it is a means rather than a new capability.

## Explicitly not building

| Direction | Reason |
| --- | --- |
| Video, streaming, AI highlights | Exclusive incumbent hardware partnerships and retail-scale capital. Unwinnable. |
| Native Expo (`DEC-MOBILE`) | Stay PWA-first until measured need. App-store distribution solves nothing currently blocking adoption. |
| Sponsor billing (`DEC-BILLING`) | Revenue infrastructure for a product without users. Keep proof-only. |

One exception to promote out of "not building": `player_media_consents` having no application
writer is a broken seam, not a media strategy. Worth fixing as a defect while media stays
link-only under `DEC-MEDIA`.

## Next Evidence To Collect

Before reordering post-MVP investment, run the prepared community-discovery interviews across at
least organization admins, volunteer coaches, and parents/guardians, then update this document
from synthesized findings rather than intuition. The goal is to verify whether delivery, Parent
Replay, and family-first coordination are the strongest adoption and retention drivers for actual
league operators and families.

## Sources

- TeamSnap and XbotGo streaming partnership — <https://www.prnewswire.com/news-releases/teamsnap-and-xbotgo-partner-to-redefine-youth-sports-streaming-with-industry-first-fully-integrated-ai-powered-experience-302749882.html>
- The streaming war is not being fought by camera companies — <https://signaturelocker.com/blogs/youth-sports-investor-report/the-streaming-war-in-youth-sports-isnt-being-fought-by-camera-companies>
- Five youth sports trends for 2026 — <https://youthsportsbusinessreport.com/five-youth-sports-trends-were-watching-in-2026/>
- Youth sports in 2026: rising costs, record dropout — <https://fieldhouse.gg/blog/youth-sports-in-2026-trends-costs-and-what-coaches-can-do/>
- Kids need rec sports to make a comeback — <https://time.com/article/2026/04/02/kids-need-rec-sports-to-make-a-comeback/>
- Why it is getting harder to find youth sports coaches — <https://www.thegazette.com/sports/high-school/why-it-s-getting-harder-to-find-youth-sports-coaches/article_3c6df172-4198-5197-ba48-ac27cbc46a47.html>
- Best sports team management apps 2026 — <https://striveteamapp.com/the-5-best-sports-team-management-apps-in-2026-compared-honestly/>
- TeamSnap alternatives — <https://www.jerseywatch.com/blog/teamsnap-alternatives>
