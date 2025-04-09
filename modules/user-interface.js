/**
 * User Interface Module
 * Handles command-line interface and user interactions
 */
import readline from "readline"
import { appConfig } from "../app.config.js"
import { createMenuManager } from "./menu-manager.js" // New module for menu handling

/**
 * Creates a user interface for interacting with the application
 * @param {Object} configManager - Configuration manager
 * @param {Object} steamClient - Steam client
 * @returns {Object} User interface API
 */
export function createUserInterface(configManager, steamClient) {
  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  // Create menu manager
  const menuManager = createMenuManager(rl)

  /**
   * Ask a question and get response
   * @param {string} query - The question to ask
   * @returns {Promise<string>} - User's response
   */
  function question(query) {
    return new Promise((resolve) => rl.question(query, resolve))
  }

  /**
   * Setup Steam account
   */
  async function setupAccount() {
    console.log("\n===== Account Setup =====")

    // Get account details
    const accountName = await question("Enter your Steam username: ")
    const rememberPassword = await question("Remember password? (yes/no): ")
    const shouldRemember = rememberPassword.toLowerCase().startsWith("y")
    const password = await question("Enter your Steam password: ")

    // Handle 2FA setup
    const has2FA = await question("Do you have Steam Guard Mobile Authenticator? (yes/no): ")
    let sharedSecret = ""

    if (has2FA.toLowerCase().startsWith("y")) {
      // Show shared secret info
      console.log("\nShared Secret Info:")
      console.log("- This allows automatic 2FA code generation")
      console.log("- Leave blank if you prefer to enter codes manually")
      console.log("- Advanced users can extract this from their authenticator")
      console.log("- Note: Shared secret is typically 20+ characters long\n")

      sharedSecret = await question("Enter your shared secret (or leave blank): ")
    }

    // Save account details
    await configManager.updateAccount(accountName, password, shouldRemember, sharedSecret)
    console.log("Account setup complete!")
  }

  /**
   * Manage games menu
   */
  async function manageGames() {
    const config = configManager.get()

    console.log("\n===== Game Management =====")

    // Display current games
    displayGameList(config.games)

    // Show options
    console.log("\nOptions:")
    console.log("1. Add game")
    console.log("2. Remove game")
    console.log("3. Return to main menu")

    // Handle user choice
    const choice = await question("\nEnter your choice (1-3): ")

    switch (choice) {
      case "1":
        await addGame()
        return manageGames()

      case "2":
        await removeGame(config)
        return manageGames()

      case "3":
        return showMainMenu()

      default:
        console.log("Invalid choice. Please enter 1, 2, or 3.")
        return manageGames()
    }
  }

  /**
   * Display a list of games
   * @param {Array} games - List of games to display
   */
  function displayGameList(games) {
    console.log("Current games:")

    if (games.length === 0) {
      console.log("No games configured.")
    } else {
      games.forEach((game, index) => {
        console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`)
      })
    }
  }

  /**
   * Remove a game from configuration
   * @param {Object} config - Current configuration
   */
  async function removeGame(config) {
    if (config.games.length === 0) {
      console.log("No games to remove.")
      return
    }

    const indexInput = await question("Enter the number of the game to remove: ")
    const idx = Number.parseInt(indexInput) - 1

    const removed = await configManager.removeGame(idx)
    if (removed) {
      console.log(`Game ${removed.name} (${removed.appId}) removed successfully.`)
    } else {
      console.log("Invalid game number.")
    }
  }

  /**
   * Add a game
   * @returns {Promise<boolean>} - True if game was added successfully
   */
  async function addGame() {
    const appIdInput = await question("Enter game AppID (number): ")
    const appId = Number.parseInt(appIdInput)

    if (isNaN(appId)) {
      console.log("Invalid AppID. Please enter a number.")
      return false
    }

    const name = await question("Enter game name (optional): ")
    const added = await configManager.addGame(appId, name || `Game ${appId}`)

    if (added) {
      console.log(`Game ${appId} added successfully.`)
    }

    return added
  }

  /**
   * Edit a preset
   * @param {string} presetId - ID of the preset to edit
   * @returns {Promise<boolean>} - True if editing was successful
   */
  async function editPreset(presetId) {
    const preset = await configManager.getPreset(presetId)

    if (!preset) {
      console.log(`Preset ${presetId} not found.`)
      return false
    }

    console.log(`\n===== Editing Preset: ${preset.name} =====`)
    console.log("1. Edit preset name")
    console.log("2. Edit games")
    console.log("3. Return to preset management")

    const choice = await question("\nEnter your choice (1-3): ")

    switch (choice) {
      case "1":
        await editPresetName(presetId, preset)
        return editPreset(presetId)

      case "2":
        await editPresetGames(presetId, preset)
        return editPreset(presetId)

      case "3":
        return true

      default:
        console.log("Invalid choice. Please enter a number between 1 and 3.")
        return editPreset(presetId)
    }
  }

  /**
   * Edit preset name
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   */
  async function editPresetName(presetId, preset) {
    const newName = await question(`Enter new name for preset (current: ${preset.name}): `)

    if (newName && newName !== preset.name) {
      preset.name = newName
      await configManager.updatePreset(presetId, preset)
      console.log(`Preset name updated to "${newName}".`)
    }
  }

  /**
   * Edit games in a preset
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   * @returns {Promise<boolean>} - True if editing was successful
   */
  async function editPresetGames(presetId, preset) {
    console.log("\n===== Edit Games in Preset =====")

    // Display current games in preset
    if (!preset.games || preset.games.length === 0) {
      console.log("No games in this preset.")
    } else {
      preset.games.forEach((game, index) => {
        console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`)
      })
    }

    // Show options
    console.log("\nOptions:")
    console.log("1. Add game")
    console.log("2. Remove game")
    console.log("3. Edit game")
    console.log("4. Return to preset editing")

    const choice = await question("\nEnter your choice (1-4): ")

    switch (choice) {
      case "1":
        await addGameToPreset(presetId, preset)
        return editPresetGames(presetId, preset)

      case "2":
        await removeGameFromPreset(presetId, preset)
        return editPresetGames(presetId, preset)

      case "3":
        await editGameInPreset(presetId, preset)
        return editPresetGames(presetId, preset)

      case "4":
        return true

      default:
        console.log("Invalid choice. Please enter a number between 1 and 4.")
        return editPresetGames(presetId, preset)
    }
  }

  /**
   * Add a game to a preset
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   */
  async function addGameToPreset(presetId, preset) {
    const appIdInput = await question("Enter game AppID (number): ")
    const appId = Number.parseInt(appIdInput)

    if (isNaN(appId)) {
      console.log("Invalid AppID. Please enter a number.")
      return
    }

    // Check if game already exists
    const existingGame = preset.games.find((game) => game.appId === appId)
    if (existingGame) {
      console.log(`Game with AppID ${appId} already exists as "${existingGame.name}".`)
      return
    }

    const name = await question("Enter game name (optional): ")
    preset.games.push({ appId, name: name || `Game ${appId}` })

    await configManager.updatePreset(presetId, preset)
    console.log(`Game ${appId} added to preset.`)
  }

  /**
   * Remove a game from a preset
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   */
  async function removeGameFromPreset(presetId, preset) {
    if (!preset.games || preset.games.length === 0) {
      console.log("No games to remove.")
      return
    }

    const removeIndex = await question("Enter the number of the game to remove: ")
    const removeIdx = Number.parseInt(removeIndex) - 1

    if (removeIdx >= 0 && removeIdx < preset.games.length) {
      const removed = preset.games.splice(removeIdx, 1)[0]
      await configManager.updatePreset(presetId, preset)
      console.log(`Game ${removed.name} (${removed.appId}) removed from preset.`)
    } else {
      console.log("Invalid game number.")
    }
  }

  /**
   * Edit a game in a preset
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   */
  async function editGameInPreset(presetId, preset) {
    if (!preset.games || preset.games.length === 0) {
      console.log("No games to edit.")
      return
    }

    const editIndex = await question("Enter the number of the game to edit: ")
    const editIdx = Number.parseInt(editIndex) - 1

    if (editIdx >= 0 && editIdx < preset.games.length) {
      const game = preset.games[editIdx]

      console.log(`Editing game: ${game.name} (${game.appId})`)

      // Edit AppID
      const newAppIdInput = await question(`Enter new AppID (current: ${game.appId}, leave blank to keep): `)
      if (newAppIdInput) {
        const newAppId = Number.parseInt(newAppIdInput)
        if (!isNaN(newAppId)) {
          game.appId = newAppId
        } else {
          console.log("Invalid AppID. Keeping current value.")
        }
      }

      // Edit name
      const newName = await question(`Enter new name (current: ${game.name}, leave blank to keep): `)
      if (newName) {
        game.name = newName
      }

      await configManager.updatePreset(presetId, preset)
      console.log(`Game updated: ${game.name} (${game.appId})`)
    } else {
      console.log("Invalid game number.")
    }
  }

  /**
   * Manage presets menu
   */
  async function managePresets() {
    console.log("\n===== Preset Management =====")

    // Get list of available presets
    const presets = await configManager.getPresets()
    const currentPreset = configManager.getCurrentPreset()

    // Display available presets
    console.log("Available presets:")
    if (presets.length === 0) {
      console.log("No presets found.")
    } else {
      presets.forEach((preset, index) => {
        const current = preset.id === currentPreset ? " (current)" : ""
        console.log(`${index + 1}. ${preset.name} - Account: ${preset.accountName}${current}`)
      })
    }

    // Show options
    console.log("\nOptions:")
    console.log("1. Create new preset")
    console.log("2. Save current config as preset")
    console.log("3. Load preset")
    console.log("4. Edit preset")
    console.log("5. Delete preset")
    console.log("6. Return to main menu")

    const choice = await question("\nEnter your choice (1-6): ")

    switch (choice) {
      case "1":
        await createNewPreset()
        return managePresets()

      case "2":
        await saveCurrentConfigAsPreset()
        return managePresets()

      case "3":
        await loadPreset(presets)
        return managePresets()

      case "4":
        await editPresetFromList(presets)
        return managePresets()

      case "5":
        await deletePreset(presets)
        return managePresets()

      case "6":
        return showMainMenu()

      default:
        console.log("Invalid choice. Please enter a number between 1 and 6.")
        return managePresets()
    }
  }

  /**
   * Create a new preset
   */
  async function createNewPreset() {
    const presetId = await question("Enter preset ID (letters, numbers, hyphens only): ")

    if (!/^[a-zA-Z0-9-]+$/.test(presetId)) {
      console.log("Invalid preset ID. Use only letters, numbers, and hyphens.")
      return
    }

    const presetName = await question("Enter preset name: ")

    if (!presetName) {
      console.log("Preset name cannot be empty.")
      return
    }

    await configManager.saveAsPreset(presetId, presetName)
  }

  /**
   * Save current configuration as a preset
   */
  async function saveCurrentConfigAsPreset() {
    const presetId = await question("Enter preset ID (letters, numbers, hyphens only): ")

    if (!/^[a-zA-Z0-9-]+$/.test(presetId)) {
      console.log("Invalid preset ID. Use only letters, numbers, and hyphens.")
      return
    }

    const presetName = await question("Enter preset name: ")

    if (!presetName) {
      console.log("Preset name cannot be empty.")
      return
    }

    await configManager.saveCurrentConfigAsPreset(presetId, presetName)
  }

  /**
   * Load a preset
   * @param {Array} presets - List of available presets
   */
  async function loadPreset(presets) {
    if (presets.length === 0) {
      console.log("No presets available to load.")
      return
    }

    const loadIndex = await question("Enter the number of the preset to load: ")
    const loadIdx = Number.parseInt(loadIndex) - 1

    if (loadIdx >= 0 && loadIdx < presets.length) {
      // If we're currently farming, we need to stop first
      if (steamClient.isFarming()) {
        console.log("Stopping current farming session to switch presets...")
        steamClient.stopFarming()
      }

      const loaded = await configManager.loadPreset(presets[loadIdx].id)

      if (loaded) {
        console.log(`Preset "${presets[loadIdx].name}" loaded successfully.`)
        console.log("You will need to start farming again with the new preset.")
      }
    } else {
      console.log("Invalid preset number.")
    }
  }

  /**
   * Edit a preset from the list
   * @param {Array} presets - List of available presets
   */
  async function editPresetFromList(presets) {
    if (presets.length === 0) {
      console.log("No presets available to edit.")
      return
    }

    const editIndex = await question("Enter the number of the preset to edit: ")
    const editIdx = Number.parseInt(editIndex) - 1

    if (editIdx >= 0 && editIdx < presets.length) {
      await editPreset(presets[editIdx].id)
    } else {
      console.log("Invalid preset number.")
    }
  }

  /**
   * Delete a preset
   * @param {Array} presets - List of available presets
   */
  async function deletePreset(presets) {
    if (presets.length === 0) {
      console.log("No presets available to delete.")
      return
    }

    const deleteIndex = await question("Enter the number of the preset to delete: ")
    const deleteIdx = Number.parseInt(deleteIndex) - 1

    if (deleteIdx >= 0 && deleteIdx < presets.length) {
      const confirm = await question(`Are you sure you want to delete preset "${presets[deleteIdx].name}"? (yes/no): `)

      if (confirm.toLowerCase().startsWith("y")) {
        await configManager.deletePreset(presets[deleteIdx].id)
      }
    } else {
      console.log("Invalid preset number.")
    }
  }

  /**
   * Start farming games
   */
  async function startFarming() {
    const config = configManager.get()

    // Check if we have games to farm
    if (config.games.length === 0) {
      console.log("No games configured. Please add games first.")
      return showMainMenu()
    }

    // Check if already farming
    if (steamClient.isFarming()) {
      console.log("Already farming playtime. Please stop the current session first.")
      return showMainMenu()
    }

    console.log("\n===== Starting Playtime Farming =====")

    // Set up event handlers
    setupFarmingEventHandlers()

    // Login to Steam
    const password =
      config.rememberPassword && config.password ? config.password : await question("Enter your Steam password: ")

    steamClient.login(config.accountName, password, config.sharedSecret)
  }

  /**
   * Set up event handlers for farming
   */
  function setupFarmingEventHandlers() {
    // Set up Steam Guard handler (only needed during login)
    const removeGuardHandler = steamClient.on("steamGuard", async (domain, callback, lastCodeWrong) => {
      const domainText = domain ? ` for domain ${domain}` : ""
      const wrongText = lastCodeWrong ? " (previous code was wrong)" : ""
      const code = await question(`Steam Guard code needed${domainText}${wrongText}: `)
      callback(code)
    })

    // Set up logged on handler
    const removeLoggedOnHandler = steamClient.on("loggedOn", () => {
      // Clean up the Steam Guard handler after successful login
      removeGuardHandler()

      const gameIds = configManager.get().games.map((game) => game.appId)
      steamClient.startFarming(gameIds)
      showFarmingInterface()
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

      showMainMenu()
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
        showMainMenu()
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
   */
  function showFarmingInterface() {
    const config = configManager.get()

    // Display farming status and commands
    console.log("\nPlaytime farming is now active.")
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
          handleStopFarming(farmingRL)
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
        default:
          console.log('Unknown command. Type "help" to see available commands.')
      }
    })
  }

  /**
   * Handle stop farming command
   * @param {Object} farmingRL - Readline interface for farming mode
   */
  function handleStopFarming(farmingRL) {
    steamClient.stopFarming()
    farmingRL.close()
    showMainMenu()
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
    console.log("\n===== Add Game While Farming =====")
    const appIdInput = await question("Enter game AppID (number): ")
    const appId = Number.parseInt(appIdInput)

    if (isNaN(appId)) {
      console.log("Invalid AppID. Please enter a number.")
      return
    }

    const name = await question("Enter game name (optional): ")
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
    console.log("\n===== Remove Game While Farming =====")
    console.log("Current games:")

    if (config.games.length === 0) {
      console.log("No games configured.")
      return
    }

    config.games.forEach((game, index) => {
      console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`)
    })

    const indexInput = await question("Enter the number of the game to remove: ")
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
    console.log("- stop: Stop farming and return to main menu")
    console.log("- help: Show this help message")
  }

  /**
   * Show main menu
   */
  async function showMainMenu() {
    console.log(`\n===== ${appConfig.appName} v${appConfig.version} =====`)
    console.log("1. Setup Account")
    console.log("2. Manage Games")
    console.log("3. Start Farming")
    console.log("4. Manage Presets")
    console.log("5. Exit")

    const choice = await question("\nEnter your choice (1-5): ")

    switch (choice) {
      case "1":
        await setupAccount()
        return showMainMenu()

      case "2":
        await manageGames()
        return

      case "3":
        await startFarming()
        return

      case "4":
        await managePresets()
        return

      case "5":
        console.log("Exiting...")
        steamClient.stopFarming()
        rl.close()
        process.exit(0)

      default:
        console.log("Invalid choice. Please enter a number between 1 and 5.")
        return showMainMenu()
    }
  }

  // Return the public API
  return {
    showMainMenu,
    question,
    close: () => rl.close(),
  }
}