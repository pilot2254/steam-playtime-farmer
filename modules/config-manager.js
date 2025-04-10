/**
 * Config Manager Module
 * Handles loading, saving, and managing user configuration
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

  /**
   * Ensure a directory exists
   * @param {string} dir - Directory path
   */
  function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  /**
   * Read JSON file safely
   * @param {string} filePath - Path to JSON file
   * @param {Object} defaultValue - Default value if file doesn't exist
   * @returns {Object} Parsed JSON or default value
   */
  function readJsonFile(filePath, defaultValue = null) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8")
        return JSON.parse(data)
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err)
    }
    return defaultValue
  }

  /**
   * Write JSON file safely
   * @param {string} filePath - Path to JSON file
   * @param {Object} data - Data to write
   * @returns {boolean} Success status
   */
  function writeJsonFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")
      return true
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err)
      return false
    }
  }

  return {
    /**
     * Get current configuration
     * @returns {Object} - Current configuration
     */
    get() {
      return { ...config }
    },

    /**
     * Get current preset ID
     * @returns {string|null} - Current preset ID
     */
    getCurrentPreset() {
      return currentPreset
    },

    /**
     * Load configuration from file
     * @returns {Promise<boolean>} - Success status
     */
    async load() {
      const loadedConfig = readJsonFile(CONFIG_FILE, null)

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
      return writeJsonFile(CONFIG_FILE, config)
    },

    /**
     * Update account information
     * @param {string} accountName - Steam account name
     * @param {string} password - Steam password
     * @param {boolean} rememberPassword - Whether to save the password
     * @param {string} sharedSecret - Steam shared secret for 2FA
     * @returns {Promise<boolean>} - Success status
     */
    async updateAccount(accountName, password, rememberPassword, sharedSecret) {
      config.accountName = accountName
      config.sharedSecret = sharedSecret || ""
      config.rememberPassword = rememberPassword

      if (rememberPassword) {
        config.password = password
      } else {
        config.password = ""
      }

      return this.save()
    },

    /**
     * Add a game to the configuration
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
     * @param {number} index - Index of the game to remove
     * @returns {Promise<Object|boolean>} - Removed game or false if failed
     */
    async removeGame(index) {
      if (index < 0 || index >= config.games.length) {
        return false
      }

      const removed = config.games.splice(index, 1)[0]
      await this.save()
      return removed
    },

    /**
     * Save current configuration as a preset
     * @param {string} id - Preset ID
     * @param {string} name - Preset name
     * @returns {Promise<boolean>} - Success status
     */
    async saveAsPreset(id, name) {
      // Ensure presets directory exists
      ensureDirectoryExists(PRESETS_DIR)

      const presetPath = path.join(PRESETS_DIR, `${id}.json`)

      // Check if preset already exists
      if (fs.existsSync(presetPath)) {
        console.log(`Preset with ID "${id}" already exists.`)
        return false
      }

      const preset = {
        id, // Explicitly set the ID
        name,
        accountName: config.accountName,
        sharedSecret: config.sharedSecret,
        games: [...config.games],
        rememberPassword: config.rememberPassword,
        password: config.rememberPassword ? config.password : "",
      }

      const success = writeJsonFile(presetPath, preset)

      if (success) {
        console.log(`Preset "${name}" saved successfully.`)
        // Set as current preset
        currentPreset = id
      }

      return success
    },

    /**
     * Save current configuration as a preset
     * @param {string} id - Preset ID
     * @param {string} name - Preset name
     * @returns {Promise<boolean>} - Success status
     */
    async saveCurrentConfigAsPreset(id, name) {
      return this.saveAsPreset(id, name)
    },

    /**
     * Load a preset
     * @param {string} id - Preset ID
     * @returns {Promise<boolean>} - Success status
     */
    async loadPreset(id) {
      const presetPath = path.join(PRESETS_DIR, `${id}.json`)
      const preset = readJsonFile(presetPath, null)

      if (!preset) {
        console.log(`Preset with ID "${id}" not found.`)
        return false
      }

      // Update configuration
      config.accountName = preset.accountName || ""
      config.sharedSecret = preset.sharedSecret || ""
      config.games = preset.games || []
      config.rememberPassword = preset.rememberPassword || false
      config.password = preset.rememberPassword ? preset.password || "" : ""

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
     * Get a preset by ID
     * @param {string} id - Preset ID
     * @returns {Promise<Object|null>} - Preset object or null if not found
     */
    async getPreset(id) {
      const presetPath = path.join(PRESETS_DIR, `${id}.json`)
      return readJsonFile(presetPath, null)
    },

    /**
     * Update a preset
     * @param {string} id - Preset ID
     * @param {Object} preset - Preset object
     * @returns {Promise<boolean>} - Success status
     */
    async updatePreset(id, preset) {
      const presetPath = path.join(PRESETS_DIR, `${id}.json`)

      if (!fs.existsSync(presetPath)) {
        console.log(`Preset with ID "${id}" not found.`)
        return false
      }

      const success = writeJsonFile(presetPath, preset)

      if (success) {
        console.log(`Preset "${preset.name}" updated successfully.`)
      }

      return success
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
        if (currentPreset === id) {
          currentPreset = null
        }

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
      // Ensure presets directory exists
      ensureDirectoryExists(PRESETS_DIR)

      try {
        const files = fs.readdirSync(PRESETS_DIR)
        const presets = []

        for (const file of files) {
          if (file.endsWith(".json")) {
            const presetId = file.replace(".json", "")
            const preset = readJsonFile(path.join(PRESETS_DIR, file), null)
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
  }
}