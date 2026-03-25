/**
 * SyncManager - Handles background sync simulation and action processing
 * 
 * This module simulates background sync behavior without requiring a Service Worker.
 * It demonstrates how pending actions can be:
 * 1. Queued when user performs actions
 * 2. Persisted across page reloads using IndexedDB
 * 3. Automatically resumed and processed on app startup
 * 4. Retried on failure (optional)
 * 
 * In a real-world scenario, this logic could be moved to a Service Worker
 * for true background execution even when the tab is closed.
 */

import { 
  addAction, 
  updateAction, 
  getPendingActions, 
  ACTION_STATUS 
} from './indexedDB';
import { syncEventEmitter, SYNC_EVENTS } from './EventEmitter';

/**
 * Simulates an API call with configurable delay and failure rate
 * In production, this would be replaced with actual fetch/axios calls
 * @param {Object} action - The action to process
 * @returns {Promise<Object>} Simulated API response
 */
async function simulateApiCall(action) {
  // Simulate network latency (1-3 seconds)
  const delay = 1000 + Math.random() * 2000;
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate 10% failure rate to demonstrate error handling
      if (Math.random() < 0.1) {
        reject(new Error('Simulated network error'));
      } else {
        resolve({
          success: true,
          message: `Action "${action.type}" processed successfully`,
          processedAt: new Date().toISOString(),
        });
      }
    }, delay);
  });
}

/**
 * Processes a single action - makes the API call and updates status
 * @param {Object} action - The action to process
 * @returns {Promise<Object>} The updated action
 */
async function processAction(action) {
  // Emit event that action processing has started
  syncEventEmitter.emit(SYNC_EVENTS.ACTION_RESUMED, action);
  
  try {
    // Attempt to process the action (simulated API call)
    const result = await simulateApiCall(action);
    
    // Update action status to completed in IndexedDB
    const updatedAction = await updateAction(action.id, {
      status: ACTION_STATUS.COMPLETED,
      result,
    });
    
    return updatedAction;
  } catch (error) {
    // Update action status to failed in IndexedDB
    const updatedAction = await updateAction(action.id, {
      status: ACTION_STATUS.FAILED,
      error: error.message,
    });
    
    return updatedAction;
  }
}

/**
 * Queues a new action for background processing
 * The action is immediately saved to IndexedDB with pending status,
 * then processing begins asynchronously
 * @param {string} type - The type of action (e.g., 'FORM_SUBMIT', 'TASK_CREATE')
 * @param {Object} payload - The action payload/data
 * @returns {Promise<Object>} The created action
 */
export async function queueAction(type, payload) {
  // Save action to IndexedDB first (persistence before processing)
  // This ensures the action survives even if the page is closed immediately
  const action = await addAction({ type, payload });
  
  // Start processing asynchronously (don't await - let it run in background)
  // This simulates background sync behavior
  processAction(action).catch(console.error);
  
  return action;
}

/**
 * Resumes processing of all pending actions
 * Called on app startup to handle actions that were interrupted
 * (e.g., user closed tab before action completed)
 * @returns {Promise<void>}
 */
export async function resumePendingActions() {
  // Get all pending actions from IndexedDB
  const pendingActions = await getPendingActions();
  
  if (pendingActions.length === 0) {
    console.log('No pending actions to resume');
    return;
  }
  
  console.log(`Resuming ${pendingActions.length} pending action(s)...`);
  
  // Emit event that sync process has started
  syncEventEmitter.emit(SYNC_EVENTS.SYNC_STARTED, { 
    count: pendingActions.length 
  });
  
  // Process all pending actions
  // Using Promise.allSettled to ensure all actions are attempted
  // even if some fail
  const results = await Promise.allSettled(
    pendingActions.map(action => processAction(action))
  );
  
  // Log results for debugging
  const completed = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`Sync complete: ${completed} succeeded, ${failed} failed`);
  
  // Emit event that sync process has completed
  syncEventEmitter.emit(SYNC_EVENTS.SYNC_COMPLETED, { 
    completed, 
    failed,
    total: pendingActions.length 
  });
}

/**
 * Checks if the browser is online
 * Can be used to delay sync until network is available
 * @returns {boolean} True if online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Sets up network status listeners for automatic sync
 * When coming back online, automatically resume pending actions
 */
export function setupNetworkListeners() {
  window.addEventListener('online', () => {
    console.log('Network connection restored. Resuming pending actions...');
    resumePendingActions();
  });
  
  window.addEventListener('offline', () => {
    console.log('Network connection lost. Actions will be queued.');
  });
}
