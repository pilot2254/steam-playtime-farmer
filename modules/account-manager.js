/**
 * Account Manager Module
 *
 * Handles Steam account setup and management including:
 * - Setting up account credentials
 * - Configuring Steam Guard options
 * - Managing password storage preferences
 *
 * This module works with the config manager to persist account data
 * and provides a user interface for account setup.
 */
import readline from "readline"

/**
 * Creates an account manager for handling Steam account operations
 * @param {Object} configManager - Configuration manager for accessing and modifying account settings
 * @returns {Object} Account manager API with methods to manage account settings
 */
export function createAccountManager(configManager) {
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
   * Setup Steam account
   * Configures Steam account credentials and settings
   */
  async function setupAccount() {
    clearConsole()
    console.log("\n===== Account Setup =====")

    // Get account username
    const accountName = await question("Enter your Steam username: ")

    // Configure password storage preference
    const rememberPassword = await question("Remember password? (yes/no): ")
    const shouldRemember = rememberPassword.toLowerCase().startsWith("y")

    // Get account password
    const password = await question("Enter your Steam password: ")

    // Handle 2FA setup
    const has2FA = await question("Do you have Steam Guard Mobile Authenticator? (yes/no): ")
    let sharedSecret = ""

    if (has2FA.toLowerCase().startsWith("y")) {
      // Show shared secret info to help users understand what it is
      console.log("\nShared Secret Info:")
      console.log("- This allows automatic 2FA code generation")
      console.log("- Leave blank if you prefer to enter codes manually")
      console.log("- Advanced users can extract this from their authenticator")
      console.log("- Note: Shared secret is typically 20+ characters long\n")

      // Get shared secret (optional)
      sharedSecret = await question("Enter your shared secret (or leave blank): ")
    }

    // Save account details to configuration
    await configManager.updateAccount(accountName, password, shouldRemember, sharedSecret)
    console.log("Account setup complete!")
  }

  // Return the public API with only the methods that should be accessible from outside
  return {
    setupAccount,
  }
}