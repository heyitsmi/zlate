/**
 * Property-Based Tests for History Manager
 * Tests for translation history storage and limit enforcement
 * 
 * Uses fast-check for property-based testing as specified in design.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { HistoryManager } from './history.js';
import { FREE_HISTORY_LIMIT } from './constants.js';

/**
 * Arbitrary generator for translation input data
 */
const translationInputArb = fc.record({
  original: fc.string({ minLength: 1, maxLength: 500 }),
  translation: fc.string({ minLength: 1, maxLength: 500 }),
  sourceLang: fc.constantFrom('en', 'id', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'auto'),
  targetLang: fc.constantFrom('en', 'id', 'zh', 'ja', 'ko', 'es', 'fr', 'de'),
  engine: fc.constantFrom('gemini', 'deepseek', 'openai', 'claude', 'groq'),
  tone: fc.constantFrom('neutral', 'formal', 'casual', 'friendly', 'professional', 'academic', 'simple')
});

describe('Freemium History Limit Properties', () => {
  /**
   * **Feature: freemium-license-system, Property 5: Freemium History Limit Enforcement**
   * 
   * *For any* sequence of N translations where N > 5 performed by a freemium user,
   * the stored history SHALL contain exactly 5 items (the most recent ones).
   * 
   * **Validates: Requirements 4.2, 4.3**
   */
  it('Property 5: Freemium history never exceeds 5 items', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of translations with more than FREE_HISTORY_LIMIT items
        fc.array(translationInputArb, { minLength: FREE_HISTORY_LIMIT + 1, maxLength: 20 }),
        async (translations) => {
          const manager = new HistoryManager();
          // Ensure freemium status
          await manager.setPremiumStatus(false);
          await manager.clearHistory();
          
          // Add all translations
          for (const translation of translations) {
            await manager.addTranslation(translation);
          }
          
          // Get history
          const history = await manager.getHistory();
          
          // Property assertions:
          // 1. History length should be exactly FREE_HISTORY_LIMIT
          expect(history.length).toBe(FREE_HISTORY_LIMIT);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 5: Freemium History Limit Enforcement**
   * 
   * Additional test: History contains the most recent translations
   * 
   * **Validates: Requirements 4.2, 4.3**
   */
  it('Property 5: Freemium history contains the most recent translations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of translations with more than FREE_HISTORY_LIMIT items
        fc.array(translationInputArb, { minLength: FREE_HISTORY_LIMIT + 1, maxLength: 15 }),
        async (translations) => {
          const manager = new HistoryManager();
          await manager.setPremiumStatus(false);
          await manager.clearHistory();
          
          // Add all translations
          for (const translation of translations) {
            await manager.addTranslation(translation);
          }
          
          const history = await manager.getHistory();
          
          // Property assertions:
          // 1. History should contain the last FREE_HISTORY_LIMIT translations
          const expectedTranslations = translations.slice(-FREE_HISTORY_LIMIT).reverse();
          
          for (let i = 0; i < FREE_HISTORY_LIMIT; i++) {
            expect(history[i].original).toBe(expectedTranslations[i].original);
            expect(history[i].translation).toBe(expectedTranslations[i].translation);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 5: Freemium History Limit Enforcement**
   * 
   * Test: Adding exactly FREE_HISTORY_LIMIT items results in exactly that many items
   * 
   * **Validates: Requirements 4.2, 4.3**
   */
  it('Property 5: Adding exactly 5 items results in 5 items in history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(translationInputArb, { minLength: FREE_HISTORY_LIMIT, maxLength: FREE_HISTORY_LIMIT }),
        async (translations) => {
          const manager = new HistoryManager();
          await manager.setPremiumStatus(false);
          await manager.clearHistory();
          
          for (const translation of translations) {
            await manager.addTranslation(translation);
          }
          
          const history = await manager.getHistory();
          
          expect(history.length).toBe(FREE_HISTORY_LIMIT);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Premium History Properties', () => {
  /**
   * **Feature: freemium-license-system, Property 6: Premium History Has No Limit**
   * 
   * *For any* sequence of N translations performed by a premium user,
   * the stored history SHALL contain all N items.
   * 
   * **Validates: Requirements 5.3**
   */
  it('Property 6: Premium history stores all translations without limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of translations (more than freemium limit)
        fc.array(translationInputArb, { minLength: FREE_HISTORY_LIMIT + 1, maxLength: 25 }),
        async (translations) => {
          const manager = new HistoryManager();
          // Set premium status
          await manager.setPremiumStatus(true);
          await manager.clearHistory();
          
          // Add all translations
          for (const translation of translations) {
            await manager.addTranslation(translation);
          }
          
          // Get history
          const history = await manager.getHistory();
          
          // Property assertions:
          // 1. History length should equal the number of translations added
          expect(history.length).toBe(translations.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 6: Premium History Has No Limit**
   * 
   * Additional test: Premium history preserves all translation data
   * 
   * **Validates: Requirements 5.3**
   */
  it('Property 6: Premium history preserves all translation content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(translationInputArb, { minLength: 1, maxLength: 15 }),
        async (translations) => {
          const manager = new HistoryManager();
          await manager.setPremiumStatus(true);
          await manager.clearHistory();
          
          for (const translation of translations) {
            await manager.addTranslation(translation);
          }
          
          const history = await manager.getHistory();
          
          // Property assertions:
          // All translations should be present (in reverse order - most recent first)
          const reversedTranslations = [...translations].reverse();
          
          for (let i = 0; i < translations.length; i++) {
            expect(history[i].original).toBe(reversedTranslations[i].original);
            expect(history[i].translation).toBe(reversedTranslations[i].translation);
            expect(history[i].sourceLang).toBe(reversedTranslations[i].sourceLang);
            expect(history[i].targetLang).toBe(reversedTranslations[i].targetLang);
            expect(history[i].engine).toBe(reversedTranslations[i].engine);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 6: Premium History Has No Limit**
   * 
   * Test: Premium users can store significantly more than freemium limit
   * 
   * **Validates: Requirements 5.3**
   */
  it('Property 6: Premium can store many more items than freemium limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a count significantly larger than FREE_HISTORY_LIMIT
        fc.integer({ min: FREE_HISTORY_LIMIT * 2, max: FREE_HISTORY_LIMIT * 4 }),
        async (count) => {
          const manager = new HistoryManager();
          await manager.setPremiumStatus(true);
          await manager.clearHistory();
          
          // Add 'count' translations
          for (let i = 0; i < count; i++) {
            await manager.addTranslation({
              original: `Original text ${i}`,
              translation: `Translated text ${i}`,
              sourceLang: 'en',
              targetLang: 'id',
              engine: 'gemini',
              tone: 'neutral'
            });
          }
          
          const history = await manager.getHistory();
          
          // Property assertion: All items should be stored
          expect(history.length).toBe(count);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Translation Storage Round-Trip Properties', () => {
  /**
   * **Feature: freemium-license-system, Property 7: Translation Storage Round-Trip**
   * 
   * *For any* translation performed, retrieving the history SHALL return an item
   * with matching original text, translated text, source language, target language,
   * engine, and tone.
   * 
   * **Validates: Requirements 4.1, 5.1**
   */
  it('Property 7: Translation data is preserved through storage round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        translationInputArb,
        fc.boolean(), // isPremium
        async (translation, isPremium) => {
          const manager = new HistoryManager();
          await manager.setPremiumStatus(isPremium);
          await manager.clearHistory();
          
          // Add translation
          const addedItem = await manager.addTranslation(translation);
          
          // Retrieve history
          const history = await manager.getHistory();
          
          // Find the added item in history
          const retrievedItem = history.find(item => item.id === addedItem.id);
          
          // Property assertions:
          // 1. Item should exist in history
          expect(retrievedItem).toBeDefined();
          
          // 2. All fields should match
          expect(retrievedItem.original).toBe(translation.original);
          expect(retrievedItem.translation).toBe(translation.translation);
          expect(retrievedItem.sourceLang).toBe(translation.sourceLang);
          expect(retrievedItem.targetLang).toBe(translation.targetLang);
          expect(retrievedItem.engine).toBe(translation.engine);
          expect(retrievedItem.tone).toBe(translation.tone);
          
          // 3. Generated fields should be present
          expect(retrievedItem.id).toBeDefined();
          expect(retrievedItem.timestamp).toBeDefined();
          expect(typeof retrievedItem.synced).toBe('boolean');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 7: Translation Storage Round-Trip**
   * 
   * Additional test: Multiple translations preserve order and content
   * 
   * **Validates: Requirements 4.1, 5.1**
   */
  it('Property 7: Multiple translations preserve content through round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(translationInputArb, { minLength: 1, maxLength: FREE_HISTORY_LIMIT }),
        async (translations) => {
          const manager = new HistoryManager();
          await manager.setPremiumStatus(false); // Use freemium to stay within limit
          await manager.clearHistory();
          
          // Add all translations
          for (const translation of translations) {
            await manager.addTranslation(translation);
          }
          
          // Retrieve history
          const history = await manager.getHistory();
          
          // Property assertions:
          // History should be in reverse order (most recent first)
          const reversedTranslations = [...translations].reverse();
          
          for (let i = 0; i < translations.length; i++) {
            expect(history[i].original).toBe(reversedTranslations[i].original);
            expect(history[i].translation).toBe(reversedTranslations[i].translation);
            expect(history[i].sourceLang).toBe(reversedTranslations[i].sourceLang);
            expect(history[i].targetLang).toBe(reversedTranslations[i].targetLang);
            expect(history[i].engine).toBe(reversedTranslations[i].engine);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 7: Translation Storage Round-Trip**
   * 
   * Test: Default tone is applied when not specified
   * 
   * **Validates: Requirements 4.1, 5.1**
   */
  it('Property 7: Default tone is applied when not specified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          original: fc.string({ minLength: 1, maxLength: 100 }),
          translation: fc.string({ minLength: 1, maxLength: 100 }),
          sourceLang: fc.constantFrom('en', 'id', 'zh'),
          targetLang: fc.constantFrom('en', 'id', 'zh'),
          engine: fc.constantFrom('gemini', 'deepseek')
          // Note: tone is intentionally omitted
        }),
        async (translationWithoutTone) => {
          const manager = new HistoryManager();
          await manager.setPremiumStatus(false);
          await manager.clearHistory();
          
          // Add translation without tone
          await manager.addTranslation(translationWithoutTone);
          
          // Retrieve history
          const history = await manager.getHistory();
          
          // Property assertion: Default tone should be 'neutral'
          expect(history[0].tone).toBe('neutral');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
