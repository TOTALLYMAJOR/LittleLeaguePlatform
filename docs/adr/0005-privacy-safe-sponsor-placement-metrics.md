---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-25
---
# ADR 0005 - Privacy-Safe Sponsor Placement Metrics

## Status

Proposed

## Context

A sponsor renews when they can see that something happened. Today LeaguePilot can prove nothing:
`sponsor_placements` records that a placement was configured, and no code anywhere records that a
placement was ever rendered to anyone.

`docs/production-task-board.md:54` sets the target explicitly — "paid amount, placements delivered,
newsletter deliveries, impressions, unique visitors where analytics are configured, season completion
date, downloadable recap, and renewal offer" — and adds the constraint that "placement rendering
should record exposure without leaking child or parent data."

Two of those named metrics cannot be delivered honestly under this product's constraints, and saying
so is the central purpose of this ADR.

**Impressions** in the advertising sense means a viewable render attributed to a session. **Unique
visitors** requires distinguishing one person from another across requests. Both require visitor
identity — a cookie, a device fingerprint, a persisted IP, or a logged-in user id joined to a
placement view. Every one of those mechanisms is incompatible with this product:

- Hard rule 6 makes child privacy a default, not a setting. Families and children are the audience
  on every authenticated surface where a placement renders.
- The user's own sponsor-portal requirements exclude "ad-audience style targeting" and
  "estimated ROI if you do not have real evidence."
- `docs/capability-matrix.md:47` records the standing commitment that sponsor placement surfaces
  "never expose child profiles, parent contacts, private media, billing state, or redemption proof."
- Joining a placement render to an authenticated `parent` user would create, for the first time in
  this product, a record of what an individual family saw. That is an ad-tech dataset built on
  minors' households, and no sponsor revenue justifies creating it.

The decision cannot be "skip metrics," because a sponsor with no numbers has no reason to renew, and
the PRD's whole premise is that provable delivery is the sellable asset. The decision is therefore
about **which measurements are both real and safe**, and about naming them honestly enough that no
one downstream mistakes one for the other.

This is an architecture decision because it introduces a new data flow — a write on the read path of
family-facing surfaces — and because the vocabulary it establishes will be quoted back by sponsors
and must not drift.

## Decision

Measure only what the server can confirm without knowing who anyone is. Report renders and outbound
clicks under those names. Refuse to produce impressions, unique visitors, reach, or ROI, and state
the refusal in the sponsor-facing UI rather than hiding it.

### Decision Details

| Item | Content |
|---|---|
| **Decision** | Placement exposure is counted server-side at response construction into an append-only `sponsor_placement_events` table carrying no person-identifying column, rolled up daily into `sponsor_placement_daily_rollups`. Outbound clicks are counted through a server-side 302 redirect endpoint. Every sponsor-facing metric block carries an explicit "not measured" list. |
| **Why now** | Metrics shape the schema and the vocabulary. Adding them after the portal ships means either retrofitting a privacy model onto a live measurement table or shipping a portal with no value story. |
| **Why this** | Renders and outbound clicks are the only two exposure facts a server can confirm without identity, and clicks in particular are a genuine intent signal — the strongest honest metric available to this product. |
| **Known unknowns** | Whether outbound click volume at small-league scale clears the suppression threshold often enough to be useful; whether sponsors accept "renders" as a substitute for the "impressions" they are used to buying. |
| **Kill criteria** | If any person-identifying column, join key, or correlatable identifier is ever proposed for a metrics table — including a hashed user id, a session id, or a stored IP — this decision has failed its purpose and the metrics feature is withdrawn rather than amended. |

Concretely:

**What is measured**

| Metric | Definition | Confirmed by |
|---|---|---|
| `placement_renders` | A count of responses in which this sponsor's placement was included | Server, at response construction |
| `outbound_clicks` | A count of 302 redirects issued through `/sponsor-link/[placementId]` to the sponsor URL | Server, at redirect |
| `days_live` | Days the placement window was open and the placement was eligible to render | Placement row dates |
| `surfaces_live` | Distinct placement surfaces that rendered at least once | Rollup |
| `evidence_artifacts` | Count of persisted fulfillment evidence rows | Evidence table |
| `click_through_rate` | `outbound_clicks / placement_renders`, shown only when renders clear the suppression threshold | Derived |

**What is refused, permanently**

| Refused metric | Why |
|---|---|
| Impressions | Requires viewability plus session attribution; the product has neither and will not build them |
| Unique visitors / reach | Requires distinguishing people; the product refuses to identify viewers |
| Demographics, household, or audience segments | Would profile families and children |
| Estimated ROI, CPM equivalence, modelled value | No evidence exists; presenting a model as a measurement is the failure the PRD names |
| Per-family or per-user attribution | Prohibited absolutely; see kill criteria |

**Privacy mechanics**

- `sponsor_placement_events` columns: `id`, `organization_id`, `sponsor_id`, `placement_id`,
  `surface_key`, `occurred_on date`, `event_kind` (`render` | `outbound_click`), `created_at`. There
  is **no** `user_id`, no session id, no IP, no user agent, no referrer, no device identifier, and no
  column from which any of those could be reconstructed.
- Date granularity is `date`, not `timestamptz`, on the analytic column. A per-second timestamp on a
  small league is itself a correlatable identifier when combined with schedule data.
- **Suppression threshold of 25.** A rollup bucket below 25 events displays "below reporting
  threshold" instead of a number. This prevents a five-render count on a small team page from
  becoming an inference about who was online.
- **Bot and prefetch exclusion.** Requests identified as crawler or prefetch are not counted, and
  the exclusion is applied at write time, not at report time.
- **Best-effort, never blocking.** A metric write failure must never fail or delay the host page
  response. Counting is fire-and-forget.
- **Retention.** Raw events are retained 90 days; rollups are retained for the life of the
  agreement. Portal and recap reads use rollups exclusively and never scan raw events.
- **Honest labelling is a functional requirement.** Every metric block in the portal renders a
  populated "not measured" list. An empty list is a test failure, not a styling choice.

## Rationale

### Options Considered

| Option | Sponsor-credible | Person-free | Works signed-out and signed-in | New third-party dependency | Compatible with hard rule 6 |
|---|---|---|---|---|---|
| A. No metrics — delivery evidence only | Weak | Yes | Yes | None | Yes |
| B. Client-side analytics (GA, Plausible, custom pixel) | Strong | No | Yes | Yes | No |
| C. Server-side renders + outbound clicks, person-free (**chosen**) | Adequate and honest | Yes | Yes | None | Yes |
| D. Authenticated-user-attributed views | Strongest | **No** | Signed-in only | None | **No — disqualifying** |

**Option A** is the safe default and it under-delivers. "We put your logo up for eleven weeks" with
no volume figure gives a sponsor nothing to compare against next season, and renewal becomes a
goodwill decision. Evidence proves delivery; metrics prove scale. The PRD needs both.

**Option B** is what every competitor does and it is unavailable here on principle. A third-party
analytics script on a page rendering children's schedules sends family browsing behaviour to an
external processor. Even a self-hosted, cookie-less variant introduces a client-side collection
surface on family-facing pages, plus a new external dependency under hard rule 4. Rejected.

**Option D** deserves the clearest rejection because it is the most tempting: the data is already
there. LeaguePilot knows a signed-in parent loaded the team portal, and joining that to a placement
would produce a genuinely accurate impression count. It is rejected because it would create a
persistent record of what identifiable families viewed, on a platform whose entire trust position is
that it does not do that. It would also be invisible to signed-out visitors, making it both unsafe
and incomplete.

**Option C** is chosen because both of its measurements are things the server already knows as a
consequence of doing its job. Rendering a page is a fact. Issuing a redirect is a fact. Neither
requires observing a person. The outbound click in particular is the honest analogue of the metric
sponsors actually care about — someone was interested enough to go to their site — and it is
measurable with a 302 and no identity whatsoever.

### Positive Consequences

- Sponsors get a real number and a real trend without the product acquiring an ad-tech dataset.
- The click redirect gives LeaguePilot the single most persuasive sponsor metric available to it,
  measured with nothing more exotic than an HTTP status code.
- The "not measured" list converts the product's main weakness into a credibility signal. A vendor
  that names what it cannot prove is more believable about what it can.
- No third-party processor, no cookie banner, no consent surface, no new external dependency.
- The privacy invariant is checkable by a schema assertion in CI rather than by review discipline.

### Negative Consequences

- Renders overstate exposure relative to true viewability. A placement below the fold counts. This
  must be stated in the "not measured" list rather than silently absorbed.
- Small leagues will frequently sit below the suppression threshold, so early sponsors may see
  "below reporting threshold" on several deliverables in their first season.
- The outbound-click redirect adds a hop between the sponsor logo and the sponsor site, costing a
  small amount of latency and requiring careful `rel` and redirect-safety handling.
- Sponsors accustomed to buying "impressions" will need the vocabulary explained, and some will
  discount the offer for it.
- A write on the read path of family-facing surfaces is new and must be proven not to degrade them.

### Neutral Consequences

- Rollup jobs add an operational surface, but one with no user-visible failure mode beyond stale
  numbers.
- The `surface_key` vocabulary reuses the existing five `placement_key` values from
  `0002_platform_hardening.sql:321`, so no new placement taxonomy is introduced.

## Architecture Impact

Introduces a write on the read path of family-facing and public surfaces for the first time. The
write is buffered and fire-and-forget; it is a hard requirement that no page render depends on it
completing or succeeding.

Introduces an aggregation layer (`sponsor_placement_daily_rollups`) between raw records and every
consumer. No sponsor-facing or admin-facing read may query the raw event table directly, which keeps
retention policy and suppression enforcement in one place.

Adds `/sponsor-link/[placementId]` as a public redirect route, which must be registered in
`lib/navigation/route-topology.ts` and rate-limited, since it is an unauthenticated endpoint that
performs a write.

Establishes a schema-level invariant enforced in CI: no table whose name begins `sponsor_placement_`
may contain a column referencing `profiles`, `players`, or `auth.users`, or named in the
person-identifier deny list.

## Implementation Guidance

- **Name metrics by what they prove.** "Renders," not "impressions." "Outbound clicks," not "visits."
  If a name would flatter the number, it is the wrong name.
- **The "not measured" list is content, not chrome.** It is authored per metric and asserted by test.
- **Count at the server, never at the client.** No script, no beacon, no pixel, on any surface.
- **No identity, not even hashed.** A hashed user id is a person-identifying column. So is a session
  id. So is a stored IP, salted or not.
- **Fail open on the page, closed on the number.** A metric write that fails is dropped silently and
  the page renders; a metric read that fails shows "temporarily unavailable," never a zero.
- **Suppress before display, not after.** Thresholding happens in the read adapter so no consumer can
  forget it.
- **Rollups are the only public surface.** Raw events are an implementation detail with a 90-day life.

## Verification

- A schema assertion in CI fails if any `sponsor_placement_*` table gains a column that references
  `profiles`, `players`, or `auth.users`, or matches the person-identifier deny list.
- An executed test proves a render write failure leaves the host page response unchanged in status
  and body.
- An executed test proves a bucket of 24 events renders "below reporting threshold" and a bucket of
  25 renders a number.
- An executed test proves `/sponsor-link/[placementId]` issues a 302 to the sponsor's stored HTTPS
  URL, persists an `outbound_click` event, and persists nothing about the requester.
- An executed test proves crawler and prefetch requests do not increment counts.
- A component test proves every metric block renders a non-empty "not measured" list.
- Response-time measurement proves placement counting adds under 15 ms at p95 to a host page render.

## Related Information

- ADR 0003 — Sponsor Revenue Spine Persistence. Supplies the placements and requirements measured here.
- ADR 0004 — Sponsor Portal Access Without A Fourth Role. Supplies the surface these metrics render on.
- PRD FR-4 and AC-012 through AC-016: `docs/prd/sponsor-program-prd.md`.
- Target metric list: `docs/production-task-board.md:54`.
- Standing privacy commitment: `docs/capability-matrix.md:47`.
- Existing placement taxonomy: `0002_platform_hardening.sql:321`.
