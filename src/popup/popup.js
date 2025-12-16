/**
 * Popup Script
 * Settings UI and history management
 */
import { LANGUAGES, TONES, PROVIDERS, MAX_HISTORY_ITEMS } from '../utils/constants.js';

// Get browser API (Chrome/Firefox compatibility)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', () => {
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

  // Populate dropdowns
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

  function populateDropdowns() {
    // Engines
    engineSelect.innerHTML = PROVIDERS.map(p => 
      `<option value="${p.id}">${p.name}</option>`
    ).join('');

    // Languages
    const langOptions = LANGUAGES.map(l => 
      `<option value="${l.code}">${l.name}</option>`
    ).join('');
    sourceLangSelect.innerHTML = langOptions;
    targetLangSelect.innerHTML = LANGUAGES.filter(l => l.code !== 'auto')
      .map(l => `<option value="${l.code}">${l.name}</option>`).join('');

    // Tones
    toneSelect.innerHTML = TONES.map(t => 
      `<option value="${t.id}">${t.name}</option>`
    ).join('');
  }

  function updateApiKeyHint() {
    const provider = PROVIDERS.find(p => p.id === engineSelect.value);
    apiKeyHint.textContent = provider ? provider.hint : '';
  }

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

  // Engine change handler
  engineSelect.addEventListener('change', () => {
    updateApiKeyHint();
    browserAPI.storage.local.get(['apiKeys'], (result) => {
      const apiKeys = result.apiKeys || {};
      apiKeyInput.value = apiKeys[engineSelect.value] || '';
    });
  });

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

  // Load history
  function loadHistory() {
    browserAPI.storage.local.get(['translationHistory'], (result) => {
      const history = result.translationHistory || [];
      
      if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No translation history yet</div>';
        return;
      }
      
      const langMap = Object.fromEntries(LANGUAGES.map(l => [l.code, l.shortName]));
      
      historyList.innerHTML = history.map(item => `
        <div class="history-item" data-translation="${escapeAttr(item.translation)}">
          <div class="history-original">${escapeHtml(truncate(item.original, 100))}</div>
          <div class="history-translation">${escapeHtml(item.translation)}</div>
          <div class="history-meta">
            <span>${item.engine.toUpperCase()} · ${langMap[item.sourceLang] || item.sourceLang} → ${langMap[item.targetLang] || item.targetLang}</span>
            <button class="history-copy">Copy</button>
          </div>
        </div>
      `).join('');
      
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
