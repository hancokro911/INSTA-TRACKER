import { SnapshotSummary } from '../types/instagram';

const DB_NAME = 'ig-data-tracker-db';
const DB_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';

const WHITELIST_KEY = 'ig_tracker_whitelist_v1';
const CHECKED_KEY = 'ig_tracker_checked_unfollowed_v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSnapshots(): Promise<SnapshotSummary[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
      const store = tx.objectStore(SNAPSHOT_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as SnapshotSummary[]) || [];
        items.sort((a, b) => b.importedAt - a.importedAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem('ig_tracker_snapshots_fallback');
      return raw ? (JSON.parse(raw) as SnapshotSummary[]) : [];
    } catch {
      return [];
    }
  }
}

export async function saveSnapshot(snapshot: SnapshotSummary): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
      tx.objectStore(SNAPSHOT_STORE).put(snapshot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      const existing = await loadSnapshots();
      const updated = [snapshot, ...existing.filter((s) => s.id !== snapshot.id)].slice(0, 10);
      localStorage.setItem('ig_tracker_snapshots_fallback', JSON.stringify(updated));
    } catch {
      // Ignore quota errors in fallback
    }
  }
}

export async function deleteSnapshot(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
      tx.objectStore(SNAPSHOT_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      const existing = await loadSnapshots();
      localStorage.setItem(
        'ig_tracker_snapshots_fallback',
        JSON.stringify(existing.filter((s) => s.id !== id))
      );
    } catch {
      // Ignore
    }
  }
}

export async function clearAllSnapshots(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
      tx.objectStore(SNAPSHOT_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
  try {
    localStorage.removeItem('ig_tracker_snapshots_fallback');
  } catch {
    // Ignore
  }
}

export function loadStringSet(key: 'whitelist' | 'checked'): Set<string> {
  const storageKey = key === 'whitelist' ? WHITELIST_KEY : CHECKED_KEY;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map((s) => String(s).toLowerCase())) : new Set();
  } catch {
    return new Set();
  }
}

export function saveStringSet(key: 'whitelist' | 'checked', values: Set<string>): void {
  const storageKey = key === 'whitelist' ? WHITELIST_KEY : CHECKED_KEY;
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(values)));
  } catch {
    // Ignore
  }
}
