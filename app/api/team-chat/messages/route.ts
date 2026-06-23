import { NextResponse } from "next/server";
import type { ChatAnnouncementTopic, ChatMessageKind } from "@/lib/domain";
import { postSupabaseTeamChatMessage } from "@/lib/supabase/team-chat";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Team Chat message body is required." }, { status: 400 });
  }

  const result = await postSupabaseTeamChatMessage({
    teamId: String(body.teamId ?? ""),
    authorUserId: auth.user.id,
    body: String(body.body ?? ""),
    eventId: body.eventId ? String(body.eventId) : undefined,
    kind: (body.kind === "announcement" ? "announcement" : "message") as ChatMessageKind,
    topic: body.topic ? String(body.topic) as ChatAnnouncementTopic : undefined,
    pinned: Boolean(body.pinned)
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
