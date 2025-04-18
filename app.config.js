/**
 * Steam Playtime Farmer Configuration
 * This file contains all application-wide configuration settings
 */
import path from "path"
import { fileURLToPath } from "url"

// Get the directory name for proper path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Application configuration
export const appConfig = {
  // Application name displayed in the console
  appName: "Steam Playtime Farmer",
  
  // Application version
  version: "0.1.8",
  
  // File paths for various application data
  paths: {
    presetsDir: path.join(__dirname, "presets"),     // Directory for storing presets
    configFile: path.join(__dirname, "user-config.json"), // User configuration file
    sessionFile: path.join(__dirname, "steam-session.dat"), // Session data file
  },
  
  // Steam client settings
  steam: {
    // Reconnection settings
    reconnect: {
      maxAttempts: 10,           // Maximum number of reconnection attempts
      initialDelay: 3000,        // Initial delay between reconnection attempts (ms)
      maxDelay: 60000,           // Maximum delay between reconnection attempts (ms)
      backoffMultiplier: 1.5,    // Multiplier for exponential backoff
    },
    
    // Steam client options
    client: {
      promptSteamGuardCode: false, // Whether to prompt for Steam Guard code
      autoRelogin: false,          // Whether to automatically relogin
    },
  },
}

// Default user configuration (will be saved to configFileName)
export const defaultConfig = {
  accountName: "",       // Steam account name
  sharedSecret: "",      // Steam shared secret for 2FA
  games: [],             // List of games to farm
  rememberPassword: false, // Whether to remember the password
  password: "",          // Stored password (if rememberPassword is true)
}

export default { appConfig, defaultConfig }