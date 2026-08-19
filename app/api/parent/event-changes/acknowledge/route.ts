import { NextResponse } from "next/server";
import {
  acknowledgeEventChange,
  type EventChangeReceiptOperation
} from "@/lib/supabase/event-change-receipts";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const operations = new Set<EventChangeReceiptOperation>(["seen", "acknowledged"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, code: "invalid_input", message: "Event change receipt body is required." }, { status: 400 });
  }

  const eventChangeLogId = typeof (body as { eventChangeLogId?: unknown }).eventChangeLogId === "string"
    ? (body as { eventChangeLogId: string }).eventChangeLogId.trim()
    : "";
  const requestedOperation = (body as { operation?: unknown }).operation;
  const operation = requestedOperation === undefined ? "acknowledged" : requestedOperation;
  if (!UUID_PATTERN.test(eventChangeLogId) || typeof operation !== "string" || !operations.has(operation as EventChangeReceiptOperation)) {
    return NextResponse.json({
      ok: false,
      code: "invalid_input",
      message: "Choose a valid event change and supported receipt action."
    }, { status: 400 });
  }

  const result = await acknowledgeEventChange({
    eventChangeLogId,
    parentUserId: auth.user.id,
    operation: operation as EventChangeReceiptOperation
  });

  const status = result.ok
    ? 200
    : result.code === "forbidden"
      ? 403
      : result.code === "unavailable"
        ? 503
        : 400;
  return NextResponse.json(result, { status });
}
