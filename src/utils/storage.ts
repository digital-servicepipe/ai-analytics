import type { NormalizedLogRow, PersistedDashboardState } from "../types";
import { getAgentGroup, getPageMeta } from "./normalize";

const DB_NAME = "ai-analytics-dashboard";
const STORE_NAME = "state";
const STATE_KEY = "dashboard";

const emptyState: PersistedDashboardState = {
  version: 2,
  rows: [],
  files: [],
};

function normalizePersistedRows(rows: NormalizedLogRow[] | undefined): NormalizedLogRow[] {
  return (rows ?? []).map((row) => {
    const { section, pageType } = getPageMeta(String(row.path ?? ""));

    return {
      ...row,
      agentGroup:
        row.agentGroup ||
        getAgentGroup(String(row.botType ?? ""), String(row.httpUserAgent ?? "")),
      section,
      pageType,
    };
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const request = callback(tx.objectStore(STORE_NAME));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export async function loadPersistedState(): Promise<PersistedDashboardState> {
  if (!("indexedDB" in window)) return emptyState;

  const state = await withStore<PersistedDashboardState | undefined>(
    "readonly",
    (store) => store.get(STATE_KEY),
  );

  if (!state || ![1, 2].includes(Number(state.version))) return emptyState;
  return {
    version: 2,
    rows: normalizePersistedRows(state.rows),
    files: (state.files ?? []).filter((file) => file?.kind === "logs"),
  };
}

export async function savePersistedState(
  state: PersistedDashboardState,
): Promise<void> {
  if (!("indexedDB" in window)) return;
  await withStore<IDBValidKey>("readwrite", (store) =>
    store.put({ ...state, version: 2 }, STATE_KEY),
  );
}
