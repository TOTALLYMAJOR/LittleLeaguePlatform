import { NextResponse } from "next/server";
import { submitParentSupportRequest } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const topics = new Set(["schedule", "rsvp", "registration", "media", "notifications", "other"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Support request body is required." }, { status: 400 });
  }

  const topic = String((body as { topic?: unknown }).topic ?? "other");
  if (!topics.has(topic)) {
    return NextResponse.json({ ok: false, message: "Unsupported support topic." }, { status: 400 });
  }

  const result = await submitParentSupportRequest({
    parentUserId: auth.user.id,
    teamId: (body as { teamId?: unknown }).teamId ? String((body as { teamId?: unknown }).teamId) : undefined,
    topic: topic as "schedule" | "rsvp" | "registration" | "media" | "notifications" | "other",
    detail: String((body as { detail?: unknown }).detail ?? "")
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
