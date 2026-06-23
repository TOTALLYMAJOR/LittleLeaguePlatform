import { NextResponse } from "next/server";
import { createPendingRegistration } from "@/lib/supabase/registrations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Registration request body is required." }, { status: 400 });
  }

  const result = await createPendingRegistration({
    teamId: String(body.teamId ?? ""),
    parentName: String(body.parentName ?? ""),
    parentEmail: String(body.parentEmail ?? ""),
    playerFirstName: String(body.playerFirstName ?? ""),
    playerLastInitial: String(body.playerLastInitial ?? "")
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
