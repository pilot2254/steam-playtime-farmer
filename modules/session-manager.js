/**
 * Session Manager Module
 * Handles saving and loading Steam session data for persistent connections
 */
import fs from "fs"
import { appConfig } from "../app.config.js"

// Session file path
const SESSION_FILE = appConfig.paths.sessionFile

export function createSessionManager() {
  return {
    /**
     * Save Steam session data to file
     * @param {Object} sessionData - The session data from Steam client
     * @returns {boolean} - Success status
     */
    saveSession(sessionData) {
      try {
        if (!sessionData) return false

        // Convert to JSON string and save to file
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData), "utf8")
        return true
      } catch (err) {
        console.error("Failed to save session data:", err)
        return false
      }
    },

    /**
     * Load Steam session data from file
     * @returns {Object|null} - The session data or null if not found
     */
    loadSession() {
      try {
        if (!fs.existsSync(SESSION_FILE)) return null

        const data = fs.readFileSync(SESSION_FILE, "utf8")
        return JSON.parse(data)
      } catch (err) {
        console.error("Failed to load session data:", err)
        return null
      }
    },

    /**
     * Clear the saved session data
     * @returns {boolean} - Success status
     */
    clearSession() {
      try {
        if (fs.existsSync(SESSION_FILE)) {
          fs.unlinkSync(SESSION_FILE)
        }
        return true
      } catch (err) {
        console.error("Failed to clear session data:", err)
        return false
      }
    },

    /**
     * Check if a session exists
     * @returns {boolean} - True if session exists
     */
    hasSession() {
      return fs.existsSync(SESSION_FILE)
    },
  }
}
