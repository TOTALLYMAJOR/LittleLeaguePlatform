import { NextResponse } from "next/server";
import {
  publishOfficialCommunicationVersion,
  type OfficialCommunicationAction,
  type OfficialCommunicationCategory,
  type OfficialCommunicationPriority
} from "@/lib/supabase/official-communications";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const actions = new Set<OfficialCommunicationAction>(["published", "corrected", "withdrawn"]);
const categories = new Set<OfficialCommunicationCategory>(["official_disruption", "critical_instruction", "official_update"]);
const priorities = new Set<OfficialCommunicationPriority>(["routine", "action_required", "disruption", "critical"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Official message details are required." }, { status: 400 });
  }
  const action = String(body.action ?? "") as OfficialCommunicationAction;
  const category = String(body.category ?? "") as OfficialCommunicationCategory;
  const priority = String(body.priority ?? "") as OfficialCommunicationPriority;
  if (!actions.has(action) || !categories.has(category) || !priorities.has(priority)) {
    return NextResponse.json({ ok: false, message: "Choose a supported message type and priority." }, { status: 400 });
  }
  const result = await publishOfficialCommunicationVersion({
    actorUserId: auth.user.id,
    threadId: body.threadId ? String(body.threadId) : undefined,
    eventId: String(body.eventId ?? ""),
    action,
    category,
    priority,
    title: String(body.title ?? ""),
    body: String(body.body ?? ""),
    reason: String(body.reason ?? ""),
    expectedThreadVersion: Number(body.expectedThreadVersion ?? 0),
    expectedScheduleVersion: Number(body.expectedScheduleVersion ?? 0),
    idempotencyKey: String(request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? "")
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
