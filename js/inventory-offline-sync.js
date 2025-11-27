/**
 * Inventory Offline Sync Manager
 * Handles syncing pending inventory transactions when connection is restored
 */

import { supabase } from './supabase.js';
import { inventoryOfflineDB } from './inventory-offline-db.js';
import { toast } from './notifications.js';

class InventoryOfflineSyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncInterval = null;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.startAutoSync();
      this.showOnlineNotification();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stopAutoSync();
      this.showOfflineNotification();
    });
    
    // Start auto-sync if online
    if (this.isOnline) {
      this.startAutoSync();
    }
  }

  startAutoSync() {
    if (this.syncInterval) return;
    
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingTransactions();
      }
    }, 30000);
    
    // Immediate sync when coming online
    this.syncPendingTransactions();
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncPendingTransactions() {
    if (this.syncInProgress || !this.isOnline) return;
    
    const pendingCount = await inventoryOfflineDB.getPendingCount();
    if (pendingCount === 0) {
      return;
    }
    
    this.syncInProgress = true;
    this.showSyncIndicator(true);
    
    try {
      const pendingTransactions = await inventoryOfflineDB.getPendingTransactions();
      
      let successCount = 0;
      let failCount = 0;
      
      for (const pendingTx of pendingTransactions) {
        try {
          await this.syncTransaction(pendingTx);
          await inventoryOfflineDB.markTransactionSynced(pendingTx.id);
          successCount++;
        } catch (error) {
          console.error('[InventoryOfflineSync] Sync failed:', error);
          failCount++;
          
          // Increment retry count
          await inventoryOfflineDB.incrementRetryCount(pendingTx.id);
          
          // If retry count exceeds 3, mark as failed
          if ((pendingTx.retry_count || 0) >= 3) {
            console.error('[InventoryOfflineSync] Transaction failed after 3 retries:', pendingTx.id);
          }
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} transaction(s) synced`, 'Sync Complete');
      }
      if (failCount > 0) {
        toast.error(`${failCount} transaction(s) failed to sync`, 'Sync Error');
      }
      
    } catch (error) {
      console.error('[InventoryOfflineSync] Sync process failed:', error);
      toast.error('Sync failed. Will retry automatically.', 'Sync Error');
    } finally {
      this.syncInProgress = false;
      this.showSyncIndicator(false);
    }
  }

  async syncTransaction(pendingTx) {
    // Get photo blobs if any
    const photoBlobs = await inventoryOfflineDB.getPhotoBlobs(pendingTx.id);
    const photoUrls = [];
    
    // Upload photos first
    if (photoBlobs && photoBlobs.length > 0) {
      for (const photoBlob of photoBlobs) {
        if (photoBlob.uploaded && photoBlob.photo_url) {
          // Already uploaded, use existing URL
          photoUrls.push(photoBlob.photo_url);
        } else {
          // Upload photo
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const timestamp = Date.now();
            const fileName = `inventory-transactions/${user.id}/${timestamp}_${pendingTx.id}_${photoBlob.id}.jpg`;
            
            const { error: uploadError } = await supabase.storage
              .from('job-photos')
              .upload(fileName, photoBlob.blob, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
              .from('job-photos')
              .getPublicUrl(fileName);
            
            if (urlData?.publicUrl) {
              photoUrls.push(urlData.publicUrl);
              
              // Mark photo as uploaded
              await inventoryOfflineDB.markPhotoUploaded(photoBlob.id, urlData.publicUrl);
            }
          } catch (error) {
            console.error('[InventoryOfflineSync] Photo upload failed:', error);
            // Continue without this photo
          }
        }
      }
    }
    
    // Create inventory transaction
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const transactionData = {
      item_id: pendingTx.item_id,
      site_id: pendingTx.site_id,
      job_id: pendingTx.job_id || null,
      transaction_type: pendingTx.transaction_type,
      quantity_change: pendingTx.quantity_change,
      quantity_before: pendingTx.quantity_before,
      quantity_after: pendingTx.quantity_after,
      user_id: user.id,
      notes: pendingTx.notes || null,
      photo_urls: photoUrls.length > 0 ? photoUrls : null
    };
    
    const { error: txError } = await supabase
      .from('inventory_transactions')
      .insert(transactionData);
    
    if (txError) throw txError;
    
    // Update site inventory quantity
    const { error: updateError } = await supabase
      .from('site_inventory')
      .update({ 
        quantity: pendingTx.quantity_after,
        updated_at: new Date().toISOString()
      })
      .eq('site_id', pendingTx.site_id)
      .eq('item_id', pendingTx.item_id);
    
    if (updateError) {
      console.warn('[InventoryOfflineSync] Failed to update site inventory:', updateError);
      // Don't throw - transaction was created successfully
    }
    
    // Update cached inventory
    await inventoryOfflineDB.updateCachedSiteInventoryQuantity(
      pendingTx.site_id,
      pendingTx.item_id,
      pendingTx.quantity_after
    );
    
    // Clean up photo blobs after successful sync
    if (photoBlobs && photoBlobs.length > 0) {
      for (const photoBlob of photoBlobs) {
        await inventoryOfflineDB.deletePhotoBlob(photoBlob.id);
      }
    }
  }

  showSyncIndicator(show) {
    // Dispatch custom event for UI to listen to
    window.dispatchEvent(new CustomEvent('inventory-sync-status', {
      detail: { inProgress: show }
    }));
  }

  showOnlineNotification() {
    toast.success('Back online - Syncing inventory changes...', 'Connection Restored');
  }

  showOfflineNotification() {
    toast.info('Working offline. Changes will sync when connection is restored.', 'Offline Mode');
  }

  async getPendingCount() {
    return await inventoryOfflineDB.getPendingCount();
  }
}

// Export singleton instance
export const inventorySyncManager = new InventoryOfflineSyncManager();

