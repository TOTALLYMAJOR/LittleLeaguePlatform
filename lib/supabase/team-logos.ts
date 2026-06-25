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

    const { data, error } = await withSupabaseTimeout(db.from("team_logo_assets").insert({
      organization_id: input.organizationId,
      team_id: input.teamId ?? null,
      uploaded_by_user_id: input.actorUserId,
      url: input.url.trim(),
      status: "pending",
      policy_notes: input.policyNotes ?? "Pending logo asset review."
    }).select("id,url,status,created_at").single(), 7000) as {
      data: { id: string; url: string; status: string; created_at: string } | null;
      error: { message?: string } | null;
    };

    if (error || !data) return { ok: false, message: "Logo asset could not be saved." };

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: "team_logo_asset_submitted",
      target_type: "team_logo_asset",
      target_id: data.id,
      summary: "Team logo asset submitted for brand governance review."
    }), 7000);

    return { ok: true, message: "Logo asset saved for review.", logoAsset: data };
  } catch {
    return { ok: false, message: "Logo asset could not reach Supabase." };
  }
}
