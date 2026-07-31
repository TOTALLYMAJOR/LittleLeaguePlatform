import { SharedAccessRequiredSurface } from "@/app/_access-state";
import { TeamChatClient } from "@/components/feature-panels";
import { resolveRouteAuthorityContext, type ProductRole } from "@/lib/navigation/route-topology";
import { scopeTeamChatData } from "@/lib/supabase/route-scopes";
import { getServerShellAccess, type ServerShellAccess } from "@/lib/supabase/shell-access";
import { listTeamChatData } from "@/lib/supabase/team-chat";

export const dynamic = "force-dynamic";

export default async function TeamChatPage() {
  const access = await getServerShellAccess();
  if (!access.signedIn) {
    return (
      <SharedAccessRequiredSurface
        title="Sign in to open team chat."
        body="Team chat stays private until a signed-in parent, coach, or admin has an active relationship to the team."
      />
    );
  }
  const authority = resolveRouteAuthorityContext(access, "/team-chat");
  if (!authority.dataScopeRole) {
    return (
      <SharedAccessRequiredSurface
        eyebrow="Choose role"
        title="Choose a role before opening team chat."
        body="This account has more than one active role. Team chat will load after the server can resolve one matching shell and data scope."
        actionHref={access.roleSwitchLinks[0]?.href ?? "/account"}
        actionLabel="Choose role"
      />
    );
  }
  const teamIds = resolveTeamChatTeamIds(access, authority.dataScopeRole);
  if (!teamIds.length || !access.userId) {
    return (
      <SharedAccessRequiredSurface
        eyebrow="Approval required"
        title="Team chat access is not active yet."
        body="Parents need an approved guardian link before chat appears. Coaches and admins need an active team or organization membership."
        actionHref="/registration"
        actionLabel="Submit registration request"
      />
    );
  }

  const teamChatData = await listTeamChatData();
  const scopedTeamChatData = scopeTeamChatData(teamChatData, teamIds, access.userId);
  return (
    <TeamChatClient
      teamChatData={scopedTeamChatData}
      viewerUserId={access.userId}
      lockedTeamId={scopedTeamChatData.teams[0]?.id}
    />
  );
}

function resolveTeamChatTeamIds(access: ServerShellAccess, role: ProductRole): string[] {
  if (role === "admin" && access.canAdmin) return access.adminTeamIds;
  if (role === "coach" && access.canCoach) return access.coachTeamIds;
  if (role === "parent" && access.canParent) return access.parentTeamIds;
  return [];
}

export const metadata = {
  title: "Team Chat"
};
