/**
 * Auth types — user identity and session data.
 */

/** Authenticated user from Firebase Auth */
export interface User {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly provider: 'google' | 'github';
  readonly tier: UserTier;
  readonly createdAt: Date;
}

/** Pricing tier for rate limiting and resource quotas */
export type UserTier = 'free' | 'pro' | 'team' | 'enterprise';

/** Active session */
export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
}
