/**
 * Background Service Worker
 * Handles API calls (bypasses CORS) and context menu
 */
import { getProvider } from './providers/index.js';

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
      .then(result => sendResponse({ success: true, translation: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

/**
 * Handle translation request using Strategy Pattern
 */
async function handleTranslate({ text, engine, apiKey, sourceLang, targetLang, tone }) {
  const provider = getProvider(engine, apiKey);
  return await provider.translate(text, sourceLang, targetLang, tone);
}
