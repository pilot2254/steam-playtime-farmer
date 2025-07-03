// Steam Client Module
// Handles Steam authentication, game farming, and connection management
import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConnectionManager } from './connection-manager.js';
import { createEventManager } from './event-manager.js';
import { appConfig } from '../config/app.config.js';
import type { 
  SteamLoginDetails, 
  SteamStatus, 
  SteamErrorDetails
} from '../types/steam.js';
import type { EventName, EventHandler, RemoveHandler } from '../types/events.js';
import type { ReconnectOptions } from '../types/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createSteamClient() {
  const client = new SteamUser({
    dataDirectory: path.join(__dirname, '../..'),
    autoRelogin: appConfig.steam.client.autoRelogin,
  });

  const connectionManager = createConnectionManager();
  const eventManager = createEventManager();

  let isFarming = false;
  let currentGames: number[] = [];
  let lastLoginDetails: SteamLoginDetails | null = null;
  let activeTimeouts: NodeJS.Timeout[] = [];

  connectionManager.registerCallbacks({
    onReconnecting: (attempt, maxAttempts, delay) => {
      console.log(`Reconnecting to Steam (${attempt}/${maxAttempts}) in ${Math.round(delay / 1000)} seconds...`);
      eventManager.trigger('reconnecting', attempt, maxAttempts, delay);
    },
    onReconnected: () => {
      console.log('Successfully reconnected to Steam!');
      eventManager.trigger('reconnected');
    },
    onReconnectFailed: (reason) => {
      console.log(`Failed to reconnect to Steam after multiple attempts. Reason: ${reason || 'Unknown'}`);
      eventManager.trigger('reconnectFailed', reason);
    },
  });

  function clearActiveTimeouts(): void {
    activeTimeouts.forEach(timeout => clearTimeout(timeout));
    activeTimeouts = [];
  }

  function setupEvents(): void {
    client.removeAllListeners();
    client.on('loggedOn', handleLoggedOn);
    client.on('steamGuard', handleSteamGuard);
    client.on('error', handleError);
    client.on('disconnected', handleDisconnected);
  }

  function handleLoggedOn(details: any): void {
    const accountName = client.accountInfo?.name || lastLoginDetails?.accountName || 'Unknown';
    connectionManager.setAccountName(accountName);
    console.log(`Successfully logged in as ${accountName}`);

    connectionManager.setState({
      connected: true,
      reconnecting: false,
      reconnectAttempts: 0,
    });

    if (connectionManager.getState().reconnecting) {
      connectionManager.handleReconnectSuccess();
    }

    client.setPersona(SteamUser.EPersonaState.Online);
    isFarming = true;
    eventManager.trigger('loggedOn', details);
    eventManager.clear('steamGuard');
  }

  function handleSteamGuard(domain: string | null, callback: (code: string) => void, lastCodeWrong: boolean): void {
    if (eventManager.hasHandlers('steamGuard')) {
      eventManager.trigger('steamGuard', domain, callback, lastCodeWrong);
    } else {
      console.log('Steam Guard required but no handler registered. Please restart the application.');
      client.logOff();
    }
  }

  function handleError(err: any): void {
    const errorDetails: SteamErrorDetails = {
      message: err.message || 'Unknown error',
      eresult: err.eresult,
      cause: err.cause || 'Unknown cause',
    };
    console.error('Steam client error:', errorDetails.message);
    eventManager.trigger('error', errorDetails);
  }

  function handleDisconnected(eresult: any, msg?: string): void {
    const reason = msg || eresult.toString();
    console.log(`Disconnected from Steam: ${reason}`);

    connectionManager.setState({
      connected: false,
      lastDisconnectReason: reason,
    });

    eventManager.trigger('disconnected', eresult, msg || '');

    if (isFarming && lastLoginDetails) {
      console.log('Attempting to reconnect...');
      connectionManager.startReconnect(() => reconnect());
    }
  }

  function reconnect(): boolean {
    if (!isFarming) {
      console.log('Farming stopped, not attempting to reconnect.');
      return false;
    }

    if (lastLoginDetails) {
      console.log('Reconnecting using credentials...');
      login(lastLoginDetails.accountName, lastLoginDetails.password, lastLoginDetails.sharedSecret);
      return true;
    }

    console.log('No credentials available for reconnection.');
    return false;
  }

  function updateGamesPlayed(): boolean {
    if (!client.steamID) {
      console.log('Not logged in to Steam. Cannot update games.');
      return false;
    }

    if (currentGames.length === 0) {
      console.log('No games to play.');
      return false;
    }

    try {
      console.log(`Attempting to play ${currentGames.length} games...`);

      if (currentGames.length > 1) {
        const gameObjects = currentGames.map((appId) => ({ 
          game_id: appId,
          game_extra_info: `Game ${appId}`
        }));
        client.gamesPlayed(gameObjects);
      } else {
        client.gamesPlayed(currentGames[0]);
      }

      const timeout = setTimeout(() => {
        const playingGames = (client as any)._playingAppIds || [];
        console.log(`Now playing: ${playingGames.join(', ')}`);
      }, 2000);
      
      activeTimeouts.push(timeout);

      return true;
    } catch (err) {
      console.error('Error updating games:', err);
      return false;
    }
  }

  function login(accountName: string, password?: string, sharedSecret?: string): void {
    lastLoginDetails = { accountName, password, sharedSecret };
    setupEvents();

    const loginDetails: any = {
      accountName,
      password,
    };

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

  return {
    isFarming: (): boolean => isFarming,

    getStatus: (): SteamStatus => ({
      connected: connectionManager.getState().connected,
      reconnecting: connectionManager.getState().reconnecting,
      loggedOn: !!client.steamID,
      steamID: client.steamID ? client.steamID.toString() : null,
      playingAppIds: (client as any)._playingAppIds || [],
      currentGames: [...currentGames],
      accountName: connectionManager.getState().accountName,
    }),

    login: (accountName: string, password?: string, sharedSecret?: string): void => {
      isFarming = false;
      currentGames = [];
      clearActiveTimeouts();
      connectionManager.reset();
      login(accountName, password, sharedSecret);
    },

    reconnect: (): boolean => reconnect(),

    on: <T extends EventName>(event: T, handler: EventHandler<T>): RemoveHandler => 
      eventManager.on(event, handler),

    clearHandlers: (event: EventName): void => eventManager.clear(event),

    clearAllHandlers: (...events: EventName[]): void => eventManager.clearAll(...events),

    startFarming: (gameIds: number[]): boolean => {
      if (!Array.isArray(gameIds)) {
        console.error('Invalid game IDs provided');
        return false;
      }

      currentGames = gameIds.filter((id) => !isNaN(id));

      if (client.steamID) {
        console.log('Starting to farm games...');
        const timeout = setTimeout(() => updateGamesPlayed(), 1000);
        activeTimeouts.push(timeout);
        return true;
      } else {
        console.error('Not logged in to Steam. Cannot start farming.');
        return false;
      }
    },

    stopFarming: (): boolean => {
      clearActiveTimeouts();
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

    configureReconnect: (options: ReconnectOptions): void => {
      connectionManager.configure(options);
    },
  };
}

export type SteamClient = ReturnType<typeof createSteamClient>;