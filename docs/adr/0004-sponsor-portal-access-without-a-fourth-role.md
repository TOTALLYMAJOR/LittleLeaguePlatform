# ADR 0004 - Sponsor Portal Access Without A Fourth Role

## Status

Proposed

## Context

A sponsor has no way to see anything in LeaguePilot. `find app -ipath "*sponsor*"` returns four
paths: `app/admin/sponsors/page.tsx`, `app/sponsors/page.tsx`, and two admin API routes.
`app/sponsors/page.tsx` is static marketing copy with no data binding of any kind. A repository-wide
grep for `sponsorPortal`, `sponsor_portal`, and `sponsor-portal` across `.ts`, `.tsx`, `.sql`, and
`.mjs` returns zero hits. The only `*portal*` route in the application is `app/team-portal/page.tsx`,
which serves parents and coaches.

ADR 0003 makes sponsor commercial and delivery state real. That state is worthless to the person who
paid for it unless they can see it. Building the portal therefore forces a question the product has
never had to answer: **what kind of principal is a sponsor?**

The constraints are unusually tight:

- `USER_ROLES` is frozen at `["admin", "coach", "parent"]` (`lib/domain/contracts.ts:1`), and
  hard rule 7 requires role boundaries to stay visible in UI, service policy, and tests.
- Every RLS helper in the schema is written around these three roles —
  `current_user_is_org_admin` (`0001_core_schema.sql:439`), `current_user_can_access_team`
  (`0001_core_schema.sql:456`), and the guardian/player helpers.
- Hard rule 6 makes child privacy non-negotiable, and a sponsor is by definition an outside
  commercial party. Any access model must make it structurally impossible for a sponsor to reach
  family data, not merely unlikely.
- Hard rule 5 forbids autonomous provider sends, so whatever the access mechanism is, LeaguePilot
  cannot email it to the sponsor without an admin acting.

The repository already contains a mature pattern for granting scoped access to a person who does not
hold an account for the thing they are accessing. `invite_token_hash` appears across
`0001_core_schema.sql:124`, `0003_registration_approval_workflow.sql:64`,
`0026_parent_invite_acceptance.sql:9`, `0029_temporary_caregiver_authorizations.sql:45`, and
`0033_registration_invitation_issuance.sql:62`. In every case the token is hashed with SHA-256, the
hash is the lookup key, the constraint `~ '^[0-9a-f]{64}$'` is enforced in SQL, and resolution occurs
in a `security definer` RPC. `lib/supabase/invite-acceptance.ts:5` shows the client half.

A decision is required because this introduces a new access principal to the system — an
architecture change under the project documentation criteria — and because getting it wrong means
either a rewrite of every RLS helper or a family-data leak to a commercial third party.

## Decision

A sponsor is **not** a user. Sponsor portal access is a scoped, expiring, revocable, audited grant
resolved by token hash, granting read access to exactly one sponsorship agreement and write access
to nothing except a review-queued asset upload.

### Decision Details

| Item | Content |
|---|---|
| **Decision** | Add `public.sponsor_portal_grants` keyed by SHA-256 token hash, scoped to one `agreement_id`, with `expires_at`, `revoked_at`, and access auditing. The portal renders at `/sponsor-portal/[token]` as a server component reading through a `lib/supabase/` adapter. No `USER_ROLES` change, no sponsor auth user, no sponsor membership row. |
| **Why now** | ADR 0003 makes sponsor state real; the portal is the surface that state exists for. Deciding the principal model after building sponsor-facing screens would mean rebuilding them. |
| **Why this** | It reuses a pattern proven five times in this schema, keeps the three-role boundary intact, and makes family-data reach structurally impossible rather than policy-dependent. |
| **Known unknowns** | Whether sponsors will forward links in ways that make per-agreement scoping insufficient. Expiry is resolved: the product owner selected season end on 2026-08-19 (UI Spec TBD-01), so a grant dies with the agreement it scopes to. |
| **Kill criteria** | If a pilot shows sponsors routinely sharing one link across multiple businesses, or demanding multi-agreement history in one view, the grant model has hit its ceiling and a real sponsor account with a fourth role must be reconsidered. |

Concretely:

- `sponsor_portal_grants` columns: `id`, `organization_id`, `agreement_id`, `sponsor_id`,
  `token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$')`, `label`, `expires_at`,
  `revoked_at`, `created_by_user_id`, `last_accessed_at`, `access_count`, `created_at`.
- Token generation: minimum 32 bytes of CSPRNG entropy, surfaced to the admin exactly once, never
  persisted in plaintext, never logged.
- Resolution happens in a `security definer` RPC that takes the hash, enforces
  `revoked_at is null and expires_at > now()`, and returns the agreement scope. The route resolves
  nothing itself, matching the posture ADR 0002 set.
- The portal read is **allow-listed by field**, not filtered by exclusion. The adapter selects an
  explicit column list per table and never selects `*`. No query in the portal read path touches
  `players`, `profiles`, `guardian_authorizations`, `emergency_contacts`, `team_memberships`,
  `player_health_notes`, or any media table.
- `expires_at` is set from the agreement's season end date (UI Spec TBD-01, resolved 2026-08-19). A
  grant cannot outlive the deal it describes.
- The single sponsor write is an asset submission carrying an **HTTPS URL** (UI Spec TBD-02, resolved
  2026-08-19), creating a `sponsor_assets` row with `status = 'pending'` and entering the existing
  admin review queue. No file storage provider is engaged, so no storage gate opens. A sponsor cannot
  approve anything and cannot cause a placement to go live.
- Token lookup is rate-limited through the existing `PUBLIC_RATE_LIMITS` mechanism
  (`lib/supabase/public-rate-limit.ts:26`) to prevent enumeration.
- An invalid, revoked, or expired token returns one indistinguishable "this link is no longer
  active" response. The portal never discloses whether a token ever existed.
- Distribution is manual. The admin copies the link. LeaguePilot does not send it, per hard rule 5.

## Rationale

### Options Considered

| Option | `USER_ROLES` unchanged | RLS helpers unchanged | Family data structurally unreachable | Revocable | Sponsor effort to access |
|---|---|---|---|---|---|
| A. Add a fourth `sponsor` role with real accounts | No | No — every helper needs a branch | Policy-dependent | Yes | Account creation, password |
| B. Reuse `parent` role with a scoped membership | Yes | Partially — helpers would treat sponsor as family | **No — actively dangerous** | Yes | Account creation |
| C. Tokenized scoped grant, no account (**chosen**) | Yes | Yes | Yes | Yes | Open a link |
| D. Admin exports a PDF and emails it | Yes | Yes | Yes | n/a | Wait for admin |

**Option A** is the "proper" answer and the wrong one here. `USER_ROLES` is referenced through
`hasAllowedRole` and `isUserRole` (`lib/domain/roles.ts`), through route scoping, and through every
SQL helper. A fourth role means auditing every one of those call sites for a principal that must be
denied by default in almost all of them — a large surface area of new denial tests to protect a
party who needs to read seven fields. It also creates a permanent temptation: once a sponsor is a
user, every future feature must ask whether sponsors can see it.

**Option B** must be recorded explicitly so that nobody proposes it later. Reusing `parent` would
route a commercial third party through `current_user_is_player_guardian` and the guardian helpers.
The entire child-privacy model assumes the `parent` role means "this person is family to a child."
Making that false for some rows would undermine every privacy guarantee in the product. This option
is rejected on safety, not on cost.

**Option D** is what leagues do today with spreadsheets, and it is why sponsor renewal conversations
are painful. It also means every status question becomes an admin interruption, which is the exact
cost the PRD measures.

**Option C** is chosen because the sponsor's actual need — read one agreement, upload one logo — is
narrow enough that an account is overhead rather than protection, and because the grant model makes
the privacy guarantee structural. A grant resolves to one `agreement_id`. There is no query path
from an agreement to a child. The guarantee does not depend on a policy being written correctly; it
depends on a join that does not exist.

### Positive Consequences

- The three-role model stays intact and stays honest. A sponsor is visibly modelled as a non-role
  principal, which is more truthful than pretending they are a user.
- Zero friction for the sponsor. The most common reason a sponsor never checks a portal is that they
  never finished creating an account.
- Revocation is immediate and per-agreement. A rotated token invalidates one link, not a login.
- Access is auditable per grant — `last_accessed_at` and `access_count` become a genuine renewal
  signal: a sponsor who opens the portal repeatedly is engaged.
- No password reset flow, no sponsor account recovery, no sponsor session management.

### Negative Consequences

- The token is a bearer credential. Anyone holding the link sees that agreement's commercial detail:
  amount, payment state, deliverables, evidence. This is accepted because the blast radius is one
  sponsor's own commercial data and contains no third-party personal data.
- No per-person attribution within a sponsor business. If three people at the sponsor open the link,
  the product cannot distinguish them, and `access_count` overcounts engagement accordingly.
- A sponsor with agreements across two seasons holds two links rather than one login.
- Link distribution is manual until provider sends are enabled, which is admin work.

### Neutral Consequences

- The public `/sponsors` marketing page is unaffected and stays static.
- Existing `sponsor_assets` review flow is reused unchanged; only the row's origin differs.

## Architecture Impact

Introduces the first **non-user principal** in the application. Until now every authenticated read
resolved to an `auth.uid()`. The portal resolves to a grant instead, which means the existing RLS
helpers cannot be reused for it and must not be extended to try.

Consequently the portal read path is served by a `security definer` RPC that performs its own scope
check from the grant, rather than by RLS on `auth.uid()`. This is a deliberate, contained exception
and must be confined to the portal adapter. Any future temptation to give the grant broader reach —
multiple agreements, organization-level reads, family-adjacent surfaces — invalidates the safety
argument above and requires a new ADR.

Adds one new route segment, `/sponsor-portal/[token]`, which must be registered in
`lib/navigation/route-topology.ts` as public and excluded from authenticated navigation.

## Implementation Guidance

- **Never store the token.** Store the hash. Show the plaintext once, at creation, in the admin UI.
- **Never log the token**, including in error paths, audit summaries, and analytics.
- **Allow-list columns.** The portal adapter selects explicit columns. `select("*")` is prohibited in
  the portal read path, because a future column addition would silently widen sponsor exposure.
- **One indistinguishable failure.** Invalid, expired, and revoked produce the same response and the
  same timing characteristics as far as is practical.
- **Scope is one agreement.** Do not add an `organization_id`-wide grant variant "for convenience."
- **The sponsor approves nothing.** Every sponsor-originated write enters an existing human review
  queue, consistent with ADR 0001.
- **Audit access, not identity.** Record that a grant was used and when. Do not attempt to identify
  who used it.

## Verification

- An executed test proves a valid grant returns exactly one agreement's data and that a second
  agreement in the same organization is not reachable through it.
- An executed leak test asserts the portal response body contains no value from `players`,
  `profiles`, `guardian_authorizations`, `emergency_contacts`, or any media table, run against a
  seeded organization that has all of them populated.
- An executed test proves revoked and expired grants produce byte-identical responses to a token
  that never existed.
- An executed test proves a sponsor asset upload creates a `sponsor_assets` row with status
  `pending` and that no placement transitions to live as a result.
- A static assertion proves no `select("*")` appears in the portal read adapter.
- Rate-limit behaviour on repeated invalid token lookups is proven by an executed test.
- `supabase/rls-policy.test.ts` gains literal policy-name assertions for `sponsor_portal_grants`.

## Related Information

- ADR 0001 — Human-In-The-Loop Agents. Sponsor uploads are drafts; humans approve.
- ADR 0002 — Server-Side Event Change Receipts. Establishes the SQL-authorized RPC posture reused here.
- ADR 0003 — Sponsor Revenue Spine Persistence. Supplies the agreement this grant scopes to.
- ADR 0005 — Privacy-Safe Sponsor Placement Metrics.
- Token-hash precedent: `0026_parent_invite_acceptance.sql`, `0029_temporary_caregiver_authorizations.sql:45`,
  `0033_registration_invitation_issuance.sql:62`, `lib/supabase/invite-acceptance.ts:5`.
- UI Spec: `docs/ui-spec/sponsor-portal-ui-spec.md`.
