/**
 * Learning Detectors — 6 categories of inferred learnings from tool data.
 * Ported from VSC_EXTENSION learningService.ts (DG-126 Phase 2B).
 * Pure functions — no side effects, no storage calls.
 */

import type { LearningEntry, ConfidenceSource } from './types.js';
import { INITIAL_CONFIDENCE } from './constants.js';

// ─── Types ──────────────────────────────────────────────────────

export interface ToolActionSummary {
  readonly toolName: string;
  readonly inputPreview: string;
  readonly filePaths: string[];
}

interface DetectedLearning {
  readonly content: string;
  readonly category: string;
}

// ─── Main Entry Point ───────────────────────────────────────────

export function detectInferredLearnings(
  toolActions: ToolActionSummary[],
  currentCycle: number,
): LearningEntry[] {
  const allFilePaths = toolActions.flatMap((a) => a.filePaths);
  const allCommands = toolActions
    .filter((a) => a.toolName === 'Bash')
    .map((a) => a.inputPreview);
  const allFilenames = allFilePaths
    .map((p) => p.split('/').pop() ?? '')
    .filter((f) => f.includes('.'));

  const detections: DetectedLearning[] = [
    ...detectTechStack(allFilePaths),
    ...detectDependencies(allCommands),
    ...detectPackageManager(allCommands),
    ...detectTestFramework(allCommands),
    ...detectFolderPatterns(allFilePaths),
    ...detectNamingConvention(allFilenames),
  ];

  return detections.map((d, i) => ({
    id: `inferred-${currentCycle}-${i}-${Date.now()}`,
    content: d.content,
    category: d.category,
    confidence: {
      score: INITIAL_CONFIDENCE.INFERRED,
      source: 'INFERRED' as ConfidenceSource,
      evidenceCount: 1,
      lastReinforced: new Date().toISOString(),
      lastReinforcedCycle: currentCycle,
    },
    createdAt: new Date().toISOString(),
    createdInCycle: currentCycle,
  }));
}

// ─── Detector 1: Tech Stack ─────────────────────────────────────

function detectTechStack(filePaths: string[]): DetectedLearning[] {
  const detections: DetectedLearning[] = [];
  const counts: Record<string, number> = {};

  for (const p of filePaths) {
    const dot = p.lastIndexOf('.');
    if (dot >= 0) {
      const ext = p.substring(dot);
      counts[ext] = (counts[ext] ?? 0) + 1;
    }
  }

  const techMap: Record<string, { tech: string; category: string }> = {
    '.ts': { tech: 'TypeScript', category: 'language' },
    '.tsx': { tech: 'React (TSX)', category: 'framework' },
    '.jsx': { tech: 'React (JSX)', category: 'framework' },
    '.py': { tech: 'Python', category: 'language' },
    '.rs': { tech: 'Rust', category: 'language' },
    '.go': { tech: 'Go', category: 'language' },
    '.css': { tech: 'CSS', category: 'styling' },
    '.scss': { tech: 'SCSS', category: 'styling' },
    '.vue': { tech: 'Vue', category: 'framework' },
    '.svelte': { tech: 'Svelte', category: 'framework' },
  };

  for (const [ext, count] of Object.entries(counts)) {
    const info = techMap[ext];
    if (info && count >= 2) {
      detections.push({
        content: `Project uses ${info.tech} (${count} ${ext} files detected)`,
        category: info.category,
      });
    }
  }

  return detections;
}

// ─── Detector 2: Dependencies ───────────────────────────────────

function detectDependencies(commands: string[]): DetectedLearning[] {
  const depPattern = /(?:npm\s+install|yarn\s+add|pnpm\s+add)\s+(?:--save-dev\s+|--save\s+|-D\s+|-S\s+)?([a-z@][a-z0-9@/._-]*)/gi;
  const pipPattern = /pip3?\s+install\s+([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const cargoPattern = /cargo\s+add\s+([a-zA-Z][a-zA-Z0-9_-]*)/g;

  const deps = new Set<string>();
  for (const cmd of commands) {
    for (const pattern of [depPattern, pipPattern, cargoPattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(cmd)) !== null) {
        deps.add(match[1]!);
      }
    }
  }

  if (deps.size > 0) {
    return [{
      content: `Project depends on: ${[...deps].join(', ')}`,
      category: 'dependencies',
    }];
  }
  return [];
}

// ─── Detector 3: Package Manager ────────────────────────────────

function detectPackageManager(commands: string[]): DetectedLearning[] {
  const joined = commands.join(' ');
  const managers = ['pnpm', 'yarn', 'npm', 'pip3', 'pip', 'cargo'] as const;

  for (const mgr of managers) {
    if (joined.includes(`${mgr} `)) {
      const name = mgr === 'pip3' ? 'pip' : mgr;
      return [{ content: `Project uses ${name} as package manager`, category: 'package-manager' }];
    }
  }
  return [];
}

// ─── Detector 4: Test Framework ─────────────────────────────────

function detectTestFramework(commands: string[]): DetectedLearning[] {
  const joined = commands.join(' ');
  const frameworks = [
    { keyword: 'vitest', name: 'Vitest' },
    { keyword: 'jest', name: 'Jest' },
    { keyword: 'mocha', name: 'Mocha' },
    { keyword: 'pytest', name: 'pytest' },
    { keyword: 'cargo test', name: 'cargo test' },
    { keyword: 'go test', name: 'go test' },
  ];

  for (const fw of frameworks) {
    if (joined.includes(fw.keyword)) {
      return [{ content: `Project uses ${fw.name} for testing`, category: 'testing' }];
    }
  }
  return [];
}

// ─── Detector 5: Folder Patterns ────────────────────────────────

function detectFolderPatterns(filePaths: string[]): DetectedLearning[] {
  const layers: Record<string, string> = {
    components: 'component-based', services: 'services layer', hooks: 'React hooks',
    utils: 'utility library', lib: 'utility library', tests: 'test directory',
    __tests__: 'test directory', spec: 'test directory', api: 'API layer',
    routes: 'API routes', store: 'state management', state: 'state management',
  };

  const detected = new Set<string>();
  for (const fp of filePaths) {
    for (const part of fp.split('/')) {
      if (layers[part]) detected.add(layers[part]!);
    }
  }

  if (detected.size >= 2) {
    return [{ content: `Project architecture: ${[...detected].join(' + ')}`, category: 'architecture' }];
  }
  return [];
}

// ─── Detector 6: Naming Convention ──────────────────────────────

function detectNamingConvention(filenames: string[]): DetectedLearning[] {
  if (filenames.length < 3) return [];

  const basenames = filenames.map((f) => f.replace(/\.\w+$/, ''));
  const patterns: Record<string, RegExp> = {
    'kebab-case': /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/,
    'camelCase': /^[a-z][a-zA-Z0-9]*$/,
    'PascalCase': /^[A-Z][a-zA-Z0-9]*$/,
    'snake_case': /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/,
  };

  for (const [name, regex] of Object.entries(patterns)) {
    const matches = basenames.filter((b) => regex.test(b));
    if (matches.length / basenames.length >= 0.6) {
      if (name === 'camelCase' && !matches.some((m) => /[A-Z]/.test(m))) continue;
      return [{ content: `Project uses ${name} file naming convention`, category: 'naming-convention' }];
    }
  }
  return [];
}
