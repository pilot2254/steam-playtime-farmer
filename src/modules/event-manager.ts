/**
 * Event Manager Module
 * Handles event registration, triggering, and cleanup
 */
import type { EventHandlers, EventName, EventHandler, RemoveHandler } from '../types/events.js';

/**
 * Creates an event manager for handling event subscriptions
 */
export function createEventManager() {
  // Event handlers registry
  const eventHandlers: EventHandlers = {
    loggedOn: [],
    steamGuard: [],
    error: [],
    disconnected: [],
    reconnecting: [],
    reconnected: [],
    reconnectFailed: [],
  };

  return {
    /**
     * Register an event handler
     */
    on<T extends EventName>(event: T, handler: EventHandler<T>): RemoveHandler {
      if (eventHandlers[event]) {
        (eventHandlers[event] as any[]).push(handler);
      }

      // Return a function to remove this specific handler
      return () => {
        if (eventHandlers[event]) {
          const handlers = eventHandlers[event] as any[];
          const index = handlers.indexOf(handler);
          if (index !== -1) {
            handlers.splice(index, 1);
          }
        }
      };
    },

    /**
     * Clear all handlers for an event
     */
    clear(event: EventName): void {
      if (eventHandlers[event]) {
        eventHandlers[event] = [] as any;
      }
    },

    /**
     * Clear multiple event handlers or all events if no specific events provided
     */
    clearAll(...events: EventName[]): void {
      if (events.length === 0) {
        // Clear all events if no specific events were provided
        (Object.keys(eventHandlers) as EventName[]).forEach((event) => {
          eventHandlers[event] = [] as any;
        });
      } else {
        // Clear only the specified events
        events.forEach((event) => {
          if (eventHandlers[event]) {
            eventHandlers[event] = [] as any;
          }
        });
      }
    },

    /**
     * Check if an event has any handlers
     */
    hasHandlers(event: EventName): boolean {
      return eventHandlers[event] && eventHandlers[event].length > 0;
    },

    /**
     * Trigger an event with arguments
     */
    trigger<T extends EventName>(event: T, ...args: Parameters<EventHandler<T>>): void {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach((handler) => {
          try {
            (handler as any)(...args);
          } catch (err) {
            console.error(`Error in ${event} handler:`, err);
          }
        });
      }
    },
  };
}

export type EventManager = ReturnType<typeof createEventManager>;