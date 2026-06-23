import { NextResponse } from "next/server";
import type { ChatModerationAction } from "@/lib/domain";
import { moderateSupabaseTeamChatMessage } from "@/lib/supabase/team-chat";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const actions = new Set(["message_hidden", "message_deleted", "message_restored"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Team Chat moderation body is required." }, { status: 400 });
  }

  const action = String(body.action ?? "");
  if (!actions.has(action)) {
    return NextResponse.json({ ok: false, message: "Unsupported moderation action." }, { status: 400 });
  }

  const result = await moderateSupabaseTeamChatMessage({
    messageId: String(body.messageId ?? ""),
    actorUserId: auth.user.id,
    action: action as ChatModerationAction,
    reason: String(body.reason ?? "")
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
