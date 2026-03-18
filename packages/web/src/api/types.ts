/** API response types matching backend */

export interface SessionState {
  currentCycle: number;
  currentPhase: string;
  synapticStrength: number;
  lastActivity: string;
}

export interface LearningEntry {
  learningId: string;
  title: string;
  description: string;
  type: string;
  confidence: { score: number; source: string };
}

export interface DecisionRecord {
  gateId: string;
  selectedOption: string;
  rationale?: string;
  timestamp: string;
}

export interface BitacoraCycleEntry {
  cycleId: number;
  timestamp: string;
  result: string;
  prompt?: string;
  compliance?: { score: number; grade: string };
}

export interface SAIState {
  totalCyclesAudited: number;
  averageScore: number;
  currentStreak: number;
}

export interface AuditFinding {
  findingId: string;
  file: string;
  line: number;
  message: string;
  severity: string;
  type: string;
}

export interface GuidanceResult {
  nextSteps: Array<{ title: string; priority: string; category: string; suggestedPrompt?: string }>;
  orientation: string;
  phaseProgress: number;
}

export interface KeyValidationResult {
  isValid: boolean;
  providerId: string;
  error?: string;
}
