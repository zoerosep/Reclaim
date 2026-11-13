/**
 * Hackathon demo vault. IndexedDB stores selected safe demo reference images as
 * Blobs and metadata, plus text-only records a person adds by hand (web address,
 * date and notes, never an image). IndexedDB is NOT encrypted at rest; do not
 * store real NCII. No network requests are made by this module.
 */
const DB_NAME = 'reclaim-demo-vault-v1';
const STORE = 'evidence';
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not support IndexedDB.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open local evidence storage.'));
  });
}

async function transact(mode, operation) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      let output;
      request.onsuccess = () => { output = request.result; };
      request.onerror = () => reject(request.error || new Error('Local database request failed.'));
      tx.oncomplete = () => resolve(output);
      tx.onerror = () => reject(tx.error || new Error('Local database transaction failed.'));
      tx.onabort = () => reject(tx.error || new Error('Local database transaction aborted.'));
    });
  } finally {
    db.close();
  }
}

export const allEvidence = () => transact('readonly', store => store.getAll());
export const saveEvidence = record => transact('readwrite', store => store.put(record));
export const deleteEvidence = id => transact('readwrite', store => store.delete(id));
export const clearEvidence = () => transact('readwrite', store => store.clear());

/** Replace records in one transaction so importing a backup is atomic. */
export async function replaceEvidence(records) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      for (const record of records) store.put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Import failed.'));
      tx.onabort = () => reject(tx.error || new Error('Import was aborted.'));
    });
  } finally {
    db.close();
  }
}
