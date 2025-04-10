/**
 * Steam Playtime Farmer
 * Main application entry point
 *
 * This application allows users to farm playtime on multiple Steam games simultaneously.
 * It features automatic reconnection, session persistence, and preset management.
 *
 * The application architecture follows a modular design pattern where:
 * - Each module has a specific responsibility
 * - Modules communicate through well-defined interfaces
 * - Configuration is centralized and persistent
 * - The UI is separated from business logic
 */
import { createSteamClient } from "./modules/steam-client.js"
import { createConfigManager } from "./modules/config-manager.js"
import { createUserInterface } from "./modules/user-interface.js"
import { appConfig } from "./app.config.js"
import { existsSync, mkdirSync } from "fs"

// Ensure presets directory exists before starting the application
// This prevents errors when trying to save or load presets
if (!existsSync(appConfig.paths.presetsDir)) {
  mkdirSync(appConfig.paths.presetsDir, { recursive: true })
}

// Initialize core modules
// These modules form the foundation of the application
const configManager = createConfigManager() // Manages configuration and presets
const steamClient = createSteamClient() // Handles Steam API interactions
const ui = createUserInterface(configManager, steamClient) // Manages user interface

// Configure reconnection settings from application config
// This ensures consistent reconnection behavior across the application
steamClient.configureReconnect({
  maxReconnectAttempts: appConfig.steam.reconnect.maxAttempts,
  reconnectDelay: appConfig.steam.reconnect.initialDelay,
})

/**
 * Start the application
 * Main entry function that initializes and starts the application
 */
async function start() {
  // Display application header
  console.log(`===== ${appConfig.appName} v${appConfig.version} =====`)
  console.log(`Automatic reconnection is enabled (max ${appConfig.steam.reconnect.maxAttempts} attempts)`)

  // Load saved configuration from disk
  await configManager.load()

  // Start the UI and show main menu
  await ui.showMainMenu()
}

// Handle application exit (Ctrl+C)
// This ensures clean shutdown when the user terminates the application
process.on("SIGINT", () => {
  console.log("\nExiting application...")
  steamClient.stopFarming() // Stop any active farming
  process.exit(0) // Exit with success code
})

// Start the application and handle any uncaught errors
start().catch((err) => {
  console.error("Application error:", err)
  process.exit(1) // Exit with error code
})