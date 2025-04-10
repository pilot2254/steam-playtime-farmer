/**
 * Preset Manager Module
 *
 * Handles all preset-related functionality including:
 * - Creating, editing, and deleting presets
 * - Loading presets into the active configuration
 * - Managing games within presets
 *
 * Presets allow users to save different configurations (accounts, games)
 * and quickly switch between them without manual reconfiguration.
 *
 * This module works closely with the config manager to persist preset data.
 */
import readline from "readline"

/**
 * Creates a preset manager for handling preset operations
 * @param {Object} configManager - Configuration manager for accessing and modifying presets
 * @param {Object} steamClient - Steam client for stopping farming when switching presets
 * @returns {Object} Preset manager API with methods to manage presets
 */
export function createPresetManager(configManager, steamClient) {
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
   * Ask a question and get response
   * Creates a temporary readline interface for a single question
   *
   * @param {string} query - The question to ask the user
   * @returns {Promise<string>} - User's response as a promise
   */
  function question(query) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      rl.question(query, (answer) => {
        rl.close()
        resolve(answer)
      })
    })
  }

  /**
   * Manage presets menu
   * Main entry point for preset management functionality
   *
   * @param {Function} returnToMainMenu - Function to return to main menu
   */
  async function managePresets(returnToMainMenu) {
    clearConsole()
    console.log("\n===== Preset Management =====")

    // Show available options
    console.log("\nOptions:")
    console.log("1. Create new preset")
    console.log("2. Save current config as preset")
    console.log("3. Load preset")
    console.log("4. Edit preset")
    console.log("5. Delete preset")
    console.log("6. Return to main menu")

    // Get user choice
    const choice = await question("\nEnter your choice (1-6): ")

    // Process user choice
    switch (choice) {
      case "1":
        // Create a new preset from scratch
        await createNewPreset()
        return managePresets(returnToMainMenu)

      case "2":
        // Save current configuration as a preset
        await saveCurrentConfigAsPreset()
        return managePresets(returnToMainMenu)

      case "3":
        // Load an existing preset
        const loadPresets = await configManager.getPresets()
        await loadPreset(loadPresets)
        return managePresets(returnToMainMenu)

      case "4":
        // Edit an existing preset
        const editPresets = await configManager.getPresets()
        await editPresetFromList(editPresets)
        return managePresets(returnToMainMenu)

      case "5":
        // Delete an existing preset
        const deletePresets = await configManager.getPresets()
        await deletePreset(deletePresets)
        return managePresets(returnToMainMenu)

      case "6":
        // Return to main menu
        return returnToMainMenu()

      default:
        // Handle invalid input
        console.log("Invalid choice. Please enter a number between 1 and 6.")
        return managePresets(returnToMainMenu)
    }
  }

  /**
   * Create a new preset
   * Creates a preset with the current configuration
   */
  async function createNewPreset() {
    clearConsole()
    console.log("\n===== Create New Preset =====")

    // Get preset ID from user (used for file naming)
    const presetId = await question("Enter preset ID (letters, numbers, hyphens only): ")

    // Validate preset ID format
    if (!/^[a-zA-Z0-9-]+$/.test(presetId)) {
      console.log("Invalid preset ID. Use only letters, numbers, and hyphens.")
      return
    }

    // Get preset name from user (display name)
    const presetName = await question("Enter preset name: ")

    // Validate preset name
    if (!presetName) {
      console.log("Preset name cannot be empty.")
      return
    }

    // Save the preset
    await configManager.saveAsPreset(presetId, presetName)
  }

  /**
   * Save current configuration as a preset
   * Similar to createNewPreset but with clearer naming
   */
  async function saveCurrentConfigAsPreset() {
    clearConsole()
    console.log("\n===== Save Current Config as Preset =====")

    // Get preset ID from user
    const presetId = await question("Enter preset ID (letters, numbers, hyphens only): ")

    // Validate preset ID format
    if (!/^[a-zA-Z0-9-]+$/.test(presetId)) {
      console.log("Invalid preset ID. Use only letters, numbers, and hyphens.")
      return
    }

    // Get preset name from user
    const presetName = await question("Enter preset name: ")

    // Validate preset name
    if (!presetName) {
      console.log("Preset name cannot be empty.")
      return
    }

    // Save current configuration as a preset
    await configManager.saveCurrentConfigAsPreset(presetId, presetName)
  }

  /**
   * Load a preset
   * Loads a preset into the active configuration
   *
   * @param {Array} presets - List of available presets
   */
  async function loadPreset(presets) {
    clearConsole()

    // Check if there are any presets available
    if (presets.length === 0) {
      console.log("No presets available to load.")
      return
    }

    // Display available presets
    console.log("\n===== Load Preset =====")
    console.log("\nAvailable presets:")
    const currentPreset = configManager.getCurrentPreset()

    // List all presets with their details
    presets.forEach((preset, index) => {
      const current = preset.id === currentPreset ? " (current)" : ""
      console.log(`${index + 1}. ${preset.name} - Account: ${preset.accountName}${current} (ID: ${preset.id})`)
    })

    // Get user selection
    const loadIndex = await question("\nEnter the number of the preset to load: ")
    const loadIdx = Number.parseInt(loadIndex) - 1

    // Validate selection
    if (loadIdx >= 0 && loadIdx < presets.length) {
      // If currently farming, stop before switching presets
      if (steamClient.isFarming()) {
        console.log("Stopping current farming session to switch presets...")
        steamClient.stopFarming()
      }

      // Load the selected preset
      const selectedPreset = presets[loadIdx]
      console.log(`Selected preset: ${selectedPreset.name} with ID: ${selectedPreset.id}`)

      const loaded = await configManager.loadPreset(selectedPreset.id)

      if (loaded) {
        console.log(`Preset "${selectedPreset.name}" loaded successfully.`)
        console.log("You will need to start farming again with the new preset.")
      }
    } else {
      console.log("Invalid preset number.")
    }
  }

  /**
   * Edit a preset from the list
   * Shows a list of presets and allows the user to select one to edit
   *
   * @param {Array} presets - List of available presets
   */
  async function editPresetFromList(presets) {
    clearConsole()

    // Check if there are any presets available
    if (presets.length === 0) {
      console.log("No presets available to edit.")
      return
    }

    // Display available presets
    console.log("\n===== Edit Preset =====")
    console.log("\nAvailable presets:")
    const currentPreset = configManager.getCurrentPreset()

    // List all presets with their details
    presets.forEach((preset, index) => {
      const current = preset.id === currentPreset ? " (current)" : ""
      console.log(`${index + 1}. ${preset.name} - Account: ${preset.accountName}${current} (ID: ${preset.id})`)
    })

    // Get user selection
    const editIndex = await question("\nEnter the number of the preset to edit: ")
    const editIdx = Number.parseInt(editIndex) - 1

    // Validate selection
    if (editIdx >= 0 && editIdx < presets.length) {
      const selectedPreset = presets[editIdx]
      console.log(`Selected preset: ${selectedPreset.name} with ID: ${selectedPreset.id}`)
      await editPreset(selectedPreset.id)
    } else {
      console.log("Invalid preset number.")
    }
  }

  /**
   * Edit a preset
   * Allows editing various aspects of a preset
   *
   * @param {string} presetId - ID of the preset to edit
   * @returns {Promise<boolean>} - True if editing was successful
   */
  async function editPreset(presetId) {
    clearConsole()

    // Load the preset data
    const preset = await configManager.getPreset(presetId)

    // Check if preset exists
    if (!preset) {
      console.log(`Preset ${presetId} not found.`)
      return false
    }

    // Show edit options
    console.log(`\n===== Editing Preset: ${preset.name} =====`)
    console.log("1. Edit preset name")
    console.log("2. Edit games")
    console.log("3. Return to preset management")

    // Get user choice
    const choice = await question("\nEnter your choice (1-3): ")

    // Process user choice
    switch (choice) {
      case "1":
        // Edit preset name
        await editPresetName(presetId, preset)
        return editPreset(presetId)

      case "2":
        // Edit games in the preset
        await editPresetGames(presetId, preset)
        return editPreset(presetId)

      case "3":
        // Return to preset management
        return true

      default:
        // Handle invalid input
        console.log("Invalid choice. Please enter a number between 1 and 3.")
        return editPreset(presetId)
    }
  }

  /**
   * Edit preset name
   * Changes the display name of a preset
   *
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   */
  async function editPresetName(presetId, preset) {
    // Get new name from user
    const newName = await question(`Enter new name for preset (current: ${preset.name}): `)

    // Update name if changed
    if (newName && newName !== preset.name) {
      preset.name = newName
      await configManager.updatePreset(presetId, preset)
      console.log(`Preset name updated to "${newName}".`)
    }
  }

  /**
   * Edit games in a preset
   * Allows adding, removing, and editing games in a preset
   *
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   * @returns {Promise<boolean>} - True if editing was successful
   */
  async function editPresetGames(presetId, preset) {
    clearConsole()
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

    // Get user choice
    const choice = await question("\nEnter your choice (1-4): ")

    // Process user choice
    switch (choice) {
      case "1":
        // Add a game to the preset
        await addGameToPreset(presetId, preset)
        return editPresetGames(presetId, preset)

      case "2":
        // Remove a game from the preset
        await removeGameFromPreset(presetId, preset)
        return editPresetGames(presetId, preset)

      case "3":
        // Edit a game in the preset
        await editGameInPreset(presetId, preset)
        return editPresetGames(presetId, preset)

      case "4":
        // Return to preset editing
        return true

      default:
        // Handle invalid input
        console.log("Invalid choice. Please enter a number between 1 and 4.")
        return editPresetGames(presetId, preset)
    }
  }

  /**
   * Add a game to a preset
   * Adds a new game to an existing preset
   *
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   */
  async function addGameToPreset(presetId, preset) {
    // Get game AppID from user
    const appIdInput = await question("Enter game AppID (number): ")
    const appId = Number.parseInt(appIdInput)

    // Validate AppID
    if (isNaN(appId)) {
      console.log("Invalid AppID. Please enter a number.")
      return
    }

    // Check if game already exists in preset
    const existingGame = preset.games.find((game) => game.appId === appId)
    if (existingGame) {
      console.log(`Game with AppID ${appId} already exists as "${existingGame.name}".`)
      return
    }

    // Get game name from user
    const name = await question("Enter game name (optional): ")

    // Add game to preset
    preset.games.push({ appId, name: name || `Game ${appId}` })

    // Save updated preset
    await configManager.updatePreset(presetId, preset)
    console.log(`Game ${appId} added to preset.`)
  }

  /**
   * Remove a game from a preset
   * Removes a game from an existing preset
   *
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   */
  async function removeGameFromPreset(presetId, preset) {
    // Check if there are any games to remove
    if (!preset.games || preset.games.length === 0) {
      console.log("No games to remove.")
      return
    }

    // Get game index from user
    const removeIndex = await question("Enter the number of the game to remove: ")
    const removeIdx = Number.parseInt(removeIndex) - 1

    // Validate and process removal
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
   * Modifies an existing game in a preset
   *
   * @param {string} presetId - ID of the preset
   * @param {Object} preset - The preset object
   */
  async function editGameInPreset(presetId, preset) {
    // Check if there are any games to edit
    if (!preset.games || preset.games.length === 0) {
      console.log("No games to edit.")
      return
    }

    // Get game index from user
    const editIndex = await question("Enter the number of the game to edit: ")
    const editIdx = Number.parseInt(editIndex) - 1

    // Validate and process edit
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

      // Save updated preset
      await configManager.updatePreset(presetId, preset)
      console.log(`Game updated: ${game.name} (${game.appId})`)
    } else {
      console.log("Invalid game number.")
    }
  }

  /**
   * Delete a preset
   * Permanently removes a preset from the system
   *
   * @param {Array} presets - List of available presets
   */
  async function deletePreset(presets) {
    clearConsole()

    // Check if there are any presets available
    if (presets.length === 0) {
      console.log("No presets available to delete.")
      return
    }

    // Display available presets
    console.log("\n===== Delete Preset =====")
    console.log("\nAvailable presets:")
    const currentPreset = configManager.getCurrentPreset()

    // List all presets with their details
    presets.forEach((preset, index) => {
      const current = preset.id === currentPreset ? " (current)" : ""
      console.log(`${index + 1}. ${preset.name} - Account: ${preset.accountName}${current} (ID: ${preset.id})`)
    })

    // Get user selection
    const deleteIndex = await question("\nEnter the number of the preset to delete: ")
    const deleteIdx = Number.parseInt(deleteIndex) - 1

    // Validate selection and confirm deletion
    if (deleteIdx >= 0 && deleteIdx < presets.length) {
      const selectedPreset = presets[deleteIdx]
      console.log(`Selected preset: ${selectedPreset.name} with ID: ${selectedPreset.id}`)

      // Confirm deletion to prevent accidents
      const confirm = await question(`Are you sure you want to delete preset "${selectedPreset.name}"? (yes/no): `)

      if (confirm.toLowerCase().startsWith("y")) {
        await configManager.deletePreset(selectedPreset.id)
      }
    } else {
      console.log("Invalid preset number.")
    }
  }

  // Return the public API with only the methods that should be accessible from outside
  return {
    managePresets,
  }
}