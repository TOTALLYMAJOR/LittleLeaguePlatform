export type LeaguePilotRole = "parent" | "coach" | "admin";

export interface ActiveContext {
  actorUserId: string;
  role: LeaguePilotRole;
  organizationId: string;
  organizationName: string;
  seasonId: string;
  seasonName: string;
  teamId?: string;
  teamName?: string;
  permittedTeamIds: string[];
  permittedPlayerIds: string[];
  contextKey: string;
  archived: boolean;
  readOnly: boolean;
}

export interface PermissionSet {
  contextKey: string;
  capabilities: Record<string, boolean>;
  derivedAt: string;
  source: "server";
}

export type TruthCategory =
  | "record"
  | "approval"
  | "publication"
  | "delivery"
  | "acknowledgment"
  | "freshness";

export type OperationalTone = "ready" | "attention" | "blocked" | "unknown";

export interface DataFreshness {
  source: "live" | "fallback" | "cached" | "offline";
  observedAt?: string;
  expiresAfterMs: number;
  stale: boolean;
  label: string;
}

export interface TruthEvidence {
  category: TruthCategory;
  label: string;
  evidenceAvailable: boolean;
  satisfied: true | false | null;
  critical: boolean;
  source: string;
  observedAt?: string;
  freshness?: DataFreshness;
  recoveryAction?: string;
}

export interface OperationalTruth {
  summary: string;
  tone: OperationalTone;
  evidence: TruthEvidence[];
  criticalExceptions: TruthEvidence[];
  generatedAt: string;
}

export interface DeliveryEvidence {
  notificationRecordId: string;
  notificationRecordedAt?: string;
  humanApprovedAt?: string;
  providerAcceptedAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  bouncedAt?: string;
  complainedAt?: string;
  webhookVerifiedAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
}

export type ActionPriorityBand = "urgent" | "primary" | "secondary";

export interface ActionPriority {
  score: number;
  band: ActionPriorityBand;
  reasons: string[];
  deadline?: string;
  requiredRole: LeaguePilotRole;
  algorithmVersion: "leaguepilot-priority-v1";
}

export type ConflictSignalType =
  | "sibling_overlap"
  | "guardian_transportation_overlap"
  | "coach_overlap"
  | "field_double_booking"
  | "volunteer_overlap";

export interface ConflictSignal {
  id: string;
  type: ConflictSignalType;
  organizationId: string;
  eventIds: [string, string];
  teamIds: [string, string];
  playerIds: string[];
  userIds: string[];
  startsAt: string;
  endsAt: string;
  summary: string;
}

export interface ConflictEventInput {
  id: string;
  organizationId: string;
  teamId: string;
  playerIds: string[];
  guardianUserIds: string[];
  coachUserIds: string[];
  volunteerUserIds: string[];
  fieldId?: string;
  startsAt: string;
  endsAt: string;
}

export interface SyncEnvelope {
  actionId: string;
  contextKey: string;
  actionType: "rsvp" | "attendance" | "coach_note";
  queuedAt: string;
  attemptedAt?: string;
  succeededAt?: string;
  baseRecordVersion?: number;
  baseScheduleVersion?: number;
  conflictDetail?: string;
  retryCount: number;
  retryAfter?: string;
}

export function createDataFreshness(input: {
  source: DataFreshness["source"];
  observedAt?: string;
  expiresAfterMs: number;
  now: string;
}): DataFreshness {
  const observedTime = input.observedAt ? Date.parse(input.observedAt) : Number.NaN;
  const nowTime = Date.parse(input.now);
  const stale = input.source !== "live"
    || !Number.isFinite(observedTime)
    || !Number.isFinite(nowTime)
    || nowTime - observedTime > input.expiresAfterMs;

  return {
    source: input.source,
    observedAt: input.observedAt,
    expiresAfterMs: input.expiresAfterMs,
    stale,
    label: freshnessLabel(input.source, stale)
  };
}

export function rollupOperationalTruth(input: {
  positiveSummary: string;
  failedSummary?: string;
  verificationSummary?: string;
  evidence: TruthEvidence[];
  now: string;
}): OperationalTruth {
  const failedCritical = input.evidence.filter((lane) => lane.critical && lane.satisfied === false);
  const unknownCritical = input.evidence.filter((lane) => (
    lane.critical
    && (
      !lane.evidenceAvailable
      || lane.satisfied === null
      || lane.freshness?.stale === true
    )
  ));

  if (failedCritical.length) {
    return {
      summary: input.failedSummary ?? "Critical evidence needs attention.",
      tone: failedCritical.some((lane) => lane.category === "record" || lane.category === "approval")
        ? "blocked"
        : "attention",
      evidence: input.evidence,
      criticalExceptions: failedCritical,
      generatedAt: input.now
    };
  }

  if (unknownCritical.length) {
    return {
      summary: input.verificationSummary ?? "Needs verification.",
      tone: "unknown",
      evidence: input.evidence,
      criticalExceptions: unknownCritical,
      generatedAt: input.now
    };
  }

  return {
    summary: input.positiveSummary,
    tone: "ready",
    evidence: input.evidence,
    criticalExceptions: [],
    generatedAt: input.now
  };
}

export function buildActionPriority(input: {
  safetySeverity: "none" | "attention" | "critical";
  deadline?: string;
  eventStartsAt?: string;
  dependencyImpact: "none" | "limited" | "blocking";
  authorityRequirement: "self" | "coach" | "admin";
  createdAt: string;
  requiredRole: LeaguePilotRole;
  now: string;
}): ActionPriority {
  const safety = { none: 0, attention: 200, critical: 400 }[input.safetySeverity];
  const deadline = timeWeight(input.deadline, input.now, [
    [6, 180],
    [24, 120],
    [72, 60]
  ]);
  const eventProximity = timeWeight(input.eventStartsAt, input.now, [
    [24, 150],
    [48, 100],
    [168, 50]
  ]);
  const dependency = { none: 0, limited: 50, blocking: 150 }[input.dependencyImpact];
  const authority = { self: 0, coach: 40, admin: 80 }[input.authorityRequirement];
  const ageDays = Math.max(0, Math.floor((Date.parse(input.now) - Date.parse(input.createdAt)) / 86_400_000));
  const age = Math.min(ageDays, 40);
  const score = safety + deadline + eventProximity + dependency + authority + age;
  const reasons = [
    ...(safety ? [`Safety impact +${safety}`] : []),
    ...(deadline ? [`Deadline urgency +${deadline}`] : []),
    ...(eventProximity ? [`Event proximity +${eventProximity}`] : []),
    ...(dependency ? [`Dependency impact +${dependency}`] : []),
    ...(authority ? [`Authority required +${authority}`] : []),
    ...(age ? [`Waiting age +${age}`] : [])
  ];

  return {
    score,
    band: input.safetySeverity === "critical" || score >= 500
      ? "urgent"
      : score >= 250
        ? "primary"
        : "secondary",
    reasons: reasons.length ? reasons : ["Routine operational follow-up"],
    deadline: input.deadline,
    requiredRole: input.requiredRole,
    algorithmVersion: "leaguepilot-priority-v1"
  };
}

export function compareActionPriority(
  left: { id: string; createdAt: string; priority: ActionPriority },
  right: { id: string; createdAt: string; priority: ActionPriority }
) {
  if (left.priority.score !== right.priority.score) return right.priority.score - left.priority.score;
  const leftDeadline = left.priority.deadline ? Date.parse(left.priority.deadline) : Number.POSITIVE_INFINITY;
  const rightDeadline = right.priority.deadline ? Date.parse(right.priority.deadline) : Number.POSITIVE_INFINITY;
  if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;
  const createdDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return createdDifference || left.id.localeCompare(right.id);
}

export function detectConflictSignals(events: ConflictEventInput[]): ConflictSignal[] {
  const signals: ConflictSignal[] = [];
  const sorted = [...events].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));

  for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
    const left = sorted[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
      const right = sorted[rightIndex]!;
      if (left.organizationId !== right.organizationId) continue;
      if (!overlaps(left, right)) {
        if (Date.parse(right.startsAt) >= Date.parse(left.endsAt)) break;
        continue;
      }

      const sharedGuardians = intersect(left.guardianUserIds, right.guardianUserIds);
      const sharedCoaches = intersect(left.coachUserIds, right.coachUserIds);
      const sharedVolunteers = intersect(left.volunteerUserIds, right.volunteerUserIds);
      const sharedPlayers = intersect(left.playerIds, right.playerIds);
      const siblingPlayers = unique([...left.playerIds, ...right.playerIds]);
      const base = {
        organizationId: left.organizationId,
        eventIds: [left.id, right.id] as [string, string],
        teamIds: [left.teamId, right.teamId] as [string, string],
        startsAt: maxIso(left.startsAt, right.startsAt),
        endsAt: minIso(left.endsAt, right.endsAt)
      };

      if (sharedGuardians.length && siblingPlayers.length > sharedPlayers.length) {
        signals.push(signal("sibling_overlap", base, siblingPlayers, sharedGuardians, "Linked children have overlapping events."));
        signals.push(signal("guardian_transportation_overlap", base, siblingPlayers, sharedGuardians, "One guardian is connected to overlapping team events."));
      }
      if (sharedCoaches.length) {
        signals.push(signal("coach_overlap", base, [], sharedCoaches, "A coach is assigned to overlapping events."));
      }
      if (left.fieldId && left.fieldId === right.fieldId) {
        signals.push(signal("field_double_booking", base, [], [], "The same field is booked for overlapping events."));
      }
      if (sharedVolunteers.length) {
        signals.push(signal("volunteer_overlap", base, [], sharedVolunteers, "A volunteer is assigned to overlapping events."));
      }
    }
  }

  return dedupeSignals(signals);
}

export function visibleConflictsForContext(signals: ConflictSignal[], context: ActiveContext): ConflictSignal[] {
  if (context.role === "admin") {
    return signals.filter((signalItem) => signalItem.organizationId === context.organizationId);
  }
  if (context.role === "parent") {
    const playerIds = new Set(context.permittedPlayerIds);
    return signals.filter((signalItem) => (
      ["sibling_overlap", "guardian_transportation_overlap"].includes(signalItem.type)
      && signalItem.playerIds.some((playerId) => playerIds.has(playerId))
    ));
  }
  const teamIds = new Set(context.permittedTeamIds);
  return signals
    .filter((signalItem) => signalItem.teamIds.some((teamId) => teamIds.has(teamId)))
    .filter((signalItem) => !["sibling_overlap", "guardian_transportation_overlap"].includes(signalItem.type))
    .map((signalItem) => ({ ...signalItem, userIds: [], playerIds: [] }));
}

export function deriveSyncLabel(envelope: SyncEnvelope): string {
  if (envelope.conflictDetail) return "Sync conflict";
  if (envelope.succeededAt) return "Synced";
  if (envelope.attemptedAt && envelope.retryCount > 0) return "Retry online";
  if (envelope.queuedAt) return envelope.attemptedAt ? "Waiting to sync" : "Saved on this device";
  return "Not saved";
}

export function deliveryEvidenceLanes(evidence: DeliveryEvidence): TruthEvidence[] {
  return [
    timestampLane("record", "Notification record saved", evidence.notificationRecordedAt, true),
    timestampLane("approval", "Human approval recorded", evidence.humanApprovedAt, true),
    timestampLane("delivery", "Provider accepted request", evidence.providerAcceptedAt, false),
    timestampLane("delivery", "Provider verified delivery", evidence.deliveredAt, false, Boolean(evidence.failedAt || evidence.bouncedAt)),
    timestampLane("acknowledgment", "Message read", evidence.readAt, false),
    timestampLane("acknowledgment", "Explicit acknowledgment", evidence.acknowledgedAt, false)
  ];
}

function timestampLane(
  category: TruthCategory,
  label: string,
  timestamp: string | undefined,
  critical: boolean,
  failed = false
): TruthEvidence {
  return {
    category,
    label,
    evidenceAvailable: Boolean(timestamp) || failed,
    satisfied: failed ? false : timestamp ? true : null,
    critical,
    source: "persisted timestamp",
    observedAt: timestamp
  };
}

function timeWeight(
  value: string | undefined,
  now: string,
  brackets: Array<[hours: number, weight: number]>
) {
  if (!value) return 0;
  const hours = (Date.parse(value) - Date.parse(now)) / 3_600_000;
  if (!Number.isFinite(hours) || hours < 0) return brackets[0]?.[1] ?? 0;
  return brackets.find(([limit]) => hours <= limit)?.[1] ?? 0;
}

function freshnessLabel(source: DataFreshness["source"], stale: boolean) {
  if (source === "offline") return "Cached while offline";
  if (source === "cached") return stale ? "Cached data may be out of date" : "Recently cached";
  if (source === "fallback") return "Preview data, not current records";
  return stale ? "Live source needs refresh" : "Current live records";
}

function overlaps(left: ConflictEventInput, right: ConflictEventInput) {
  return Date.parse(left.startsAt) < Date.parse(right.endsAt)
    && Date.parse(right.startsAt) < Date.parse(left.endsAt);
}

function signal(
  type: ConflictSignalType,
  base: Pick<ConflictSignal, "organizationId" | "eventIds" | "teamIds" | "startsAt" | "endsAt">,
  playerIds: string[],
  userIds: string[],
  summary: string
): ConflictSignal {
  return {
    id: `${type}:${[...base.eventIds].sort().join(":")}`,
    type,
    ...base,
    playerIds: unique(playerIds),
    userIds: unique(userIds),
    summary
  };
}

function dedupeSignals(signals: ConflictSignal[]) {
  return [...new Map(signals.map((item) => [item.id, item])).values()];
}

function intersect(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return unique(left.filter((value) => rightSet.has(value)));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function maxIso(left: string, right: string) {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function minIso(left: string, right: string) {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}
