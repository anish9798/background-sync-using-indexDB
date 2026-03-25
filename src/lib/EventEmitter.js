/**
 * EventEmitter - A lightweight custom event emitter implementation
 * 
 * This class provides a pub/sub pattern that allows different parts of the application
 * to communicate without direct dependencies. It works independently of React's state
 * management, enabling decoupled architecture.
 * 
 * Key concepts:
 * - Events are identified by string names (e.g., 'action:added', 'action:completed')
 * - Listeners (callback functions) subscribe to specific events
 * - When an event is emitted, all subscribed listeners are called with the provided data
 * - This pattern is useful for cross-component communication and integrating non-React logic
 */
class EventEmitter {
  constructor() {
    // Store listeners in a Map where key is event name and value is Set of callbacks
    // Using Set prevents duplicate listeners for the same callback
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - The event name to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function for cleanup
   */
  on(event, callback) {
    // Initialize the Set for this event if it doesn't exist
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    // Add the callback to the Set of listeners for this event
    this.listeners.get(event).add(callback);

    // Return an unsubscribe function for easy cleanup
    // This is especially useful in React's useEffect cleanup
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - The event name
   * @param {Function} callback - The callback to remove
   */
  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      // Clean up empty Sets to prevent memory leaks
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribed listeners
   * @param {string} event - The event name to emit
   * @param {*} data - Data to pass to all listeners
   */
  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // Call each listener with the provided data
      // Using forEach on Set maintains insertion order
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          // Log errors but don't break other listeners
          console.error(`Error in event listener for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event for a single emission only
   * @param {string} event - The event name
   * @param {Function} callback - Function to call once
   */
  once(event, callback) {
    // Wrap the callback to auto-unsubscribe after first call
    const onceWrapper = (data) => {
      this.off(event, onceWrapper);
      callback(data);
    };
    this.on(event, onceWrapper);
  }
}

// Create a singleton instance for app-wide event communication
// This allows any module to import and use the same emitter instance
export const syncEventEmitter = new EventEmitter();

// Event name constants for type safety and discoverability
export const SYNC_EVENTS = {
  ACTION_ADDED: 'action:added',       // Fired when a new action is queued
  ACTION_RESUMED: 'action:resumed',   // Fired when a pending action starts processing
  ACTION_COMPLETED: 'action:completed', // Fired when an action successfully completes
  ACTION_FAILED: 'action:failed',     // Fired when an action fails
  SYNC_STARTED: 'sync:started',       // Fired when background sync process begins
  SYNC_COMPLETED: 'sync:completed',   // Fired when all pending actions are processed
};

export default EventEmitter;
