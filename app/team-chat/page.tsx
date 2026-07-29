import { SharedAccessRequiredSurface } from "@/app/_access-state";
import { TeamChatClient } from "@/components/feature-panels";
import { scopeTeamChatData } from "@/lib/supabase/route-scopes";
import { getServerShellAccess, type ServerShellAccess } from "@/lib/supabase/shell-access";
import { listTeamChatData } from "@/lib/supabase/team-chat";

export const dynamic = "force-dynamic";

export default async function TeamChatPage() {
  const access = await getServerShellAccess();
  const teamIds = resolveTeamChatTeamIds(access);
  if (!access.signedIn) {
    return (
      <SharedAccessRequiredSurface
        title="Sign in to open team chat."
        body="Team chat stays private until a signed-in parent, coach, or admin has an active relationship to the team."
      />
    );
  }
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

function resolveTeamChatTeamIds(access: ServerShellAccess): string[] {
  if (access.canAdmin && access.adminTeamIds.length) return access.adminTeamIds;
  if (access.canCoach && access.coachTeamIds.length) return access.coachTeamIds;
  if (access.canParent && access.parentTeamIds.length) return access.parentTeamIds;
  return [];
}

export const metadata = {
  title: "Team Chat"
};
