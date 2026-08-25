---
authority: evidence
answers: null
supersedes: []
superseded_by: null
reviewed: 2026-08-22
---
# 06 — Saturday Ready: Target State

Experience-architecture specification, 2026-07-29. Companion to `05-saturday-ready-current-state.md`. Constraints honored: no new workflow states, no enum changes, no domain edits without instruction (`docs/codex-rules.md`); acknowledgement = receipt only; readiness is derived evidence, never a stored boolean; no implied provider delivery.

## The loop as the family experiences it

One continuous surface-to-surface path, mobile-first, completable one-handed in under two minutes when nothing is wrong, and self-explaining when something is:

```
Home (family week)
  └─ What Changed band ──────── review change → band clears for this guardian
  └─ Next Event passport ────── all seven questions answered or flagged
        ├─ RSVP (inline) ────── going/maybe/can't go, per child, version-bound
        ├─ Ride (inline entry)── request → offer → mutual accept → passport updates
        └─ Official update ──── read → acknowledge (receipt only)
  └─ Readiness strip ────────── "Nothing unresolved for Saturday" or the list of what is
```

## Step-by-step target

### 1. Family Home (archetype: Family Overview)

- First viewport at 390px: header with family filter (Everyone / per child), What Changed band (only when unreviewed changes exist), Next Event passport with inline RSVP, readiness strip. Nothing else above the fold.
- Below: This Week agenda (per-child rows, same RSVP grammar), Coach Updates (with ack state chips), Practice Replay card, Family help (snack/volunteer), quiet footer links.
- Remove the "Detailed family operations" `<details>` — its four embedded pages disperse to their canonical destinations (see 07).
- Child/team filter is global, presentation-only (blueprint §5), persists across Home/Schedule/Messages.

### 2. What Changed (upgrade from version-number to evidence-backed diff)

- Data: read `event_change_logs` (already written with `change_type`, `before_json`, `after_json`, reason, actor) — a new read adapter, no schema change.
- Presentation: one band per affected event: "Practice **time changed**: ~~6:00 PM~~ → **5:30 PM** · Riverside Rockets · by Coach Taylor · Jul 29". Change types map to plain verbs (moved, new time, new location, cancelled, restored).
- "Since you last checked" watermark: per-guardian `last_reviewed` marker. Honest v1 without schema change: local device watermark labeled "on this device"; durable v2 (needs a small table or reuse of notification read receipts where a linked official communication exists): per-account. Never claim account-level review state from device-local data.
- Reviewing a change never acknowledges anything — the band clears visually; official acknowledgement stays in Messages with its own semantics.
- If a change invalidated transportation (`needs_review` derived state), the band says so explicitly and deep-links to the ride step: "Your accepted ride for this event needs review."

### 3. Next Event passport (archetype: Event Workspace)

One passport component (already exists with full/compact/offline/caregiver variants — generalize, don't rebuild) rendering, in blueprint §7.8 order: status/change → event + child → time (leave-time when computable; otherwise start time labeled plainly) → venue/directions → responsibility (ride outbound/return, snack) → bring list (from coach update when present) → RSVP → critical instructions → source + freshness ("Schedule version 3 · updated Jul 29 · available offline").

- Every unresolved field renders its unresolved state ("Ride home: Not assigned — ask for help"), never blank, never assumed.
- Offline: cached copy with freshness line; actions disabled with honest copy (current behavior, kept).

### 4. RSVP (action, not destination)

- One grammar everywhere: Going / Maybe / Can't go segmented control, current answer visibly selected, "Change" affordance after answer. Cancel-RSVP folds into re-answering (no fourth button; no state model change — `no_response` already exists as the cleared state only where domain allows; otherwise Cancel remains but restyled as tertiary within the change sheet).
- 409 handling (already strongest on Home) becomes the shared component's behavior: `schedule_changed` → "The schedule changed since you answered — review the new details"; `guardian_conflict` → "Jordan already answered Going · 2 min ago. Keep or change?"
- `/parent/rsvp` becomes the "Needs reply" task list (archetype: Task & Confirmation), reachable from Home's need-reply chip, Schedule's banner, and tab badges. Same component per row.

### 5. Transportation (mobile-first, passport-anchored)

Entry from the passport's responsibility row, presented as a 3-step sheet flow matching the shipped RPC lifecycle exactly:

1. **Ask for help** — direction (there/home/both as two records), optional note. → `requested` (open).
2. **Someone offers** — other guardians on the team see the open request on their Home/passport ("The Parkers need a ride home Saturday — can you help?") and offer. → `awaiting_requester_acceptance`, requester notified in-app.
3. **You confirm** — requester reviews offer, accepts. → `assigned`; passport flips to "Sam T. drives home · accepted by both families".

State vocabulary shown to families (mapped 1:1 to existing states, no new states): Requested / Offered (awaiting your confirmation) / Accepted / Withdrawn / Needs review (schedule changed) / Past event. Each state names who acts next.

- On schedule change, affected assignments surface in What Changed and on the passport as "Needs review" with one-tap re-request (new request at current version — existing RPC behavior).
- Desktop: same sheet content presented as a panel; the full `/parent/transportation` route remains as history/status list.
- Privacy microcopy preserved verbatim (no home addresses; restrictions fail closed without detail).

### 6. Official Team Update (Communication Room, decluttered)

- Three lanes stay (decided contract). Density fixes: acknowledgement semantics collapse to one line under the ack button ("Acknowledging confirms you saw this — nothing more") with a "Learn more" disclosure; "Human authority" panel moves to a support page; freshness dots consolidate into one source-status line.
- Critical items render as the `CriticalMessage` pattern: authority attribution, version, event context, ack button with receipt state, superseded banner when a newer version exists (ack correctly blocked — shipped RPC behavior surfaced in plain words: "A newer version of this message exists — review it instead").
- Home's Coach Updates card shows ack chips ("Acknowledged Jul 28" / "Needs acknowledgement") sourced from the same receipts.

### 7. Family Readiness (derived, honest)

- Rename concept from "Family Readiness Confirmed" to **"Ready for Saturday"** strip: aggregation of independent evidence lanes for the next event window — RSVP answered per attending child; ride responsibility resolved-or-not-needed; unacknowledged critical messages = 0; unreviewed changes = 0.
- Two renderings only: "**Nothing unresolved for Saturday**" (green check, still enumerable on tap) or "**2 things need you**" (orange, listed, each deep-linking to its step).
- Never a stored boolean; recompute per render (matches blueprint §12/§16 and operational-truth rules). "Waived/not needed" states require the underlying record (e.g., no ride request exists = "No ride help requested" neutral, not green).

## Cross-cutting target behaviors

| Concern | Target |
| --- | --- |
| Notification of change | In-app first (receipts already exist); provider delivery stays behind DEC-PROVIDER and is never implied. Copy: "You'll see changes here and in Messages" — not "we'll text you". |
| Interruption | Every step is a persisted record; returning to Home re-derives the same unresolved list. No client-only wizards. |
| Multi-child Saturday | Readiness strip and passport respect the family filter; "Everyone" shows the union of unresolved items grouped by child. |
| Offline | Read: cached passport + freshness. Write: outbox only where org-enabled; queued actions labeled "Saved on this device — waiting to sync", never counted as resolved in the readiness strip. |
| Accessibility | Steps announce state changes via the existing polite live region; the readiness strip is a labeled list, not a color; all targets ≥44px (48px for RSVP/accept). See 08. |
| Success evidence | Each action's confirmation names the persisted fact ("RSVP saved for Avery — Going, schedule v3") — mirrors what the RPC actually stored. |

## What this target does NOT require

- No new domain states, no enum changes, no migrations for v1 (change-diff adapter reads an existing table; device-local watermark is client-side).
- No provider sends, no push, no payments.
- No redesign of coach/admin surfaces (they consume the same official-communication and schedule writers already).

The only genuinely new persisted artifact worth proposing to the maintainers (v2, explicit approval needed per codex rules): a per-guardian change-review receipt table to make "since you last checked" account-durable. Everything else is presentation and adapter work over existing authoritative records.
