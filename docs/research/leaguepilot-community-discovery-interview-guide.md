# LeaguePilot Community Discovery Interview Guide

## Research status

`Prepared — interviews not yet conducted`

This guide turns the current LeaguePilot feature and market hypotheses into evidence-seeking conversations with organization administrators, volunteer coaches, and parents or guardians. It is not evidence that any participant wants a proposed feature. Findings become decision evidence only after interviews are completed and synthesized.

Related artifact: [LeaguePilot role journey map](leaguepilot-role-journey-map.md).

## Evidence boundary

- Current product behavior is grounded in [`docs/Features.md`](../Features.md), [`docs/capability-matrix.md`](../capability-matrix.md), [`docs/production-task-board.md`](../production-task-board.md), and [`lib/navigation/route-topology.ts`](../../lib/navigation/route-topology.ts).
- `EXT-HOSTED-SESSION` remains the definition-of-shipped gate. A local route, test, or document is not hosted acceptance.
- Provider delivery remains draft/internal only, media remains link-only, sponsor billing remains proof-only, mobile remains PWA-first, and Preview OpenAI remains disabled.
- Children are not interview targets for this round. LeaguePilot treats children as protected participants whose access is controlled by adults.
- Do not record child names, contact details, medical information, custody information, credentials, or organization secrets in research notes.

## Research objectives

1. Learn which recurring jobs create the most stress, duplicated work, missed participation, or loss of trust.
2. Determine whether activation, weekly coordination, family contribution, or developmental connection is the strongest retention driver for each role.
3. Understand the current tool stack, workarounds, switching costs, and failure history before discussing LeaguePilot concepts.
4. Test whether volunteer, snack, ride, and caregiver coordination produces meaningful community participation or merely more administrative overhead.
5. Test whether Parent Replay strengthens the parent-coach partnership enough to differentiate LeaguePilot from operational platforms.
6. Identify the minimum communication experience people trust before live email, SMS, or push delivery is reconsidered.
7. Establish which market-table-stakes gaps—full program registration, waivers, fees, scorekeeping, streaming, or statistics—actually affect purchase or renewal decisions.

## Decisions this research should inform

- What follows `EXT-HOSTED-SESSION` in the product sequence.
- Whether to prioritize a unified Community Center over additional administrative or media features.
- Whether full program enrollment, waivers, and family fee collection must enter the commercial roadmap.
- Which in-app communication and acknowledgment loops are sufficient while external provider delivery remains postponed.
- Whether Parent Replay should remain the signature differentiator and receive deeper investment.
- Which features should remain postponed despite competitor availability.

## Canonical sync targets after synthesis

When interviews are complete and synthesized, propagate the resulting decisions to the canonical repo docs rather than leaving findings only in research notes.

- Update [`docs/production-task-board.md`](../production-task-board.md) if interview evidence changes the post-`EXT-HOSTED-SESSION` order.
- Update [`docs/product-direction-2026-08.md`](../product-direction-2026-08.md) if market-positioning claims need correction from field evidence.
- Update [`docs/Features.md`](../Features.md) only if a capability state or explicit decision boundary changes.
- Keep raw notes and recordings outside Git; only summarized findings and resulting product decisions belong in repository docs.

## Hypotheses to test, not statements of fact

| ID | Hypothesis | Disconfirming evidence to seek |
| --- | --- | --- |
| H-01 | Families return because schedule, assignment, and next-action truth is reliable. | Families primarily return for scores, video, social content, or payments rather than coordination. |
| H-02 | Administrators will not switch without end-to-end registration, waivers, and fee collection. | Administrators already have satisfactory payment tools and would adopt LeaguePilot as an operations layer. |
| H-03 | Coaches value reduced communication and attendance work more than advanced analytics. | Scorekeeping, statistics, video, or lineup tools dominate purchase and adoption decisions. |
| H-04 | Clear volunteer, snack, ride, and caregiver roles increase belonging and reduce burnout. | These workflows create conflict, feel intrusive, or are handled better outside the league platform. |
| H-05 | Parent Replay produces a stronger parent-coach relationship and at-home participation. | Families ignore coaching recaps or view them as extra homework and notification noise. |
| H-06 | Trust depends on visible role scope, privacy, and acknowledgment evidence. | Participants prioritize convenience enough to accept broad access or ambiguous delivery state. |

## Evidence strength scale

Use one shared evidence label during synthesis so backlog changes are based on comparable signals rather than interviewer tone.

| Label | Meaning | Minimum standard |
| --- | --- | --- |
| `weak` | One-off anecdote or speculative preference. | One participant, no repeated recent behavior, no meaningful workaround or cost. |
| `moderate` | Repeated issue, but still role- or context-limited. | At least two participants or one severe concrete workflow failure with clear cost. |
| `strong` | Repeated behavior with consequence across more than one participant or role. | At least three independent incidents and a clear cost in time, trust, participation, or money. |
| `very strong` | Persistent pattern with cross-role confirmation and clear product implications. | Multiple participants across at least two roles plus visible workaround, spend, or switching behavior. |

When in doubt, round down. Evidence should become stronger through repeated observation, not interpretation.

## Recruiting plan

Recruit for behavioral contrast, not demographic stereotypes.

| Segment | Target | Include |
| --- | ---: | --- |
| Organization administrators or league directors | 5–7 | New-season and returning-season operators; volunteer-led and paid staff; small and multi-division leagues. |
| Volunteer coaches or team managers | 5–7 | First-year and experienced coaches; people using multiple coordination tools; coaches with and without team-parent help. |
| Parents or guardians | 8–10 | New and returning families; multi-child households; families with limited schedule flexibility; families that volunteer and families that cannot. |

Recruit some participants who use TeamSnap, SportsEngine, LeagueApps, GameChanger, spreadsheets, group text, email, or paper processes. Do not recruit only friendly LeaguePilot stakeholders.

## Interview format

- Length: 30–40 minutes.
- Interviewer/listener split: one person asks questions; one person captures evidence when possible.
- Conversation ratio: participant approximately 80%, interviewer approximately 20%.
- Ask about recent behavior and specific incidents. Do not pitch LeaguePilot or ask whether a hypothetical feature sounds useful.
- Ask permission before recording. If permission is declined, take privacy-safe notes only.

## Opening — 2–3 minutes

> Thank you for speaking with us. We are learning how youth-sports organizations, coaches, and families coordinate a season. We are not selling or testing you, and there are no right or wrong answers. We are most interested in specific things that happened recently. We have about 35 minutes. Is that still okay? May we record for research notes, or would you prefer notes only?

## Warm-up — 5 minutes

1. Tell me about your role in youth sports and what a typical week looks like during the season.
2. How many teams, children, or programs do you coordinate?
3. Which tools, messages, calendars, spreadsheets, or paper processes did you use last week?
4. What part of the season are you in now: preparation, registration, active play, tournament, or closeout?

## Shared core exploration — 10–15 minutes

1. Walk me through the last time something important changed before a practice or game.
2. How did you first learn about the change? What happened next?
3. How did you determine whether everyone who needed the information had received and understood it?
4. Tell me about the last time someone missed an event, deadline, assignment, or responsibility. What caused it?
5. What did you have to copy between tools or enter more than once?
6. Tell me about the last time access to a roster, child, team, photo, or message was wrong or uncertain.
7. What is the most time-consuming recurring task during an ordinary week?
8. What have you already tried to make that task easier? What happened?
9. What does a well-run Saturday feel like? What evidence tells you it went well?
10. Which problem has caused you to consider changing tools or processes?

Use neutral probes:

- “Tell me more about that.”
- “Can you give me a specific example?”
- “What happened next?”
- “Who else was involved?”
- “How long did that take?”
- “How did you recover?”
- “What did that cost in time, money, or trust?”

## Admin module — 10 minutes

1. Walk me through the most recent season launch, from opening registration through publishing teams.
2. Where did registration, waivers, payments, roster data, coach assignments, and parent access live?
3. Tell me about the last registration or roster record that required manual repair.
4. How did you decide teams were ready to publish? What information was missing?
5. What happened the last time an invite went to the wrong address, expired, or reached the wrong household?
6. Which reports or dashboards did you check before the first event?
7. Tell me about the last communication failure that reached multiple teams or families.
8. What evidence do you need before believing a payment, message, roster change, or archive action completed?
9. How much staff or volunteer time did setup consume? Which step created the most support requests?
10. When you last evaluated software, which requirements eliminated a product immediately?

Decision probes:

- Which current system is hardest to replace, and why?
- What did you pay for software, payment processing, texting, websites, or manual support last season?
- What would have to be proven before moving one league or division to a new platform?

## Coach module — 10 minutes

1. Walk me through how you prepared for the last practice or game.
2. How did you know who was attending, arriving late, bringing equipment, or handling a team responsibility?
3. Tell me about the last time you had to chase families for an answer.
4. What do you do when the schedule, venue, weather, or roster changes at the last minute?
5. How do parents know which message is official rather than conversational?
6. Tell me about the last practice when you wanted families to reinforce something at home. What did you send, and did anyone respond?
7. How are snack, volunteer, scoring, transportation, or other game-day responsibilities assigned?
8. Which tools do you use during the event, and what happens when connectivity is poor?
9. Tell me about a feature you stopped using because it created more work than it saved.
10. Which task would you gladly delegate to a trusted team parent, and what access would they need?

Decision probes:

- In the last month, which mattered more: attendance, messaging, schedule changes, scorekeeping, statistics, video, or practice planning? Why?
- What would make you refuse a league-mandated app?
- What would make you recommend it to another coach?

## Parent or guardian module — 10 minutes

1. Walk me through how your family joined the team this season.
2. Tell me about the last invitation, registration, or team-assignment problem you experienced.
3. How do you determine where your child needs to be, when to leave, and what to bring?
4. Tell me about the last schedule change. How did it affect work, school, transportation, or another child’s activity?
5. How many places do you check for schedules, messages, photos, payments, and volunteer responsibilities?
6. Tell me about the last time you volunteered, brought snacks, arranged a ride, or helped another family. What made that easy or difficult?
7. If you could not attend an event, how did you stay connected to the team and your child’s experience?
8. What information about your child or household are you unwilling to place in a team app?
9. Tell me about the last coach recap, practice note, video, or at-home activity you actually used.
10. What causes you to mute, ignore, or leave a team communication channel?

Decision probes:

- Which recent interaction made the team feel like a community rather than a schedule?
- What creates confidence that a message or request is official?
- What would make you recommend the league experience to another family?

## Priority and switching evidence — 5 minutes

Do not show a feature list first.

1. Of the problems we discussed, which one would you solve first?
2. Which problem costs the most time, money, participation, or trust?
3. What did you do the last time you looked for a better solution?
4. What would you have to stop using, migrate, or retrain to switch?
5. What proof would you need before trusting a new system with one real team?

If the participant has already described the relevant behavior, ask them to rank only those experienced jobs:

- joining and gaining access;
- knowing the next event and responding;
- receiving and acknowledging official changes;
- coordinating family contributions;
- connecting practice to home;
- recording scores, video, or statistics.

## Wrap-up — 3–5 minutes

1. What important part of the experience did we not discuss?
2. Who else sees this problem differently and should be interviewed?
3. May we contact you once to clarify the notes?
4. Thank the participant and explain that no product or provider action will occur from the interview alone.

## Note-taking template

```md
# Interview note — [participant ID]

- Date:
- Role:
- Organization/team scale:
- Season stage:
- Current tools:
- Recording permission: yes / no

## Specific incidents

### Incident 1
- Trigger:
- Steps taken:
- People involved:
- Time or money cost:
- Outcome:
- Verbatim quote:

## Jobs to be done

- Functional job:
- Emotional job:
- Social/community job:

## Evidence

- Biggest demonstrated pain:
- Existing workaround:
- Switching cost:
- Existing spend:
- Trust/privacy concern:
- Community contribution behavior:
- Surprise finding:

## Signals

- Hypothesis supported:
- Hypothesis challenged:
- Follow-up required:
- Product decision this could inform:
```

Use participant IDs rather than names in the research repository. Store recordings and raw personal data only in an approved research system, never in this Git repository.

## Synthesis rules

- Separate `Observed behavior`, `Participant interpretation`, and `Team inference`.
- Do not count compliments, feature enthusiasm, or hypothetical intent as demand.
- Look for repeated recent incidents, existing workarounds, money or time already spent, and meaningful switching behavior.
- Compare patterns by role and organization scale; do not collapse admin, coach, and parent needs into one generic persona.
- Require at least three independent participants showing the same high-severity behavior before promoting a new feature solely from interviews.
- Link any resulting backlog change to a summarized finding, never to raw personal data.
- If the synthesis recommends no priority change, record that explicitly so the approved MVP queue remains the default.

## Synthesis output template

Use a single repo-safe summary per interview round. Keep participant privacy out of the file and make every recommendation traceable to repeated observed behavior.

```md
# LeaguePilot community discovery synthesis — [date or round]

## Coverage
- Interviews completed:
- Admin participants:
- Coach participants:
- Parent/guardian participants:
- Leagues represented:
- Tools represented:

## Repeated observed problems
| ID | Problem | Roles affected | Evidence strength | Current workaround | Cost/trust impact |
| --- | --- | --- | --- | --- | --- |

## Hypothesis disposition
| Hypothesis | Status: supported / mixed / challenged / inconclusive | Notes |
| --- | --- | --- |

## Implications for current priorities
- Keep as-is:
- Raise after `EXT-HOSTED-SESSION`:
- Lower or postpone:
- No evidence yet:

## Canonical doc updates required
- `docs/production-task-board.md`:
- `docs/product-direction-2026-08.md`:
- `docs/Features.md`:
- `docs/capability-matrix.md`:

## Explicit non-decisions
- What this research does not justify changing yet:
```

Recommended discipline:

- Summarize evidence by repeated job failure, not by preferred feature requests.
- Write one line per required canonical-doc change so backlog edits are mechanical rather than interpretive.
- Preserve a `no priority change` outcome when the research is mixed or weak.

## Priority-change threshold

Do not treat one loud interview or one strategic opinion as backlog authority. A priority change is justified only when all of the following are true:

- The problem appears in at least three independent interviews.
- At least two different roles report the same underlying job failure or trust failure, unless the issue is role-exclusive by nature.
- The problem affects weekly coordination, activation, renewal, or trust strongly enough to outrank currently postponed work.
- The recommended change can be described as a backlog or decision update in one sentence without inventing new undefined scope.
- The recommendation does not silently reopen an existing explicit decision boundary without naming it.

If those conditions are not met, keep the queue unchanged and record the research result as a watch item rather than a reprioritization.

## Common coding tags

Use a small fixed tag set during synthesis so findings can roll up into the canonical docs without rewording every interview.

| Tag | Use for |
| --- | --- |
| `activation` | Registration, invite, access, and assigned-team entry problems. |
| `weekly-truth` | Schedule, RSVP, official change, and acknowledgment certainty. |
| `community-contribution` | Snacks, rides, volunteers, caregiver handoffs, and bounded help. |
| `coach-admin-load` | Repeated manual reconciliation, chasing, setup, or support burden. |
| `development-loop` | Parent Replay, practice-to-home carryover, and child-visible progress. |
| `trust-safety` | Privacy, authorization, proof, role scope, and audit-confidence concerns. |
| `table-stakes-gap` | Missing enrollment, waivers, fees, scorekeeping, video, or stats that affect purchase or renewal. |
| `decision-boundary` | Findings that would reopen `DEC-PROVIDER`, `DEC-MEDIA`, `DEC-BILLING`, `DEC-MOBILE`, or `DEC-PREVIEW-OPENAI`. |
