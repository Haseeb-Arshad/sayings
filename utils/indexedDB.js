// IndexedDB utility for persistent storage
// Used for storing failed uploads and retry queue

const DB_NAME = 'SayingsDB';
const DB_VERSION = 1;
const UPLOAD_QUEUE_STORE = 'uploadQueue';

let dbInstance = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB not available');
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create upload queue store if it doesn't exist
      if (!db.objectStoreNames.contains(UPLOAD_QUEUE_STORE)) {
        const store = db.createObjectStore(UPLOAD_QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });

        // Create indexes for querying
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('errorType', 'errorType', { unique: false });
        store.createIndex('retryCount', 'retryCount', { unique: false });
      }
    };
  });
}

/**
 * Add item to upload queue
 * @param {Object} item - Upload queue item
 * @returns {Promise<number>} ID of added item
 */
export async function addToQueue(item) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to add to queue'));
  });
}

/**
 * Get all items from upload queue
 * @returns {Promise<Array>}
 */
export async function getAllFromQueue() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get queue items'));
  });
}

/**
 * Get item from upload queue by ID
 * @param {number} id - Item ID
 * @returns {Promise<Object>}
 */
export async function getQueueItem(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get queue item'));
  });
}

/**
 * Update item in upload queue
 * @param {Object} item - Updated item (must include id)
 * @returns {Promise<void>}
 */
export async function updateQueueItem(item) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to update queue item'));
  });
}

/**
 * Remove item from upload queue
 * @param {number} id - Item ID
 * @returns {Promise<void>}
 */
export async function removeFromQueue(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to remove from queue'));
  });
}

/**
 * Clear all items from upload queue
 * @returns {Promise<void>}
 */
export async function clearQueue() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear queue'));
  });
}

/**
 * Count items in upload queue
 * @returns {Promise<number>}
 */
export async function getQueueCount() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([UPLOAD_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to count queue items'));
  });
}
