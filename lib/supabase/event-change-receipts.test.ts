import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import {
  acknowledgeEventChange,
  eventChangeRequiresAcknowledgment,
  listEventChangeReceipts
} from "./event-change-receipts";

vi.mock("server-only", () => ({}));
vi.mock("./admin", () => ({ createSupabaseAdminClient: vi.fn() }));

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);

function query(result: unknown, calls: Array<{ method: string; args: unknown[] }>) {
  const builder = {
    select(...args: unknown[]) { calls.push({ method: "select", args }); return builder; },
    eq(...args: unknown[]) { calls.push({ method: "eq", args }); return builder; },
    in(...args: unknown[]) { calls.push({ method: "in", args }); return builder; },
    limit(...args: unknown[]) { calls.push({ method: "limit", args }); return builder; },
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    }
  };
  return builder;
}

describe("event change receipts", () => {
  beforeEach(() => createSupabaseAdminClientMock.mockReset());

  it("reads one bounded, guardian-scoped receipt query", async () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => query({
        data: [{
          event_change_log_id: "change-1",
          seen_at: "2026-08-19T10:00:00.000Z",
          acknowledged_at: null
        }],
        error: null
      }, calls))
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await listEventChangeReceipts({
      parentUserId: "parent-1",
      eventChangeLogIds: ["change-1", "change-1", "change-2"]
    });

    expect(result).toMatchObject({
      ok: true,
      receipts: [{
        eventChangeLogId: "change-1",
        seenAt: "2026-08-19T10:00:00.000Z",
        acknowledgedAt: null
      }]
    });
    expect(calls).toEqual([
      { method: "select", args: ["event_change_log_id,seen_at,acknowledged_at"] },
      { method: "eq", args: ["parent_user_id", "parent-1"] },
      { method: "in", args: ["event_change_log_id", ["change-1", "change-2"]] },
      { method: "limit", args: [2] }
    ]);
  });

  it("degrades a failed receipt query without returning partial receipt evidence", async () => {
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => query({ data: null, error: { message: "unavailable" } }, []))
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    await expect(listEventChangeReceipts({
      parentUserId: "parent-1",
      eventChangeLogIds: ["change-1"]
    })).resolves.toMatchObject({ ok: false, receipts: [] });
  });

  it("returns the same server receipt truth to two independent clients", async () => {
    const receiptResult = {
      data: [{
        event_change_log_id: "change-1",
        seen_at: "2026-08-19T10:00:00.000Z",
        acknowledged_at: "2026-08-19T10:01:00.000Z"
      }],
      error: null
    };
    const firstClient = { from: vi.fn(() => query(receiptResult, [])) };
    const secondClient = { from: vi.fn(() => query(receiptResult, [])) };
    createSupabaseAdminClientMock
      .mockReturnValueOnce(firstClient as unknown as ReturnType<typeof createSupabaseAdminClient>)
      .mockReturnValueOnce(secondClient as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const input = { parentUserId: "parent-1", eventChangeLogIds: ["change-1"] };
    const [phoneResult, laptopResult] = await Promise.all([
      listEventChangeReceipts(input),
      listEventChangeReceipts(input)
    ]);

    expect(phoneResult).toEqual(laptopResult);
    expect(phoneResult.receipts[0]?.acknowledgedAt).toBe("2026-08-19T10:01:00.000Z");
  });

  it("delegates seen and acknowledged operations to the SQL-authorized RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        code: "already_recorded",
        message: "Event change was already acknowledged.",
        idempotentReplay: true,
        seenAt: "2026-08-19T10:00:00.000Z",
        acknowledgedAt: "2026-08-19T10:01:00.000Z"
      },
      error: null
    });
    createSupabaseAdminClientMock.mockReturnValue({ rpc } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await acknowledgeEventChange({
      parentUserId: "parent-1",
      eventChangeLogId: "change-1"
    });

    expect(rpc).toHaveBeenCalledWith("acknowledge_event_change", {
      p_event_change_log_id: "change-1",
      p_parent_user_id: "parent-1",
      p_operation: "acknowledged"
    });
    expect(result).toMatchObject({
      ok: true,
      code: "already_recorded",
      idempotentReplay: true,
      acknowledgedAt: "2026-08-19T10:01:00.000Z"
    });
  });

  it("preserves SQL authorization denial as a typed result", async () => {
    createSupabaseAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: { ok: false, code: "forbidden", message: "Event change is not available to this guardian." },
        error: null
      })
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    await expect(acknowledgeEventChange({
      parentUserId: "parent-1",
      eventChangeLogId: "change-other"
    })).resolves.toMatchObject({ ok: false, code: "forbidden" });
  });

  it("derives acknowledgment only for the approved high-impact change types", () => {
    expect(eventChangeRequiresAcknowledgment("time_changed")).toBe(true);
    expect(eventChangeRequiresAcknowledgment("location_changed")).toBe(true);
    expect(eventChangeRequiresAcknowledgment("cancelled")).toBe(true);
    expect(eventChangeRequiresAcknowledgment("created")).toBe(false);
    expect(eventChangeRequiresAcknowledgment("completed")).toBe(false);
    expect(eventChangeRequiresAcknowledgment("restored")).toBe(false);
  });
});
