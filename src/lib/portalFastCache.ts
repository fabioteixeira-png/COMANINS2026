/**
 * COMANINS Portal Fast Cache
 *
 * Cache persistente por usuário para experiência stale-while-revalidate.
 * O objetivo é hidratar telas imediatamente após login/F5 e deixar Firestore/API
 * atualizar o snapshot em segundo plano.
 *
 * Regras:
 * - nunca é fonte autoritativa; Firestore/API continuam sendo a verdade;
 * - chaves são isoladas por Firebase UID;
 * - data URLs pesadas são removidas do snapshot local para evitar crescimento
 *   desnecessário do IndexedDB;
 * - falha do cache nunca pode impedir a aplicação de funcionar.
 */

const DB_NAME = 'comanins-portal-fast-cache';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';
export const DEFAULT_FAST_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface PortalFastCacheEntry<T = unknown> {
  key: string;
  userId: string;
  dataset: string;
  updatedAt: number;
  value: T;
}

const normalizeUserId = (userId?: string | null): string =>
  String(userId || '').trim() || 'anonymous';

const makeKey = (dataset: string, userId?: string | null): string =>
  `${normalizeUserId(userId)}::${String(dataset || '').trim()}`;

const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

const stripHeavyBrowserPayloads = (value: any, depth = 0): any => {
  if (depth > 12) return value;
  if (typeof value === 'string') {
    // Fotos legadas em base64 podem ter vários MB. A tela ganha velocidade com
    // os dados operacionais; a imagem será reposta pelo snapshot autoritativo.
    if (/^data:(image|application)\//i.test(value) && value.length > 64_000) return '';
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripHeavyBrowserPayloads(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'function' || item === undefined) continue;
      result[key] = stripHeavyBrowserPayloads(item, depth + 1);
    }
    return result;
  }
  return value;
};

export async function readPortalFastCache<T>(
  dataset: string,
  userId?: string | null,
  maxAgeMs = DEFAULT_FAST_CACHE_MAX_AGE_MS,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  const key = makeKey(dataset, userId);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => {
        const entry = request.result as PortalFastCacheEntry<T> | undefined;
        if (!entry || !entry.updatedAt) {
          resolve(null);
          return;
        }
        if (maxAgeMs > 0 && Date.now() - entry.updatedAt > maxAgeMs) {
          resolve(null);
          return;
        }
        resolve(entry.value ?? null);
      };
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function writePortalFastCache<T>(
  dataset: string,
  userId: string | null | undefined,
  value: T,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const normalizedUserId = normalizeUserId(userId);
  const entry: PortalFastCacheEntry = {
    key: makeKey(dataset, normalizedUserId),
    userId: normalizedUserId,
    dataset,
    updatedAt: Date.now(),
    value: stripHeavyBrowserPayloads(value),
  };

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function removePortalFastCache(
  dataset: string,
  userId?: string | null,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(makeKey(dataset, userId));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); resolve(); };
    } catch {
      db.close();
      resolve();
    }
  });
}
