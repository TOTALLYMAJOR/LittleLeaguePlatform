---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# 02 — Role and Operating Context

Engagement: LeaguePilot UX convergence. Read-only audit phase, 2026-07-29.
Sources: `docs/family-experience-blueprint.md` (governing design contract), `docs/privacy-security.md`, `docs/codex-rules.md`, `AGENTS.md`, ADR-0001, runtime browsing as seeded demo parent.

## 1. Who the product serves

LeaguePilot is private software for youth-sports **leagues** (admins), **coaches**, and **parent/guardian families**. The parent experience — the subject of this engagement — serves adults coordinating children's sports lives. Children never log in; guardian accounts own all child access. One guardian account coordinates multiple children and multiple teams without account switching (blueprint §1, §19.7 — decided, not open for redesign).

### Parent-side actors

| Actor | Authority | Surfaces |
| --- | --- | --- |
| Guardian (primary parent) | Full family scope: RSVP, transportation, media consent, access grants, caregiver authorization | All `/parent/*` routes |
| Additional guardian | Same authority class, granted via league-verified request | Same routes, own account |
| Temporary caregiver | Time-boxed (≤14 days), event-boxed (1–10 events), one child/team; hard exclusions: medical, custody, RSVP, official schedule, publishing, roster, onward delegation | `/caregiver`, `/caregiver/accept` only |
| Public visitor | Public schedule, sponsor info, access request | `/`, `/schedule`, `/registration`, `/sponsors` |

Coach and admin roles exist with their own shells and are out of scope for redesign in this engagement, except where parents cross into shared surfaces (`/team-chat`, `/team-portal`, `/account`) and inherit the wrong navigation (confirmed defect — see 01/03).

## 2. Operating conditions the experience must survive

These come from the brief and are ratified by the blueprint's own acceptance contract (§19.17: outdoor contrast, one-handed moderated tests, 200% zoom, 400% reflow, reduced motion, forced colors):

| Condition | Design consequence |
| --- | --- |
| Time pressure (leaving for a game in 20 minutes) | Five-second answerability: next event, leave time, unresolved items in the first viewport. Blueprint's "seven questions in five seconds" is the contract. |
| Outdoor use, bright sunlight | High-contrast light-first system; the shipped warm-light system is correct for this. Blueprint §9 reserves an "outdoor mode" (more contrast, less translucency) — specified, never built. |
| Poor connectivity (fields with weak signal) | Offline read of essential event info with freshness truth (§19.11); "Saved on this device" is never presented as a server save. Shipped: SW offline fallback, offline banners, RSVP outbox behind `NEXT_PUBLIC_OFFLINE_WRITES_ENABLED`. |
| One-handed mobile | Bottom tab bar (shipped, 5 items, safe-area padded); primary event action in thumb zone; 44px minimum / 48px consequential targets. |
| Multiple children and teams | One household view, presentation-only family filter (blueprint §5). Shipped only in Communication Room; missing as a global pattern — a top convergence target. |
| Last-minute schedule changes | Single official event revision fans out to every projection; "Changed" band sits above affected content until reviewed; RSVPs bound to schedule version; transportation invalidated by version drift. Largely implemented in domain logic. |
| Frequent interruption | Resumable state, persisted receipts, idempotent acknowledgement RPCs; no multi-step flows that lose progress. |
| Variable digital literacy | Plain family language; no exposed jargon (UUIDs, "access grants", "self-registration" are recorded copy defects); the blueprint's §10 copy table is the replacement vocabulary. |

## 3. Trust and authority rules that shape every surface (non-negotiable)

These are decided in `docs/privacy-security.md`, the blueprint (§4, §9, §13, §15), `docs/communication-room-implementation.md`, and ADR-0001. The experience architecture must express them, never soften them:

1. **Children do not log in.** Player display names are first name + last initial outside admin contexts.
2. **Acknowledgement = receipt only.** It never implies agreement, attendance, transportation, compliance, or completion. Published / Delivered / Read / Acknowledged are four independent evidence lanes and may never be merged into one status.
3. **Fail closed, never fake success.** Missing or stale critical evidence renders an unknown/"needs verification" state. No component may replace an unknown value with a success check.
4. **Mutual acceptance for transportation.** Responsibility is unassigned until driver and requesting guardian both accept at the current event version; version drift → "needs review". No home addresses collected; pickup restrictions fail closed without revealing details.
5. **Three communication lanes** — Critical / Updates / Conversation — authority-separated; critical content never appears only inside chat; conversation cannot mutate operational truth.
6. **Provider sends, media upload/release, and payments are off by default** (env kill switch + org flag + DEC-* decision). UI must never imply delivery, payment, or publication that didn't provably happen.
7. **Automation recommends; humans approve.** AI/agents never publish, send, grant access, assign responsibility, or acknowledge (ADR-0001).
8. **Caregiver access is visibly narrower than guardian access** and expires; the two must never look interchangeable.
9. **Team branding is decorative** and never overrides safety, status, RSVP, or schedule clarity.
10. **Archived seasons are read-only** everywhere: UI, service, RLS.

## 4. Engineering operating context (constrains the migration plan)

- Next.js App Router + TypeScript; business rules live in `lib/domain/`, provider access in `lib/services/`; UI never calls Supabase directly (`docs/codex-rules.md` strict rules 1–6: no domain edits, no enum changes, no new workflow states, no state-machine bypass).
- **No second CSS framework.** The global CSS token system (`app/globals.css`, 13,916 lines + `app/parent/parent-weekly.css`, 1,492 lines) is the mandated styling substrate (`docs/tech-stack.md`).
- `lib/navigation/route-topology.ts` is the single source of truth for route labels, role grouping, and shell navigation; compatibility routes (`/team-chat`, `/team-portal`, `/schedule`, etc.) must stay reachable.
- Every production slice needs: typed contracts, role-scoped policy, success/failure/loading/empty UI states, audit logging for sensitive actions, permission-boundary tests, tracker updates (AGENTS.md Definition of Done).
- Proof discipline: all parent slices are at best `done-local`. Hosted proof, RLS actor-action proof, accessibility evidence, and provider delivery are open external gates (`EXT-*` in `docs/backlog-closeout-2026-07-27.md`). Nothing in the target-state documents may describe these as production-proven.
- QA guard LP-QA-GUARD-001: row-mutating proof scripts are isolated-QA-only; production Supabase and `leaguepilot.us` hosts are rejected.

## 5. Where the current experience violates its own operating context (preview of 01)

- The five-second contract is met on `/parent` but defeated on every subpage by three stacked meta-panels ("YOU ARE HERE" banner, role/org/season/team table, Sign out) before content.
- Variable digital literacy is violated by policy-statement heroes ("Parents answer attendance for linked children only."), raw UUIDs on `/account`, and internal names ("Little League HQ demo") in the sidebar brand block.
- One-handed mobile is violated by 6,000–14,000px-tall pages (`/parent/photos` 14,224px mobile) and by `/parent`'s own header dropping its Schedule/Account links below 640px.
- Multi-child coordination is violated by five inconsistent child/team switcher mechanisms across routes and none globally.
- Dark-mode devices get a broken hybrid: `/parent` hard-coded light, all sibling routes inverted near-black — the in-source root of the "two competing systems" perception.
