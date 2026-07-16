# Use Cases, User Journeys, And Process Maps

Status: draft. These journeys describe the expected enterprise workflows and the current proof boundaries.

## Journey 1: Parent Registration To Approved Access

Actors: anonymous parent, organization admin, Supabase Auth/session, audit service.

```mermaid
flowchart LR
  A[Parent submits registration] --> B[Registration request row]
  B --> C[Admin review queue]
  C --> D{Approve or reject}
  D -->|Approve| E[Create or link player and guardian]
  E --> F[Create membership or invite]
  F --> G[Audit approval action]
  D -->|Reject| H[Record rejection reason]
  H --> I[Audit rejection action]
```

Proof status: API and RPC flow exists; hosted browser-level approval/rejection proof remains a production task.

## Journey 2: Parent Game-Day RSVP

Actors: parent/guardian, player, event, coach aggregate view.

```mermaid
flowchart LR
  A[Parent signs in] --> B[Server scopes linked players and team events]
  B --> C[Parent opens RSVP]
  C --> D[Submit going, maybe, or not going]
  D --> E[Route verifies session user]
  E --> F[Service checks guardian-player-event scope]
  F --> G[Persist RSVP]
  G --> H[Coach attendance summary updates]
```

Proof status: QA browser proof covers parent RSVP writes and Supabase readback.

## Journey 3: Coach Weekly Update

Actors: assigned coach, team, notification draft, provider boundary.

```mermaid
flowchart LR
  A[Coach opens dashboard] --> B[Server loads active assigned team]
  B --> C[Coach drafts weekly update]
  C --> D[POST weekly update]
  D --> E[Route verifies coach session]
  E --> F[Persist announcement]
  F --> G[Create pending team broadcast draft]
  G --> H[No external provider send]
```

Proof status: hosted browser proof covers the weekly update row plus pending notification draft, with no provider delivery attempt.

## Journey 4: Parent Replay Draft And Publish

Actors: assigned coach/admin, team, Parent Replay service, parent notification draft.

```mermaid
flowchart LR
  A[Coach selects 2-3 focus areas] --> B[Generate deterministic replay draft]
  B --> C[Coach reviews copy]
  C --> D[Publish reviewed replay]
  D --> E[Route checks coach/admin access]
  E --> F[Persist reviewed replay rows]
  F --> G[Create pending parent notification draft]
  G --> H[Families read replay in scoped surfaces]
```

Proof status: hosted browser proof covers publish rows and pending provider-review boundary rows. External sends remain disconnected.

## Journey 5: Provider Delivery Review

Actors: admin/coach reviewer, provider-delivery service, notification preferences.

```mermaid
flowchart LR
  A[Draft notification exists] --> B[Reviewer opens delivery review]
  B --> C{Approve, reject, or suppress}
  C -->|Approve| D[Check preferences and provider readiness]
  C -->|Reject| E[Record rejection]
  C -->|Suppress| F[Record suppression]
  D --> G[Write queued delivery-attempt record]
  G --> H[No live send unless provider slice enables it]
```

Proof status: provider-review rows are tested and hosted proof exists for review records. Live email/SMS/Web Push sends are deferred.

## Journey 6: Media Report And Moderation

Actors: parent/guardian, coach/admin reviewer, media governance service.

```mermaid
flowchart LR
  A[Parent views approved media] --> B[Parent reports media]
  B --> C[Media report route verifies session]
  C --> D[Service records report]
  D --> E[Admin or coach reviews item]
  E --> F{Hide, restore, remove, or keep}
  F --> G[Audit moderation action]
  G --> H[Parent/team surfaces apply visibility]
```

Proof status: APIs and services exist; hosted browser proof for report/moderation is still open.

## Journey 7: Season Archive

Actors: admin, retention policy, export/audit service.

```mermaid
flowchart LR
  A[Admin reviews archive checklist] --> B[Preserve roster, schedule, score, standing, RSVP, sponsor, notification records]
  B --> C[Delete or retain chat according to policy]
  C --> D[Make archived season read-only]
  D --> E[Record proof and export evidence]
```

Proof status: archive checklist and admin surfaces exist; full hosted archive smoke proof remains a future hardening task.

## User Manual Gap

The journeys above are process-level docs. A role-by-role end-user guide is still needed before broader rollout:

- Parent guide: RSVP, schedule, snacks, volunteers, messages, media reports, preferences.
- Coach guide: attendance, weekly update, practice recap, weather draft, roster view.
- Admin guide: registration approval, teams, branding, operations, exports, media moderation, provider review.
