/**
 * Connection Manager Module
 * Handles reconnection logic and connection state tracking
 */
import { appConfig } from '../config/app.config.js';
import type { 
  ConnectionState, 
  ConnectionCallbacks, 
  ReconnectOptions 
} from '../types/connection.js';

export function createConnectionManager() {
  // Connection state with default values
  let connectionState: ConnectionState = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: appConfig.steam.reconnect.maxAttempts,
    reconnectDelay: appConfig.steam.reconnect.initialDelay,
    accountName: null,
    lastDisconnectReason: null,
    reconnectFunc: null,
  };

  // Event callbacks
  const callbacks: ConnectionCallbacks = {};

  return {
    /**
     * Get current connection state
     */
    getState(): Readonly<ConnectionState> {
      return { ...connectionState };
    },

    /**
     * Set connection state properties
     */
    setState(newState: Partial<ConnectionState>): void {
      const oldState = { ...connectionState };
      connectionState = { ...connectionState, ...newState };

      // Notify state change if callback is registered
      if (callbacks.onStateChanged) {
        callbacks.onStateChanged(connectionState, oldState);
      }
    },

    /**
     * Set account name for better logging
     */
    setAccountName(name: string): void {
      connectionState.accountName = name;
    },

    /**
     * Start reconnection process
     */
    startReconnect(reconnectFunc: () => void): boolean {
      // Don't start if already reconnecting
      if (connectionState.reconnecting) return false;

      connectionState.reconnecting = true;
      connectionState.reconnectAttempts = 0;
      connectionState.reconnectFunc = reconnectFunc;

      // Start reconnection process
      this.attemptReconnect(reconnectFunc);
      return true;
    },

    /**
     * Attempt a single reconnection
     */
    attemptReconnect(reconnectFunc: () => void): void {
      if (!connectionState.reconnecting) return;

      // Calculate exponential backoff delay
      const delay = Math.min(
        connectionState.reconnectDelay *
          Math.pow(appConfig.steam.reconnect.backoffMultiplier, connectionState.reconnectAttempts),
        appConfig.steam.reconnect.maxDelay,
      );

      // Notify reconnecting if callback is registered
      if (callbacks.onReconnecting) {
        callbacks.onReconnecting(
          connectionState.reconnectAttempts + 1,
          connectionState.maxReconnectAttempts,
          delay
        );
      }

      // Schedule reconnection attempt
      setTimeout(() => {
        // Increment attempt counter
        connectionState.reconnectAttempts++;

        // Try to reconnect
        try {
          reconnectFunc();
        } catch (err) {
          console.error('Reconnection attempt failed:', err);
          this.handleReconnectFailure();
        }
      }, delay);
    },

    /**
     * Handle successful reconnection
     */
    handleReconnectSuccess(): void {
      connectionState.connected = true;
      connectionState.reconnecting = false;
      connectionState.reconnectAttempts = 0;

      // Notify reconnected if callback is registered
      if (callbacks.onReconnected) {
        callbacks.onReconnected();
      }
    },

    /**
     * Handle failed reconnection attempt
     */
    handleReconnectFailure(): void {
      // Check if we've reached max attempts
      if (connectionState.reconnectAttempts >= connectionState.maxReconnectAttempts) {
        connectionState.reconnecting = false;

        // Notify reconnect failed if callback is registered
        if (callbacks.onReconnectFailed) {
          callbacks.onReconnectFailed(connectionState.lastDisconnectReason);
        }
        return;
      }

      // Try again with the same reconnect function
      const reconnectFunc = connectionState.reconnectFunc;
      if (reconnectFunc) {
        this.attemptReconnect(reconnectFunc);
      }
    },

    /**
     * Register event callbacks
     */
    registerCallbacks(newCallbacks: ConnectionCallbacks): void {
      Object.assign(callbacks, newCallbacks);
    },

    /**
     * Stop any ongoing reconnection attempts
     */
    stopReconnect(): void {
      if (connectionState.reconnecting && connectionState.reconnectFunc) {
        console.log('Stopping reconnection attempts...');
        connectionState.reconnecting = false;
        connectionState.reconnectAttempts = 0;
        connectionState.reconnectFunc = null;
      }
    },

    /**
     * Reset connection state
     */
    reset(): void {
      // Stop any ongoing reconnection first
      this.stopReconnect();

      connectionState = {
        connected: false,
        reconnecting: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: connectionState.maxReconnectAttempts,
        reconnectDelay: connectionState.reconnectDelay,
        accountName: connectionState.accountName,
        lastDisconnectReason: null,
        reconnectFunc: null,
      };
    },

    /**
     * Configure reconnection settings
     */
    configure(config: ReconnectOptions): void {
      if (config.maxReconnectAttempts !== undefined) {
        connectionState.maxReconnectAttempts = config.maxReconnectAttempts;
      }

      if (config.reconnectDelay !== undefined) {
        connectionState.reconnectDelay = config.reconnectDelay;
      }
    },
  };
}

export type ConnectionManager = ReturnType<typeof createConnectionManager>;