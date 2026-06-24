import type { AppState } from "./types";
import { computeAdminHealth } from "./health";
import { getCoachRsvpSummaries } from "./rsvp";
import { getParentDashboard } from "./parent-dashboard";

export interface AssistiveSuggestion {
  id: string;
  surface: "admin" | "coach" | "parent";
  title: string;
  body: string;
  recommendation: string;
  boundary: string;
}

export function buildAdminAssistiveSuggestions(state: AppState, now: string): AssistiveSuggestion[] {
  const health = computeAdminHealth(state, now);
  const pendingRegistrations = state.registrationRequests.filter((request) => request.status === "pending").length;
  const topHealthGap = health[0];

  return [
    {
      id: "admin-registration-review",
      surface: "admin",
      title: "Registration review queue",
      body: `${pendingRegistrations} pending registration request(s) need human review before access is granted.`,
      recommendation: pendingRegistrations ? "Review oldest pending requests and confirm guardian/team scope before approval." : "No registration review action is needed right now.",
      boundary: "Suggests review order only; it cannot approve, reject, invite, or grant access."
    },
    {
      id: "admin-readiness-summary",
      surface: "admin",
      title: "Readiness summary",
      body: topHealthGap ? `${topHealthGap.title}: ${topHealthGap.count}` : "No readiness gaps detected.",
      recommendation: topHealthGap ? topHealthGap.detail : "Keep monitoring teams, schedules, media, and invites before launch.",
      boundary: "Summarizes existing records only; it does not create records or send providers."
    }
  ];
}

export function buildCoachAssistiveSuggestions(state: AppState, coachUserId: string, now: string): AssistiveSuggestion[] {
  const summaries = getCoachRsvpSummaries(state, coachUserId, now);
  const noResponseCount = summaries.reduce((total, summary) => total + summary.noResponse, 0);
  const nextSummary = summaries[0];

  return [
    {
      id: "coach-weekly-update-draft",
      surface: "coach",
      title: "Weekly update draft",
      body: nextSummary ? `${nextSummary.event.title}: ${nextSummary.noResponse} no-response player slot(s).` : "No upcoming RSVP summary is available.",
      recommendation: noResponseCount ? "Draft a short reminder that asks families to update RSVP and check snack or volunteer openings." : "Draft a positive weekly note with schedule and Parent Replay reminders.",
      boundary: "Drafts text only; coach must edit and save before any notification draft is created."
    },
    {
      id: "coach-parent-replay-prompt",
      surface: "coach",
      title: "Parent Replay prompt",
      body: "Parent Replay should stay to 2-3 practice focus areas.",
      recommendation: "Pick the top practice skills before publishing the replay so parents get a small, coach-approved activity set.",
      boundary: "Recommends focus only; publishing remains a coach/admin action."
    }
  ];
}

export function buildParentAssistiveSuggestions(state: AppState, parentUserId: string, now: string): AssistiveSuggestion[] {
  const dashboard = getParentDashboard(state, parentUserId, now);
  const nextEvent = dashboard.nextEvents[0];
  const nextRsvp = dashboard.rsvpNeeded[0];

  return [
    {
      id: "parent-next-best-action",
      surface: "parent",
      title: "Next best action",
      body: nextEvent ? `${nextEvent.title} is next on the family schedule.` : "No upcoming team event is visible for this parent scope.",
      recommendation: nextRsvp ? `Update RSVP for ${nextRsvp.player.firstName} ${nextRsvp.player.lastInitial}.` : "Check coach updates and keep notifications current.",
      boundary: "Uses only approved child/team records visible to this parent; it cannot RSVP or message for the family."
    }
  ];
}
