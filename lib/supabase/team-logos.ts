import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Team logo metadata table is introduced by a staged migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export async function saveTeamLogoAsset(input: {
  organizationId: string;
  actorUserId: string;
  teamId?: string;
  url: string;
  policyNotes?: string;
}) {
  if (!input.organizationId || !input.actorUserId || !input.url.trim()) {
    return { ok: false, message: "Logo asset requires organization, admin, and URL." };
  }

  try {
    const url = new URL(input.url.trim());
    if (url.protocol !== "https:") return { ok: false, message: "Logo asset URL must use HTTPS." };
  } catch {
    return { ok: false, message: "Logo asset URL must be valid." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "manage team logo assets"
    });
    if (!access.ok) return { ok: false, message: access.message };

    if (input.teamId) {
      const { data: team, error: teamError } = await withSupabaseTimeout(db
        .from("teams")
        .select("id,organization_id")
        .eq("id", input.teamId)
        .single(), 7000) as {
          data: { id: string; organization_id: string } | null;
          error: { message?: string } | null;
        };

      if (teamError || !team || team.organization_id !== input.organizationId) {
        return { ok: false, message: "Logo asset team must belong to the selected organization." };
      }
    }

    const policyNotes = input.policyNotes ?? "Pending logo asset review.";
    const { data, error } = await withSupabaseTimeout(db.from("team_logo_assets").insert({
      organization_id: input.organizationId,
      team_id: input.teamId ?? null,
      uploaded_by_user_id: input.actorUserId,
      url: input.url.trim(),
      status: "pending",
      policy_notes: policyNotes
    }).select("id,organization_id,team_id,uploaded_by_user_id,url,status,policy_notes,created_at,reviewed_at,reviewed_by_user_id").single(), 7000) as {
      data: {
        id: string;
        organization_id: string;
        team_id: string | null;
        uploaded_by_user_id: string | null;
        url: string;
        status: "pending" | "approved" | "rejected" | "removed";
        policy_notes: string | null;
        created_at: string;
        reviewed_at: string | null;
        reviewed_by_user_id: string | null;
      } | null;
      error: { message?: string } | null;
    };

    if (error || !data) return { ok: false, message: "Logo asset could not be saved." };

    const { data: organization } = await withSupabaseTimeout(db.from("organizations")
      .update({ logo_status: "queued" })
      .eq("id", input.organizationId)
      .select("logo_status")
      .single(), 7000) as {
        data: { logo_status: "queued" | "approved" | "not_configured" } | null;
        error: { message?: string } | null;
      };

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: "team_logo_asset_submitted",
      target_type: "team_logo_asset",
      target_id: data.id,
      summary: "Team logo asset submitted for brand governance review."
    }), 7000);

    return {
      ok: true,
      message: "Logo asset saved for review.",
      tenantLogoStatus: organization?.logo_status,
      logoAsset: {
        id: data.id,
        organizationId: data.organization_id,
        teamId: data.team_id ?? undefined,
        uploadedByUserId: data.uploaded_by_user_id ?? undefined,
        url: data.url,
        status: data.status,
        policyNotes: data.policy_notes ?? undefined,
        createdAt: data.created_at,
        reviewedAt: data.reviewed_at ?? undefined,
        reviewedByUserId: data.reviewed_by_user_id ?? undefined
      }
    };
  } catch {
    return { ok: false, message: "Logo asset could not reach Supabase." };
  }
}
