/**
 * Storage Service - Merkezi Depolama Servisi
 * LocalStorage ve SessionStorage yönetimi
 */

/**
 * Storage tipi
 */
export type StorageType = "local" | "session";

/**
 * Storage key tanımları
 */
export const STORAGE_KEYS = {
  // Kullanıcı tercihleri
  THEME: "muzik_theme",
  LANGUAGE: "muzik_language",
  
  // Audio ayarları
  LAST_INSTRUMENT: "muzik_last_instrument",
  LAST_BPM: "muzik_last_bpm",
  LAST_PERCUSSION: "muzik_last_percussion",
  
  // Son seçimler
  LAST_MAKAM: "muzik_last_makam",
  LAST_USUL: "muzik_last_usul",
  
  // Kayıtlar
  RECORDED_NOTES: "muzik_recorded_notes",
  
  // MIDI cihazı
  LAST_MIDI_DEVICE: "muzik_last_midi_device",
  
  // Onboarding
  HAS_VISITED_BEFORE: "muzik_has_visited",
  
  // Tutorial ilerleme
  TUTORIAL_PROGRESS: "muzik_tutorial_progress",
} as const;

/**
 * Storage value tipleri
 */
export type StorageValue = string | number | boolean | object | null;

/**
 * Storage Service
 */
class StorageService {
  private static instance: StorageService | null = null;

  private constructor() {}

  /**
   * Singleton instance getter
   */
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Storage'a değer kaydet
   */
  set(key: string, value: StorageValue, type: StorageType = "local"): void {
    try {
      const storage = type === "local" ? localStorage : sessionStorage;
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      storage.setItem(key, serialized);
    } catch (error) {
      console.error(`StorageService: Failed to set ${key}`, error);
    }
  }

  /**
   * Storage'dan değer al
   */
  get<T extends StorageValue>(
    key: string,
    type: StorageType = "local",
    defaultValue: T | null = null
  ): T | null {
    try {
      const storage = type === "local" ? localStorage : sessionStorage;
      const item = storage.getItem(key);
      
      if (item === null) return defaultValue;
      
      // Try to parse as JSON first
      try {
        return JSON.parse(item) as T;
      } catch {
        // Return as string if not valid JSON
        return item as T;
      }
    } catch (error) {
      console.error(`StorageService: Failed to get ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * Storage'dan değer sil
   */
  remove(key: string, type: StorageType = "local"): void {
    try {
      const storage = type === "local" ? localStorage : sessionStorage;
      storage.removeItem(key);
    } catch (error) {
      console.error(`StorageService: Failed to remove ${key}`, error);
    }
  }

  /**
   * Tüm storage'ı temizle
   */
  clear(type: StorageType = "local"): void {
    try {
      const storage = type === "local" ? localStorage : sessionStorage;
      storage.clear();
    } catch (error) {
      console.error(`StorageService: Failed to clear ${type}`, error);
    }
  }

  /**
   * Key'in var olup olmadığını kontrol et
   */
  has(key: string, type: StorageType = "local"): boolean {
    try {
      const storage = type === "local" ? localStorage : sessionStorage;
      return storage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Typed getters for specific keys
   */
  getString(key: string, type: StorageType = "local", defaultValue = ""): string {
    return (this.get(key, type, defaultValue) as string) ?? defaultValue;
  }

  getNumber(key: string, type: StorageType = "local", defaultValue = 0): number {
    return (this.get(key, type, defaultValue) as number) ?? defaultValue;
  }

  getBoolean(key: string, type: StorageType = "local", defaultValue = false): boolean {
    return (this.get(key, type, defaultValue) as boolean) ?? defaultValue;
  }

  getObject<T extends object>(key: string, type: StorageType = "local"): T | null {
    return this.get(key, type) as T | null;
  }
}

/**
 * Export singleton instance
 */
export const storageService = StorageService.getInstance();

/**
 * Storage service actions
 */
export const storageServiceActions = {
  set: (key: string, value: StorageValue, type?: StorageType) => 
    storageService.set(key, value, type),
  get: <T extends StorageValue>(key: string, type?: StorageType, defaultValue?: T | null) => 
    storageService.get(key, type, defaultValue),
  remove: (key: string, type?: StorageType) => storageService.remove(key, type),
  clear: (type?: StorageType) => storageService.clear(type),
  has: (key: string, type?: StorageType) => storageService.has(key, type),
  
  // Typed getters
  getString: (key: string, type?: StorageType, defaultValue?: string) => 
    storageService.getString(key, type, defaultValue),
  getNumber: (key: string, type?: StorageType, defaultValue?: number) => 
    storageService.getNumber(key, type, defaultValue),
  getBoolean: (key: string, type?: StorageType, defaultValue?: boolean) => 
    storageService.getBoolean(key, type, defaultValue),
  getObject: <T extends object>(key: string, type?: StorageType) => 
    storageService.getObject<T>(key, type),
  
  // Predefined keys
  keys: STORAGE_KEYS,
};

export type StorageServiceInstance = StorageService;
