/**
 * Protocol Engine types — Motor 5.
 * Protocol-Driven Behavior: loads, caches, doses, and constructs
 * the SYNAPTIC protocol for injection into LLM prompts.
 */

import type { IEngine } from '../types.js';
import type { IntelligenceSummary } from '../intelligence/types.js';

// ─── Configuration ──────────────────────────────────────────────

export interface ProtocolConfig {
  readonly protocolVersion: string;
  readonly coreProtocol: string;
  readonly extendedProtocol?: string;
  readonly covenant: string;
  readonly tokenBudgets: TokenBudgets;
  readonly cacheTTL: number;
}

export interface TokenBudgets {
  readonly masterProtocol: {
    readonly full: number;
    readonly partial: number;
    readonly coreOnly: number;
  };
  readonly directorFiles: {
    readonly rules: number;
    readonly designDoc: number;
    readonly mantra: number;
  };
  readonly intelligence: {
    readonly decisions: number;
    readonly learnings: number;
  };
  readonly bitacora: number;
  readonly language: number;
  readonly covenant: number;
}

// ─── Protocol Content ───────────────────────────────────────────

export type InjectionMode = 'FULL' | 'PARTIAL' | 'CORE_ONLY';

export interface ProtocolContent {
  readonly mode: InjectionMode;
  readonly content: string;
  readonly tokenCount: number;
}

// ─── System Prompt Construction ─────────────────────────────────

export interface SystemPromptContext {
  readonly cycle: number;
  readonly mode: 'SYNAPTIC' | 'ARCHITECT' | 'IMMEDIATE';
  readonly directorFiles: {
    readonly mantra: string;
    readonly rules: string;
    readonly designDoc: string;
  };
  readonly intelligenceSummary: IntelligenceSummary;
  readonly bitacoraHistory: string;
  readonly userLanguage?: string;
  readonly modelId: string;
}

// ─── Prompt Wrapping ────────────────────────────────────────────

export interface PromptWrapParams {
  readonly userPrompt: string;
  readonly cycle: number;
  readonly loadedFiles: readonly string[];
  readonly enforcementMode: string;
}

// ─── Token Estimation ───────────────────────────────────────────

export interface TokenEstimate {
  readonly protocol: number;
  readonly directorFiles: number;
  readonly intelligence: number;
  readonly bitacora: number;
  readonly total: number;
  readonly remainingForUser: number;
}

// ─── Storage Interface ──────────────────────────────────────────

export interface IProtocolStorage {
  getProtocolContent(
    tenantId: string,
    projectId: string,
    version: string,
  ): Promise<{ core: string; extended?: string; covenant: string } | null>;
  saveProtocolContent(
    tenantId: string,
    projectId: string,
    content: { version: string; core: string; extended?: string; covenant: string },
  ): Promise<void>;
}

// ─── Engine Interface ───────────────────────────────────────────

export interface IProtocolEngine extends IEngine {
  initialize(config: ProtocolConfig): Promise<void>;

  /** Get protocol content adjusted for current cycle */
  getProtocolContent(cycle: number): ProtocolContent;

  /** Determine injection mode based on cycle number */
  getInjectionMode(cycle: number): InjectionMode;

  /** Build the complete system prompt from all sources */
  buildSystemPrompt(context: SystemPromptContext): Promise<string>;

  /** Wrap user prompt with enforcement markers */
  wrapUserPrompt(params: PromptWrapParams): string;

  /** Estimate token usage for a given cycle */
  estimateTokenUsage(cycle: number): TokenEstimate;
}
