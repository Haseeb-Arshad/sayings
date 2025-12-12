/**
 * IndexedDB Service for draft recording storage
 * Handles all IndexedDB operations for offline draft management
 */

const DB_NAME = 'SayingsDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

class IndexedDBService {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  /**
   * Initialize the database and create object stores if needed
   */
  async init() {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB is not available in non-browser environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get the object store for drafts
   */
  async getStore(mode = 'readonly') {
    await this.init();
    const transaction = this.db.transaction([STORE_NAME], mode);
    return transaction.objectStore(STORE_NAME);
  }

  /**
   * Create a new draft
   */
  async createDraft(draftData) {
    const store = await this.getStore('readwrite');
    
    const draft = {
      id: this.generateId(),
      audioBlob: draftData.audioBlob,
      title: draftData.title || 'Untitled',
      description: draftData.description || '',
      topics: draftData.topics || [],
      transcript: draftData.transcript || '',
      privacy: draftData.privacy || 'public',
      status: 'saved_locally',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      publishedPostId: null,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(draft);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(draft);
    });
  }

  /**
   * Get a draft by ID
   */
  async getDraft(id) {
    const store = await this.getStore('readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get all drafts, optionally filtered by status
   */
  async listDrafts(status = null) {
    const store = await this.getStore('readonly');
    
    return new Promise((resolve, reject) => {
      let request;
      
      if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const drafts = request.result;
        // Sort by createdAt descending (newest first)
        drafts.sort((a, b) => b.createdAt - a.createdAt);
        resolve(drafts);
      };
    });
  }

  /**
   * Update a draft
   */
  async updateDraft(id, updates) {
    const store = await this.getStore('readwrite');
    const draft = await this.getDraft(id);
    
    if (!draft) {
      throw new Error(`Draft with id ${id} not found`);
    }

    const updated = {
      ...draft,
      ...updates,
      id: draft.id, // Ensure ID doesn't change
      createdAt: draft.createdAt, // Preserve creation time
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(updated);
    });
  }

  /**
   * Delete a draft
   */
  async deleteDraft(id) {
    const store = await this.getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * Update draft status (used for sync operations)
   */
  async updateDraftStatus(id, status, additionalData = {}) {
    return this.updateDraft(id, {
      status,
      ...additionalData,
    });
  }

  /**
   * Get drafts by status (for syncing)
   */
  async getDraftsByStatus(status) {
    return this.listDrafts(status);
  }

  /**
   * Delete all drafts (for testing/cleanup)
   */
  async clearAllDrafts() {
    const store = await this.getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const allDrafts = await this.listDrafts();
    const savedLocally = await this.listDrafts('saved_locally');
    const uploading = await this.listDrafts('uploading');
    const synced = await this.listDrafts('synced');

    return {
      totalDrafts: allDrafts.length,
      savedLocally: savedLocally.length,
      uploading: uploading.length,
      synced: synced.length,
    };
  }

  /**
   * Generate a unique ID
   */
  generateId() {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
const indexedDBService = new IndexedDBService();
export default indexedDBService;
