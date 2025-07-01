// Event-related type definitions
import type { SteamErrorDetails } from './steam.js';

export type SteamGuardCallback = (code: string) => void;

export interface EventHandlers {
  loggedOn: Array<(details: any) => void>;
  steamGuard: Array<(domain: string | null, callback: SteamGuardCallback, lastCodeWrong: boolean) => void>;
  error: Array<(error: SteamErrorDetails) => void>;
  disconnected: Array<(eresult: number, msg: string) => void>;
  reconnecting: Array<(attempt: number, maxAttempts: number, delay: number) => void>;
  reconnected: Array<() => void>;
  reconnectFailed: Array<(reason: string | null) => void>;
}

export type EventName = keyof EventHandlers;
export type EventHandler<T extends EventName> = EventHandlers[T][0];
export type RemoveHandler = () => void;