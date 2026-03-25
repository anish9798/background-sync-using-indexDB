/**
 * IndexedDB Helper - Manages persistent storage for sync actions
 * 
 * IndexedDB is a low-level browser API for storing significant amounts of structured data.
 * Unlike localStorage, IndexedDB:
 * - Supports larger storage limits
 * - Allows indexing for efficient queries
 * - Works asynchronously (non-blocking)
 * - Persists across browser sessions, tab closures, and page reloads
 * 
 * This module provides a Promise-based wrapper around IndexedDB operations
 * specifically designed for storing and managing sync actions.
 */

import { syncEventEmitter, SYNC_EVENTS } from './EventEmitter';

// Database configuration constants
const DB_NAME = 'BackgroundSyncDB';
const DB_VERSION = 1;
const STORE_NAME = 'syncActions';

// Action status constants
export const ACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Opens a connection to the IndexedDB database
 * Creates the database and object store if they don't exist
 * @returns {Promise<IDBDatabase>} The database connection
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    // Request to open (or create) the database
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Called when database needs to be created or upgraded
    // This is where we define our schema (object stores and indexes)
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store if it doesn't exist
      // keyPath: 'id' means each record must have an 'id' property as primary key
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create an index on 'status' field for efficient querying of pending actions
        // This allows us to quickly find all actions with status='pending'
        store.createIndex('status', 'status', { unique: false });
        
        // Create an index on 'createdAt' for ordering actions chronologically
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to open database: ${event.target.error}`));
    };
  });
}

/**
 * Adds a new action to IndexedDB with pending status
 * @param {Object} actionData - The action data (type, payload, etc.)
 * @returns {Promise<Object>} The created action with id and timestamps
 */
export async function addAction(actionData) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    // All IndexedDB operations happen within transactions
    // 'readwrite' mode allows both reading and writing
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Create the action object with metadata
    const action = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...actionData,
      status: ACTION_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const request = store.add(action);

    request.onsuccess = () => {
      // Emit event to notify listeners that a new action was added
      // This allows React components to update without direct coupling
      syncEventEmitter.emit(SYNC_EVENTS.ACTION_ADDED, action);
      resolve(action);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to add action: ${event.target.error}`));
    };

    // Close database connection when transaction completes
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Updates an existing action's status and data
 * @param {string} id - The action ID to update
 * @param {Object} updates - Fields to update (status, result, error, etc.)
 * @returns {Promise<Object>} The updated action
 */
export async function updateAction(id, updates) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // First, get the existing action
    const getRequest = store.get(id);

    getRequest.onsuccess = (event) => {
      const action = event.target.result;
      if (!action) {
        reject(new Error(`Action not found: ${id}`));
        return;
      }

      // Merge updates with existing action
      const updatedAction = {
        ...action,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Put the updated action back (overwrites existing)
      const putRequest = store.put(updatedAction);

      putRequest.onsuccess = () => {
        // Emit appropriate event based on new status
        if (updates.status === ACTION_STATUS.COMPLETED) {
          syncEventEmitter.emit(SYNC_EVENTS.ACTION_COMPLETED, updatedAction);
        } else if (updates.status === ACTION_STATUS.FAILED) {
          syncEventEmitter.emit(SYNC_EVENTS.ACTION_FAILED, updatedAction);
        }
        resolve(updatedAction);
      };

      putRequest.onerror = (event) => {
        reject(new Error(`Failed to update action: ${event.target.error}`));
      };
    };

    getRequest.onerror = (event) => {
      reject(new Error(`Failed to get action: ${event.target.error}`));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Retrieves all actions from IndexedDB
 * @returns {Promise<Array>} Array of all actions
 */
export async function getAllActions() {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // getAll() retrieves all records from the store
    const request = store.getAll();

    request.onsuccess = (event) => {
      // Sort by createdAt descending (newest first)
      const actions = event.target.result.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      resolve(actions);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to get actions: ${event.target.error}`));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Retrieves only pending actions from IndexedDB
 * Uses the status index for efficient querying
 * @returns {Promise<Array>} Array of pending actions
 */
export async function getPendingActions() {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // Use the status index to efficiently query pending actions
    const index = store.index('status');
    const request = index.getAll(ACTION_STATUS.PENDING);

    request.onsuccess = (event) => {
      // Sort by createdAt ascending (oldest first - FIFO processing)
      const actions = event.target.result.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      resolve(actions);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to get pending actions: ${event.target.error}`));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Deletes an action from IndexedDB
 * @param {string} id - The action ID to delete
 * @returns {Promise<void>}
 */
export async function deleteAction(id) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to delete action: ${event.target.error}`));
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clears all actions from IndexedDB
 * Useful for testing or resetting the application state
 * @returns {Promise<void>}
 */
export async function clearAllActions() {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to clear actions: ${event.target.error}`));
    };

    transaction.oncomplete = () => db.close();
  });
}
