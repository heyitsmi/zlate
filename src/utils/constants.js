/**
 * Shared constants for the AI Translator extension
 */

export const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', shortName: 'Auto' },
  { code: 'en', name: 'English', shortName: 'EN' },
  { code: 'id', name: 'Indonesian', shortName: 'ID' },
  { code: 'zh', name: 'Chinese', shortName: 'ZH' },
  { code: 'ja', name: 'Japanese', shortName: 'JA' },
  { code: 'ko', name: 'Korean', shortName: 'KO' },
  { code: 'es', name: 'Spanish', shortName: 'ES' },
  { code: 'fr', name: 'French', shortName: 'FR' },
  { code: 'de', name: 'German', shortName: 'DE' },
  { code: 'pt', name: 'Portuguese', shortName: 'PT' },
  { code: 'ru', name: 'Russian', shortName: 'RU' },
  { code: 'ar', name: 'Arabic', shortName: 'AR' },
  { code: 'hi', name: 'Hindi', shortName: 'HI' },
  { code: 'th', name: 'Thai', shortName: 'TH' },
  { code: 'vi', name: 'Vietnamese', shortName: 'VI' }
];

export const TONES = [
  { id: 'neutral', name: 'Neutral' },
  { id: 'formal', name: 'Formal' },
  { id: 'casual', name: 'Casual' },
  { id: 'friendly', name: 'Friendly' },
  { id: 'professional', name: 'Professional' },
  { id: 'academic', name: 'Academic' },
  { id: 'simple', name: 'Simple (Easy to understand)' }
];

export const PROVIDERS = [
  { id: 'gemini', name: 'Gemini', hint: 'Get from Google AI Studio' },
  { id: 'openai', name: 'OpenAI', hint: 'Get from platform.openai.com' },
  { id: 'deepseek', name: 'DeepSeek', hint: 'Get from platform.deepseek.com' },
  { id: 'claude', name: 'Claude', hint: 'Get from console.anthropic.com' },
  { id: 'groq', name: 'Groq (Free)', hint: 'Get from console.groq.com' }
];

export const DEFAULT_SETTINGS = {
  engine: 'gemini',
  sourceLang: 'auto',
  targetLang: 'en',
  tone: 'neutral',
  theme: 'light'
};

export const STORAGE_KEYS = {
  ENGINE: 'engine',
  API_KEYS: 'apiKeys',
  SOURCE_LANG: 'sourceLang',
  TARGET_LANG: 'targetLang',
  TONE: 'tone',
  THEME: 'theme',
  HISTORY: 'translationHistory'
};

export const MAX_HISTORY_ITEMS = 50;
