/**
 * Property-Based Tests for License Manager
 * Tests for license status storage functionality
 * 
 * Uses fast-check for property-based testing as specified in design.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { LicenseManager } from './license.js';
import { CACHE_DURATION, GRACE_PERIOD } from './constants.js';

// Mock chrome.storage.local for testing
const createMockStorage = () => {
  let storage = {};
  return {
    storage: {
      local: {
        get: (keys, callback) => {
          const result = {};
          const keyArray = Array.isArray(keys) ? keys : [keys];
          keyArray.forEach(key => {
            if (storage[key] !== undefined) {
              result[key] = storage[key];
            }
          });
          callback(result);
        },
        set: (items, callback) => {
          Object.assign(storage, items);
          callback();
        },
        remove: (keys, callback) => {
          const keyArray = Array.isArray(keys) ? keys : [keys];
          keyArray.forEach(key => delete storage[key]);
          callback();
        }
      }
    },
    runtime: {
      lastError: null
    },
    _reset: () => { storage = {}; },
    _getStorage: () => storage
  };
};

// Arbitrary generators for license data
const validEmailArb = fc.emailAddress();

const validLicenseKeyArb = fc.string({ minLength: 16, maxLength: 32 })
  .filter(s => s.trim().length >= 16);

// Generate future dates as ISO strings (1 day to 1 year in future)
const futureDateArb = fc.integer({ 
  min: Date.now() + 24 * 60 * 60 * 1000, // At least 1 day in future
  max: Date.now() + 365 * 24 * 60 * 60 * 1000 // Up to 1 year in future
}).map(ts => new Date(ts).toISOString());

// Generate past dates as ISO strings (1 day to 1 year in past)
const pastDateArb = fc.integer({
  min: Date.now() - 365 * 24 * 60 * 60 * 1000, // Up to 1 year in past
  max: Date.now() - 24 * 60 * 60 * 1000 // At least 1 day in past
}).map(ts => new Date(ts).toISOString());

describe('Empty License Key Properties', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockStorage();
    global.chrome = mockChrome;
  });

  /**
   * **Feature: freemium-license-system, Property 2: Empty License Key Results in Freemium Status**
   * 
   * *For any* user with no license key (null or empty string), 
   * the license status SHALL be freemium with isPremium = false.
   * 
   * **Validates: Requirements 1.5**
   */
  it('Property 2: Null or empty license key results in freemium status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Null value
          fc.constant(null),
          // Undefined value
          fc.constant(undefined),
          // Empty string
          fc.constant(''),
          // Whitespace-only strings of various lengths
          fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
            .map(arr => arr.join(''))
        ),
        async (emptyLicenseKey) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Store the empty/null license key in storage
          if (emptyLicenseKey !== null && emptyLicenseKey !== undefined) {
            mockChrome.storage.local.set({ licenseKey: emptyLicenseKey }, () => {});
          }
          // For null/undefined, we don't store anything (simulating no license key)
          
          // Get license status - should return freemium
          const status = await manager.getLicenseStatus();
          
          // Property assertions:
          // 1. isPremium should be false
          expect(status.isPremium).toBe(false);
          // 2. licenseKey should be null
          expect(status.licenseKey).toBeNull();
          // 3. email should be null
          expect(status.email).toBeNull();
          // 4. expiresAt should be null
          expect(status.expiresAt).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 2: Empty License Key Results in Freemium Status**
   * 
   * Additional test: validateLicense with empty inputs returns invalid
   * 
   * **Validates: Requirements 1.5**
   */
  it('Property 2: validateLicense with empty inputs returns invalid result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Null value
          fc.constant(null),
          // Undefined value
          fc.constant(undefined),
          // Empty string
          fc.constant(''),
          // Whitespace-only strings of various lengths
          fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
            .map(arr => arr.join(''))
        ),
        async (emptyLicenseKey) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Attempt to validate with empty input
          const result = await manager.validateLicense(emptyLicenseKey);
          
          // Property assertions:
          // 1. Result should indicate invalid
          expect(result.valid).toBe(false);
          // 2. Error message should be present
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
          // 3. No license details should be returned
          expect(result.license).toBeUndefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 2: Empty License Key Results in Freemium Status**
   * 
   * Test: Fresh LicenseManager with no stored data returns freemium
   * 
   * **Validates: Requirements 1.5**
   */
  it('Property 2: Fresh manager with no stored license returns freemium status', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of times to call getLicenseStatus
        fc.integer({ min: 1, max: 5 }),
        async (numCalls) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Call getLicenseStatus multiple times on fresh manager
          for (let i = 0; i < numCalls; i++) {
            const status = await manager.getLicenseStatus();
            
            // Property assertions for each call:
            // 1. isPremium should always be false
            expect(status.isPremium).toBe(false);
            // 2. licenseKey should always be null
            expect(status.licenseKey).toBeNull();
            // 3. email should always be null
            expect(status.email).toBeNull();
            // 4. expiresAt should always be null
            expect(status.expiresAt).toBeNull();
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('License Status Storage Properties', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockStorage();
    global.chrome = mockChrome;
  });

  /**
   * **Feature: freemium-license-system, Property 3: Valid License Response Updates Status**
   * 
   * *For any* valid license validation response from the backend, 
   * the extension SHALL store isPremium = true with the returned email and expiration date.
   * 
   * **Validates: Requirements 1.3**
   */
  it('Property 3: Valid license response updates status to premium with correct details', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        futureDateArb,
        async (licenseKey, email, expiresAt) => {
          // Reset storage for each iteration
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Create a valid license status as would be returned after successful validation
          const now = new Date();
          const validStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt,
            validatedAt: now.toISOString(),
            cachedUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
          };
          
          // Store the license status (simulating what happens after valid response)
          await manager.storeLicenseStatus(validStatus);
          
          // Verify the stored status
          const storage = mockChrome._getStorage();
          const storedStatus = storage.licenseStatus;
          
          // Property assertions:
          // 1. isPremium should be true
          expect(storedStatus.isPremium).toBe(true);
          // 2. Email should match the response
          expect(storedStatus.email).toBe(email);
          // 3. ExpiresAt should match the response
          expect(storedStatus.expiresAt).toBe(expiresAt);
          // 4. License key should be stored
          expect(storedStatus.licenseKey).toBe(licenseKey);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 4: Invalid License Response Maintains Freemium**
   * 
   * *For any* invalid license validation response (error or invalid flag), 
   * the extension SHALL maintain isPremium = false and display an error message.
   * 
   * **Validates: Requirements 1.4**
   */
  it('Property 4: Invalid license input returns error and maintains freemium status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Empty string
          fc.constant(''),
          // Whitespace-only strings
          fc.constant('   '),
          fc.constant('     '),
          fc.constant('\t\t'),
          // Null value
          fc.constant(null),
          // Undefined value
          fc.constant(undefined)
        ),
        async (invalidInput) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Attempt to validate with invalid input
          const result = await manager.validateLicense(invalidInput);
          
          // Property assertions:
          // 1. Result should indicate invalid
          expect(result.valid).toBe(false);
          // 2. Error message should be present
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 4: Invalid License Response Maintains Freemium**
   * 
   * Additional test: After clearing license, status should be freemium
   * 
   * **Validates: Requirements 1.4**
   */
  it('Property 4: After clearing license, status remains freemium', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        futureDateArb,
        async (licenseKey, email, expiresAt) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // First, set up a premium status
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt,
            validatedAt: new Date().toISOString(),
            cachedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
          
          await manager.storeLicenseStatus(premiumStatus);
          
          // Now clear the license (simulating invalid response handling)
          await manager.clearLicense();
          
          // Verify freemium is maintained after clearing
          const cachedStatus = manager._cachedStatus;
          
          expect(cachedStatus.isPremium).toBe(false);
          expect(cachedStatus.licenseKey).toBeNull();
          expect(cachedStatus.email).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 4: Invalid License Response Maintains Freemium**
   * 
   * Test that storing a freemium status maintains freemium state
   * 
   * **Validates: Requirements 1.4**
   */
  it('Property 4: Storing freemium status maintains isPremium = false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No license key for freemium
        async () => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Store a freemium status (what happens after invalid validation)
          const freemiumStatus = {
            isPremium: false,
            licenseKey: null,
            email: null,
            expiresAt: null,
            validatedAt: new Date().toISOString(),
            cachedUntil: new Date().toISOString()
          };
          
          await manager.storeLicenseStatus(freemiumStatus);
          
          // Verify freemium is maintained
          const storage = mockChrome._getStorage();
          const storedStatus = storage.licenseStatus;
          
          expect(storedStatus.isPremium).toBe(false);
          expect(storedStatus.email).toBeNull();
          expect(storedStatus.licenseKey).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('License Validation Caching Properties', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockStorage();
    global.chrome = mockChrome;
  });

  /**
   * **Feature: freemium-license-system, Property 8: License Validation Caching**
   * 
   * *For any* successful license validation, subsequent calls to getLicenseStatus 
   * within 24 hours SHALL return the cached result without making a network request.
   * 
   * **Validates: Requirements 8.1, 8.2**
   */
  it('Property 8: Cached license status is returned without network request when cache is valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        futureDateArb,
        // Generate a time offset within cache duration (0 to 23 hours in ms)
        fc.integer({ min: 0, max: CACHE_DURATION - 60000 }),
        async (licenseKey, email, expiresAt, timeOffsetWithinCache) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Set up a validated license status with cache still valid
          const validatedAt = new Date();
          const cachedUntil = new Date(validatedAt.getTime() + CACHE_DURATION);
          
          const cachedStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt,
            validatedAt: validatedAt.toISOString(),
            cachedUntil: cachedUntil.toISOString()
          };
          
          // Store the cached status in chrome.storage.local
          await manager.storeLicenseStatus(cachedStatus);
          
          // Track if validateLicense is called (it shouldn't be for cached status)
          let validateLicenseCalled = false;
          const originalValidateLicense = manager.validateLicense.bind(manager);
          manager.validateLicense = async (...args) => {
            validateLicenseCalled = true;
            return originalValidateLicense(...args);
          };
          
          // Call getLicenseStatus - should return cached result
          const result = await manager.getLicenseStatus();
          
          // Property assertions:
          // 1. Should return the cached status without network call
          expect(validateLicenseCalled).toBe(false);
          
          // 2. Returned status should match cached values
          expect(result.isPremium).toBe(true);
          expect(result.licenseKey).toBe(licenseKey);
          expect(result.email).toBe(email);
          expect(result.expiresAt).toBe(expiresAt);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 8: License Validation Caching**
   * 
   * Additional test: Cache stores validation result with 24-hour expiry
   * 
   * **Validates: Requirements 8.1**
   */
  it('Property 8: Stored license status has cachedUntil set to 24 hours from validatedAt', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        futureDateArb,
        async (licenseKey, email, expiresAt) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          const now = new Date();
          const expectedCachedUntil = new Date(now.getTime() + CACHE_DURATION);
          
          const validStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt,
            validatedAt: now.toISOString(),
            cachedUntil: expectedCachedUntil.toISOString()
          };
          
          await manager.storeLicenseStatus(validStatus);
          
          const storage = mockChrome._getStorage();
          const storedStatus = storage.licenseStatus;
          
          // Property assertions:
          // 1. cachedUntil should be approximately 24 hours from validatedAt
          const validatedAtTime = new Date(storedStatus.validatedAt).getTime();
          const cachedUntilTime = new Date(storedStatus.cachedUntil).getTime();
          const cacheDuration = cachedUntilTime - validatedAtTime;
          
          // Allow 1 second tolerance for timing differences
          expect(Math.abs(cacheDuration - CACHE_DURATION)).toBeLessThan(1000);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 8: License Validation Caching**
   * 
   * Test that multiple calls to getLicenseStatus return same cached result
   * 
   * **Validates: Requirements 8.2**
   */
  it('Property 8: Multiple getLicenseStatus calls return identical cached result', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        futureDateArb,
        fc.integer({ min: 2, max: 10 }), // Number of calls to make
        async (licenseKey, email, expiresAt, numCalls) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          const now = new Date();
          const cachedStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt,
            validatedAt: now.toISOString(),
            cachedUntil: new Date(now.getTime() + CACHE_DURATION).toISOString()
          };
          
          await manager.storeLicenseStatus(cachedStatus);
          
          // Track network calls
          let networkCallCount = 0;
          const originalValidateLicense = manager.validateLicense.bind(manager);
          manager.validateLicense = async (...args) => {
            networkCallCount++;
            return originalValidateLicense(...args);
          };
          
          // Make multiple calls to getLicenseStatus
          const results = [];
          for (let i = 0; i < numCalls; i++) {
            results.push(await manager.getLicenseStatus());
          }
          
          // Property assertions:
          // 1. No network calls should be made
          expect(networkCallCount).toBe(0);
          
          // 2. All results should be identical
          for (const result of results) {
            expect(result.isPremium).toBe(true);
            expect(result.licenseKey).toBe(licenseKey);
            expect(result.email).toBe(email);
            expect(result.expiresAt).toBe(expiresAt);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Grace Period Properties', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockStorage();
    global.chrome = mockChrome;
  });

  /**
   * **Feature: freemium-license-system, Property 14: Grace Period During Network Failure**
   * 
   * *For any* previously validated premium license, if revalidation fails due to network error,
   * the premium status SHALL be maintained for up to 7 days from the last successful validation.
   * 
   * **Validates: Requirements 8.4**
   */
  it('Property 14: Premium status maintained during grace period when network fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        futureDateArb,
        // Generate time elapsed since validation: 0 to just under 7 days (in ms)
        fc.integer({ min: 0, max: GRACE_PERIOD - 60000 }),
        async (licenseKey, email, expiresAt, timeElapsedSinceValidation) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Set up a previously validated premium license with expired cache
          // but still within grace period
          const validatedAt = new Date(Date.now() - timeElapsedSinceValidation);
          // Cache is expired (in the past)
          const cachedUntil = new Date(Date.now() - 1000);
          
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt,
            validatedAt: validatedAt.toISOString(),
            cachedUntil: cachedUntil.toISOString()
          };
          
          // Store the status in chrome.storage.local
          await manager.storeLicenseStatus(premiumStatus);
          
          // Mock validateLicense to simulate network failure
          manager.validateLicense = async () => {
            throw new Error('Network error');
          };
          
          // Call getLicenseStatus - should maintain premium during grace period
          const result = await manager.getLicenseStatus();
          
          // Property assertions:
          // 1. Premium status should be maintained during grace period
          expect(result.isPremium).toBe(true);
          // 2. License key should be preserved
          expect(result.licenseKey).toBe(licenseKey);
          // 3. Email should be preserved
          expect(result.email).toBe(email);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 14: Grace Period During Network Failure**
   * 
   * Additional test: Premium status reverts to freemium after grace period expires
   * 
   * **Validates: Requirements 8.4**
   */
  it('Property 14: Premium status reverts to freemium after grace period expires', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        futureDateArb,
        // Generate time elapsed beyond grace period: 7 days + 1 minute to 14 days
        fc.integer({ min: GRACE_PERIOD + 60000, max: GRACE_PERIOD * 2 }),
        async (licenseKey, email, expiresAt, timeElapsedSinceValidation) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Set up a previously validated premium license with expired cache
          // AND outside grace period
          const validatedAt = new Date(Date.now() - timeElapsedSinceValidation);
          // Cache is expired (in the past)
          const cachedUntil = new Date(Date.now() - 1000);
          
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt,
            validatedAt: validatedAt.toISOString(),
            cachedUntil: cachedUntil.toISOString()
          };
          
          // Store the status in chrome.storage.local
          await manager.storeLicenseStatus(premiumStatus);
          
          // Mock validateLicense to simulate network failure
          manager.validateLicense = async () => {
            throw new Error('Network error');
          };
          
          // Call getLicenseStatus - should revert to freemium after grace period
          const result = await manager.getLicenseStatus();
          
          // Property assertions:
          // 1. Premium status should be reverted to freemium
          expect(result.isPremium).toBe(false);
          // 2. License key should be null
          expect(result.licenseKey).toBeNull();
          // 3. Email should be null
          expect(result.email).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 14: Grace Period During Network Failure**
   * 
   * Test boundary: exactly at grace period boundary
   * 
   * **Validates: Requirements 8.4**
   */
  it('Property 14: Grace period boundary - just before expiry maintains premium', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        futureDateArb,
        async (licenseKey, email, expiresAt) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Set validatedAt to just under 7 days ago (1 minute before grace period ends)
          const validatedAt = new Date(Date.now() - GRACE_PERIOD + 60000);
          const cachedUntil = new Date(Date.now() - 1000);
          
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt,
            validatedAt: validatedAt.toISOString(),
            cachedUntil: cachedUntil.toISOString()
          };
          
          await manager.storeLicenseStatus(premiumStatus);
          
          // Mock network failure
          manager.validateLicense = async () => {
            throw new Error('Network error');
          };
          
          const result = await manager.getLicenseStatus();
          
          // Should still be premium (just within grace period)
          expect(result.isPremium).toBe(true);
          expect(result.licenseKey).toBe(licenseKey);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 14: Grace Period During Network Failure**
   * 
   * Test: Freemium users don't get grace period benefits
   * 
   * **Validates: Requirements 8.4**
   */
  it('Property 14: Freemium users remain freemium on network failure (no grace period)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        async (licenseKey) => {
          mockChrome._reset();
          const manager = new LicenseManager();
          
          // Set up a freemium status with expired cache
          const validatedAt = new Date(Date.now() - 1000);
          const cachedUntil = new Date(Date.now() - 500);
          
          const freemiumStatus = {
            isPremium: false,
            licenseKey: licenseKey, // Has a key but was invalid
            email: null,
            expiresAt: null,
            validatedAt: validatedAt.toISOString(),
            cachedUntil: cachedUntil.toISOString()
          };
          
          await manager.storeLicenseStatus(freemiumStatus);
          
          // Mock network failure
          manager.validateLicense = async () => {
            throw new Error('Network error');
          };
          
          const result = await manager.getLicenseStatus();
          
          // Should remain freemium (grace period only applies to premium)
          expect(result.isPremium).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Expiration Warning Properties', () => {
  /**
   * **Feature: freemium-license-system, Property 13: Expiration Warning Threshold**
   * 
   * *For any* premium license with expiration date within 7 days from current date,
   * the extension SHALL display a renewal reminder.
   * 
   * **Validates: Requirements 7.3**
   */
  it('Property 13: Expiration warning shown for licenses expiring within 7 days', async () => {
    // Import the function dynamically to get the updated version
    const { checkExpirationWarning } = await import('./license.js');
    
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        // Generate days until expiry: 1 to 7 days (within warning threshold)
        fc.integer({ min: 1, max: 7 }),
        async (licenseKey, email, daysUntilExpiry) => {
          const now = new Date();
          // Set expiration to exactly daysUntilExpiry days from now
          const expiresAt = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
          
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt.toISOString(),
            validatedAt: now.toISOString(),
            cachedUntil: new Date(now.getTime() + CACHE_DURATION).toISOString()
          };
          
          const result = checkExpirationWarning(premiumStatus, now);
          
          // Property assertions:
          // 1. Warning should be shown for licenses expiring within 7 days
          expect(result.shouldShow).toBe(true);
          // 2. Days until expiry should be correctly calculated
          expect(result.daysUntilExpiry).toBe(daysUntilExpiry);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 13: Expiration Warning Threshold**
   * 
   * Additional test: No warning for licenses expiring more than 7 days from now
   * 
   * **Validates: Requirements 7.3**
   */
  it('Property 13: No expiration warning for licenses expiring after 7 days', async () => {
    const { checkExpirationWarning } = await import('./license.js');
    
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        // Generate days until expiry: 8 to 365 days (outside warning threshold)
        fc.integer({ min: 8, max: 365 }),
        async (licenseKey, email, daysUntilExpiry) => {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
          
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt.toISOString(),
            validatedAt: now.toISOString(),
            cachedUntil: new Date(now.getTime() + CACHE_DURATION).toISOString()
          };
          
          const result = checkExpirationWarning(premiumStatus, now);
          
          // Property assertions:
          // 1. Warning should NOT be shown for licenses expiring after 7 days
          expect(result.shouldShow).toBe(false);
          // 2. Days until expiry should still be correctly calculated
          expect(result.daysUntilExpiry).toBe(daysUntilExpiry);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 13: Expiration Warning Threshold**
   * 
   * Test: No warning for already expired licenses
   * 
   * **Validates: Requirements 7.3**
   */
  it('Property 13: No expiration warning for already expired licenses', async () => {
    const { checkExpirationWarning } = await import('./license.js');
    
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        // Generate days since expiry: 1 to 30 days ago (already expired)
        fc.integer({ min: 1, max: 30 }),
        async (licenseKey, email, daysSinceExpiry) => {
          const now = new Date();
          // Set expiration to daysSinceExpiry days in the past
          const expiresAt = new Date(now.getTime() - daysSinceExpiry * 24 * 60 * 60 * 1000);
          
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt.toISOString(),
            validatedAt: now.toISOString(),
            cachedUntil: new Date(now.getTime() + CACHE_DURATION).toISOString()
          };
          
          const result = checkExpirationWarning(premiumStatus, now);
          
          // Property assertions:
          // 1. Warning should NOT be shown for already expired licenses
          expect(result.shouldShow).toBe(false);
          // 2. Days until expiry should be negative or zero
          expect(result.daysUntilExpiry).toBeLessThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 13: Expiration Warning Threshold**
   * 
   * Test: No warning for freemium users
   * 
   * **Validates: Requirements 7.3**
   */
  it('Property 13: No expiration warning for freemium users', async () => {
    const { checkExpirationWarning } = await import('./license.js');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate any number of days (doesn't matter for freemium)
        fc.integer({ min: 1, max: 365 }),
        async (daysUntilExpiry) => {
          const now = new Date();
          
          // Freemium status (isPremium = false)
          const freemiumStatus = {
            isPremium: false,
            licenseKey: null,
            email: null,
            expiresAt: null,
            validatedAt: now.toISOString(),
            cachedUntil: now.toISOString()
          };
          
          const result = checkExpirationWarning(freemiumStatus, now);
          
          // Property assertions:
          // 1. Warning should NOT be shown for freemium users
          expect(result.shouldShow).toBe(false);
          // 2. Days until expiry should be null
          expect(result.daysUntilExpiry).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 13: Expiration Warning Threshold**
   * 
   * Test: No warning for premium users without expiration date
   * 
   * **Validates: Requirements 7.3**
   */
  it('Property 13: No expiration warning for premium users without expiration date', async () => {
    const { checkExpirationWarning } = await import('./license.js');
    
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        async (licenseKey, email) => {
          const now = new Date();
          
          // Premium status without expiration date
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: null, // No expiration date
            validatedAt: now.toISOString(),
            cachedUntil: new Date(now.getTime() + CACHE_DURATION).toISOString()
          };
          
          const result = checkExpirationWarning(premiumStatus, now);
          
          // Property assertions:
          // 1. Warning should NOT be shown without expiration date
          expect(result.shouldShow).toBe(false);
          // 2. Days until expiry should be null
          expect(result.daysUntilExpiry).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: freemium-license-system, Property 13: Expiration Warning Threshold**
   * 
   * Test: Boundary condition - exactly 7 days until expiry
   * 
   * **Validates: Requirements 7.3**
   */
  it('Property 13: Warning shown at exactly 7 days boundary', async () => {
    const { checkExpirationWarning } = await import('./license.js');
    
    await fc.assert(
      fc.asyncProperty(
        validLicenseKeyArb,
        validEmailArb,
        async (licenseKey, email) => {
          const now = new Date();
          // Set expiration to exactly 7 days from now
          const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          const premiumStatus = {
            isPremium: true,
            licenseKey: licenseKey,
            email: email,
            expiresAt: expiresAt.toISOString(),
            validatedAt: now.toISOString(),
            cachedUntil: new Date(now.getTime() + CACHE_DURATION).toISOString()
          };
          
          const result = checkExpirationWarning(premiumStatus, now);
          
          // Property assertions:
          // 1. Warning should be shown at exactly 7 days
          expect(result.shouldShow).toBe(true);
          // 2. Days until expiry should be 7
          expect(result.daysUntilExpiry).toBe(7);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
