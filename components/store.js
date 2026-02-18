// components/store.js

import { makeAutoObservable } from 'mobx';
import { getState, setState, subscribe } from '../../../../store/shared-state';

/**
 * Singleton store that mirrors the shared state.
 * Automatically updates when the shared state changes.
 */
class SharedStateStore {
  /** Current shared state */
  state = getState();

  constructor() {
    makeAutoObservable(this);

    // Keep this instance in sync with global shared state
    subscribe((newState) => {
      this.state = newState;
    });
  }

  /**
   * Update the shared state using an updater function
   * @param {function} updater - function that receives current state and returns new state
   */
  updateState(updater) {
    const current = getState();
    const next = updater(current);
    setState(next);
  }
}

// Create and export the singleton instance
const sharedStore = new SharedStateStore();

export default sharedStore;

// Optional named export for direct state updates (if needed in other files)
export const updateSharedState = (updater) => {
  const current = getState();
  setState(updater(current));
};
