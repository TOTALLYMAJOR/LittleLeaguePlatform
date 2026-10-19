---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-10-19
---
# LP-UX-028: Ready Board reference and motion candidate

Date: 2026-10-19
Status: Owner accepted the visual candidate and authorized publication on 2026-10-19; release verification recorded separately
Candidate branch: `codex/leaguepilot-landing-workflow-pilot-20261019`
Release branch: `codex/leaguepilot-landing-release-20261019` from current `origin/main`
Base HEAD: `98597e8fd52ed78b2cc0914bbc6d67e1a02598c7`

## Intent and audience hypothesis

Help a visiting adult find their next useful action while conveying the welcome of a volunteer-run clubhouse. The candidate assumes families seeking schedule/account access are the primary public-page audience, with volunteers secondary. This is a design hypothesis, not a result of interviews, analytics, conversion testing, or participant usability research. It does not reprioritize the product backlog.

The owner's existing mobile Sign in → Schedule selection remains authoritative. The prior accepted Organized Clubhouse / tactile-and-friendly / comfortable Ready Board direction remains the foundation. This pass adds desktop hero actions, keeps the Pearl River dedication, rebalances the existing photo and weather example, and demonstrates a draft stopping at coach review.

## Authority decisions

| Decision | Authority | Disposition |
| --- | --- | --- |
| Visual direction and technology | Owner delegated both; final review only | Agent selected refinement within the existing direction |
| Add motion | Owner explicitly requested during this pass | Native CSS and a small client presentation leaf |
| Mobile action order | LP-UX-027, owner selection `LP-P1-CTA-v1` | Sign in first, Schedule second |
| Sample weather and family notification | Existing draft-only provider boundaries | No provider calls, business-state changes, approvals, or sends |
| Audience priority | No participant evidence supplied or discovered in this task | Retained as hypothesis |
| Visual acceptance | Owner | Accepted: “like it in fact push that as the new landing” |
| Release | Owner explicitly requested publication | Executed through the existing repository and Vercel project; see release evidence |

## Reference and artifact influence ledger

Sources observed in a browser on 2026-10-19. Reference captures are retained in `output/playwright/leaguepilot-visual-candidate-20261019/`.

| Source / role | Observed pattern and why it works | LeaguePilot transformation | Identity elements rejected |
| --- | --- | --- | --- |
| [TeamReach](https://teamreach.com/) — interaction and conversion reference | Hero pairs coordination benefits with a product screen and concrete field-change/attendance examples. It connects an abstract promise to a recognizable task. | Keep entry actions beside the headline; turn the existing weather example into an explorable draft-review explanation. | Red identity, phone mockup, store badges, ratings, quotes, metrics, copy, and assets |
| [Heja](https://www.heja.io/) — community and visual reference | A team illustration shares the hero with inclusive audience language; schedule and communication sections follow. It makes practical coordination feel social. | Retain LeaguePilot's existing community photo and rounded typography; add an original caption recognizing people who show up, while retaining practical navigation. | Green identity, illustration, testimonials, audience totals, store badges, copy, and fundraising mechanism |
| LP-UX-026/027 and existing LeaguePilot page — governing product/design reference | Comfortable Ready Board, Pearl River dedication, community image, private access, and immediate mobile actions already carry owner authority. | Refine the same composition using the existing gateway tokens and component seams. | No competing component system, token system, role model, or route hierarchy |
| `product-proof-saas` — technique reference | Clearly labeled deterministic examples explain mechanisms and human control. | Sample weather views show concern → coach draft → explanation of the approval boundary. The automatic sequence stops at coach review. | Pricing, AI generation, sample customer outcomes, and the skill's default palette |
| `animation-systems` — motion technique reference | Small transform/opacity entrances and ordered feedback guide attention with bounded runtime work. | 650–800ms board entrance, 280ms panel changes, 350ms active-step settle, and a 1.4-second sample advance. Reduced motion disables animation. | Scroll hijacking, new motion dependencies, perpetual demo loops, source-site motion claims |

No reference branding, imagery, assets, quoted copy, testimonials, or metrics were imported. The photo, fonts, palette, icons, cloud treatment, and nonblocking celebration come from the existing LeaguePilot checkout. Reference motion was not measured; the new motion is locally designed.

## Technology, dependencies, and costs

Use existing Next.js/React, existing Lucide icons, native CSS, and one isolated client leaf. No package, lockfile, asset, paid service, or provider configuration is added. There is additional client code for the sample controls, an IntersectionObserver, and short-lived timers. Exact bundle delta, battery cost, and device performance are unmeasured. The existing baseball celebration and cloud behavior remain subject to their established reduced-motion rules.

The example is server-rendered in a useful coach-review state before JavaScript. JavaScript adds exploration and the optional sample sequence. It does not read private records. Reduced-motion users receive the settled state and can switch views without animation. Three sample views are presentation choices, not new domain workflow states.

## Handoffs and acceptance

| Handoff | Required input/dependency | Acceptance evidence | Authority |
| --- | --- | --- | --- |
| Context → research | Exact checkout, LP-UX-026/027, owner delegation | Selected direction and constraints above | Repository authorities and owner |
| Research → candidate | Observed sources and transformation ledger | Two captured references; influence and rejected elements recorded | Agent within delegation |
| Candidate → local verification | Working localhost app, existing navigation and draft boundaries | Checks and captures linked in the evidence report | Technical checks only |
| Verification → final review | Desktop/mobile/dark/reduced captures; sample interaction evidence | Owner can review actual rendered candidate and motion | Owner visual acceptance pending |
| Review → release | Owner decision, controlled integration of existing WIP, applicable release gates | Not executed in this task | Existing release authority |

The reusable procedure is context → divergent ideas → reference decomposition → bounded implementation → screenshots and interaction checks → owner review. Use `workflow-score-to-target` only when a numeric target and benchmark exist; neither was supplied for this page, so no numeric quality score is claimed.

## Scope and SaaS task template

This is public landing UX work under the existing LP-UX series, associated with the Production Task Board's public/buyer journey research inputs. It does not advance the hosted-session acceptance queue.

| Field | Answer |
| --- | --- |
| Tenant context and propagation | Public signed-out page; no organization/team/player/guardian scope introduced; fictional existing weather example only |
| Isolation proof | Existing server-derived signed-in redirect retained; no adapter, RLS, private-data, or account-access code changed |
| Actor authorization | Anonymous visitors can follow existing public links; sample buttons require no account and mutate no record |
| Lifecycle | Existing business states and transition owners unchanged; sample view index is local presentation state |
| Configuration | Existing theme and browser reduced-motion preference; no environment or provider setting changed |
| Audit/observability | Baseline hashes, browser captures, local test output, browser proof, and this decision record |
| Failure semantics | Server-rendered coach-review explanation remains when JS is absent; network routes retain their existing behavior |
| Idempotency/concurrency | Sample replay changes presentation only; timers clean up and are canceled by manual selection; no durable write or send |
| Security threats | No new object identifiers, inputs, access grants, secrets, exports, or provider invocation |

## Evidence and remaining research

See [release record](../../releases/2026-10-19-landing/README.md) for integration scope and retained captures. The full candidate evidence remains in its isolated pilot worktree.

Participant usability testing remains outstanding. A future study should ask parents/guardians and volunteers to find the schedule, find sign-in, and explain whether the sample sent a message. Record unaided task completion, misclicks, time to first useful action, and interpretation of the approval boundary. Audience-priority decisions require those findings or relevant analytics; scripted browser checks cannot settle them.

No backend, domain model, provider sending, billing, image generation, or new role-specific product surface is included. The candidate is reversible through its bounded landing seams, and pre-pass copies distinguish this pass from inherited worktree WIP.

## Publication reconciliation

The owner accepted the rendered candidate and requested it as the new landing. The release transfers only landing presentation dependencies onto current main, preserving its dependency/security updates and unrelated domain work. The candidate had inherited a legal footer whose `/privacy` and `/terms` destinations returned 404 on the current production site. The release retains the footer layout with existing Schedule, Sponsors, and Sign in destinations; it imports no unreviewed legal or registration work. Footer rendering stays on `/` rather than changing every public page.
