/**
 * Popup Script
 * Settings UI and history management
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1-2.4, 3.1-3.4, 4.3, 4.4, 7.1-7.4
 */
import { LANGUAGES, PROVIDERS, FREE_HISTORY_LIMIT } from '../utils/constants.js';
import { licenseManager } from '../utils/license.js';
import { featureGate } from '../utils/featureGate.js';

// Get browser API (Chrome/Firefox compatibility)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', async () => {
  const engineSelect = document.getElementById('engine');
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeyHint = document.getElementById('apiKeyHint');
  const sourceLangSelect = document.getElementById('sourceLang');
  const targetLangSelect = document.getElementById('targetLang');
  const swapLangBtn = document.getElementById('swapLangBtn');
  const toneSelect = document.getElementById('tone');
  const themeSelect = document.getElementById('theme');
  const themeToggle = document.getElementById('themeToggle');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const tabs = document.querySelectorAll('.tab');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  
  // License UI elements
  const licenseBadge = document.getElementById('licenseBadge');
  const licenseKeyInput = document.getElementById('licenseKey');
  const validateLicenseBtn = document.getElementById('validateLicenseBtn');
  const licenseStatus = document.getElementById('licenseStatus');
  const expirationWarning = document.getElementById('expirationWarning');

  // Current license status
  let currentLicenseStatus = null;

  // Initialize license status and populate dropdowns
  await initializeLicenseStatus();
  populateDropdowns();

  // Apply theme
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      themeToggle.textContent = '☀️';
    } else {
      document.body.classList.remove('dark');
      themeToggle.textContent = '🌙';
    }
  }

  /**
   * Initialize license status on popup load
   * Requirements: 1.5, 7.1, 7.2, 7.3
   */
  async function initializeLicenseStatus() {
    try {
      currentLicenseStatus = await licenseManager.getLicenseStatus();
      featureGate.updateLicenseStatus(currentLicenseStatus);
      updateLicenseBadge();
      checkExpirationWarning();
      
      // Load stored license key into input
      if (currentLicenseStatus.licenseKey) {
        licenseKeyInput.value = currentLicenseStatus.licenseKey;
      }
    } catch (error) {
      console.error('Failed to initialize license status:', error);
      currentLicenseStatus = { isPremium: false };
      featureGate.updateLicenseStatus(currentLicenseStatus);
    }
  }

  /**
   * Update license badge display
   * Requirements: 7.1, 7.2
   */
  function updateLicenseBadge() {
    if (currentLicenseStatus && currentLicenseStatus.isPremium) {
      licenseBadge.textContent = 'Premium';
      licenseBadge.className = 'license-badge premium';
    } else {
      licenseBadge.textContent = 'Free';
      licenseBadge.className = 'license-badge free';
    }
  }

  /**
   * Check and display expiration warning
   * Requirements: 7.3
   */
  function checkExpirationWarning() {
    if (!currentLicenseStatus || !currentLicenseStatus.isPremium || !currentLicenseStatus.expiresAt) {
      expirationWarning.style.display = 'none';
      return;
    }

    const expiresAt = new Date(currentLicenseStatus.expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      expirationWarning.style.display = 'block';
      expirationWarning.innerHTML = `⚠️ Your license expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. <a href="https://zlate.app/renew" target="_blank">Renew now</a>`;
    } else {
      expirationWarning.style.display = 'none';
    }
  }

  /**
   * Validate license key
   * Requirements: 1.2, 1.3, 1.4
   */
  async function validateLicense() {
    const licenseKey = licenseKeyInput.value.trim();
    
    if (!licenseKey) {
      showLicenseStatus('Please enter a license key', 'error');
      return;
    }

    validateLicenseBtn.disabled = true;
    validateLicenseBtn.textContent = 'Validating...';
    
    try {
      const result = await licenseManager.validateLicense(licenseKey);
      
      if (result.valid && result.license) {
        // Store the valid license (Requirement 1.3)
        const now = new Date();
        const newStatus = {
          isPremium: true,
          licenseKey: licenseKey,
          email: result.license.email,
          expiresAt: result.license.expiresAt,
          validatedAt: now.toISOString(),
          cachedUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
        
        await licenseManager.storeLicenseStatus(newStatus);
        currentLicenseStatus = newStatus;
        featureGate.updateLicenseStatus(currentLicenseStatus);
        
        showLicenseStatus('✓ License activated! Premium features unlocked.', 'success');
        updateLicenseBadge();
        checkExpirationWarning();
        populateDropdowns(); // Refresh dropdowns with premium options
      } else {
        // Invalid license (Requirement 1.4)
        showLicenseStatus(result.error || 'Invalid license key', 'error');
      }
    } catch (error) {
      showLicenseStatus('Network error. Please try again.', 'error');
    } finally {
      validateLicenseBtn.disabled = false;
      validateLicenseBtn.textContent = 'Validate';
    }
  }

  /**
   * Show license status message
   */
  function showLicenseStatus(message, type) {
    licenseStatus.textContent = message;
    licenseStatus.className = 'license-status ' + type;
    
    if (type !== 'error') {
      setTimeout(() => {
        licenseStatus.className = 'license-status';
      }, 5000);
    }
  }

  // License validation button click handler
  validateLicenseBtn.addEventListener('click', validateLicense);
  
  // Allow Enter key to validate license
  licenseKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      validateLicense();
    }
  });

  /**
   * Populate dropdowns with feature gating
   * Requirements: 2.1-2.4, 3.1-3.4
   */
  function populateDropdowns() {
    const isPremium = currentLicenseStatus?.isPremium || false;
    
    // Engines with feature gating (Requirements: 2.1, 2.2, 2.3)
    const providers = featureGate.getAvailableProviders(isPremium);
    engineSelect.innerHTML = providers.map(p => {
      const proLabel = p.isPremium && !p.available ? ' (Pro)' : '';
      const disabled = !p.available ? 'disabled' : '';
      return `<option value="${p.id}" ${disabled} class="${p.isPremium ? 'premium-option' : ''}">${p.name}${proLabel}</option>`;
    }).join('');

    // Languages
    const langOptions = LANGUAGES.map(l => 
      `<option value="${l.code}">${l.name}</option>`
    ).join('');
    sourceLangSelect.innerHTML = langOptions;
    targetLangSelect.innerHTML = LANGUAGES.filter(l => l.code !== 'auto')
      .map(l => `<option value="${l.code}">${l.name}</option>`).join('');

    // Tones with feature gating (Requirements: 3.1, 3.2, 3.3)
    const tones = featureGate.getAvailableTones(isPremium);
    toneSelect.innerHTML = tones.map(t => {
      const proLabel = t.isPremium && !t.available ? ' (Pro)' : '';
      const disabled = !t.available ? 'disabled' : '';
      return `<option value="${t.id}" ${disabled} class="${t.isPremium ? 'premium-option' : ''}">${t.name}${proLabel}</option>`;
    }).join('');
  }

  function updateApiKeyHint() {
    const provider = PROVIDERS.find(p => p.id === engineSelect.value);
    apiKeyHint.textContent = provider ? provider.hint : '';
  }

  /**
   * Show upgrade prompt when user tries to select premium feature
   * Requirements: 2.4, 3.4
   */
  function showUpgradePrompt(element, featureType) {
    // Remove any existing prompt
    const existingPrompt = document.querySelector('.upgrade-prompt');
    if (existingPrompt) existingPrompt.remove();

    const prompt = document.createElement('div');
    prompt.className = 'upgrade-prompt';
    prompt.innerHTML = `This ${featureType} requires Premium. <a href="https://zlate.app/upgrade" target="_blank">Upgrade</a>`;
    
    const rect = element.getBoundingClientRect();
    prompt.style.top = `${rect.bottom + 5}px`;
    prompt.style.left = `${rect.left}px`;
    
    document.body.appendChild(prompt);
    
    // Remove after 3 seconds
    setTimeout(() => prompt.remove(), 3000);
    
    // Remove on click outside
    document.addEventListener('click', function removePrompt(e) {
      if (!prompt.contains(e.target)) {
        prompt.remove();
        document.removeEventListener('click', removePrompt);
      }
    });
  }

  // Handle premium provider selection attempt (Requirement 2.4)
  engineSelect.addEventListener('mousedown', (e) => {
    const isPremium = currentLicenseStatus?.isPremium || false;
    if (!isPremium) {
      // Store current value to restore if premium option is selected
      engineSelect.dataset.previousValue = engineSelect.value;
    }
  });

  engineSelect.addEventListener('change', (e) => {
    const isPremium = currentLicenseStatus?.isPremium || false;
    if (!isPremium && !featureGate.isProviderAvailable(engineSelect.value, isPremium)) {
      showUpgradePrompt(engineSelect, 'AI provider');
      engineSelect.value = engineSelect.dataset.previousValue || 'gemini';
    }
    updateApiKeyHint();
    browserAPI.storage.local.get(['apiKeys'], (result) => {
      const apiKeys = result.apiKeys || {};
      apiKeyInput.value = apiKeys[engineSelect.value] || '';
    });
  });

  // Handle premium tone selection attempt (Requirement 3.4)
  toneSelect.addEventListener('mousedown', (e) => {
    const isPremium = currentLicenseStatus?.isPremium || false;
    if (!isPremium) {
      toneSelect.dataset.previousValue = toneSelect.value;
    }
  });

  toneSelect.addEventListener('change', (e) => {
    const isPremium = currentLicenseStatus?.isPremium || false;
    if (!isPremium && !featureGate.isToneAvailable(toneSelect.value, isPremium)) {
      showUpgradePrompt(toneSelect, 'tone');
      toneSelect.value = toneSelect.dataset.previousValue || 'neutral';
    }
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
      
      if (tab.dataset.tab === 'history') loadHistory();
    });
  });

  // Load saved settings
  browserAPI.storage.local.get(['engine', 'apiKeys', 'sourceLang', 'targetLang', 'tone', 'theme'], (result) => {
    if (result.engine) engineSelect.value = result.engine;
    if (result.apiKeys && result.apiKeys[engineSelect.value]) {
      apiKeyInput.value = result.apiKeys[engineSelect.value];
    }
    if (result.sourceLang) sourceLangSelect.value = result.sourceLang;
    if (result.targetLang) targetLangSelect.value = result.targetLang;
    if (result.tone) toneSelect.value = result.tone;
    if (result.theme) {
      themeSelect.value = result.theme;
      applyTheme(result.theme);
    }
    updateApiKeyHint();
  });

  // Note: Engine change handler is now combined with feature gating above

  // Swap languages
  swapLangBtn.addEventListener('click', () => {
    const source = sourceLangSelect.value;
    const target = targetLangSelect.value;
    
    if (source === 'auto') {
      showStatus('Cannot swap when source is Auto Detect', 'error');
      return;
    }
    
    sourceLangSelect.value = target;
    targetLangSelect.value = source;
  });

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    themeSelect.value = newTheme;
    applyTheme(newTheme);
    browserAPI.storage.local.set({ theme: newTheme });
  });

  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
    browserAPI.storage.local.set({ theme: themeSelect.value });
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const engine = engineSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;
    const tone = toneSelect.value;
    const theme = themeSelect.value;

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    browserAPI.storage.local.get(['apiKeys'], (result) => {
      const apiKeys = result.apiKeys || {};
      apiKeys[engine] = apiKey;

      browserAPI.storage.local.set({
        engine, apiKeys, sourceLang, targetLang, tone, theme
      }, () => showStatus('Settings saved!', 'success'));
    });
  });

  /**
   * Load history with limit display for freemium users
   * Requirements: 4.3, 4.4
   */
  function loadHistory() {
    browserAPI.storage.local.get(['translationHistory'], (result) => {
      const history = result.translationHistory || [];
      const isPremium = currentLicenseStatus?.isPremium || false;
      
      // Build history limit message for freemium users (Requirements: 4.3, 4.4)
      let limitMessageHtml = '';
      if (!isPremium) {
        limitMessageHtml = `
          <div class="history-limit-message">
            📋 Showing last ${FREE_HISTORY_LIMIT} translations (Free plan limit). 
            <a href="https://zlate.app/upgrade" target="_blank">Upgrade to Premium</a> for unlimited history with cloud sync.
          </div>
        `;
      }
      
      if (history.length === 0) {
        historyList.innerHTML = limitMessageHtml + '<div class="history-empty">No translation history yet</div>';
        return;
      }
      
      const langMap = Object.fromEntries(LANGUAGES.map(l => [l.code, l.shortName]));
      
      const historyItemsHtml = history.map(item => `
        <div class="history-item" data-translation="${escapeAttr(item.translation)}">
          <div class="history-original">${escapeHtml(truncate(item.original, 100))}</div>
          <div class="history-translation">${escapeHtml(item.translation)}</div>
          <div class="history-meta">
            <span>${item.engine.toUpperCase()} · ${langMap[item.sourceLang] || item.sourceLang} → ${langMap[item.targetLang] || item.targetLang}</span>
            <button class="history-copy">Copy</button>
          </div>
        </div>
      `).join('');
      
      historyList.innerHTML = limitMessageHtml + historyItemsHtml;
      
      historyList.querySelectorAll('.history-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const item = e.target.closest('.history-item');
          navigator.clipboard.writeText(item.dataset.translation);
          e.target.textContent = 'Copied!';
          setTimeout(() => e.target.textContent = 'Copy', 1500);
        });
      });
    });
  }

  // Clear history
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear all translation history?')) {
      browserAPI.storage.local.set({ translationHistory: [] }, loadHistory);
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    setTimeout(() => status.className = 'status', 3000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return text.replace(/"/g, '&quot;');
  }

  function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
});
