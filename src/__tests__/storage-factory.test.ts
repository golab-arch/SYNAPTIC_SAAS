/**
 * Storage factory tests.
 */

import { describe, it, expect } from 'vitest';
import { createStorageAdapters } from '../storage/storage-factory.js';
import { InMemoryIntelligenceStorage } from '../storage/memory/memory-intelligence.js';
import { InMemorySAIStorage } from '../storage/memory/memory-sai.js';
import { InMemoryEnforcementStorage } from '../storage/memory/memory-enforcement.js';
import { InMemoryGuidanceStorage } from '../storage/memory/memory-guidance.js';

describe('createStorageAdapters', () => {
  it('should create in-memory adapters by default', () => {
    const storage = createStorageAdapters('memory');
    expect(storage.intelligence).toBeInstanceOf(InMemoryIntelligenceStorage);
    expect(storage.sai).toBeInstanceOf(InMemorySAIStorage);
    expect(storage.enforcement).toBeInstanceOf(InMemoryEnforcementStorage);
    expect(storage.guidance).toBeInstanceOf(InMemoryGuidanceStorage);
  });

  it('should throw if firestore requested without db', () => {
    expect(() => createStorageAdapters('firestore')).toThrow('Firestore DB instance required');
  });
});
