/**
 * Roadmap Analyzer — parses markdown documents into structured RoadmapItem[].
 * Extracts tasks from checkboxes, TODO prefixes, and priority markers.
 * FUNCTIONAL implementation — regex only, no LLM.
 */

import type { RoadmapItem } from './types.js';

const CHECKBOX_RE = /^(\s*)- \[([ x!~])\]\s*(.+)$/gm;
const TODO_PREFIX_RE = /^(\s*)(?:TODO|PENDING|BLOCKED|WIP):\s*(.+)$/gim;
const PRIORITY_RE = /\[(HIGH|CRITICAL|LOW|OPTIONAL|MEDIUM)\]/i;
const PHASE_HEADER_RE = /^#{1,4}\s+(?:Phase|Fase)\s+(\d+)[:\s]*(.*)$/im;

/**
 * Parse a markdown document into structured roadmap items.
 */
export function parseRoadmap(content: string, docId: string): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  let currentPhase = 'unknown';
  let itemCounter = 0;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Detect phase headers
    const phaseMatch = line.match(/^#{1,4}\s+(?:Phase|Fase)\s+(\d+)[:\s]*(.*)/i);
    if (phaseMatch) {
      currentPhase = `Phase ${phaseMatch[1]}${phaseMatch[2] ? ': ' + phaseMatch[2].trim() : ''}`;
      continue;
    }

    // Detect section headers as phases
    const sectionMatch = line.match(/^#{1,3}\s+(.+)/);
    if (sectionMatch && !phaseMatch) {
      currentPhase = sectionMatch[1]!.trim();
    }

    // Detect checkbox items: - [ ] pending, - [x] done, - [!] blocked, - [~] in_progress
    const checkboxMatch = line.match(/^\s*- \[([ x!~])\]\s*(.+)$/);
    if (checkboxMatch) {
      const marker = checkboxMatch[1]!;
      const text = checkboxMatch[2]!;
      const priority = extractPriority(text);

      items.push({
        id: `${docId}-${++itemCounter}`,
        title: text.replace(PRIORITY_RE, '').trim(),
        description: text,
        phase: currentPhase,
        priority,
        effort: estimateEffort(text),
        status: marker === 'x' ? 'completed' : marker === '~' ? 'in_progress' : 'pending',
      });
      continue;
    }

    // Detect TODO/PENDING/BLOCKED/WIP prefixes
    const prefixMatch = line.match(/^\s*(?:TODO|PENDING|BLOCKED|WIP):\s*(.+)/i);
    if (prefixMatch) {
      const text = prefixMatch[1]!;
      const isBlocked = /^BLOCKED/i.test(line.trim());
      const isWip = /^WIP/i.test(line.trim());

      items.push({
        id: `${docId}-${++itemCounter}`,
        title: text.trim(),
        description: text,
        phase: currentPhase,
        priority: isBlocked ? 'HIGH' : extractPriority(text),
        effort: estimateEffort(text),
        status: isBlocked ? 'pending' : isWip ? 'in_progress' : 'pending',
      });
    }
  }

  // Suppress unused lint warnings for module-level patterns
  void CHECKBOX_RE;
  void TODO_PREFIX_RE;
  void PHASE_HEADER_RE;

  return items;
}

function extractPriority(text: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const match = text.match(PRIORITY_RE);
  if (match) {
    const p = match[1]!.toUpperCase();
    if (p === 'CRITICAL' || p === 'HIGH') return 'HIGH';
    if (p === 'LOW' || p === 'OPTIONAL') return 'LOW';
  }
  return 'MEDIUM';
}

function estimateEffort(text: string): 'small' | 'medium' | 'large' {
  const lower = text.toLowerCase();
  if (/\b(?:entire|complete|rewrite|full|migrate|overhaul|refactor entire)\b/.test(lower)) return 'large';
  if (/\b(?:fix typo|update comment|rename|small|minor|tweak)\b/.test(lower)) return 'small';
  return 'medium';
}
