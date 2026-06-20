# Agentic Programming Workshop

## Purpose

This workshop uses the Little League HQ static prototype to teach how to move from a clickable demo to a production system with agent-assisted workflows, explicit approval gates, and strong privacy boundaries.

The goal is not to make agents autonomous. The goal is to use agents to speed up discovery, validation, drafting, backlog grooming, and implementation while services enforce access, audit, and provider rules.

## Prerequisites

- Docker Desktop or Docker Engine with Compose.
- A browser.
- Basic comfort reading HTML, CSS, JavaScript, Markdown, and Docker files.

## Quick Start

```bash
make up
make smoke
```

Open:

```text
http://localhost:8081/
```

Stop:

```bash
make down
```

## Workshop Flow

### Module 1 - Prototype Truth

- Read `README.md`, `agent.md`, and `docs/agentic-architecture.md`.
- Identify which flows are simulated in `app.js`.
- Write down every place where the UI suggests a future production capability.

Deliverable:

- A short "implemented vs simulated" note.

### Module 2 - Agent Boundaries

- Review the agents in `docs/agentic-architecture.md`.
- Pick one flow: registration, roster import, schedule update, invite send, media moderation, or archive close.
- Define agent input, tool calls, output, approval gate, and audit event.

Deliverable:

- One agent card added or refined in the architecture docs.

### Module 3 - Backlog Refinement

- Use `BACKLOG.md`.
- Split one P0 or P1 item into implementation tasks.
- Add acceptance criteria, risk, and verification steps.

Deliverable:

- A backlog slice ready for a developer to implement.

### Module 4 - Production Service Design

- Choose one simulated workflow in `app.js`.
- Draft the production tables, service methods, row-level access checks, and failure states.
- Record a decision in `docs/adr/`.

Deliverable:

- An ADR plus updated architecture notes.

### Module 5 - Evaluation And Safety

- Use `docs/evaluation-plan.md`.
- Create tests or manual checks for permission leakage, unsafe provider sends, incorrect child display names, and missing audit events.

Deliverable:

- A workflow-specific evaluation checklist.

## Suggested Exercises

1. Turn "Parent Self-Registration" into a real service plan without granting access automatically.
2. Design a CSV import preview flow that cannot partially mutate production data.
3. Add an approval queue for invite sending.
4. Draft a coach weekly update using only team-scoped data.
5. Create an archive-close plan that preserves season records and deletes chat text.

## Workshop Rules

- Do not call simulated features production-ready.
- Do not introduce real provider keys into this repo.
- Do not remove child privacy defaults.
- Do not let agents grant private access, send provider messages, or delete retention-sensitive records without human approval.
- Do not rely on disabled buttons as the only permission boundary.

## Repo Map

- `agent.md` - operating rules for future agents and contributors.
- `BACKLOG.md` - implementation backlog.
- `docs/agentic-architecture.md` - production agent architecture.
- `docs/evaluation-plan.md` - checks for agent safety and workflow quality.
- `docs/privacy-security.md` - privacy and security guardrails.
- `docs/runbook.md` - local and Docker operations.
- `docs/adr/` - architecture decision records.
- `prompts/` - reusable workshop prompts.
- `evals/` - evaluation case notes.
