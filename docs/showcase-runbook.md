---
authority: reference
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-25
---
# Showcase Runbook

How to demonstrate LeaguePilot to a coach, a league board, or a sponsor —
without paid services — and what the demo may honestly claim. Everything in
§1–§3 was executed and verified on 2026-08-25 in a clean checkout.

## 1. The 60-second demo (zero configuration)

No `.env`, no Supabase, no accounts:

```bash
git clone <repo> && cd LittleLeaguePlatform
npm install
npm run dev
```

Verified: the server is ready in under 2 seconds and `/`, `/schedule`,
`/registration`, `/sponsors`, and `/auth` all render real seed content (the
public Rockets schedule included). Signed-in routes correctly show access
walls — that privacy is itself worth showing.

Use this mode for a hallway demo of the public experience and the privacy
posture. It cannot show the parent/coach/admin homes.

## 2. The full showcase (Supabase free tier — $0)

The role homes require real sessions. The sanctioned path uses a **free-tier
Supabase project** (no card required), so the complete showcase still costs
nothing:

1. Create an isolated Supabase project. Never point these scripts at a
   production project — every seeding script is wrapped by the QA target guard
   and requires an explicit `load-fictional-data` confirmation.
2. Copy `.env.example` → `.env.local`; set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `DATABASE_URL`, and `PUBLIC_ORGANIZATION_ID` once the org exists.
3. `npm run supabase:push` — applies the migration chain.
4. `npm run supabase:demo-tenant` — the fictional league: org, season, two
   teams, coach/parent users, players, guardians, fields, events, invites.
5. `npm run seed:demo-showcase` — two more teams, a fuller schedule, team
   chat, media — **and, as of this runbook, sponsors and pending registration
   requests** (three sponsors including one pending review, two active
   placements, two pending registrations), so the admin walkthrough has real
   queues to work.
6. `npm run supabase:qa-users` — parent, coach, and admin sign-ins (fictional
   emails; passwords printed once).

## 3. The walkthrough script

**Parent** (sign in as the QA parent): Family Home → next event → answer the
RSVP → schedule → messages. The story: *one screen answers "what does my
family need before Saturday."*

**Coach** (QA coach): Coach Home → attendance counts → RSVP reminder queue.
Each queued family now has two buttons: *Queue RSVP reminder draft* (the
reviewed in-app path) and **Copy for group text** — the app drafts a neutral
message and the coach pastes it into the channel families already use. The
story: *the app tells you who's unsettled and drafts the nudge; you stay in
control of sending.*

**Admin** (QA admin): Registrations queue → approve Casey Morgan's pending
request live → Sponsors panel → note the pending "Bright Smiles Dental" team
sponsor awaiting review beside the two active league sponsors. The story:
*families ask, the league verifies; sponsors are managed with placement
control and privacy rules.*

**Registration, end to end**: open `/registration` in a second window, submit
a request as a new family, switch to the admin window, and approve it. This is
the strongest live moment in the demo — do it last.

## 4. What the demo must never claim

- **No message is sent by the platform.** Email, SMS, and push are disabled by
  default (`PROVIDER_SENDS_ENABLED=false`) and require human approval when
  enabled. Say "you'll see it in the app" — never "we'll text you."
- **No payment is collected.** Sponsor billing and family payments are gated
  off; sponsor rows in the demo carry no billing state.
- **Media is link-only.** Uploads and family release are gated off, and
  guardian media consent capture is not yet built.
- All demo people are fictional; the seeds refuse to run without the
  `load-fictional-data` confirmation and refuse production targets.

## 5. Communication without paid services

Ranked by cost, effort, and honesty. The paid providers (SendGrid, Twilio,
Pingram) are integrated but off; none of the following needs any of them.

| # | Channel | Cost | Status in repo | What it gives you |
| --- | --- | --- | --- | --- |
| 1 | **In-app + installable PWA** | $0 | Live | The baseline: open the app, see the truth. The PWA installs to the home screen and caches reads for the field. |
| 2 | **Copy for group text** | $0 | **Shipped in this slice** (coach reminder queue) | The app drafts, the coach pastes into the existing group text. Zero infrastructure, respects review-only, and meets families where they already are. |
| 3 | **Calendar subscription (ICS)** | $0 | Export exists; **authorization fixed in this slice** (team members and org admins only). Subscribable per-family feed URLs are the natural next step. | The phone's own calendar becomes the notifier: events appear in Google/Apple Calendar, reminders fire natively, changes propagate on refresh. Parents never have to remember to open anything. |
| 4 | **Web Push (VAPID)** | $0 | Adapter, `push_subscriptions` table, and worker built; disabled by policy | Self-hosted browser push — no third-party account. Generate keys once (`npx web-push generate-vapid-keys`), set the `VAPID_*` env values, and enable only through the existing gates: `PROVIDER_SENDS_ENABLED` + the organization flag + human-approved delivery. Free is not ungoverned — the approval boundary stays. |
| 5 | **`mailto:` / `sms:` deep links** | $0 | Not built (small candidate slice) | A button that opens the coach's own mail or Messages app with recipients and body prefilled. The human presses send from their own account — no service, no sender reputation, no compliance surface. |
| 6 | **QR code to the team page** | $0 | Not built (trivial) | Print it on the dugout clipboard; anyone at the field scans to the public schedule. |
| 7 | League's own mailbox (SMTP) | ~$0 | Not built; **not recommended yet** | Sending through a league Gmail/Workspace account works at pilot volume but risks spam-foldering and account limits. Prefer 1–5; adopt paid email only when volume and deliverability demand it. |

The honest hierarchy: **the calendar reminds, the app settles, the group text
bridges** — and paid providers become worth their money only when a league
outgrows all three.
