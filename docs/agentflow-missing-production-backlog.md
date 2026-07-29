# LeaguePilot Missing Production Slice Execution Queue

This reviewed AgentFlow queue executes the LeaguePilot missing-production work
one commit at a time from the current
`agentflow/missing-production-sequence-20260729` lineage.
The full slice inventory and external proof boundaries are governed by
`docs/missing-production-slices-work-plan.md` and
`docs/exceptional-ux-acceptance-audit.md`.

This queue does not deploy, apply migrations to a hosted project, mutate
production data, enable provider sends, enable payments, enable private media
uploads, change DNS, configure secrets, or claim hosted/provider/production
acceptance. Those gates remain explicit in the governing plan.

Completed baseline:

- LPM-001 integrated in AgentFlow build
  `build_5e3e818d-6dc6-4069-8fc9-6498a727b3eb` at integration commit
  `e7bdd57e24b26a01430e93be448b457a3cac19fc`.
- LPM-002A integrated in AgentFlow build
  `build_555180a0-4db6-4c85-8247-2c86185dd785` at integration commit
  `962abe3ff5361ffcf72e855a8b82ff50b2653be5`.
- LPM-003 integrated in AgentFlow build
  `build_c919675f-58c5-4802-8635-de00101dfe4d` at integration commit
  `cca95821e400190b2a3f7134ca2a792558f9a7a3`.
- LPM-004A integrated in AgentFlow build
  `build_4c2a4279-897c-4045-8c1a-9edf0600524e` at integration commit
  `42d16c6a096cc4d5d218268b58e2d6c8a2ba6049`.
- LPM-005A integrated in AgentFlow build
  `build_5827781b-fefd-4baf-87a2-bdf6f5eeeeef` at integration commit
  `4b80b959462fb71a9432a53a83e9ecc38b2583bd`.
- LPM-006A integrated in AgentFlow build
  `build_2df551bf-6d0a-46c0-9738-0809a1dd3a78` at integration commit
  `2c18dd75c65669f516a7224e4b4f86343ba8165f`.
- LPM-007A integrated in AgentFlow build
  `build_b1ea8cf7-a6ed-45e8-88b8-7cf50f38ffb8` at integration commit
  `bd94292720fc8d7ece02f7b2d9989e5d34273b44`.
- LPM-008A integrated in AgentFlow build
  `build_57282bd1-9c97-4a59-8ce5-0f97510dd9fc` at integration commit
  `3089c54c77513f1820eec69bc69ab9d34d5f8c8c`.

## LPM-009A - Add sponsor Stripe readiness verifier

```yaml
estimate_hours: 4
depends_on: []
owns:
  - package.json
  - scripts/verify-sponsor-stripe-readiness.mjs
  - scripts/verify-sponsor-stripe-readiness.test.mjs
  - docs/runbook.md
  - docs/missing-production-slices-work-plan.md
  - docs/production-task-board.md
validate:
  - npm ci --ignore-scripts --prefer-offline
  - npm run check:skills
  - node --test scripts/verify-sponsor-stripe-readiness.test.mjs
  - npm test -- lib/supabase/sponsors.test.ts lib/supabase/sponsor-operations.test.ts components/sponsor-hub.test.tsx app/api-live-actions.test.ts app/api-auth.test.ts
  - npm run typecheck
  - npm run build
  - git diff --check
produces:
  - name: sponsor-stripe-readiness-verifier
    type: local-readiness-proof
    version: 1.0.0
    path: scripts/verify-sponsor-stripe-readiness.mjs
consumes: []
```

Implement a no-mutation verifier for the local LPM-009 sponsor Stripe readiness
contracts that already exist in sponsor billing domain code, admin sponsor
operations, Stripe checkout routes, Stripe webhook verification, public sponsor
privacy copy, payment-provider docs, migrations, and focused tests. The
verifier must prove, from repository source, that sponsor billing has an
explicit proof-only-versus-sandbox decision boundary, one-time sponsor
collection uses server-side Stripe Checkout Sessions when enabled, browser
return state never marks a sponsor paid, and signature-verified webhooks remain
the only settlement truth.

The tool must not call Stripe, Supabase, sign in, run Playwright, seed data,
mutate hosted records, create Checkout Sessions, configure API keys or webhook
secrets, register webhook endpoints, charge/refund payments, call provider
dashboards, deploy, or claim sandbox, hosted, provider, finance, or production
acceptance. Its job is to make the local readiness contract executable and to
name exact blockers before an operator runs approved Stripe sandbox, webhook,
hosted, reconciliation, refund/failure, or production payment proof.

### Acceptance Criteria

- A new `qa:sponsor-stripe-readiness` script reads only repository files and
  fails with named blockers when an LPM-009 local readiness contract is
  missing or weakened.
- The verifier checks the product decision/proof boundary: sponsor billing
  records, invoice readiness, payment-proof state, placement, fulfillment, and
  public display remain separate; proof-only status is not presented as Stripe
  settlement; browser return messages do not confirm payment.
- The verifier checks Checkout Sessions readiness: any one-time sponsor
  collection path uses server-side `checkout.sessions.create`, omits
  `payment_method_types`, binds organization and sponsor billing metadata,
  uses idempotency, requires organization-admin authority, requires both server
  and organization payment gates, and refuses unverified Stripe Connect charge
  readiness.
- The verifier checks key and environment security: Stripe credentials are
  server-side only, docs prefer restricted API keys with separate environments,
  source and UI do not expose `sk_` or `rk_` values, errors do not log secrets,
  and missing Stripe configuration fails closed.
- The verifier checks webhook settlement truth: the route verifies
  `stripe-signature` with `STRIPE_WEBHOOK_SECRET`, uses Stripe
  `constructEvent` on the raw body, records signed payment evidence, handles
  duplicate events idempotently, distinguishes paid, failed, and account
  readiness events, and validates organization, sponsor billing record,
  checkout session/payment intent, amount, currency, metadata, and event
  identity before any paid claim.
- The verifier checks admin and public privacy separation: the admin Sponsor
  Hub separates sponsor record, placement, invoice readiness, payment proof,
  refund/failure follow-up, fulfillment, report export, and public display;
  public and parent surfaces never expose sponsor billing state, child
  profiles, parent contacts, private media, or redemption proof.
- The verifier explicitly names Stripe sandbox account setup, restricted key
  creation, webhook endpoint registration, signing-secret configuration,
  sandbox Checkout Session proof, signed webhook replay/duplicate proof,
  refund/failure proof, hosted admin proof, finance reconciliation, and
  production payment approval as open gates.
- Tests cover passing fixtures and at least one missing-contract failure for
  each readiness family without requiring hosted credentials, network access,
  Supabase, Stripe, browser automation, or provider dashboard access.
- `docs/runbook.md`, `docs/missing-production-slices-work-plan.md`, and
  `docs/production-task-board.md` describe the verifier as local repository
  readiness proof only; Stripe sandbox account setup, restricted key creation,
  webhook endpoint registration, signing-secret configuration, sandbox Checkout
  proof, signed webhook replay/duplicate proof, refund/failure proof, hosted
  admin proof, finance reconciliation, and production payment approval remain
  open gates.
