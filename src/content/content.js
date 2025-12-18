/**
 * Content Script
 * Handles text selection, tooltip display, and translation UI
 */
(() => {
  let tooltip = null;
  let selectedText = '';
  let currentTone = 'neutral';
  let isPremium = false;
  let cachedSettings = null;

  // Get browser API (Chrome/Firefox compatibility)
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  // Premium tones available
  const PREMIUM_TONES = [
    { id: 'neutral', name: 'Neutral' },
    { id: 'formal', name: 'Formal' },
    { id: 'casual', name: 'Casual' },
    { id: 'friendly', name: 'Friendly' },
    { id: 'professional', name: 'Professional' },
    { id: 'academic', name: 'Academic' },
    { id: 'simple', name: 'Simple' }
  ];

  // Check premium status
  async function checkPremiumStatus() {
    const result = await browserAPI.storage.local.get(['licenseStatus']);
    isPremium = result.licenseStatus?.isPremium === true;
    return isPremium;
  }

  async function createTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.id = 'ai-translator-tooltip';
    
    const settings = await browserAPI.storage.local.get(['theme']);
    if (settings.theme === 'dark') {
      tooltip.classList.add('dark');
    }
    
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function removeTooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  function positionTooltip(x, y) {
    if (!tooltip) return;
    const rect = tooltip.getBoundingClientRect();
    let left = x;
    let top = y + 10;
    
    if (left + rect.width > window.innerWidth) {
      left = window.innerWidth - rect.width - 10;
    }
    if (top + rect.height > window.innerHeight + window.scrollY) {
      top = y - rect.height - 10;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  async function showTranslateButton(x, y) {
    const tip = await createTooltip();
    tip.innerHTML = `
      <button class="ai-translator-btn" id="ai-translate-btn">
        <span>🌐</span>
        <span>Translate</span>
        <span class="shortcut-hint">Ctrl+Shift+T</span>
      </button>
    `;
    positionTooltip(x, y);
    document.getElementById('ai-translate-btn').addEventListener('click', handleTranslate);
  }

  async function showLoading() {
    const tip = await createTooltip();
    tip.innerHTML = `
      <button class="ai-translator-btn loading">
        <div class="ai-translator-spinner"></div>
        <span>Translating...</span>
      </button>
    `;
  }

  async function showResult(translation, isError = false) {
    const tip = await createTooltip();
    await checkPremiumStatus();
    
    // Build tone tabs HTML for premium users
    const toneTabsHtml = isPremium ? `
      <div class="ai-translator-tones">
        ${PREMIUM_TONES.map(tone => `
          <button class="ai-translator-tone-btn ${tone.id === currentTone ? 'active' : ''}" data-tone="${tone.id}">
            ${tone.name}
          </button>
        `).join('')}
      </div>
    ` : '';
    
    tip.innerHTML = `
      <div class="ai-translator-result">
        <div class="ai-translator-result-header">
          <span class="ai-translator-result-title">Translation</span>
          <button class="ai-translator-close">&times;</button>
        </div>
        <div class="ai-translator-text ${isError ? 'ai-translator-error' : ''}">${escapeHtml(translation)}</div>
        ${!isError ? toneTabsHtml : ''}
        ${!isError ? '<button class="ai-translator-copy">Copy to clipboard</button>' : ''}
      </div>
    `;
    
    tip.querySelector('.ai-translator-close').addEventListener('click', removeTooltip);
    
    const copyBtn = tip.querySelector('.ai-translator-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(translation);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy to clipboard', 2000);
      });
    }
    
    // Add tone tab click handlers for premium users
    if (isPremium) {
      tip.querySelectorAll('.ai-translator-tone-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const newTone = e.target.dataset.tone;
          if (newTone !== currentTone) {
            currentTone = newTone;
            // Update active state
            tip.querySelectorAll('.ai-translator-tone-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            // Re-translate with new tone
            await handleTranslateWithTone(newTone);
          }
        });
      });
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function saveToHistory(original, translation, engine, sourceLang, targetLang) {
    const result = await browserAPI.storage.local.get(['translationHistory']);
    const history = result.translationHistory || [];
    
    history.unshift({
      id: Date.now(),
      original,
      translation,
      engine,
      sourceLang,
      targetLang,
      timestamp: new Date().toISOString()
    });
    
    if (history.length > 50) history.pop();
    await browserAPI.storage.local.set({ translationHistory: history });
  }

  async function handleTranslate() {
    if (!selectedText) return;
    
    showLoading();
    
    try {
      const settings = await browserAPI.storage.local.get([
        'engine', 'apiKeys', 'sourceLang', 'targetLang', 'tone'
      ]);
      cachedSettings = settings;
      currentTone = settings.tone || 'neutral';
      
      if (!settings.engine || !settings.apiKeys || !settings.apiKeys[settings.engine]) {
        showResult('Please configure your API key in the extension settings.', true);
        return;
      }
      
      const response = await browserAPI.runtime.sendMessage({
        action: 'translate',
        text: selectedText,
        engine: settings.engine,
        apiKey: settings.apiKeys[settings.engine],
        sourceLang: settings.sourceLang || 'auto',
        targetLang: settings.targetLang || 'en',
        tone: currentTone
      });
      
      if (response.success) {
        showResult(response.translation);
        await saveToHistory(
          selectedText,
          response.translation,
          settings.engine,
          settings.sourceLang || 'auto',
          settings.targetLang || 'en'
        );
      } else {
        showResult(response.error || 'Translation failed', true);
      }
    } catch (error) {
      showResult(error.message || 'Translation failed. Please try again.', true);
    }
  }

  async function handleTranslateWithTone(tone) {
    if (!selectedText || !cachedSettings) return;
    
    // Show loading in the text area only
    const textEl = tooltip?.querySelector('.ai-translator-text');
    if (textEl) {
      textEl.innerHTML = '<div class="ai-translator-spinner-inline"></div> Translating...';
    }
    
    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'translate',
        text: selectedText,
        engine: cachedSettings.engine,
        apiKey: cachedSettings.apiKeys[cachedSettings.engine],
        sourceLang: cachedSettings.sourceLang || 'auto',
        targetLang: cachedSettings.targetLang || 'en',
        tone: tone
      });
      
      if (response.success && textEl) {
        textEl.textContent = response.translation;
        textEl.classList.remove('ai-translator-error');
        
        // Update copy button to copy new translation
        const copyBtn = tooltip?.querySelector('.ai-translator-copy');
        if (copyBtn) {
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(response.translation);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy to clipboard', 2000);
          };
        }
      } else if (textEl) {
        textEl.textContent = response.error || 'Translation failed';
        textEl.classList.add('ai-translator-error');
      }
    } catch (error) {
      if (textEl) {
        textEl.textContent = error.message || 'Translation failed';
        textEl.classList.add('ai-translator-error');
      }
    }
  }

  // Keyboard shortcut: Ctrl+Shift+T
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 0) {
        selectedText = text;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        removeTooltip();
        handleTranslate().then(() => {
          if (tooltip) {
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
          }
        });
      }
    }
  });

  // Text selection handler
  document.addEventListener('mouseup', (e) => {
    if (e.target.closest('#ai-translator-tooltip')) return;
    
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0) {
      selectedText = text;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const hasResultTooltip = tooltip?.querySelector('.ai-translator-result');
      if (!hasResultTooltip) {
        showTranslateButton(rect.left + window.scrollX, rect.bottom + window.scrollY);
      }
    }
  });



  // Context menu translate handler
  browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'contextMenuTranslate' && request.text) {
      selectedText = request.text;
      removeTooltip();
      
      const x = window.innerWidth / 2 - 100 + window.scrollX;
      const y = window.innerHeight / 2 - 50 + window.scrollY;
      
      handleTranslate().then(() => {
        if (tooltip) {
          tooltip.style.left = `${x}px`;
          tooltip.style.top = `${y}px`;
        }
      });
    }
  });
})();
