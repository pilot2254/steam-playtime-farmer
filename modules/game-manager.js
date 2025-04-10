/**
 * Game Manager Module
 * Handles game management functionality
 */
import readline from "readline"

/**
 * Creates a game manager for handling game operations
 * @param {Object} configManager - Configuration manager
 * @returns {Object} Game manager API
 */
export function createGameManager(configManager) {
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
   * Manage games menu
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
        await addGame()
        return manageGames(returnToMainMenu)

      case "2":
        await removeGame(config)
        return manageGames(returnToMainMenu)

      case "3":
        return returnToMainMenu()

      default:
        console.log("Invalid choice. Please enter 1, 2, or 3.")
        return manageGames(returnToMainMenu)
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

  return {
    manageGames,
  }
}
