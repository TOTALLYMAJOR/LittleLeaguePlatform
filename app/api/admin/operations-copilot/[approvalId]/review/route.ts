import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveOrganizationAdmin } from "@/lib/supabase/access-control";
import { reviewOperationsCopilotProposal } from "@/lib/supabase/operations-copilot";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ approvalId: string }> }
) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const { approvalId } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Proposal review body is required." }, { status: 400 });
  }

  const organizationId = String((body as { organizationId?: unknown }).organizationId ?? "");
  const decision = String((body as { decision?: unknown }).decision ?? "");
  const reason = String((body as { reason?: unknown }).reason ?? "").trim();
  if (!approvalId || !organizationId || !["approved", "rejected"].includes(decision) || reason.length < 10 || reason.length > 1000) {
    return NextResponse.json({
      ok: false,
      message: "A valid proposal, decision, organization, and review reason are required."
    }, { status: 400 });
  }

  const db = createSupabaseAdminClient();
  const access = await requireActiveOrganizationAdmin({
    db,
    organizationId,
    userId: auth.user.id,
    action: "review an Operations Copilot proposal"
  });
  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message }, { status: 403 });
  }

  const result = await reviewOperationsCopilotProposal({
    organizationId,
    approvalRequestId: approvalId,
    actorUserId: auth.user.id,
    decision: decision as "approved" | "rejected",
    reason
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
