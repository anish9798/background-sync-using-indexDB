/**
 * App - Main application component for Background Sync Demo
 * 
 * This application demonstrates:
 * 1. IndexedDB persistence for storing user actions
 * 2. Background sync simulation - actions survive page reloads
 * 3. EventEmitter pattern for decoupled component communication
 * 
 * On startup, the app automatically resumes any pending actions
 * that were interrupted (e.g., by closing the tab).
 */

import { useEffect, useState } from 'react';
import { ActionForm } from './components/ActionForm';
import { ActionList } from './components/ActionList';
import { SyncStatus } from './components/SyncStatus';
import { resumePendingActions, setupNetworkListeners } from './lib/syncManager';
import './App.css';

function App() {
  const [_initialized, setInitialized] = useState(false);

  // Initialize the app - resume pending actions and setup listeners
  // This runs once on app startup (mount)
  useEffect(() => {
    const initializeApp = async () => {
      console.log('App initializing - checking for pending actions...');
      
      // Setup network status listeners for automatic sync when coming online
      setupNetworkListeners();
      
      // Resume any pending actions from previous sessions
      // This is the key to "background sync" - actions persist and resume
      await resumePendingActions();
      
      setInitialized(true);
      console.log('App initialization complete');
    };

    initializeApp();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Background Sync Demo</h1>
        <p className="subtitle">
          Demonstrating IndexedDB persistence, pending action handling, and EventEmitter integration
        </p>
      </header>

      <SyncStatus />

      <main className="app-main">
        <section className="form-section">
          <ActionForm />
        </section>

        <section className="list-section">
          <ActionList />
        </section>
      </main>

      <footer className="app-footer">
        <div className="instructions">
          <h3>How to Test Background Sync:</h3>
          <ol>
            <li>Create a new action using the form above</li>
            <li><strong>Immediately refresh the page</strong> (before the action completes)</li>
            <li>Watch the pending action automatically resume and complete</li>
            <li>Try going offline (DevTools → Network → Offline) and creating actions</li>
          </ol>
        </div>
        
        <div className="tech-info">
          <h3>Technologies Used:</h3>
          <ul>
            <li><strong>IndexedDB</strong> - Browser database for persistent storage</li>
            <li><strong>EventEmitter</strong> - Custom pub/sub for component communication</li>
            <li><strong>React Hooks</strong> - useEffect, useState, custom hooks</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

export default App;
