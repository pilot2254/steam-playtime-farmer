/**
 * Steam Playtime Farmer - Main entry point
 * This file initializes the application and sets up the core modules
 */
import { createSteamClient } from './modules/steam-client.js';
import { createConfigManager } from './modules/config-manager.js';
import { createUserInterface } from './modules/user-interface.js';
import { appConfig } from './config/app.config.js';
import { existsSync, mkdirSync } from 'fs';

// Ensure presets directory exists before starting
if (!existsSync(appConfig.paths.presetsDir)) {
  mkdirSync(appConfig.paths.presetsDir, { recursive: true });
}

// Initialize core modules
const configManager = createConfigManager();
const steamClient = createSteamClient();
const ui = createUserInterface(configManager, steamClient);

// Configure reconnection settings from app config
steamClient.configureReconnect({
  maxReconnectAttempts: appConfig.steam.reconnect.maxAttempts,
  reconnectDelay: appConfig.steam.reconnect.initialDelay,
});

// Display application header
console.log(`===== ${appConfig.appName} v${appConfig.version} =====`);
console.log(`Automatic reconnection enabled (max ${appConfig.steam.reconnect.maxAttempts} attempts)`);

// Fix existing presets that might be missing the name field
configManager.fixPresets().then((fixedCount) => {
  if (fixedCount > 0) {
    console.log(`Fixed ${fixedCount} presets with missing names.`);
  }
});

// Load saved configuration and start the UI
configManager
  .load()
  .then(() => ui.start())
  .catch((err) => {
    console.error('Error loading configuration:', err);
    process.exit(1);
  });

// Handle application exit (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nExiting application...');
  steamClient.stopFarming();
  process.exit(0);
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  console.log('Application will continue running...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  console.log('Application will continue running...');
});