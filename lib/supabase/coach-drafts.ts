import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Draft review spans staged notification columns; keep the server boundary narrow.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface CoachDraftReviewRow {
  id: string;
  teamId: string;
  eventId?: string;
  title: string;
  body: string;
  channel: "push" | "email" | "sms";
  createdAt: string;
  recipientCount: number;
}

export interface CoachDraftReviewData {
  drafts: CoachDraftReviewRow[];
  isSupabaseBacked: boolean;
  message: string;
}

export async function listCoachDraftReviewData(input: { teamIds: string[] }): Promise<CoachDraftReviewData> {
  const teamIds = Array.from(new Set(input.teamIds.filter(Boolean)));
  if (!teamIds.length) {
    return {
      drafts: [],
      isSupabaseBacked: false,
      message: "An active coach team assignment is required to review drafts."
    };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db
      .from("notifications")
      .select("id,team_id,event_id,title,body,channel,status,created_at")
      .in("team_id", teamIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false }), 7000) as {
        data: Array<{
          id: string;
          team_id: string;
          event_id: string | null;
          title: string;
          body: string;
          channel: CoachDraftReviewRow["channel"];
          status: "pending";
          created_at: string;
        }> | null;
        error: { message?: string } | null;
      };
    if (error) {
      return { drafts: [], isSupabaseBacked: false, message: "Pending drafts could not be loaded. No queue is shown." };
    }

    const grouped = new Map<string, CoachDraftReviewRow>();
    for (const row of data ?? []) {
      const key = [row.team_id, row.event_id ?? "none", row.title, row.body, row.channel].join("\u001f");
      const current = grouped.get(key);
      if (current) {
        current.recipientCount += 1;
        continue;
      }
      grouped.set(key, {
        id: row.id,
        teamId: row.team_id,
        eventId: row.event_id ?? undefined,
        title: row.title,
        body: row.body,
        channel: row.channel,
        createdAt: row.created_at,
        recipientCount: 1
      });
    }

    return {
      drafts: Array.from(grouped.values()),
      isSupabaseBacked: true,
      message: grouped.size
        ? `${grouped.size} pending draft${grouped.size === 1 ? "" : "s"} loaded for assigned teams.`
        : "No pending drafts need coach review."
    };
  } catch {
    return { drafts: [], isSupabaseBacked: false, message: "Pending drafts could not reach team records. No queue is shown." };
  }
}
