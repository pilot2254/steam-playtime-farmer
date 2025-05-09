/**
 * Connection Manager Module
 * Handles reconnection logic and connection state tracking
 */
import { appConfig } from "../app.config.js"

export function createConnectionManager() {
  // Connection state with default values
  let connectionState = {
    connected: false, // Is currently connected to Steam
    reconnecting: false, // Is attempting to reconnect
    reconnectAttempts: 0, // Number of reconnection attempts made
    maxReconnectAttempts: appConfig.steam.reconnect.maxAttempts, // Maximum number of reconnection attempts
    reconnectDelay: appConfig.steam.reconnect.initialDelay, // Base delay between reconnection attempts (ms)
    accountName: null, // Steam account name for logging
    lastDisconnectReason: null, // Reason for last disconnection
    reconnectFunc: null, // Function to call for reconnection
  }

  // Event callbacks
  const callbacks = {
    onReconnecting: null, // Called when a reconnection attempt is about to be made
    onReconnected: null, // Called when successfully reconnected
    onReconnectFailed: null, // Called when all reconnection attempts fail
    onStateChanged: null, // Called when connection state changes
  }

  return {
    /**
     * Get current connection state
     * @returns {Object} - The connection state
     */
    getState() {
      return { ...connectionState }
    },

    /**
     * Set connection state properties
     * @param {Object} newState - The new state properties to set
     */
    setState(newState) {
      const oldState = { ...connectionState }
      connectionState = { ...connectionState, ...newState }

      // Notify state change if callback is registered
      if (callbacks.onStateChanged) {
        callbacks.onStateChanged(connectionState, oldState)
      }
    },

    /**
     * Set account name for better logging
     * @param {string} name - The account name
     */
    setAccountName(name) {
      connectionState.accountName = name
    },

    /**
     * Start reconnection process
     * @param {Function} reconnectFunc - Function to call for reconnection
     * @returns {boolean} - True if reconnection started
     */
    startReconnect(reconnectFunc) {
      // Don't start if already reconnecting
      if (connectionState.reconnecting) return false

      connectionState.reconnecting = true
      connectionState.reconnectAttempts = 0
      connectionState.reconnectFunc = reconnectFunc // Store for future attempts

      // Start reconnection process
      this.attemptReconnect(reconnectFunc)
      return true
    },

    /**
     * Attempt a single reconnection
     * @param {Function} reconnectFunc - Function to call for reconnection
     */
    attemptReconnect(reconnectFunc) {
      if (!connectionState.reconnecting) return

      // Calculate exponential backoff delay (increases with each attempt)
      const delay = Math.min(
        connectionState.reconnectDelay *
          Math.pow(appConfig.steam.reconnect.backoffMultiplier, connectionState.reconnectAttempts),
        appConfig.steam.reconnect.maxDelay, // Cap at max delay
      )

      // Notify reconnecting if callback is registered
      if (callbacks.onReconnecting) {
        callbacks.onReconnecting(connectionState.reconnectAttempts + 1, connectionState.maxReconnectAttempts, delay)
      }

      // Schedule reconnection attempt
      setTimeout(() => {
        // Increment attempt counter
        connectionState.reconnectAttempts++

        // Try to reconnect
        try {
          reconnectFunc()
        } catch (err) {
          console.error("Reconnection attempt failed:", err)
          this.handleReconnectFailure()
        }
      }, delay)
    },

    /**
     * Handle successful reconnection
     */
    handleReconnectSuccess() {
      connectionState.connected = true
      connectionState.reconnecting = false
      connectionState.reconnectAttempts = 0

      // Notify reconnected if callback is registered
      if (callbacks.onReconnected) {
        callbacks.onReconnected()
      }
    },

    /**
     * Handle failed reconnection attempt
     */
    handleReconnectFailure() {
      // Check if we've reached max attempts
      if (connectionState.reconnectAttempts >= connectionState.maxReconnectAttempts) {
        connectionState.reconnecting = false

        // Notify reconnect failed if callback is registered
        if (callbacks.onReconnectFailed) {
          callbacks.onReconnectFailed(connectionState.lastDisconnectReason)
        }
        return
      }

      // Try again with the same reconnect function that was passed to startReconnect
      const reconnectFunc = connectionState.reconnectFunc
      if (reconnectFunc) {
        this.attemptReconnect(reconnectFunc)
      }
    },

    /**
     * Register event callbacks
     * @param {Object} newCallbacks - The callbacks to register
     */
    registerCallbacks(newCallbacks) {
      if (newCallbacks.onReconnecting) callbacks.onReconnecting = newCallbacks.onReconnecting
      if (newCallbacks.onReconnected) callbacks.onReconnected = newCallbacks.onReconnected
      if (newCallbacks.onReconnectFailed) callbacks.onReconnectFailed = newCallbacks.onReconnectFailed
      if (newCallbacks.onStateChanged) callbacks.onStateChanged = newCallbacks.onStateChanged
    },

    /**
     * Stop any ongoing reconnection attempts
     */
    stopReconnect() {
      if (connectionState.reconnecting && connectionState.reconnectFunc) {
        console.log("Stopping reconnection attempts...")
        connectionState.reconnecting = false
        connectionState.reconnectAttempts = 0
        connectionState.reconnectFunc = null
      }
    },

    /**
     * Reset connection state
     */
    reset() {
      // Stop any ongoing reconnection first
      this.stopReconnect()

      connectionState = {
        connected: false,
        reconnecting: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: connectionState.maxReconnectAttempts,
        reconnectDelay: connectionState.reconnectDelay,
        accountName: connectionState.accountName,
        lastDisconnectReason: null,
        reconnectFunc: null,
      }
    },

    /**
     * Configure reconnection settings
     * @param {Object} config - Configuration options
     */
    configure(config) {
      if (config.maxReconnectAttempts !== undefined) {
        connectionState.maxReconnectAttempts = config.maxReconnectAttempts
      }

      if (config.reconnectDelay !== undefined) {
        connectionState.reconnectDelay = config.reconnectDelay
      }
    },
  }
}