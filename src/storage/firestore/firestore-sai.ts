/**
 * Firestore SAI Storage — stub.
 */

// TODO: Implement in Phase 4

import type { ISAIStorage } from '../interfaces.js';
import type { SAIAuditResult, SAICycleEntry, Finding } from '../../engines/sai/types.js';

export class FirestoreSAIStorage implements ISAIStorage {
  async saveAuditResult(_tenantId: string, _projectId: string, _result: SAIAuditResult, _cycle: number): Promise<void> {
    throw new Error('FirestoreSAIStorage not implemented');
  }

  async getAuditHistory(_tenantId: string, _projectId: string, _limit?: number): Promise<SAICycleEntry[]> {
    throw new Error('FirestoreSAIStorage not implemented');
  }

  async saveFindings(_tenantId: string, _projectId: string, _findings: Finding[]): Promise<void> {
    throw new Error('FirestoreSAIStorage not implemented');
  }

  async getActiveFindings(_tenantId: string, _projectId: string): Promise<Finding[]> {
    throw new Error('FirestoreSAIStorage not implemented');
  }

  async getResolvedFindings(_tenantId: string, _projectId: string): Promise<Finding[]> {
    throw new Error('FirestoreSAIStorage not implemented');
  }

  async updateFinding(_tenantId: string, _projectId: string, _findingId: string, _updates: Partial<Finding>): Promise<void> {
    throw new Error('FirestoreSAIStorage not implemented');
  }
}
