/**
 * Storage Abstraction Layer — public API.
 */

// Interfaces
export type {
  IEnforcementStorage,
  ISAIStorage,
  IIntelligenceStorage,
  IGuidanceStorage,
  IProtocolStorage,
} from './interfaces.js';

// Factory
export { createStorageAdapters, type StorageType, type StorageAdapters } from './storage-factory.js';

// In-memory adapters (development/testing)
export {
  InMemoryEnforcementStorage,
  InMemorySAIStorage,
  InMemoryIntelligenceStorage,
  InMemoryGuidanceStorage,
} from './memory/index.js';

// Firestore adapters (production)
export {
  FirestoreEnforcementStorage,
  FirestoreSAIStorage,
  FirestoreIntelligenceStorage,
  FirestoreGuidanceStorage,
  initializeFirestoreClient,
} from './firestore/index.js';
