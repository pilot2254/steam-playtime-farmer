/**
 * Session Manager Module
 * Handles saving and loading Steam session data for persistent connections
 */
import fs from 'fs';
import { appConfig } from '../config/app.config.js';
import type { SessionData } from '../types/steam.js';

// Session file path
const SESSION_FILE = appConfig.paths.sessionFile;

export function createSessionManager() {
  return {
    /**
     * Save Steam session data to file
     */
    saveSession(sessionData: SessionData): boolean {
      try {
        if (!sessionData) return false;

        // Convert to JSON string and save to file
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData), 'utf8');
        return true;
      } catch (err) {
        console.error('Failed to save session data:', err);
        return false;
      }
    },

    /**
     * Load Steam session data from file
     */
    loadSession(): SessionData | null {
      try {
        if (!fs.existsSync(SESSION_FILE)) return null;

        const data = fs.readFileSync(SESSION_FILE, 'utf8');
        return JSON.parse(data) as SessionData;
      } catch (err) {
        console.error('Failed to load session data:', err);
        return null;
      }
    },

    /**
     * Clear the saved session data
     */
    clearSession(): boolean {
      try {
        if (fs.existsSync(SESSION_FILE)) {
          fs.unlinkSync(SESSION_FILE);
        }
        return true;
      } catch (err) {
        console.error('Failed to clear session data:', err);
        return false;
      }
    },

    /**
     * Check if a session exists
     */
    hasSession(): boolean {
      return fs.existsSync(SESSION_FILE);
    },
  };
}

export type SessionManager = ReturnType<typeof createSessionManager>;