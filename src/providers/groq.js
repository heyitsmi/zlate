import { BaseProvider } from './base.js';

/**
 * Groq Provider
 * Ultra-fast translations using Groq LPU with Llama models
 * Free tier available with generous limits
 */
export class GroqProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.3-70b-versatile';
  }

  static get displayName() {
    return 'Groq';
  }

  static get id() {
    return 'groq';
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
      throw new Error(error.error?.message || 'Groq API error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No translation returned';
  }
}
