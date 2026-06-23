import { NextResponse } from "next/server";
import { rejectRegistrationRequest } from "@/lib/supabase/registration-approvals";
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
    return NextResponse.json({ ok: false, message: "Rejection request body is required." }, { status: 400 });
  }

  const result = await rejectRegistrationRequest({
    requestId,
    reviewerUserId: auth.user.id,
    note: String(body.note ?? "")
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
