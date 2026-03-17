/**
 * Storage Factory — creates storage adapters based on configuration.
 * 'memory' = in-memory (dev/test), 'firestore' = production.
 */

import type { Firestore } from 'firebase-admin/firestore';
import type { IEnforcementStorage, ISAIStorage, IIntelligenceStorage, IGuidanceStorage } from './interfaces.js';
import { InMemoryEnforcementStorage } from './memory/memory-enforcement.js';
import { InMemorySAIStorage } from './memory/memory-sai.js';
import { InMemoryIntelligenceStorage } from './memory/memory-intelligence.js';
import { InMemoryGuidanceStorage } from './memory/memory-guidance.js';
import { FirestoreEnforcementStorage } from './firestore/firestore-enforcement.js';
import { FirestoreSAIStorage } from './firestore/firestore-sai.js';
import { FirestoreIntelligenceStorage } from './firestore/firestore-intelligence.js';
import { FirestoreGuidanceStorage } from './firestore/firestore-guidance.js';

export type StorageType = 'memory' | 'firestore';

export interface StorageAdapters {
  enforcement: IEnforcementStorage;
  sai: ISAIStorage;
  intelligence: IIntelligenceStorage;
  guidance: IGuidanceStorage;
}

export function createStorageAdapters(type: StorageType, firestoreDb?: Firestore): StorageAdapters {
  if (type === 'firestore') {
    if (!firestoreDb) throw new Error('Firestore DB instance required for firestore storage');
    return {
      enforcement: new FirestoreEnforcementStorage(firestoreDb),
      sai: new FirestoreSAIStorage(firestoreDb),
      intelligence: new FirestoreIntelligenceStorage(firestoreDb),
      guidance: new FirestoreGuidanceStorage(firestoreDb),
    };
  }

  return {
    enforcement: new InMemoryEnforcementStorage(),
    sai: new InMemorySAIStorage(),
    intelligence: new InMemoryIntelligenceStorage(),
    guidance: new InMemoryGuidanceStorage(),
  };
}
