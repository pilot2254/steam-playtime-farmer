/**
 * Steam-related type definitions
 */

export interface SteamGame {
  readonly appId: number;
  readonly name: string;
}

export interface SteamLoginDetails {
  readonly accountName: string;
  readonly password?: string;
  readonly twoFactorCode?: string;
  readonly sessionKey?: Buffer;
  readonly rememberPassword?: boolean;
}

export interface SteamStatus {
  readonly connected: boolean;
  readonly reconnecting: boolean;
  readonly loggedOn: boolean;
  readonly steamID: string | null;
  readonly playingAppIds: readonly number[];
  readonly currentGames: readonly number[];
  readonly accountName: string | null;
}

export interface SteamErrorDetails {
  readonly message: string;
  readonly eresult?: number;
  readonly cause?: string;
}

export interface SessionData {
  readonly sessionKey: string;
  readonly accountName: string;
}

export enum SteamGuardType {
  EMAIL = 'email',
  MOBILE = 'mobile'
}