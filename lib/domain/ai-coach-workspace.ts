import { generateParentReplayDraft } from "./parent-replay";
import type { AppState, PracticeFocusArea } from "./types";

export type AiCoachWorkspaceToolId =
  | "new_parent_brief"
  | "weekly_digest"
  | "practice_replay"
  | "announcement_cleaner"
  | "smart_faq"
  | "coach_inbox_prioritization"
  | "game_day_parent_brief"
  | "season_timeline"
  | "coach_knowledge_base"
  | "action_item_extraction"
  | "safety_monitor"
  | "season_storybook";

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

function visibleTeamMessages(state: AppState, teamId: string) {
  return state.chatMessages.filter((message) => message.teamId === teamId && message.moderationStatus === "visible");
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

function answerSmartFaq(state: AppState, teamId: string) {
  const game = upcomingEvents(state, teamId, "1970-01-01T00:00:00.000Z").find((event) => event.eventType === "game");
  if (!game) {
    return {
      body: "Question: When is the next game?\nAnswer: No sourced game answer is available yet. Coach should reply or add it to the schedule.",
      source: undefined
    };
  }

  return {
    body: [
      "Question: When and where is the next game?",
      `Answer: ${game.title} is ${formatEventDate(game.startsAt)} at ${game.locationName}.`,
      "Source: team schedule."
    ].join("\n"),
    source: "team schedule"
  };
}

function inboxSummary(state: AppState, teamId: string) {
  const messages = visibleTeamMessages(state, teamId);
  const groups = [
    { label: "Urgent", count: messages.filter((message) => /weather|cancel|urgent|hurt|late/i.test(message.body)).length },
    { label: "Attendance", count: messages.filter((message) => /rsvp|going|not going|late|attendance/i.test(message.body)).length },
    { label: "Questions", count: messages.filter((message) => /\?|question/i.test(message.body)).length },
    { label: "Equipment", count: messages.filter((message) => /glove|hat|helmet|jersey|water/i.test(message.body)).length },
    { label: "Volunteer", count: messages.filter((message) => /snack|volunteer|setup|score/i.test(message.body)).length },
    { label: "Praise", count: messages.filter((message) => /great|thanks|thank you|awesome|proud/i.test(message.body)).length }
  ];

  return groups;
}

function coachKnowledgeEntries(state: AppState, teamId: string) {
  const messages = visibleTeamMessages(state, teamId);
  return messages
    .filter((message) => message.authorRole === "coach" || message.kind === "announcement")
    .map((message) => {
      const topic = message.topic ? message.topic.replace("_", " ") : "team note";
      return `${topic}: ${message.body}`;
    })
    .slice(0, 6);
}

function extractedActionItems(state: AppState, teamId: string, roughAnnouncement: string) {
  const volunteerItems = volunteerNeeds(state, teamId).map((signup) => `Volunteer Needed: ${signup.role}`);
  const snackItems = snackNeeds(state, teamId).map((slot) => `Snack Needed: ${slot.item}`);
  const roughItems = /volunteer|help|need/i.test(roughAnnouncement)
    ? ["Coach draft contains a help request; review before creating a family action."]
    : [];
  return [...volunteerItems, ...snackItems, ...roughItems];
}

function safetyFindings(state: AppState, teamId: string) {
  const patterns = [
    { label: "Bullying", regex: /\bstupid\b|\bidiot\b|\bloser\b/i },
    { label: "Profanity", regex: /\bdamn\b|\bhell\b/i },
    { label: "Threats", regex: /\bhurt\b|\bfight\b|\bthreat\b/i },
    { label: "Inappropriate adult conversation", regex: /\bprivate message\b|\bdm me\b|\bsecret\b/i }
  ];
  const messages = visibleTeamMessages(state, teamId);

  return patterns.map((pattern) => ({
    label: pattern.label,
    count: messages.filter((message) => pattern.regex.test(message.body)).length
  }));
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
  const messages = visibleTeamMessages(state, input.teamId);
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
  const faq = answerSmartFaq(state, input.teamId);
  const inboxGroups = inboxSummary(state, input.teamId);
  const gameDayBriefBody = nextGame ? [
    "Tomorrow",
    `${nextGame.locationName}`,
    `${formatEventDate(nextGame.startsAt)} game time`,
    "Arrive 15 minutes early.",
    "Blue jersey if the coach confirms uniforms in chat.",
    "Bring glove, water, hat, and helmet.",
    snacks.find((slot) => slot.eventId === nextGame.id)?.assignedParentUserId ? "Snack volunteer is assigned." : "Snack volunteer still needs confirmation.",
    "Weather: check the approved coach update before leaving."
  ].join("\n") : "No upcoming game is scheduled for this team.";
  const timelineItems = [
    ...events.map((event) => `${formatEventDate(event.startsAt)} - ${event.title}`),
    ...(announcement ? [`${formatEventDate(announcement.createdAt)} - Coach note: ${announcement.title}`] : []),
    ...state.mediaItems.filter((item) => item.teamId === input.teamId).map((item) => `${formatEventDate(item.createdAt)} - Media: ${item.title}`),
    ...(replayDraft ? [`${formatEventDate(replayDraft.generatedAt)} - Practice Replay: ${replayDraft.focusAreas.join(", ")}`] : [])
  ].slice(0, 8);
  const knowledgeEntries = coachKnowledgeEntries(state, input.teamId);
  const actionItems = extractedActionItems(state, input.teamId, roughAnnouncement);
  const safetyItems = safetyFindings(state, input.teamId);
  const storybookBody = [
    `${teamName} ${state.activeSeason.name}`,
    "",
    `This season began with ${state.players.filter((player) => player.teamId === input.teamId).length} players learning how to work together.`,
    announcement ? `Coach note: ${announcement.title} - ${announcement.body}` : undefined,
    replayDraft ? `Practice growth: ${replayDraft.summary}` : undefined,
    state.mediaItems.some((item) => item.teamId === input.teamId) ? "Family memories include approved team media and volunteer moments." : undefined,
    "Coach review decides which photos, achievements, and milestones appear in the downloadable keepsake."
  ].filter(Boolean).join("\n");

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
    },
    {
      id: "smart_faq",
      label: "Build FAQ",
      title: `Smart FAQ for ${teamName}`,
      body: faq.body,
      sourceEvidence: evidence([
        faq.source,
        announcement ? "announcements searched" : undefined,
        pins.length ? "pinned posts searched" : undefined,
        `${events.length} schedule item(s) searched`
      ]),
      workflow: reviewWorkflow,
      boundary: "FAQ answers must cite existing schedule, announcement, or pinned-post evidence; coach review is required before publishing."
    },
    {
      id: "coach_inbox_prioritization",
      label: "Prioritize Coach Inbox",
      title: `Inbox groups for ${teamName}`,
      body: inboxGroups.map((group) => `${group.label}: ${group.count}`).join("\n"),
      sourceEvidence: evidence([
        `${messages.length} visible team chat message(s)`,
        pins.length ? `${pins.length} pinned coach note(s)` : undefined
      ]),
      workflow: reviewWorkflow,
      boundary: "Inbox grouping is a coach triage view only; it does not hide, delete, or answer messages."
    },
    {
      id: "game_day_parent_brief",
      label: "Parent Brief Before Game",
      title: `Game-day parent brief for ${teamName}`,
      body: gameDayBriefBody,
      sourceEvidence: evidence([
        nextGame ? "next game schedule" : undefined,
        snacks.length ? "snack assignments" : undefined,
        pins.length ? "pinned coach notes" : undefined
      ]),
      workflow: reviewWorkflow,
      boundary: "Game-day brief stays coach-reviewed because arrival, uniform, snack, and weather details can change."
    },
    {
      id: "season_timeline",
      label: "Season Timeline",
      title: `${teamName} season timeline draft`,
      body: timelineItems.length ? timelineItems.join("\n") : "No sourced season timeline items are available yet.",
      sourceEvidence: evidence([
        `${events.length} schedule item(s)`,
        announcement ? "coach announcement" : undefined,
        `${state.mediaItems.filter((item) => item.teamId === input.teamId).length} media item(s)`,
        replayDraft ? "practice replay focus areas" : undefined
      ]),
      workflow: reviewWorkflow,
      boundary: "Timeline drafts are memory scaffolds; coach and admin review decides what becomes family-facing."
    },
    {
      id: "coach_knowledge_base",
      label: "Coach Knowledge Base",
      title: `${teamName} searchable coach answers`,
      body: knowledgeEntries.length ? knowledgeEntries.join("\n") : "No coach answers are available yet.",
      sourceEvidence: evidence([
        `${knowledgeEntries.length} coach-authored answer(s)`,
        pins.length ? "pinned coach posts" : undefined
      ]),
      workflow: reviewWorkflow,
      boundary: "Knowledge entries stay sourced to coach-authored messages and require coach review before reuse."
    },
    {
      id: "action_item_extraction",
      label: "Extract Action Items",
      title: `${teamName} family action items`,
      body: actionItems.length ? actionItems.join("\n") : "No family action items were found.",
      sourceEvidence: evidence([
        `${volunteers.length} volunteer opening(s)`,
        `${snacks.length} snack opening(s)`,
        /volunteer|help|need/i.test(roughAnnouncement) ? "rough coach draft" : undefined
      ]),
      workflow: reviewWorkflow,
      boundary: "Action extraction creates review-ready tasks only; coach approval is required before parents can claim anything."
    },
    {
      id: "safety_monitor",
      label: "Safety Monitor",
      title: `${teamName} private safety triage`,
      body: safetyItems.map((item) => `${item.label}: ${item.count}`).join("\n"),
      sourceEvidence: evidence([
        `${messages.length} visible team chat message(s) scanned`,
        "private escalation categories only"
      ]),
      workflow: reviewWorkflow,
      boundary: "Safety monitor is not public moderation; it privately escalates bullying, profanity, threats, or inappropriate adult conversation for coach/admin review."
    },
    {
      id: "season_storybook",
      label: "Season Storybook",
      title: `${teamName} end-of-season storybook`,
      body: storybookBody,
      sourceEvidence: evidence([
        `${events.length} event(s)`,
        `${state.mediaItems.filter((item) => item.teamId === input.teamId).length} approved media item(s)`,
        announcement ? "coach announcement" : undefined,
        replayDraft ? "practice replay draft" : undefined
      ]),
      workflow: reviewWorkflow,
      boundary: "Storybook drafts are keepsake copy only until coach/admin review approves included media and child privacy."
    }
  ];
}
