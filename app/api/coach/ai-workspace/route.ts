import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveTeamCoachOrOrgAdmin } from "@/lib/supabase/access-control";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { enhanceAiCoachWorkspaceDraft } from "@/lib/services/ai-coach";
import { parseAiCoachWorkspaceDraft } from "@/lib/services/ai-coach/contracts";
import { recordAiCoachGenerationEvidence } from "@/lib/supabase/ai-generation-evidence";

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
  const evidence = await recordAiCoachGenerationEvidence({
    organizationId: access.team?.organization_id ?? "",
    teamId,
    actorUserId: auth.user.id,
    sourceDraft: draft,
    result
  });
  if (!evidence.ok) {
    return NextResponse.json({
      ok: false,
      message: "AI output was withheld because its source and review evidence could not be recorded.",
      provider: result.provider,
      model: result.model,
      source: "deterministic",
      trust: result.trust
    }, { status: 503 });
  }
  const status = result.ok ? 200 : result.source === "deterministic" ? 503 : 400;
  return NextResponse.json({ ...result, generationRun: evidence.generationRun }, { status });
}
