---
name: user-journey-research
description: Create or refine repo-grounded user journey maps, customer interview guides, evidence synthesis, and backlog-prioritization handoffs in any repository. Use when the user wants journey mapping, customer-discovery artifacts, role-based pains/opportunities, or research that should feed product decisions without inventing unsupported product truth.
---

# User Journey Research

Use this skill to produce research and planning artifacts that stay grounded in the current repository instead of drifting into generic product advice.

This skill is intentionally portable. It should work in any repo by discovering that repo's own authority docs, routes, backlog, and constraints before writing journey or research outputs.

## Use When

- The user asks for a user journey map, role journey, customer journey, or service blueprint.
- The user asks for an interview guide, research plan, synthesis template, or discovery artifact.
- The user asks which features matter most by role, which pains drive adoption or churn, or how discovery should feed backlog decisions.
- The user wants existing planning docs turned into role-based journeys or prioritized customer jobs.

## Do Not Use When

- The task is implementation-only and does not need research or journey framing.
- The user wants market claims presented as current truth without repository evidence or fresh external research.
- The user wants a visual design deliverable rather than a role/journey/research artifact.

## Workflow

1. Establish repository truth first.
   - Identify the exact repo root and current working scope.
   - Read the narrowest authority stack that explains product truth.
   - Prefer current feature trackers, backlog docs, route maps, architecture docs, PRDs, and capability matrices over older roadmap prose.
2. Separate repository fact from research hypothesis.
   - Repository fact: implemented routes, documented decisions, explicit gates, known constraints, current backlog order.
   - Hypothesis: emotions, unmet needs, switching triggers, buyer objections, market differentiators, and post-MVP value assumptions.
   - Label hypotheses clearly. Do not let unvalidated opinions read like shipped behavior.
3. Map roles before features.
   - Identify the primary actors first: buyer, admin, operator, manager, contributor, end user, reviewer, support, or any repo-specific role.
   - For each role, describe the job to be done, moments of truth, churn triggers, and evidence boundaries.
   - Avoid collapsing distinct roles into one generic persona when their incentives differ.
4. Use observed product seams, not imagined flows.
   - Build journeys from actual routes, documented workflows, API boundaries, and operating constraints.
   - Note missing flows explicitly rather than papering them over.
   - If acquisition, billing, onboarding, or approval flows are not actually represented in the repo, say so.
5. Tie research to decisions.
   - Every interview guide or journey artifact should state which product or backlog decisions it is intended to inform.
   - Include a path for promoting findings into canonical backlog or product-truth docs.
   - Preserve explicit existing decisions unless evidence is strong enough to justify reopening them.

## Discovery Inputs

Read only the most relevant sources for the task. Common candidates:

- `README.md`, `AGENTS.md`, `docs/**`, `specs/**`, `product/**`, `architecture/**`
- Route or navigation maps
- Current backlog, roadmap, or status docs
- Feature truth or capability matrix docs
- Domain model or workflow docs
- Existing research or personas if they exist

Search before reading broadly. Narrow to the files that define current truth for the affected roles and flows.

## Recommended Outputs

Choose only the artifacts the task needs.

### 1. User journey map

Use when the user needs role-based flow understanding.

Recommended structure:

- Status: validated / hypothesis-only / mixed
- Evidence base and limits
- Role-by-role journey stages
- Job to be done
- Touchpoints and actions
- Pain points or risks
- Opportunities
- Moments of truth
- Churn triggers
- Cross-role opportunity map
- Measurement plan
- Canonical handoff

### 2. Interview guide

Use when the user needs evidence collection rather than more planning opinions.

Recommended structure:

- Research status
- Evidence boundary
- Research objectives
- Decisions this research should inform
- Hypotheses to test
- Recruiting plan
- Interview format
- Shared core questions
- Role-specific modules
- Priority and switching evidence
- Note-taking template
- Synthesis rules
- Synthesis output template
- Priority-change threshold

### 3. Evidence synthesis template

Use when the user needs a repeatable format for converting interviews into backlog decisions.

Recommended structure:

- Coverage
- Repeated observed problems
- Hypothesis disposition
- Implications for current priorities
- Canonical doc updates required
- Explicit non-decisions

## Quality Bar

- Ground every journey in repository surfaces or clearly labeled assumptions.
- Distinguish what is implemented, what is externally gated, and what is merely hypothesized.
- Prefer repeated job failures over feature wishlists.
- Keep privacy, authorization, and trust concerns explicit when they materially affect user behavior.
- Do not recommend reopening major decision boundaries casually.
- Make backlog handoff mechanical: the reader should know exactly which canonical docs would need updating if the research changes priority.

## Validation

For documentation work:

- Re-read the finished artifact for unsupported claims.
- Run `git diff --check`.
- Verify that internal repo links point to real files when links are included.
- Confirm the artifact states its evidence boundary and whether it is validated or hypothesis-only.

Report validation as `covered`, `partial`, or `not covered`, and name any missing evidence or blocked canonical-doc sync explicitly.
