# Agent Workflow Cards

## Registration Review

- Agent: Registration Agent.
- Surface: Parent Registrations.
- Input: pending registration, possible player records, invite status, existing guardian links.
- Output: match recommendation, confidence, risk notes, suggested admin action.
- Approval: required before access is granted.
- Audit: registration reviewed, reviewer, decision, target child/team, confidence summary.

## CSV Roster Import

- Agent: Import Agent and Roster Agent.
- Surface: CSV Imports and Rosters.
- Input: uploaded CSV, current teams, current players, required headers.
- Output: validation report, duplicate warnings, proposed inserts/updates, rollback plan.
- Approval: required before records are saved.
- Audit: import previewed, import approved, rows inserted/updated/rejected.

## Schedule Update

- Agent: Schedule Agent.
- Surface: Master Schedule and Notifications.
- Input: event changes, affected teams, notification preferences.
- Output: conflict report and notification draft.
- Approval: required before push/email/SMS notification.
- Audit: schedule changed, notification queued/sent, recipients summary.

## Score Entry

- Agent: Schedule Agent.
- Surface: Schedule and Standings.
- Input: completed game, entered scores, current standings.
- Output: score validation and projected standings change.
- Approval: admin save action required.
- Audit: score entered or corrected, standings recalculated.

## Coach Weekly Update

- Agent: Coach Assistant Agent.
- Surface: My Team, Chat, Schedule.
- Input: coach's assigned team schedule, roster readiness, recent team notices.
- Output: editable draft message.
- Approval: coach sends manually.
- Audit: generated draft metadata; provider send only if production send occurs.

## Media Moderation

- Agent: Media Safety Agent.
- Surface: Media Links.
- Input: reported media link, visibility, team scope, reporter, reason.
- Output: moderation recommendation.
- Approval: coach/admin action required to hide or remove.
- Audit: media reported, hidden, restored, or removed.

## Season Archive

- Agent: Retention Agent.
- Surface: Season Archive.
- Input: season state, outstanding games, exports, chat retention policy.
- Output: archive readiness checklist and deletion impact summary.
- Approval: admin archive action required.
- Audit: archive closed, retained record classes, chat deletion count, no chat bodies.
