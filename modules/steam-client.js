/**
 * Steam Client Module
 * Handles Steam authentication, game farming, and connection management
 */
import SteamUser from "steam-user"
import SteamTotp from "steam-totp"
import path from "path"
import { fileURLToPath } from "url"
import { createSessionManager } from "./session-manager.js"
import { createConnectionManager } from "./connection-manager.js"
import { createEventManager } from "./event-manager.js"
import { appConfig } from "../app.config.js"

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Creates and returns a Steam client with farming capabilities
 * @returns {Object} Steam client API
 */
export function createSteamClient() {
  // Create Steam client with proper options
  const client = new SteamUser({
    promptSteamGuardCode: appConfig.steam.client.promptSteamGuardCode,
    dataDirectory: path.join(__dirname, ".."),
    autoRelogin: appConfig.steam.client.autoRelogin,
  })

  // Create managers
  const sessionManager = createSessionManager() // Handles session persistence
  const connectionManager = createConnectionManager() // Handles reconnection logic
  const eventManager = createEventManager() // Handles event subscriptions

  // State variables
  let isFarming = false // Whether we're currently farming games
  let currentGames = [] // List of game IDs currently being farmed
  let lastLoginDetails = null // Stored login details for reconnection

  // Register connection manager callbacks
  connectionManager.registerCallbacks({
    onReconnecting: handleReconnecting,
    onReconnected: handleReconnected,
    onReconnectFailed: handleReconnectFailed,
  })

  /**
   * Called when a reconnection attempt is about to be made
   * @param {number} attempt - Current attempt number
   * @param {number} maxAttempts - Maximum number of attempts
   * @param {number} delay - Delay before next attempt in ms
   */
  function handleReconnecting(attempt, maxAttempts, delay) {
    console.log(`Reconnecting to Steam (${attempt}/${maxAttempts}) in ${Math.round(delay / 1000)} seconds...`)
    eventManager.trigger("reconnecting", attempt, maxAttempts, delay)
  }

  /**
   * Called when successfully reconnected
   */
  function handleReconnected() {
    console.log("Successfully reconnected to Steam!")
    eventManager.trigger("reconnected")
  }

  /**
   * Called when all reconnection attempts fail
   * @param {string} reason - Reason for failure
   */
  function handleReconnectFailed(reason) {
    console.log(`Failed to reconnect to Steam after multiple attempts. Reason: ${reason || "Unknown"}`)
    eventManager.trigger("reconnectFailed", reason)
  }

  /**
   * Set up Steam client event handlers
   */
  function setupEvents() {
    // Remove any existing listeners to prevent duplicates
    client.removeAllListeners()

    // Set up basic event handlers
    client.on("loggedOn", handleLoggedOn)
    client.on("steamGuard", handleSteamGuard)
    client.on("error", handleError)
    client.on("disconnected", handleDisconnected)
    client.on("sessionExpired", handleSessionExpired)
  }

  /**
   * Handle successful login
   * @param {Object} details - Login details from Steam
   */
  function handleLoggedOn(details) {
    // Fix for undefined username issue - get name from multiple possible sources
    const accountName = client.accountInfo?.name || lastLoginDetails?.accountName || "Unknown"
    connectionManager.setAccountName(accountName)
    console.log(`Successfully logged in as ${accountName}`)

    // Save session data for future reconnections
    saveSessionData(accountName)

    // Update connection state
    connectionManager.setState({
      connected: true,
      reconnecting: false,
      reconnectAttempts: 0,
    })

    // If we were reconnecting, handle reconnect success
    if (connectionManager.getState().reconnecting) {
      connectionManager.handleReconnectSuccess()
    }

    // Set online status
    client.setPersona(SteamUser.EPersonaState.Online)

    // Set farming flag
    isFarming = true

    // Trigger event
    eventManager.trigger("loggedOn", details)

    // Clear steamGuard handlers after successful login
    eventManager.clear("steamGuard")
  }

  /**
   * Save session data for future reconnections
   * @param {string} accountName - Account name to associate with session
   */
  function saveSessionData(accountName) {
    try {
      const sessionKey = client._sessionKey
      if (sessionKey) {
        sessionManager.saveSession({
          sessionKey: sessionKey.toString("hex"),
          accountName: accountName,
        })
      }
    } catch (err) {
      console.error("Failed to save session data:", err)
    }
  }

  /**
   * Handle Steam Guard request
   * @param {string} domain - Email domain (if email Steam Guard)
   * @param {Function} callback - Function to call with code
   * @param {boolean} lastCodeWrong - Whether the last code was wrong
   */
  function handleSteamGuard(domain, callback, lastCodeWrong) {
    // Call all registered handlers
    if (eventManager.hasHandlers("steamGuard")) {
      eventManager.trigger("steamGuard", domain, callback, lastCodeWrong)
    } else {
      // Fallback if no handlers registered
      console.log("Steam Guard required but no handler registered. Please restart the application.")
      client.logOff()
    }
  }

  /**
   * Handle Steam client errors
   * @param {Error} err - Error object
   */
  function handleError(err) {
    // Pass the full error object including Steam error codes
    const errorDetails = {
      message: err.message || "Unknown error",
      eresult: err.eresult, // Steam error code
      cause: err.cause || "Unknown cause",
    }
    console.error("Steam client error:", errorDetails.message)
    eventManager.trigger("error", errorDetails)
  }

  /**
   * Handle disconnection from Steam
   * @param {number} eresult - Result code
   * @param {string} msg - Message explaining disconnection
   */
  function handleDisconnected(eresult, msg) {
    const reason = msg || eresult
    console.log(`Disconnected from Steam: ${reason}`)

    // Update connection state
    connectionManager.setState({
      connected: false,
      lastDisconnectReason: reason,
    })

    // Trigger event
    eventManager.trigger("disconnected", eresult, msg)

    // Start reconnection process if we were farming
    if (isFarming && lastLoginDetails) {
      console.log("Attempting to reconnect...")
      connectionManager.startReconnect(() => reconnect())
    }
  }

  /**
   * Handle session expiration
   */
  function handleSessionExpired() {
    console.log("Session expired.")

    // Clear the saved session since it's no longer valid
    sessionManager.clearSession()

    // If we were farming, try to reconnect
    if (isFarming && lastLoginDetails) {
      console.log("Attempting to reconnect with credentials...")
      connectionManager.startReconnect(() =>
        login(lastLoginDetails.accountName, lastLoginDetails.password, lastLoginDetails.sharedSecret),
      )
    }
  }

  /**
   * Attempt to reconnect using saved session or credentials
   * @returns {boolean} - True if reconnection attempt was started
   */
  function reconnect() {
    // Try to use saved session first
    const sessionData = sessionManager.loadSession()

    if (sessionData && sessionData.sessionKey) {
      try {
        console.log("Reconnecting using saved session...")
        client.logOn({
          accountName: sessionData.accountName || lastLoginDetails?.accountName,
          sessionKey: Buffer.from(sessionData.sessionKey, "hex"),
        })
        return true
      } catch (err) {
        console.error("Failed to reconnect with saved session:", err)
        // Clear invalid session data
        sessionManager.clearSession()
      }
    }

    // Fall back to credentials if available
    if (lastLoginDetails) {
      console.log("Reconnecting using credentials...")
      login(lastLoginDetails.accountName, lastLoginDetails.password, lastLoginDetails.sharedSecret)
      return true
    }

    console.log("No session or credentials available for reconnection.")
    return false
  }

  /**
   * Update the games being played
   * @returns {boolean} - True if games were updated successfully
   */
  function updateGamesPlayed() {
    // Check if logged in
    if (!client.steamID) {
      console.log("Not logged in to Steam. Cannot update games.")
      return false
    }

    // Check if we have games to play
    if (currentGames.length === 0) {
      console.log("No games to play.")
      return false
    }

    try {
      console.log(`Attempting to play ${currentGames.length} games...`)

      // For multiple games, we need to use an array of objects
      if (currentGames.length > 1) {
        const gameObjects = currentGames.map((appId) => ({ game_id: Number.parseInt(appId) }))
        client.gamesPlayed(gameObjects)
      } else {
        // For a single game, we can just use the ID
        client.gamesPlayed(currentGames[0])
      }

      // Verify games are being played
      setTimeout(() => {
        const playingGames = client._playingAppIds || []
        console.log(`Now playing: ${playingGames.join(", ")}`)
      }, 2000)

      return true
    } catch (err) {
      console.error("Error updating games:", err)
      return false
    }
  }

  /**
   * Login to Steam
   * @param {string} accountName - Steam account name
   * @param {string} password - Steam password
   * @param {string} sharedSecret - Steam shared secret for 2FA
   */
  function login(accountName, password, sharedSecret) {
    // Store login details for potential reconnection
    lastLoginDetails = { accountName, password, sharedSecret }

    // Setup events before login
    setupEvents()

    const loginDetails = {
      accountName,
      password,
      rememberPassword: true,
    }

    // Try to use saved session first if we're not explicitly logging in with credentials
    const sessionData = sessionManager.loadSession()
    if (sessionData && sessionData.sessionKey && sessionData.accountName === accountName) {
      console.log("Using saved session for login...")
      try {
        loginDetails.sessionKey = Buffer.from(sessionData.sessionKey, "hex")
        delete loginDetails.password // Don't need password when using sessionKey
      } catch (err) {
        console.error("Failed to parse session key:", err)
        // Continue with password login
      }
    }
    // If we have a shared secret, generate the auth code
    else if (sharedSecret && sharedSecret.length > 5) {
      try {
        loginDetails.twoFactorCode = SteamTotp.generateAuthCode(sharedSecret)
        console.log("Generated 2FA code automatically:", loginDetails.twoFactorCode)
      } catch (err) {
        console.log("Failed to generate 2FA code. You may need to enter it manually.")
      }
    }

    console.log("Logging in to Steam...")
    client.logOn(loginDetails)
  }

  // Return the public API
  return {
    /**
     * Check if client is farming
     * @returns {boolean} - True if farming
     */
    isFarming: () => isFarming,

    /**
     * Get client status
     * @returns {Object} - Status object
     */
    getStatus: () => ({
      connected: connectionManager.getState().connected,
      reconnecting: connectionManager.getState().reconnecting,
      loggedOn: !!client.steamID,
      steamID: client.steamID ? client.steamID.toString() : null,
      playingAppIds: client._playingAppIds || [],
      currentGames: [...currentGames],
      accountName: connectionManager.getState().accountName,
    }),

    /**
     * Login to Steam
     * @param {string} accountName - Steam account name
     * @param {string} password - Steam password
     * @param {string} sharedSecret - Steam shared secret for 2FA
     */
    login: (accountName, password, sharedSecret) => {
      // Reset state
      isFarming = false
      currentGames = []
      connectionManager.reset()

      login(accountName, password, sharedSecret)
    },

    /**
     * Reconnect to Steam
     * @returns {boolean} - True if reconnection attempt was started
     */
    reconnect: () => reconnect(),

    /**
     * Register event handlers
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} - Function to remove the handler
     */
    on: (event, handler) => eventManager.on(event, handler),

    /**
     * Clear all handlers for an event
     * @param {string} event - Event name
     */
    clearHandlers: (event) => eventManager.clear(event),

    /**
     * Start farming games
     * @param {Array<number>} gameIds - Array of game IDs to farm
     * @returns {boolean} - True if farming started successfully
     */
    startFarming: (gameIds) => {
      if (!Array.isArray(gameIds)) {
        console.error("Invalid game IDs provided")
        return false
      }

      currentGames = gameIds.map((id) => Number.parseInt(id)).filter((id) => !isNaN(id))

      if (client.steamID) {
        console.log("Starting to farm games...")
        setTimeout(() => updateGamesPlayed(), 1000)
        return true
      } else {
        console.error("Not logged in to Steam. Cannot start farming.")
        return false
      }
    },

    /**
     * Stop farming
     * @returns {boolean} - True if farming stopped successfully
     */
    stopFarming: () => {
      if (client.steamID) {
        try {
          console.log("Stopping game farming...")
          client.gamesPlayed([])
          client.setPersona(SteamUser.EPersonaState.Offline)
          client.logOff()
        } catch (err) {
          console.error("Error stopping farming:", err)
        }
      }

      isFarming = false
      currentGames = []
      return true
    },

    /**
     * Add a game to farming
     * @param {number} appId - Game ID to add
     * @returns {boolean} - True if game was added successfully
     */
    addGame: (appId) => {
      const numAppId = Number.parseInt(appId)
      if (isNaN(numAppId)) return false

      if (!currentGames.includes(numAppId)) {
        currentGames.push(numAppId)
        console.log(`Adding game ${numAppId} to farming list...`)
        return updateGamesPlayed()
      }
      return false
    },

    /**
     * Remove a game from farming
     * @param {number} appId - Game ID to remove
     * @returns {boolean} - True if game was removed successfully
     */
    removeGame: (appId) => {
      const numAppId = Number.parseInt(appId)
      if (isNaN(numAppId)) return false

      const index = currentGames.indexOf(numAppId)
      if (index !== -1) {
        currentGames.splice(index, 1)
        console.log(`Removing game ${numAppId} from farming list...`)
        return updateGamesPlayed()
      }
      return false
    },

    /**
     * Update all games being farmed
     * @param {Array<number>} gameIds - Array of game IDs to farm
     * @returns {boolean} - True if games were updated successfully
     */
    updateGames: (gameIds) => {
      if (!Array.isArray(gameIds)) return false
      currentGames = gameIds.map((id) => Number.parseInt(id)).filter((id) => !isNaN(id))
      return updateGamesPlayed()
    },

    /**
     * Configure reconnection settings
     * @param {Object} options - Configuration options
     */
    configureReconnect: (options) => {
      connectionManager.configure(options)
    },
  }
}