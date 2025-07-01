// Steam Client Module
// Handles Steam authentication, game farming, and connection management
import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSessionManager } from './session-manager.js';
import { createConnectionManager } from './connection-manager.js';
import { createEventManager } from './event-manager.js';
import { appConfig } from '../config/app.config.js';
import type { 
  SteamLoginDetails, 
  SteamStatus, 
  SteamErrorDetails, 
  SessionData 
} from '../types/steam.js';
import type { EventName, EventHandler, RemoveHandler } from '../types/events.js';
import type { ReconnectOptions } from '../types/connection.js';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Creates and returns a Steam client with farming capabilities
export function createSteamClient() {
  // Create Steam client with proper options
  const client = new SteamUser({
    dataDirectory: path.join(__dirname, '../..'),
    autoRelogin: appConfig.steam.client.autoRelogin,
  });

  // Create managers
  const sessionManager = createSessionManager();
  const connectionManager = createConnectionManager();
  const eventManager = createEventManager();

  // State variables
  let isFarming = false;
  let currentGames: number[] = [];
  let lastLoginDetails: SteamLoginDetails | null = null;

  // Register connection manager callbacks
  connectionManager.registerCallbacks({
    onReconnecting: handleReconnecting,
    onReconnected: handleReconnected,
    onReconnectFailed: handleReconnectFailed,
  });

  // Called when a reconnection attempt is about to be made
  function handleReconnecting(attempt: number, maxAttempts: number, delay: number): void {
    console.log(`Reconnecting to Steam (${attempt}/${maxAttempts}) in ${Math.round(delay / 1000)} seconds...`);
    eventManager.trigger('reconnecting', attempt, maxAttempts, delay);
  }

  // Called when successfully reconnected
  function handleReconnected(): void {
    console.log('Successfully reconnected to Steam!');
    eventManager.trigger('reconnected');
  }

  // Called when all reconnection attempts fail
  function handleReconnectFailed(reason: string | null): void {
    console.log(`Failed to reconnect to Steam after multiple attempts. Reason: ${reason || 'Unknown'}`);
    eventManager.trigger('reconnectFailed', reason);
  }

  // Set up Steam client event handlers
  function setupEvents(): void {
    // Remove any existing listeners to prevent duplicates
    client.removeAllListeners();

    // Set up basic event handlers
    client.on('loggedOn', handleLoggedOn);
    client.on('steamGuard', handleSteamGuard);
    client.on('error', handleError);
    client.on('disconnected', handleDisconnected);
  }

  // Handle successful login
  function handleLoggedOn(details: any): void {
    // Fix for undefined username issue - get name from multiple possible sources
    const accountName = client.accountInfo?.name || lastLoginDetails?.accountName || 'Unknown';
    connectionManager.setAccountName(accountName);
    console.log(`Successfully logged in as ${accountName}`);

    // Save session data for future reconnections
    saveSessionData(accountName);

    // Update connection state
    connectionManager.setState({
      connected: true,
      reconnecting: false,
      reconnectAttempts: 0,
    });

    // If we were reconnecting, handle reconnect success
    if (connectionManager.getState().reconnecting) {
      connectionManager.handleReconnectSuccess();
    }

    // Set online status
    client.setPersona(SteamUser.EPersonaState.Online);

    // Set farming flag
    isFarming = true;

    // Trigger event
    eventManager.trigger('loggedOn', details);

    // Clear steamGuard handlers after successful login
    eventManager.clear('steamGuard');
  }

  // Save session data for future reconnections
  function saveSessionData(accountName: string): void {
    try {
      const sessionKey = (client as any)._sessionKey;
      if (sessionKey) {
        const sessionData: SessionData = {
          sessionKey: sessionKey.toString('hex'),
          accountName: accountName,
        };
        sessionManager.saveSession(sessionData);
      }
    } catch (err) {
      console.error('Failed to save session data:', err);
    }
  }

  // Handle Steam Guard request
  function handleSteamGuard(domain: string | null, callback: (code: string) => void, lastCodeWrong: boolean): void {
    // Call all registered handlers
    if (eventManager.hasHandlers('steamGuard')) {
      eventManager.trigger('steamGuard', domain, callback, lastCodeWrong);
    } else {
      // Fallback if no handlers registered
      console.log('Steam Guard required but no handler registered. Please restart the application.');
      client.logOff();
    }
  }

  // Handle Steam client errors
  function handleError(err: any): void {
    // Pass the full error object including Steam error codes
    const errorDetails: SteamErrorDetails = {
      message: err.message || 'Unknown error',
      eresult: err.eresult,
      cause: err.cause || 'Unknown cause',
    };
    console.error('Steam client error:', errorDetails.message);
    eventManager.trigger('error', errorDetails);
  }

  // Handle disconnection from Steam
  function handleDisconnected(eresult: any, msg?: string): void {
    const reason = msg || eresult.toString();
    console.log(`Disconnected from Steam: ${reason}`);

    // Update connection state
    connectionManager.setState({
      connected: false,
      lastDisconnectReason: reason,
    });

    // Trigger event
    eventManager.trigger('disconnected', eresult, msg || '');

    // Start reconnection process if we were farming
    if (isFarming && lastLoginDetails) {
      console.log('Attempting to reconnect...');
      connectionManager.startReconnect(() => reconnect());
    }
  }

  // Attempt to reconnect using saved session or credentials
  function reconnect(): boolean {
    // Don't reconnect if we're not farming anymore
    if (!isFarming) {
      console.log('Farming stopped, not attempting to reconnect.');
      return false;
    }

    // Fall back to credentials if available
    if (lastLoginDetails) {
      console.log('Reconnecting using credentials...');
      login(lastLoginDetails.accountName, lastLoginDetails.password, lastLoginDetails.sharedSecret);
      return true;
    }

    console.log('No credentials available for reconnection.');
    return false;
  }

  // Update the games being played
  function updateGamesPlayed(): boolean {
    // Check if logged in
    if (!client.steamID) {
      console.log('Not logged in to Steam. Cannot update games.');
      return false;
    }

    // Check if we have games to play
    if (currentGames.length === 0) {
      console.log('No games to play.');
      return false;
    }

    try {
      console.log(`Attempting to play ${currentGames.length} games...`);

      // For multiple games, we need to use an array of objects with game_extra_info
      if (currentGames.length > 1) {
        const gameObjects = currentGames.map((appId) => ({ 
          game_id: appId,
          game_extra_info: `Game ${appId}`
        }));
        client.gamesPlayed(gameObjects);
      } else {
        // For a single game, we can just use the ID
        client.gamesPlayed(currentGames[0]);
      }

      // Verify games are being played
      setTimeout(() => {
        const playingGames = (client as any)._playingAppIds || [];
        console.log(`Now playing: ${playingGames.join(', ')}`);
      }, 2000);

      return true;
    } catch (err) {
      console.error('Error updating games:', err);
      return false;
    }
  }

  // Login to Steam
  function login(accountName: string, password?: string, sharedSecret?: string): void {
    // Store login details for potential reconnection
    lastLoginDetails = { accountName, password, sharedSecret };

    // Setup events before login
    setupEvents();

    const loginDetails: any = {
      accountName,
      password,
      rememberPassword: true,
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
  }

  // Return the public API
  return {
    // Check if client is farming
    isFarming: (): boolean => isFarming,

    // Get client status
    getStatus: (): SteamStatus => ({
      connected: connectionManager.getState().connected,
      reconnecting: connectionManager.getState().reconnecting,
      loggedOn: !!client.steamID,
      steamID: client.steamID ? client.steamID.toString() : null,
      playingAppIds: (client as any)._playingAppIds || [],
      currentGames: [...currentGames],
      accountName: connectionManager.getState().accountName,
    }),

    // Login to Steam
    login: (accountName: string, password?: string, sharedSecret?: string): void => {
      // Reset state
      isFarming = false;
      currentGames = [];
      connectionManager.reset();

      login(accountName, password, sharedSecret);
    },

    // Reconnect to Steam
    reconnect: (): boolean => reconnect(),

    // Register event handlers
    on: <T extends EventName>(event: T, handler: EventHandler<T>): RemoveHandler => 
      eventManager.on(event, handler),

    // Clear all handlers for an event
    clearHandlers: (event: EventName): void => eventManager.clear(event),

    // Clear all or specified event handlers
    clearAllHandlers: (...events: EventName[]): void => eventManager.clearAll(...events),

    // Start farming games
    startFarming: (gameIds: number[]): boolean => {
      if (!Array.isArray(gameIds)) {
        console.error('Invalid game IDs provided');
        return false;
      }

      currentGames = gameIds.filter((id) => !isNaN(id));

      if (client.steamID) {
        console.log('Starting to farm games...');
        setTimeout(() => updateGamesPlayed(), 1000);
        return true;
      } else {
        console.error('Not logged in to Steam. Cannot start farming.');
        return false;
      }
    },

    // Stop farming
    stopFarming: (): boolean => {
      // Clear any reconnection attempts first
      connectionManager.reset();

      if (client.steamID) {
        try {
          console.log('Stopping game farming...');
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
    addGame: (appId: number): boolean => {
      if (isNaN(appId)) return false;

      if (!currentGames.includes(appId)) {
        currentGames.push(appId);
        console.log(`Adding game ${appId} to farming list...`);
        return updateGamesPlayed();
      }
      return false;
    },

    // Remove a game from farming
    removeGame: (appId: number): boolean => {
      if (isNaN(appId)) return false;

      const index = currentGames.indexOf(appId);
      if (index !== -1) {
        currentGames.splice(index, 1);
        console.log(`Removing game ${appId} from farming list...`);
        return updateGamesPlayed();
      }
      return false;
    },

    // Update all games being farmed
    updateGames: (gameIds: number[]): boolean => {
      if (!Array.isArray(gameIds)) return false;
      currentGames = gameIds.filter((id) => !isNaN(id));
      return updateGamesPlayed();
    },

    // Configure reconnection settings
    configureReconnect: (options: ReconnectOptions): void => {
      connectionManager.configure(options);
    },
  };
}

export type SteamClient = ReturnType<typeof createSteamClient>;