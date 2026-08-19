import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveOrganizationAdmin } from "@/lib/supabase/access-control";
import { listAdminOperationsData } from "@/lib/supabase/admin-operations";
import { createOperationsCopilotBrief } from "@/lib/supabase/operations-copilot";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export const maxDuration = 30;

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const organizationId = body && typeof body === "object"
    ? String((body as { organizationId?: unknown }).organizationId ?? "")
    : "";
  const requestKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!organizationId || requestKey.length < 8 || requestKey.length > 200) {
    return NextResponse.json({
      ok: false,
      message: "Organization context and a valid idempotency key are required."
    }, { status: 400 });
  }

  const db = createSupabaseAdminClient();
  const access = await requireActiveOrganizationAdmin({
    db,
    organizationId,
    userId: auth.user.id,
    action: "create an Operations Copilot briefing"
  });
  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message }, { status: 403 });
  }

  const operationsData = await listAdminOperationsData({ organizationId });
  const result = await createOperationsCopilotBrief({
    organizationId,
    actorUserId: auth.user.id,
    requestKey,
    operationsData
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 503 });
}
