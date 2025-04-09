/**
 * Event Manager Module
 * Handles event registration, triggering, and cleanup
 */

/**
 * Creates an event manager for handling event subscriptions
 * @returns {Object} Event manager API
 */
export function createEventManager() {
  // Event handlers registry
  const eventHandlers = {
    loggedOn: [], // Fired when successfully logged in
    steamGuard: [], // Fired when Steam Guard code is needed
    error: [], // Fired when an error occurs
    disconnected: [], // Fired when disconnected from Steam
    reconnecting: [], // Fired when attempting to reconnect
    reconnected: [], // Fired when successfully reconnected
    reconnectFailed: [], // Fired when all reconnection attempts fail
  }

  return {
    /**
     * Register an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     * @returns {Function} Function to remove the handler
     */
    on(event, handler) {
      if (eventHandlers[event]) {
        eventHandlers[event].push(handler)
      }

      // Return a function to remove this specific handler
      return () => {
        if (eventHandlers[event]) {
          const index = eventHandlers[event].indexOf(handler)
          if (index !== -1) {
            eventHandlers[event].splice(index, 1)
          }
        }
      }
    },

    /**
     * Clear all handlers for an event
     * @param {string} event - Event name
     */
    clear(event) {
      if (eventHandlers[event]) {
        eventHandlers[event] = []
      }
    },

    /**
     * Check if an event has any handlers
     * @param {string} event - Event name
     * @returns {boolean} True if event has handlers
     */
    hasHandlers(event) {
      return eventHandlers[event] && eventHandlers[event].length > 0
    },

    /**
     * Trigger an event with arguments
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to handlers
     */
    trigger(event, ...args) {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach((handler) => {
          try {
            handler(...args)
          } catch (err) {
            console.error(`Error in ${event} handler:`, err)
          }
        })
      }
    },
  }
}