import type { SyncEnvelope } from "@/lib/operational-truth";

export type OfflineGameDayActionType = SyncEnvelope["actionType"];
export type OfflineActionState =
  | "queued"
  | "retrying"
  | "conflict"
  | "sign_in_required"
  | "review_required";

export interface OfflineOwnerContext {
  actorId: string;
  organizationId: string;
  seasonId: string;
  contextKey: string;
  teamId?: string;
  familyId?: string;
}

export interface OfflineGameDayAction extends Omit<SyncEnvelope, "succeededAt" | "conflictDetail">, OfflineOwnerContext {
  payload: Record<string, unknown>;
  state: OfflineActionState;
  expiresAt: string;
  lastError?: string;
  conflictDetail?: string;
  retryAfter?: string;
  leaseOwner?: string;
  leaseToken?: string;
  leaseExpiresAt?: string;
  generation: number;
}

export type QueueOfflineGameDayActionInput = Omit<
  OfflineGameDayAction,
  "state" | "expiresAt" | "generation" | "leaseOwner" | "leaseToken" | "leaseExpiresAt"
> & {
  /** Rejected if supplied. Endpoints are derived from actionType only. */
  endpoint?: never;
};

export interface OfflineSyncReceipt extends OfflineOwnerContext {
  actionId: string;
  actionType: OfflineGameDayActionType;
  syncedAt: string;
  expiresAt: string;
  generation: number;
}

export interface OfflineStatusSummary {
  queued: number;
  retrying: number;
  conflict: number;
  signInRequired: number;
  reviewRequired: number;
  synced: number;
}

export type OutboxSendResult = {
  ok: boolean;
  status: number;
  body?: Record<string, unknown> | null;
  retryAfter?: string;
};

export interface OfflineSession {
  actorId: string;
  expiresAt?: string;
  validate?: () => boolean | Promise<boolean>;
}

export interface OfflineClaim {
  action: OfflineGameDayAction;
  leaseToken: string;
  generation: number;
}

export type OfflineFailureKind =
  | "network"
  | "rate_limited"
  | "server"
  | "validation"
  | "authentication"
  | "authorization"
  | "conflict"
  | "unexpected";

export interface OfflineActionFailure {
  kind: OfflineFailureKind;
  state: Exclude<OfflineActionState, "queued">;
  retryable: boolean;
  message: string;
  retryAfter?: string;
}

export interface GameDayOutboxStore {
  enqueue(action: QueueOfflineGameDayActionInput, now?: Date): Promise<OfflineGameDayAction>;
  list(scope: OfflineOwnerContext, now?: Date): Promise<OfflineGameDayAction[]>;
  claimNext(scope: OfflineOwnerContext, leaseOwner: string, leaseMs: number, now?: Date): Promise<OfflineClaim | null>;
  settleSuccess(claim: OfflineClaim, now?: Date): Promise<OfflineSyncReceipt | null>;
  settleFailure(claim: OfflineClaim, failure: OfflineActionFailure, now?: Date): Promise<OfflineGameDayAction | null>;
  clearOwner(actorId: string): Promise<void>;
  clearContext(scope: OfflineOwnerContext): Promise<void>;
  summary(scope: Pick<OfflineOwnerContext, "actorId"> & Partial<OfflineOwnerContext>, now?: Date): Promise<OfflineStatusSummary>;
}

const DATABASE_NAME = "leaguepilot-private-game-day";
const STORE_NAME = "private-outbox-v2";
const DATABASE_VERSION = 2;
const ACTION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RECEIPT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_LEASE_MS = 30_000;
const MAX_ACTIONS_PER_CONTEXT = 100;
const MAX_RETRIES = 8;

const ENDPOINTS: Record<OfflineGameDayActionType, string> = {
  rsvp: "/api/rsvps",
  attendance: "/api/coach/attendance",
  coach_note: "/api/coach/event-notes"
};

type GenerationRecord = {
  kind: "generation";
  key: string;
  actorId: string;
  contextKey: string;
  generation: number;
};

type ActionRecord = OfflineGameDayAction & { kind: "action"; key: string };
type ReceiptRecord = OfflineSyncReceipt & { kind: "receipt"; key: string };
type StoredRecord = GenerationRecord | ActionRecord | ReceiptRecord;

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function actionKey(actorId: string, contextKey: string, actionId: string) {
  return `action:${actorId}:${contextKey}:${actionId}`;
}

function receiptKey(actorId: string, contextKey: string, actionId: string) {
  return `receipt:${actorId}:${contextKey}:${actionId}`;
}

function generationKey(actorId: string, contextKey: string) {
  return `generation:${actorId}:${contextKey}`;
}

function scopeMatches(record: OfflineOwnerContext, scope: Pick<OfflineOwnerContext, "actorId"> & Partial<OfflineOwnerContext>) {
  return record.actorId === scope.actorId
    && (!scope.contextKey || record.contextKey === scope.contextKey)
    && (!scope.organizationId || record.organizationId === scope.organizationId)
    && (!scope.seasonId || record.seasonId === scope.seasonId)
    && (!scope.teamId || record.teamId === scope.teamId)
    && (!scope.familyId || record.familyId === scope.familyId);
}

function assertScope(scope: OfflineOwnerContext) {
  if (!scope.actorId || !scope.organizationId || !scope.seasonId || !scope.contextKey) {
    throw new Error("Offline actions require an authenticated actor, organization, season, and context.");
  }
  if (!scope.teamId && !scope.familyId) {
    throw new Error("Offline actions require a team or family boundary.");
  }
  for (const value of [scope.organizationId, scope.seasonId, scope.teamId, scope.familyId].filter(Boolean) as string[]) {
    if (!scope.contextKey.includes(value)) {
      throw new Error("Offline context does not match its organization, season, team, or family boundary.");
    }
  }
}

function assertAction(input: QueueOfflineGameDayActionInput | (QueueOfflineGameDayActionInput & { endpoint?: unknown })) {
  assertScope(input);
  if (!isOfflineActionAllowed(input.actionType)) throw new Error("This action must be completed online.");
  if ("endpoint" in input) throw new Error("Offline endpoints are derived from action type and cannot be supplied.");
  if (!input.actionId || !input.queuedAt || !input.payload || Array.isArray(input.payload)) {
    throw new Error("Offline action is incomplete.");
  }
}

function expiresAt(from: Date, duration: number) {
  return new Date(from.getTime() + duration).toISOString();
}

function isExpired(value: { expiresAt: string }, now: Date) {
  return Date.parse(value.expiresAt) <= now.getTime();
}

export function endpointForOfflineAction(actionType: OfflineGameDayActionType) {
  return ENDPOINTS[actionType];
}

export function isOfflineActionAllowed(actionType: string): actionType is OfflineGameDayActionType {
  return Object.prototype.hasOwnProperty.call(ENDPOINTS, actionType);
}

export function outboxDisplayState(action: Pick<OfflineGameDayAction, "state"> | Pick<SyncEnvelope, "queuedAt" | "attemptedAt" | "retryCount" | "succeededAt" | "conflictDetail">) {
  if ("state" in action) {
    return {
      queued: "Waiting to sync",
      retrying: "Retrying",
      conflict: "Sync conflict",
      sign_in_required: "Sign-in required",
      review_required: "Review required"
    }[action.state];
  }
  if (action.conflictDetail) return "Sync conflict";
  if (action.succeededAt) return "Synced";
  if (action.attemptedAt && action.retryCount > 0) return "Retrying";
  return "Waiting to sync";
}

export function classifyOfflineFailure(result: OutboxSendResult): OfflineActionFailure {
  const message = String(result.body?.message ?? "");
  if (result.status === 0) return { kind: "network", state: "retrying", retryable: true, message: message || "Network unavailable. Retry when online." };
  if (result.status === 429) return { kind: "rate_limited", state: "retrying", retryable: true, message: message || "Server rate limit reached.", retryAfter: result.retryAfter };
  if (result.status >= 500) return { kind: "server", state: "retrying", retryable: true, message: message || "Server temporarily unavailable." };
  if (result.status === 401) return { kind: "authentication", state: "sign_in_required", retryable: false, message: message || "Sign in again before syncing." };
  if (result.status === 403) return { kind: "authorization", state: "review_required", retryable: false, message: message || "Current access does not allow this action." };
  if (result.status === 409) return { kind: "conflict", state: "conflict", retryable: false, message: message || "Server version changed. Review before retrying." };
  if (result.status === 400 || result.status === 404) return { kind: "validation", state: "review_required", retryable: false, message: message || "The saved action is no longer valid." };
  return { kind: "unexpected", state: "review_required", retryable: false, message: message || `Sync failed with status ${result.status}.` };
}

function summaryFrom(records: StoredRecord[], scope: Pick<OfflineOwnerContext, "actorId"> & Partial<OfflineOwnerContext>, now: Date): OfflineStatusSummary {
  const result: OfflineStatusSummary = { queued: 0, retrying: 0, conflict: 0, signInRequired: 0, reviewRequired: 0, synced: 0 };
  for (const record of records) {
    if (record.kind === "generation" || !scopeMatches(record, scope) || isExpired(record, now)) continue;
    if (record.kind === "receipt") result.synced += 1;
    else if (record.state === "queued") result.queued += 1;
    else if (record.state === "retrying") result.retrying += 1;
    else if (record.state === "conflict") result.conflict += 1;
    else if (record.state === "sign_in_required") result.signInRequired += 1;
    else result.reviewRequired += 1;
  }
  return result;
}

export class MemoryGameDayOutboxStore implements GameDayOutboxStore {
  private records = new Map<string, StoredRecord>();

  async enqueue(input: QueueOfflineGameDayActionInput, now = new Date()) {
    assertAction(input);
    this.prune(now);
    const key = actionKey(input.actorId, input.contextKey, input.actionId);
    const duplicate = this.records.get(key);
    if (duplicate?.kind === "action") return clone(duplicate);
    if (this.records.has(receiptKey(input.actorId, input.contextKey, input.actionId))) {
      throw new Error("This offline action already has a successful sync receipt.");
    }
    const existing = [...this.records.values()].filter((record): record is ActionRecord =>
      record.kind === "action" && scopeMatches(record, input) && !isExpired(record, now));
    if (existing.length >= MAX_ACTIONS_PER_CONTEXT) {
      throw new Error("Offline queue limit reached. Reconnect or review saved actions.");
    }
    const generation = this.generation(input.actorId, input.contextKey);
    const action: ActionRecord = {
      ...clone(input),
      kind: "action",
      key,
      state: "queued",
      expiresAt: expiresAt(now, ACTION_RETENTION_MS),
      generation
    };
    this.records.set(action.key, action);
    return clone(action);
  }

  async list(scope: OfflineOwnerContext, now = new Date()) {
    assertScope(scope);
    this.prune(now);
    return [...this.records.values()]
      .filter((record): record is ActionRecord => record.kind === "action" && scopeMatches(record, scope))
      .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
      .map(clone);
  }

  async claimNext(scope: OfflineOwnerContext, leaseOwner: string, leaseMs: number, now = new Date()) {
    assertScope(scope);
    this.prune(now);
    // Deliberately no await in this critical section: every engine sharing this
    // store observes the lease write before another claim can inspect records.
    const action = [...this.records.values()]
      .filter((record): record is ActionRecord => record.kind === "action" && scopeMatches(record, scope))
      .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))[0];
    if (!action
      || (action.state !== "queued" && action.state !== "retrying")
      || (action.retryAfter && Date.parse(action.retryAfter) > now.getTime())
      || (action.leaseExpiresAt && Date.parse(action.leaseExpiresAt) > now.getTime())
    ) return null;
    const stored = this.records.get(actionKey(action.actorId, action.contextKey, action.actionId)) as ActionRecord | undefined;
    if (!stored || stored.generation !== this.generation(scope.actorId, scope.contextKey)) return null;
    const leaseToken = `${leaseOwner}:${now.getTime()}:${Math.random().toString(16).slice(2)}`;
    Object.assign(stored, { leaseOwner, leaseToken, leaseExpiresAt: expiresAt(now, leaseMs) });
    return { action: clone(stored), leaseToken, generation: stored.generation };
  }

  async settleSuccess(claim: OfflineClaim, now = new Date()) {
    const key = actionKey(claim.action.actorId, claim.action.contextKey, claim.action.actionId);
    const action = this.records.get(key);
    if (action?.kind !== "action" || action.leaseToken !== claim.leaseToken || action.generation !== claim.generation || this.generation(action.actorId, action.contextKey) !== claim.generation) return null;
    this.records.delete(key);
    const receipt: ReceiptRecord = {
      kind: "receipt",
      key: receiptKey(action.actorId, action.contextKey, action.actionId),
      actionId: action.actionId,
      actionType: action.actionType,
      actorId: action.actorId,
      organizationId: action.organizationId,
      seasonId: action.seasonId,
      contextKey: action.contextKey,
      teamId: action.teamId,
      familyId: action.familyId,
      syncedAt: now.toISOString(),
      expiresAt: expiresAt(now, RECEIPT_RETENTION_MS),
      generation: action.generation
    };
    this.records.set(receipt.key, receipt);
    return clone(receipt);
  }

  async settleFailure(claim: OfflineClaim, failure: OfflineActionFailure, now = new Date()) {
    const key = actionKey(claim.action.actorId, claim.action.contextKey, claim.action.actionId);
    const action = this.records.get(key);
    if (action?.kind !== "action" || action.leaseToken !== claim.leaseToken || action.generation !== claim.generation || this.generation(action.actorId, action.contextKey) !== claim.generation) return null;
    action.attemptedAt = now.toISOString();
    action.retryCount += 1;
    action.state = failure.retryable && action.retryCount >= MAX_RETRIES ? "review_required" : failure.state;
    action.lastError = failure.message;
    action.conflictDetail = failure.kind === "conflict" ? failure.message : undefined;
    action.retryAfter = failure.retryAfter;
    delete action.leaseOwner;
    delete action.leaseToken;
    delete action.leaseExpiresAt;
    return clone(action);
  }

  async clearOwner(actorId: string) {
    const contexts = new Set<string>();
    for (const record of this.records.values()) {
      if (record.actorId === actorId) contexts.add(record.contextKey);
    }
    for (const contextKey of contexts) this.bumpGeneration(actorId, contextKey);
    for (const [key, record] of this.records) {
      if (record.actorId === actorId && record.kind !== "generation") this.records.delete(key);
    }
  }

  async clearContext(scope: OfflineOwnerContext) {
    assertScope(scope);
    this.bumpGeneration(scope.actorId, scope.contextKey);
    for (const [key, record] of this.records) {
      if (record.kind !== "generation" && scopeMatches(record, scope)) this.records.delete(key);
    }
  }

  async summary(scope: Pick<OfflineOwnerContext, "actorId"> & Partial<OfflineOwnerContext>, now = new Date()) {
    this.prune(now);
    return summaryFrom([...this.records.values()], scope, now);
  }

  private generation(actorId: string, contextKey: string) {
    const record = this.records.get(generationKey(actorId, contextKey));
    return record?.kind === "generation" ? record.generation : 0;
  }

  private bumpGeneration(actorId: string, contextKey: string) {
    const key = generationKey(actorId, contextKey);
    this.records.set(key, { kind: "generation", key, actorId, contextKey, generation: this.generation(actorId, contextKey) + 1 });
  }

  private prune(now: Date) {
    for (const [key, record] of this.records) {
      if (record.kind !== "generation" && isExpired(record, now)) this.records.delete(key);
    }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Offline storage is unavailable."));
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Offline storage could not open."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("actorId", "actorId", { unique: false });
        store.createIndex("contextKey", "contextKey", { unique: false });
      }
      if (database.objectStoreNames.contains("context-outbox")) database.deleteObjectStore("context-outbox");
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    let result: T;
    let resolved = false;
    operation(transaction.objectStore(STORE_NAME), (value) => {
      result = value;
      resolved = true;
    }, reject);
    transaction.oncomplete = () => {
      database.close();
      if (resolved) resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Offline storage transaction failed."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Offline storage transaction was aborted."));
    };
  });
}

function getAll(store: IDBObjectStore, callback: (records: StoredRecord[]) => void) {
  const request = store.getAll();
  request.onerror = () => store.transaction.abort();
  request.onsuccess = () => callback(request.result as StoredRecord[]);
}

export class IndexedDbGameDayOutboxStore implements GameDayOutboxStore {
  async enqueue(input: QueueOfflineGameDayActionInput, now = new Date()) {
    assertAction(input);
    return withStore<OfflineGameDayAction>("readwrite", (store, resolve) => getAll(store, (records) => {
      const current = records.filter((record): record is ActionRecord => record.kind === "action" && scopeMatches(record, input) && !isExpired(record, now));
      const key = actionKey(input.actorId, input.contextKey, input.actionId);
      const duplicate = records.find((record): record is ActionRecord => record.kind === "action" && record.key === key);
      if (duplicate) return resolve(clone(duplicate));
      if (records.some((record) => record.kind === "receipt" && record.key === receiptKey(input.actorId, input.contextKey, input.actionId))) {
        store.transaction.abort();
        return;
      }
      if (current.length >= MAX_ACTIONS_PER_CONTEXT) {
        store.transaction.abort();
        return;
      }
      for (const record of records) if (record.kind !== "generation" && isExpired(record, now)) store.delete(record.key);
      const generation = records.find((record): record is GenerationRecord => record.kind === "generation" && record.key === generationKey(input.actorId, input.contextKey))?.generation ?? 0;
      const action: ActionRecord = { ...clone(input), kind: "action", key, state: "queued", expiresAt: expiresAt(now, ACTION_RETENTION_MS), generation };
      store.put(action);
      resolve(clone(action));
    }));
  }

  async list(scope: OfflineOwnerContext, now = new Date()) {
    assertScope(scope);
    return withStore<OfflineGameDayAction[]>("readwrite", (store, resolve) => getAll(store, (records) => {
      for (const record of records) if (record.kind !== "generation" && isExpired(record, now)) store.delete(record.key);
      resolve(records.filter((record): record is ActionRecord => record.kind === "action" && scopeMatches(record, scope) && !isExpired(record, now))
        .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt)).map(clone));
    }));
  }

  async claimNext(scope: OfflineOwnerContext, leaseOwner: string, leaseMs: number, now = new Date()) {
    assertScope(scope);
    return withStore<OfflineClaim | null>("readwrite", (store, resolve) => getAll(store, (records) => {
      const generation = records.find((record): record is GenerationRecord => record.kind === "generation" && record.key === generationKey(scope.actorId, scope.contextKey))?.generation ?? 0;
      const action = records.filter((record): record is ActionRecord => record.kind === "action" && scopeMatches(record, scope) && record.generation === generation)
        .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))[0];
      if (!action
        || (action.state !== "queued" && action.state !== "retrying")
        || (action.retryAfter && Date.parse(action.retryAfter) > now.getTime())
        || (action.leaseExpiresAt && Date.parse(action.leaseExpiresAt) > now.getTime())
      ) return resolve(null);
      const leaseToken = `${leaseOwner}:${now.getTime()}:${Math.random().toString(16).slice(2)}`;
      const claimed = { ...action, leaseOwner, leaseToken, leaseExpiresAt: expiresAt(now, leaseMs) };
      store.put(claimed);
      resolve({ action: clone(claimed), leaseToken, generation });
    }));
  }

  async settleSuccess(claim: OfflineClaim, now = new Date()) {
    return withStore<OfflineSyncReceipt | null>("readwrite", (store, resolve) => getAll(store, (records) => {
      const action = records.find((record): record is ActionRecord => record.kind === "action" && record.key === actionKey(claim.action.actorId, claim.action.contextKey, claim.action.actionId));
      const generation = records.find((record): record is GenerationRecord => record.kind === "generation" && record.key === generationKey(claim.action.actorId, claim.action.contextKey))?.generation ?? 0;
      if (!action || action.leaseToken !== claim.leaseToken || action.generation !== claim.generation || generation !== claim.generation) return resolve(null);
      store.delete(action.key);
      const receipt: ReceiptRecord = {
        kind: "receipt", key: receiptKey(action.actorId, action.contextKey, action.actionId),
        actionId: action.actionId, actionType: action.actionType, actorId: action.actorId,
        organizationId: action.organizationId, seasonId: action.seasonId, contextKey: action.contextKey,
        teamId: action.teamId, familyId: action.familyId, syncedAt: now.toISOString(),
        expiresAt: expiresAt(now, RECEIPT_RETENTION_MS), generation: action.generation
      };
      store.put(receipt);
      resolve(clone(receipt));
    }));
  }

  async settleFailure(claim: OfflineClaim, failure: OfflineActionFailure, now = new Date()) {
    return withStore<OfflineGameDayAction | null>("readwrite", (store, resolve) => getAll(store, (records) => {
      const action = records.find((record): record is ActionRecord => record.kind === "action" && record.key === actionKey(claim.action.actorId, claim.action.contextKey, claim.action.actionId));
      const generation = records.find((record): record is GenerationRecord => record.kind === "generation" && record.key === generationKey(claim.action.actorId, claim.action.contextKey))?.generation ?? 0;
      if (!action || action.leaseToken !== claim.leaseToken || action.generation !== claim.generation || generation !== claim.generation) return resolve(null);
      const updated: ActionRecord = {
        ...action, attemptedAt: now.toISOString(), retryCount: action.retryCount + 1,
        state: failure.retryable && action.retryCount + 1 >= MAX_RETRIES ? "review_required" : failure.state,
        lastError: failure.message, conflictDetail: failure.kind === "conflict" ? failure.message : undefined,
        retryAfter: failure.retryAfter, leaseOwner: undefined, leaseToken: undefined, leaseExpiresAt: undefined
      };
      store.put(updated);
      resolve(clone(updated));
    }));
  }

  async clearOwner(actorId: string) {
    return withStore<void>("readwrite", (store, resolve) => getAll(store, (records) => {
      const contexts = new Set(records.filter((record) => record.actorId === actorId).map((record) => record.contextKey));
      for (const contextKey of contexts) {
        const key = generationKey(actorId, contextKey);
        const current = records.find((record): record is GenerationRecord => record.kind === "generation" && record.key === key)?.generation ?? 0;
        store.put({ kind: "generation", key, actorId, contextKey, generation: current + 1 } satisfies GenerationRecord);
      }
      for (const record of records) if (record.actorId === actorId && record.kind !== "generation") store.delete(record.key);
      resolve();
    }));
  }

  async clearContext(scope: OfflineOwnerContext) {
    assertScope(scope);
    return withStore<void>("readwrite", (store, resolve) => getAll(store, (records) => {
      const key = generationKey(scope.actorId, scope.contextKey);
      const current = records.find((record): record is GenerationRecord => record.kind === "generation" && record.key === key)?.generation ?? 0;
      store.put({ kind: "generation", key, actorId: scope.actorId, contextKey: scope.contextKey, generation: current + 1 } satisfies GenerationRecord);
      for (const record of records) if (record.kind !== "generation" && scopeMatches(record, scope)) store.delete(record.key);
      resolve();
    }));
  }

  async summary(scope: Pick<OfflineOwnerContext, "actorId"> & Partial<OfflineOwnerContext>, now = new Date()) {
    return withStore<OfflineStatusSummary>("readwrite", (store, resolve) => getAll(store, (records) => {
      for (const record of records) if (record.kind !== "generation" && isExpired(record, now)) store.delete(record.key);
      resolve(summaryFrom(records, scope, now));
    }));
  }
}

export class GameDayOutboxEngine {
  constructor(
    private readonly store: GameDayOutboxStore,
    private readonly engineId = `engine:${Math.random().toString(16).slice(2)}`,
    private readonly leaseMs = DEFAULT_LEASE_MS
  ) {}

  queue(action: QueueOfflineGameDayActionInput, now?: Date) {
    return this.store.enqueue(action, now);
  }

  async sync(
    scope: OfflineOwnerContext,
    session: OfflineSession | null,
    send: (action: OfflineGameDayAction, endpoint: string) => Promise<OutboxSendResult>,
    now = new Date()
  ) {
    assertScope(scope);
    if (!session || session.actorId !== scope.actorId || (session.expiresAt && Date.parse(session.expiresAt) <= now.getTime())) {
      throw new Error("A current matching session is required before offline replay.");
    }
    if (session.validate && !await session.validate()) {
      throw new Error("A current matching session is required before offline replay.");
    }
    const results: Array<OfflineGameDayAction | OfflineSyncReceipt> = [];
    while (true) {
      const claim = await this.store.claimNext(scope, this.engineId, this.leaseMs, now);
      if (!claim) break;
      if (claim.action.actorId !== session.actorId || !scopeMatches(claim.action, scope)) {
        throw new Error("Offline action actor or context mismatch.");
      }
      if (session.validate && !await session.validate()) {
        await this.store.settleFailure(claim, classifyOfflineFailure({ ok: false, status: 401 }), now);
        throw new Error("The authenticated actor changed or the session expired during offline replay.");
      }
      const endpoint = endpointForOfflineAction(claim.action.actionType);
      const response = await send(clone(claim.action), endpoint).catch(() => ({ ok: false, status: 0, body: null }));
      if (response.ok) {
        const receipt = await this.store.settleSuccess(claim, now);
        if (receipt) results.push(receipt);
        continue;
      }
      const updated = await this.store.settleFailure(claim, classifyOfflineFailure(response), now);
      if (updated) results.push(updated);
      break;
    }
    return results;
  }
}

const indexedDbStore = new IndexedDbGameDayOutboxStore();
const defaultEngine = new GameDayOutboxEngine(indexedDbStore);

function notifyOfflineStatusChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("leaguepilot:offline-status"));
}

export async function queueOfflineGameDayAction(action: QueueOfflineGameDayActionInput) {
  const queued = await defaultEngine.queue(action);
  notifyOfflineStatusChanged();
  return queued;
}

export async function listContextOutbox(scope: OfflineOwnerContext) {
  return indexedDbStore.list(scope);
}

export async function clearPrivateGameDayData(actorId: string) {
  if (typeof indexedDB === "undefined" || !actorId) return;
  await indexedDbStore.clearOwner(actorId);
  notifyOfflineStatusChanged();
}

export async function clearPrivateGameDayContext(scope: OfflineOwnerContext) {
  if (typeof indexedDB === "undefined") return;
  await indexedDbStore.clearContext(scope);
  notifyOfflineStatusChanged();
}

export async function getOfflineStatusSummary(scope: Pick<OfflineOwnerContext, "actorId"> & Partial<OfflineOwnerContext>) {
  if (typeof indexedDB === "undefined") return { queued: 0, retrying: 0, conflict: 0, signInRequired: 0, reviewRequired: 0, synced: 0 };
  return indexedDbStore.summary(scope);
}

export async function syncContextOutbox(
  scope: OfflineOwnerContext,
  session: OfflineSession | null,
  send: (action: OfflineGameDayAction, endpoint: string) => Promise<OutboxSendResult>
) {
  const results = await defaultEngine.sync(scope, session, send);
  notifyOfflineStatusChanged();
  return results;
}
