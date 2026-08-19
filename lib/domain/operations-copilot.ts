export type OperationsCopilotProposalType =
  | "registration_review"
  | "provider_delivery_review"
  | "media_moderation";

export type OperationsCopilotPriority = "critical" | "high" | "normal";
export type OperationsCopilotSource = "deterministic" | "openai";
export type OperationsCopilotApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface OperationsCopilotEvidence {
  label: string;
  value: string;
  observedAt: string;
  source: "leaguepilot_record" | "runtime_readiness";
}

export interface OperationsCopilotCandidate {
  proposalKey: string;
  proposalType: OperationsCopilotProposalType;
  priority: OperationsCopilotPriority;
  title: string;
  summary: string;
  targetType: string;
  targetId?: string;
  actionHref: "/admin/registrations" | "/admin/message-delivery-review" | "/admin/media-review";
  evidence: OperationsCopilotEvidence[];
  boundary: string;
}

export interface OperationsCopilotProposal extends OperationsCopilotCandidate {
  id?: string;
  agentRunId?: string;
  rationale: string;
  recommendedNextStep: string;
  source: OperationsCopilotSource;
  status: OperationsCopilotApprovalStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewReason?: string;
}

export interface OperationsCopilotBrief {
  source: OperationsCopilotSource;
  provider: "openai" | "leaguepilot";
  model: string;
  message: string;
  proposals: OperationsCopilotProposal[];
}

export interface OperationsQueueSignal {
  queue: string;
  count: number;
  actionHref: string;
  boundary: string;
}

const queueDefinitions: Record<string, {
  proposalType: OperationsCopilotProposalType;
  priority: OperationsCopilotPriority;
  title: string;
  targetType: string;
  actionHref: OperationsCopilotCandidate["actionHref"];
  nextStep: string;
}> = {
  "Registration review": {
    proposalType: "registration_review",
    priority: "high",
    title: "Review pending family access requests",
    targetType: "registration_request_queue",
    actionHref: "/admin/registrations",
    nextStep: "Open registration review and verify each guardian, child, and team match."
  },
  "Provider delivery review": {
    proposalType: "provider_delivery_review",
    priority: "high",
    title: "Review pending external delivery records",
    targetType: "notification_delivery_queue",
    actionHref: "/admin/message-delivery-review",
    nextStep: "Open delivery review and confirm consent, audience, wording, and provider readiness."
  },
  "Media moderation": {
    proposalType: "media_moderation",
    priority: "normal",
    title: "Review pending media reports",
    targetType: "media_moderation_queue",
    actionHref: "/admin/media-review",
    nextStep: "Open media review and inspect the reported item within organization scope."
  }
};

const priorityRank: Record<OperationsCopilotPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2
};

export function buildOperationsCopilotCandidates(input: {
  organizationId: string;
  queues: OperationsQueueSignal[];
  observedAt?: string;
}): OperationsCopilotCandidate[] {
  const observedAt = input.observedAt ?? new Date().toISOString();

  return input.queues.flatMap((queue) => {
    const definition = queueDefinitions[queue.queue];
    if (!definition || queue.count <= 0 || queue.actionHref !== definition.actionHref) return [];

    return [{
      proposalKey: `${definition.proposalType}:${input.organizationId}:${queue.count}`,
      proposalType: definition.proposalType,
      priority: definition.priority,
      title: definition.title,
      summary: `${queue.count} ${queue.count === 1 ? "record needs" : "records need"} an authorized administrator's review.`,
      targetType: definition.targetType,
      actionHref: definition.actionHref,
      evidence: [{
        label: queue.queue,
        value: `${queue.count} pending`,
        observedAt,
        source: "leaguepilot_record" as const
      }],
      boundary: queue.boundary
    }];
  }).sort((left, right) => (
    priorityRank[left.priority] - priorityRank[right.priority]
    || left.title.localeCompare(right.title)
  ));
}

export function buildDeterministicOperationsCopilotBrief(
  candidates: OperationsCopilotCandidate[],
  createdAt = new Date().toISOString()
): OperationsCopilotBrief {
  return {
    source: "deterministic",
    provider: "leaguepilot",
    model: "rules-v1",
    message: candidates.length
      ? "LeaguePilot ranked current review queues. Every proposal still requires an administrator decision."
      : "No supported operations queue currently needs review.",
    proposals: candidates.map((candidate) => ({
      ...candidate,
      rationale: `${candidate.summary} ${candidate.boundary}`,
      recommendedNextStep: queueDefinitions[queueNameForType(candidate.proposalType)].nextStep,
      source: "deterministic",
      status: "pending",
      createdAt
    }))
  };
}

function queueNameForType(type: OperationsCopilotProposalType) {
  if (type === "registration_review") return "Registration review";
  if (type === "provider_delivery_review") return "Provider delivery review";
  return "Media moderation";
}
