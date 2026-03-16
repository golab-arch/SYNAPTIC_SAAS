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

// In-memory adapters (development/testing)
export {
  InMemoryEnforcementStorage,
  InMemorySAIStorage,
  InMemoryIntelligenceStorage,
  InMemoryGuidanceStorage,
} from './memory/index.js';

// Firestore adapters (production — stubs)
export {
  FirestoreEnforcementStorage,
  FirestoreSAIStorage,
  FirestoreIntelligenceStorage,
  FirestoreGuidanceStorage,
} from './firestore/index.js';
