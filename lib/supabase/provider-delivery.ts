import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Provider approval columns are staged until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export async function reviewNotificationDelivery(input: {
  notificationId: string;
  actorUserId: string;
  decision: "approved" | "rejected";
  provider: "email" | "sms" | "web_push";
}) {
  if (!input.notificationId || !input.actorUserId) return { ok: false, message: "Notification review requires notification and actor." };

  try {
    const db = adminDb();
    const { data: notification, error: notificationError } = await withSupabaseTimeout(db
      .from("notifications")
      .select("id,organization_id,team_id,channel,status")
      .eq("id", input.notificationId)
      .single(), 7000) as {
        data: { id: string; organization_id: string; team_id: string; channel: "push" | "email" | "sms"; status: string } | null;
        error: { message?: string } | null;
      };

    if (notificationError || !notification) return { ok: false, message: "Notification draft could not be found." };

    const [{ data: teamMemberships }, { data: adminMemberships }] = await withSupabaseTimeout(Promise.all([
      db.from("team_memberships").select("id").eq("team_id", notification.team_id).eq("user_id", input.actorUserId).eq("role", "coach").eq("status", "active"),
      db.from("organization_memberships").select("id").eq("organization_id", notification.organization_id).eq("user_id", input.actorUserId).eq("role", "admin").eq("status", "active")
    ]), 7000) as [{ data: Array<{ id: string }> | null }, { data: Array<{ id: string }> | null }];

    if (!teamMemberships?.length && !adminMemberships?.length) {
      return { ok: false, message: "Only assigned coaches or organization admins can approve provider delivery." };
    }

    const now = new Date().toISOString();
    const attemptStatus = input.decision === "approved" ? "queued" : "suppressed";
    const [{ data: updatedNotification }, { data: attempt }] = await withSupabaseTimeout(Promise.all([
      db.from("notifications")
        .update({
          provider_approval_status: input.decision,
          approved_by_user_id: input.actorUserId,
          approved_at: now
        })
        .eq("id", notification.id)
        .select("id,provider_approval_status,approved_at")
        .single(),
      db.from("notification_delivery_attempts")
        .insert({
          notification_id: notification.id,
          provider: input.provider,
          channel: notification.channel,
          status: attemptStatus,
          error_code: input.decision === "rejected" ? "human_rejected" : null,
          error_message: input.decision === "rejected" ? "Delivery suppressed by human review." : null
        })
        .select("id,provider,channel,status,attempted_at")
        .single()
    ]), 7000) as [
      { data: { id: string; provider_approval_status: string; approved_at: string } | null },
      { data: { id: string; provider: string; channel: string; status: string; attempted_at: string } | null }
    ];

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: notification.organization_id,
      actor_user_id: input.actorUserId,
      action: `provider_delivery_${input.decision}`,
      target_type: "notification",
      target_id: notification.id,
      summary: `${input.provider} delivery ${input.decision}; attempt status ${attemptStatus}.`
    }), 7000);

    return {
      ok: true,
      message: input.decision === "approved"
        ? "Provider delivery approved and queued as a delivery-attempt record. No external send occurred."
        : "Provider delivery rejected and logged as suppressed.",
      notification: updatedNotification,
      attempt
    };
  } catch {
    return { ok: false, message: "Provider delivery review could not reach Supabase." };
  }
}
