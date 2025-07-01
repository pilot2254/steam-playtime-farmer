// Steam-related type definitions
export interface SteamGame {
  appId: number;
  name: string;
}

export interface SteamLoginDetails {
  accountName: string;
  password?: string;
  sharedSecret?: string;
}

export interface SteamStatus {
  connected: boolean;
  reconnecting: boolean;
  loggedOn: boolean;
  steamID: string | null;
  playingAppIds: number[];
  currentGames: number[];
  accountName: string | null;
}

export interface SteamErrorDetails {
  message: string;
  eresult?: number;
  cause?: string;
}

export interface SessionData {
  sessionKey: string;
  accountName: string;
}