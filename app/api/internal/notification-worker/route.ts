import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { executeApprovedNotificationBatch } from "@/lib/services/notifications/executor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withSupabaseTimeout } from "@/lib/supabase/timeout";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UnsafeSupabase = {
  // Provider gate columns are staged until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

function tokenMatches(candidate: string, expected: string) {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function workerAuthorized(request: Request) {
  const expectedToken = process.env.NOTIFICATION_WORKER_TOKEN ?? "";
  const candidateToken = request.headers.get("x-leaguepilot-worker-token") ?? "";
  return Boolean(
    expectedToken &&
    candidateToken &&
    tokenMatches(candidateToken, expectedToken)
  );
}

export async function GET(request: Request) {
  if (!workerAuthorized(request)) {
    return NextResponse.json(
      { ok: false, message: "Notification worker authorization failed." },
      { status: 401 }
    );
  }
  const organizationId = request.headers.get("x-leaguepilot-organization-id") ?? "";
  if (!UUID_PATTERN.test(organizationId)) {
    return NextResponse.json(
      { ok: false, message: "Notification worker authority requires an organization id." },
      { status: 400 }
    );
  }
  let projectRef = "";
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    projectRef = url.hostname.split(".")[0] ?? "";
  } catch {
    return NextResponse.json(
      { ok: false, message: "Notification worker Supabase authority is unavailable." },
      { status: 503 }
    );
  }
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db
      .from("organizations")
      .select("id,provider_sends_enabled")
      .eq("id", organizationId)
      .maybeSingle(), 7000) as {
        data: { id: string; provider_sends_enabled: boolean } | null;
        error: { message?: string } | null;
      };
    if (error || !data) {
      return NextResponse.json(
        { ok: false, message: "Notification worker organization authority is unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json({
      ok: true,
      projectRef,
      organization: {
        id: data.id,
        providerSendsEnabled: data.provider_sends_enabled === true
      }
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Notification worker Supabase authority is unavailable." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  if (!workerAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Notification worker authorization failed." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as {
    workerId?: unknown;
    limit?: unknown;
    expectedAttemptId?: unknown;
  };
  const expectedAttemptId = String(body.expectedAttemptId ?? "");
  if (!UUID_PATTERN.test(expectedAttemptId)) {
    return NextResponse.json(
      { ok: false, message: "Notification worker requires an expected delivery attempt id." },
      { status: 400 }
    );
  }
  const result = await executeApprovedNotificationBatch({
    workerId: String(body.workerId ?? "leaguepilot-notification-worker"),
    limit: Number.isInteger(Number(body.limit)) ? Number(body.limit) : 10,
    expectedAttemptId
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
