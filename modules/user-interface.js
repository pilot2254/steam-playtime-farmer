/**
 * User Interface Module
 * Handles basic user interactions with a simplified interface
 */
import readline from "readline"

/**
 * Creates a user interface for the application
 * @param {Object} configManager - Configuration manager
 * @param {Object} steamClient - Steam client
 * @returns {Object} User interface API
 */
export function createUserInterface(configManager, steamClient) {
  // Create readline interface - shared for all interactions
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  // State tracking
  let isFarming = false // Whether we're currently farming games

  // Helper functions for UI operations

  /**
   * Clear the console screen
   */
  const clearConsole = () => {
    process.stdout.write("\x1Bc")
    if (process.platform === "win32") console.clear()
  }

  /**
   * Display a question and get response
   * @param {string} query - Question to ask
   * @returns {Promise<string>} - User input
   */
  const question = (query) => new Promise((resolve) => rl.question(query, resolve))

  /**
   * Wait for user to press Enter
   * @param {string} msg - Message to display
   * @returns {Promise<void>}
   */
  const waitForEnter = async (msg = "Press Enter to continue...") => await question(msg)

  /**
   * Exit the application cleanly
   */
  const exitApplication = () => {
    console.log("\nExiting application...")
    steamClient.stopFarming()
    rl.close()
    process.exit(0)
  }

  /**
   * Setup event handlers for Steam farming
   */
  function setupFarmingEventHandlers() {
    // Handle Steam Guard authentication requests
    const removeGuardHandler = steamClient.on("steamGuard", async (domain, callback, lastCodeWrong) => {
      const domainText = domain ? ` for domain ${domain}` : ""
      const wrongText = lastCodeWrong ? " (previous code was wrong)" : ""
      const code = await question(`Steam Guard code needed${domainText}${wrongText}: `)
      callback(code)
    })

    // Handle successful login
    steamClient.on("loggedOn", () => {
      removeGuardHandler() // No longer need the guard handler
      const gameIds = configManager.get().games.map((game) => game.appId)
      steamClient.startFarming(gameIds)
      isFarming = true
      showFarmingInterface()
    })

    // Handle login errors with better password error detection
    steamClient.on("error", (err) => {
      if (err.eresult === 5 || err.message?.includes("password") || err.message?.includes("credentials")) {
        console.error("\nError: Incorrect password or invalid credentials")
        console.log("Please check your password and try again.")
      } else {
        console.error("Steam error:", err.message || "Unknown error")
      }

      // Wait a moment before returning to menu so user can read the error
      setTimeout(() => {
        isFarming = false
        showMainMenu()
      }, 3000)
    })

    // Handle disconnection events
    steamClient.on("disconnected", () => console.log("Disconnected from Steam. Attempting to reconnect..."))

    // Handle reconnection attempts
    steamClient.on("reconnecting", (attempt, maxAttempts) =>
      console.log(`Reconnecting to Steam (${attempt}/${maxAttempts})...`),
    )

    // Handle successful reconnection
    steamClient.on("reconnected", () => {
      console.log("Reconnected to Steam! Resuming farming...")
      const gameIds = configManager.get().games.map((game) => game.appId)
      steamClient.startFarming(gameIds)
    })

    // Handle failed reconnection
    steamClient.on("reconnectFailed", () => {
      console.log("Failed to reconnect after multiple attempts.")
      isFarming = false
      showMainMenu()
    })
  }

  /**
   * Start farming with current configuration
   */
  async function startFarming() {
    clearConsole()
    const config = configManager.get()

    // Validate configuration before starting
    if (!config.games?.length) {
      console.log("No games configured. Add games to the config file or load a preset.")
      await waitForEnter()
      return showMainMenu()
    }

    if (!config.accountName) {
      console.log("No Steam account configured. Edit the config file or load a preset.")
      await waitForEnter()
      return showMainMenu()
    }

    // Set up event handlers for Steam client
    setupFarmingEventHandlers()
    console.log("\n===== Starting Playtime Farming =====")

    // Get password - either from saved config or user input
    const password =
      config.rememberPassword && config.password && config.password.length > 0
        ? config.password
        : await question("Enter your Steam password: ")

    // Attempt to login to Steam
    console.log(`Attempting to login as ${config.accountName}...`)
    steamClient.login(config.accountName, password, config.sharedSecret)

    // Set a timeout to check if login was successful
    setTimeout(() => {
      if (!isFarming && !steamClient.getStatus().connected) {
        console.log("Login attempt timed out or failed. Check your credentials.")
        waitForEnter("\nPress Enter to return to main menu...").then(showMainMenu)
      }
    }, 10000) // Give it 10 seconds to connect
  }

  /**
   * Show farming interface with commands
   */
  function showFarmingInterface() {
    clearConsole()
    const config = configManager.get()
    const games = config.games || []

    // Display farming status
    console.log("\n===== Playtime Farming Active =====")
    console.log(`Account: ${config.accountName}`)
    console.log(`Farming ${games.length} games:`)
    games.forEach((game) => console.log(`- ${game.name} (${game.appId})`))

    // Show available commands
    console.log("\nCommands:")
    console.log("status - Check current status")
    console.log("stop   - Stop farming and return to menu")
    console.log("help   - Show this help message")

    /**
     * Process user commands during farming
     */
    function processCommands() {
      rl.once("line", async (input) => {
        const cmd = input.trim().toLowerCase()

        switch (cmd) {
          case "status":
            // Show current farming status
            const status = steamClient.getStatus()
            console.log(`\nConnection: ${status.connected ? "Connected" : "Disconnected"}`)
            console.log(`Account: ${status.accountName || config.accountName}`)
            console.log(`Currently farming: ${status.playingAppIds.join(", ") || "None"}`)
            break

          case "stop":
            // Stop farming and return to main menu
            console.log("Stopping farming...")
            steamClient.stopFarming()
            isFarming = false
            return showMainMenu()

          case "help":
            // Show help message
            console.log("\nAvailable commands:")
            console.log("status - Check current status")
            console.log("stop   - Stop farming and return to menu")
            console.log("help   - Show this help message")
            break

          default:
            console.log("Unknown command. Type 'help' for available commands.")
        }

        // Continue listening for commands if still farming
        if (isFarming) processCommands()
      })
    }

    // Start listening for commands
    processCommands()
  }

  /**
   * Load a preset from the presets directory
   */
  async function loadPreset() {
    clearConsole()
    console.log("\n===== Load Preset =====")

    // Get available presets
    const presets = await configManager.getPresets()

    // Check if any presets exist
    if (!presets.length) {
      console.log("No presets available.")
      await waitForEnter()
      return showMainMenu()
    }

    // Display available presets
    console.log("Available presets:")
    presets.forEach((preset, i) =>
      console.log(`${i + 1}. ${preset.name} (${preset.games.length} games) - Account: ${preset.accountName}`),
    )

    // Get user selection
    const choice = await question("\nEnter preset number or 'q' to cancel: ")

    if (choice.toLowerCase() === "q") return showMainMenu()

    // Validate selection
    const idx = Number.parseInt(choice) - 1
    if (isNaN(idx) || idx < 0 || idx >= presets.length) {
      console.log("Invalid selection.")
      await waitForEnter()
      return showMainMenu()
    }

    // Load the selected preset
    const preset = presets[idx]
    console.log(`Loading preset: ${preset.name}...`)

    try {
      const success = await configManager.loadPreset(preset.id)
      console.log(success ? "Preset loaded successfully!" : "Failed to load preset.")
    } catch (err) {
      console.error("Error loading preset:", err)
    }

    await waitForEnter()
    showMainMenu()
  }

  /**
   * Save current configuration as a preset
   */
  async function savePreset() {
    clearConsole()
    console.log("\n===== Save Preset =====")

    const config = configManager.get()

    // Validate configuration before saving
    if (!config.accountName) {
      console.log("No account configured. Cannot save preset.")
      await waitForEnter()
      return showMainMenu()
    }

    if (!config.games?.length) {
      console.log("No games configured. Cannot save preset.")
      await waitForEnter()
      return showMainMenu()
    }

    // Get preset ID from user
    const presetId = await question("Enter preset ID (letters, numbers, hyphens only): ")

    // Validate preset ID format
    if (!/^[a-zA-Z0-9-]+$/.test(presetId)) {
      console.log("Invalid preset ID. Use only letters, numbers, and hyphens.")
      await waitForEnter()
      return showMainMenu()
    }

    // Get preset name from user
    const presetName = await question("Enter preset name: ")

    // Validate preset name
    if (!presetName) {
      console.log("Preset name cannot be empty.")
      await waitForEnter()
      return showMainMenu()
    }

    // Save the preset
    try {
      const success = await configManager.saveAsPreset(presetId, presetName)
      console.log(
        success ? `Preset "${presetName}" saved successfully!` : "Failed to save preset. It may already exist.",
      )
    } catch (err) {
      console.error("Error saving preset:", err)
    }

    await waitForEnter()
    showMainMenu()
  }

  /**
   * Delete a preset from the presets directory
   */
  async function deletePreset() {
    clearConsole()
    console.log("\n===== Delete Preset =====")

    // Get available presets
    const presets = await configManager.getPresets()

    // Check if any presets exist
    if (!presets.length) {
      console.log("No presets available.")
      await waitForEnter()
      return showMainMenu()
    }

    // Display available presets
    console.log("Available presets:")
    presets.forEach((preset, i) =>
      console.log(`${i + 1}. ${preset.name} (${preset.games.length} games) - Account: ${preset.accountName}`),
    )

    // Get user selection
    const choice = await question("\nEnter preset number to delete or 'q' to cancel: ")

    if (choice.toLowerCase() === "q") return showMainMenu()

    // Validate selection
    const idx = Number.parseInt(choice) - 1
    if (isNaN(idx) || idx < 0 || idx >= presets.length) {
      console.log("Invalid selection.")
      await waitForEnter()
      return showMainMenu()
    }

    // Confirm deletion
    const preset = presets[idx]
    const confirm = await question(`Are you sure you want to delete "${preset.name}"? (yes/no): `)

    if (confirm.toLowerCase().startsWith("y")) {
      try {
        const success = await configManager.deletePreset(preset.id)
        console.log(success ? `Preset "${preset.name}" deleted.` : "Failed to delete preset.")
      } catch (err) {
        console.error("Error deleting preset:", err)
      }
    } else {
      console.log("Deletion cancelled.")
    }

    await waitForEnter()
    showMainMenu()
  }

  /**
   * Show main menu with options
   */
  async function showMainMenu() {
    try {
      clearConsole()

      // Show header and current configuration summary
      console.log("\n===== Steam Playtime Farmer =====")

      const config = configManager.get()
      console.log(`Account: ${config.accountName || "Not configured"}`)
      console.log(`Games: ${config.games?.length || 0} configured`)
      console.log(`2FA: ${config.sharedSecret ? "Configured" : "Not configured"}`)

      // Show menu options
      console.log("\nOptions:")
      console.log("1. Start Farming")
      console.log("2. Load Preset")
      console.log("3. Save Current Config as Preset")
      console.log("4. Delete Preset")
      console.log("5. Exit")

      // Get user choice
      const choice = await question("\nEnter your choice (1-5): ")

      // Process user choice
      switch (choice) {
        case "1":
          await startFarming()
          break
        case "2":
          await loadPreset()
          break
        case "3":
          await savePreset()
          break
        case "4":
          await deletePreset()
          break
        case "5":
          exitApplication()
          break
        default:
          console.log("Invalid choice.")
          await waitForEnter()
          showMainMenu()
      }
    } catch (err) {
      console.error("Error in main menu:", err)
      await waitForEnter("\nAn error occurred. Press Enter to restart the menu...")
      showMainMenu()
    }
  }

  // Return the public API
  return {
    start: showMainMenu, // Start the user interface
    close: () => rl.close(), // Close the readline interface
  }
}