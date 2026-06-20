# Contributing

## Working Style

This is currently a static prototype. Keep changes scoped and clear.

- Use `agent.md` before making product or architecture changes.
- Use `BACKLOG.md` for planned production work.
- Use `docs/adr/` for durable architecture decisions.
- Keep app behavior changes separate from documentation-only changes.
- Do not add dependencies unless they are needed for the current slice.

## Local Checks

Run:

```bash
make validate
make up
make smoke
```

For static-only changes, also open `http://localhost:8081/` and check the affected screens manually.

## Pull Request Checklist

- Scope is narrow and described.
- Prototype behavior and production intent are not mixed together.
- Child privacy assumptions are preserved.
- Role boundaries are documented when changed.
- Sensitive actions still require human approval in production plans.
- Docs and backlog are updated when architecture changes.

## Documentation Standards

Use direct language:

- "Simulates invite sending" is acceptable for the prototype.
- "Sends invites" is only acceptable after real provider integration, consent checks, delivery logs, and approval gates exist.

Prefer file-backed claims. If a feature is not in `index.html`, `app.js`, `styles.css`, or a production implementation file, call it planned.
