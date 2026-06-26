import { NextResponse } from "next/server";
import { saveScheduleEvent } from "@/lib/supabase/schedule-management";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const eventTypes = new Set(["game", "practice", "team_event"]);
const eventStatuses = new Set(["scheduled", "cancelled", "completed"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Schedule event body is required." }, { status: 400 });
  }

  const eventType = String((body as { eventType?: unknown }).eventType ?? "practice");
  if (!eventTypes.has(eventType)) {
    return NextResponse.json({ ok: false, message: "Unsupported event type." }, { status: 400 });
  }

  const status = String((body as { status?: unknown }).status ?? "scheduled");
  if (!eventStatuses.has(status)) {
    return NextResponse.json({ ok: false, message: "Unsupported event status." }, { status: 400 });
  }

  const result = await saveScheduleEvent({
    actorUserId: auth.user.id,
    eventId: (body as { eventId?: unknown }).eventId ? String((body as { eventId?: unknown }).eventId) : undefined,
    organizationId: String((body as { organizationId?: unknown }).organizationId ?? ""),
    seasonId: String((body as { seasonId?: unknown }).seasonId ?? ""),
    teamId: String((body as { teamId?: unknown }).teamId ?? ""),
    title: String((body as { title?: unknown }).title ?? ""),
    eventType: eventType as "game" | "practice" | "team_event",
    startsAt: String((body as { startsAt?: unknown }).startsAt ?? ""),
    endsAt: String((body as { endsAt?: unknown }).endsAt ?? ""),
    locationName: String((body as { locationName?: unknown }).locationName ?? ""),
    locationAddress: String((body as { locationAddress?: unknown }).locationAddress ?? ""),
    fieldLocationId: (body as { fieldLocationId?: unknown }).fieldLocationId ? String((body as { fieldLocationId?: unknown }).fieldLocationId) : undefined,
    opponent: (body as { opponent?: unknown }).opponent ? String((body as { opponent?: unknown }).opponent) : undefined,
    status: status as "scheduled" | "cancelled" | "completed",
    reason: (body as { reason?: unknown }).reason ? String((body as { reason?: unknown }).reason) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
