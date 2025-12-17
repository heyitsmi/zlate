/**
 * Property-Based Tests for Feature Gate
 * Tests for feature gating based on license status
 * 
 * Uses fast-check for property-based testing as specified in design.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { FeatureGate } from './featureGate.js';
import {
  FREE_PROVIDERS,
  PREMIUM_PROVIDERS,
  FREE_TONES,
  PREMIUM_TONES,
  PROVIDERS,
  TONES
} from './constants.js';

// Mock license manager for testing
const createMockLicenseManager = (isPremium = false) => ({
  _cachedStatus: { isPremium }
});

describe('Feature Gate Properties', () => {
  /**
   * **Feature: freemium-license-system, Property 1: License Status Determines Feature Access**
   * 
   * *For any* license status (premium or freemium), the available providers and tones 
   * SHALL match the expected set for that status.
   * 
   * - Freemium: providers = [gemini, deepseek], tones = [neutral]
   * - Premium: providers = [gemini, deepseek, openai, claude, groq], tones = all 7 tones
   * 
   * **Validates: Requirements 2.1, 2.3, 3.1, 3.3**
   */
  it('Property 1: Freemium users get only free providers available', () => {
    fc.assert(
      fc.property(
        // Generate any provider ID from the full list
        fc.constantFrom(...PROVIDERS.map(p => p.id)),
        (providerId) => {
          const mockLicenseManager = createMockLicenseManager(false);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const providers = featureGate.getAvailableProviders(false);
          const provider = providers.find(p => p.id === providerId);
          
          // Property assertions:
          // 1. Provider should exist in the list
          expect(provider).toBeDefined();
          
          // 2. Free providers should be available
          if (FREE_PROVIDERS.includes(providerId)) {
            expect(provider.available).toBe(true);
            expect(provider.isPremium).toBe(false);
          }
          
          // 3. Premium providers should NOT be available for freemium users
          if (PREMIUM_PROVIDERS.includes(providerId)) {
            expect(provider.available).toBe(false);
            expect(provider.isPremium).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Premium users get all providers available', () => {
    fc.assert(
      fc.property(
        // Generate any provider ID from the full list
        fc.constantFrom(...PROVIDERS.map(p => p.id)),
        (providerId) => {
          const mockLicenseManager = createMockLicenseManager(true);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const providers = featureGate.getAvailableProviders(true);
          const provider = providers.find(p => p.id === providerId);
          
          // Property assertions:
          // 1. Provider should exist in the list
          expect(provider).toBeDefined();
          
          // 2. ALL providers should be available for premium users
          expect(provider.available).toBe(true);
          
          // 3. isPremium flag should still correctly identify premium-only providers
          if (PREMIUM_PROVIDERS.includes(providerId)) {
            expect(provider.isPremium).toBe(true);
          } else {
            expect(provider.isPremium).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Freemium users get only neutral tone available', () => {
    fc.assert(
      fc.property(
        // Generate any tone ID from the full list
        fc.constantFrom(...TONES.map(t => t.id)),
        (toneId) => {
          const mockLicenseManager = createMockLicenseManager(false);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const tones = featureGate.getAvailableTones(false);
          const tone = tones.find(t => t.id === toneId);
          
          // Property assertions:
          // 1. Tone should exist in the list
          expect(tone).toBeDefined();
          
          // 2. Free tones (neutral) should be available
          if (FREE_TONES.includes(toneId)) {
            expect(tone.available).toBe(true);
            expect(tone.isPremium).toBe(false);
          }
          
          // 3. Premium tones should NOT be available for freemium users
          if (PREMIUM_TONES.includes(toneId)) {
            expect(tone.available).toBe(false);
            expect(tone.isPremium).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Premium users get all tones available', () => {
    fc.assert(
      fc.property(
        // Generate any tone ID from the full list
        fc.constantFrom(...TONES.map(t => t.id)),
        (toneId) => {
          const mockLicenseManager = createMockLicenseManager(true);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const tones = featureGate.getAvailableTones(true);
          const tone = tones.find(t => t.id === toneId);
          
          // Property assertions:
          // 1. Tone should exist in the list
          expect(tone).toBeDefined();
          
          // 2. ALL tones should be available for premium users
          expect(tone.available).toBe(true);
          
          // 3. isPremium flag should still correctly identify premium-only tones
          if (PREMIUM_TONES.includes(toneId)) {
            expect(tone.isPremium).toBe(true);
          } else {
            expect(tone.isPremium).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Available providers count matches expected for license status', () => {
    fc.assert(
      fc.property(
        // Generate boolean for isPremium status
        fc.boolean(),
        (isPremium) => {
          const mockLicenseManager = createMockLicenseManager(isPremium);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const providers = featureGate.getAvailableProviders(isPremium);
          const availableProviders = providers.filter(p => p.available);
          
          // Property assertions:
          if (isPremium) {
            // Premium users should have all providers available
            expect(availableProviders.length).toBe(PROVIDERS.length);
            expect(availableProviders.length).toBe(FREE_PROVIDERS.length + PREMIUM_PROVIDERS.length);
          } else {
            // Freemium users should only have free providers available
            expect(availableProviders.length).toBe(FREE_PROVIDERS.length);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Available tones count matches expected for license status', () => {
    fc.assert(
      fc.property(
        // Generate boolean for isPremium status
        fc.boolean(),
        (isPremium) => {
          const mockLicenseManager = createMockLicenseManager(isPremium);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const tones = featureGate.getAvailableTones(isPremium);
          const availableTones = tones.filter(t => t.available);
          
          // Property assertions:
          if (isPremium) {
            // Premium users should have all tones available
            expect(availableTones.length).toBe(TONES.length);
            expect(availableTones.length).toBe(FREE_TONES.length + PREMIUM_TONES.length);
          } else {
            // Freemium users should only have free tones available
            expect(availableTones.length).toBe(FREE_TONES.length);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Freemium available providers are exactly the free providers set', () => {
    fc.assert(
      fc.property(
        fc.constant(false), // Always freemium for this test
        (isPremium) => {
          const mockLicenseManager = createMockLicenseManager(isPremium);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const providers = featureGate.getAvailableProviders(isPremium);
          const availableProviderIds = providers
            .filter(p => p.available)
            .map(p => p.id)
            .sort();
          
          const expectedFreeProviders = [...FREE_PROVIDERS].sort();
          
          // Property assertion: Available providers should exactly match FREE_PROVIDERS
          expect(availableProviderIds).toEqual(expectedFreeProviders);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Freemium available tones are exactly the free tones set', () => {
    fc.assert(
      fc.property(
        fc.constant(false), // Always freemium for this test
        (isPremium) => {
          const mockLicenseManager = createMockLicenseManager(isPremium);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const tones = featureGate.getAvailableTones(isPremium);
          const availableToneIds = tones
            .filter(t => t.available)
            .map(t => t.id)
            .sort();
          
          const expectedFreeTones = [...FREE_TONES].sort();
          
          // Property assertion: Available tones should exactly match FREE_TONES
          expect(availableToneIds).toEqual(expectedFreeTones);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Premium available providers include all providers', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // Always premium for this test
        (isPremium) => {
          const mockLicenseManager = createMockLicenseManager(isPremium);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const providers = featureGate.getAvailableProviders(isPremium);
          const availableProviderIds = providers
            .filter(p => p.available)
            .map(p => p.id)
            .sort();
          
          const allProviderIds = PROVIDERS.map(p => p.id).sort();
          
          // Property assertion: Available providers should include all providers
          expect(availableProviderIds).toEqual(allProviderIds);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Premium available tones include all tones', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // Always premium for this test
        (isPremium) => {
          const mockLicenseManager = createMockLicenseManager(isPremium);
          const featureGate = new FeatureGate(mockLicenseManager);
          
          const tones = featureGate.getAvailableTones(isPremium);
          const availableToneIds = tones
            .filter(t => t.available)
            .map(t => t.id)
            .sort();
          
          const allToneIds = TONES.map(t => t.id).sort();
          
          // Property assertion: Available tones should include all tones
          expect(availableToneIds).toEqual(allToneIds);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
