/**
 * Base AI Provider - Abstract class for all AI translation providers
 * Implements Strategy Pattern for easy provider switching
 */
export class BaseProvider {
  constructor(apiKey) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider is abstract and cannot be instantiated directly');
    }
    this.apiKey = apiKey;
  }

  /**
   * Build translation prompt with tone instructions
   */
  buildPrompt(text, sourceLang, targetLang, tone) {
    const langNames = {
      auto: 'auto-detect', en: 'English', id: 'Indonesian', zh: 'Chinese',
      ja: 'Japanese', ko: 'Korean', es: 'Spanish', fr: 'French',
      de: 'German', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic',
      hi: 'Hindi', th: 'Thai', vi: 'Vietnamese'
    };

    const toneInstructions = {
      neutral: '',
      formal: 'Use formal and polite language.',
      casual: 'Use casual and relaxed language.',
      friendly: 'Use warm and friendly language.',
      professional: 'Use professional business language.',
      academic: 'Use academic and scholarly language.',
      simple: 'Use simple words that are easy to understand.'
    };

    const sourceLabel = sourceLang === 'auto' ? '' : `from ${langNames[sourceLang]} `;
    const toneLabel = tone && tone !== 'neutral' ? ` ${toneInstructions[tone]}` : '';
    
    return `Translate the following text ${sourceLabel}to ${langNames[targetLang]}.${toneLabel} Only respond with the translation, nothing else:\n\n${text}`;
  }

  /**
   * Translate text - must be implemented by subclasses
   */
  async translate(text, sourceLang, targetLang, tone) {
    throw new Error("Method 'translate' must be implemented by subclass");
  }

  /**
   * Get provider display name
   */
  static get displayName() {
    throw new Error("Static getter 'displayName' must be implemented by subclass");
  }
}
