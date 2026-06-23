import type { RegistrationRequest } from "@/lib/domain";
import { seedState } from "@/lib/domain";
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
}

function fallbackReviewData(): RegistrationReviewData {
  return {
    registrationRequests: seedState.registrationRequests,
    reviewers: [],
    actions: []
  };
}

export async function listRegistrationReviewData(): Promise<RegistrationReviewData> {
  try {
    const supabase = createSupabaseAdminClient();
    const [registrationRequests, profilesResult, teamMembershipsResult, organizationMembershipsResult, actionsResult] = await withSupabaseTimeout(Promise.all([
      listRegistrationRequests(),
      supabase
        .from("profiles")
        .select("id,display_name,email,default_role")
        .order("display_name", { ascending: true }),
      supabase
        .from("team_memberships")
        .select("user_id,team_id,role,status")
        .eq("status", "active"),
      supabase
        .from("organization_memberships")
        .select("user_id,organization_id,role,status")
        .eq("status", "active"),
      supabase
        .from("registration_approval_actions")
        .select("id,registration_request_id,action,note,created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    ]), 7000);

    const scopeByUserId = new Map<string, string[]>();

    for (const membership of teamMembershipsResult.data ?? []) {
      if (membership.role !== "coach") continue;
      const scopes = scopeByUserId.get(membership.user_id) ?? [];
      scopes.push(`coach:${membership.team_id}`);
      scopeByUserId.set(membership.user_id, scopes);
    }

    for (const membership of organizationMembershipsResult.data ?? []) {
      if (membership.role !== "admin") continue;
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
    return fallbackReviewData();
  }
}

export async function approveRegistrationRequest(input: {
  requestId: string;
  reviewerUserId: string;
  note?: string;
}): Promise<RegistrationReviewResult> {
  if (!input.requestId || !input.reviewerUserId) {
    return { ok: false, message: "Registration request and reviewer are required." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(supabase.rpc("approve_registration_request", {
      target_registration_request_id: input.requestId,
      reviewer_user_id: input.reviewerUserId,
      review_note: input.note ?? null
    }), 10000);

    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      message: "Registration approved. Player, guardian, invite or membership, and audit records were created.",
      result: data
    };
  } catch {
    return { ok: false, message: "Registration approval could not reach Supabase." };
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
