import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import path from 'path';
import { fileURLToPath } from 'url';
import { appConfig } from '../app.config.js';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createSteamClient() {
  // Create Steam client with proper options
  const client = new SteamUser({
    promptSteamGuardCode: false,
    dataDirectory: path.join(__dirname, '..'),
    autoRelogin: true,
    renewRefreshTokens: true,
    machineName: `${appConfig.appName} v${appConfig.version}`
  });
  
  // State
  let isFarming = false;
  let currentGames = [];
  let loginAttempts = 0;
  const MAX_LOGIN_ATTEMPTS = 3;
  
  // Event handlers
  const eventHandlers = {
    loggedOn: [],
    steamGuard: [],
    error: [],
    disconnected: []
  };
  
  // Clear all event handlers for a specific event
  function clearEventHandlers(event) {
    if (eventHandlers[event]) {
      eventHandlers[event] = [];
    }
  }
  
  // Register event handlers
  function setupEvents() {
    // Remove any existing listeners to prevent duplicates
    client.removeAllListeners();
    
    // Set up basic event handlers
    client.on('loggedOn', () => {
      console.log(`Successfully logged in as ${client.accountName}`);
      loginAttempts = 0; // Reset login attempts on success
      client.setPersona(SteamUser.EPersonaState.Online);
      isFarming = true;
      
      // Call all registered handlers
      eventHandlers.loggedOn.forEach(handler => handler());
      
      // Clear steamGuard handlers after successful login
      clearEventHandlers('steamGuard');
    });
    
    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      // Call all registered handlers
      if (eventHandlers.steamGuard.length > 0) {
        eventHandlers.steamGuard.forEach(handler => 
          handler(domain, callback, lastCodeWrong)
        );
      } else {
        // Fallback if no handlers registered
        console.log('Steam Guard required but no handler registered. Please restart the application.');
        client.logOff();
      }
    });
    
    client.on('error', (err) => {
      console.error('Steam client error:', err);
      isFarming = false;
      
      // Call all registered handlers
      eventHandlers.error.forEach(handler => handler(err));
    });
    
    client.on('disconnected', (eresult, msg) => {
      console.log(`Disconnected from Steam: ${msg || eresult}`);
      isFarming = false;
      
      // Call all registered handlers
      eventHandlers.disconnected.forEach(handler => 
        handler(eresult, msg)
      );
    });
    
    // Add session expired handler
    client.on('sessionExpired', () => {
      console.log('Session expired. Reconnecting...');
      if (loginAttempts < MAX_LOGIN_ATTEMPTS) {
        loginAttempts++;
        // We don't need to do anything - autoRelogin will handle it
      } else {
        console.log('Too many reconnection attempts. Please restart the application.');
        isFarming = false;
        
        // Call error handlers
        eventHandlers.error.forEach(handler => 
          handler(new Error('Too many reconnection attempts'))
        );
      }
    });
  }
  
  // Update the games being played
  function updateGamesPlayed() {
    if (!isFarming || !client.loggedOn || currentGames.length === 0) return false;
    
    try {
      // For multiple games, we need to use an array of objects
      const gameObjects = currentGames.map(appId => ({ game_id: parseInt(appId) }));
      client.gamesPlayed(gameObjects);
      return true;
    } catch (err) {
      console.error('Error updating games:', err);
      return false;
    }
  }
  
  return {
    // Check if client is farming
    isFarming: () => isFarming,
    
    // Get client status
    getStatus: () => ({
      connected: client.connected,
      loggedOn: client.loggedOn,
      steamID: client.steamID ? client.steamID.toString() : null,
      playingAppIds: client._playingAppIds || [],
      currentGames: [...currentGames]
    }),
    
    // Login to Steam
    login: async (accountName, password, sharedSecret) => {
      // Reset state
      loginAttempts = 0;
      isFarming = false;
      
      // Setup events before login
      setupEvents();
      
      const loginDetails = {
        accountName,
        password,
        rememberPassword: true
      };
      
      // If we have a shared secret, generate the auth code
      if (sharedSecret && sharedSecret.length > 5) {
        try {
          loginDetails.twoFactorCode = SteamTotp.generateAuthCode(sharedSecret);
          console.log('Generated 2FA code automatically:', loginDetails.twoFactorCode);
        } catch (err) {
          console.log('Failed to generate 2FA code. You may need to enter it manually.');
        }
      }
      
      console.log('Logging in to Steam...');
      client.logOn(loginDetails);
    },
    
    // Register event handlers
    on: (event, handler) => {
      if (eventHandlers[event]) {
        eventHandlers[event].push(handler);
      }
      return () => {
        // Return a function to remove this specific handler
        if (eventHandlers[event]) {
          const index = eventHandlers[event].indexOf(handler);
          if (index !== -1) {
            eventHandlers[event].splice(index, 1);
          }
        }
      };
    },
    
    // Clear all handlers for an event
    clearHandlers: clearEventHandlers,
    
    // Start farming games
    startFarming: (gameIds) => {
      if (!Array.isArray(gameIds)) {
        console.error('Invalid game IDs provided');
        return false;
      }
      
      currentGames = gameIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      
      if (client.loggedOn) {
        setTimeout(() => {
          const success = updateGamesPlayed();
          if (success) {
            console.log(`\nNow farming ${currentGames.length} games.`);
          } else {
            console.log('\nFailed to start farming games.');
          }
        }, 1000);
        return true;
      }
      
      return false;
    },
    
    // Stop farming
    stopFarming: () => {
      if (client.loggedOn) {
        try {
          client.gamesPlayed([]);
          client.setPersona(SteamUser.EPersonaState.Offline);
          client.logOff();
        } catch (err) {
          console.error('Error stopping farming:', err);
        }
      }
      
      isFarming = false;
      currentGames = [];
      return true;
    },
    
    // Add a game to farming
    addGame: (appId) => {
      const numAppId = parseInt(appId);
      if (isNaN(numAppId)) return false;
      
      if (!currentGames.includes(numAppId)) {
        currentGames.push(numAppId);
        return updateGamesPlayed();
      }
      return false;
    },
    
    // Remove a game from farming
    removeGame: (appId) => {
      const numAppId = parseInt(appId);
      if (isNaN(numAppId)) return false;
      
      const index = currentGames.indexOf(numAppId);
      if (index !== -1) {
        currentGames.splice(index, 1);
        return updateGamesPlayed();
      }
      return false;
    },
    
    // Update all games being farmed
    updateGames: (gameIds) => {
      if (!Array.isArray(gameIds)) return false;
      
      currentGames = gameIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      return updateGamesPlayed();
    }
  };
}