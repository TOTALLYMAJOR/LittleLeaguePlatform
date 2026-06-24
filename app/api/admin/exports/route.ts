import { NextResponse } from "next/server";
import { createAdminExport } from "@/lib/supabase/reporting";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const exportKinds = new Set(["roster", "contacts", "schedule", "rsvps", "snacks", "volunteers", "sponsors", "notifications"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Export body is required." }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  if (!exportKinds.has(kind)) {
    return NextResponse.json({ ok: false, message: "Unsupported export kind." }, { status: 400 });
  }

  const result = await createAdminExport({
    organizationId: String(body.organizationId ?? ""),
    actorUserId: auth.user.id,
    kind: kind as "roster" | "contacts" | "schedule" | "rsvps" | "snacks" | "volunteers" | "sponsors" | "notifications"
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
