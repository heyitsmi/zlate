import { BaseProvider } from './base.js';

/**
 * Anthropic Claude Provider
 * High-quality nuanced translations using Claude
 */
export class ClaudeProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-3-5-haiku-latest';
  }

  static get displayName() {
    return 'Claude';
  }

  static get id() {
    return 'claude';
  }

  async translate(text, sourceLang, targetLang, tone) {
    const prompt = this.buildPrompt(text, sourceLang, targetLang, tone);
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'No translation returned';
  }
}
