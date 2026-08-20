import { NextResponse } from "next/server";
import { recordSponsorFulfillmentEvidence } from "@/lib/supabase/sponsor-program";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const evidenceKinds = new Set(["screenshot", "link", "event_recap", "attendance_summary", "campaign_note"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Fulfillment evidence body is required." }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  if (!evidenceKinds.has(kind)) {
    return NextResponse.json({ ok: false, message: "Unsupported fulfillment evidence kind." }, { status: 400 });
  }

  const observedAt = String(body.observedAt ?? "");
  const observedAtMs = Date.parse(observedAt);
  if (!Number.isFinite(observedAtMs)) {
    return NextResponse.json(
      { ok: false, message: "Evidence requires the date and time the benefit was observed." },
      { status: 400 }
    );
  }
  if (observedAtMs > Date.now()) {
    return NextResponse.json(
      { ok: false, message: "Evidence cannot be observed in the future. Record what has already run." },
      { status: 400 }
    );
  }

  // The actor is taken from the verified session, never from the body, and organization-admin
  // authority is re-derived inside the adapter against the requirement's own organization.
  const result = await recordSponsorFulfillmentEvidence({
    requirementId: String(body.requirementId ?? ""),
    actorUserId: auth.user.id,
    kind: kind as "screenshot" | "link" | "event_recap" | "attendance_summary" | "campaign_note",
    observedAt,
    artifactUrl: body.artifactUrl ? String(body.artifactUrl) : undefined,
    note: body.note ? String(body.note) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
