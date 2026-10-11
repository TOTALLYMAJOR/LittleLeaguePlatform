# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Parents and guardians managing youth-sports schedules, registration, team access, communications, and family participation.
- Volunteer coaches coordinating teams, attendance, practice follow-up, game-day readiness, and reviewed family communications.
- League administrators managing registration, memberships, teams, seasons, safety, providers, sponsors, and operational review queues.
- Children are participants, not account owners. Parent or guardian accounts own child access.

## Product Purpose

LeaguePilot is a privacy-first youth-sports operations platform that helps families, volunteer coaches, and league administrators organize schedules, team access, communications, registration, and league operations. Success means each role can understand what needs attention, take the next permitted action, and reach game day with fewer coordination gaps.

## Positioning

LeaguePilot combines family-facing clarity with role-scoped league operations. Sensitive actions remain governed: private access is tied to verified adult roles, child identity is minimized, and provider-sensitive or consequential actions require service policy and human approval rather than autonomous agent execution.

## Operating Context

- Public visitors can view the landing page, public schedule, sponsor information, registration entry points, and account access routes.
- Signed-in parents, coaches, and administrators receive distinct navigation, data, and actions based on verified role and team scope.
- Core workflows include registration review, membership and roster setup, game-day scheduling, attendance and RSVP coordination, team communication, weather review, media review, sponsor operations, and season administration.
- Agents may recommend, validate, queue, draft, match, summarize, and flag. Humans approve roster imports, registration matches, invite sends, score corrections, media moderation, and archive close.

## Capabilities and Constraints

- The production scaffold uses Next.js, TypeScript, and Supabase-backed service boundaries.
- Some screens use typed seed fallback when live rows or authentication context are unavailable; fallback state must not be described as persistence, delivery, authentication, or access proof.
- Email, SMS, push, chat, and other provider sends require consent, approval, delivery logs, and explicit production configuration.
- Admin, coach, and parent permission boundaries must remain visible in interface behavior, service policy, and tests.
- Player display names remain first name plus last initial. Children do not log in.
- Local validation, hosted deployment, provider delivery, production acceptance, and customer outcomes are separate evidence levels.

## Brand Commitments

- Product name: LeaguePilot.
- Public promise: "Your season, organized."
- Voice: clear, supportive, operationally honest, and appropriate for volunteer-run youth sports.
- The signed-out landing page honors Pearl River Youth Sport Administrators and Volunteers.
- Existing product copy must not imply live provider delivery, verified outcomes, or access grants without evidence.

## Evidence on Hand

- Current routes, components, domain rules, Supabase adapters, migrations, and tests in this repository.
- Feature and proof-boundary tracking in `docs/Features.md` and `docs/capability-matrix.md`.
- Agent authority boundaries in `docs/agentic-architecture.md`.
- Numbered LeaguePilot UX remediation records in `docs/product-experience/leaguepilot/`.
- The original static MVP remains available under `public/prototype/` as a historical reference, not the production surface.
- No testimonials, customer-performance claims, provider-delivery proof, or production acceptance evidence should be fabricated.

## Product Principles

1. Make the next permitted action obvious for families, coaches, and administrators.
2. Preserve child privacy and adult-owned access by default.
3. Keep role boundaries, lifecycle state, blockers, and proof boundaries visible.
4. Use human approval for consequential, provider-sensitive, or trust-and-safety actions.
5. Distinguish demonstrations and local validation from persistence, delivery, deployment, and acceptance.

## Accessibility & Inclusion

The web experience must remain keyboard usable, responsive, readable across supported themes, and respectful of reduced-motion preferences. Public and signed-in workflows must not rely on color or animation alone to communicate state.
