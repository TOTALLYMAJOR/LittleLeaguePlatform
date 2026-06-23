import type {
  AppState,
  NotificationRecord,
  ParentReplayDraft,
  ParentReplayRecord,
  PracticeFocusArea
} from "./types";

export interface ParentReplayInput {
  teamId: string;
  coachUserId: string;
  focusAreas: PracticeFocusArea[];
  now: string;
}

export interface ParentReplayResult {
  ok: boolean;
  message: string;
  state: AppState;
  replay?: ParentReplayRecord;
  draft?: ParentReplayDraft;
}

export interface PlatformFeature {
  title: string;
  status: "implemented" | "scaffolded" | "planned";
  description: string;
}

export interface PlatformFeatureTier {
  tier: "Tier 1" | "Tier 2" | "Tier 3" | "Signature";
  promise: string;
  features: PlatformFeature[];
}

const focusLabels: Record<PracticeFocusArea, string> = {
  catching: "catching",
  throwing: "throwing",
  teamwork: "teamwork",
  spacing: "spacing",
  hitting: "hitting",
  base_running: "base running",
  listening: "listening",
  sportsmanship: "sportsmanship"
};

const focusBlueprints: Record<PracticeFocusArea, {
  parentTip: string;
  skillCard: string;
  education: string;
  quickCue: string;
}> = {
  catching: {
    parentTip: "Use soft tosses and celebrate eyes-on-ball effort before counting catches.",
    skillCard: "Ready hands: glove open, thumbs together, eyes on the ball.",
    education: "Young players learn catching faster when parents lower speed and increase success reps.",
    quickCue: "Show ready hands, toss once, high-five the effort."
  },
  throwing: {
    parentTip: "Ask your player to point their front shoulder at the target before the throw.",
    skillCard: "Throwing line: side to target, step, throw, follow through.",
    education: "Accuracy improves when players rehearse balance before power.",
    quickCue: "Point, step, throw one ball at a close target."
  },
  teamwork: {
    parentTip: "Praise calling for the ball, taking turns, and encouraging a teammate.",
    skillCard: "Team talk: call name, listen, cheer, reset.",
    education: "Teamwork at this age is a practiced habit, not a lecture.",
    quickCue: "Say one teammate's name and one encouraging phrase."
  },
  spacing: {
    parentTip: "Help your child notice open space before asking for the ball or crowding a teammate.",
    skillCard: "Open grass: look around, find space, ask for the ball.",
    education: "Spacing is a parent-friendly way to practice awareness, patience, and moving without crowding.",
    quickCue: "Point to open grass, move there, then call for the ball."
  },
  hitting: {
    parentTip: "Keep swings short and stop before fatigue turns practice into frustration.",
    skillCard: "Hitting base: feet quiet, eyes forward, swing through.",
    education: "Short, positive hitting reps build confidence better than long correction sessions.",
    quickCue: "Take three slow-motion swings with eyes on an imaginary ball."
  },
  base_running: {
    parentTip: "Make base running a listening game: run on go, freeze on stop.",
    skillCard: "Run the bases: look, listen, touch, keep moving.",
    education: "Simple base-running games help players connect rules to movement.",
    quickCue: "Sprint to a marker, touch it, and return on the coach call."
  },
  listening: {
    parentTip: "Practice one instruction at a time and thank your player for quick resets.",
    skillCard: "Coach-ready: eyes up, body still, repeat the cue.",
    education: "Listening skills improve when the instruction is short and immediately repeatable.",
    quickCue: "Give one cue, have your player repeat it, then act it out."
  },
  sportsmanship: {
    parentTip: "Model one specific compliment after each game or practice.",
    skillCard: "Good teammate: try hard, be kind, bounce back.",
    education: "Sportsmanship sticks when families name the behavior they want repeated.",
    quickCue: "Name one brave effort and one kind action from practice."
  }
};

export const defaultPracticeFocusAreas: PracticeFocusArea[] = [
  "catching",
  "throwing",
  "teamwork",
  "spacing",
  "hitting",
  "base_running",
  "listening",
  "sportsmanship"
];

export const platformFeatureTiers: PlatformFeatureTier[] = [
  {
    tier: "Tier 1",
    promise: "Core team operations families can use every week.",
    features: [
      { title: "Team-specific portals", status: "scaffolded", description: "Team pages organize roster, schedule, media, chat, and parent learning for one roster." },
      { title: "Parent Replay Home Practice Loop", status: "implemented", description: "Coaches select 2-3 practice focus areas and generate 30-second, 2-minute, and 5-minute parent activities." },
      { title: "Coach practice recap builder", status: "implemented", description: "Coaches select practice focus areas and generate Parent Replay content." },
      { title: "Weekly digest", status: "scaffolded", description: "A parent-facing summary can pull schedule, recaps, team quests, and volunteer needs." },
      { title: "Game Day Mode", status: "scaffolded", description: "Team Chat already groups game-day questions; the next layer can elevate lineups, arrival, uniforms, and RSVP state." },
      { title: "Field maps", status: "scaffolded", description: "Existing event locations expose map links and field context for families." }
    ]
  },
  {
    tier: "Tier 2",
    promise: "Development content that helps parents support practice at home.",
    features: [
      { title: "Coach video library", status: "scaffolded", description: "Parent Replay attaches a coach video recommendation to each recap." },
      { title: "Parent education center", status: "scaffolded", description: "Replay output includes parent tips and short education notes." },
      { title: "Coach-to-parent translation", status: "implemented", description: "Coach vocabulary is converted into plain parent instructions inside each Parent Replay." },
      { title: "Skill cards", status: "scaffolded", description: "Focus-area skill cards turn practice work into simple parent cues." },
      { title: "Team quests", status: "implemented", description: "Each replay generates a lightweight challenge for the whole team." },
      { title: "Weather alerts", status: "planned", description: "Weather can become an approval-gated alert source alongside schedule-change notifications." }
    ]
  },
  {
    tier: "Tier 3",
    promise: "Season-long growth, memories, and community operations.",
    features: [
      { title: "Skill trees", status: "scaffolded", description: "Replay focus areas are structured so they can roll up into player and team skill progressions." },
      { title: "Season storybook", status: "planned", description: "Media, recaps, milestones, and coach notes can become an end-of-season keepsake." },
      { title: "Memory timeline", status: "scaffolded", description: "Chronological team memories combine photos, events, recaps, volunteer moments, and Replay highlights." },
      { title: "Volunteer center", status: "planned", description: "Volunteer needs can connect to digest and game-day surfaces." },
      { title: "AI-generated learning plans", status: "scaffolded", description: "The current generator is deterministic local logic; a production AI version would need human review and provider boundaries." }
    ]
  },
  {
    tier: "Signature",
    promise: "A differentiated parent-coaching loop most scheduling platforms do not offer.",
    features: [
      { title: "Parent Replay", status: "implemented", description: "After practice, coaches click what the team worked on and generate home activities, a video, a parent tip, and a team quest." }
    ]
  }
];

function labelFocusAreas(focusAreas: PracticeFocusArea[]) {
  return focusAreas.map((area) => focusLabels[area]).join(", ");
}

function actorCanCreateReplay(state: AppState, coachUserId: string, teamId: string) {
  const user = state.users.find((item) => item.id === coachUserId);
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "coach") return false;
  return state.teamMemberships.some((membership) => (
    membership.userId === coachUserId &&
    membership.teamId === teamId &&
    membership.role === "coach" &&
    membership.status === "active"
  ));
}

function activeParentIdsForTeam(state: AppState, teamId: string) {
  const playerIds = new Set(state.players.filter((player) => player.teamId === teamId).map((player) => player.id));
  return Array.from(new Set(
    state.guardianLinks
      .filter((link) => link.status === "active" && link.parentUserId && playerIds.has(link.playerId))
      .map((link) => link.parentUserId!)
  ));
}

function replayCompletionSummary(state: AppState, teamId: string) {
  const parentIds = activeParentIdsForTeam(state, teamId);
  const completedFamilies = new Set(
    state.notifications
      .filter((notification) => (
        notification.teamId === teamId &&
        notification.notificationType === "parent_replay_ready" &&
        (notification.status === "read" || notification.status === "sent")
      ))
      .map((notification) => notification.recipientUserId)
  );
  const totalFamilies = parentIds.length;
  const completionCount = Array.from(completedFamilies).filter((parentId) => parentIds.includes(parentId)).length;

  return {
    label: "Team home-practice streak",
    completedFamilies: completionCount,
    totalFamilies,
    completionRate: totalFamilies ? Math.round((completionCount / totalFamilies) * 100) : 0
  };
}

function parentTranslationsFor(focusAreas: PracticeFocusArea[]) {
  return focusAreas.map((area) => ({
    coachTerm: focusLabels[area],
    parentInstruction: focusBlueprints[area].quickCue
  }));
}

export function generateParentReplayDraft(state: AppState, input: ParentReplayInput): ParentReplayDraft {
  const team = state.teams.find((item) => item.id === input.teamId);
  const focusAreas = input.focusAreas.filter((area, index, areas) => areas.indexOf(area) === index).slice(0, 3);
  const primary = focusAreas[0] ?? "teamwork";
  const secondary = focusAreas[1] ?? primary;
  const primaryBlueprint = focusBlueprints[primary];
  const focusSummary = labelFocusAreas(focusAreas.length ? focusAreas : [primary]);

  if (!team) throw new Error("Parent Replay requires a known team.");
  if (!focusAreas.length) throw new Error("Select at least one practice focus area.");

  return {
    teamId: input.teamId,
    coachUserId: input.coachUserId,
    focusAreas,
    title: `${team.name} Parent Replay`,
    summary: `Today we worked on ${focusSummary}. Use the activity below to turn practice into a short, positive home moment.`,
    homeActivities: [
      {
        duration: "30_seconds",
        title: "Quick driveway win",
        coachCue: focusLabels[primary],
        parentGoal: "One confident rep before dinner, bedtime, or the ride home.",
        steps: [
          focusBlueprints[primary].quickCue,
          "End with one specific compliment."
        ]
      },
      {
        duration: "2_minutes",
        title: "Two-minute home activity",
        coachCue: `${focusLabels[primary]} + ${focusLabels[secondary]}`,
        parentGoal: "A tiny repeatable loop parents can run without equipment or coaching jargon.",
        steps: [
          `Do five relaxed reps focused on ${focusLabels[primary]}.`,
          `Switch to five reps focused on ${focusLabels[secondary]}.`,
          "Ask your player what felt easier than last time."
        ]
      },
      {
        duration: "5_minutes",
        title: "Five-minute family challenge",
        coachCue: focusSummary,
        parentGoal: "A short family game that reinforces practice while keeping pressure low.",
        steps: [
          "Set two cones, shoes, or safe markers about ten steps apart.",
          `Rotate through ${focusSummary} with short turns and no long lectures.`,
          "Finish with your player teaching the skill back to you."
        ]
      }
    ],
    parentTranslations: parentTranslationsFor(focusAreas),
    microCoachingStreak: replayCompletionSummary(state, input.teamId),
    memoryMoment: {
      title: `${team.name} practice memory`,
      detail: `Practice focused on ${focusSummary}; save this Replay with game notes, photos, milestones, quests, and volunteer moments for the season timeline.`
    },
    coachVideo: {
      title: `${focusLabels[primary]} at home`,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      note: "Demo link only. Production video hosting and moderation are not connected."
    },
    parentTip: primaryBlueprint.parentTip,
    teamQuest: `Before next practice, every family completes one two-minute ${focusLabels[primary]} activity and shares one confidence win.`,
    skillCards: focusAreas.map((area) => focusBlueprints[area].skillCard),
    parentEducation: focusAreas.map((area) => focusBlueprints[area].education).join(" "),
    generatedAt: input.now
  };
}

export function createParentReplay(state: AppState, input: ParentReplayInput): ParentReplayResult {
  const team = state.teams.find((item) => item.id === input.teamId);
  if (!team) return { ok: false, message: "Parent Replay requires a known team.", state };
  if (!actorCanCreateReplay(state, input.coachUserId, input.teamId)) {
    return { ok: false, message: "Only org admins or assigned coaches can create Parent Replay for this team.", state };
  }
  if (!input.focusAreas.length) {
    return { ok: false, message: "Select at least one practice focus area.", state };
  }
  const uniqueFocusAreas = input.focusAreas.filter((area, index, areas) => areas.indexOf(area) === index);
  if (uniqueFocusAreas.length < 2 || uniqueFocusAreas.length > 3) {
    return { ok: false, message: "Select 2-3 practice focus areas before queueing Parent Replay.", state };
  }

  const draft = generateParentReplayDraft(state, input);
  const replay: ParentReplayRecord = {
    ...draft,
    id: `parent-replay-${Date.parse(input.now)}-${state.parentReplays.length + 1}`,
    organizationId: team.organizationId,
    seasonId: team.seasonId,
    status: "queued",
    createdAt: input.now
  };
  const parentIds = activeParentIdsForTeam(state, input.teamId);
  const notifications: NotificationRecord[] = parentIds.map((recipientUserId) => ({
    id: `notification-parent-replay-${replay.id}-${recipientUserId}`,
    organizationId: team.organizationId,
    recipientUserId,
    teamId: input.teamId,
    notificationType: "parent_replay_ready",
    title: "Parent Replay ready",
    body: `${team.name}: ${draft.summary}`,
    channel: "email",
    status: "pending",
    createdAt: input.now
  }));

  return {
    ok: true,
    message: `Parent Replay queued for ${team.name}; ${notifications.length} parent notification records created with no provider sends.`,
    state: {
      ...state,
      parentReplays: [replay, ...state.parentReplays],
      notifications: [...notifications, ...state.notifications],
      announcements: [
        {
          id: `announcement-parent-replay-${Date.parse(input.now)}`,
          teamId: input.teamId,
          authorUserId: input.coachUserId,
          title: "Parent Replay is ready",
          body: draft.summary,
          createdAt: input.now
        },
        ...state.announcements
      ],
      auditEvents: [
        {
          id: `audit-parent-replay-${Date.parse(input.now)}-${state.auditEvents.length + 1}`,
          actorUserId: input.coachUserId,
          action: "parent_replay_queued",
          targetType: "parent_replay",
          targetId: replay.id,
          summary: `Parent Replay generated for ${team.name} with ${draft.focusAreas.length} focus areas.`,
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    },
    replay,
    draft
  };
}
