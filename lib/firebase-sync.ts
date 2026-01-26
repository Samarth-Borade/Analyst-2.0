// lib/firebase-sync.ts
// Global Firebase real-time sync manager

import {
  FirebaseConnection,
  initializeFirebaseApp,
  subscribeToRealtimeDatabasePath,
  subscribeToCollection,
  inferSchemaFromDocuments,
  getConnections,
  cleanupConnection,
} from './firebase-connector';
import { useDashboardStore } from './store';

interface ActiveSync {
  connectionId: string;
  path: string;
  dataSourceId: string;
  databaseType: 'firestore' | 'realtime';
  unsubscribe: () => void;
}

// Store active syncs globally
const activeSyncs: Map<string, ActiveSync> = new Map();

/**
 * Start real-time sync for a Firebase data source
 */
export function startFirebaseSync(
  dataSourceId: string,
  connectionId: string,
  path: string,
  databaseType: 'firestore' | 'realtime' = 'realtime'
): boolean {
  // Check if already syncing
  if (activeSyncs.has(dataSourceId)) {
    console.log('Already syncing:', dataSourceId);
    return true;
  }

  // Find the connection
  const connections = getConnections();
  const connection = connections.find(c => c.id === connectionId);
  if (!connection) {
    console.error('Connection not found:', connectionId);
    return false;
  }

  // Initialize Firebase app
  initializeFirebaseApp(connectionId, connection.config);

  // Set up the subscription
  const onUpdate = (data: Record<string, unknown>[]) => {
    const schema = inferSchemaFromDocuments(data);
    console.log('🔥 Firebase live update:', data.length, 'records');

    // Update the store - always update rawData since this is likely the primary source
    const store = useDashboardStore.getState();
    
    // Create a new array reference to ensure React detects the change
    const newData = [...data];
    
    // Find the data source by name (since ID may have changed after backend save)
    const dataSourceName = path + ' (Firebase)';
    const currentDataSource = store.dataSources.find(ds => ds.name === dataSourceName);
    const currentId = currentDataSource?.id || dataSourceId;
    
    console.log('🔄 Updating data source:', currentId, 'found by name:', !!currentDataSource, 'rows:', newData.length);
    
    // Update the data source in the store
    if (currentDataSource) {
      store.updateDataSourceData(currentId, newData, schema);
    }
    
    // Always update rawData and schema - this triggers chart re-renders
    store.setRawData(newData, dataSourceName);
    store.setSchema(schema);
    
    // Also update the data sources array in state to ensure it persists
    useDashboardStore.setState((state) => ({
      dataSources: state.dataSources.map(ds => 
        ds.name === dataSourceName 
          ? { ...ds, data: newData, schema }
          : ds
      ),
    }));
    
    console.log('✅ Store updated, rawData length:', useDashboardStore.getState().rawData?.length);
  };

  const onError = (error: Error) => {
    console.error('Firebase sync error:', error);
    stopFirebaseSync(dataSourceId);
  };

  let unsubscribe: () => void;

  if (databaseType === 'realtime') {
    unsubscribe = subscribeToRealtimeDatabasePath(connectionId, path, onUpdate, onError);
  } else {
    unsubscribe = subscribeToCollection(connectionId, path, onUpdate, onError);
  }

  activeSyncs.set(dataSourceId, {
    connectionId,
    path,
    dataSourceId,
    databaseType,
    unsubscribe,
  });

  console.log('✅ Started Firebase sync for:', path);
  return true;
}

/**
 * Stop real-time sync for a data source
 */
export function stopFirebaseSync(dataSourceId: string): void {
  const sync = activeSyncs.get(dataSourceId);
  if (sync) {
    sync.unsubscribe();
    activeSyncs.delete(dataSourceId);
    console.log('⏹️ Stopped Firebase sync for:', sync.path);
  }
}

/**
 * Stop all active syncs
 */
export function stopAllFirebaseSyncs(): void {
  activeSyncs.forEach((sync, id) => {
    sync.unsubscribe();
  });
  activeSyncs.clear();
  console.log('⏹️ Stopped all Firebase syncs');
}

/**
 * Check if a data source is being synced
 */
export function isFirebaseSyncing(dataSourceId: string): boolean {
  return activeSyncs.has(dataSourceId);
}

/**
 * Get all active syncs
 */
export function getActiveSyncs(): Map<string, ActiveSync> {
  return new Map(activeSyncs);
}
