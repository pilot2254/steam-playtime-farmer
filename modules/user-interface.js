/**
 * User Interface Module
 * Handles command-line interface and user interactions
 */
import readline from "readline"
import { appConfig } from "../app.config.js"
import { createMenuManager } from "./menu-manager.js"
import { createFarmingManager } from "./farming-manager.js"
import { createPresetManager } from "./preset-manager.js"
import { createGameManager } from "./game-manager.js"
import { createAccountManager } from "./account-manager.js"

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

  // Create managers
  const menuManager = createMenuManager(rl)
  const farmingManager = createFarmingManager(configManager, steamClient)
  const presetManager = createPresetManager(configManager, steamClient)
  const gameManager = createGameManager(configManager)
  const accountManager = createAccountManager(configManager)

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
    return new Promise((resolve) => rl.question(query, resolve))
  }

  /**
   * Show main menu
   */
  async function showMainMenu() {
    clearConsole()
    console.log(`\n===== ${appConfig.appName} v${appConfig.version} =====`)
    console.log("1. Setup Account")
    console.log("2. Manage Games")
    console.log("3. Start Farming")
    console.log("4. Manage Presets")
    console.log("5. Exit")

    const choice = await question("\nEnter your choice (1-5): ")

    switch (choice) {
      case "1":
        await accountManager.setupAccount()
        return showMainMenu()

      case "2":
        await gameManager.manageGames(showMainMenu)
        return

      case "3":
        await farmingManager.startFarming(showMainMenu)
        return

      case "4":
        await presetManager.managePresets(showMainMenu)
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
