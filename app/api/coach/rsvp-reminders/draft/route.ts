import { NextResponse } from "next/server";
import {
  createCoachRsvpReminderDraft,
  type CoachRsvpReminderDraftResult
} from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

function requiredIdentifier(value: unknown) {
  if (typeof value !== "string") return null;
  const identifier = value.trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(identifier) ? identifier : null;
}

function responseStatus(result: CoachRsvpReminderDraftResult) {
  if (result.code === "created") return 201;
  if (result.code === "duplicate") return 200;
  if (result.code === "forbidden") return 403;
  if (result.code === "scope_mismatch") return 404;
  if (result.code === "already_responded") return 409;
  if (result.code === "unavailable" || result.code === "audit_unavailable") return 503;
  return 400;
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, message: "RSVP reminder draft details are required." }, { status: 400 });
  }

  const teamId = requiredIdentifier(body.teamId);
  const eventId = requiredIdentifier(body.eventId);
  const parentUserId = requiredIdentifier(body.parentUserId);
  if (!teamId || !eventId || !parentUserId) {
    return NextResponse.json({
      ok: false,
      code: "invalid_input",
      message: "A valid team, event, and linked family are required."
    }, { status: 400 });
  }

  const result = await createCoachRsvpReminderDraft({
    teamId,
    eventId,
    parentUserId,
    actorUserId: auth.user.id
  });

  return NextResponse.json(result, { status: responseStatus(result) });
}
