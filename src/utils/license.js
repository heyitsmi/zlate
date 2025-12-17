/**
 * License Manager for Zlate Extension
 * Handles license validation, caching, and status management
 * Requirements: 1.2, 1.3, 1.4, 1.5
 */

import {
  FREE_PROVIDERS,
  PREMIUM_PROVIDERS,
  FREE_TONES,
  PREMIUM_TONES,
  CACHE_DURATION,
  GRACE_PERIOD,
  LICENSE_STORAGE_KEYS,
  LICENSE_API_BASE_URL
} from './constants.js';

/**
 * @typedef {Object} LicenseStatus
 * @property {boolean} isPremium - Whether user has premium status
 * @property {string|null} licenseKey - The license key if any
 * @property {string|null} email - User email from license
 * @property {string|null} expiresAt - License expiration date ISO string
 * @property {string} validatedAt - Last validation timestamp ISO string
 * @property {string} cachedUntil - Cache expiry timestamp ISO string
 */

/**
 * @typedef {Object} LicenseValidationResult
 * @property {boolean} valid - Whether the license is valid
 * @property {Object} [license] - License details if valid
 * @property {string} [license.email] - User email
 * @property {string} [license.expiresAt] - Expiration date
 * @property {string} [license.plan] - License plan
 * @property {string} [license.createdAt] - Creation date
 * @property {string} [error] - Error message if invalid
 */

/**
 * Feature types that can be checked for access
 * @typedef {'provider:openai'|'provider:claude'|'provider:groq'|'tone:formal'|'tone:casual'|'tone:friendly'|'tone:professional'|'tone:academic'|'tone:simple'|'history:unlimited'|'history:sync'} FeatureType
 */

class LicenseManager {
  constructor() {
    /** @type {LicenseStatus|null} */
    this._cachedStatus = null;
  }

  /**
   * Validate license key against backend
   * Requirements: 1.2
   * @param {string} licenseKey - The license key to validate
   * @returns {Promise<LicenseValidationResult>}
   */
  async validateLicense(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.trim() === '') {
      return {
        valid: false,
        error: 'License key is required'
      };
    }

    try {
      const response = await fetch(`${LICENSE_API_BASE_URL}/api/license/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ licenseKey: licenseKey.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          error: errorData.error || `Validation failed with status ${response.status}`
        };
      }

      const data = await response.json();
      return {
        valid: data.valid === true,
        license: data.license,
        error: data.error
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message || 'Network error during validation'
      };
    }
  }

  /**
   * Get current license status (from cache or validate)
   * Requirements: 1.5, 8.1, 8.2, 8.3
   * @returns {Promise<LicenseStatus>}
   */
  async getLicenseStatus() {
    // Try to get stored status from chrome.storage.local
    const storedData = await this._getStoredLicenseData();
    
    // If no license key stored, return freemium status (Requirement 1.5)
    if (!storedData.licenseKey) {
      return this._getFreemiumStatus();
    }

    const storedStatus = storedData.licenseStatus;

    // Check if cache is still valid (Requirement 8.1, 8.2)
    if (storedStatus && this._isCacheValid(storedStatus)) {
      this._cachedStatus = storedStatus;
      return storedStatus;
    }

    // Cache expired, need to re-validate (Requirement 8.3)
    try {
      const validationResult = await this.validateLicense(storedData.licenseKey);
      
      if (validationResult.valid && validationResult.license) {
        const now = new Date();
        const newStatus = {
          isPremium: true,
          licenseKey: storedData.licenseKey,
          email: validationResult.license.email,
          expiresAt: validationResult.license.expiresAt,
          validatedAt: now.toISOString(),
          cachedUntil: new Date(now.getTime() + CACHE_DURATION).toISOString()
        };
        
        await this.storeLicenseStatus(newStatus);
        this._cachedStatus = newStatus;
        return newStatus;
      } else {
        // Invalid license - revert to freemium
        const freemiumStatus = this._getFreemiumStatus();
        await this.storeLicenseStatus(freemiumStatus);
        this._cachedStatus = freemiumStatus;
        return freemiumStatus;
      }
    } catch (error) {
      // Network error - check grace period (Requirement 8.4)
      if (storedStatus && storedStatus.isPremium && this._isWithinGracePeriod(storedStatus)) {
        // Maintain premium status during grace period
        this._cachedStatus = storedStatus;
        return storedStatus;
      }
      
      // Outside grace period or no previous premium status
      const freemiumStatus = this._getFreemiumStatus();
      this._cachedStatus = freemiumStatus;
      return freemiumStatus;
    }
  }

  /**
   * Get stored license data from chrome.storage.local
   * @returns {Promise<{licenseKey: string|null, licenseStatus: LicenseStatus|null}>}
   * @private
   */
  async _getStoredLicenseData() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(
          [LICENSE_STORAGE_KEYS.LICENSE_KEY, LICENSE_STORAGE_KEYS.LICENSE_STATUS],
          (result) => {
            resolve({
              licenseKey: result[LICENSE_STORAGE_KEYS.LICENSE_KEY] || null,
              licenseStatus: result[LICENSE_STORAGE_KEYS.LICENSE_STATUS] || null
            });
          }
        );
      } else {
        // Fallback for non-extension environment (testing)
        resolve({
          licenseKey: null,
          licenseStatus: null
        });
      }
    });
  }

  /**
   * Store license status to local storage
   * Requirements: 1.3
   * @param {LicenseStatus} status - The license status to store
   * @returns {Promise<void>}
   */
  async storeLicenseStatus(status) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const dataToStore = {
          [LICENSE_STORAGE_KEYS.LICENSE_KEY]: status.licenseKey,
          [LICENSE_STORAGE_KEYS.LICENSE_STATUS]: status
        };
        
        chrome.storage.local.set(dataToStore, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            this._cachedStatus = status;
            resolve();
          }
        });
      } else {
        // Fallback for non-extension environment (testing)
        this._cachedStatus = status;
        resolve();
      }
    });
  }

  /**
   * Clear license and revert to freemium
   * Requirements: 1.4
   * @returns {Promise<void>}
   */
  async clearLicense() {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(
          [LICENSE_STORAGE_KEYS.LICENSE_KEY, LICENSE_STORAGE_KEYS.LICENSE_STATUS],
          () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              this._cachedStatus = this._getFreemiumStatus();
              resolve();
            }
          }
        );
      } else {
        // Fallback for non-extension environment (testing)
        this._cachedStatus = this._getFreemiumStatus();
        resolve();
      }
    });
  }

  /**
   * Check if specific feature is available based on current license
   * @param {FeatureType} feature - The feature to check
   * @returns {boolean}
   */
  hasFeature(feature) {
    if (!this._cachedStatus || !this._cachedStatus.isPremium) {
      return this._isFreemiumFeature(feature);
    }
    return true; // Premium users have access to all features
  }

  /**
   * Check if a feature is available for freemium users
   * @param {FeatureType} feature - The feature to check
   * @returns {boolean}
   * @private
   */
  _isFreemiumFeature(feature) {
    const [type, value] = feature.split(':');
    
    switch (type) {
      case 'provider':
        return FREE_PROVIDERS.includes(value);
      case 'tone':
        return FREE_TONES.includes(value);
      case 'history':
        // Freemium users don't have unlimited history or sync
        return false;
      default:
        return false;
    }
  }

  /**
   * Get default freemium status
   * @returns {LicenseStatus}
   * @private
   */
  _getFreemiumStatus() {
    const now = new Date().toISOString();
    return {
      isPremium: false,
      licenseKey: null,
      email: null,
      expiresAt: null,
      validatedAt: now,
      cachedUntil: now
    };
  }

  /**
   * Check if cached status is still valid
   * @param {LicenseStatus} status - The status to check
   * @returns {boolean}
   * @private
   */
  _isCacheValid(status) {
    if (!status || !status.cachedUntil) {
      return false;
    }
    return new Date(status.cachedUntil) > new Date();
  }

  /**
   * Check if status is within grace period
   * Requirements: 8.4
   * @param {LicenseStatus} status - The status to check
   * @returns {boolean}
   * @private
   */
  _isWithinGracePeriod(status) {
    if (!status || !status.validatedAt) {
      return false;
    }
    const validatedAt = new Date(status.validatedAt).getTime();
    const gracePeriodEnd = validatedAt + GRACE_PERIOD;
    return Date.now() < gracePeriodEnd;
  }
}

/**
 * Check if license expiration warning should be shown
 * Requirements: 7.3
 * @param {LicenseStatus} licenseStatus - The license status to check
 * @param {Date} [currentDate] - Optional current date for testing
 * @returns {{shouldShow: boolean, daysUntilExpiry: number|null}}
 */
export function checkExpirationWarning(licenseStatus, currentDate = new Date()) {
  // No warning for non-premium users or users without expiration date
  if (!licenseStatus || !licenseStatus.isPremium || !licenseStatus.expiresAt) {
    return { shouldShow: false, daysUntilExpiry: null };
  }

  const expiresAt = new Date(licenseStatus.expiresAt);
  const now = currentDate;
  const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  // Show warning if expiration is within 7 days and not already expired
  const shouldShow = daysUntilExpiry <= 7 && daysUntilExpiry > 0;

  return { shouldShow, daysUntilExpiry };
}

// Export singleton instance
export const licenseManager = new LicenseManager();

// Export class for testing
export { LicenseManager };
