import "server-only";

import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

export type EventChangeReceiptOperation = "seen" | "acknowledged";

export interface EventChangeReceipt {
  eventChangeLogId: string;
  seenAt: string | null;
  acknowledgedAt: string | null;
}

export interface EventChangeReceiptReadResult {
  ok: boolean;
  message: string;
  receipts: EventChangeReceipt[];
}

export type EventChangeReceiptMutationCode =
  | "recorded"
  | "already_recorded"
  | "invalid_input"
  | "invalid_operation"
  | "forbidden"
  | "unavailable";

export interface EventChangeReceiptMutationResult {
  ok: boolean;
  code: EventChangeReceiptMutationCode;
  message: string;
  operation: EventChangeReceiptOperation;
  idempotentReplay: boolean;
  seenAt: string | null;
  acknowledgedAt: string | null;
}

type ReceiptRow = {
  event_change_log_id: string;
  seen_at: string | null;
  acknowledged_at: string | null;
};

type UnsafeSupabase = {
  // Receipt reads and RPC results are narrowed immediately into the contracts above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(functionName: string, args: Record<string, unknown>): any;
};

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export function eventChangeRequiresAcknowledgment(changeType: string) {
  return changeType === "time_changed"
    || changeType === "location_changed"
    || changeType === "cancelled";
}

export async function listEventChangeReceipts({
  parentUserId,
  eventChangeLogIds
}: {
  parentUserId: string;
  eventChangeLogIds: string[];
}): Promise<EventChangeReceiptReadResult> {
  const scopedIds = [...new Set(eventChangeLogIds.filter(Boolean))].slice(0, 50);
  if (!parentUserId || !scopedIds.length) {
    return { ok: true, message: "No event change receipts are required.", receipts: [] };
  }

  try {
    const db = dbClient();
    const { data, error } = await withSupabaseTimeout(db
      .from("event_change_receipts")
      .select("event_change_log_id,seen_at,acknowledged_at")
      .eq("parent_user_id", parentUserId)
      .in("event_change_log_id", scopedIds)
      .limit(scopedIds.length), 7000) as {
        data: ReceiptRow[] | null;
        error: { message?: string } | null;
      };

    if (error) {
      return {
        ok: false,
        message: "Event change receipt state could not be confirmed.",
        receipts: []
      };
    }

    const allowedIds = new Set(scopedIds);
    return {
      ok: true,
      message: data?.length
        ? "Event change receipt state loaded."
        : "No event change receipts are recorded.",
      receipts: (data ?? []).flatMap((row) => (
        allowedIds.has(row.event_change_log_id)
          ? [{
            eventChangeLogId: row.event_change_log_id,
            seenAt: row.seen_at,
            acknowledgedAt: row.acknowledged_at
          }]
          : []
      ))
    };
  } catch {
    return {
      ok: false,
      message: "Event change receipt state could not reach family records.",
      receipts: []
    };
  }
}

export async function acknowledgeEventChange({
  parentUserId,
  eventChangeLogId,
  operation = "acknowledged"
}: {
  parentUserId: string;
  eventChangeLogId: string;
  operation?: EventChangeReceiptOperation;
}): Promise<EventChangeReceiptMutationResult> {
  if (!parentUserId || !eventChangeLogId || !["seen", "acknowledged"].includes(operation)) {
    return unavailableMutation(
      operation,
      "invalid_input",
      "Event change receipt requires a change, guardian, and supported operation."
    );
  }

  try {
    const db = dbClient();
    const { data, error } = await withSupabaseTimeout(db.rpc("acknowledge_event_change", {
      p_event_change_log_id: eventChangeLogId,
      p_parent_user_id: parentUserId,
      p_operation: operation
    }), 7000) as {
      data: Record<string, unknown> | null;
      error: { message?: string } | null;
    };

    if (error || !data) {
      return unavailableMutation(
        operation,
        "unavailable",
        "Event change receipt could not be recorded."
      );
    }

    const code = mutationCode(data.code);
    return {
      ok: data.ok === true,
      code,
      message: typeof data.message === "string" ? data.message : "Event change receipt could not be recorded.",
      operation,
      idempotentReplay: data.idempotentReplay === true,
      seenAt: nullableString(data.seenAt),
      acknowledgedAt: nullableString(data.acknowledgedAt)
    };
  } catch {
    return unavailableMutation(
      operation,
      "unavailable",
      "Event change receipt could not reach family records."
    );
  }
}

function mutationCode(value: unknown): EventChangeReceiptMutationCode {
  if (
    value === "recorded"
    || value === "already_recorded"
    || value === "invalid_input"
    || value === "invalid_operation"
    || value === "forbidden"
  ) return value;
  return "unavailable";
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function unavailableMutation(
  operation: EventChangeReceiptOperation,
  code: EventChangeReceiptMutationCode,
  message: string
): EventChangeReceiptMutationResult {
  return {
    ok: false,
    code,
    message,
    operation,
    idempotentReplay: false,
    seenAt: null,
    acknowledgedAt: null
  };
}
