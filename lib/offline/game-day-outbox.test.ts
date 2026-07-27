import { describe, expect, it, vi } from "vitest";
import {
  GameDayOutboxEngine,
  MemoryGameDayOutboxStore,
  classifyOfflineFailure,
  endpointForOfflineAction,
  isOfflineActionAllowed,
  outboxDisplayState,
  type OfflineGameDayAction,
  type OfflineOwnerContext,
  type QueueOfflineGameDayActionInput
} from "./game-day-outbox";

const scope: OfflineOwnerContext = {
  actorId: "actor-1",
  organizationId: "org-1",
  seasonId: "season-1",
  teamId: "team-1",
  contextKey: "parent:org-1:season-1:team-1"
};

function action(id: string, overrides: Partial<QueueOfflineGameDayActionInput> = {}): QueueOfflineGameDayActionInput {
  return {
    ...scope,
    actionId: id,
    actionType: "rsvp",
    payload: { nested: { answer: "going" } },
    queuedAt: `2026-07-19T10:00:0${id.slice(-1)}.000Z`,
    retryCount: 0,
    baseRecordVersion: 0,
    baseScheduleVersion: 1,
    ...overrides
  };
}

describe("game-day offline outbox policy", () => {
  it("allows only three types and derives their only endpoints", () => {
    expect(isOfflineActionAllowed("rsvp")).toBe(true);
    expect(isOfflineActionAllowed("attendance")).toBe(true);
    expect(isOfflineActionAllowed("coach_note")).toBe(true);
    expect(isOfflineActionAllowed("publish")).toBe(false);
    expect(endpointForOfflineAction("rsvp")).toBe("/api/rsvps");
    expect(endpointForOfflineAction("attendance")).toBe("/api/coach/attendance");
    expect(endpointForOfflineAction("coach_note")).toBe("/api/coach/event-notes");
  });

  it("rejects arbitrary endpoint injection before persistence", async () => {
    const store = new MemoryGameDayOutboxStore();
    await expect(store.enqueue({
      ...action("action-1"),
      endpoint: "https://attacker.example/send"
    } as unknown as QueueOfflineGameDayActionInput)).rejects.toThrow(/cannot be supplied/);
  });

  it("rejects persisted routing metadata before fetch", async () => {
    const store = new MemoryGameDayOutboxStore();
    const claimNext = store.claimNext.bind(store);
    store.claimNext = async (...args) => {
      const claim = await claimNext(...args);
      if (claim) {
        (claim.action as OfflineGameDayAction & { endpoint?: string }).endpoint = "/api/rsvps";
      }
      return claim;
    };
    const engine = new GameDayOutboxEngine(store);
    await engine.queue(action("action-1"));
    const send = vi.fn();

    await expect(engine.sync(scope, { actorId: scope.actorId }, send))
      .rejects.toThrow(/routing must be derived/);
    expect(send).not.toHaveBeenCalled();
    expect((await store.list(scope))[0]).toMatchObject({
      actionId: "action-1",
      state: "review_required"
    });
  });

  it("structurally clones nested payloads on write and read", async () => {
    const store = new MemoryGameDayOutboxStore();
    const input = action("action-1");
    await store.enqueue(input, new Date("2026-07-19T10:00:00.000Z"));
    (input.payload.nested as { answer: string }).answer = "changed";
    const first = await store.list(scope, new Date("2026-07-19T10:01:00.000Z"));
    expect(first[0]?.payload).toEqual({ nested: { answer: "going" } });
    (first[0]!.payload.nested as { answer: string }).answer = "changed again";
    expect((await store.list(scope, new Date("2026-07-19T10:01:00.000Z")))[0]?.payload).toEqual({ nested: { answer: "going" } });
  });

  it("uses an atomic shared-store lease to suppress cross-tab duplicate sends", async () => {
    const store = new MemoryGameDayOutboxStore();
    const first = new GameDayOutboxEngine(store, "tab-1");
    const second = new GameDayOutboxEngine(store, "tab-2");
    await first.queue(action("action-1"), new Date("2026-07-19T10:00:00.000Z"));
    const send = vi.fn(async () => ({ ok: true, status: 200 }));

    await Promise.all([
      first.sync(scope, { actorId: "actor-1" }, send, new Date("2026-07-19T10:01:00.000Z")),
      second.sync(scope, { actorId: "actor-1" }, send, new Date("2026-07-19T10:01:00.000Z"))
    ]);

    expect(send).toHaveBeenCalledTimes(1);
    expect(await store.summary(scope, new Date("2026-07-19T10:02:00.000Z"))).toMatchObject({ queued: 0, synced: 1 });
  });

  it("stops later actions after a transient failure and retains truthful retry state", async () => {
    const store = new MemoryGameDayOutboxStore();
    const engine = new GameDayOutboxEngine(store, "tab-1");
    await engine.queue(action("action-1"), new Date("2026-07-19T10:00:00.000Z"));
    await engine.queue(action("action-2"), new Date("2026-07-19T10:00:01.000Z"));
    const send = vi.fn(async () => ({ ok: false, status: 503 }));

    const results = await engine.sync(scope, { actorId: "actor-1" }, send, new Date("2026-07-19T10:01:00.000Z"));

    expect(send).toHaveBeenCalledTimes(1);
    expect(results[0]).toMatchObject({ actionId: "action-1", state: "retrying", retryCount: 1 });
    expect((await store.list(scope, new Date("2026-07-19T10:02:00.000Z")))[1]).toMatchObject({ actionId: "action-2", state: "queued", retryCount: 0 });
  });

  it("does not bypass a review-required head action on a later replay", async () => {
    const store = new MemoryGameDayOutboxStore();
    const engine = new GameDayOutboxEngine(store, "tab-1");
    await engine.queue(action("action-1"), new Date("2026-07-19T10:00:00.000Z"));
    await engine.queue(action("action-2"), new Date("2026-07-19T10:00:01.000Z"));
    const send = vi.fn(async () => ({ ok: false, status: 400 }));
    await engine.sync(scope, { actorId: "actor-1" }, send, new Date("2026-07-19T10:01:00.000Z"));
    await engine.sync(scope, { actorId: "actor-1" }, send, new Date("2026-07-19T10:02:00.000Z"));
    expect(send).toHaveBeenCalledTimes(1);
    expect(await store.list(scope, new Date("2026-07-19T10:02:00.000Z"))).toEqual([
      expect.objectContaining({ actionId: "action-1", state: "review_required" }),
      expect.objectContaining({ actionId: "action-2", state: "queued" })
    ]);
  });

  it.each([
    [0, "network", "retrying"],
    [429, "rate_limited", "retrying"],
    [500, "server", "retrying"],
    [400, "validation", "review_required"],
    [404, "validation", "review_required"],
    [401, "authentication", "sign_in_required"],
    [403, "authorization", "review_required"],
    [409, "conflict", "conflict"]
  ] as const)("classifies status %s as %s / %s", (status, kind, state) => {
    expect(classifyOfflineFailure({ ok: false, status })).toMatchObject({ kind, state });
  });

  it("fails actor mismatch and expired sessions before send", async () => {
    const store = new MemoryGameDayOutboxStore();
    const engine = new GameDayOutboxEngine(store);
    await engine.queue(action("action-1"), new Date("2026-07-19T10:00:00.000Z"));
    const send = vi.fn();
    await expect(engine.sync(scope, { actorId: "actor-2" }, send)).rejects.toThrow(/matching session/);
    await expect(engine.sync(scope, { actorId: "actor-1", expiresAt: "2020-01-01T00:00:00.000Z" }, send)).rejects.toThrow(/matching session/);
    expect(send).not.toHaveBeenCalled();
  });

  it("generation-fences in-flight completion after an atomic owner clear", async () => {
    const store = new MemoryGameDayOutboxStore();
    const engine = new GameDayOutboxEngine(store, "tab-1");
    await engine.queue(action("action-1"), new Date("2026-07-19T10:00:00.000Z"));
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const replay = engine.sync(scope, { actorId: "actor-1" }, async () => {
      await pending;
      return { ok: true, status: 200 };
    }, new Date("2026-07-19T10:01:00.000Z"));

    await Promise.resolve();
    await store.clearOwner("actor-1");
    finish();
    await replay;

    expect(await store.summary(scope)).toEqual({
      queued: 0, retrying: 0, conflict: 0, signInRequired: 0, reviewRequired: 0, synced: 0
    });
  });

  it("rejects a late enqueue that captured its owner generation before sign-out clear", async () => {
    const store = new MemoryGameDayOutboxStore();
    const engine = new GameDayOutboxEngine(store, "tab-1");
    const capturedOwnerGeneration = await engine.ownerGeneration(scope.actorId);

    await store.clearOwner(scope.actorId);

    await expect(engine.queue(
      action("action-1"),
      new Date("2026-07-19T10:01:00.000Z"),
      capturedOwnerGeneration
    )).rejects.toThrow(/owner changed/);
    expect(await engine.ownerGeneration(scope.actorId)).toBe(capturedOwnerGeneration + 1);
    expect(await store.list(scope)).toHaveLength(0);
  });

  it("aborts a stalled send before its lease expires and suppresses replay during backoff", async () => {
    vi.useFakeTimers();
    try {
      const store = new MemoryGameDayOutboxStore();
      const engine = new GameDayOutboxEngine(store, "tab-1", 1_001);
      const replayStartedAt = new Date("2026-07-19T10:01:00.000Z");
      await engine.queue(action("action-1"), new Date("2026-07-19T10:00:00.000Z"));
      const observedSignals: AbortSignal[] = [];
      const send = vi.fn(async (
        _queuedAction: unknown,
        _endpoint: string,
        signal: AbortSignal
      ) => new Promise<{ ok: boolean; status: number }>((_resolve, reject) => {
        observedSignals.push(signal);
        signal.addEventListener("abort", () => reject(new Error("send aborted")), { once: true });
      }));

      const replay = engine.sync(
        scope,
        { actorId: scope.actorId },
        send,
        replayStartedAt
      );
      await vi.advanceTimersByTimeAsync(1);
      const results = await replay;

      expect(send).toHaveBeenCalledTimes(1);
      expect(observedSignals).toHaveLength(1);
      expect(observedSignals[0]?.aborted).toBe(true);
      expect(results[0]).toMatchObject({
        actionId: "action-1",
        state: "retrying",
        retryCount: 1,
        retryAfter: "2026-07-19T10:01:01.000Z"
      });

      await engine.sync(
        scope,
        { actorId: scope.actorId },
        send,
        new Date("2026-07-19T10:01:00.500Z")
      );
      expect(send).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("expires private actions before replay and releases expired receipt keys", async () => {
    const store = new MemoryGameDayOutboxStore();
    const engine = new GameDayOutboxEngine(store, "tab-1");
    const queuedAt = new Date("2026-07-19T10:00:00.000Z");
    const actionExpiry = new Date("2026-07-26T10:00:00.000Z");
    const send = vi.fn(async () => ({ ok: true, status: 200 }));

    await engine.queue(action("action-1"), queuedAt);
    expect(await engine.sync(
      scope,
      { actorId: scope.actorId },
      send,
      actionExpiry
    )).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    expect(await store.list(scope, actionExpiry)).toHaveLength(0);

    const receiptAction = action("action-2", {
      queuedAt: "2026-07-26T10:01:00.000Z"
    });
    await engine.queue(receiptAction, new Date("2026-07-26T10:01:00.000Z"));
    await engine.sync(
      scope,
      { actorId: scope.actorId },
      send,
      new Date("2026-07-26T10:02:00.000Z")
    );
    const receiptExpiry = new Date("2026-08-25T10:02:00.000Z");
    expect(await store.summary(scope, receiptExpiry)).toMatchObject({ synced: 0 });
    await expect(engine.queue(
      receiptAction,
      receiptExpiry
    )).resolves.toMatchObject({ actionId: "action-2", state: "queued" });
  });

  it("clears one owner context without deleting another actor or context", async () => {
    const store = new MemoryGameDayOutboxStore();
    const otherActor = { ...scope, actorId: "actor-2" };
    const otherContext = { ...scope, teamId: "team-2", contextKey: "parent:org-1:season-1:team-2" };
    await store.enqueue(action("action-1"));
    await store.enqueue({ ...action("action-2"), ...otherActor });
    await store.enqueue({ ...action("action-3"), ...otherContext });
    await store.clearContext(scope);
    expect(await store.list(scope)).toHaveLength(0);
    expect(await store.list(otherActor)).toHaveLength(1);
    expect(await store.list(otherContext)).toHaveLength(1);
  });

  it("keeps display labels distinct and payload-free receipts truthful", async () => {
    expect(outboxDisplayState({ state: "queued" })).toBe("Waiting to sync");
    expect(outboxDisplayState({ state: "retrying" })).toBe("Retrying");
    expect(outboxDisplayState({ state: "conflict" })).toBe("Sync conflict");
    expect(outboxDisplayState({ state: "sign_in_required" })).toBe("Sign-in required");
    expect(outboxDisplayState({ state: "review_required" })).toBe("Review required");

    const store = new MemoryGameDayOutboxStore();
    const engine = new GameDayOutboxEngine(store);
    await engine.queue(action("action-1"));
    const [receipt] = await engine.sync(scope, { actorId: "actor-1" }, async () => ({ ok: true, status: 200 }));
    expect(receipt).toMatchObject({ actionId: "action-1", syncedAt: expect.any(String) });
    expect(receipt).not.toHaveProperty("payload");
  });
});
