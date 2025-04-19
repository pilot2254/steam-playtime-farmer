/**
 * Config Manager Module
 * Handles loading, saving, and managing user configuration and presets
 */
import fs from "fs"
import path from "path"
import { appConfig, defaultConfig } from "../app.config.js"

// Configuration file paths
const CONFIG_FILE = appConfig.paths.configFile
const PRESETS_DIR = appConfig.paths.presetsDir

/**
 * Creates a configuration manager for handling user settings
 * @returns {Object} Configuration manager API
 */
export function createConfigManager() {
  // Current configuration
  let config = { ...defaultConfig }

  // Current preset ID
  let currentPreset = null

  // Helper functions for file operations

  /**
   * Ensure a directory exists
   * @param {string} dir - Directory path
   */
  const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  /**
   * Read JSON file safely
   * @param {string} filePath - Path to JSON file
   * @param {Object} defaultVal - Default value if file doesn't exist
   * @returns {Object} Parsed JSON or default value
   */
  const readJson = (filePath, defaultVal = null) => {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf8"))
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err)
    }
    return defaultVal
  }

  /**
   * Write JSON file safely
   * @param {string} filePath - Path to JSON file
   * @param {Object} data - Data to write
   * @returns {boolean} Success status
   */
  const writeJson = (filePath, data) => {
    try {
      ensureDir(path.dirname(filePath))
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")
      return true
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err)
      return false
    }
  }

  // Return the public API
  return {
    /**
     * Get current configuration
     * @returns {Object} - Current configuration
     */
    get: () => ({ ...config }),

    /**
     * Get current preset ID
     * @returns {string|null} - Current preset ID
     */
    getCurrentPreset: () => currentPreset,

    /**
     * Load configuration from file
     * @returns {Promise<boolean>} - Success status
     */
    async load() {
      const loadedConfig = readJson(CONFIG_FILE, null)
      if (loadedConfig) {
        config = loadedConfig
        console.log("Configuration loaded successfully.")
        return true
      } else {
        console.log("No configuration file found. Using default settings.")
        await this.save()
        return false
      }
    },

    /**
     * Save configuration to file
     * @returns {Promise<boolean>} - Success status
     */
    async save() {
      return writeJson(CONFIG_FILE, config)
    },

    /**
     * Save current configuration as a preset
     * @param {string} id - Preset ID
     * @param {string} name - Preset name
     * @returns {Promise<boolean>} - Success status
     */
    async saveAsPreset(id, name) {
      ensureDir(PRESETS_DIR)
      const presetPath = path.join(PRESETS_DIR, `${id}.json`)

      // Check if preset already exists
      if (fs.existsSync(presetPath)) {
        console.log(`Preset with ID "${id}" already exists.`)
        return false
      }

      // Create preset object from current config
      const preset = {
        id,
        name,
        accountName: config.accountName,
        sharedSecret: config.sharedSecret,
        games: [...config.games],
        rememberPassword: config.rememberPassword,
        password: config.rememberPassword ? config.password : "",
      }

      const success = writeJson(presetPath, preset)
      if (success) {
        console.log(`Preset "${name}" saved successfully.`)
        // Set as current preset
        currentPreset = id
      }
      return success
    },

    /**
     * Load a preset
     * @param {string} id - Preset ID
     * @returns {Promise<boolean>} - Success status
     */
    async loadPreset(id) {
      const presetPath = path.join(PRESETS_DIR, `${id}.json`)
      const preset = readJson(presetPath, null)

      if (!preset) {
        console.log(`Preset with ID "${id}" not found.`)
        return false
      }

      // Update configuration from preset
      config.accountName = preset.accountName || ""
      config.sharedSecret = preset.sharedSecret || ""
      config.games = preset.games || []
      config.rememberPassword = preset.rememberPassword || false
      // Only set password if rememberPassword is true and password exists
      config.password = preset.rememberPassword && preset.password ? preset.password : ""

      // Save to config file
      const saved = await this.save()
      if (saved) {
        // Set as current preset
        currentPreset = id
        console.log(`Preset "${preset.name}" loaded successfully.`)
      }
      return saved
    },

    /**
     * Delete a preset
     * @param {string} id - Preset ID
     * @returns {Promise<boolean>} - Success status
     */
    async deletePreset(id) {
      const presetPath = path.join(PRESETS_DIR, `${id}.json`)

      if (!fs.existsSync(presetPath)) {
        console.log(`Preset with ID "${id}" not found.`)
        return false
      }

      try {
        fs.unlinkSync(presetPath)
        console.log(`Preset "${id}" deleted successfully.`)

        // If this was the current preset, clear it
        if (currentPreset === id) currentPreset = null
        return true
      } catch (err) {
        console.error("Error deleting preset:", err)
        return false
      }
    },

    /**
     * Get all available presets
     * @returns {Promise<Array>} - Array of preset objects
     */
    async getPresets() {
      ensureDir(PRESETS_DIR)
      try {
        const files = fs.readdirSync(PRESETS_DIR)
        const presets = []

        for (const file of files) {
          if (file.endsWith(".json")) {
            const presetId = file.replace(".json", "")
            const preset = readJson(path.join(PRESETS_DIR, file), null)
            if (preset) {
              // Ensure the ID is set correctly from the filename
              preset.id = presetId
              presets.push(preset)
            }
          }
        }
        return presets
      } catch (err) {
        console.error("Error getting presets:", err)
        return []
      }
    },

    /**
     * Add a game to the configuration
     * This is kept for editing the config.json file directly
     * @param {number} appId - Steam AppID
     * @param {string} name - Game name
     * @returns {Promise<boolean>} - Success status
     */
    async addGame(appId, name) {
      // Check if game already exists
      const existingIndex = config.games.findIndex((game) => game.appId === appId)
      if (existingIndex !== -1) {
        console.log(`Game with AppID ${appId} already exists.`)
        return false
      }

      config.games.push({
        appId,
        name: name || `Game ${appId}`,
      })
      return this.save()
    },

    /**
     * Remove a game from the configuration
     * This is kept for editing the config.json file directly
     * @param {number} index - Index of the game to remove
     * @returns {Promise<Object|boolean>} - Removed game or false if failed
     */
    async removeGame(index) {
      if (index < 0 || index >= config.games.length) return false
      const removed = config.games.splice(index, 1)[0]
      await this.save()
      return removed
    },
  }
}