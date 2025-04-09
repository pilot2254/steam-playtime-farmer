/**
 * Menu Manager Module
 * Handles menu rendering and navigation
 */

/**
 * Creates a menu manager for handling CLI menus
 * @param {Object} rl - Readline interface
 * @returns {Object} Menu manager API
 */
export function createMenuManager(rl) {
  /**
   * Display a menu with options
   * @param {string} title - Menu title
   * @param {Array} options - Array of menu options
   * @returns {Promise<number>} - Selected option index
   */
  async function showMenu(title, options) {
    console.log(`\n===== ${title} =====`)

    options.forEach((option, index) => {
      console.log(`${index + 1}. ${option}`)
    })

    const choice = await question("\nEnter your choice (1-" + options.length + "): ")
    const choiceNum = Number.parseInt(choice)

    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > options.length) {
      console.log(`Invalid choice. Please enter a number between 1 and ${options.length}.`)
      return -1
    }

    return choiceNum - 1
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
   * Display a confirmation dialog
   * @param {string} message - Confirmation message
   * @returns {Promise<boolean>} - True if confirmed
   */
  async function confirm(message) {
    const response = await question(`${message} (yes/no): `)
    return response.toLowerCase().startsWith("y")
  }

  return {
    showMenu,
    question,
    confirm,
  }
}