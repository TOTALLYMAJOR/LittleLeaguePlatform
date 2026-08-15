import { SharedAccessRequiredSurface } from "@/app/_access-state";
import { FamilyTeamPage, type FamilyTeamView } from "@/components/family-team-page";
import { TeamPortalClient } from "@/components/feature-panels";
import { resolveRouteAuthorityContext, type ProductRole } from "@/lib/navigation/route-topology";
import { scopeTeamPortalData } from "@/lib/supabase/route-scopes";
import { getServerShellAccess, type ServerShellAccess } from "@/lib/supabase/shell-access";
import { listTeamPortalData } from "@/lib/supabase/team-portal";

export const dynamic = "force-dynamic";

export default async function TeamPortalPage() {
  const access = await getServerShellAccess();
  if (!access.signedIn) {
    return (
      <SharedAccessRequiredSurface
        title="Sign in to open the team portal."
        body="Team portal details stay hidden until a signed-in adult has an active parent, coach, or admin relationship."
      />
    );
  }
  const authority = resolveRouteAuthorityContext(access, "/team-portal");
  if (!authority.dataScopeRole) {
    return (
      <SharedAccessRequiredSurface
        eyebrow="Choose role"
        title="Choose a role before opening the team portal."
        body="This account has more than one active role. The portal will load after the server can resolve one matching shell and data scope."
        actionHref={access.roleSwitchLinks[0]?.href ?? "/account"}
        actionLabel="Choose role"
      />
    );
  }
  const scope = resolveTeamPortalScope(access, authority.dataScopeRole);
  if (!scope) {
    return (
      <SharedAccessRequiredSurface
        eyebrow="Approval required"
        title="Team portal access is not active yet."
        body="Parents need an approved guardian link before team portal details appear. Coaches and admins need an active team or organization membership."
        actionHref="/registration"
        actionLabel="Submit registration request"
      />
    );
  }

  const teamPortalData = await listTeamPortalData();
  const scopedTeamPortalData = teamPortalData
    ? scopeTeamPortalData(teamPortalData, scope.teamIds, {
      audience: scope.audience,
      viewerUserId: access.userId
    })
    : null;

  if (scope.audience === "parent" && (!scopedTeamPortalData || scopedTeamPortalData.teams.length === 0)) {
    return (
      <SharedAccessRequiredSurface
        eyebrow="Approval required"
        title="No accepted parent-team access is active yet."
        body="The signed-in parent account needs an active guardian link before the team portal can show schedules, players, media, or coach updates."
        actionHref="/registration"
        actionLabel="Submit registration request"
      />
    );
  }

  if (scope.audience === "parent" && scopedTeamPortalData) {
    const usersById = new Map(scopedTeamPortalData.users.map((user) => [user.id, user]));
    const view: FamilyTeamView = {
      teams: scopedTeamPortalData.teams.map((team) => {
        const nextEvent = scopedTeamPortalData.events
          .filter((event) => event.teamId === team.id && event.status === "scheduled")
          .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];
        const coachNames = scopedTeamPortalData.teamMemberships
          .filter((membership) => (
            membership.teamId === team.id &&
            membership.role === "coach" &&
            membership.status === "active"
          ))
          .flatMap((membership) => {
            const user = usersById.get(membership.userId);
            return user ? [user.name] : [];
          });
        return {
          id: team.id,
          name: team.name,
          mascot: team.mascot,
          coachNames,
          nextEvent: nextEvent ? {
            title: nextEvent.title,
            startsAt: nextEvent.startsAt,
            locationName: nextEvent.locationName
          } : undefined
        };
      })
    };
    return <FamilyTeamPage view={view} />;
  }

  return <TeamPortalClient teamPortalData={scopedTeamPortalData} audience={scope.audience} />;
}

function resolveTeamPortalScope(access: ServerShellAccess, role: ProductRole): { audience: "parent" | "coach" | "admin"; teamIds: string[] } | null {
  if (role === "admin" && access.canAdmin && access.adminTeamIds.length) {
    return { audience: "admin", teamIds: access.adminTeamIds };
  }
  if (role === "coach" && access.canCoach && access.coachTeamIds.length) {
    return { audience: "coach", teamIds: access.coachTeamIds };
  }
  if (role === "parent" && access.canParent && access.parentTeamIds.length) {
    return { audience: "parent", teamIds: access.parentTeamIds };
  }
  return null;
}

export const metadata = {
  title: "Team Portal"
};
