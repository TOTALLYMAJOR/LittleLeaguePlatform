import { generateParentReplayDraft } from "./parent-replay";
import type { AppState, PracticeFocusArea } from "./types";

export type AiCoachWorkspaceToolId =
  | "new_parent_brief"
  | "weekly_digest"
  | "practice_replay"
  | "announcement_cleaner";

export interface AiCoachWorkspaceInput {
  teamId: string;
  coachUserId: string;
  now: string;
  focusAreas?: PracticeFocusArea[];
  roughAnnouncement?: string;
}

export interface AiCoachWorkspaceDraft {
  id: AiCoachWorkspaceToolId;
  label: string;
  title: string;
  body: string;
  sourceEvidence: string[];
  workflow: Array<"Preview" | "Edit" | "Approve" | "Publish">;
  boundary: string;
}

const reviewWorkflow: AiCoachWorkspaceDraft["workflow"] = ["Preview", "Edit", "Approve", "Publish"];

function formatEventDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function upcomingEvents(state: AppState, teamId: string, now: string) {
  const nowTime = Date.parse(now);
  return state.events
    .filter((event) => event.teamId === teamId && event.status === "scheduled" && Date.parse(event.startsAt) >= nowTime)
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}

function latestAnnouncement(state: AppState, teamId: string) {
  return state.announcements
    .filter((announcement) => announcement.teamId === teamId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function pinnedPosts(state: AppState, teamId: string) {
  return state.chatMessages.filter((message) => (
    message.teamId === teamId &&
    message.kind === "announcement" &&
    message.pinned &&
    message.moderationStatus === "visible"
  ));
}

function volunteerNeeds(state: AppState, teamId: string) {
  return state.volunteerSignups.filter((signup) => signup.teamId === teamId && signup.status === "open");
}

function snackNeeds(state: AppState, teamId: string) {
  return state.snackScheduleSlots.filter((slot) => slot.teamId === teamId && slot.status === "open");
}

function coachName(state: AppState, coachUserId: string) {
  return state.users.find((user) => user.id === coachUserId)?.name ?? "Coach";
}

function evidence(items: Array<string | undefined>) {
  return items.filter((item): item is string => Boolean(item));
}

function cleanAnnouncement(input: string, fallbackTitle: string) {
  const compact = input.replace(/\s+/g, " ").trim();
  const weatherNote = /weather|cool|rain|hot|cold/i.test(compact) ? "Weather may change, so check the team app before leaving." : undefined;
  const bring = [
    /water/i.test(compact) ? "Water" : undefined,
    /glove/i.test(compact) ? "Glove" : undefined,
    /hat/i.test(compact) ? "Hat" : undefined,
    /helmet/i.test(compact) ? "Helmet" : undefined
  ].filter((item): item is string => Boolean(item));

  return [
    fallbackTitle,
    "",
    "Arrive 15 minutes early.",
    bring.length ? "Bring:" : undefined,
    ...bring.map((item) => `- ${item}`),
    weatherNote
  ].filter(Boolean).join("\n");
}

export function buildAiCoachWorkspaceDrafts(state: AppState, input: AiCoachWorkspaceInput): AiCoachWorkspaceDraft[] {
  const team = state.teams.find((item) => item.id === input.teamId);
  const events = upcomingEvents(state, input.teamId, input.now);
  const nextEvent = events[0];
  const nextPractice = events.find((event) => event.eventType === "practice");
  const nextGame = events.find((event) => event.eventType === "game");
  const announcement = latestAnnouncement(state, input.teamId);
  const pins = pinnedPosts(state, input.teamId);
  const volunteers = volunteerNeeds(state, input.teamId);
  const snacks = snackNeeds(state, input.teamId);
  const focusAreas: PracticeFocusArea[] = input.focusAreas?.length ? input.focusAreas : ["throwing", "catching", "teamwork"];
  const replayDraft = team ? generateParentReplayDraft(state, {
    teamId: input.teamId,
    coachUserId: input.coachUserId,
    focusAreas,
    now: input.now
  }) : null;
  const teamName = team?.name ?? "this team";
  const coach = coachName(state, input.coachUserId);

  const parentBriefBody = [
    `Welcome to ${teamName}!`,
    "",
    "This team focuses on fun, teamwork, and learning.",
    `${coach} asks everyone to arrive 15 minutes early.`,
    nextPractice ? `Next practice: ${formatEventDate(nextPractice.startsAt)} at ${nextPractice.locationName}.` : undefined,
    announcement ? `Recent coach note: ${announcement.body}` : undefined,
    pins[0] ? `Pinned post: ${pins[0].body}` : undefined,
    "",
    "Your child will need:",
    "- Glove",
    "- Water",
    "- Hat",
    volunteers[0] ? `Next volunteer opening: ${volunteers[0].role}.` : undefined,
    snacks[0] ? `Next snack opening: ${snacks[0].item}.` : undefined,
    "Welcome!"
  ].filter(Boolean).join("\n");

  const weeklyDigestBody = [
    "This Week",
    nextPractice ? `Practice: ${formatEventDate(nextPractice.startsAt)} at ${nextPractice.locationName}.` : "Practice: check the schedule for the next practice.",
    nextGame ? `Game: ${formatEventDate(nextGame.startsAt)} at ${nextGame.locationName}.` : "Game: no game is scheduled this week.",
    "Remember helmets, gloves, water, and hats.",
    replayDraft ? `Coach is emphasizing ${replayDraft.focusAreas.join(", ")} this week.` : undefined,
    volunteers.length ? `${volunteers.length} volunteer opening(s) still need help.` : "Volunteer roles are currently covered.",
    snacks.length ? `${snacks.length} snack opening(s) still need help.` : "Snack roles are currently covered."
  ].filter(Boolean).join("\n");

  const practiceReplayBody = replayDraft
    ? [
        replayDraft.summary,
        "",
        "At home:",
        ...replayDraft.homeActivities[1]!.steps.map((step) => `- ${step}`),
        "",
        replayDraft.parentTip
      ].join("\n")
    : "Select a known team before drafting a practice replay.";

  const roughAnnouncement = input.roughAnnouncement ?? announcement?.body ?? "hey everyone weather may change tomorrow please bring water glove and hat";

  return [
    {
      id: "new_parent_brief",
      label: "Generate Parent Brief",
      title: `New parent brief for ${teamName}`,
      body: parentBriefBody,
      sourceEvidence: evidence([
        `${events.length} upcoming schedule item(s)`,
        announcement ? "latest coach announcement" : undefined,
        pins.length ? `${pins.length} pinned team post(s)` : undefined,
        `${volunteers.length} volunteer opening(s)`,
        `${snacks.length} snack opening(s)`
      ]),
      workflow: reviewWorkflow,
      boundary: "Coach must approve before this becomes a family-facing welcome brief."
    },
    {
      id: "weekly_digest",
      label: "Create Weekly Digest",
      title: `Weekly digest for ${teamName}`,
      body: weeklyDigestBody,
      sourceEvidence: evidence([
        nextPractice ? "next practice" : undefined,
        nextGame ? "next game" : undefined,
        replayDraft ? "Parent Replay focus areas" : undefined,
        `${volunteers.length + snacks.length} open family help item(s)`
      ]),
      workflow: reviewWorkflow,
      boundary: "This queues review-ready copy only; provider sends remain disconnected."
    },
    {
      id: "practice_replay",
      label: "Practice Replay",
      title: replayDraft?.title ?? `Practice Replay for ${teamName}`,
      body: practiceReplayBody,
      sourceEvidence: evidence([
        replayDraft ? `${replayDraft.focusAreas.length} coach-selected focus area(s)` : undefined,
        replayDraft ? "home activity generator" : undefined
      ]),
      workflow: reviewWorkflow,
      boundary: "Practice Replay remains coach-reviewed and limited to 2-3 focus areas."
    },
    {
      id: "announcement_cleaner",
      label: "Draft Announcement",
      title: "Announcement cleaner",
      body: cleanAnnouncement(roughAnnouncement, nextPractice ? "Tomorrow's Practice" : "Team Update"),
      sourceEvidence: evidence([
        announcement ? "latest rough announcement" : "coach rough draft",
        nextEvent ? "next schedule item" : undefined
      ]),
      workflow: reviewWorkflow,
      boundary: "Cleaner rewrites structure only; a coach still owns accuracy and publishing."
    }
  ];
}
