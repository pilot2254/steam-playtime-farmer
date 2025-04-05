/**
 * Steam Playtime Farmer Configuration
 * 
 * This file contains application settings that can be modified
 * without changing the main application code.
 */

// Application configuration
export const appConfig = {
  // Application name displayed in the console
  appName: "Steam Playtime Farmer",
  
  // Application version
  version: "0.3.0",
  
  // Name of the configuration file that stores user settings
  configFileName: "user-config.json",
  
  // Debug mode (set to true for additional logging)
  debug: false,
  
  // Auto-reconnect if disconnected from Steam
  autoReconnect: true,
  
  // Reconnect delay in milliseconds
  reconnectDelay: 10000,
  
  // Maximum reconnect attempts (0 for unlimited)
  maxReconnectAttempts: 5
};

// Default user configuration (will be saved to configFileName)
export const defaultConfig = {
  accountName: '',
  sharedSecret: '',
  games: [],
  rememberPassword: false,
  password: ''
};

export default { appConfig, defaultConfig };