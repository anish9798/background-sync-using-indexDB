/**
 * useSyncEvents - Custom React hook for subscribing to EventEmitter events
 * 
 * This hook demonstrates how to integrate a JavaScript EventEmitter with React.
 * Key concepts:
 * - The EventEmitter operates independently of React's state system
 * - This hook bridges the gap by subscribing to events and updating React state
 * - Proper cleanup in useEffect prevents memory leaks
 * - The hook abstracts away subscription management from components
 */

import { useEffect, useState, useCallback } from 'react';
import { syncEventEmitter, SYNC_EVENTS } from '../lib/EventEmitter';
import { getAllActions } from '../lib/indexedDB';

/**
 * Hook to subscribe to sync events and maintain actions state
 * @returns {Object} { actions, loading, refreshActions }
 */
export function useSyncActions() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to refresh actions from IndexedDB
  const refreshActions = useCallback(async () => {
    try {
      const allActions = await getAllActions();
      setActions(allActions);
    } catch (error) {
      console.error('Failed to refresh actions:', error);
    }
  }, []);

  // Initial load of actions from IndexedDB
  useEffect(() => {
    const loadActions = async () => {
      setLoading(true);
      await refreshActions();
      setLoading(false);
    };
    loadActions();
  }, [refreshActions]);

  // Subscribe to EventEmitter events to update state
  // This is where the EventEmitter integrates with React
  useEffect(() => {
    // Handler for when a new action is added
    const handleActionAdded = (action) => {
      console.log('Event received: ACTION_ADDED', action);
      // Add new action to the beginning of the list
      setActions(prev => [action, ...prev]);
    };

    // Handler for when an action is completed
    const handleActionCompleted = (action) => {
      console.log('Event received: ACTION_COMPLETED', action);
      // Update the action in the list
      setActions(prev => 
        prev.map(a => a.id === action.id ? action : a)
      );
    };

    // Handler for when an action fails
    const handleActionFailed = (action) => {
      console.log('Event received: ACTION_FAILED', action);
      // Update the action in the list
      setActions(prev => 
        prev.map(a => a.id === action.id ? action : a)
      );
    };

    // Handler for when an action starts being processed (resumed)
    const handleActionResumed = (action) => {
      console.log('Event received: ACTION_RESUMED', action);
      // Could add a 'processing' visual state here if needed
    };

    // Subscribe to all relevant events
    // The on() method returns an unsubscribe function
    const unsubscribeAdded = syncEventEmitter.on(
      SYNC_EVENTS.ACTION_ADDED, 
      handleActionAdded
    );
    const unsubscribeCompleted = syncEventEmitter.on(
      SYNC_EVENTS.ACTION_COMPLETED, 
      handleActionCompleted
    );
    const unsubscribeFailed = syncEventEmitter.on(
      SYNC_EVENTS.ACTION_FAILED, 
      handleActionFailed
    );
    const unsubscribeResumed = syncEventEmitter.on(
      SYNC_EVENTS.ACTION_RESUMED, 
      handleActionResumed
    );

    // Cleanup: unsubscribe from all events when component unmounts
    // This prevents memory leaks and stale callbacks
    return () => {
      unsubscribeAdded();
      unsubscribeCompleted();
      unsubscribeFailed();
      unsubscribeResumed();
    };
  }, []); // Empty dependency array - subscribe once on mount

  return { actions, loading, refreshActions };
}

/**
 * Hook to subscribe to sync process events (started/completed)
 * @returns {Object} { syncing, syncStats }
 */
export function useSyncStatus() {
  const [syncing, setSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState(null);

  useEffect(() => {
    const handleSyncStarted = (data) => {
      console.log('Event received: SYNC_STARTED', data);
      setSyncing(true);
      setSyncStats({ pending: data.count });
    };

    const handleSyncCompleted = (data) => {
      console.log('Event received: SYNC_COMPLETED', data);
      setSyncing(false);
      setSyncStats(data);
    };

    const unsubscribeStarted = syncEventEmitter.on(
      SYNC_EVENTS.SYNC_STARTED, 
      handleSyncStarted
    );
    const unsubscribeCompleted = syncEventEmitter.on(
      SYNC_EVENTS.SYNC_COMPLETED, 
      handleSyncCompleted
    );

    return () => {
      unsubscribeStarted();
      unsubscribeCompleted();
    };
  }, []);

  return { syncing, syncStats };
}
