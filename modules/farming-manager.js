/**
 * Farming Manager Module
 *
 * Handles all Steam game farming functionality and related UI interactions.
 * This module is responsible for:
 * - Starting and stopping the farming process
 * - Managing the farming interface and commands
 * - Handling Steam client events during farming
 * - Providing real-time status updates
 *
 * The farming manager works closely with the Steam client and config manager
 * to coordinate game farming operations.
 */
import readline from "readline"

/**
 * Creates a farming manager for handling game farming operations
 * @param {Object} configManager - Configuration manager for accessing user settings and game list
 * @param {Object} steamClient - Steam client for login and game farming operations
 * @returns {Object} Farming manager API with methods to control farming operations
 */
export function createFarmingManager(configManager, steamClient) {
  /**
   * Clear the console
   * Uses a cross-platform approach to clear the terminal
   * Works on both Unix-based systems and Windows
   */
  function clearConsole() {
    // ANSI escape code to clear the screen (works on most terminals)
    process.stdout.write("\x1Bc")

    // Alternative method specifically for Windows command prompt
    if (process.platform === "win32") {
      console.clear()
    }
  }

  /**
   * Start farming games
   * This is the main entry point for the farming functionality
   *
   * @param {Function} returnToMainMenu - Callback function to return to main menu when farming ends
   */
  async function startFarming(returnToMainMenu) {
    clearConsole()
    const config = configManager.get()

    // Validate that we have games to farm before proceeding
    if (config.games.length === 0) {
      console.log("No games configured. Please add games first.")
      return returnToMainMenu()
    }

    // Prevent multiple farming sessions
    if (steamClient.isFarming()) {
      console.log("Already farming playtime. Please stop the current session first.")
      return returnToMainMenu()
    }

    console.log("\n===== Starting Playtime Farming =====")

    // Set up event handlers for Steam client events
    setupFarmingEventHandlers(returnToMainMenu)

    // Get password - either from saved config or by prompting the user
    const password =
      config.rememberPassword && config.password
        ? config.password
        : await new Promise((resolve) => {
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            })
            rl.question("Enter your Steam password: ", (answer) => {
              rl.close()
              resolve(answer)
            })
          })

    // Initiate login process with Steam
    steamClient.login(config.accountName, password, config.sharedSecret)
  }

  /**
   * Set up event handlers for farming
   * Registers callbacks for various Steam client events during farming
   *
   * @param {Function} returnToMainMenu - Function to return to main menu when farming ends or errors occur
   */
  function setupFarmingEventHandlers(returnToMainMenu) {
    // Set up Steam Guard handler (only needed during login)
    // This handler prompts the user for a Steam Guard code when required
    const removeGuardHandler = steamClient.on("steamGuard", async (domain, callback, lastCodeWrong) => {
      const domainText = domain ? ` for domain ${domain}` : ""
      const wrongText = lastCodeWrong ? " (previous code was wrong)" : ""

      // Prompt user for Steam Guard code
      const code = await new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        })
        rl.question(`Steam Guard code needed${domainText}${wrongText}: `, (answer) => {
          rl.close()
          resolve(answer)
        })
      })

      // Pass the code back to Steam client
      callback(code)
    })

    // Set up logged on handler - called when successfully logged into Steam
    const removeLoggedOnHandler = steamClient.on("loggedOn", () => {
      // Clean up the Steam Guard handler after successful login
      // (no longer needed once logged in)
      removeGuardHandler()

      // Start farming all configured games
      const gameIds = configManager.get().games.map((game) => game.appId)
      steamClient.startFarming(gameIds)

      // Show the farming interface with available commands
      showFarmingInterface(returnToMainMenu)
    })

    // Set up reconnecting handler - called when attempting to reconnect to Steam
    const removeReconnectingHandler = steamClient.on("reconnecting", (attempt, maxAttempts) => {
      console.log(`Reconnection attempt ${attempt} of ${maxAttempts}...`)
    })

    // Set up reconnected handler - called when successfully reconnected to Steam
    const removeReconnectedHandler = steamClient.on("reconnected", () => {
      console.log("Reconnected to Steam! Resuming farming...")

      // Restart farming with all configured games
      const gameIds = configManager.get().games.map((game) => game.appId)
      steamClient.startFarming(gameIds)
    })

    // Set up reconnect failed handler - called when all reconnection attempts fail
    const removeReconnectFailedHandler = steamClient.on("reconnectFailed", () => {
      console.log("Failed to reconnect after multiple attempts.")
      console.log('You can try to manually reconnect by selecting "Start Farming" again.')

      // Return to main menu when reconnection fails
      returnToMainMenu()
    })

    // Set up error handler - called when Steam client encounters an error
    const removeErrorHandler = steamClient.on("error", () => {
      // Clean up all handlers to prevent memory leaks
      removeGuardHandler()
      removeLoggedOnHandler()
      removeDisconnectHandler()
      removeReconnectingHandler()
      removeReconnectedHandler()
      removeReconnectFailedHandler()

      // Only return to main menu if we're not trying to reconnect
      // This prevents interrupting the reconnection process
      if (!steamClient.getStatus().reconnecting) {
        returnToMainMenu()
      }
    })

    // Set up disconnected handler - called when disconnected from Steam
    const removeDisconnectHandler = steamClient.on("disconnected", () => {
      // We don't need to do anything here as reconnection is handled by the steam client
      console.log("Disconnected from Steam. Attempting to reconnect automatically...")

      // Don't clean up handlers or return to main menu - let reconnection logic handle it
    })
  }

  /**
   * Show farming interface with available commands
   * Creates an interactive command-line interface for managing farming
   *
   * @param {Function} returnToMainMenu - Function to return to main menu when farming ends
   */
  function showFarmingInterface(returnToMainMenu) {
    clearConsole()
    const config = configManager.get()

    // Display farming status and available commands
    console.log("\n===== Playtime Farming Active =====")
    console.log('Type "status" to check current status.')
    console.log('Type "add" to add a new game while farming.')
    console.log('Type "remove" to remove a game while farming.')
    console.log('Type "reconnect" to manually reconnect if disconnected.')
    console.log('Type "stop" to stop farming and return to menu.')
    console.log('Type "help" to see all available commands.')

    // Create a new readline interface for farming mode
    // This is separate from the main UI readline interface
    const farmingRL = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    // Handle farming commands entered by the user
    farmingRL.on("line", async (input) => {
      const command = input.toLowerCase().trim()

      // Process different commands
      switch (command) {
        case "stop":
          // Stop farming and return to main menu
          steamClient.stopFarming()
          farmingRL.close()
          returnToMainMenu()
          break
        case "status":
          // Show current farming status
          handleStatusCommand(config)
          break
        case "debug":
          // Show detailed debug information
          handleDebugCommand()
          break
        case "add":
          // Add a new game to farm
          await handleAddGameCommand()
          break
        case "remove":
          // Remove a game from farming
          await handleRemoveGameCommand(config)
          break
        case "reconnect":
          // Manually reconnect to Steam
          handleReconnectCommand()
          break
        case "help":
          // Show help information
          handleHelpCommand()
          break
        case "clear":
          // Clear the console
          clearConsole()
          console.log("\n===== Playtime Farming Active =====")
          console.log('Type "help" to see all available commands.')
          break
        default:
          // Handle unknown commands
          console.log('Unknown command. Type "help" to see available commands.')
      }
    })
  }

  /**
   * Handle status command
   * Shows the current farming status including connection state and games being farmed
   *
   * @param {Object} config - Current configuration with game information
   */
  function handleStatusCommand(config) {
    const status = steamClient.getStatus()

    // Display connection status
    console.log(`\nConnection Status: ${status.connected ? "Connected" : "Disconnected"}`)
    if (status.reconnecting) {
      console.log("Currently attempting to reconnect...")
    }

    // Display account and game information
    console.log(`Account: ${status.accountName || "Unknown"}`)
    console.log(`Currently farming ${config.games.length} games:`)
    config.games.forEach((game) => console.log(`- ${game.name} (${game.appId})`))
    console.log('\nType "help" to see all available commands.')
  }

  /**
   * Handle debug command
   * Shows detailed Steam client status information for troubleshooting
   */
  function handleDebugCommand() {
    const status = steamClient.getStatus()

    // Display detailed Steam client status
    console.log("\nSteam Client Status:")
    console.log("- Connected:", status.connected)
    console.log("- Reconnecting:", status.reconnecting)
    console.log("- Logged On:", status.loggedOn)
    console.log("- Steam ID:", status.steamID)
    console.log("- Account Name:", status.accountName)
    console.log("- Current games:", status.playingAppIds)
  }

  /**
   * Handle add game command
   * Adds a new game to farm without stopping the current farming session
   */
  async function handleAddGameCommand() {
    clearConsole()
    console.log("\n===== Add Game While Farming =====")

    // Get game AppID from user
    const appIdInput = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      rl.question("Enter game AppID (number): ", (answer) => {
        rl.close()
        resolve(answer)
      })
    })

    // Validate AppID
    const appId = Number.parseInt(appIdInput)
    if (isNaN(appId)) {
      console.log("Invalid AppID. Please enter a number.")
      return
    }

    // Get game name from user (optional)
    const name = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      rl.question("Enter game name (optional): ", (answer) => {
        rl.close()
        resolve(answer)
      })
    })

    // Add game to configuration and start farming it
    const added = await configManager.addGame(appId, name || `Game ${appId}`)
    if (added) {
      steamClient.addGame(appId)
      console.log(`Game ${appId} added successfully and is now being farmed.`)
    }
  }

  /**
   * Handle remove game command
   * Removes a game from farming without stopping the current farming session
   *
   * @param {Object} config - Current configuration with game information
   */
  async function handleRemoveGameCommand(config) {
    clearConsole()
    console.log("\n===== Remove Game While Farming =====")
    console.log("Current games:")

    // Check if there are any games to remove
    if (config.games.length === 0) {
      console.log("No games configured.")
      return
    }

    // Display list of games
    config.games.forEach((game, index) => {
      console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`)
    })

    // Get game index from user
    const indexInput = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      rl.question("Enter the number of the game to remove: ", (answer) => {
        rl.close()
        resolve(answer)
      })
    })

    // Validate and process the removal
    const idx = Number.parseInt(indexInput) - 1
    if (idx >= 0 && idx < config.games.length) {
      const appId = config.games[idx].appId
      const removed = await configManager.removeGame(idx)

      if (removed) {
        steamClient.removeGame(appId)
        console.log(`Game ${removed.name} (${removed.appId}) removed successfully.`)
      }
    } else {
      console.log("Invalid game number.")
    }
  }

  /**
   * Handle reconnect command
   * Manually attempts to reconnect to Steam if disconnected
   */
  function handleReconnectCommand() {
    console.log("Attempting to manually reconnect to Steam...")
    const success = steamClient.reconnect()
    if (!success) {
      console.log("Reconnection failed. You may need to stop and restart farming.")
    }
  }

  /**
   * Handle help command
   * Shows a list of all available commands and their descriptions
   */
  function handleHelpCommand() {
    console.log("\nAvailable commands:")
    console.log("- status: Show currently farming games and connection status")
    console.log("- add: Add a new game to farm without stopping")
    console.log("- remove: Remove a game from farming without stopping")
    console.log("- reconnect: Manually attempt to reconnect if disconnected")
    console.log("- debug: Show detailed Steam client status")
    console.log("- clear: Clear the console")
    console.log("- stop: Stop farming and return to main menu")
    console.log("- help: Show this help message")
  }

  // Return the public API with only the methods that should be accessible from outside
  return {
    startFarming,
  }
}