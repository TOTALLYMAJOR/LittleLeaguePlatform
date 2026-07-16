import { NextResponse } from "next/server";
import { runNotificationProviderSendWorker } from "@/lib/services/notifications/execution";

function workerSecret() {
  return process.env.NOTIFICATION_WORKER_SECRET;
}

function requestToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice("Bearer ".length);
  return request.headers.get("x-notification-worker-secret");
}

export async function POST(request: Request) {
  const secret = workerSecret();
  if (!secret) {
    return NextResponse.json({
      ok: false,
      message: "Notification worker secret is not configured."
    }, { status: 503 });
  }

  if (requestToken(request) !== secret) {
    return NextResponse.json({
      ok: false,
      message: "Notification worker authorization is required."
    }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body?.limit ?? 25), 1), 100);
  const workerId = typeof body?.workerId === "string" && body.workerId.trim()
    ? body.workerId.trim()
    : "internal-notification-send-worker";

  const result = await runNotificationProviderSendWorker({
    workerId,
    limit
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
