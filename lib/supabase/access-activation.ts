import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

export interface FamilyAccessStatus {
  reference: string;
  status: "pending" | "approved" | "rejected";
  statusLabel: string;
  childLabel: string;
  teamName: string;
  submittedAt: string;
  reviewedAt?: string;
  nextStep: string;
}

export interface FamilyAccessStatusResult {
  ok: boolean;
  message: string;
  request?: FamilyAccessStatus;
}

function validReference(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function statusCopy(status: FamilyAccessStatus["status"]) {
  if (status === "approved") {
    return {
      label: "League review complete",
      nextStep: "Use the invitation or sign in with the same email. Identity confirmation never expands the child or team scope the league reviewed."
    };
  }
  if (status === "rejected") {
    return {
      label: "League follow-up needed",
      nextStep: "Contact league support with this reference. Private team information remains closed."
    };
  }
  return {
    label: "League review in progress",
    nextStep: "No action is needed yet. The league will send an invitation, request more information, or explain the next safe step."
  };
}

export async function findFamilyAccessStatus(input: {
  reference: string;
  email: string;
}): Promise<FamilyAccessStatusResult> {
  const reference = input.reference.trim();
  const email = input.email.trim().toLowerCase();
  if (!validReference(reference) || !validEmail(email)) {
    return { ok: false, message: "Enter the request reference and the same email used for the request." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    let requestQuery = supabase
      .from("registration_requests")
      .select("id,organization_id,team_id,parent_email,player_first_name,player_last_initial,status,created_at,reviewed_at")
      .eq("id", reference)
      .eq("parent_email", email);
    const publicOrganizationId = process.env.PUBLIC_ORGANIZATION_ID?.trim();
    if (publicOrganizationId) requestQuery = requestQuery.eq("organization_id", publicOrganizationId);

    const { data: request, error } = await withSupabaseTimeout(requestQuery.maybeSingle(), 7000);
    if (error) return { ok: false, message: "Request status is temporarily unavailable. Try again later." };
    if (!request) {
      return {
        ok: false,
        message: "We could not match that reference and email. Check the receipt or contact league support."
      };
    }

    const { data: team } = await withSupabaseTimeout(
      supabase.from("teams").select("name").eq("id", request.team_id).eq("organization_id", request.organization_id).maybeSingle(),
      7000
    );
    const copy = statusCopy(request.status);
    const firstInitial = request.player_first_name.trim().charAt(0).toUpperCase() || "Child";

    return {
      ok: true,
      message: copy.label,
      request: {
        reference: request.id,
        status: request.status,
        statusLabel: copy.label,
        childLabel: `${firstInitial}... ${request.player_last_initial.toUpperCase()}.`,
        teamName: team?.name ?? "Requested team",
        submittedAt: request.created_at,
        reviewedAt: request.reviewed_at ?? undefined,
        nextStep: copy.nextStep
      }
    };
  } catch {
    return { ok: false, message: "Request status could not reach league records. Try again later." };
  }
}

export async function requestInvitationRecovery(input: { email: string }) {
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email)) {
    return { ok: false, message: "Enter the email connected to the invitation." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const publicOrganizationId = process.env.PUBLIC_ORGANIZATION_ID?.trim();
    let inviteQuery = supabase
      .from("parent_invites")
      .select("id,organization_id,status")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1);
    if (publicOrganizationId) inviteQuery = inviteQuery.eq("organization_id", publicOrganizationId);

    const { data, error } = await withSupabaseTimeout(inviteQuery, 7000);
    if (error) return { ok: false, message: "Invitation recovery is temporarily unavailable. Try again later." };
    const invite = data?.[0];
    if (invite) {
      await withSupabaseTimeout(supabase.from("audit_events").insert({
        organization_id: invite.organization_id,
        actor_user_id: null,
        action: "invite_recovery_requested",
        target_type: "parent_invite",
        target_id: invite.id,
        summary: `Family requested admin review of a ${invite.status} invitation. No provider message was sent.`
      }), 7000);
    }

    return {
      ok: true,
      message: "If an invitation matches this email, the league will review its status. No message or new access was created automatically."
    };
  } catch {
    return { ok: false, message: "Invitation recovery could not reach league records. Try again later." };
  }
}
