import { NextResponse } from "next/server";
import { approveRegistrationRequest } from "@/lib/supabase/registration-approvals";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const { requestId } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Approval request body is required." }, { status: 400 });
  }

  const result = await approveRegistrationRequest({
    requestId,
    reviewerUserId: auth.user.id,
    note: body.note ? String(body.note) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
