import { NextResponse } from "next/server";
import { reviewNotificationDelivery, type ProviderDeliveryProvider } from "@/lib/supabase/provider-delivery";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const decisions = new Set(["approved", "rejected"]);
const providers = new Set(["email", "sms", "web_push"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const actorUserId = auth.user.id;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Provider delivery batch review body is required." }, { status: 400 });
  }

  const decision = String((body as { decision?: unknown }).decision ?? "");
  if (!decisions.has(decision)) {
    return NextResponse.json({ ok: false, message: "Unsupported provider delivery batch decision." }, { status: 400 });
  }

  const items = Array.isArray((body as { items?: unknown }).items)
    ? (body as { items: Array<Record<string, unknown>> }).items
    : [];
  const normalizedItems = items
    .map((item) => ({
      notificationId: String(item.notificationId ?? ""),
      provider: String(item.provider ?? "")
    }))
    .filter((item) => item.notificationId && providers.has(item.provider));

  if (!normalizedItems.length) {
    return NextResponse.json({ ok: false, message: "Provider delivery batch review requires at least one notification." }, { status: 400 });
  }

  const results = await Promise.all(normalizedItems.map((item) => reviewNotificationDelivery({
    notificationId: item.notificationId,
    actorUserId,
    decision: decision as "approved" | "rejected",
    provider: item.provider as ProviderDeliveryProvider
  })));
  const failed = results.filter((result) => !result.ok);

  return NextResponse.json({
    ok: failed.length === 0,
    message: failed.length
      ? `${failed.length} of ${results.length} provider delivery review item(s) failed.`
      : `${results.length} provider delivery review item(s) ${decision}.`,
    results
  }, { status: failed.length ? 207 : 200 });
}
