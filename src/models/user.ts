/**
 * User model — Firestore-backed user records + tier system.
 * In dev mode (no Firestore), uses in-memory store.
 */

import type { UserTier } from '../auth/types.js';

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
  tier: UserTier;
  createdAt: string;
  lastLoginAt: string;
}

export interface UsageLimits {
  maxCyclesPerMonth: number;
  maxProjects: number;
}

export const TIER_LIMITS: Record<UserTier, UsageLimits> = {
  free: { maxCyclesPerMonth: 50, maxProjects: 3 },
  pro: { maxCyclesPerMonth: 500, maxProjects: 20 },
  full: { maxCyclesPerMonth: Infinity, maxProjects: Infinity },
};

// In-memory store for dev mode
const memUsers = new Map<string, UserRecord>();

export async function getOrCreateUser(uid: string, data: Partial<UserRecord>): Promise<UserRecord> {
  const existing = memUsers.get(uid);
  if (existing) {
    existing.lastLoginAt = new Date().toISOString();
    return existing;
  }

  const user: UserRecord = {
    uid,
    email: data.email ?? '',
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    provider: data.provider ?? 'unknown',
    tier: 'free',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  memUsers.set(uid, user);
  return user;
}

export function getUserTier(uid: string): UserTier {
  return memUsers.get(uid)?.tier ?? 'free';
}
