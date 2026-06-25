import { seedState } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Archive vault aggregates staged records.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface ArchiveVaultData {
  archivedSeasons: Array<{ id: string; name: string; archivedAt?: string; teamCount: number }>;
  proof: Array<{ label: string; detail: string }>;
  message: string;
}

export async function listArchiveVaultData(): Promise<ArchiveVaultData> {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [{ data: seasons }, { data: teams }] = await withSupabaseTimeout(Promise.all([
      db.from("seasons").select("id,name,status,archived_at").eq("status", "archived").order("archived_at", { ascending: false }),
      db.from("teams").select("id,season_id,status")
    ]), 7000) as [
      { data: Array<{ id: string; name: string; status: string; archived_at: string | null }> | null },
      { data: Array<{ id: string; season_id: string; status?: string | null }> | null }
    ];

    return {
      archivedSeasons: (seasons ?? []).map((season) => ({
        id: season.id,
        name: season.name,
        archivedAt: season.archived_at ?? undefined,
        teamCount: (teams ?? []).filter((team) => team.season_id === season.id).length
      })),
      proof: [
        { label: "Read-only lock", detail: "Archived event and RSVP writes are blocked by active-season RLS checks." },
        { label: "Export first", detail: "Use `/api/admin/exports` before closing a season archive." },
        { label: "Chat retention", detail: "Chat text deletion proof remains separate from retained non-chat records." }
      ],
      message: "Showing Supabase archive vault records."
    };
  } catch {
    return {
      archivedSeasons: seedState.activeSeason.status === "archived"
        ? [{ id: seedState.activeSeason.id, name: seedState.activeSeason.name, archivedAt: seedState.activeSeason.archivedAt, teamCount: seedState.teams.length }]
        : [],
      proof: [
        { label: "Read-only lock", detail: "Archived event and RSVP writes are blocked by active-season RLS checks." },
        { label: "Export first", detail: "Use `/api/admin/exports` before closing a season archive." },
        { label: "Chat retention", detail: "Chat text deletion proof remains separate from retained non-chat records." }
      ],
      message: "Showing local archive vault records until Supabase archive rows are available."
    };
  }
}
