/**
 * Preset Manager Module
 * Handles preset management functionality
 */
import readline from "readline"

/**
 * Creates a preset manager for handling preset operations
 * @param {Object} configManager - Configuration manager
 * @param {Object} steamClient - Steam client
 * @returns {Object} Preset manager API
 */
export function createPresetManager(configManager, steamClient) {
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
   * Ask a question and get response
   * @param {string} query - The question to ask
   * @returns {Promise<string>} - User's response
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
   * @param {Function} returnToMainMenu - Function to return to main menu
   */
  async function managePresets(returnToMainMenu) {
    clearConsole()
    console.log("\n===== Preset Management =====")

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
        return managePresets(returnToMainMenu)

      case "2":
        await saveCurrentConfigAsPreset()
        return managePresets(returnToMainMenu)

      case "3":
        // Get list of available presets when user wants to load one
        const loadPresets = await configManager.getPresets()
        await loadPreset(loadPresets)
        return managePresets(returnToMainMenu)

      case "4":
        // Get list of available presets when user wants to edit one
        const editPresets = await configManager.getPresets()
        await editPresetFromList(editPresets)
        return managePresets(returnToMainMenu)

      case "5":
        // Get list of available presets when user wants to delete one
        const deletePresets = await configManager.getPresets()
        await deletePreset(deletePresets)
        return managePresets(returnToMainMenu)

      case "6":
        return returnToMainMenu()

      default:
        console.log("Invalid choice. Please enter a number between 1 and 6.")
        return managePresets(returnToMainMenu)
    }
  }

  /**
   * Create a new preset
   */
  async function createNewPreset() {
    clearConsole()
    console.log("\n===== Create New Preset =====")

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
    clearConsole()
    console.log("\n===== Save Current Config as Preset =====")

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
    clearConsole()
    if (presets.length === 0) {
      console.log("No presets available to load.")
      return
    }

    // Display available presets
    console.log("\n===== Load Preset =====")
    console.log("\nAvailable presets:")
    const currentPreset = configManager.getCurrentPreset()
    presets.forEach((preset, index) => {
      const current = preset.id === currentPreset ? " (current)" : ""
      console.log(`${index + 1}. ${preset.name} - Account: ${preset.accountName}${current} (ID: ${preset.id})`)
    })

    const loadIndex = await question("\nEnter the number of the preset to load: ")
    const loadIdx = Number.parseInt(loadIndex) - 1

    if (loadIdx >= 0 && loadIdx < presets.length) {
      // If we're currently farming, we need to stop first
      if (steamClient.isFarming()) {
        console.log("Stopping current farming session to switch presets...")
        steamClient.stopFarming()
      }

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
   * @param {Array} presets - List of available presets
   */
  async function editPresetFromList(presets) {
    clearConsole()
    if (presets.length === 0) {
      console.log("No presets available to edit.")
      return
    }

    // Display available presets
    console.log("\n===== Edit Preset =====")
    console.log("\nAvailable presets:")
    const currentPreset = configManager.getCurrentPreset()
    presets.forEach((preset, index) => {
      const current = preset.id === currentPreset ? " (current)" : ""
      console.log(`${index + 1}. ${preset.name} - Account: ${preset.accountName}${current} (ID: ${preset.id})`)
    })

    const editIndex = await question("\nEnter the number of the preset to edit: ")
    const editIdx = Number.parseInt(editIndex) - 1

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
   * @param {string} presetId - ID of the preset to edit
   * @returns {Promise<boolean>} - True if editing was successful
   */
  async function editPreset(presetId) {
    clearConsole()
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
   * Delete a preset
   * @param {Array} presets - List of available presets
   */
  async function deletePreset(presets) {
    clearConsole()
    if (presets.length === 0) {
      console.log("No presets available to delete.")
      return
    }

    // Display available presets
    console.log("\n===== Delete Preset =====")
    console.log("\nAvailable presets:")
    const currentPreset = configManager.getCurrentPreset()
    presets.forEach((preset, index) => {
      const current = preset.id === currentPreset ? " (current)" : ""
      console.log(`${index + 1}. ${preset.name} - Account: ${preset.accountName}${current} (ID: ${preset.id})`)
    })

    const deleteIndex = await question("\nEnter the number of the preset to delete: ")
    const deleteIdx = Number.parseInt(deleteIndex) - 1

    if (deleteIdx >= 0 && deleteIdx < presets.length) {
      const selectedPreset = presets[deleteIdx]
      console.log(`Selected preset: ${selectedPreset.name} with ID: ${selectedPreset.id}`)

      const confirm = await question(`Are you sure you want to delete preset "${selectedPreset.name}"? (yes/no): `)

      if (confirm.toLowerCase().startsWith("y")) {
        await configManager.deletePreset(selectedPreset.id)
      }
    } else {
      console.log("Invalid preset number.")
    }
  }

  return {
    managePresets,
  }
}
