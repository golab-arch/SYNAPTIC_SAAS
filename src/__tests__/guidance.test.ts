/**
 * Guidance Engine — roadmap analyzer + progress + suggestions tests.
 */

import { describe, it, expect } from 'vitest';
import { parseRoadmap } from '../engines/guidance/roadmap-analyzer.js';
import { calculateProgress } from '../engines/guidance/progress-tracker.js';
import { generateSuggestions, generateOrientation } from '../engines/guidance/suggestion-generator.js';

describe('RoadmapAnalyzer', () => {
  it('should extract pending checkbox tasks', () => {
    const content = '## Phase 1\n- [ ] Implement auth\n- [x] Setup DB\n- [ ] Add tests';
    const items = parseRoadmap(content, 'roadmap');
    expect(items).toHaveLength(3);
    expect(items.filter((i) => i.status === 'pending')).toHaveLength(2);
    expect(items.filter((i) => i.status === 'completed')).toHaveLength(1);
  });

  it('should detect in_progress and completed states', () => {
    const content = '- [~] WIP feature\n- [x] Done feature\n- [ ] Pending feature';
    const items = parseRoadmap(content, 'test');
    expect(items[0]!.status).toBe('in_progress');
    expect(items[1]!.status).toBe('completed');
    expect(items[2]!.status).toBe('pending');
  });

  it('should detect priority markers', () => {
    const content = '- [ ] [HIGH] Critical feature\n- [ ] [LOW] Nice to have\n- [ ] Regular task';
    const items = parseRoadmap(content, 'test');
    expect(items[0]!.priority).toBe('HIGH');
    expect(items[1]!.priority).toBe('LOW');
    expect(items[2]!.priority).toBe('MEDIUM');
  });

  it('should track phases from headers', () => {
    const content = '## Phase 1: Foundation\n- [ ] Task A\n## Phase 2: Build\n- [ ] Task B';
    const items = parseRoadmap(content, 'test');
    expect(items[0]!.phase).toContain('Phase 1');
    expect(items[1]!.phase).toContain('Phase 2');
  });

  it('should detect TODO/PENDING/BLOCKED prefixes', () => {
    const content = 'TODO: Fix the bug\nPENDING: Review PR\nBLOCKED: Waiting for API';
    const items = parseRoadmap(content, 'test');
    expect(items).toHaveLength(3);
    expect(items[2]!.priority).toBe('HIGH'); // BLOCKED = HIGH priority
  });

  it('should estimate effort from keywords', () => {
    const content = '- [ ] Fix typo in header\n- [ ] Refactor entire auth system\n- [ ] Add search feature';
    const items = parseRoadmap(content, 'test');
    expect(items[0]!.effort).toBe('small');
    expect(items[1]!.effort).toBe('large');
    expect(items[2]!.effort).toBe('medium');
  });
});

describe('ProgressTracker', () => {
  it('should calculate phase progress', () => {
    const items = [
      { id: '1', title: 'A', description: '', phase: 'Phase 1', priority: 'HIGH' as const, effort: 'small' as const, status: 'completed' as const },
      { id: '2', title: 'B', description: '', phase: 'Phase 1', priority: 'MEDIUM' as const, effort: 'medium' as const, status: 'completed' as const },
      { id: '3', title: 'C', description: '', phase: 'Phase 1', priority: 'LOW' as const, effort: 'large' as const, status: 'pending' as const },
      { id: '4', title: 'D', description: '', phase: 'Phase 2', priority: 'MEDIUM' as const, effort: 'medium' as const, status: 'pending' as const },
    ];

    const progress = calculateProgress(items);
    expect(progress.totalItems).toBe(4);
    expect(progress.completedItems).toBe(2);
    expect(progress.percentage).toBe(50);
    expect(progress.byPhase).toHaveLength(2);
    expect(progress.byPhase.find((p) => p.phase === 'Phase 1')?.percentage).toBe(67);
  });

  it('should handle empty items', () => {
    const progress = calculateProgress([]);
    expect(progress.totalItems).toBe(0);
    expect(progress.percentage).toBe(0);
  });
});

describe('SuggestionGenerator', () => {
  it('should prioritize HIGH priority tasks', () => {
    const items = [
      { id: '1', title: 'Low task', description: '', phase: 'P1', priority: 'LOW' as const, effort: 'medium' as const, status: 'pending' as const },
      { id: '2', title: 'High task', description: '', phase: 'P1', priority: 'HIGH' as const, effort: 'medium' as const, status: 'pending' as const },
    ];

    const config = {
      storage: null as never,
      intelligenceEngine: null as never,
      maxSuggestions: 5,
      priorityWeights: { urgency: 0.4, dependency: 0.35, complexity: 0.25 },
    };

    const suggestions = generateSuggestions(items, config);
    expect(suggestions[0]!.title).toBe('High task');
  });

  it('should detect category from keywords', () => {
    const items = [
      { id: '1', title: 'Fix bug in auth', description: '', phase: 'P1', priority: 'HIGH' as const, effort: 'small' as const, status: 'pending' as const },
      { id: '2', title: 'Add user dashboard', description: '', phase: 'P1', priority: 'MEDIUM' as const, effort: 'large' as const, status: 'pending' as const },
      { id: '3', title: 'Refactor database layer', description: '', phase: 'P1', priority: 'MEDIUM' as const, effort: 'large' as const, status: 'pending' as const },
    ];

    const config = {
      storage: null as never,
      intelligenceEngine: null as never,
      maxSuggestions: 5,
      priorityWeights: { urgency: 0.4, dependency: 0.35, complexity: 0.25 },
    };

    const suggestions = generateSuggestions(items, config);
    expect(suggestions.find((s) => s.title.includes('Fix'))?.category).toBe('fix');
    expect(suggestions.find((s) => s.title.includes('dashboard'))?.category).toBe('feature');
    expect(suggestions.find((s) => s.title.includes('Refactor'))?.category).toBe('refactor');
  });

  it('should skip completed items', () => {
    const items = [
      { id: '1', title: 'Done', description: '', phase: 'P1', priority: 'HIGH' as const, effort: 'small' as const, status: 'completed' as const },
      { id: '2', title: 'Pending', description: '', phase: 'P1', priority: 'MEDIUM' as const, effort: 'medium' as const, status: 'pending' as const },
    ];

    const config = {
      storage: null as never,
      intelligenceEngine: null as never,
      maxSuggestions: 5,
      priorityWeights: { urgency: 0.4, dependency: 0.35, complexity: 0.25 },
    };

    const suggestions = generateSuggestions(items, config);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.title).toBe('Pending');
  });

  it('should generate orientation text', () => {
    const text = generateOrientation(5, 'Phase 2', 20, 8, 2, 3);
    expect(text).toContain('ciclo 5');
    expect(text).toContain('2 bloqueadas');
    expect(text).toContain('3 en progreso');
    expect(text).toContain('40%');
  });
});
