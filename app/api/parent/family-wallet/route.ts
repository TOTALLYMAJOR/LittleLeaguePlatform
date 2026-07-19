import { NextResponse } from "next/server";
import { buildFamilyWalletSummary } from "@/lib/domain";
import { listParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const data = await listParentCoachDashboardData({
    viewerUserId: auth.user.id,
    surface: "parent"
  });

  if (data.accessStatus !== "live") {
    return NextResponse.json({ ok: false, message: data.message }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    message: "Family wallet reads are scoped to the signed-in guardian's linked players.",
    wallet: buildFamilyWalletSummary(data.state, auth.user.id),
    isSupabaseBacked: data.isSupabaseBacked
  });
}
