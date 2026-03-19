/**
 * Auth store — Firebase OAuth state + dev mode bypass.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initFirebase, signInWithGoogle, signInWithGitHub, signOut, getIdToken, onAuthChange } from '../lib/firebase';

export type UserTier = 'free' | 'pro' | 'full';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  uid: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  tier: UserTier;
  idToken: string | null;
  // Dev mode fields (no Firebase)
  devMode: boolean;

  initialize: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  loginDev: (name?: string) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: true,
      uid: null,
      email: null,
      displayName: null,
      photoURL: null,
      tier: 'free',
      idToken: null,
      devMode: false,

      initialize: async () => {
        // If already authenticated from persisted state (dev mode), skip Firebase
        if (get().isAuthenticated && get().devMode) {
          set({ isLoading: false });
          return;
        }

        await initFirebase();
        const unsub = onAuthChange(async (user) => {
          if (user) {
            const token = await user.getIdToken();
            set({
              isAuthenticated: true,
              isLoading: false,
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              idToken: token,
              devMode: false,
            });
          } else if (!get().devMode) {
            set({ isAuthenticated: false, isLoading: false, uid: null, email: null, displayName: null, photoURL: null, idToken: null });
          }
        });

        // If no Firebase auth listener fired after 2s, stop loading
        setTimeout(() => {
          if (get().isLoading && !get().isAuthenticated) {
            set({ isLoading: false });
          }
        }, 2000);

        void unsub; // keep subscription alive
      },

      loginWithGoogle: async () => {
        set({ isLoading: true });
        try { await signInWithGoogle(); }
        catch { set({ isLoading: false }); }
      },

      loginWithGitHub: async () => {
        set({ isLoading: true });
        try { await signInWithGitHub(); }
        catch { set({ isLoading: false }); }
      },

      loginDev: (name?: string) => {
        set({
          isAuthenticated: true,
          isLoading: false,
          uid: 'dev-user',
          email: 'dev@synaptic.dev',
          displayName: name || 'Dev User',
          photoURL: null,
          tier: 'free',
          idToken: 'dev-token',
          devMode: true,
        });
      },

      logout: async () => {
        try { await signOut(); } catch { /* ignore */ }
        set({
          isAuthenticated: false,
          isLoading: false,
          uid: null, email: null, displayName: null, photoURL: null,
          idToken: null, devMode: false,
        });
      },

      refreshToken: async () => {
        if (get().devMode) return 'dev-token';
        const token = await getIdToken();
        set({ idToken: token });
        return token;
      },
    }),
    {
      name: 'synaptic-auth',
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        uid: s.uid,
        email: s.email,
        displayName: s.displayName,
        photoURL: s.photoURL,
        tier: s.tier,
        devMode: s.devMode,
        idToken: s.devMode ? s.idToken : null,
      }),
    },
  ),
);
