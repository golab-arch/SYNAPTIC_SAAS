import { create } from 'zustand';

interface SessionState {
  tenantId: string;
  projectId: string;
  currentCycle: number;
  currentPhase: string;
  synapticStrength: number;
  complianceScore: number;
  isConnected: boolean;
  saiScore: number;
  saiGrade: string;
  saiFindings: number;
  nextSteps: Array<{ title: string; priority: string; category: string }>;
  orientation: string;
  phaseProgress: number;

  setSession: (session: Partial<SessionState>) => void;
  setSAI: (sai: { score: number; grade: string; findings: number }) => void;
  setGuidance: (g: { nextSteps: Array<{ title: string; priority: string; category: string }>; orientation: string; phaseProgress: number }) => void;
  setConnected: (c: boolean) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  tenantId: 'default-tenant',
  projectId: 'default-project',
  currentCycle: 0,
  currentPhase: 'SETUP',
  synapticStrength: 0,
  complianceScore: 100,
  isConnected: false,
  saiScore: 100,
  saiGrade: 'A',
  saiFindings: 0,
  nextSteps: [],
  orientation: '',
  phaseProgress: 0,

  setSession: (session) => set((s) => ({ ...s, ...session })),
  setSAI: (sai) => set({ saiScore: sai.score, saiGrade: sai.grade, saiFindings: sai.findings }),
  setGuidance: (g) => set({ nextSteps: g.nextSteps, orientation: g.orientation, phaseProgress: g.phaseProgress }),
  setConnected: (connected) => set({ isConnected: connected }),
}));
