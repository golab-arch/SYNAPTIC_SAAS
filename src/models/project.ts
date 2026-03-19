/**
 * Project model — CRUD for user projects.
 * In-memory for dev; Firestore in production.
 */

import { randomBytes } from 'node:crypto';

export interface Project {
  id: string;
  uid: string;
  name: string;
  description: string;
  framework: string;
  createdAt: string;
  lastActivityAt: string;
  cycleCount: number;
  synapticStrength: number;
}

// In-memory store
const memProjects = new Map<string, Project>();

export function createProject(uid: string, data: { name: string; description?: string; framework?: string }): Project {
  const id = randomBytes(8).toString('hex');
  const project: Project = {
    id,
    uid,
    name: data.name,
    description: data.description ?? '',
    framework: data.framework ?? 'react',
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    cycleCount: 0,
    synapticStrength: 0,
  };
  memProjects.set(id, project);
  return project;
}

export function listProjects(uid: string): Project[] {
  return [...memProjects.values()]
    .filter((p) => p.uid === uid)
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export function getProject(projectId: string, uid: string): Project | null {
  const p = memProjects.get(projectId);
  if (!p || p.uid !== uid) return null;
  return p;
}

export function deleteProject(projectId: string, uid: string): boolean {
  const p = memProjects.get(projectId);
  if (!p || p.uid !== uid) return false;
  memProjects.delete(projectId);
  return true;
}

export function updateProjectActivity(projectId: string): void {
  const p = memProjects.get(projectId);
  if (p) {
    p.lastActivityAt = new Date().toISOString();
    p.cycleCount++;
    p.synapticStrength = Math.min(p.cycleCount * 3, 100);
  }
}
