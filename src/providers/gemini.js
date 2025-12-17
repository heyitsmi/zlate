import { BaseProvider } from './base.js';

/**
 * Google Gemini AI Provider
 * Uses Gemini 2.0 Flash for fast translations
 */
export class GeminiProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  }

  static get displayName() {
    return 'Gemini';
  }

  static get id() {
    return 'gemini';
  }

  async translate(text, sourceLang, targetLang, tone) {
    const prompt = this.buildPrompt(text, sourceLang, targetLang, tone);
    
    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No translation returned';
  }
}
