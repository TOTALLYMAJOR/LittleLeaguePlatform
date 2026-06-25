import type { RosterImportAnalysis } from "@/lib/domain";
import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Roster import audit rows span staged tables; keep dynamic until generated
  // Supabase types are refreshed for every migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export async function recordRosterImportAudit(input: {
  organizationId: string;
  seasonId: string;
  actorUserId: string;
  filename?: string;
  analysis: RosterImportAnalysis;
}) {
  if (!input.organizationId || !input.seasonId || !input.actorUserId) {
    return { ok: false, message: "Roster import audit requires organization, season, and acting admin." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "record roster import audits"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const { data: rosterImport, error } = await withSupabaseTimeout(db
      .from("roster_imports")
      .insert({
        organization_id: input.organizationId,
        season_id: input.seasonId,
        uploaded_by_user_id: input.actorUserId,
        filename: input.filename ?? "roster-import.csv",
        status: "validated",
        total_rows: input.analysis.totalRows,
        valid_rows: input.analysis.validRows,
        warning_rows: input.analysis.warningRows,
        error_rows: input.analysis.errorRows
      })
      .select("id,status,total_rows,valid_rows,warning_rows,error_rows,created_at")
      .single(), 7000) as {
        data: {
          id: string;
          status: string;
          total_rows: number;
          valid_rows: number;
          warning_rows: number;
          error_rows: number;
          created_at: string;
        } | null;
        error: { message?: string } | null;
      };

    if (error || !rosterImport) return { ok: false, message: "Roster import audit could not be created." };

    const rowPayload = input.analysis.rows.map((row) => ({
      roster_import_id: rosterImport.id,
      row_number: row.rowNumber,
      raw_data: row.raw,
      normalized_data: row.normalized,
      status: row.status,
      issue_codes: row.issues.map((issue) => issue.code)
    }));

    if (rowPayload.length) {
      const rowsResult = await withSupabaseTimeout(db.from("roster_import_rows").insert(rowPayload).select("id"), 7000) as { error: { message?: string } | null };
      if (rowsResult.error) return { ok: false, message: "Roster import audit was created, but row evidence could not be saved." };
    }

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: "roster_import_validated",
      target_type: "roster_import",
      target_id: rosterImport.id,
      summary: `Roster import validated with ${input.analysis.validRows} valid, ${input.analysis.warningRows} warning, and ${input.analysis.errorRows} error rows. No roster commit or provider send occurred.`
    }), 7000);

    return {
      ok: true,
      message: "Roster import audit saved. No roster records, guardian links, invites, or provider sends were created.",
      rosterImport
    };
  } catch {
    return { ok: false, message: "Roster import audit could not reach Supabase." };
  }
}
