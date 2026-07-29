import { NextResponse } from "next/server";
import { saveScheduleEvent } from "@/lib/supabase/schedule-management";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const eventTypes = new Set(["game", "practice", "team_event"]);
const eventStatuses = new Set(["scheduled", "cancelled", "completed"]);
const recurrenceFrequencies = new Set(["weekly"]);
const recurrenceEditScopes = new Set(["single", "this_and_future", "all"]);

function objectBodyValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Schedule event body is required." }, { status: 400 });
  }
  const requestBody = body as Record<string, unknown>;

  const eventType = String(requestBody.eventType ?? "practice");
  if (!eventTypes.has(eventType)) {
    return NextResponse.json({ ok: false, message: "Unsupported event type." }, { status: 400 });
  }

  const status = String(requestBody.status ?? "scheduled");
  if (!eventStatuses.has(status)) {
    return NextResponse.json({ ok: false, message: "Unsupported event status." }, { status: 400 });
  }

  const recurrenceBody = objectBodyValue(requestBody, "recurrence");
  const recurrenceFrequency = String(recurrenceBody?.frequency ?? "");
  if (recurrenceBody && !recurrenceFrequencies.has(recurrenceFrequency)) {
    return NextResponse.json({ ok: false, message: "Unsupported recurrence frequency." }, { status: 400 });
  }

  const recurrenceEditScope = requestBody.recurrenceEditScope ? String(requestBody.recurrenceEditScope) : undefined;
  if (recurrenceEditScope && !recurrenceEditScopes.has(recurrenceEditScope)) {
    return NextResponse.json({ ok: false, message: "Unsupported recurrence edit scope." }, { status: 400 });
  }

  const venueBody = objectBodyValue(requestBody, "venue");
  const result = await saveScheduleEvent({
    actorUserId: auth.user.id,
    eventId: requestBody.eventId ? String(requestBody.eventId) : undefined,
    organizationId: String(requestBody.organizationId ?? ""),
    seasonId: String(requestBody.seasonId ?? ""),
    teamId: String(requestBody.teamId ?? ""),
    title: String(requestBody.title ?? ""),
    eventType: eventType as "game" | "practice" | "team_event",
    startsAt: String(requestBody.startsAt ?? ""),
    endsAt: String(requestBody.endsAt ?? ""),
    locationName: String(requestBody.locationName ?? ""),
    locationAddress: String(requestBody.locationAddress ?? ""),
    fieldLocationId: requestBody.fieldLocationId ? String(requestBody.fieldLocationId) : undefined,
    venue: venueBody ? {
      id: venueBody.id ? String(venueBody.id) : undefined,
      name: venueBody.name ? String(venueBody.name) : undefined,
      address: venueBody.address ? String(venueBody.address) : undefined,
      latitude: venueBody.latitude === undefined ? undefined : Number(venueBody.latitude),
      longitude: venueBody.longitude === undefined ? undefined : Number(venueBody.longitude),
      googlePlaceId: venueBody.googlePlaceId ? String(venueBody.googlePlaceId) : undefined,
      mapUrl: venueBody.mapUrl ? String(venueBody.mapUrl) : undefined,
      mapEmbedUrl: venueBody.mapEmbedUrl ? String(venueBody.mapEmbedUrl) : undefined,
      fieldLabel: venueBody.fieldLabel ? String(venueBody.fieldLabel) : undefined,
      notes: venueBody.notes ? String(venueBody.notes) : undefined,
      status: venueBody.status === "inactive" ? "inactive" : "active"
    } : undefined,
    opponent: requestBody.opponent ? String(requestBody.opponent) : undefined,
    status: status as "scheduled" | "cancelled" | "completed",
    reason: requestBody.reason ? String(requestBody.reason) : undefined,
    recurrence: recurrenceBody ? {
      frequency: recurrenceFrequency as "weekly",
      count: Number(recurrenceBody.count ?? 1),
      intervalWeeks: recurrenceBody.intervalWeeks === undefined ? undefined : Number(recurrenceBody.intervalWeeks),
      until: recurrenceBody.until ? String(recurrenceBody.until) : undefined
    } : undefined,
    recurrenceEditScope: recurrenceEditScope as "single" | "this_and_future" | "all" | undefined
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
