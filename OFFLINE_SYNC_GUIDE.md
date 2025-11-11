# Offline Sync System Guide

## Overview

The NFG App now supports offline functionality with automatic sync when the connection is restored. Operations performed while offline are queued and automatically synced when the app comes back online.

## Features

✅ **Automatic Queueing** - Operations are automatically queued when offline  
✅ **Background Sync** - Syncs automatically when connection is restored  
✅ **Visual Indicators** - Shows offline status and pending operations  
✅ **Retry Logic** - Failed operations are retried automatically  
✅ **Conflict Handling** - Handles conflicts when data changes while offline  

## How It Works

### 1. Offline Detection
The app automatically detects when you're offline using the browser's `navigator.onLine` API and network events.

### 2. Operation Queueing
When offline, operations are stored in localStorage with:
- Operation type (create, update, delete)
- Table name
- Data payload
- Timestamp
- Retry count

### 3. Automatic Sync
When the app comes back online:
- All queued operations are processed sequentially
- Failed operations are retried up to 3 times
- Success notifications are shown
- Failed operations can be manually retried

### 4. Visual Indicators
- **Online Indicator** (green) - All systems operational
- **Offline Indicator** (red) - Working offline, changes queued
- **Sync Pending** (orange) - Operations waiting to sync
- **Sync Progress** - Shows sync status

## Supported Operations

The following tables support offline sync:
- `jobs` - Job creation, updates, deletions
- `sites` - Site creation, updates, deletions
- `bookings` - Booking creation, updates, cancellations
- `inventory_transactions` - Inventory stock changes
- `time_entries` - Time tracking entries

## Usage

### Manual Queueing

To manually queue an operation when offline:

```javascript
import { queueOperation, OPERATION_TYPES, SYNCABLE_TABLES } from './js/offline-sync.js';

// Queue a create operation
const operationId = queueOperation(
  SYNCABLE_TABLES.JOBS,
  OPERATION_TYPES.CREATE,
  { title: 'New Job', site_id: 1, status: 'pending' }
);

// Queue an update operation
queueOperation(
  SYNCABLE_TABLES.JOBS,
  OPERATION_TYPES.UPDATE,
  { status: 'completed' },
  'job-id-here'
);

// Queue a delete operation
queueOperation(
  SYNCABLE_TABLES.JOBS,
  OPERATION_TYPES.DELETE,
  null,
  'job-id-here'
);
```

### Manual Sync

To manually trigger a sync:

```javascript
import { syncOfflineQueue } from './js/offline-sync.js';

// Sync all pending operations
const result = await syncOfflineQueue();
console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);
```

### Check Sync Status

```javascript
import { 
  getPendingOperationsCount, 
  getFailedOperationsCount,
  getQueuedOperations 
} from './js/offline-sync.js';

// Get counts
const pending = getPendingOperationsCount();
const failed = getFailedOperationsCount();

// Get all queued operations
const operations = getQueuedOperations();
```

### Retry Failed Operations

```javascript
import { retryFailedOperations } from './js/offline-sync.js';

// Retry all failed operations
await retryFailedOperations();
```

## Integration Example

Here's how to integrate offline sync into your operations. The system automatically detects offline status, but you can also manually queue operations:

### Basic Integration

```javascript
import { supabase } from './js/supabase.js';
import { queueOperation, isOnline, OPERATION_TYPES, SYNCABLE_TABLES } from './js/offline-sync.js';

async function createJob(jobData) {
  try {
    // Try to execute online
    if (isOnline()) {
      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Queue for offline sync
      const operationId = queueOperation(
        SYNCABLE_TABLES.JOBS,
        OPERATION_TYPES.CREATE,
        jobData
      );
      
      // Return temporary data
      return {
        ...jobData,
        id: `temp_${operationId}`,
        _queued: true
      };
    }
  } catch (error) {
    // If online operation fails due to network, queue it
    if (!navigator.onLine || error.message.includes('network') || error.message.includes('fetch')) {
      const operationId = queueOperation(
        SYNCABLE_TABLES.JOBS,
        OPERATION_TYPES.CREATE,
        jobData
      );
      return {
        ...jobData,
        id: `temp_${operationId}`,
        _queued: true
      };
    }
    throw error;
  }
}
```

### Helper Function for Easy Integration

```javascript
import { supabase } from './js/supabase.js';
import { queueOperation, isOnline, OPERATION_TYPES, SYNCABLE_TABLES } from './js/offline-sync.js';

/**
 * Execute a Supabase operation with automatic offline queuing
 */
async function executeWithOfflineFallback(table, operation, data, id = null) {
  // Check if online
  if (!isOnline()) {
    // Queue operation
    const operationId = queueOperation(table, operation, data, id);
    return {
      data: { ...data, id: id || `temp_${operationId}`, _queued: true },
      error: null,
      queued: true
    };
  }

  // Execute online
  try {
    let result;
    switch (operation) {
      case OPERATION_TYPES.CREATE:
        result = await supabase.from(table).insert(data).select().single();
        break;
      case OPERATION_TYPES.UPDATE:
        result = await supabase.from(table).update(data).eq('id', id).select().single();
        break;
      case OPERATION_TYPES.DELETE:
        result = await supabase.from(table).delete().eq('id', id);
        break;
    }
    
    if (result.error) throw result.error;
    return result;
  } catch (error) {
    // If network error, queue operation
    if (!navigator.onLine || error.message?.includes('network') || error.message?.includes('fetch')) {
      const operationId = queueOperation(table, operation, data, id);
      return {
        data: { ...data, id: id || `temp_${operationId}`, _queued: true },
        error: null,
        queued: true
      };
    }
    throw error;
  }
}

// Usage:
// const result = await executeWithOfflineFallback('jobs', OPERATION_TYPES.CREATE, jobData);
```

## UI Components

### Offline Indicator

The offline indicator appears in the bottom-right corner when:
- The app is offline
- There are pending sync operations
- There are failed operations

**Actions Available:**
- **Sync Now** - Manually trigger sync
- **Retry Failed** - Retry all failed operations
- **Clear Failed** - Remove failed operations from queue

### Status Colors

- 🟢 **Green** - Online and synced
- 🔴 **Red** - Offline mode
- 🟠 **Orange** - Sync pending or failed operations

## Background Sync

The service worker automatically registers for background sync. When the browser detects the app is back online, it will:
1. Trigger the sync event
2. Process all queued operations
3. Notify the app when sync is complete

## Storage Limits

- Maximum queue size: 50 operations (oldest are removed if limit is reached)
- Operations are stored in localStorage
- Each operation is ~1-5KB depending on data size

## Error Handling

### Failed Operations

Operations that fail after 3 retry attempts are marked as "failed" and:
- Remain in the queue
- Can be manually retried
- Can be cleared from the queue
- Show in the UI indicator

### Conflict Resolution

When syncing, if a record was modified while offline:
- The offline change takes precedence
- The latest timestamp wins
- Conflicts are logged for review

## Testing Offline Mode

### Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Offline" from the throttling dropdown
4. Perform operations in the app
5. Switch back to "Online"
6. Watch operations sync automatically

### Manual Testing

1. Disconnect your internet
2. Perform operations (create job, update site, etc.)
3. Check the offline indicator shows queued operations
4. Reconnect internet
5. Watch operations sync automatically

## Troubleshooting

### Operations Not Syncing

1. Check if you're online: `navigator.onLine`
2. Check console for sync errors
3. Manually trigger sync: `syncOfflineQueue()`
4. Check localStorage for queued operations

### Storage Full

If localStorage is full:
- Oldest operations are automatically removed
- Consider clearing failed operations
- Reduce operation payload size

### Sync Failing

1. Check network connection
2. Verify Supabase credentials
3. Check RLS policies allow the operation
4. Review error messages in console

## Best Practices

1. **Always check online status** before critical operations
2. **Show user feedback** when operations are queued
3. **Handle temporary IDs** for queued operations in UI
4. **Test offline scenarios** regularly
5. **Monitor sync status** in production

## API Reference

### `queueOperation(table, operation, data, id)`
Queue an operation for offline sync.

### `syncOfflineQueue()`
Sync all queued operations.

### `getPendingOperationsCount()`
Get count of pending operations.

### `getFailedOperationsCount()`
Get count of failed operations.

### `retryFailedOperations()`
Retry all failed operations.

### `clearFailedOperations()`
Clear all failed operations from queue.

### `isOnline()`
Check if app is online.

## Support

For issues or questions:
1. Check console logs for errors
2. Review this documentation
3. Check Supabase logs for sync errors
4. Contact support if issues persist

---

**Last Updated:** 2025-01-10  
**Version:** 1.0.0

