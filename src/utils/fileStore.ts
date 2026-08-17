const DB_NAME = 'turnofly_file_store';
const DB_VERSION = 1;
const STORE_NAME = 'evidence_files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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

const scopedKey = (userId: string, key: string) => `${encodeURIComponent(userId)}:${key}`;

const readFile = async (key: string): Promise<Blob | undefined> => {
  const db = await openDb();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
};

const writeFile = async (key: string, file: Blob): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

const removeFile = async (key: string): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

export const FileStore = {
  async saveFile(userId: string, key: string, file: File): Promise<void> {
    await writeFile(scopedKey(userId, key), file);
  },

  async getFile(userId: string, key: string): Promise<Blob | undefined> {
    return readFile(scopedKey(userId, key));
  },

  async deleteFile(userId: string, key: string): Promise<void> {
    await removeFile(scopedKey(userId, key));
  },

  async migrateLegacyFiles(userId: string, keys: string[]): Promise<void> {
    for (const key of new Set(keys.filter(Boolean))) {
      const userKey = scopedKey(userId, key);
      const existing = await readFile(userKey);
      if (existing) continue;

      const legacyFile = await readFile(key);
      if (!legacyFile) continue;

      await writeFile(userKey, legacyFile);
      await removeFile(key);
    }
  },

  async clearUserFiles(userId: string): Promise<void> {
    const db = await openDb();
    const prefix = `${encodeURIComponent(userId)}:`;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openKeyCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
          store.delete(cursor.key);
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  },
};
