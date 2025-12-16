import { BaseProvider } from './base.js';

/**
 * OpenAI Provider
 * Uses GPT-4o-mini for high-quality translations
 */
export class OpenAIProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-4o-mini';
  }

  static get displayName() {
    return 'OpenAI';
  }

  static get id() {
    return 'openai';
  }

  async translate(text, sourceLang, targetLang, tone) {
    const prompt = this.buildPrompt(text, sourceLang, targetLang, tone);
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No translation returned';
  }
}
