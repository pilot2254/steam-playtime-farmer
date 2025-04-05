import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createSteamClient() {
  // Create Steam client with proper options
  const client = new SteamUser({
    promptSteamGuardCode: false,
    dataDirectory: path.join(__dirname, '..'),
    autoRelogin: true
  });
  
  // State
  let isFarming = false;
  let currentGames = [];
  
  // Event handlers
  const eventHandlers = {
    loggedOn: [],
    steamGuard: [],
    error: [],
    disconnected: []
  };
  
  // Register event handlers
  function setupEvents() {
    // Remove any existing listeners to prevent duplicates
    client.removeAllListeners();
    
    // Set up basic event handlers
    client.on('loggedOn', () => {
      client.setPersona(SteamUser.EPersonaState.Online);
      isFarming = true;
      
      // Call all registered handlers
      eventHandlers.loggedOn.forEach(handler => handler());
    });
    
    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      // Call all registered handlers
      eventHandlers.steamGuard.forEach(handler => 
        handler(domain, callback, lastCodeWrong)
      );
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
  }
  
  // Update the games being played
  function updateGamesPlayed() {
    if (!isFarming || !client.loggedOn || currentGames.length === 0) return false;
    
    // For multiple games, we need to use an array of objects
    const gameObjects = currentGames.map(appId => ({ game_id: appId }));
    client.gamesPlayed(gameObjects);
    return true;
  }
  
  return {
    // Check if client is farming
    isFarming: () => isFarming,
    
    // Get client status
    getStatus: () => ({
      connected: client.connected,
      loggedOn: client.loggedOn,
      steamID: client.steamID ? client.steamID.toString() : null,
      playingAppIds: client._playingAppIds || []
    }),
    
    // Login to Steam
    login: async (accountName, password, sharedSecret) => {
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
    },
    
    // Start farming games
    startFarming: (gameIds) => {
      currentGames = [...gameIds];
      
      if (client.loggedOn) {
        setTimeout(() => {
          updateGamesPlayed();
          console.log(`\nNow farming ${currentGames.length} games.`);
        }, 1000);
        return true;
      }
      
      return false;
    },
    
    // Stop farming
    stopFarming: () => {
      if (isFarming) {
        console.log('Stopping playtime farming...');
        client.gamesPlayed([]);
        client.setPersona(SteamUser.EPersonaState.Offline);
        client.logOff();
        isFarming = false;
        return true;
      }
      return false;
    },
    
    // Add a game to farming
    addGame: (appId) => {
      if (!currentGames.includes(appId)) {
        currentGames.push(appId);
        updateGamesPlayed();
        return true;
      }
      return false;
    },
    
    // Remove a game from farming
    removeGame: (appId) => {
      const index = currentGames.indexOf(appId);
      if (index !== -1) {
        currentGames.splice(index, 1);
        updateGamesPlayed();
        return true;
      }
      return false;
    },
    
    // Update all games being farmed
    updateGames: (gameIds) => {
      currentGames = [...gameIds];
      return updateGamesPlayed();
    }
  };
}