/**
 * Steam Playtime Farmer Configuration
 */

// Application configuration
export const appConfig = {
  // Application name displayed in the console
  appName: "Steam Playtime Farmer",

  // Application version
  version: "0.1.1",

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