import { NextResponse } from "next/server";
import { updateNotificationPreference } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const channels = new Set(["push", "email", "sms"]);
const notificationTypes = new Set([
  "schedule_changed",
  "event_cancelled",
  "new_event",
  "invite_sent",
  "invite_recovered",
  "parent_replay_ready",
  "team_broadcast",
  "weather_alert",
  "chat_announcement",
  "volunteer_reminder",
  "snack_reminder"
]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Notification preference body is required." }, { status: 400 });
  }

  const channel = String(body.channel ?? "");
  const notificationType = String(body.notificationType ?? "");
  if (!channels.has(channel) || !notificationTypes.has(notificationType)) {
    return NextResponse.json({ ok: false, message: "Unsupported notification preference." }, { status: 400 });
  }

  const result = await updateNotificationPreference({
    userId: auth.user.id,
    organizationId: body.organizationId ? String(body.organizationId) : undefined,
    teamId: body.teamId ? String(body.teamId) : undefined,
    channel: channel as "push" | "email" | "sms",
    notificationType: notificationType as Parameters<typeof updateNotificationPreference>[0]["notificationType"],
    enabled: Boolean(body.enabled),
    quietHoursStart: body.quietHoursStart ? String(body.quietHoursStart) : undefined,
    quietHoursEnd: body.quietHoursEnd ? String(body.quietHoursEnd) : undefined,
    timezone: body.timezone ? String(body.timezone) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
