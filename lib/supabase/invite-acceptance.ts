import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function previewParentInvite(token: string) {
  if (token.trim().length < 24) return { ok: false, code: "invalid", message: "This invitation link is incomplete." };
  try {
    const supabase = createSupabaseAdminClient();
    const { data: invite, error } = await withSupabaseTimeout(
      supabase
        .from("parent_invites")
        .select("id,organization_id,team_id,player_id,email,status,expires_at,accepted_at")
        .eq("invite_token_hash", tokenHash(token))
        .maybeSingle(),
      7000
    );
    if (error || !invite) return { ok: false, code: "invalid", message: "This invitation is not valid. Ask the league for a new one." };
    const [{ data: organization }, { data: team }, { data: player }] = await withSupabaseTimeout(Promise.all([
      supabase.from("organizations").select("name").eq("id", invite.organization_id).maybeSingle(),
      supabase.from("teams").select("name").eq("id", invite.team_id).eq("organization_id", invite.organization_id).maybeSingle(),
      supabase.from("players").select("first_name,last_initial").eq("id", invite.player_id).eq("organization_id", invite.organization_id).maybeSingle()
    ]), 7000);
    const expired = invite.status === "expired" || Date.parse(invite.expires_at) <= Date.now();
    const code = invite.status === "accepted" ? "accepted" : invite.status === "revoked" ? "revoked" : expired ? "expired" : "valid";
    const first = player?.first_name?.charAt(0).toUpperCase() || "Child";
    const invitation = {
      organizationName: organization?.name ?? "League",
      teamName: team?.name ?? "Approved team",
      childLabel: `${first}... ${player?.last_initial?.toUpperCase() ?? ""}.`,
      emailLabel: invite.email.replace(/^(.).+(@.*)$/, "$1•••$2"),
      expiresAt: invite.expires_at
    };
    return {
      ok: code === "valid",
      code,
      message: code === "valid" ? "Invitation ready for identity confirmation." : `This invitation is ${code}.`,
      ...(code === "valid" ? { invitation } : {})
    };
  } catch {
    return { ok: false, code: "error", message: "Invitation status is temporarily unavailable." };
  }
}

const PARENT_INVITE_SMS_CONSENT_VERSION = "parent-invite-essential-updates-v1";

export async function acceptParentInvite(input: {
  token: string;
  userId: string;
  fullName: string;
  phone: string;
  smsOptIn: boolean;
}) {
  if (input.token.trim().length < 24 || !input.userId) return { ok: false, message: "Invitation and signed-in identity are required." };
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const phone = input.phone.replace(/[\s().-]/g, "");
  if (fullName.split(" ").filter(Boolean).length < 2) return { ok: false, message: "Enter your full name." };
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return { ok: false, message: "Enter a mobile number with country code, such as +13125551234." };
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(supabase.rpc("accept_parent_invite_with_contact", {
      target_invite_token_hash: tokenHash(input.token),
      accepting_user_id: input.userId,
      parent_display_name: fullName,
      parent_mobile_phone: phone,
      record_sms_consent: input.smsOptIn,
      consent_version: PARENT_INVITE_SMS_CONSENT_VERSION
    }), 10000);
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      message: input.smsOptIn
        ? "Invitation accepted and SMS consent recorded. No message was sent."
        : "Invitation accepted. SMS remains off and no message was sent.",
      result: data
    };
  } catch {
    return { ok: false, message: "Invitation acceptance could not reach league records." };
  }
}
