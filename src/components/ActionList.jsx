/**
 * ActionList - Component for displaying all sync actions
 * 
 * This component demonstrates:
 * - How to display actions with different statuses (pending, completed, failed)
 * - UI updates happen via EventEmitter events through the useSyncActions hook
 * - The component doesn't directly interact with IndexedDB - it receives data via events
 */

import { useSyncActions } from '../hooks/useSyncEvents';
import { ACTION_STATUS } from '../lib/indexedDB';

// Status badge component for visual differentiation
function StatusBadge({ status }) {
  const statusConfig = {
    [ACTION_STATUS.PENDING]: { className: 'status-pending', label: 'Pending' },
    [ACTION_STATUS.COMPLETED]: { className: 'status-completed', label: 'Completed' },
    [ACTION_STATUS.FAILED]: { className: 'status-failed', label: 'Failed' },
  };

  const config = statusConfig[status] || { className: '', label: status };

  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}

// Individual action item component
function ActionItem({ action }) {
  return (
    <div className={`action-item ${action.status}`}>
      <div className="action-header">
        <span className="action-type">{action.type}</span>
        <StatusBadge status={action.status} />
      </div>
      
      <div className="action-body">
        <p className="action-description">
          {action.payload?.description || 'No description'}
        </p>
        
        <div className="action-meta">
          <span>Created: {new Date(action.createdAt).toLocaleString()}</span>
          {action.updatedAt !== action.createdAt && (
            <span>Updated: {new Date(action.updatedAt).toLocaleString()}</span>
          )}
        </div>

        {/* Show result for completed actions */}
        {action.status === ACTION_STATUS.COMPLETED && action.result && (
          <div className="action-result success">
            ✓ {action.result.message}
          </div>
        )}

        {/* Show error for failed actions */}
        {action.status === ACTION_STATUS.FAILED && action.error && (
          <div className="action-result error">
            ✗ Error: {action.error}
          </div>
        )}

        {/* Show processing indicator for pending actions */}
        {action.status === ACTION_STATUS.PENDING && (
          <div className="action-result processing">
            ⏳ Processing...
          </div>
        )}
      </div>
    </div>
  );
}

export function ActionList() {
  // This hook subscribes to EventEmitter events and provides actions state
  // The component re-renders when events are emitted, not through direct state changes
  const { actions, loading } = useSyncActions();

  // Calculate statistics
  const stats = {
    total: actions.length,
    pending: actions.filter(a => a.status === ACTION_STATUS.PENDING).length,
    completed: actions.filter(a => a.status === ACTION_STATUS.COMPLETED).length,
    failed: actions.filter(a => a.status === ACTION_STATUS.FAILED).length,
  };

  if (loading) {
    return (
      <div className="action-list">
        <h2>Actions</h2>
        <div className="loading">Loading actions from IndexedDB...</div>
      </div>
    );
  }

  return (
    <div className="action-list">
      <h2>Actions</h2>
      
      {/* Statistics bar */}
      <div className="stats-bar">
        <span className="stat">Total: {stats.total}</span>
        <span className="stat pending">Pending: {stats.pending}</span>
        <span className="stat completed">Completed: {stats.completed}</span>
        <span className="stat failed">Failed: {stats.failed}</span>
      </div>

      {actions.length === 0 ? (
        <div className="empty-state">
          <p>No actions yet. Create one above!</p>
          <p className="hint">
            Actions persist in IndexedDB and survive page reloads.
          </p>
        </div>
      ) : (
        <div className="actions-container">
          {actions.map(action => (
            <ActionItem key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
