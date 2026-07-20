import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { acknowledgeNotificationReceipt } from "@/lib/supabase/notification-receipts";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Notification acknowledgment body is required." }, { status: 400 });
  }

  const result = await acknowledgeNotificationReceipt({
    notificationId: String((body as { notificationId?: unknown }).notificationId ?? ""),
    parentUserId: auth.user.id
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
