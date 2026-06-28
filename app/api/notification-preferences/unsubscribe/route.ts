import { NextResponse } from "next/server";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PREFERENCE_TYPES,
  type NotificationChannel,
  type NotificationPreferenceType
} from "@/lib/domain/contracts";
import { updateNotificationPreference } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Notification unsubscribe body is required." }, { status: 400 });
  }

  const channel = String(body.channel ?? "");
  const notificationType = String(body.notificationType ?? "");
  if (!NOTIFICATION_CHANNELS.includes(channel as NotificationChannel) || !NOTIFICATION_PREFERENCE_TYPES.includes(notificationType as NotificationPreferenceType)) {
    return NextResponse.json({ ok: false, message: "Unsupported notification unsubscribe." }, { status: 400 });
  }

  const result = await updateNotificationPreference({
    userId: auth.user.id,
    organizationId: body.organizationId ? String(body.organizationId) : undefined,
    teamId: body.teamId ? String(body.teamId) : undefined,
    channel: channel as NotificationChannel,
    notificationType: notificationType as NotificationPreferenceType,
    enabled: false,
    quietHoursStart: body.quietHoursStart ? String(body.quietHoursStart) : undefined,
    quietHoursEnd: body.quietHoursEnd ? String(body.quietHoursEnd) : undefined,
    timezone: body.timezone ? String(body.timezone) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
