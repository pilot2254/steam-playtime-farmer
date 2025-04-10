/**
 * Steam Playtime Farmer Configuration
 * This file contains all application-wide configuration settings
 */

// File system paths
import path from "path"
import { fileURLToPath } from "url"

// Get the directory name for proper path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Application configuration
export const appConfig = {
  // Application name displayed in the console
  appName: "Steam Playtime Farmer",

  // Application version
  version: "0.1.5",

  // File paths
  paths: {
    // Directory for storing presets
    presetsDir: path.join(__dirname, "presets"),

    // User configuration file
    configFile: path.join(__dirname, "user-config.json"),

    // Session data file
    sessionFile: path.join(__dirname, "steam-session.dat"),
  },

  // Steam client settings
  steam: {
    // Reconnection settings
    reconnect: {
      // Maximum number of reconnection attempts
      maxAttempts: 10,

      // Initial delay between reconnection attempts (ms)
      initialDelay: 3000,

      // Maximum delay between reconnection attempts (ms)
      maxDelay: 60000,

      // Multiplier for exponential backoff
      backoffMultiplier: 1.5,
    },

    // Steam client options
    client: {
      // Whether to prompt for Steam Guard code
      promptSteamGuardCode: false,

      // Whether to automatically relogin
      autoRelogin: true,
    },
  },

  // Name of the configuration file that stores user settings
  configFileName: "user-config.json",
}

// Default user configuration (will be saved to configFileName)
export const defaultConfig = {
  accountName: "",
  sharedSecret: "",
  games: [],
  rememberPassword: false,
  password: "",
}

export default { appConfig, defaultConfig }