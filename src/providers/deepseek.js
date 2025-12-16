import { BaseProvider } from './base.js';

/**
 * DeepSeek Provider
 * Cost-effective translations using DeepSeek Chat
 */
export class DeepSeekProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = 'https://api.deepseek.com/chat/completions';
    this.model = 'deepseek-chat';
  }

  static get displayName() {
    return 'DeepSeek';
  }

  static get id() {
    return 'deepseek';
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
      throw new Error(error.error?.message || 'DeepSeek API error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No translation returned';
  }
}
