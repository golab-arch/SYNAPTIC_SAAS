/**
 * WorkspaceManager — creates isolated directories per tenant+project.
 */

import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const WORKSPACE_BASE = process.env['WORKSPACE_BASE'] ?? join(tmpdir(), 'synaptic');

export class WorkspaceManager {
  async getWorkspace(tenantId: string, projectId: string): Promise<string> {
    const dir = join(WORKSPACE_BASE, tenantId, projectId);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    return dir;
  }

  async destroyWorkspace(tenantId: string, projectId: string): Promise<void> {
    const dir = join(WORKSPACE_BASE, tenantId, projectId);
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
