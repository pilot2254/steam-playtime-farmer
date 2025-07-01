// Connection-related type definitions
export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  accountName: string | null;
  lastDisconnectReason: string | null;
  reconnectFunc: (() => void) | null;
}

export interface ConnectionCallbacks {
  onReconnecting?: (attempt: number, maxAttempts: number, delay: number) => void;
  onReconnected?: () => void;
  onReconnectFailed?: (reason: string | null) => void;
  onStateChanged?: (newState: ConnectionState, oldState: ConnectionState) => void;
}

export interface ReconnectOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}