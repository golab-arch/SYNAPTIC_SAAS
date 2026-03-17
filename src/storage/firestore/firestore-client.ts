/**
 * Firestore client initialization.
 */

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let db: Firestore | null = null;

export function initializeFirestoreClient(config?: {
  projectId?: string;
  credentials?: ServiceAccount;
}): Firestore {
  if (db) return db;

  if (getApps().length === 0) {
    if (config?.credentials) {
      initializeApp({ credential: cert(config.credentials) });
    } else {
      initializeApp({ projectId: config?.projectId });
    }
  }

  db = getFirestore();
  return db;
}

export function getFirestoreClient(): Firestore {
  if (!db) throw new Error('Firestore not initialized. Call initializeFirestoreClient() first.');
  return db;
}
