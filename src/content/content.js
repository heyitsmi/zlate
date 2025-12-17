/**
 * Content Script
 * Handles text selection, tooltip display, and translation UI
 */
(() => {
  let tooltip = null;
  let selectedText = '';

  // Get browser API (Chrome/Firefox compatibility)
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

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
    tip.innerHTML = `
      <div class="ai-translator-result">
        <div class="ai-translator-result-header">
          <span class="ai-translator-result-title">Translation</span>
          <button class="ai-translator-close">&times;</button>
        </div>
        <div class="ai-translator-text ${isError ? 'ai-translator-error' : ''}">${escapeHtml(translation)}</div>
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
        tone: settings.tone || 'neutral'
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
      showTranslateButton(rect.left + window.scrollX, rect.bottom + window.scrollY);
    } else {
      setTimeout(() => {
        if (!document.querySelector('#ai-translator-tooltip:hover')) {
          removeTooltip();
        }
      }, 100);
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#ai-translator-tooltip')) {
      removeTooltip();
    }
  });

  document.addEventListener('scroll', removeTooltip);

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
