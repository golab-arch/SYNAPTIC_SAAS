/**
 * HTTP client for SYNAPTIC_SAAS backend API.
 */

import type { SessionState, LearningEntry, DecisionRecord, BitacoraCycleEntry, SAIState, AuditFinding, GuidanceResult, KeyValidationResult } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiClient {
  constructor(
    private tenantId: string,
    private projectId: string,
    private authToken?: string,
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) h['Authorization'] = `Bearer ${this.authToken}`;
    return h;
  }

  private url(path: string): string {
    return `${API_BASE}/api/${this.tenantId}/${this.projectId}${path}`;
  }

  async getSession(): Promise<SessionState | null> { return this.get('/session'); }
  async getLearnings(minConfidence?: number): Promise<LearningEntry[]> {
    return this.get(`/learnings${minConfidence ? `?minConfidence=${minConfidence}` : ''}`);
  }
  async getDecisions(): Promise<DecisionRecord[]> { return this.get('/decisions'); }
  async submitDecision(gateId: string, selectedOption: string, rationale?: string): Promise<{ ok: boolean }> {
    return this.post('/decision', { gateId, selectedOption, rationale });
  }
  async getBitacora(limit = 15): Promise<BitacoraCycleEntry[]> { return this.get(`/bitacora?limit=${limit}`); }
  async getSAIState(): Promise<SAIState> { return this.get('/sai/state'); }
  async getSAIFindings(): Promise<AuditFinding[]> { return this.get('/sai/findings'); }
  async getGuidance(): Promise<GuidanceResult> { return this.get('/guidance'); }
  async getProgress(): Promise<{ phaseProgress: number }> { return this.get('/guidance/progress'); }

  async validateKey(providerId: string, apiKey: string): Promise<KeyValidationResult> {
    const res = await fetch(`${API_BASE}/api/${this.tenantId}/keys/validate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ providerId, apiKey }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(this.url(path), { headers: this.headers() });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: 'POST', headers: this.headers(), body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }
}
