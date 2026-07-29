import type { SyncEnvelope } from "@/lib/operational-truth";

export type OfflineGameDayActionType = SyncEnvelope["actionType"];

export interface OfflineGameDayAction extends SyncEnvelope {
  endpoint: string;
  payload: Record<string, unknown>;
  lastError?: string;
}

export type OutboxSendResult = {
  ok: boolean;
  status: number;
  body?: Record<string, unknown> | null;
};

const DATABASE_NAME = "leaguepilot-private-game-day";
const STORE_NAME = "context-outbox";
const DATABASE_VERSION = 1;

export function isOfflineActionAllowed(actionType: string): actionType is OfflineGameDayActionType {
  return actionType === "rsvp"
    || actionType === "attendance"
    || actionType === "coach_note";
}

export function outboxDisplayState(action: OfflineGameDayAction) {
  if (action.conflictDetail) return "Sync conflict";
  if (action.succeededAt) return "Synced";
  if (action.attemptedAt && action.retryCount > 0) return "Retry online";
  if (action.queuedAt) return "Waiting to sync";
  return "Saved on this device";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Offline storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Offline storage could not open."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "actionId" });
        store.createIndex("contextKey", "contextKey", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionRequest<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onerror = () => reject(request.error ?? new Error("Offline action could not be stored."));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Offline storage transaction failed."));
    };
  }));
}

export async function queueOfflineGameDayAction(action: OfflineGameDayAction) {
  if (!isOfflineActionAllowed(action.actionType)) {
    throw new Error("This action must be completed online.");
  }
  await transactionRequest("readwrite", (store) => store.put(action));
  return action;
}

export async function listContextOutbox(contextKey: string): Promise<OfflineGameDayAction[]> {
  const actions = await transactionRequest("readonly", (store) => store.index("contextKey").getAll(contextKey));
  return (actions as OfflineGameDayAction[])
    .filter((action) => !action.succeededAt)
    .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export async function removeOfflineAction(actionId: string) {
  await transactionRequest("readwrite", (store) => store.delete(actionId));
}

export async function clearPrivateGameDayData() {
  if (typeof indexedDB === "undefined") return;
  await transactionRequest("readwrite", (store) => store.clear());
}

export async function syncContextOutbox(
  contextKey: string,
  send: (action: OfflineGameDayAction) => Promise<OutboxSendResult>
) {
  const actions = await listContextOutbox(contextKey);
  const results: OfflineGameDayAction[] = [];

  for (const action of actions) {
    const attempted: OfflineGameDayAction = {
      ...action,
      attemptedAt: new Date().toISOString(),
      retryCount: action.retryCount + 1
    };
    const result = await send(attempted).catch(() => ({ ok: false, status: 0, body: null }));
    if (result.ok) {
      await removeOfflineAction(action.actionId);
      results.push({ ...attempted, succeededAt: new Date().toISOString() });
      continue;
    }
    const body = result.body ?? null;
    const conflict = result.status === 409;
    const updated: OfflineGameDayAction = {
      ...attempted,
      conflictDetail: conflict
        ? String(body?.message ?? "Server version changed. Review this action before retrying.")
        : undefined,
      lastError: conflict ? undefined : String(body?.message ?? "Action must be retried online.")
    };
    await queueOfflineGameDayAction(updated);
    results.push(updated);
    if (conflict) break;
  }
  return results;
}
