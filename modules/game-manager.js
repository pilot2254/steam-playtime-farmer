/**
 * Game Manager Module
 *
 * Handles all game management functionality including:
 * - Adding games to the configuration
 * - Removing games from the configuration
 * - Displaying the list of configured games
 *
 * This module works with the config manager to persist game data
 * and provides a user interface for managing games.
 */
import readline from "readline"

/**
 * Creates a game manager for handling game operations
 * @param {Object} configManager - Configuration manager for accessing and modifying game list
 * @returns {Object} Game manager API with methods to manage games
 */
export function createGameManager(configManager) {
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
   * Manage games menu
   * Main entry point for game management functionality
   *
   * @param {Function} returnToMainMenu - Function to return to main menu
   */
  async function manageGames(returnToMainMenu) {
    clearConsole()
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
        // Add a new game
        await addGame()
        return manageGames(returnToMainMenu)

      case "2":
        // Remove an existing game
        await removeGame(config)
        return manageGames(returnToMainMenu)

      case "3":
        // Return to main menu
        return returnToMainMenu()

      default:
        // Handle invalid input
        console.log("Invalid choice. Please enter 1, 2, or 3.")
        return manageGames(returnToMainMenu)
    }
  }

  /**
   * Display a list of games
   * Shows all games currently in the configuration
   *
   * @param {Array} games - List of games to display
   */
  function displayGameList(games) {
    console.log("Current games:")

    if (games.length === 0) {
      console.log("No games configured.")
    } else {
      // List all games with their details
      games.forEach((game, index) => {
        console.log(`${index + 1}. AppID: ${game.appId} - ${game.name}`)
      })
    }
  }

  /**
   * Remove a game from configuration
   * Deletes a game from the active configuration
   *
   * @param {Object} config - Current configuration with game information
   */
  async function removeGame(config) {
    // Check if there are any games to remove
    if (config.games.length === 0) {
      console.log("No games to remove.")
      return
    }

    // Get game index from user
    const indexInput = await question("Enter the number of the game to remove: ")
    const idx = Number.parseInt(indexInput) - 1

    // Validate and process removal
    const removed = await configManager.removeGame(idx)
    if (removed) {
      console.log(`Game ${removed.name} (${removed.appId}) removed successfully.`)
    } else {
      console.log("Invalid game number.")
    }
  }

  /**
   * Add a game
   * Adds a new game to the configuration
   *
   * @returns {Promise<boolean>} - True if game was added successfully
   */
  async function addGame() {
    // Get game AppID from user
    const appIdInput = await question("Enter game AppID (number): ")
    const appId = Number.parseInt(appIdInput)

    // Validate AppID
    if (isNaN(appId)) {
      console.log("Invalid AppID. Please enter a number.")
      return false
    }

    // Get game name from user (optional)
    const name = await question("Enter game name (optional): ")

    // Add game to configuration
    const added = await configManager.addGame(appId, name || `Game ${appId}`)

    if (added) {
      console.log(`Game ${appId} added successfully.`)
    }

    return added
  }

  // Return the public API with only the methods that should be accessible from outside
  return {
    manageGames,
  }
}