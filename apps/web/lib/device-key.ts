// Device keypair in IndexedDB. Never leaves the device; never sent to the server (A-9.2).
import { KeyPairEd25519 } from "near-api-js";

export interface DeviceKey {
  accountId: string;
  publicKey: string;
  privateKey: string;
}

const DB_NAME = "admit_device_db";
const STORE_NAME = "keys";
const KEY_NAME = "device_key";

let memoryKey: DeviceKey | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromDb(): Promise<DeviceKey | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function saveToDb(key: DeviceKey): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(key, KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fall back to memory only if IndexedDB unavailable
  }
}

export const getOrCreateDeviceKey = async (): Promise<DeviceKey> => {
  if (memoryKey) {
    return memoryKey;
  }

  // Check IndexedDB
  const stored = await loadFromDb();
  if (stored) {
    memoryKey = stored;
    return stored;
  }

  // Generate new Ed25519 keypair
  const kp = KeyPairEd25519.fromRandom();
  const publicKey = kp.getPublicKey().toString();
  const privateKey = kp.toString();
  const accountId = Buffer.from(kp.publicKey.data).toString("hex");

  const newKey: DeviceKey = {
    accountId,
    publicKey,
    privateKey,
  };

  memoryKey = newKey;
  await saveToDb(newKey);

  return newKey;
};

export const clearDeviceKey = (): void => {
  memoryKey = null;
};
