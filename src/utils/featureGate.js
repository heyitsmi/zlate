/**
 * Feature Gate for Zlate Extension
 * Controls access to premium features based on license status
 * Requirements: 2.1, 2.3, 3.1, 3.3, 4.2, 5.3
 */

import {
  PROVIDERS,
  TONES,
  FREE_PROVIDERS,
  PREMIUM_PROVIDERS,
  FREE_TONES,
  PREMIUM_TONES,
  FREE_HISTORY_LIMIT
} from './constants.js';
import { licenseManager } from './license.js';

/**
 * @typedef {Object} ProviderInfo
 * @property {string} id - Provider identifier
 * @property {string} name - Display name
 * @property {string} hint - Help text for API key
 * @property {boolean} available - Whether provider is available for current license
 * @property {boolean} isPremium - Whether this is a premium-only provider
 */

/**
 * @typedef {Object} ToneInfo
 * @property {string} id - Tone identifier
 * @property {string} name - Display name
 * @property {boolean} available - Whether tone is available for current license
 * @property {boolean} isPremium - Whether this is a premium-only tone
 */

class FeatureGate {
  /**
   * Create a FeatureGate instance
   * @param {import('./license.js').LicenseManager} [licenseManagerInstance] - Optional license manager for testing
   */
  constructor(licenseManagerInstance = licenseManager) {
    this._licenseManager = licenseManagerInstance;
    this._cachedStatus = null;
  }

  /**
   * Get available providers based on license status
   * Requirements: 2.1, 2.3
   * @param {boolean} [isPremium] - Override premium status (for testing)
   * @returns {ProviderInfo[]}
   */
  getAvailableProviders(isPremium = null) {
    const premium = isPremium !== null ? isPremium : this._isPremium();
    
    return PROVIDERS.map(provider => ({
      ...provider,
      available: premium || FREE_PROVIDERS.includes(provider.id),
      isPremium: PREMIUM_PROVIDERS.includes(provider.id)
    }));
  }

  /**
   * Get available tones based on license status
   * Requirements: 3.1, 3.3
   * @param {boolean} [isPremium] - Override premium status (for testing)
   * @returns {ToneInfo[]}
   */
  getAvailableTones(isPremium = null) {
    const premium = isPremium !== null ? isPremium : this._isPremium();
    
    return TONES.map(tone => ({
      ...tone,
      available: premium || FREE_TONES.includes(tone.id),
      isPremium: PREMIUM_TONES.includes(tone.id)
    }));
  }

  /**
   * Get history limit based on license status
   * Requirements: 4.2, 5.3
   * @param {boolean} [isPremium] - Override premium status (for testing)
   * @returns {number} - 5 for freemium, Infinity for premium
   */
  getHistoryLimit(isPremium = null) {
    const premium = isPremium !== null ? isPremium : this._isPremium();
    return premium ? Infinity : FREE_HISTORY_LIMIT;
  }

  /**
   * Check if cloud sync is enabled
   * @param {boolean} [isPremium] - Override premium status (for testing)
   * @returns {boolean}
   */
  isCloudSyncEnabled(isPremium = null) {
    const premium = isPremium !== null ? isPremium : this._isPremium();
    return premium;
  }

  /**
   * Check if a specific provider is available
   * @param {string} providerId - The provider ID to check
   * @param {boolean} [isPremium] - Override premium status (for testing)
   * @returns {boolean}
   */
  isProviderAvailable(providerId, isPremium = null) {
    const premium = isPremium !== null ? isPremium : this._isPremium();
    return premium || FREE_PROVIDERS.includes(providerId);
  }

  /**
   * Check if a specific tone is available
   * @param {string} toneId - The tone ID to check
   * @param {boolean} [isPremium] - Override premium status (for testing)
   * @returns {boolean}
   */
  isToneAvailable(toneId, isPremium = null) {
    const premium = isPremium !== null ? isPremium : this._isPremium();
    return premium || FREE_TONES.includes(toneId);
  }

  /**
   * Update cached license status
   * @param {import('./license.js').LicenseStatus} status - The license status
   */
  updateLicenseStatus(status) {
    this._cachedStatus = status;
  }

  /**
   * Check if current user has premium status
   * @returns {boolean}
   * @private
   */
  _isPremium() {
    if (this._cachedStatus !== null) {
      return this._cachedStatus.isPremium === true;
    }
    return this._licenseManager._cachedStatus?.isPremium === true;
  }
}

// Export singleton instance
export const featureGate = new FeatureGate();

// Export class for testing
export { FeatureGate };
