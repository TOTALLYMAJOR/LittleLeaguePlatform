import type { RegistrationRequest } from "@/lib/domain";
import { seedState } from "@/lib/domain";
import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "./admin";
import { listRegistrationRequests } from "./registrations";
import { withSupabaseTimeout } from "./timeout";

export interface RegistrationReviewerOption {
  id: string;
  displayName: string;
  email: string;
  scopes: string[];
}

export interface RegistrationApprovalAction {
  id: string;
  registrationRequestId: string;
  action: string;
  note?: string;
  createdAt: string;
}

export interface RegistrationReviewData {
  registrationRequests: RegistrationRequest[];
  reviewers: RegistrationReviewerOption[];
  actions: RegistrationApprovalAction[];
}

export interface RegistrationReviewResult {
  ok: boolean;
  message: string;
  result?: unknown;
  invitationPath?: string;
  expiresAt?: string;
  accessActivated?: boolean;
}

type UnsafeApprovalRpc = {
  // Migration 0033 intentionally leads generated database function types.
  rpc(
    functionName: string,
    parameters: Record<string, unknown>
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

function fallbackReviewData(organizationIds: string[]): RegistrationReviewData {
  return {
    registrationRequests: seedState.registrationRequests.filter((request) => (
      organizationIds.includes(request.organizationId)
    )),
    reviewers: [],
    actions: []
  };
}

export async function listRegistrationReviewData(input: {
  organizationIds: string[];
}): Promise<RegistrationReviewData> {
  const organizationIds = [...new Set(input.organizationIds.map((id) => id.trim()).filter(Boolean))];
  if (!organizationIds.length) return fallbackReviewData([]);

  try {
    const supabase = createSupabaseAdminClient();
    const [registrationRequests, organizationMembershipsResult, actionsResult] = await withSupabaseTimeout(Promise.all([
      listRegistrationRequests({ organizationIds }),
      supabase
        .from("organization_memberships")
        .select("user_id,organization_id,role,status")
        .in("organization_id", organizationIds)
        .eq("role", "admin")
        .eq("status", "active"),
      supabase
        .from("registration_approval_actions")
        .select("id,registration_request_id,organization_id,action,note,created_at")
        .in("organization_id", organizationIds)
        .order("created_at", { ascending: false })
        .limit(50)
    ]), 7000);

    if (organizationMembershipsResult.error || actionsResult.error) {
      return fallbackReviewData(organizationIds);
    }

    const adminUserIds = [...new Set((organizationMembershipsResult.data ?? [])
      .map((membership) => membership.user_id))];
    const profilesResult = adminUserIds.length
      ? await withSupabaseTimeout(supabase
        .from("profiles")
        .select("id,display_name,email,default_role")
        .in("id", adminUserIds)
        .order("display_name", { ascending: true }), 7000)
      : { data: [], error: null };

    if (profilesResult.error) return fallbackReviewData(organizationIds);

    const scopeByUserId = new Map<string, string[]>();

    for (const membership of organizationMembershipsResult.data ?? []) {
      const scopes = scopeByUserId.get(membership.user_id) ?? [];
      scopes.push(`admin:${membership.organization_id}`);
      scopeByUserId.set(membership.user_id, scopes);
    }

    const reviewers = (profilesResult.data ?? [])
      .map((profile) => ({
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        scopes: scopeByUserId.get(profile.id) ?? []
      }))
      .filter((profile) => profile.scopes.length > 0);

    return {
      registrationRequests,
      reviewers,
      actions: (actionsResult.data ?? []).map((action) => ({
        id: action.id,
        registrationRequestId: action.registration_request_id,
        action: action.action,
        note: action.note ?? undefined,
        createdAt: action.created_at
      }))
    };
  } catch {
    return fallbackReviewData(organizationIds);
  }
}

export async function approveRegistrationRequest(input: {
  requestId: string;
  reviewerUserId: string;
  note?: string;
}): Promise<RegistrationReviewResult> {
  if (
    !input.requestId
    || !input.reviewerUserId
    || (input.note?.trim().length ?? 0) < 10
    || (input.note?.trim().length ?? 0) > 1000
  ) {
    return { ok: false, message: "Registration request, reviewer, and verification note are required." };
  }

  try {
    const supabase = createSupabaseAdminClient() as unknown as UnsafeApprovalRpc;
    const reviewNote = input.note!.trim();
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await withSupabaseTimeout(supabase.rpc("approve_registration_request_with_invitation", {
      target_registration_request_id: input.requestId,
      reviewer_user_id: input.reviewerUserId,
      review_note: reviewNote,
      target_invite_token_hash: tokenHash,
      target_invite_expires_at: expiresAt
    }), 10000);

    if (error) {
      return {
        ok: false,
        message: "Registration approval is unavailable until the secure invitation migration is promoted. No records changed."
      };
    }
    const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const inviteId = typeof result.parent_invite_id === "string" ? result.parent_invite_id : "";

    return {
      ok: true,
      message: inviteId
        ? "Registration approved. Copy the one-time invitation now; no email, SMS, push, or chat message was sent."
        : "Registration approved. Existing verified parent access was activated; no invitation or provider message was created.",
      result,
      invitationPath: inviteId ? `/invite/accept#token=${encodeURIComponent(rawToken)}` : undefined,
      expiresAt: inviteId ? expiresAt : undefined,
      accessActivated: !inviteId
    };
  } catch {
    return {
      ok: false,
      message: "Registration approval outcome could not be confirmed. Refresh the queue before trying again."
    };
  }
}

export async function rejectRegistrationRequest(input: {
  requestId: string;
  reviewerUserId: string;
  note: string;
}): Promise<RegistrationReviewResult> {
  if (!input.requestId || !input.reviewerUserId || !input.note.trim()) {
    return { ok: false, message: "Registration request, reviewer, and rejection note are required." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(supabase.rpc("reject_registration_request", {
      target_registration_request_id: input.requestId,
      reviewer_user_id: input.reviewerUserId,
      rejection_note: input.note
    }), 10000);

    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      message: "Registration rejected with an approval-action and audit record.",
      result: data
    };
  } catch {
    return { ok: false, message: "Registration rejection could not reach Supabase." };
  }
}
