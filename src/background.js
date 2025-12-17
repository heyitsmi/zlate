/**
 * Background Service Worker
 * Handles API calls (bypasses CORS) and context menu
 * Requirements: 2.1, 2.3, 3.1, 3.3, 4.1, 5.1
 */
import { getProvider } from './providers/index.js';
import { featureGate } from './utils/featureGate.js';
import { licenseManager } from './utils/license.js';
import { historyManager } from './utils/history.js';

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: 'Translate "%s"',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translate-selection' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'contextMenuTranslate',
      text: info.selectionText
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslate(request)
      .then(result => sendResponse({ success: true, translation: result.translation, historyItem: result.historyItem }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

/**
 * Validate provider and tone access based on license status
 * Requirements: 2.1, 2.3, 3.1, 3.3
 * @param {string} engine - The AI engine/provider to use
 * @param {string} tone - The translation tone to use
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function validateFeatureAccess(engine, tone) {
  // Get current license status to update feature gate cache
  const licenseStatus = await licenseManager.getLicenseStatus();
  featureGate.updateLicenseStatus(licenseStatus);
  
  // Check provider access (Requirements: 2.1, 2.3)
  if (!featureGate.isProviderAvailable(engine)) {
    return {
      valid: false,
      error: `The ${engine} provider requires a Premium license. Please upgrade or select Gemini or DeepSeek.`
    };
  }
  
  // Check tone access (Requirements: 3.1, 3.3)
  if (!featureGate.isToneAvailable(tone)) {
    return {
      valid: false,
      error: `The ${tone} tone requires a Premium license. Please upgrade or use Neutral tone.`
    };
  }
  
  return { valid: true };
}

/**
 * Handle translation request using Strategy Pattern
 * Requirements: 2.1, 2.3, 3.1, 3.3, 4.1, 5.1
 * @param {Object} params - Translation parameters
 * @param {string} params.text - Text to translate
 * @param {string} params.engine - AI engine to use
 * @param {string} params.apiKey - API key for the engine
 * @param {string} params.sourceLang - Source language code
 * @param {string} params.targetLang - Target language code
 * @param {string} params.tone - Translation tone
 * @returns {Promise<{translation: string, historyItem?: Object}>}
 */
async function handleTranslate({ text, engine, apiKey, sourceLang, targetLang, tone }) {
  // Validate feature access before making API call
  const accessCheck = await validateFeatureAccess(engine, tone || 'neutral');
  if (!accessCheck.valid) {
    throw new Error(accessCheck.error);
  }
  
  // Perform translation
  const provider = getProvider(engine, apiKey);
  const translation = await provider.translate(text, sourceLang, targetLang, tone);
  
  // Save to history with proper limit enforcement (Requirements: 4.1, 5.1)
  let historyItem = null;
  try {
    historyItem = await historyManager.addTranslation({
      original: text,
      translation: translation,
      sourceLang: sourceLang,
      targetLang: targetLang,
      engine: engine,
      tone: tone || 'neutral'
    });
    
    // Trigger cloud sync for premium users (Requirement 5.1)
    const licenseStatus = await licenseManager.getLicenseStatus();
    if (licenseStatus.isPremium) {
      // Fire and forget - don't block translation response
      historyManager.syncToCloud().catch(err => {
        console.warn('Cloud sync failed:', err.message);
      });
    }
  } catch (historyError) {
    // Don't fail translation if history saving fails
    console.warn('Failed to save translation to history:', historyError.message);
  }
  
  return { translation, historyItem };
}
