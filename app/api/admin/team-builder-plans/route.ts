import { NextResponse } from "next/server";
import {
  approveTeamBuildPlan,
  listTeamBuilderWorkbenchData,
  publishTeamBuildPlan,
  saveTeamBuildPlan,
  type TeamBuildAssignment
} from "@/lib/supabase/team-builder-plans";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const actionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const organizationId = new URL(request.url).searchParams.get("organizationId") ?? "";
  if (!organizationId) {
    return NextResponse.json({ ok: false, message: "Organization is required." }, { status: 400 });
  }
  const result = await listTeamBuilderWorkbenchData({
    actorUserId: auth.user.id,
    organizationIds: [organizationId]
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
    return NextResponse.json({ ok: false, message: "Team-builder plan body is required." }, { status: 400 });
  }
  const action = String(body.action ?? "");
  const actionId = String(body.actionId ?? "");
  const expectedLockVersion = Number(body.expectedLockVersion);
  if (!["preview", "edit", "approve", "publish"].includes(action)
    || !actionIdPattern.test(actionId)
    || !Number.isInteger(expectedLockVersion)
    || expectedLockVersion < 0) {
    return NextResponse.json({
      ok: false,
      message: "Choose a supported reviewed action with a UUID action identifier and expected version."
    }, { status: 400 });
  }

  const result = action === "approve"
    ? await approveTeamBuildPlan({
      planId: String(body.planId ?? ""),
      actorUserId: auth.user.id,
      expectedLockVersion,
      actionId
    })
    : action === "publish"
      ? await publishTeamBuildPlan({
        planId: String(body.planId ?? ""),
        actorUserId: auth.user.id,
        expectedLockVersion,
        actionId
      })
      : await saveTeamBuildPlan({
        planId: action === "edit" ? String(body.planId ?? "") : undefined,
        organizationId: String(body.organizationId ?? ""),
        seasonId: String(body.seasonId ?? ""),
        division: String(body.division ?? ""),
        targetRosterSize: Number(body.targetRosterSize),
        actorUserId: auth.user.id,
        expectedLockVersion,
        actionId,
        friendRequests: Array.isArray(body.friendRequests)
          ? body.friendRequests.map((request: Record<string, unknown>) => ({
            playerId: String(request.playerId ?? ""),
            friendPlayerId: String(request.friendPlayerId ?? "")
          }))
          : [],
        assignments: Array.isArray(body.assignments)
          ? body.assignments.map((assignment: Record<string, unknown>): TeamBuildAssignment => ({
            playerId: String(assignment.playerId ?? ""),
            teamId: String(assignment.teamId ?? "")
          }))
          : undefined
      });
  return NextResponse.json(result, {
    status: result.ok ? 200 : "conflict" in result && result.conflict ? 409 : 400
  });
}
