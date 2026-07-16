import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type ExportKind =
  | "roster"
  | "contacts"
  | "schedule"
  | "rsvps"
  | "snacks"
  | "volunteers"
  | "sponsors"
  | "notifications";

type UnsafeSupabase = {
  // Reporting spans staged tables and joins; keep dynamic until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

type TeamRow = { id: string; name: string; division: string };
type PlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_initial: string;
  jersey: string | null;
};
type EventRow = {
  id: string;
  team_id: string;
  title: string;
  event_type: string;
  starts_at: string;
  location_name: string | null;
  status: string;
};
type ProfileRow = {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
};

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "status\nempty\n";
  const headers = Object.keys(rows[0]!);
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(","),
    ),
  ].join("\n");
}

export async function createAdminExport(input: {
  organizationId: string;
  actorUserId: string;
  kind: ExportKind;
}) {
  if (!input.organizationId || !input.actorUserId)
    return {
      ok: false,
      message: "Export requires organization and acting admin.",
    };

  try {
    const db = adminDb();
    const adminMembershipResult = (await withSupabaseTimeout(
      db
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", input.organizationId)
        .eq("user_id", input.actorUserId)
        .eq("role", "admin")
        .eq("status", "active"),
      7000,
    )) as { data: Array<{ id: string }> | null };
    const adminMemberships = adminMembershipResult.data;

    if (!adminMemberships?.length)
      return {
        ok: false,
        message: "Only active organization admins can export league reports.",
      };

    const [{ data: teams }, { data: players }, { data: events }] =
      (await withSupabaseTimeout(
        Promise.all([
          db
            .from("teams")
            .select("id,name,division")
            .eq("organization_id", input.organizationId),
          db
            .from("players")
            .select("id,team_id,first_name,last_initial,jersey")
            .eq("organization_id", input.organizationId),
          db
            .from("events")
            .select(
              "id,team_id,title,event_type,starts_at,location_name,status",
            )
            .eq("organization_id", input.organizationId),
        ]),
        7000,
      )) as [
        { data: TeamRow[] | null },
        { data: PlayerRow[] | null },
        { data: EventRow[] | null },
      ];

    const teamIds = new Set((teams ?? []).map((team) => team.id));
    const playerIds = new Set((players ?? []).map((player) => player.id));
    const eventIds = new Set((events ?? []).map((event) => event.id));
    const teamById = new Map<string, TeamRow>(
      (teams ?? []).map((team) => [team.id, team]),
    );
    const playerById = new Map<string, PlayerRow>(
      (players ?? []).map((player) => [player.id, player]),
    );
    const eventById = new Map<string, EventRow>(
      (events ?? []).map((event) => [event.id, event]),
    );
    const profileIds = new Set<string>();

    let rows: Record<string, unknown>[] = [];
    if (input.kind === "roster") {
      rows = (players ?? []).map((player) => {
        const team = teamById.get(player.team_id);
        return {
          team: team?.name,
          division: team?.division,
          player: `${player.first_name} ${player.last_initial}.`,
          jersey: player.jersey,
        };
      });
    } else if (input.kind === "contacts") {
      const { data } = playerIds.size
        ? ((await withSupabaseTimeout(
            db
              .from("player_guardians")
              .select("player_id,parent_user_id,relationship,status")
              .in("player_id", Array.from(playerIds)),
            7000,
          )) as {
            data: Array<{
              player_id: string;
              parent_user_id: string | null;
              relationship: string;
              status: string;
            }> | null;
          })
        : { data: null };
      rows = (data ?? []).map((row) => {
        if (row.parent_user_id) profileIds.add(row.parent_user_id);
        const player = playerById.get(row.player_id);
        return {
          player: player
            ? `${player.first_name} ${player.last_initial}.`
            : row.player_id,
          parentUserId: row.parent_user_id,
          relationship: row.relationship,
          status: row.status,
        };
      });
    } else if (input.kind === "schedule") {
      rows = (events ?? []).map((event) => ({
        team: teamById.get(event.team_id)?.name,
        title: event.title,
        type: event.event_type,
        startsAt: event.starts_at,
        location: event.location_name,
        status: event.status,
      }));
    } else if (input.kind === "rsvps") {
      const { data } =
        eventIds.size && playerIds.size
          ? ((await withSupabaseTimeout(
              db
                .from("rsvps")
                .select(
                  "event_id,player_id,parent_user_id,response,note,responded_at",
                )
                .in("event_id", Array.from(eventIds))
                .in("player_id", Array.from(playerIds)),
              7000,
            )) as {
              data: Array<{
                event_id: string;
                player_id: string;
                parent_user_id: string;
                response: string;
                note: string | null;
                responded_at: string;
              }> | null;
            })
          : { data: null };
      rows = (data ?? []).map((row) => {
        profileIds.add(row.parent_user_id);
        const player = playerById.get(row.player_id);
        return {
          event: eventById.get(row.event_id)?.title,
          player: player
            ? `${player.first_name} ${player.last_initial}.`
            : row.player_id,
          parentUserId: row.parent_user_id,
          response: row.response,
          note: row.note,
          respondedAt: row.responded_at,
        };
      });
    } else if (input.kind === "snacks") {
      const { data } =
        teamIds.size && eventIds.size
          ? ((await withSupabaseTimeout(
              db
                .from("snack_schedule_slots")
                .select("team_id,event_id,assigned_parent_user_id,item,status")
                .in("team_id", Array.from(teamIds))
                .in("event_id", Array.from(eventIds)),
              7000,
            )) as {
              data: Array<{
                team_id: string;
                event_id: string;
                assigned_parent_user_id: string | null;
                item: string;
                status: string;
              }> | null;
            })
          : { data: null };
      rows = (data ?? []).map((row) => {
        if (row.assigned_parent_user_id)
          profileIds.add(row.assigned_parent_user_id);
        return {
          team: teamById.get(row.team_id)?.name,
          event: eventById.get(row.event_id)?.title,
          item: row.item,
          assignedParentUserId: row.assigned_parent_user_id,
          status: row.status,
        };
      });
    } else if (input.kind === "volunteers") {
      const { data } = teamIds.size
        ? ((await withSupabaseTimeout(
            db
              .from("volunteer_signups")
              .select("team_id,event_id,assigned_user_id,role,status")
              .in("team_id", Array.from(teamIds)),
            7000,
          )) as {
            data: Array<{
              team_id: string;
              event_id: string | null;
              assigned_user_id: string | null;
              role: string;
              status: string;
            }> | null;
          })
        : { data: null };
      rows = (data ?? []).map((row) => {
        if (row.assigned_user_id) profileIds.add(row.assigned_user_id);
        return {
          team: teamById.get(row.team_id)?.name,
          event: row.event_id ? eventById.get(row.event_id)?.title : "",
          role: row.role,
          assignedUserId: row.assigned_user_id,
          status: row.status,
        };
      });
    } else if (input.kind === "sponsors") {
      const { data } = (await withSupabaseTimeout(
        db
          .from("sponsors")
          .select("name,level,team_id,url,status")
          .eq("organization_id", input.organizationId),
        7000,
      )) as {
        data: Array<{
          name: string;
          level: string;
          team_id: string | null;
          url: string;
          status: string;
        }> | null;
      };
      rows = (data ?? []).map(
        (row: {
          name: string;
          level: string;
          team_id: string | null;
          url: string;
          status: string;
        }) => ({
          name: row.name,
          level: row.level,
          team: row.team_id ? teamById.get(row.team_id)?.name : "",
          url: row.url,
          status: row.status,
        }),
      );
    } else if (input.kind === "notifications") {
      const { data } = (await withSupabaseTimeout(
        db
          .from("notifications")
          .select(
            "recipient_user_id,team_id,event_id,notification_type,title,channel,status,created_at,sent_at",
          )
          .eq("organization_id", input.organizationId),
        7000,
      )) as {
        data: Array<{
          recipient_user_id: string;
          team_id: string;
          event_id: string | null;
          notification_type: string;
          title: string;
          channel: string;
          status: string;
          created_at: string;
          sent_at: string | null;
        }> | null;
      };
      rows = (data ?? []).map((row) => {
        profileIds.add(row.recipient_user_id);
        return {
          recipientUserId: row.recipient_user_id,
          team: teamById.get(row.team_id)?.name,
          event: row.event_id ? eventById.get(row.event_id)?.title : "",
          type: row.notification_type,
          title: row.title,
          channel: row.channel,
          status: row.status,
          createdAt: row.created_at,
          sentAt: row.sent_at,
        };
      });
    }

    const { data: profiles } = profileIds.size
      ? ((await withSupabaseTimeout(
          db
            .from("profiles")
            .select("id,display_name,email,phone")
            .in("id", Array.from(profileIds)),
          7000,
        )) as { data: ProfileRow[] | null })
      : { data: null };
    const profileById = new Map<string, ProfileRow>(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );
    rows = rows.map((row) => {
      if ("parentUserId" in row) {
        const profile = row.parentUserId
          ? profileById.get(String(row.parentUserId))
          : undefined;
        const next = { ...row };
        delete next.parentUserId;
        return {
          ...next,
          parent: profile?.display_name,
          email: profile?.email,
          phone: profile?.phone,
        };
      }
      if ("assignedParentUserId" in row) {
        const profile = row.assignedParentUserId
          ? profileById.get(String(row.assignedParentUserId))
          : undefined;
        const next = { ...row };
        delete next.assignedParentUserId;
        return { ...next, assignedParent: profile?.display_name ?? "" };
      }
      if ("assignedUserId" in row) {
        const profile = row.assignedUserId
          ? profileById.get(String(row.assignedUserId))
          : undefined;
        const next = { ...row };
        delete next.assignedUserId;
        return { ...next, assignedUser: profile?.display_name ?? "" };
      }
      if ("recipientUserId" in row) {
        const profile = row.recipientUserId
          ? profileById.get(String(row.recipientUserId))
          : undefined;
        const next = { ...row };
        delete next.recipientUserId;
        return { ...next, recipient: profile?.display_name };
      }
      return row;
    });

    await withSupabaseTimeout(
      db.from("audit_events").insert({
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId,
        action: "admin_export_created",
        target_type: "report_export",
        target_id: input.organizationId,
        summary: `${input.kind} export generated with ${rows.length} row(s).`,
      }),
      7000,
    );

    return {
      ok: true,
      message: `${input.kind} export generated with ${rows.length} row(s).`,
      filename: `${input.kind}-export.csv`,
      contentType: "text/csv",
      csv: toCsv(rows),
    };
  } catch {
    return { ok: false, message: "Admin export could not reach Supabase." };
  }
}
