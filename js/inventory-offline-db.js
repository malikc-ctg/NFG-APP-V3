/**
 * Inventory Offline Database Manager
 * Uses IndexedDB to cache inventory data and queue offline transactions
 */

const DB_NAME = 'NFGInventoryOffline';
const DB_VERSION = 1;

class InventoryOfflineDB {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[InventoryOfflineDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[InventoryOfflineDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for cached inventory items
        if (!db.objectStoreNames.contains('cachedItems')) {
          const itemsStore = db.createObjectStore('cachedItems', { keyPath: 'id' });
          itemsStore.createIndex('barcode', 'barcode', { unique: false });
          itemsStore.createIndex('site_id', 'site_id', { unique: false });
          itemsStore.createIndex('last_updated', 'last_updated', { unique: false });
        }

        // Store for cached site inventory (quantities per site)
        if (!db.objectStoreNames.contains('cachedSiteInventory')) {
          const siteInventoryStore = db.createObjectStore('cachedSiteInventory', { 
            keyPath: ['site_id', 'item_id'] 
          });
          siteInventoryStore.createIndex('site_id', 'site_id', { unique: false });
          siteInventoryStore.createIndex('item_id', 'item_id', { unique: false });
        }

        // Store for pending transactions (offline queue)
        if (!db.objectStoreNames.contains('pendingTransactions')) {
          const transactionsStore = db.createObjectStore('pendingTransactions', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          transactionsStore.createIndex('synced', 'synced', { unique: false });
          transactionsStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Store for offline photos (blobs)
        if (!db.objectStoreNames.contains('photoBlobs')) {
          const photosStore = db.createObjectStore('photoBlobs', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          photosStore.createIndex('transaction_id', 'transaction_id', { unique: false });
          photosStore.createIndex('uploaded', 'uploaded', { unique: false });
        }

        // Store for cached sites (for site selector)
        if (!db.objectStoreNames.contains('cachedSites')) {
          const sitesStore = db.createObjectStore('cachedSites', { keyPath: 'id' });
          sitesStore.createIndex('last_updated', 'last_updated', { unique: false });
        }

        console.log('[InventoryOfflineDB] Database schema created');
      };
    });
  }

  // ===== CACHED ITEMS =====

  async cacheItem(item) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedItems'], 'readwrite');
    const store = transaction.objectStore('cachedItems');
    
    const cachedItem = {
      ...item,
      last_updated: new Date().toISOString()
    };
    
    return store.put(cachedItem);
  }

  async cacheItems(items) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedItems'], 'readwrite');
    const store = transaction.objectStore('cachedItems');
    
    const promises = items.map(item => {
      const cachedItem = {
        ...item,
        last_updated: new Date().toISOString()
      };
      return store.put(cachedItem);
    });
    
    return Promise.all(promises);
  }

  async getCachedItem(itemId) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedItems'], 'readonly');
    const store = transaction.objectStore('cachedItems');
    return store.get(itemId);
  }

  async getCachedItemByBarcode(barcode) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedItems'], 'readonly');
    const store = transaction.objectStore('cachedItems');
    const index = store.index('barcode');
    return index.get(barcode);
  }

  async getAllCachedItems() {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedItems'], 'readonly');
    const store = transaction.objectStore('cachedItems');
    return store.getAll();
  }

  async getCachedItemsBySite(siteId) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedItems'], 'readonly');
    const store = transaction.objectStore('cachedItems');
    const index = store.index('site_id');
    return index.getAll(siteId);
  }

  isCacheValid(item, maxAgeMinutes = 60) {
    if (!item || !item.last_updated) return false;
    const age = (Date.now() - new Date(item.last_updated).getTime()) / 1000 / 60;
    return age < maxAgeMinutes;
  }

  // ===== CACHED SITE INVENTORY =====

  async cacheSiteInventory(siteInventory) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedSiteInventory'], 'readwrite');
    const store = transaction.objectStore('cachedSiteInventory');
    
    const promises = siteInventory.map(item => {
      return store.put({
        site_id: item.site_id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        last_updated: new Date().toISOString(),
        ...item
      });
    });
    
    return Promise.all(promises);
  }

  async getCachedSiteInventory(siteId) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedSiteInventory'], 'readonly');
    const store = transaction.objectStore('cachedSiteInventory');
    const index = store.index('site_id');
    return index.getAll(siteId);
  }

  async updateCachedSiteInventoryQuantity(siteId, itemId, newQuantity) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedSiteInventory'], 'readwrite');
    const store = transaction.objectStore('cachedSiteInventory');
    
    const key = [siteId, itemId];
    const existing = await store.get(key);
    
    if (existing) {
      existing.quantity = newQuantity;
      existing.last_updated = new Date().toISOString();
      return store.put(existing);
    } else {
      return store.put({
        site_id: siteId,
        item_id: itemId,
        quantity: newQuantity,
        last_updated: new Date().toISOString()
      });
    }
  }

  // ===== PENDING TRANSACTIONS =====

  async savePendingTransaction(transactionData) {
    await this.initPromise;
    const transaction = this.db.transaction(['pendingTransactions'], 'readwrite');
    const store = transaction.objectStore('pendingTransactions');
    
    const pendingTransaction = {
      ...transactionData,
      synced: false,
      created_at: new Date().toISOString(),
      retry_count: 0
    };
    
    return store.add(pendingTransaction);
  }

  async getPendingTransactions() {
    await this.initPromise;
    const transaction = this.db.transaction(['pendingTransactions'], 'readonly');
    const store = transaction.objectStore('pendingTransactions');
    
    // Get all transactions and filter by synced = false
    // IndexedDB doesn't handle boolean indexes well, so we filter in JavaScript
    const allTransactions = await store.getAll();
    return allTransactions.filter(tx => tx.synced === false);
  }

  async markTransactionSynced(transactionId) {
    await this.initPromise;
    const transaction = this.db.transaction(['pendingTransactions'], 'readwrite');
    const store = transaction.objectStore('pendingTransactions');
    
    const pending = await store.get(transactionId);
    if (pending) {
      pending.synced = true;
      pending.synced_at = new Date().toISOString();
      return store.put(pending);
    }
  }

  async deletePendingTransaction(transactionId) {
    await this.initPromise;
    const transaction = this.db.transaction(['pendingTransactions'], 'readwrite');
    const store = transaction.objectStore('pendingTransactions');
    return store.delete(transactionId);
  }

  async incrementRetryCount(transactionId) {
    await this.initPromise;
    const transaction = this.db.transaction(['pendingTransactions'], 'readwrite');
    const store = transaction.objectStore('pendingTransactions');
    
    const pending = await store.get(transactionId);
    if (pending) {
      pending.retry_count = (pending.retry_count || 0) + 1;
      return store.put(pending);
    }
  }

  // ===== PHOTO BLOBS =====

  async savePhotoBlob(transactionId, blob) {
    await this.initPromise;
    const transaction = this.db.transaction(['photoBlobs'], 'readwrite');
    const store = transaction.objectStore('photoBlobs');
    
    // Convert blob to ArrayBuffer for storage
    const arrayBuffer = await blob.arrayBuffer();
    
    return store.add({
      transaction_id: transactionId,
      blob: arrayBuffer,
      blob_type: blob.type,
      uploaded: false,
      created_at: new Date().toISOString()
    });
  }

  async getPhotoBlobs(transactionId) {
    await this.initPromise;
    const transaction = this.db.transaction(['photoBlobs'], 'readonly');
    const store = transaction.objectStore('photoBlobs');
    const index = store.index('transaction_id');
    const blobs = await index.getAll(transactionId);
    
    // Convert ArrayBuffer back to Blob
    return blobs.map(photo => ({
      ...photo,
      blob: new Blob([photo.blob], { type: photo.blob_type })
    }));
  }

  async markPhotoUploaded(photoId, photoUrl) {
    await this.initPromise;
    const transaction = this.db.transaction(['photoBlobs'], 'readwrite');
    const store = transaction.objectStore('photoBlobs');
    
    const photo = await store.get(photoId);
    if (photo) {
      photo.uploaded = true;
      photo.photo_url = photoUrl;
      photo.uploaded_at = new Date().toISOString();
      return store.put(photo);
    }
  }

  async deletePhotoBlob(photoId) {
    await this.initPromise;
    const transaction = this.db.transaction(['photoBlobs'], 'readwrite');
    const store = transaction.objectStore('photoBlobs');
    return store.delete(photoId);
  }

  // ===== CACHED SITES =====

  async cacheSites(sites) {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedSites'], 'readwrite');
    const store = transaction.objectStore('cachedSites');
    
    const promises = sites.map(site => {
      return store.put({
        ...site,
        last_updated: new Date().toISOString()
      });
    });
    
    return Promise.all(promises);
  }

  async getCachedSites() {
    await this.initPromise;
    const transaction = this.db.transaction(['cachedSites'], 'readonly');
    const store = transaction.objectStore('cachedSites');
    return store.getAll();
  }

  // ===== UTILITY =====

  async clearCache() {
    await this.initPromise;
    const stores = ['cachedItems', 'cachedSiteInventory', 'cachedSites'];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      await store.clear();
    }
    
    console.log('[InventoryOfflineDB] Cache cleared');
  }

  async getPendingCount() {
    const pending = await this.getPendingTransactions();
    return pending.length;
  }
}

// Export singleton instance
export const inventoryOfflineDB = new InventoryOfflineDB();

