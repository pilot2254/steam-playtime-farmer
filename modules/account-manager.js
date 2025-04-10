/**
 * Account Manager Module
 * Handles Steam account setup and management
 */
import readline from "readline"

/**
 * Creates an account manager for handling Steam account operations
 * @param {Object} configManager - Configuration manager
 * @returns {Object} Account manager API
 */
export function createAccountManager(configManager) {
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
   * Setup Steam account
   */
  async function setupAccount() {
    clearConsole()
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

  return {
    setupAccount,
  }
}
