/**
 * ProtocolEngine — Motor 5 main class.
 * Loads, caches, doses, and constructs the SYNAPTIC protocol.
 */

import type {
  IProtocolEngine,
  ProtocolConfig,
  ProtocolContent,
  InjectionMode,
  SystemPromptContext,
  PromptWrapParams,
  TokenEstimate,
} from './types.js';
import { getInjectionMode, loadProtocolContent } from './protocol-loader.js';
import { buildSystemPrompt as buildPrompt } from './prompt-builder.js';
import { wrapUserPrompt as wrapPrompt } from './prompt-wrapper.js';
import { estimateTokenUsage as estimateUsage } from './token-estimator.js';

export class ProtocolEngine implements IProtocolEngine {
  private config!: ProtocolConfig;
  private cachedContent: Map<InjectionMode, ProtocolContent> = new Map();

  async initialize(config: ProtocolConfig): Promise<void> {
    this.config = config;
    this.cachedContent.clear();
  }

  async dispose(): Promise<void> {
    this.cachedContent.clear();
  }

  getProtocolContent(cycle: number): ProtocolContent {
    const mode = this.getInjectionMode(cycle);

    // Check cache
    const cached = this.cachedContent.get(mode);
    if (cached) return cached;

    // Load and cache
    const content = loadProtocolContent(
      this.config.coreProtocol,
      this.config.extendedProtocol,
      mode,
    );
    this.cachedContent.set(mode, content);
    return content;
  }

  getInjectionMode(cycle: number): InjectionMode {
    return getInjectionMode(cycle);
  }

  async buildSystemPrompt(context: SystemPromptContext): Promise<string> {
    const protocolContent = this.getProtocolContent(context.cycle);
    return buildPrompt(
      context,
      protocolContent.content,
      this.config.covenant,
      this.config.tokenBudgets,
    );
  }

  wrapUserPrompt(params: PromptWrapParams): string {
    return wrapPrompt(params);
  }

  estimateTokenUsage(cycle: number): TokenEstimate {
    const mode = this.getInjectionMode(cycle);
    return estimateUsage(mode, this.config.tokenBudgets, 200_000);
  }
}
