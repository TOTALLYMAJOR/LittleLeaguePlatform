import { NextResponse } from "next/server";
import {
  readTeamBuilderInputs,
  saveTeamBuilderInput
} from "@/lib/supabase/team-builder-inputs";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId") ?? "";
  const seasonId = url.searchParams.get("seasonId") ?? "";
  if (!organizationId || !seasonId) {
    return NextResponse.json({ ok: false, message: "Organization and season are required." }, { status: 400 });
  }
  const result = await readTeamBuilderInputs({
    organizationId,
    seasonId,
    actorUserId: auth.user.id
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 403 });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Private team-builder input body is required." }, { status: 400 });
  }
  const evaluationRating = body.evaluationRating === null || body.evaluationRating === ""
    ? null
    : Number(body.evaluationRating);
  const result = await saveTeamBuilderInput({
    organizationId: String(body.organizationId ?? ""),
    seasonId: String(body.seasonId ?? ""),
    playerId: String(body.playerId ?? ""),
    actorUserId: auth.user.id,
    birthDate: body.birthDate == null ? null : String(body.birthDate),
    ageBand: body.ageBand == null ? null : String(body.ageBand),
    evaluationRating
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
