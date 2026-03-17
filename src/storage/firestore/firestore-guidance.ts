/**
 * Firestore Guidance Storage — production adapter.
 */

import { type Firestore } from 'firebase-admin/firestore';
import type { IGuidanceStorage } from '../interfaces.js';
import type { NextStepSuggestion, RoadmapItem, ProjectProgress } from '../../engines/guidance/types.js';

export class FirestoreGuidanceStorage implements IGuidanceStorage {
  constructor(private readonly db: Firestore) {}

  private ref(tenantId: string, projectId: string) {
    return this.db.collection('tenants').doc(tenantId).collection('projects').doc(projectId);
  }

  async saveSuggestions(tenantId: string, projectId: string, suggestions: NextStepSuggestion[]): Promise<void> {
    const batch = this.db.batch();
    const col = this.ref(tenantId, projectId).collection('suggestions');
    for (const s of suggestions) {
      batch.set(col.doc(s.id), s);
    }
    await batch.commit();
  }

  async getSuggestions(tenantId: string, projectId: string): Promise<NextStepSuggestion[]> {
    const snap = await this.ref(tenantId, projectId).collection('suggestions').get();
    return snap.docs.map((d) => d.data() as NextStepSuggestion);
  }

  async updateSuggestion(tenantId: string, projectId: string, suggestionId: string, updates: Partial<NextStepSuggestion>): Promise<void> {
    await this.ref(tenantId, projectId).collection('suggestions').doc(suggestionId).update(updates);
  }

  async saveRoadmapItems(tenantId: string, projectId: string, items: RoadmapItem[]): Promise<void> {
    const batch = this.db.batch();
    const col = this.ref(tenantId, projectId).collection('roadmap');
    for (const item of items) {
      batch.set(col.doc(item.id), item);
    }
    await batch.commit();
  }

  async getRoadmapItems(tenantId: string, projectId: string): Promise<RoadmapItem[]> {
    const snap = await this.ref(tenantId, projectId).collection('roadmap').get();
    return snap.docs.map((d) => d.data() as RoadmapItem);
  }

  async updateRoadmapItem(tenantId: string, projectId: string, itemId: string, updates: Partial<RoadmapItem>): Promise<void> {
    await this.ref(tenantId, projectId).collection('roadmap').doc(itemId).update(updates);
  }

  async saveProgress(tenantId: string, projectId: string, progress: ProjectProgress): Promise<void> {
    await this.ref(tenantId, projectId).collection('progress').doc('current').set(progress);
  }

  async getProgress(tenantId: string, projectId: string): Promise<ProjectProgress | null> {
    const doc = await this.ref(tenantId, projectId).collection('progress').doc('current').get();
    return doc.exists ? (doc.data() as ProjectProgress) : null;
  }
}
