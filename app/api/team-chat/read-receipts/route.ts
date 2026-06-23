import { NextResponse } from "next/server";
import { markSupabaseTeamChatRead } from "@/lib/supabase/team-chat";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray(body.messageIds)) {
    return NextResponse.json({ ok: false, message: "Read receipts require message IDs." }, { status: 400 });
  }

  const result = await markSupabaseTeamChatRead({
    userId: auth.user.id,
    messageIds: body.messageIds.map((value: unknown) => String(value))
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
