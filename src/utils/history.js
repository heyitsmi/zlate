/**
 * History Manager for Zlate Extension
 * Manages translation history with local storage and cloud sync
 * Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.4
 */

import { STORAGE_KEYS, FREE_HISTORY_LIMIT, LICENSE_STORAGE_KEYS, LICENSE_API_BASE_URL } from './constants.js';

/**
 * @typedef {Object} HistoryItem
 * @property {string} id - Unique identifier
 * @property {string} original - Original text
 * @property {string} translation - Translated text
 * @property {string} sourceLang - Source language code
 * @property {string} targetLang - Target language code
 * @property {string} engine - AI engine used
 * @property {string} tone - Translation tone used
 * @property {string} timestamp - ISO timestamp of translation
 * @property {boolean} synced - Whether item has been synced to cloud
 */

/**
 * @typedef {Object} AddTranslationInput
 * @property {string} original - Original text
 * @property {string} translation - Translated text
 * @property {string} sourceLang - Source language code
 * @property {string} targetLang - Target language code
 * @property {string} engine - AI engine used
 * @property {string} [tone] - Translation tone used (defaults to 'neutral')
 */

class HistoryManager {
  constructor() {
    /** @type {HistoryItem[]|null} */
    this._cachedHistory = null;
    /** @type {boolean} */
    this._testPremiumStatus = false;
    /** @type {string|null} */
    this._testLicenseKey = null;
    /** @type {HistoryItem[]} */
    this._testPendingSyncItems = [];
  }

  /**
   * Get browser storage API (Chrome/Firefox compatibility)
   * @returns {Object}
   * @private
   */
  _getStorageAPI() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return chrome.storage.local;
    }
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      return browser.storage.local;
    }
    return null;
  }

  /**
   * Check if user has premium status
   * @returns {Promise<boolean>}
   * @private
   */
  async _isPremium() {
    const storage = this._getStorageAPI();
    if (!storage) {
      // Non-extension environment (testing) - use test flag
      return this._testPremiumStatus;
    }

    return new Promise((resolve) => {
      storage.get([LICENSE_STORAGE_KEYS.LICENSE_STATUS], (result) => {
        const status = result[LICENSE_STORAGE_KEYS.LICENSE_STATUS];
        resolve(status?.isPremium === true);
      });
    });
  }

  /**
   * Get license key from storage
   * @returns {Promise<string|null>}
   * @private
   */
  async _getLicenseKey() {
    const storage = this._getStorageAPI();
    if (!storage) {
      return this._testLicenseKey;
    }

    return new Promise((resolve) => {
      storage.get([LICENSE_STORAGE_KEYS.LICENSE_KEY], (result) => {
        resolve(result[LICENSE_STORAGE_KEYS.LICENSE_KEY] || null);
      });
    });
  }

  /**
   * Get pending sync items from storage
   * Requirements: 5.4
   * @returns {Promise<HistoryItem[]>}
   * @private
   */
  async _getPendingSyncItems() {
    const storage = this._getStorageAPI();
    if (!storage) {
      return this._testPendingSyncItems;
    }

    return new Promise((resolve) => {
      storage.get([LICENSE_STORAGE_KEYS.PENDING_SYNC_ITEMS], (result) => {
        resolve(result[LICENSE_STORAGE_KEYS.PENDING_SYNC_ITEMS] || []);
      });
    });
  }

  /**
   * Store pending sync items to storage
   * Requirements: 5.4
   * @param {HistoryItem[]} items - Items to store
   * @returns {Promise<void>}
   * @private
   */
  async _storePendingSyncItems(items) {
    const storage = this._getStorageAPI();
    if (!storage) {
      this._testPendingSyncItems = items;
      return;
    }

    return new Promise((resolve, reject) => {
      storage.set({ [LICENSE_STORAGE_KEYS.PENDING_SYNC_ITEMS]: items }, () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get history limit based on license status
   * Requirements: 4.2, 5.3
   * @returns {Promise<number>}
   */
  async getHistoryLimit() {
    const isPremium = await this._isPremium();
    return isPremium ? Infinity : FREE_HISTORY_LIMIT;
  }

  /**
   * Add new translation to history
   * Requirements: 4.1, 4.2, 5.1, 5.4
   * @param {AddTranslationInput} item - Translation data to add
   * @returns {Promise<HistoryItem>}
   */
  async addTranslation(item) {
    const storage = this._getStorageAPI();
    
    // Create history item with generated id and timestamp
    const historyItem = {
      id: this._generateId(),
      original: item.original,
      translation: item.translation,
      sourceLang: item.sourceLang,
      targetLang: item.targetLang,
      engine: item.engine,
      tone: item.tone || 'neutral',
      timestamp: new Date().toISOString(),
      synced: false
    };

    if (!storage) {
      // Non-extension environment (testing) - use in-memory cache
      if (!this._cachedHistory) {
        this._cachedHistory = [];
      }
      const updatedHistory = this._addToHistory(historyItem, this._cachedHistory, this._testPremiumStatus);
      this._cachedHistory = updatedHistory;
      
      // Add to pending sync queue for premium users (Requirement 5.4)
      if (this._testPremiumStatus) {
        await this._addToPendingSyncQueue(historyItem);
      }
      
      return historyItem;
    }

    return new Promise((resolve, reject) => {
      storage.get([STORAGE_KEYS.HISTORY, LICENSE_STORAGE_KEYS.LICENSE_STATUS], async (result) => {
        try {
          const history = result[STORAGE_KEYS.HISTORY] || [];
          const isPremium = result[LICENSE_STORAGE_KEYS.LICENSE_STATUS]?.isPremium === true;
          
          const updatedHistory = this._addToHistory(historyItem, history, isPremium);
          
          storage.set({ [STORAGE_KEYS.HISTORY]: updatedHistory }, async () => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              this._cachedHistory = updatedHistory;
              
              // Add to pending sync queue for premium users (Requirement 5.4)
              if (isPremium) {
                await this._addToPendingSyncQueue(historyItem);
              }
              
              resolve(historyItem);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Add item to history array with limit enforcement
   * @param {HistoryItem} item - Item to add
   * @param {HistoryItem[]} history - Current history array
   * @param {boolean} [isPremium=false] - Whether user is premium
   * @returns {HistoryItem[]}
   * @private
   */
  _addToHistory(item, history, isPremium = false) {
    // Add new item at the beginning (most recent first)
    const updatedHistory = [item, ...history];
    
    // Apply limit for freemium users (Requirement 4.2)
    if (!isPremium) {
      const limit = FREE_HISTORY_LIMIT;
      if (updatedHistory.length > limit) {
        // Remove oldest items to maintain limit
        return updatedHistory.slice(0, limit);
      }
    }
    
    return updatedHistory;
  }

  /**
   * Get all history items
   * Requirements: 4.3, 5.3
   * @returns {Promise<HistoryItem[]>}
   */
  async getHistory() {
    const storage = this._getStorageAPI();
    
    if (!storage) {
      // Non-extension environment (testing) - return cached history
      return this._cachedHistory || [];
    }

    return new Promise((resolve) => {
      storage.get([STORAGE_KEYS.HISTORY], (result) => {
        const history = result[STORAGE_KEYS.HISTORY] || [];
        this._cachedHistory = history;
        resolve(history);
      });
    });
  }

  /**
   * Clear all history
   * @returns {Promise<void>}
   */
  async clearHistory() {
    const storage = this._getStorageAPI();
    
    if (!storage) {
      // Non-extension environment (testing) - clear cached history
      this._cachedHistory = [];
      return;
    }

    return new Promise((resolve, reject) => {
      storage.set({ [STORAGE_KEYS.HISTORY]: [] }, () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          this._cachedHistory = [];
          resolve();
        }
      });
    });
  }

  /**
   * Sync pending items to cloud (Premium only)
   * Requirements: 5.1, 5.4
   * @returns {Promise<{success: boolean, syncedCount: number, error?: string}>}
   */
  async syncToCloud() {
    const isPremium = await this._isPremium();
    if (!isPremium) {
      return { success: false, syncedCount: 0, error: 'Cloud sync requires premium license' };
    }

    const licenseKey = await this._getLicenseKey();
    if (!licenseKey) {
      return { success: false, syncedCount: 0, error: 'No license key found' };
    }

    // Get pending sync items
    const pendingItems = await this._getPendingSyncItems();
    if (pendingItems.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    try {
      const response = await fetch(`${LICENSE_API_BASE_URL}/api/history/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey,
          items: pendingItems
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Keep items in pending queue for retry (Requirement 5.4)
        return { 
          success: false, 
          syncedCount: 0, 
          error: errorData.error || `Sync failed with status ${response.status}` 
        };
      }

      const data = await response.json();
      
      if (data.success) {
        // Mark synced items in local history
        await this._markItemsAsSynced(pendingItems.map(item => item.id));
        // Clear pending sync queue
        await this._storePendingSyncItems([]);
        return { success: true, syncedCount: data.syncedCount };
      } else {
        return { success: false, syncedCount: 0, error: data.error };
      }
    } catch (error) {
      // Network error - keep items in pending queue for retry (Requirement 5.4)
      return { 
        success: false, 
        syncedCount: 0, 
        error: error.message || 'Network error during sync' 
      };
    }
  }

  /**
   * Fetch history from cloud (Premium only)
   * Requirements: 5.2
   * @returns {Promise<{success: boolean, items?: HistoryItem[], error?: string}>}
   */
  async fetchFromCloud() {
    const isPremium = await this._isPremium();
    if (!isPremium) {
      return { success: false, error: 'Cloud sync requires premium license' };
    }

    const licenseKey = await this._getLicenseKey();
    if (!licenseKey) {
      return { success: false, error: 'No license key found' };
    }

    try {
      const response = await fetch(
        `${LICENSE_API_BASE_URL}/api/history?licenseKey=${encodeURIComponent(licenseKey)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.error || `Fetch failed with status ${response.status}` 
        };
      }

      const data = await response.json();
      
      if (data.success) {
        // Merge cloud history with local history
        await this._mergeCloudHistory(data.items);
        return { success: true, items: data.items };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Network error during fetch' 
      };
    }
  }

  /**
   * Add item to pending sync queue
   * Requirements: 5.4
   * @param {HistoryItem} item - Item to add to pending queue
   * @returns {Promise<void>}
   * @private
   */
  async _addToPendingSyncQueue(item) {
    const pendingItems = await this._getPendingSyncItems();
    // Avoid duplicates
    const exists = pendingItems.some(pending => pending.id === item.id);
    if (!exists) {
      pendingItems.push(item);
      await this._storePendingSyncItems(pendingItems);
    }
  }

  /**
   * Mark items as synced in local history
   * @param {string[]} itemIds - IDs of items to mark as synced
   * @returns {Promise<void>}
   * @private
   */
  async _markItemsAsSynced(itemIds) {
    const storage = this._getStorageAPI();
    
    if (!storage) {
      // Non-extension environment (testing)
      if (this._cachedHistory) {
        this._cachedHistory = this._cachedHistory.map(item => 
          itemIds.includes(item.id) ? { ...item, synced: true } : item
        );
      }
      return;
    }

    return new Promise((resolve, reject) => {
      storage.get([STORAGE_KEYS.HISTORY], (result) => {
        const history = result[STORAGE_KEYS.HISTORY] || [];
        const updatedHistory = history.map(item => 
          itemIds.includes(item.id) ? { ...item, synced: true } : item
        );
        
        storage.set({ [STORAGE_KEYS.HISTORY]: updatedHistory }, () => {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            this._cachedHistory = updatedHistory;
            resolve();
          }
        });
      });
    });
  }

  /**
   * Merge cloud history with local history
   * Requirements: 5.2
   * @param {HistoryItem[]} cloudItems - Items from cloud
   * @returns {Promise<void>}
   * @private
   */
  async _mergeCloudHistory(cloudItems) {
    const localHistory = await this.getHistory();
    
    // Create a map of local items by ID for quick lookup
    const localItemsMap = new Map(localHistory.map(item => [item.id, item]));
    
    // Add cloud items that don't exist locally
    const newItems = cloudItems.filter(cloudItem => !localItemsMap.has(cloudItem.id));
    
    if (newItems.length === 0) {
      return;
    }

    // Merge and sort by timestamp (most recent first)
    const mergedHistory = [...localHistory, ...newItems].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    await this.setHistory(mergedHistory);
  }

  /**
   * Generate unique ID for history item
   * @returns {string}
   * @private
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set history directly (for testing purposes)
   * @param {HistoryItem[]} history - History array to set
   * @returns {Promise<void>}
   */
  async setHistory(history) {
    const storage = this._getStorageAPI();
    
    if (!storage) {
      this._cachedHistory = history;
      return;
    }

    return new Promise((resolve, reject) => {
      storage.set({ [STORAGE_KEYS.HISTORY]: history }, () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          this._cachedHistory = history;
          resolve();
        }
      });
    });
  }

  /**
   * Set premium status (for testing purposes)
   * @param {boolean} isPremium - Premium status to set
   * @param {string} [licenseKey] - Optional license key to set
   * @returns {Promise<void>}
   */
  async setPremiumStatus(isPremium, licenseKey = null) {
    const storage = this._getStorageAPI();
    const key = licenseKey || (isPremium ? 'test-key' : null);
    
    if (!storage) {
      // For non-extension environment, we'll use flags
      this._testPremiumStatus = isPremium;
      this._testLicenseKey = key;
      return;
    }

    return new Promise((resolve, reject) => {
      const status = {
        isPremium,
        licenseKey: key,
        email: isPremium ? 'test@example.com' : null,
        expiresAt: isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        validatedAt: new Date().toISOString(),
        cachedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const dataToStore = {
        [LICENSE_STORAGE_KEYS.LICENSE_STATUS]: status,
        [LICENSE_STORAGE_KEYS.LICENSE_KEY]: key
      };

      storage.set(dataToStore, () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get pending sync items (for testing purposes)
   * @returns {Promise<HistoryItem[]>}
   */
  async getPendingSyncItems() {
    return this._getPendingSyncItems();
  }

  /**
   * Clear pending sync items (for testing purposes)
   * @returns {Promise<void>}
   */
  async clearPendingSyncItems() {
    return this._storePendingSyncItems([]);
  }
}

// Export singleton instance
export const historyManager = new HistoryManager();

// Export class for testing
export { HistoryManager };
