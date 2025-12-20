// Steam Client Module
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
  let customStatus: string | undefined;
  let lastLoginDetails: SteamLoginDetails | null = null;
  let activeTimeouts: NodeJS.Timeout[] = [];

  connectionManager.registerCallbacks({
    onReconnecting: (attempt, maxAttempts, delay) => {
      console.log(`Reconnecting (${attempt}/${maxAttempts}) in ${Math.round(delay / 1000)}s...`);
      eventManager.trigger('reconnecting', attempt, maxAttempts, delay);
    },
    onReconnected: () => {
      console.log('Reconnected!');
      eventManager.trigger('reconnected');
    },
    onReconnectFailed: (reason) => {
      console.log(`Reconnect failed: ${reason || 'Unknown'}`);
      eventManager.trigger('reconnectFailed', reason);
    },
  });

  function clearTimeouts(): void {
    activeTimeouts.forEach(t => clearTimeout(t));
    activeTimeouts = [];
  }

  function setupEvents(): void {
    client.removeAllListeners();
    client.on('loggedOn', handleLoggedOn);
    client.on('steamGuard', handleSteamGuard);
    client.on('error', handleError);
    client.on('disconnected', handleDisconnected);
  }

  function handleLoggedOn(): void {
    const accountName = client.accountInfo?.name || lastLoginDetails?.accountName || 'Unknown';
    connectionManager.setAccountName(accountName);
    console.log(`Logged in as ${accountName}`);

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
    eventManager.trigger('loggedOn', {});
    eventManager.clear('steamGuard');
  }

  function handleSteamGuard(domain: string | null, callback: (code: string) => void, lastCodeWrong: boolean): void {
    if (eventManager.hasHandlers('steamGuard')) {
      eventManager.trigger('steamGuard', domain, callback, lastCodeWrong);
    } else {
      console.log('Steam Guard required but no handler. Restart the app.');
      client.logOff();
    }
  }

  function handleError(err: any): void {
    const errorDetails: SteamErrorDetails = {
      message: err.message || 'Unknown error',
      eresult: err.eresult,
      cause: err.cause || 'Unknown',
    };
    console.error('Steam error:', errorDetails.message);
    eventManager.trigger('error', errorDetails);
  }

  function handleDisconnected(eresult: any, msg?: string): void {
    const reason = msg || eresult.toString();
    console.log(`Disconnected: ${reason}`);

    connectionManager.setState({
      connected: false,
      lastDisconnectReason: reason,
    });

    eventManager.trigger('disconnected', eresult, msg || '');

    if (isFarming && lastLoginDetails) {
      connectionManager.startReconnect(() => reconnect());
    }
  }

  function reconnect(): boolean {
    if (!isFarming || !lastLoginDetails) return false;
    login(lastLoginDetails.accountName, lastLoginDetails.password, lastLoginDetails.sharedSecret);
    return true;
  }

  function updateGames(): boolean {
    if (!client.steamID || !isFarming) return false;
    if (currentGames.length === 0 && !customStatus) return false;

    try {
      if (customStatus && customStatus.trim()) {
        client.gamesPlayed([customStatus, ...currentGames]);
      } else {
        client.gamesPlayed(currentGames.length === 1 ? currentGames[0] : currentGames);
      }

      const timeout = setTimeout(() => {
        if (isFarming) {
          const games = (client as any)._playingAppIds || [];
          console.log(`Playing: ${games.join(', ')}${customStatus ? ` ("${customStatus}")` : ''}`);
        }
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

    const loginDetails: any = { accountName, password };

    if (sharedSecret && sharedSecret.length > 5) {
      try {
        loginDetails.twoFactorCode = SteamTotp.generateAuthCode(sharedSecret);
        console.log('Generated 2FA code:', loginDetails.twoFactorCode);
      } catch (err) {
        console.log('Failed to generate 2FA code.');
      }
    }

    console.log('Logging in...');
    client.logOn(loginDetails);
  }

  return {
    isFarming: (): boolean => isFarming,

    getStatus: (): SteamStatus => ({
      connected: connectionManager.getState().connected,
      reconnecting: connectionManager.getState().reconnecting,
      loggedOn: !!client.steamID,
      steamID: client.steamID?.toString() || null,
      playingAppIds: (client as any)._playingAppIds || [],
      currentGames: [...currentGames],
      accountName: connectionManager.getState().accountName,
    }),

    login: (accountName: string, password?: string, sharedSecret?: string): void => {
      isFarming = false;
      currentGames = [];
      clearTimeouts();
      connectionManager.reset();
      login(accountName, password, sharedSecret);
    },

    on: <T extends EventName>(event: T, handler: EventHandler<T>): RemoveHandler => 
      eventManager.on(event, handler),

    clearHandlers: (event: EventName): void => eventManager.clear(event),

    clearAllHandlers: (...events: EventName[]): void => eventManager.clearAll(...events),

    startFarming: (gameIds: number[], status?: string): boolean => {
      if (!Array.isArray(gameIds)) return false;

      currentGames = gameIds.filter(id => !isNaN(id));
      customStatus = status;

      if (!client.steamID) {
        console.error('Not logged in.');
        return false;
      }

      if (customStatus?.trim()) console.log(`Custom status: "${customStatus}"`);
      
      isFarming = true;
      setTimeout(() => updateGames(), 1000);
      return true;
    },

    stopFarming: (): boolean => {
      clearTimeouts();
      connectionManager.reset();

      if (client.steamID) {
        try {
          console.log('Stopping farming...');
          client.gamesPlayed([]);
          client.setPersona(SteamUser.EPersonaState.Offline);
          client.logOff();
        } catch (err) {
          console.error('Error stopping:', err);
        }
      }

      isFarming = false;
      currentGames = [];
      customStatus = undefined;
      return true;
    },

    configureReconnect: (options: ReconnectOptions): void => {
      connectionManager.configure(options);
    },

    reconnect: (): boolean => reconnect(),
  };
}

export type SteamClient = ReturnType<typeof createSteamClient>;