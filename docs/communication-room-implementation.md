# Communication Room implementation contract

Status: Local implementation, responsive browser proof, and isolated Supabase QA record proof complete; production-hosted proof tracked separately
Task ID: LP-COMM-001
Approved design: [LeaguePilot Family Experience](https://www.figma.com/design/c28Jx5U8wI2SPWPhbKaMje)
Primary route: `/parent/messages`

## Phase 0 contract

Phase 0 was completed before implementation. The governing artifacts are:

- Product-truth brief and six-stage family cycle: `docs/family-experience-blueprint.md`.
- Communication Room surface contract: section 7.12 of the blueprint.
- Approved responsive frames: mobile `14:398`, tablet `14:570`, desktop `14:738`.
- Current-experience evidence: `output/playwright/family-experience-audit/`.
- Authority boundary: critical, official, update, and conversation records must remain distinguishable; chat cannot mutate operational truth.

The selected visual direction is Calm Family Operations with Community Sports Journal warmth and Modern Team Utility scanning behavior. The existing LeaguePilot color, spacing, typography, radius, shell, and responsive tokens remain the implementation source.

## Every-task SaaS check

| Field | Concrete answer |
| --- | --- |
| Tenant context | The verified parent session establishes guardian identity. Active guardian links establish child scope; linked team IDs establish team and organization scope. |
| Tenant propagation | Server shell access resolves the parent team IDs. `ParentMessagesSurface` passes them into `scopeTeamChatData`; notification receipts are queried by the session-derived parent user ID. The client receives only those scoped rows. |
| Isolation proof | `requireParentPageAccess`, server-side team scoping, recipient-filtered receipt reads, session-derived write routes, existing team-membership checks, real-session RLS proof, and populated browser proof prevent cross-team access. |
| Actor and authorization | An authenticated linked parent can read scoped records and post an ordinary team-chat reply. Only an affected notification recipient can acknowledge that receipt. Coaches or administrators remain responsible for announcements and consequential publication. |
| State model | Existing team-chat message and notification evidence states are read. The surface does not add domain or workflow states. Acknowledgment uses the existing atomic RPC; reply creation uses the existing team-chat service. |
| Configuration | Read scope is user and team specific. Provider delivery remains environment and organization gated and is not invoked by this surface. |
| Audit and observability | Acknowledgment writes the existing `notification_acknowledged` audit event. Chat rows retain author, role, team, event, moderation, read list, and timestamps. UI analytics names are declared as `data-analytics-event` attributes; a product analytics collector is not inferred. |
| Failure semantics | Loading, no-data, partial receipt failure, read-only fallback, offline, pending, send failure, and route error states are explicit. Unapproved message body text is withheld. A failed reply remains in the composer and is never presented as sent. |
| Idempotency and concurrency | Notification acknowledgment is row-locked and idempotent in the existing RPC. The reply button is disabled while a request is pending; no automatic chat retry occurs. Durable chat-post idempotency remains a future hardening item. |
| Security threat model | The slice avoids client-supplied actor IDs, filters every team and receipt server-side, withholds unauthorized drafts, makes fallback data read-only, and adds no provider call, access grant, sensitive child data, or mass-assignment seam. |
| Provider impact | None. Published, delivered, read, and acknowledged evidence is displayed without initiating email, SMS, push, or provider review. |
| Storage and analytics impact | No new private storage, cache, export, or analytics write. The production service worker continues to avoid cache-first private HTML. |
| Migration and rollout | The surface adds no new domain table. Isolated QA proof applies existing migrations `0023` and `0024` plus the server-only security-definer execution hardening migration. Production remains untouched until an explicit promotion. UI rollback is confined to restoring the parent route wrapper; coach chat and compatibility Team Chat remain unchanged. |

## Surface behavior

### Five-second hierarchy

1. Communication class: Critical, Updates, or Conversation.
2. Affected child and team context.
3. Required action and unresolved count.
4. Named author or visible missing-attribution warning.
5. Published, delivered, read, and acknowledged evidence.
6. Event context and canonical schedule link.

### Authority and privacy

- Unapproved notification wording is never rendered to the family.
- Critical and official records require an approved notification or an announcement authored by an authorized coach or administrator.
- Acknowledgment confirms receipt only. It does not confirm agreement, attendance, transportation, compliance, or task completion.
- Conversation replies cannot change the official schedule, cancellation, relocation, attendance, transportation responsibility, family permissions, care details, or emergency instructions.
- Children do not sign in or receive direct messages.
- Multi-child switching uses the one guardian session and never changes identity.

### Responsive behavior

- Mobile: one-column authority-first cards, three-lane switcher, horizontally scrollable child/team context, full-width actions, and app-shell bottom navigation.
- Tablet: full-width family context and lane switcher, compact two-column evidence and event detail, single-column conversation with event context above it.
- Desktop: central message stream with a sticky event context rail for conversation; evidence remains four-column when space permits.
- All interactive targets are at least 44 pixels; consequential actions are 48 pixels.

### State coverage

| State | Behavior |
| --- | --- |
| Loading | Route skeleton preserves header, context, lanes, and message-body geometry. |
| Empty | Each lane explains what belongs there and what will happen next. |
| Pending publication | Count is visible; draft wording is withheld. |
| Published | Authorized records appear with team, author or attribution gap, and publish evidence. |
| Delivered, read, acknowledged | Independent evidence cells; one state never implies another. |
| Offline | Existing page content stays readable; refresh, acknowledgment, and reply controls pause. |
| Reply pending | Composer and send action show pending state; duplicate clicks are blocked. |
| Reply error | Draft remains visible and the message is not presented as sent. |
| Data unavailable | Source status becomes explicit; conversation fallback is read-only. |
| Cancelled or changed event | The linked event status renders from the current event record; conversation does not override it. |
| Withdrawn, superseded, corrected, expired | The visual contract is defined in the family blueprint; durable message-version records are still required before those states can be proven in production. |

## Accessibility and safeguarding

- Text and structure identify severity and authority; color is supplemental.
- The lane switcher uses tab semantics and native keyboard-operable buttons.
- Loading and status changes use appropriate busy, status, alert, and polite live-region behavior.
- Focus indicators and contrast inherit LeaguePilot tokens.
- Message bodies preserve line breaks and wrap long content.
- At 400 percent reflow, cards, event facts, evidence cells, composer controls, and actions become one column.
- The surface does not expose another family's receipt status, child details beyond the guardian-scoped first name plus last initial, medical information, custody restrictions, or private contact information.

## Local acceptance criteria

- [x] Parent route is protected by existing signed-in parent access.
- [x] One guardian can view and filter multiple linked children and teams without switching accounts.
- [x] Critical, Updates, and Conversation are visually, structurally, and semantically distinct.
- [x] Unapproved notification body text is not rendered.
- [x] Critical records show team, message, event context, human attribution or a visible attribution gap, and receipt-only explanation.
- [x] Published, Delivered, Read, and Acknowledged remain independent.
- [x] Acknowledgment calls the recipient-scoped audited RPC and is unavailable without an attempt record.
- [x] Conversation posting uses the existing session-derived team-chat route.
- [x] Offline and fallback states do not claim persistence or delivery.
- [x] Coach messages and the shared compatibility Team Chat remain unchanged.
- [x] Loading, empty, partial-error, offline, pending, failure, and completed receipt states are implemented.
- [x] Focused component and receipt-evidence tests pass.
- [x] Signed-in browser comparison passes at 390, 768, and 1440 pixels with no document overflow, undersized surface controls, or page errors.
- [x] Isolated Supabase QA and real-session RLS proof confirms multi-child isolation, acknowledgment readback, audit attribution, and conversation persistence with zero provider sends.
- [ ] Production-hosted route proof is repeated after an explicitly approved deployment and migration promotion.
- [ ] Durable version, withdrawal, correction, and supersession records are available before those states are called production-ready.

## Isolated QA proof

- Project boundary: restored empty Supabase project, separate from the active LeaguePilot production project.
- Migration evidence: all repository migrations through `0024`, followed by `20260724143554_security_definer_execution_hardening.sql`.
- RLS evidence: `npm run qa:rls-proof` passed for parent, coach, and anonymous sessions.
- Browser and readback evidence: `npm run qa:communication-room-record-proof`.
- Proof artifact: `output/playwright/communication-room/populated-record-proof.json`.
- Visual artifact: `output/playwright/communication-room/populated-record-mobile.png`.
- Verified result: two linked children across two teams; archived-team child excluded; parent reply persisted; critical acknowledgment and attributed audit recorded; notification attempt remained `suppressed`; provider acceptance and delivery remained false; event stayed scheduled; RSVP, attendance, and transportation rows remained unchanged.
