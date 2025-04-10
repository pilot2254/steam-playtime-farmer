/**
 * Farming Manager Module
 * Handles Steam game farming functionality and related UI
 */
import readline from "readline"

/**
 * Creates a farming manager for handling game farming operations
 * @param {Object} configManager - Configuration manager
 * @param {Object} steamClient - Steam client
 * @returns {Object} Farming manager API
 */
export function createFarmingManager(configManager, steamClient) {
  /**
   * Clear the console
   * Uses a cross-platform approach to clear the terminal
   */
  function clearConsole() {
    process.stdout.write("\x1Bc")
    if (process.platform === "win32") {
      console.clear()
    }
  }

  /**
   * Start farming games
   * @param {Function} returnToMainMenu - Function to return to main menu
   */
  async function startFarming(returnToMainMenu) {
    clearConsole()
    const config = configManager.get()

    // Check if we have games to farm
    if (config.games.length === 0) {
      console.log("No games configured. Please add games first.")
      return returnToMainMenu()
    }

    // Check if already farming
    if (steamClient.isFarming()) {
      console.log("Already farming playtime. Please stop the current session first.")
      return returnToMainMenu()
    }

    console.log("\n===== Starting Playtime Farming =====")

    // Set up event handlers
    setupFarmingEventHandlers(returnToMainMenu)

    // Login to Steam
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

    steamClient.login(config.accountName, password, config.sharedSecret)
  }

  /**
   * Set up event handlers for farming
   * @param {Function} returnToMainMenu - Function to return to main menu
   */
  function setupFarmingEventHandlers(returnToMainMenu) {
    // Set up Steam Guard handler (only needed during login)
    const removeGuardHandler = steamClient.on("steamGuard", async (domain, callback, lastCodeWrong) => {
      const domainText = domain ? ` for domain ${domain}` : ""
      const wrongText = lastCodeWrong ? " (previous code was wrong)" : ""

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

      callback(code)
    })

    // Set up logged on handler
    const removeLoggedOnHandler = steamClient.on("loggedOn", () => {
      // Clean up the Steam Guard handler after successful login
      removeGuardHandler()

      const gameIds = configManager.get().games.map((game) => game.appId)
      steamClient.startFarming(gameIds)
      showFarmingInterface(returnToMainMenu)
    })

    // Set up reconnecting handler
    const removeReconnectingHandler = steamClient.on("reconnecting", (attempt, maxAttempts) => {
      console.log(`Reconnection attempt ${attempt} of ${maxAttempts}...`)
    })

    // Set up reconnected handler
    const removeReconnectedHandler = steamClient.on("reconnected", () => {
      console.log("Reconnected to Steam! Resuming farming...")

      const gameIds = configManager.get().games.map((game) => game.appId)
      steamClient.startFarming(gameIds)
    })

    // Set up reconnect failed handler
    const removeReconnectFailedHandler = steamClient.on("reconnectFailed", () => {
      console.log("Failed to reconnect after multiple attempts.")
      console.log('You can try to manually reconnect by selecting "Start Farming" again.')

      returnToMainMenu()
    })

    // Set up error and disconnect handlers with proper cleanup
    const removeErrorHandler = steamClient.on("error", () => {
      // Clean up all handlers
      removeGuardHandler()
      removeLoggedOnHandler()
      removeDisconnectHandler()
      removeReconnectingHandler()
      removeReconnectedHandler()
      removeReconnectFailedHandler()

      // Only return to main menu if we're not trying to reconnect
      if (!steamClient.getStatus().reconnecting) {
        returnToMainMenu()
      }
    })

    const removeDisconnectHandler = steamClient.on("disconnected", () => {
      // We don't need to do anything here as reconnection is handled by the steam client
      console.log("Disconnected from Steam. Attempting to reconnect automatically...")

      // Don't clean up handlers or return to main menu - let reconnection logic handle it
    })
  }

  /**
   * Show farming interface with available commands
   * @param {Function} returnToMainMenu - Function to return to main menu
   */
  function showFarmingInterface(returnToMainMenu) {
    clearConsole()
    const config = configManager.get()

    // Display farming status and commands
    console.log("\n===== Playtime Farming Active =====")
    console.log('Type "status" to check current status.')
    console.log('Type "add" to add a new game while farming.')
    console.log('Type "remove" to remove a game while farming.')
    console.log('Type "reconnect" to manually reconnect if disconnected.')
    console.log('Type "stop" to stop farming and return to menu.')
    console.log('Type "help" to see all available commands.')

    // Create a new readline interface for farming mode
    const farmingRL = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    // Handle farming commands
    farmingRL.on("line", async (input) => {
      const command = input.toLowerCase().trim()

      switch (command) {
        case "stop":
          steamClient.stopFarming()
          farmingRL.close()
          returnToMainMenu()
          break
        case "status":
          handleStatusCommand(config)
          break
        case "debug":
          handleDebugCommand()
          break
        case "add":
          await handleAddGameCommand()
          break
        case "remove":
          await handleRemoveGameCommand(config)
          break
        case "reconnect":
          handleReconnectCommand()
          break
        case "help":
          handleHelpCommand()
          break
        case "clear":
          clearConsole()
          console.log("\n===== Playtime Farming Active =====")
          console.log('Type "help" to see all available commands.')
          break
        default:
          console.log('Unknown command. Type "help" to see available commands.')
      }
    })
  }

  /**
   * Handle status command
   * @param {Object} config - Current configuration
   */
  function handleStatusCommand(config) {
    const status = steamClient.getStatus()
    console.log(`\nConnection Status: ${status.connected ? "Connected" : "Disconnected"}`)
    if (status.reconnecting) {
      console.log("Currently attempting to reconnect...")
    }
    console.log(`Account: ${status.accountName || "Unknown"}`)
    console.log(`Currently farming ${config.games.length} games:`)
    config.games.forEach((game) => console.log(`- ${game.name} (${game.appId})`))
    console.log('\nType "help" to see all available commands.')
  }

  /**
   * Handle debug command
   */
  function handleDebugCommand() {
    const status = steamClient.getStatus()
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
   */
  async function handleAddGameCommand() {
    clearConsole()
    console.log("\n===== Add Game While Farming =====")

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

    const appId = Number.parseInt(appIdInput)

    if (isNaN(appId)) {
      console.log("Invalid AppID. Please enter a number.")
      return
    }

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

    const added = await configManager.addGame(appId, name || `Game ${appId}`)

    if (added) {
      steamClient.addGame(appId)
      console.log(`Game ${appId} added successfully and is now being farmed.`)
    }
  }

  /**
   * Handle remove game command
   * @param {Object} config - Current configuration
   */
  async function handleRemoveGameCommand(config) {
    clearConsole()
    console.log("\n===== Remove Game While Farming =====")
    console.log("Current games:")

    if (config.games.length === 0) {
      console.log("No games configured.")
      return
    }

    config.games.forEach((game, index) => {
      console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`)
    })

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

  return {
    startFarming,
  }
}
