/**
 * Firestore Guidance Storage — stub.
 */

// TODO: Implement in Phase 4

import type { IGuidanceStorage } from '../interfaces.js';
import type { NextStepSuggestion, RoadmapItem, ProjectProgress } from '../../engines/guidance/types.js';

export class FirestoreGuidanceStorage implements IGuidanceStorage {
  async saveSuggestions(_tenantId: string, _projectId: string, _suggestions: NextStepSuggestion[]): Promise<void> {
    throw new Error('FirestoreGuidanceStorage not implemented');
  }
  async getSuggestions(_tenantId: string, _projectId: string): Promise<NextStepSuggestion[]> {
    throw new Error('FirestoreGuidanceStorage not implemented');
  }
  async updateSuggestion(_tenantId: string, _projectId: string, _suggestionId: string, _updates: Partial<NextStepSuggestion>): Promise<void> {
    throw new Error('FirestoreGuidanceStorage not implemented');
  }
  async saveRoadmapItems(_tenantId: string, _projectId: string, _items: RoadmapItem[]): Promise<void> {
    throw new Error('FirestoreGuidanceStorage not implemented');
  }
  async getRoadmapItems(_tenantId: string, _projectId: string): Promise<RoadmapItem[]> {
    throw new Error('FirestoreGuidanceStorage not implemented');
  }
  async updateRoadmapItem(_tenantId: string, _projectId: string, _itemId: string, _updates: Partial<RoadmapItem>): Promise<void> {
    throw new Error('FirestoreGuidanceStorage not implemented');
  }
  async saveProgress(_tenantId: string, _projectId: string, _progress: ProjectProgress): Promise<void> {
    throw new Error('FirestoreGuidanceStorage not implemented');
  }
  async getProgress(_tenantId: string, _projectId: string): Promise<ProjectProgress | null> {
    throw new Error('FirestoreGuidanceStorage not implemented');
  }
}
