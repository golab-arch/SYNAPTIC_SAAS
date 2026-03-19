/**
 * Usage tracking — cycles per month per user.
 * In-memory for dev; Firestore in production.
 */

import { TIER_LIMITS } from './user.js';
import type { UserTier } from '../auth/types.js';

// In-memory usage counters: "uid_YYYY-MM" → count
const memUsage = new Map<string, number>();

function monthKey(uid: string): string {
  const now = new Date();
  return `${uid}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function checkUsageLimit(uid: string, tier: UserTier): { allowed: boolean; used: number; limit: number } {
  const key = monthKey(uid);
  const used = memUsage.get(key) ?? 0;
  const limit = TIER_LIMITS[tier]?.maxCyclesPerMonth ?? 50;
  return { allowed: used < limit, used, limit };
}

export function incrementUsage(uid: string): void {
  const key = monthKey(uid);
  memUsage.set(key, (memUsage.get(key) ?? 0) + 1);
}
