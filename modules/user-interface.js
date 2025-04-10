/**
 * User Interface Module
 *
 * Main interface module that coordinates all user interactions.
 * This module serves as the central hub that:
 * - Initializes all other manager modules
 * - Displays the main menu
 * - Routes user requests to appropriate managers
 * - Handles application-wide UI elements
 *
 * The UI module has been significantly refactored to delegate specific
 * functionality to specialized manager modules, making the codebase
 * more maintainable and easier to understand.
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
 * @param {Object} configManager - Configuration manager for accessing and modifying settings
 * @param {Object} steamClient - Steam client for login and game farming operations
 * @returns {Object} User interface API with methods to control the application
 */
export function createUserInterface(configManager, steamClient) {
  // Create readline interface for main menu interactions
  // Other modules will create their own readline interfaces as needed
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  // Create specialized manager modules
  // Each manager handles a specific aspect of the application
  const menuManager = createMenuManager(rl)
  const farmingManager = createFarmingManager(configManager, steamClient)
  const presetManager = createPresetManager(configManager, steamClient)
  const gameManager = createGameManager(configManager)
  const accountManager = createAccountManager(configManager)

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
   * Uses the main readline interface
   *
   * @param {string} query - The question to ask the user
   * @returns {Promise<string>} - User's response as a promise
   */
  function question(query) {
    return new Promise((resolve) => rl.question(query, resolve))
  }

  /**
   * Show main menu
   * Main entry point for the application UI
   */
  async function showMainMenu() {
    clearConsole()
    console.log(`\n===== ${appConfig.appName} v${appConfig.version} =====`)
    console.log("1. Setup Account")
    console.log("2. Manage Games")
    console.log("3. Start Farming")
    console.log("4. Manage Presets")
    console.log("5. Exit")

    // Get user choice
    const choice = await question("\nEnter your choice (1-5): ")

    // Process user choice by delegating to appropriate manager
    switch (choice) {
      case "1":
        // Setup Steam account
        await accountManager.setupAccount()
        return showMainMenu()

      case "2":
        // Manage games (add/remove)
        await gameManager.manageGames(showMainMenu)
        return

      case "3":
        // Start farming games
        await farmingManager.startFarming(showMainMenu)
        return

      case "4":
        // Manage presets
        await presetManager.managePresets(showMainMenu)
        return

      case "5":
        // Exit application
        console.log("Exiting...")
        steamClient.stopFarming()
        rl.close()
        process.exit(0)

      default:
        // Handle invalid input
        console.log("Invalid choice. Please enter a number between 1 and 5.")
        return showMainMenu()
    }
  }

  // Return the public API with only the methods that should be accessible from outside
  return {
    showMainMenu,
    question,
    close: () => rl.close(),
  }
}