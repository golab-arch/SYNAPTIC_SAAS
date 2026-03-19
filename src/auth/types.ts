/**
 * Auth types — user identity and session data.
 */

export type UserTier = 'free' | 'pro' | 'full';

export interface AuthenticatedUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly provider: string;
  readonly tier: UserTier;
}
