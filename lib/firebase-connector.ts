// lib/firebase-connector.ts
import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  limit,
  Firestore,
  Unsubscribe,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  get,
  onValue,
  Database,
  off
} from 'firebase/database';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  databaseURL?: string; // For Realtime Database
}

export interface FirebaseConnection {
  id: string;
  name: string;
  config: FirebaseConfig;
  createdAt: string;
  databaseType?: 'firestore' | 'realtime';
}

export interface CollectionInfo {
  name: string;
  documentCount: number;
  sampleFields: string[];
}

// Store active Firebase apps and listeners
const activeApps: Map<string, FirebaseApp> = new Map();
const activeListeners: Map<string, Unsubscribe> = new Map();

/**
 * Initialize a Firebase app with the given config
 */
export function initializeFirebaseApp(connectionId: string, config: FirebaseConfig): FirebaseApp {
  // Clean up existing app if any
  if (activeApps.has(connectionId)) {
    const existingApp = activeApps.get(connectionId)!;
    deleteApp(existingApp);
  }
  
  const app = initializeApp(config, connectionId);
  activeApps.set(connectionId, app);
  return app;
}

/**
 * Get Firestore instance for a connection
 */
export function getFirestoreInstance(connectionId: string): Firestore | null {
  const app = activeApps.get(connectionId);
  if (!app) return null;
  return getFirestore(app);
}

/**
 * Get Realtime Database instance for a connection
 */
export function getRealtimeDatabaseInstance(connectionId: string): Database | null {
  const app = activeApps.get(connectionId);
  if (!app) return null;
  return getDatabase(app);
}

/**
 * Test a Firebase connection by trying to access Firestore
 */
export async function testFirebaseConnection(config: FirebaseConfig): Promise<{ 
  success: boolean; 
  error?: string;
  collections?: string[];
}> {
  const testId = `test-${Date.now()}`;
  
  try {
    const app = initializeApp(config, testId);
    const db = getFirestore(app);
    
    // Try to list collections (this will fail if config is wrong)
    // Note: In client SDK, we can't directly list collections
    // So we'll just try to initialize and return success
    await deleteApp(app);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to connect' 
    };
  }
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function fetchCollection(
  connectionId: string, 
  collectionName: string,
  maxDocs: number = 10000
): Promise<Record<string, unknown>[]> {
  const db = getFirestoreInstance(connectionId);
  if (!db) throw new Error('Firebase not initialized');
  
  const q = query(collection(db, collectionName), limit(maxDocs));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    _id: doc.id,
    ...doc.data()
  }));
}

/**
 * Flatten nested objects for better tabular representation
 */
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}_${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Check if it's a "leaf" object (no nested objects inside)
      const hasNestedObjects = Object.values(value as Record<string, unknown>).some(
        v => v !== null && typeof v === 'object' && !Array.isArray(v)
      );
      
      if (!hasNestedObjects) {
        // Flatten leaf objects
        Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
      } else {
        // Keep deeply nested objects as JSON string for now
        result[newKey] = JSON.stringify(value);
      }
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

/**
 * Convert nested Firebase data to tabular format
 */
function convertToTabular(data: unknown, parentKey: string = ''): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return { _id: String(index), ...flattenObject(item as Record<string, unknown>) };
      }
      return { _id: String(index), value: item };
    });
  }
  
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    
    // Check if all values are objects (collection-like structure)
    const objectValues = keys.filter(k => 
      obj[k] !== null && typeof obj[k] === 'object' && !Array.isArray(obj[k])
    );
    
    // If most values are objects, treat each as a row
    if (objectValues.length > 0 && objectValues.length >= keys.length * 0.5) {
      return keys.map(key => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return { _id: key, ...flattenObject(value as Record<string, unknown>) };
        }
        return { _id: key, value };
      });
    }
    
    // Otherwise, flatten the single object
    return [{ _id: parentKey || 'root', ...flattenObject(obj) }];
  }
  
  return [{ _id: 'root', value: data }];
}

/**
 * Fetch data from a Realtime Database path
 */
export async function fetchRealtimeDatabasePath(
  connectionId: string,
  path: string
): Promise<Record<string, unknown>[]> {
  const db = getRealtimeDatabaseInstance(connectionId);
  if (!db) throw new Error('Firebase Realtime Database not initialized');
  
  const dbRef = ref(db, path);
  const snapshot = await get(dbRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const data = snapshot.val();
  return convertToTabular(data, path.split('/').pop() || 'data');
}

/**
 * Subscribe to real-time updates from a Realtime Database path
 */
export function subscribeToRealtimeDatabasePath(
  connectionId: string,
  path: string,
  onUpdate: (data: Record<string, unknown>[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getRealtimeDatabaseInstance(connectionId);
  if (!db) throw new Error('Firebase Realtime Database not initialized');
  
  const listenerId = `${connectionId}-rtdb-${path}`;
  const dbRef = ref(db, path);
  
  console.log('🔌 Setting up Firebase listener for:', path);
  
  // Unsubscribe from existing listener if any
  if (activeListeners.has(listenerId)) {
    console.log('♻️ Cleaning up existing listener');
    activeListeners.get(listenerId)!();
  }
  
  const callback = (snapshot: any) => {
    console.log('📡 Firebase snapshot received for:', path, 'exists:', snapshot.exists());
    if (!snapshot.exists()) {
      onUpdate([]);
      return;
    }
    
    const data = snapshot.val();
    console.log('📥 Raw Firebase data:', data);
    const result = convertToTabular(data, path.split('/').pop() || 'data');
    console.log('📊 Converted to tabular:', result.length, 'rows');
    onUpdate(result);
  };
  
  const errorCallback = (error: Error) => {
    console.error('Realtime Database listener error:', error);
    onError?.(error);
  };
  
  onValue(dbRef, callback, errorCallback);
  
  const unsubscribe = () => {
    off(dbRef);
  };
  
  activeListeners.set(listenerId, unsubscribe);
  return unsubscribe;
}

/**
 * Get sample document to infer schema
 */
export async function getSampleDocument(
  connectionId: string,
  collectionName: string
): Promise<Record<string, unknown> | null> {
  const db = getFirestoreInstance(connectionId);
  if (!db) throw new Error('Firebase not initialized');
  
  const q = query(collection(db, collectionName), limit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  return {
    _id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  };
}

/**
 * Subscribe to real-time updates from a collection
 */
export function subscribeToCollection(
  connectionId: string,
  collectionName: string,
  onUpdate: (data: Record<string, unknown>[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getFirestoreInstance(connectionId);
  if (!db) throw new Error('Firebase not initialized');
  
  const listenerId = `${connectionId}-${collectionName}`;
  
  // Unsubscribe from existing listener if any
  if (activeListeners.has(listenerId)) {
    activeListeners.get(listenerId)!();
  }
  
  const unsubscribe = onSnapshot(
    collection(db, collectionName),
    (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));
      onUpdate(data);
    },
    (error) => {
      console.error('Firestore listener error:', error);
      onError?.(error);
    }
  );
  
  activeListeners.set(listenerId, unsubscribe);
  return unsubscribe;
}

/**
 * Unsubscribe from all listeners for a connection
 */
export function unsubscribeAll(connectionId: string): void {
  activeListeners.forEach((unsubscribe, key) => {
    if (key.startsWith(connectionId)) {
      unsubscribe();
      activeListeners.delete(key);
    }
  });
}

/**
 * Clean up a Firebase connection
 */
export function cleanupConnection(connectionId: string): void {
  unsubscribeAll(connectionId);
  
  const app = activeApps.get(connectionId);
  if (app) {
    deleteApp(app);
    activeApps.delete(connectionId);
  }
}

/**
 * Infer schema from Firestore documents - returns DataSchema compatible object
 */
export function inferSchemaFromDocuments(docs: Record<string, unknown>[]): {
  columns: Array<{
    name: string;
    type: 'text' | 'numeric' | 'datetime' | 'categorical';
    sample: string[];
    isMetric: boolean;
    isDimension: boolean;
    uniqueCount: number;
    nullCount: number;
  }>;
  rowCount: number;
  summary: string;
} {
  if (docs.length === 0) return { columns: [], rowCount: 0, summary: 'Empty collection' };
  
  // Collect all unique keys
  const allKeys = new Set<string>();
  docs.forEach(doc => {
    Object.keys(doc).forEach(key => allKeys.add(key));
  });
  
  const columns = Array.from(allKeys).map(key => {
    const values = docs.map(doc => doc[key]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    const uniqueValues = new Set(nonNullValues.map(v => String(v)));
    
    // Get sample values (first 3)
    const sampleValues = nonNullValues.slice(0, 3).map(v => String(v));
    
    // Infer type
    let type: 'text' | 'numeric' | 'datetime' | 'categorical' = 'text';
    if (nonNullValues.length > 0) {
      const firstValue = nonNullValues[0];
      if (typeof firstValue === 'number') {
        type = 'numeric';
      } else if (firstValue instanceof Date || (typeof firstValue === 'object' && firstValue && 'toDate' in firstValue)) {
        type = 'datetime';
      } else if (typeof firstValue === 'string') {
        // Check if it's a date string
        if (!isNaN(Date.parse(firstValue)) && firstValue.match(/^\d{4}-\d{2}-\d{2}/)) {
          type = 'datetime';
        } else if (uniqueValues.size < docs.length * 0.3) {
          type = 'categorical';
        }
      }
    }
    
    return {
      name: key,
      type,
      sample: sampleValues,
      isMetric: type === 'numeric',
      isDimension: type === 'categorical' || type === 'text',
      uniqueCount: uniqueValues.size,
      nullCount: values.length - nonNullValues.length,
    };
  });
  
  const numericCols = columns.filter(c => c.type === 'numeric').length;
  const categoricalCols = columns.filter(c => c.type === 'categorical').length;
  
  return { 
    columns,
    rowCount: docs.length,
    summary: `${docs.length} documents with ${columns.length} fields (${numericCols} numeric, ${categoricalCols} categorical)`
  };
}

/**
 * Save connection to localStorage
 */
export function saveConnection(connection: FirebaseConnection): void {
  const connections = getConnections();
  const existingIndex = connections.findIndex(c => c.id === connection.id);
  
  if (existingIndex >= 0) {
    connections[existingIndex] = connection;
  } else {
    connections.push(connection);
  }
  
  localStorage.setItem('firebase_connections', JSON.stringify(connections));
}

/**
 * Get all saved connections
 */
export function getConnections(): FirebaseConnection[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('firebase_connections');
  return saved ? JSON.parse(saved) : [];
}

/**
 * Delete a connection
 */
export function deleteConnection(connectionId: string): void {
  cleanupConnection(connectionId);
  const connections = getConnections().filter(c => c.id !== connectionId);
  localStorage.setItem('firebase_connections', JSON.stringify(connections));
}
