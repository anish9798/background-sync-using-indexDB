/**
 * ActionForm - Component for creating new sync actions
 * 
 * This component demonstrates:
 * - How user interactions trigger action creation
 * - Actions are queued (saved to IndexedDB) before processing
 * - The UI updates via EventEmitter events, not direct state manipulation
 */

import { useState } from 'react';
import { queueAction } from '../lib/syncManager';

// Predefined action types for demonstration
const ACTION_TYPES = [
  { value: 'FORM_SUBMIT', label: 'Form Submission' },
  { value: 'TASK_CREATE', label: 'Create Task' },
  { value: 'API_REQUEST', label: 'API Request' },
  { value: 'DATA_SYNC', label: 'Data Sync' },
];

export function ActionForm() {
  const [actionType, setActionType] = useState(ACTION_TYPES[0].value);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    setSubmitting(true);
    
    try {
      // Queue the action - this saves to IndexedDB and starts processing
      // The action will persist even if the user closes the tab immediately
      await queueAction(actionType, {
        description: description.trim(),
        timestamp: new Date().toISOString(),
      });
      
      // Clear form after successful queue
      setDescription('');
    } catch (error) {
      console.error('Failed to queue action:', error);
      alert('Failed to queue action. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="action-form">
      <h2>Create New Action</h2>
      <p className="form-description">
        Actions are saved to IndexedDB immediately. Try creating an action and 
        refreshing the page before it completes - it will resume automatically!
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="actionType">Action Type:</label>
          <select
            id="actionType"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            disabled={submitting}
          >
            {ACTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter action description..."
            disabled={submitting}
          />
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Queuing...' : 'Queue Action'}
        </button>
      </form>
    </div>
  );
}
