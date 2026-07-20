import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { executeApprovedNotificationBatch } from "@/lib/services/notifications/executor";

function tokenMatches(candidate: string, expected: string) {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const expectedToken = process.env.NOTIFICATION_WORKER_TOKEN ?? "";
  const candidateToken = request.headers.get("x-leaguepilot-worker-token") ?? "";
  if (!expectedToken || !candidateToken || !tokenMatches(candidateToken, expectedToken)) {
    return NextResponse.json({ ok: false, message: "Notification worker authorization failed." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as { workerId?: unknown; limit?: unknown };
  const result = await executeApprovedNotificationBatch({
    workerId: String(body.workerId ?? "leaguepilot-notification-worker"),
    limit: Number.isInteger(Number(body.limit)) ? Number(body.limit) : 10
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
