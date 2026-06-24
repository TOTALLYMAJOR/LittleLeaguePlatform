import { NextResponse } from "next/server";
import { reviewNotificationDelivery } from "@/lib/supabase/provider-delivery";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const decisions = new Set(["approved", "rejected"]);
const providers = new Set(["email", "sms", "web_push"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Provider delivery review body is required." }, { status: 400 });
  }

  const decision = String(body.decision ?? "");
  const provider = String(body.provider ?? "");
  if (!decisions.has(decision) || !providers.has(provider)) {
    return NextResponse.json({ ok: false, message: "Unsupported provider delivery review." }, { status: 400 });
  }

  const result = await reviewNotificationDelivery({
    notificationId: String(body.notificationId ?? ""),
    actorUserId: auth.user.id,
    decision: decision as "approved" | "rejected",
    provider: provider as "email" | "sms" | "web_push"
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
