import { AI_COACH_WORKSPACE_TOOL_IDS } from "@/lib/domain/contracts";
import type { AiCoachWorkspaceDraft } from "@/lib/domain";

const toolIds = new Set<string>(AI_COACH_WORKSPACE_TOOL_IDS);
const workflowSteps = ["Preview", "Edit", "Approve", "Publish"] as const;

export function parseAiCoachWorkspaceDraft(value: unknown): AiCoachWorkspaceDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AiCoachWorkspaceDraft>;
  if (!candidate.id || !toolIds.has(candidate.id)) return null;
  if (
    typeof candidate.label !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.body !== "string" ||
    typeof candidate.boundary !== "string"
  ) {
    return null;
  }

  const sourceEvidence = Array.isArray(candidate.sourceEvidence)
    ? candidate.sourceEvidence.filter((item): item is string => typeof item === "string").slice(0, 12)
    : [];
  const workflow = Array.isArray(candidate.workflow)
    ? candidate.workflow.filter((item): item is AiCoachWorkspaceDraft["workflow"][number] => workflowSteps.includes(item as AiCoachWorkspaceDraft["workflow"][number]))
    : [];

  return {
    id: candidate.id,
    label: candidate.label.slice(0, 120),
    title: candidate.title.slice(0, 200),
    body: candidate.body.slice(0, 6000),
    sourceEvidence,
    workflow: workflow.length ? workflow : [...workflowSteps],
    boundary: candidate.boundary.slice(0, 500)
  };
}
