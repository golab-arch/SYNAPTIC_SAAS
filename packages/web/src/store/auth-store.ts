import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  tenantId: string | null;
  projectId: string | null;
  authToken: string | null;
  displayName: string | null;

  login: (params: { tenantId: string; projectId: string; authToken: string; displayName?: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      tenantId: null,
      projectId: null,
      authToken: null,
      displayName: null,

      login: (params) => set({
        isAuthenticated: true,
        tenantId: params.tenantId,
        projectId: params.projectId,
        authToken: params.authToken,
        displayName: params.displayName ?? null,
      }),

      logout: () => set({
        isAuthenticated: false,
        tenantId: null,
        projectId: null,
        authToken: null,
        displayName: null,
      }),
    }),
    { name: 'synaptic-auth' },
  ),
);
