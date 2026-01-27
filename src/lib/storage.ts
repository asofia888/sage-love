/**
 * Storage abstraction layer for localStorage operations
 * Provides consistent interface and error handling for storage operations
 */

export const storage = {
  /**
   * Get a value from localStorage
   * @param key - Storage key
   * @returns Parsed value or null if not found
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  },

  /**
   * Get raw string value from localStorage
   * @param key - Storage key
   * @returns Raw string value or null if not found
   */
  getRaw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * Set a value in localStorage
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save to storage (key: ${key}):`, e);
      throw e;
    }
  },

  /**
   * Set raw string value in localStorage
   * @param key - Storage key
   * @param value - String value to store
   */
  setRaw(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`Failed to save to storage (key: ${key}):`, e);
      throw e;
    }
  },

  /**
   * Remove a value from localStorage
   * @param key - Storage key to remove
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove from storage (key: ${key}):`, e);
    }
  },

  /**
   * Get the size of a stored value in bytes
   * @param key - Storage key
   * @returns Size in bytes, or 0 if not found
   */
  getSize(key: string): number {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return 0;
      }
      return new Blob([item]).size;
    } catch {
      return 0;
    }
  },
};
