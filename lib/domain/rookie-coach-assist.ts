import type { PracticeFocusArea } from "./types";

export const rookieCoachAgeBandOptions = [
  { id: "3-4", label: "Ages 3-4" },
  { id: "5-6", label: "Ages 5-6" }
] as const;

export type RookieCoachAgeBand = (typeof rookieCoachAgeBandOptions)[number]["id"];

export const rookieCoachExperienceOptions = [
  { id: "first_time", label: "First-time coach" },
  { id: "new_to_sport", label: "New to sport" },
  { id: "new_to_age_group", label: "New to ages 3-6" },
  { id: "returning_volunteer", label: "Returning volunteer" }
] as const;

export type RookieCoachExperienceLevel = (typeof rookieCoachExperienceOptions)[number]["id"];

export const rookieCoachChallengeOptions = [
  { id: "listening", label: "Listening" },
  { id: "wandering", label: "Wandering" },
  { id: "fear_of_ball", label: "Fear of ball" },
  { id: "waiting_turn", label: "Waiting turn" },
  { id: "high_energy", label: "High energy" },
  { id: "shy_participation", label: "Shy participation" },
  { id: "trying_again", label: "Trying again" },
  { id: "teamwork", label: "Teamwork" }
] as const;

export type RookieCoachChallenge = (typeof rookieCoachChallengeOptions)[number]["id"];

export const rookieCoachMotivationStrategyOptions = [
  { id: "mission_game", label: "Mission game" },
  { id: "helper_roles", label: "Helper roles" },
  { id: "team_quest", label: "Team quest" },
  { id: "sticker_passport", label: "Sticker/passport" },
  { id: "animal_mode", label: "Animal mode" },
  { id: "color_stations", label: "Color stations" },
  { id: "high_five_challenge", label: "High-five challenge" },
  { id: "treasure_map", label: "Treasure map" }
] as const;

export type RookieCoachMotivationStrategy = (typeof rookieCoachMotivationStrategyOptions)[number]["id"];

export const rookieCoachPracticePersonalityOptions = [
  { id: "wild_today", label: "Wild today" },
  { id: "tired_today", label: "Tired today" },
  { id: "shy_today", label: "Shy today" },
  { id: "mixed_skill", label: "Mixed skill" },
  { id: "first_practice", label: "First practice" }
] as const;

export type RookieCoachPracticePersonality = (typeof rookieCoachPracticePersonalityOptions)[number]["id"];

export interface RookieCoachAssistInput {
  ageBand: RookieCoachAgeBand;
  sport: string;
  experienceLevel: RookieCoachExperienceLevel;
  challenge: RookieCoachChallenge;
  motivationStrategy: RookieCoachMotivationStrategy;
  practicePersonality?: RookieCoachPracticePersonality;
  focusAreas: string[];
}

export interface RookieCoachPracticeBlock {
  title: string;
  duration: string;
  activity: string;
  coachCue: string;
}

export interface RookieCoachParentReplaySeed {
  focusAreas: PracticeFocusArea[];
  summary: string;
  suggestedFocusText: string;
}

export interface RookieCoachChaosReset {
  callAndResponse: string;
  movementReset: string;
  waterBreak: string;
  quickGame: string;
  regroupPhrase: string;
}

export interface RookieCoachVoiceCoach {
  insteadOf: string;
  say: string;
  why: string;
}

export interface RookieCoachPersonalityAdjustment {
  label: string;
  drillChange: string;
  tempo: string;
  coachCue: string;
}

export interface RookieCoachParentReinforcementLoop {
  today: string;
  atHome: string;
  praise: string;
  deliveryBoundary: string;
}

export interface RookieCoachAssistPlan {
  practiceTitle: string;
  coachObjective: string;
  practiceBlocks: RookieCoachPracticeBlock[];
  chaosReset: RookieCoachChaosReset;
  voiceCoach: RookieCoachVoiceCoach;
  personalityAdjustment: RookieCoachPersonalityAdjustment;
  exactCoachScript: string;
  attentionReset: string;
  doSayPhrases: string[];
  avoidSayingPhrases: string[];
  ageSpecificExplanation: string;
  incentiveStrategy: string;
  parentReplaySeed: RookieCoachParentReplaySeed;
  parentReinforcementLoop: RookieCoachParentReinforcementLoop;
  parentMessageDraft: string;
  sourceEvidence: string[];
  safetyBoundary: string;
}

const challengeFocusMap: Record<RookieCoachChallenge, PracticeFocusArea[]> = {
  listening: ["listening", "teamwork", "sportsmanship"],
  wandering: ["listening", "spacing", "teamwork"],
  fear_of_ball: ["catching", "throwing", "teamwork"],
  waiting_turn: ["listening", "sportsmanship", "teamwork"],
  high_energy: ["listening", "spacing", "teamwork"],
  shy_participation: ["teamwork", "sportsmanship", "catching"],
  trying_again: ["sportsmanship", "teamwork", "catching"],
  teamwork: ["teamwork", "sportsmanship", "listening"]
};

const challengeObjectiveMap: Record<RookieCoachChallenge, string> = {
  listening: "help players hear one cue, repeat it, and act before the next turn",
  wandering: "help players return to the group using a visible station and a short job",
  fear_of_ball: "build comfort with soft, close, coach-controlled ball touches",
  waiting_turn: "make waiting active with a quiet job and a clear next turn",
  high_energy: "turn extra movement into short missions with fast resets",
  shy_participation: "offer low-pressure roles that let players join without being spotlighted",
  trying_again: "make the next attempt feel normal after a miss",
  teamwork: "practice cheering, taking turns, and sharing space"
};

const challengeResetMap: Record<RookieCoachChallenge, string> = {
  listening: "Freeze, touch your hat, eyes on coach, repeat the next cue.",
  wandering: "Find your color station, put one foot on it, then look at coach.",
  fear_of_ball: "Ball down, hands on knees, take one breath, then watch the coach toss.",
  waiting_turn: "Show ready hands, count one teammate turn, then step to your spot.",
  high_energy: "Run to the marker, freeze like a statue, then whisper the team word.",
  shy_participation: "Stand by a helper, point to your station, then choose pass or try.",
  trying_again: "Clap once for the try, reset feet, and take the next small rep.",
  teamwork: "Point to open space, say a teammate name, then start again."
};

const motivationPlanMap: Record<RookieCoachMotivationStrategy, {
  setup: string;
  incentive: string;
}> = {
  mission_game: {
    setup: "Turn each block into a team mission with one clear goal.",
    incentive: "Mark team mission progress when players try the cue together."
  },
  helper_roles: {
    setup: "Give simple helper jobs: cone captain, ball returner, cheer starter, and line leader.",
    incentive: "Rotate helper jobs so every player gets a useful role."
  },
  team_quest: {
    setup: "Make the practice a shared quest where the team unlocks the next station together.",
    incentive: "Celebrate the group when everyone completes the quest cue once."
  },
  sticker_passport: {
    setup: "Use a private effort passport that records tries, listens, and teammate cheers.",
    incentive: "Stamp effort privately for trying, listening, and helping."
  },
  animal_mode: {
    setup: "Name movements with animals so players understand body shape and pace.",
    incentive: "Let the group choose the final animal reset after safe reps."
  },
  color_stations: {
    setup: "Give each activity a color station so players know where to return.",
    incentive: "Move the group to the next color after safe, focused attempts."
  },
  high_five_challenge: {
    setup: "Use coach-approved high fives or air fives after tries and teammate cheers.",
    incentive: "Count team encouragement moments without comparing players."
  },
  treasure_map: {
    setup: "Frame each block as a map stop that leads to the next simple cue.",
    incentive: "Reveal the next map stop when the group completes the cue safely."
  }
};

const practicePersonalityMap: Record<RookieCoachPracticePersonality, {
  drillChange: string;
  tempo: string;
  coachCue: string;
}> = {
  wild_today: {
    drillChange: "Shrink the drill to 20-second turns, add a freeze marker, and restart before the group drifts.",
    tempo: "Fast start, fast stop, short explanation.",
    coachCue: "Show me ready feet. We launch in 3, 2, 1."
  },
  tired_today: {
    drillChange: "Lower the speed, keep players close, and use partner reps with fewer lines.",
    tempo: "Calm, steady, water-forward.",
    coachCue: "Slow is strong. One good try, then breathe."
  },
  shy_today: {
    drillChange: "Let players choose pass or try, use helper roles, and avoid spotlighting one child.",
    tempo: "Quiet start, small group, praise effort privately.",
    coachCue: "You can help first or try first. Both count."
  },
  mixed_skill: {
    drillChange: "Run the same station with easy, middle, and challenge targets so everyone keeps the same team job.",
    tempo: "Layered reps with no player comparison.",
    coachCue: "Pick the target that helps you try brave."
  },
  first_practice: {
    drillChange: "Turn the drill into a tour: show station, try once, celebrate the routine, then rotate.",
    tempo: "Names, safety, and one rule before skill correction.",
    coachCue: "Find your spot, learn one name, try one small rep."
  }
};

const focusKeywordMap: Array<{ regex: RegExp; focus: PracticeFocusArea }> = [
  { regex: /\bcatch|ball|glove|receive\b/i, focus: "catching" },
  { regex: /\bthrow|target|toss|pass\b/i, focus: "throwing" },
  { regex: /\bteam|friend|share|cheer|together\b/i, focus: "teamwork" },
  { regex: /\bspace|station|wander|marker|open\b/i, focus: "spacing" },
  { regex: /\bhit|bat|swing\b/i, focus: "hitting" },
  { regex: /\brun|base|sprint|move\b/i, focus: "base_running" },
  { regex: /\blisten|attention|focus|reset|wait\b/i, focus: "listening" },
  { regex: /\btry|again|kind|brave|sports|respect\b/i, focus: "sportsmanship" }
];

function optionLabel<T extends string>(options: ReadonlyArray<{ id: T; label: string }>, id: T) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function cleanSport(sport: string) {
  const compact = sport.replace(/\s+/g, " ").trim();
  return compact || "youth sports";
}

function cleanFocusAreas(focusAreas: string[]) {
  return focusAreas
    .map((area) => area.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function joinHumanList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function focusLabel(area: PracticeFocusArea) {
  return area.replace("_", " ");
}

function appendUniqueFocus(target: PracticeFocusArea[], focus: PracticeFocusArea) {
  if (!target.includes(focus)) target.push(focus);
}

function parentReplaySeedFor(challenge: RookieCoachChallenge, focusAreas: string[]): PracticeFocusArea[] {
  const seed: PracticeFocusArea[] = [];

  cleanFocusAreas(focusAreas).forEach((area) => {
    const match = focusKeywordMap.find((item) => item.regex.test(area));
    if (match) appendUniqueFocus(seed, match.focus);
  });

  challengeFocusMap[challenge].forEach((focus) => appendUniqueFocus(seed, focus));
  return seed.slice(0, 3);
}

export function generateRookieCoachAssist(input: RookieCoachAssistInput): RookieCoachAssistPlan {
  const sport = cleanSport(input.sport);
  const practicePersonalityId = input.practicePersonality ?? "wild_today";
  const practicePersonality = practicePersonalityMap[practicePersonalityId];
  const practicePersonalityLabel = optionLabel(rookieCoachPracticePersonalityOptions, practicePersonalityId);
  const challengeLabel = optionLabel(rookieCoachChallengeOptions, input.challenge).toLowerCase();
  const strategy = motivationPlanMap[input.motivationStrategy];
  const strategyLabel = optionLabel(rookieCoachMotivationStrategyOptions, input.motivationStrategy).toLowerCase();
  const experienceLabel = optionLabel(rookieCoachExperienceOptions, input.experienceLevel).toLowerCase();
  const focusAreas = cleanFocusAreas(input.focusAreas);
  const focusText = focusAreas.length ? focusAreas.join(", ") : challengeLabel;
  const objective = challengeObjectiveMap[input.challenge];
  const parentReplayFocusAreas = parentReplaySeedFor(input.challenge, focusAreas);
  const parentFocusText = joinHumanList(parentReplayFocusAreas.map(focusLabel));
  const atHomeActivity = parentReplayFocusAreas.some((area) => area === "throwing" || area === "catching")
    ? "At home: 3 soft tosses into a laundry basket or safe target."
    : `At home: run one tiny ${parentReplayFocusAreas[0] ? focusLabel(parentReplayFocusAreas[0]) : "teamwork"} game for two minutes.`;
  const ageExplanation = input.ageBand === "3-4"
    ? "Ages 3-4 need one-step cues, very short turns, visual stations, and immediate praise for effort."
    : "Ages 5-6 can handle two-step cues, partner turns, and a simple team goal when the coach keeps language concrete.";

  return {
    practiceTitle: `${sport} rookie practice: ${optionLabel(rookieCoachChallengeOptions, input.challenge)} reset`,
    coachObjective: `As a ${experienceLabel}, keep the session safe and simple: ${objective}.`,
    practiceBlocks: [
      {
        title: "Welcome mission",
        duration: "5 minutes",
        activity: `${strategy.setup} Start with one no-pressure demo and one group try focused on ${focusText}.`,
        coachCue: `Say: "One job first: ${challengeLabel}. Watch me, then we all try."`
      },
      {
        title: "Tiny turns",
        duration: "8 minutes",
        activity: `Run short turns in pairs or stations. ${practicePersonality.drillChange}`,
        coachCue: `Say: "Your turn is short. Try once, cheer once, switch."`
      },
      {
        title: "Team finish",
        duration: "5 minutes",
        activity: `Finish with a team cue, one shared cheer, and a calm walk back to the sideline.`,
        coachCue: `Say: "We finish together. Show the cue, help a teammate, then bring it in."`
      }
    ],
    chaosReset: {
      callAndResponse: `Coach: "Ready feet?" Team: "Ready feet." Coach: "Eyes here?" Team: "Eyes here."`,
      movementReset: "Ten toe taps, freeze on the marker, one breath, then hands ready.",
      waterBreak: "Thirty-second water sip, caps back on, bottles down by the line.",
      quickGame: `${practicePersonalityLabel} reset: one safe rep, one teammate cheer, one fast return to station.`,
      regroupPhrase: "Show me ready feet. We launch in 3, 2, 1."
    },
    voiceCoach: {
      insteadOf: "Stop messing around.",
      say: practicePersonality.coachCue,
      why: "It names the behavior the coach needs, gives a countdown, and keeps correction specific."
    },
    personalityAdjustment: {
      label: practicePersonalityLabel,
      drillChange: practicePersonality.drillChange,
      tempo: practicePersonality.tempo,
      coachCue: practicePersonality.coachCue
    },
    exactCoachScript: [
      `Team, come to your station and look at me.`,
      `Today our ${sport} job is ${challengeLabel}.`,
      `We are using ${strategyLabel}, so every player has a small mission.`,
      `Our team energy is ${practicePersonalityLabel.toLowerCase()}, so ${practicePersonality.drillChange.toLowerCase()}`,
      `If it feels hard, we make it smaller and try again.`,
      `No one has to be perfect. We listen, try, cheer, and reset.`
    ].join(" "),
    attentionReset: challengeResetMap[input.challenge],
    doSayPhrases: [
      "Try one small rep.",
      "I noticed your effort.",
      "Show me ready body.",
      "Help the next teammate."
    ],
    avoidSayingPhrases: [
      "Why can't you do this?",
      "Everyone is watching you.",
      "You made the team lose.",
      "Big kids do not act like that."
    ],
    ageSpecificExplanation: ageExplanation,
    incentiveStrategy: `${strategy.incentive} Keep recognition private or team-wide, based on effort and safe participation.`,
    parentReplaySeed: {
      focusAreas: parentReplayFocusAreas,
      summary: `Rookie Coach Assist suggests Parent Replay focus areas for ${challengeLabel}: ${parentReplayFocusAreas.join(", ")}.`,
      suggestedFocusText: focusText
    },
    parentReinforcementLoop: {
      today: `Today we practiced ${parentFocusText || focusText} with short ${sport} activities for ages ${input.ageBand}.`,
      atHome: atHomeActivity,
      praise: "Praise the brave try, not the result.",
      deliveryBoundary: "Draft for coach review only; no external parent send is triggered."
    },
    parentMessageDraft: `Today we practiced ${focusText} with short ${sport} activities for ages ${input.ageBand}. ${atHomeActivity} Praise the brave try, not the result.`,
    sourceEvidence: [
      "Deterministic Rookie Coach Assist rules",
      `Age band: ${input.ageBand}`,
      `Challenge: ${optionLabel(rookieCoachChallengeOptions, input.challenge)}`,
      `Motivation strategy: ${optionLabel(rookieCoachMotivationStrategyOptions, input.motivationStrategy)}`,
      `Team energy: ${practicePersonalityLabel}`,
      `Focus areas: ${focusText}`,
      "Parent Replay seed uses existing PracticeFocusArea values only"
    ],
    safetyBoundary: "Coach review required. This creates local preview copy only: no provider send, no automatic publish, no medical guidance, no food reward, and no player comparison board."
  };
}
