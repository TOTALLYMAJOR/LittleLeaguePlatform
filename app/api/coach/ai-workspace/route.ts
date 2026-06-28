import { NextResponse } from "next/server";
import { type AiCoachWorkspaceDraft, type AiCoachWorkspaceToolId } from "@/lib/domain";
import { AI_COACH_WORKSPACE_TOOL_IDS } from "@/lib/domain/contracts";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveTeamCoachOrOrgAdmin } from "@/lib/supabase/access-control";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { enhanceAiCoachWorkspaceDraft } from "@/lib/services/ai-coach";

const toolIds = new Set<string>(AI_COACH_WORKSPACE_TOOL_IDS);
const workflowSteps = ["Preview", "Edit", "Approve", "Publish"] as const;

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "AI Coach Workspace body is required." }, { status: 400 });
  }

  const teamId = String((body as { teamId?: unknown }).teamId ?? "");
  const draft = parseAiCoachWorkspaceDraft((body as { draft?: unknown }).draft);
  if (!teamId || !draft) {
    return NextResponse.json({ ok: false, message: "AI Coach Workspace requires a team id and valid draft." }, { status: 400 });
  }

  const db = createSupabaseAdminClient();
  const access = await requireActiveTeamCoachOrOrgAdmin({
    db,
    teamId,
    userId: auth.user.id,
    action: "draft AI Coach Workspace provider copy"
  });
  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message }, { status: 403 });
  }

  const result = await enhanceAiCoachWorkspaceDraft(draft);
  const status = result.ok ? 200 : result.source === "deterministic" ? 503 : 400;
  return NextResponse.json(result, { status });
}

function parseAiCoachWorkspaceDraft(value: unknown): AiCoachWorkspaceDraft | null {
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
    id: candidate.id as AiCoachWorkspaceToolId,
    label: candidate.label.slice(0, 120),
    title: candidate.title.slice(0, 200),
    body: candidate.body.slice(0, 6000),
    sourceEvidence,
    workflow: workflow.length ? workflow : [...workflowSteps],
    boundary: candidate.boundary.slice(0, 500)
  };
}
