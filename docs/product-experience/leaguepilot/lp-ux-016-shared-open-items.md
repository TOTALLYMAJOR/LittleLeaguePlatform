---
authority: active
answers: product-direction
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# LP-UX-016 Shared Open Items — Product Direction and Role-Home Designs

Date: 2026-08-22

Status: `direction-proposed` — analysis and design only. No application code, schema, or configuration was changed by this entry.

Branch: `claude/youth-sports-strategy-ywr6kk`

Request: determine what the product truly is, why the experience feels dense despite substantial capability, and what single direction should organize workflows, information architecture, data model, UX, and implementation — grounded in repository evidence rather than plans.

## 0. Evidence discipline

Repository inspection only: 62 pages, 106 route handlers, 93 tables, 55 SQL functions, 276 domain functions, 18.3k lines of CSS, plus the migration chain, RLS helpers, and the numbered UX series.

Executed against unmodified `b23b6ca`:

- `npm test` — **129 files / 739 tests passing**
- `npm run typecheck` — **clean**

These are a baseline of the current branch, not verification of any change. Not executed: the running app, hosted behavior, RLS against a live database. Every runtime claim below is repository-derived. No screenshots were supplied to the session that produced this entry.

Claims are marked OBSERVED (directly evidenced), CONFLICT (evidence disagrees), or PROPOSED (recommended future behavior). Nothing here describes a planned or partial capability as live.

## 1. The finding: the architecture already exists, implemented twice

The Event-as-canonical-object hypothesis is **confirmed at the database layer** and **already half-built in TypeScript** — but the parent surface and the coach/admin surfaces run two separate, non-overlapping implementations of the same idea.

### C1 — Two competing family truth models (CONFLICT)

`lib/season-certainty.ts` (1,033 lines) exports a complete three-role projection set over a shared `TeamReadinessSnapshot` type:

- `buildParentSeasonCertaintyView` (line 241)
- `buildCoachSeasonCertaintyView` (line 358)
- `buildAdminSeasonCertaintyView` (line 447)

Coach home and admin home consume theirs (`components/feature-panels.tsx:2850`, `:4177`). **Parent home does not.** `app/parent/_surfaces.tsx` calls `buildFamilyMissionControl` from `lib/family-mission-control.ts` (373 lines) with a separate `ChildReadinessLane` type. `buildParentSeasonCertaintyView` is reachable **only** on the signed-out / access-denied fallback path (`feature-panels.tsx:2004`).

The canonical parent projection exists and is dead on the authenticated route.

### C2 — The two lane vocabularies do not overlap (CONFLICT)

| Parent lanes (`components/family/readiness.ts`) | Coach lanes (`TeamReadinessSnapshot`) |
| --- | --- |
| `rsvp` | `snackCoverage` |
| `critical-message` | `volunteerCoverage` |
| `transportation` | `weatherStatus` |
| `changes` | `fieldStatus` |
| `schedule-conflict` | `coachUpdateStatus` |
| | `guardianAccessStatus` |
| | `mediaReviewStatus` |
| | `providerReviewStatus` |
| | `aiDraftReviewStatus` |

Five family lanes. Nine operator lanes. **No lane appears in both.** The parent's definition of "ready" and the coach's definition of "ready" are disjoint computations that cannot contradict each other because they never touch.

### C3 — `guardianIssues: 0` is a hardcoded literal (CONFLICT)

`buildCoachSeasonCertaintyView` passes `guardianIssues: 0` into `buildReadinessSnapshot`. The coach's `guardianAccessStatus` lane is structurally always green. A coach cannot learn that a family on their roster cannot see the schedule.

### C4 — The coach cannot read four of the five family lanes (CONFLICT)

- `lib/supabase/transportation.ts` exports `listParentTransportationData` only — no coach or team reader.
- `lib/supabase/notification-receipts.ts` exports `listParentNotificationReceipts` (guardian-scoped) and `listOrganizationNotificationReceipts` (org-admin-scoped) — **no team-scoped reader**.

Consequence: **the admin can see who acknowledged a critical message; the coach who wrote it cannot.** The coach's only window into family state is `coachRsvpTargets` (RSVP only), built in `lib/supabase/dashboard-data.ts:685`.

### C5 — Media consent is readable but not writable (CONFLICT)

`player_media_consents` is read by `lib/supabase/private-media.ts:268` and `lib/supabase/family-replays.ts:140`. No application writer exists in `app/`, `lib/`, or `components/`. Family media is structurally unreachable end to end, independent of the `MEDIA_UPLOADS_ENABLED` gate. Corroborates `01-current-experience-audit.md` ("REQUIRED BUT MISSING").

### C6 — Team manager is a documented role with no implementation (CONFLICT)

`team_memberships.role` and the RLS helpers know `coach` only (`rls_user_is_assigned_coach`). Team-manager work must currently be performed as a coach.

### C7 — Triple naming for one capability (CONFLICT)

`/coach/practice-recaps` is labelled "Parent Replay"; `/parent/practice-recaps` is labelled "Practice Replays"; `/coach/parent-replay` also exists. Separately, `/coach/attendance` is labelled "RSVPs" while `event_attendance` means something different, and `/coach/roster` is labelled "Team Portal".

### C8 — A per-family response-rate score exists (CONFLICT with §7 boundaries)

`lib/domain/community-safety.ts:271` computes `responseRate` per guardian; `getCoachRsvpReliability` surfaces it with a `reminderMode` label. Coach-private today, but this quantifies **adult** compliance per family and is one render from becoming a comparison surface.

### Nothing sends (OBSERVED)

`.env.example` sets `PROVIDER_SENDS_ENABLED=false`, `PINGRAM_SMS_SENDER_READY=false`, `PROVIDER_PRODUCTION_APPROVED=false`, and `AI_COACH_PROVIDER_ENABLED=false`. Two further gates, `PAYMENTS_ENABLED` and `MEDIA_UPLOADS_ENABLED`, are defined in `lib/services/feature-gates.ts:10-11` and are absent from `.env.example`, so they are undefined rather than explicitly disabled. `featureGateDecision` requires both the environment switch and the organization flag, so an undefined switch is off.

The product is pull-only today. Any direction that assumes a push channel is not currently shippable.

## 2. The direction: Shared Open Items

> Every practice and game has one short list of what is still unsettled, and the family, the coach, and the league all read the same list.

The product does not communicate, schedule, or remind. It **settles obligations attached to a child's participation in an event, and records who settled them and when.** RSVP settles attendance intent; transportation settles who drives; snack claim settles who brings; acknowledgment settles who was told; attendance settles who came; change logs record what invalidated a prior settlement.

The leap is not to build that architecture — it largely exists. It is to **name the open item once, compute it once, and let all three roles read the same row.** That converts three private truths into one shared one, needs no new table, enum, or migration, and works with every send channel switched off.

### Why this and not the alternatives

- **A proof layer** ("nobody can say they weren't told") fits the acknowledgment architecture exactly and sells to admins, but is invisible to the two roles that must adopt it daily.
- **A season memory** ("your child's season, kept") is emotionally strong but delivers value at season end, and is blocked on the missing consent writer (C5).

## 3. The object model (PROPOSED)

The Event is the canonical **spine** — OBSERVED: 21 FK references across 9 migrations, `event_change_logs` gives it typed diff history, and `events.schedule_version` makes it the invalidation authority.

The Event is **not the unit of work**, and the schema already says so. Both `rsvps` and `event_attendance` carry **`unique (event_id, player_id)`**. The Event alone cannot express "Maya is settled and Theo is not" — the entire experience of a two-child family.

```
Event (anchor, versioned)
  └─ Participation  = (event_id, player_id)          ← derived from roster ∩ event
       └─ OpenItem   = (participation, lane, owner)  ← derived, never stored
```

- **Anchor: Event.** Authoritative, versioned, coach/admin-written.
- **Atom: Participation.** Already unique-constrained. Not a table.
- **Unit of work: the Open Item.** Derived, never stored as a boolean.

Staleness is already derivable with no schema change: `rsvps.confirmed_schedule_version < events.schedule_version`.

Roughly 70% of the Open Item concept already exists in scattered form: `ReadinessItem` (`components/family/readiness-strip.tsx`) carries id/label/href, and `buildActionPriority` (`lib/operational-truth.ts:206`) already produces a deterministic explainable score carrying `requiredRole` and `authorityRequirement` — the owner field.

### Lanes (PROPOSED)

`attendance_intent` · `ride` · `bring` · `read_critical` · `reviewed_change` · `conflict` · `access_integrity` · `field_status` · `venue_complete`

States: `open` · `settled` · `not_required` · `blocked` · `invalidated`. `not_required` requires a real underlying record; absence of evidence renders `blocked`, never `settled`.

## 4. Role projections

| Role | Question | Projection |
| --- | --- | --- |
| P/G | What must I do, and can I do it here? | Family Certainty — items for linked children, cleared inline |
| C | Who isn't settled, and why? | Team Readiness — roster items, aggregated and per-family |
| A | Where will this weekend fail? | League Visibility — events ranked by unresolved items with named evidence and one owner each |

Fourteen current destinations are views over this one object: parent home/schedule/rsvp/transportation/messages, coach home/attendance/rsvps/snacks-volunteers/weather-fields, admin overview/schedule-venues/safety-weather/family-access.

## 5. Design: three role homes

Canvas: `lp-ux-016-design/` (`Main.dc.html`, `Coach.dc.html`, `Admin.dc.html`, `canvas.json`). Phone artboards at 390px.

Built from `app/globals.css` resolved values, not from the `04` prose. Two corrections were applied after rendering the canvas in a browser and measuring it:

1. **The RSVP control was painting `Going` solid orange on an unanswered card** — reproducing the defect `01-current-experience-audit.md` records under `/parent/rsvp` ("'Going' pre-tinted action color on unanswered cards"), and putting two orange solids on one viewport where `04 §5.1` allows one. Now three equal-weight neutral segments; colour arrives only with an answer.
2. **Artboard heights were guesses.** Measured content needs are 1222 / 1202 / 1064; frames were reduced from 1360 / 1400 / 1280 to 1280 / 1260 / 1120.

### Design decisions worth challenging

- **The coach screen is a list, not a kids × lanes grid.** Five lane columns plus a name column does not survive 390px without abbreviating lane names, which violates `04 §6` ("icons never carry meaning alone"). The mobile form names each open lane in words. The grid remains the desktop expression.
- **Roster order, deliberately.** Sorting families worst-first is the shame vector. Amber is visible without it.
- **Access problems are labelled league-owned**: "Their silence isn't a reply — the league is fixing access." Without that sentence a coach reads two unlinked families as two parents ignoring them.
- **Open for reaction:** the coach screen names unsettled families (first name + last initial, per `AGENTS.md` rule 2). Whether that reads as "who to help" or "who's failing" needs a real coach's response before it hardens.

## 6. Token drift found (`04` vs `app/globals.css`)

`04-production-design-system.md` states its literals live in `:root`. Three have drifted:

| Token | `04` says | `globals.css` has |
| --- | --- | --- |
| `--radius-sm` | 8px | **9px** |
| Type scale | 12/14/16/17/19/22/28/34 | **12/14/16/16.96/19.2/21.6/26.4/32** |
| `--status-changed` | marked NEW | **already shipped** (`#4c4ddc`) |

Code is authoritative. `04`'s re-pinned type scale has not landed.

Unvalidated by `04`'s own admission and still unproven: `--action` `#c94f17` ("4.55:1 on white at 14px/700 — validate before adopting") and `--status-changed` tinted usage. 4.55:1 leaves ~1% headroom over the AA floor.

## 7. Constraints any implementation must honor

- No new table, column, enum, migration, or workflow state. `OpenItemState` is a derived presentation state computed per render — per the LeaguePilot invariant "preserve existing workflow enums and derive presentation states from evidence."
- The lane and state unions live in `lib/open-items.ts`. **Not** in `lib/domain/` — `codex-rules.md` Rule 1 forbids modifying it without explicit instruction, and its Violation Examples name `contracts.ts` and `types.ts` directly.
- `lib/supabase/` is a declared contract root in `.agentflow.yaml`. Work touching it runs the `integration` validation lane, not `task_default`.
- Guardian and family boundaries: a guardian reads only linked children; a coach reads only assigned teams and never a guardian's private contact detail. Health notes and emergency contacts stay in their restricted partition and never enter a prompt, export, or parent-visible surface.
- Child safety: no child-visible surface, no ranking, no comparison across children, no scoring, no gamification.
- Review-only AI: Preview → Edit → Approve → Publish. No autonomous publish.
- **No provider call, and no copy that implies delivery.** Say "You'll see changes here", never "we'll text you".
- Remove `responseRate` from every coach-visible surface (C8). Keep the neutral, event-scoped fact — "3 families haven't answered for this event" — with no rate, no per-family history, no cross-family ordering. A count about an event is operations; a rate about a family is a report card.

## 8. What is NOT decided

- Whether the coach screen should name unsettled families at all (§5).
- Whether to retire `buildFamilyMissionControl` or reduce it to an adapter.
- Pricing, packaging, and whether a league will pay for reduced coordination work absent a compliance mandate. No pricing evidence exists in this repository.
- The visual direction. The canvas is a structural pass on existing tokens; an external style reference was requested but could not be retrieved (the session's network egress allowlist blocked it).

## 9. Route facts that correct earlier assumptions

Parent primary navigation is **already** the five destinations a consolidation would propose. `route-topology.test.ts:187` (passing) asserts `/parent`, `/parent/schedule`, `/parent/messages`, `/parent/family-access`, `/parent/more` and explicitly asserts `/parent/rsvp` and `/parent/settings` are *not* in primary nav.

`components/family/canonical-reachability.test.tsx:41` requires all ten canonical parent routes — including `/parent/rsvp` and `/parent/settings` — to **remain topology entries**, and asserts `/parent/rsvp?eventId=` survives as a contextual action.

So "retire `/parent/rsvp`" is a test-contract violation. The correct instruction is: keep the route, make it the needs-answer filter, add inline clearing on Home.

## 10. Suggested first slice (PROPOSED, not scheduled)

`lib/open-items.ts` — one lane union, one pure `selectOpenItems`, reusing `buildActionPriority` for owner and rank. Four team-scoped readers closing C4. Kill the hardcoded `guardianIssues: 0` (C3). Converge the three role homes on the one selector (C1/C2). Inline clearing for attendance intent and ride. Extract the four home surfaces out of `components/feature-panels.tsx` (9,876 lines, imported by 10 entry points) so parallel work is possible.

Acceptance test that matters most: **exactly one lane union is exported, and all three role read models import it.** If two lane vocabularies survive, C2 has recurred.
