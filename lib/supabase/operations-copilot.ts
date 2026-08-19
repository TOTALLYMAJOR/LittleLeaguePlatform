import { createHash } from "node:crypto";
import {
  buildDeterministicOperationsCopilotBrief,
  buildOperationsCopilotCandidates,
  type OperationsCopilotProposal,
  type OperationsCopilotApprovalStatus
} from "@/lib/domain";
import {
  generateOperationsCopilotBrief,
  getOperationsCopilotProviderReadiness,
  type OperationsCopilotProviderReadiness
} from "@/lib/services/operations-copilot";
import type { AdminOperationsData } from "./admin-operations";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // These service-only tables are intentionally accessed through a narrow
  // boundary until generated database types include the migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, input: Record<string, unknown>): any;
};

interface ApprovalRow {
  id: string;
  organization_id: string;
  agent_run_id: string;
  proposal_key: string;
  proposal_type: OperationsCopilotProposal["proposalType"];
  priority: OperationsCopilotProposal["priority"];
  title: string;
  summary: string;
  rationale: string;
  recommended_next_step: string;
  target_type: string;
  target_id: string | null;
  action_href: OperationsCopilotProposal["actionHref"];
  evidence_json: OperationsCopilotProposal["evidence"];
  boundary: string;
  status: OperationsCopilotApprovalStatus;
  reviewed_at: string | null;
  review_reason: string | null;
  created_at: string;
}

interface AgentRunRow {
  id: string;
  source: OperationsCopilotProposal["source"];
}

export interface OperationsCopilotWorkspace {
  available: boolean;
  source: AdminOperationsData["source"];
  message: string;
  providerReadiness: OperationsCopilotProviderReadiness;
  proposals: OperationsCopilotProposal[];
}

export async function listOperationsCopilotWorkspace(input: {
  organizationId: string;
  operationsData: AdminOperationsData;
}): Promise<OperationsCopilotWorkspace> {
  const readiness = getOperationsCopilotProviderReadiness();
  const candidates = buildOperationsCopilotCandidates({
    organizationId: input.organizationId,
    queues: input.operationsData.approvalQueues
  });
  const fallback = buildDeterministicOperationsCopilotBrief(candidates);

  if (input.operationsData.source !== "supabase") {
    return {
      available: false,
      source: "fallback",
      message: "Operations Copilot is showing a local preview. Connect scoped Supabase data before creating review records.",
      providerReadiness: readiness,
      proposals: fallback.proposals
    };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data: rows, error } = await withSupabaseTimeout(db
      .from("approval_requests")
      .select("id,organization_id,agent_run_id,proposal_key,proposal_type,priority,title,summary,rationale,recommended_next_step,target_type,target_id,action_href,evidence_json,boundary,status,reviewed_at,review_reason,created_at")
      .eq("organization_id", input.organizationId)
      .order("created_at", { ascending: false })
      .limit(24), 7000) as { data: ApprovalRow[] | null; error: { message?: string } | null };
    if (error) throw new Error(error.message ?? "Approval requests unavailable.");

    const runIds = [...new Set((rows ?? []).map((row) => row.agent_run_id))];
    let runSources = new Map<string, OperationsCopilotProposal["source"]>();
    if (runIds.length) {
      const { data: runs } = await withSupabaseTimeout(db
        .from("agent_runs")
        .select("id,source")
        .in("id", runIds), 7000) as { data: AgentRunRow[] | null };
      runSources = new Map((runs ?? []).map((run) => [run.id, run.source]));
    }

    return {
      available: true,
      source: "supabase",
      message: rows?.length
        ? "Showing durable Operations Copilot proposals and human review decisions."
        : "No Operations Copilot briefing has been recorded yet.",
      providerReadiness: readiness,
      proposals: (rows ?? []).map((row) => mapApprovalRow(row, runSources.get(row.agent_run_id) ?? "deterministic"))
    };
  } catch {
    return {
      available: false,
      source: "supabase",
      message: "Operations Copilot storage is unavailable. Existing league operations remain unchanged.",
      providerReadiness: readiness,
      proposals: fallback.proposals
    };
  }
}

export async function createOperationsCopilotBrief(input: {
  organizationId: string;
  actorUserId: string;
  requestKey: string;
  operationsData: AdminOperationsData;
}) {
  if (input.operationsData.source !== "supabase" || input.operationsData.settings.organizationId !== input.organizationId) {
    return { ok: false as const, message: "Scoped Supabase operations data is required before creating a briefing." };
  }

  const candidates = buildOperationsCopilotCandidates({
    organizationId: input.organizationId,
    queues: input.operationsData.approvalQueues
  });
  const brief = await generateOperationsCopilotBrief({ candidates });
  const inputSummary = {
    organizationId: input.organizationId,
    queueCounts: input.operationsData.approvalQueues.map((queue) => ({ queue: queue.queue, count: queue.count })),
    observedAt: new Date().toISOString()
  };
  const inputHash = createHash("sha256").update(JSON.stringify(inputSummary)).digest("hex");

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db.rpc("create_operations_copilot_brief", {
      p_organization_id: input.organizationId,
      p_actor_user_id: input.actorUserId,
      p_request_key: input.requestKey,
      p_provider: brief.provider,
      p_model: brief.model,
      p_source: brief.source,
      p_input_hash: inputHash,
      p_input_summary: inputSummary,
      p_output_json: { message: brief.message, proposalCount: brief.proposals.length },
      p_proposals: brief.proposals
    }), 7000) as {
      data: { agentRunId?: string; approvalRequestIds?: string[] } | null;
      error: { message?: string } | null;
    };
    if (error || !data?.agentRunId) {
      return { ok: false as const, message: "The briefing was withheld because its review evidence could not be recorded." };
    }

    return {
      ok: true as const,
      message: brief.message,
      agentRunId: data.agentRunId,
      proposalCount: brief.proposals.length,
      source: brief.source
    };
  } catch {
    return { ok: false as const, message: "Operations Copilot storage could not be reached. No review record was created." };
  }
}

export async function reviewOperationsCopilotProposal(input: {
  organizationId: string;
  approvalRequestId: string;
  actorUserId: string;
  decision: "approved" | "rejected";
  reason: string;
}) {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db.rpc("review_operations_copilot_approval", {
      p_approval_request_id: input.approvalRequestId,
      p_organization_id: input.organizationId,
      p_actor_user_id: input.actorUserId,
      p_decision: input.decision,
      p_reason: input.reason
    }), 7000) as {
      data: { id?: string; status?: OperationsCopilotApprovalStatus; reviewedAt?: string; reviewReason?: string } | null;
      error: { message?: string } | null;
    };
    if (error || !data?.id || !data.status) {
      return { ok: false as const, message: "The proposal could not be reviewed. It may already have a decision." };
    }
    return {
      ok: true as const,
      message: `${input.decision === "approved" ? "Plan approved" : "Plan declined"}. No underlying league action was executed.`,
      approval: data
    };
  } catch {
    return { ok: false as const, message: "The proposal review could not reach durable storage." };
  }
}

function mapApprovalRow(row: ApprovalRow, source: OperationsCopilotProposal["source"]): OperationsCopilotProposal {
  return {
    id: row.id,
    agentRunId: row.agent_run_id,
    proposalKey: row.proposal_key,
    proposalType: row.proposal_type,
    priority: row.priority,
    title: row.title,
    summary: row.summary,
    rationale: row.rationale,
    recommendedNextStep: row.recommended_next_step,
    targetType: row.target_type,
    targetId: row.target_id ?? undefined,
    actionHref: row.action_href,
    evidence: row.evidence_json,
    boundary: row.boundary,
    source,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewReason: row.review_reason ?? undefined
  };
}
