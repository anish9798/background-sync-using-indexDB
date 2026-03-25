/**
 * SyncStatus - Component for displaying background sync status
 * 
 * This component demonstrates:
 * - How to show sync progress using EventEmitter events
 * - Network status awareness (online/offline)
 * - Manual sync trigger capability
 */

import { useState, useEffect } from 'react';
import { useSyncStatus } from '../hooks/useSyncEvents';
import { resumePendingActions } from '../lib/syncManager';
import { clearAllActions } from '../lib/indexedDB';

export function SyncStatus() {
  const { syncing, syncStats } = useSyncStatus();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [clearing, setClearing] = useState(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Manual sync trigger
  const handleManualSync = async () => {
    try {
      await resumePendingActions();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  // Clear all actions (for testing)
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all actions?')) {
      return;
    }
    
    setClearing(true);
    try {
      await clearAllActions();
      // Reload to refresh the UI
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear actions:', error);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="sync-status">
      <div className="status-indicators">
        {/* Network status indicator */}
        <div className={`indicator ${isOnline ? 'online' : 'offline'}`}>
          <span className="indicator-dot"></span>
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Sync status indicator */}
        {syncing && (
          <div className="indicator syncing">
            <span className="indicator-dot pulsing"></span>
            <span>Syncing...</span>
          </div>
        )}
      </div>

      {/* Sync statistics */}
      {syncStats && !syncing && (
        <div className="sync-stats">
          Last sync: {syncStats.completed} completed, {syncStats.failed} failed
        </div>
      )}

      {/* Action buttons */}
      <div className="status-actions">
        <button 
          onClick={handleManualSync} 
          disabled={syncing}
          className="btn-sync"
        >
          {syncing ? 'Syncing...' : 'Manual Sync'}
        </button>
        
        <button 
          onClick={handleClearAll} 
          disabled={clearing || syncing}
          className="btn-clear"
        >
          {clearing ? 'Clearing...' : 'Clear All'}
        </button>
      </div>
    </div>
  );
}
