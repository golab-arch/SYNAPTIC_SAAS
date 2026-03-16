/**
 * SAI Checklist registry — collects all 8 checks into a single array.
 */

import type { SAIChecklistItem } from '../types.js';
import { checkUnusedImports } from './unused-imports.js';
import { checkUnusedFunctions } from './unused-functions.js';
import { checkDuplication } from './duplication.js';
import { checkConsistency } from './consistency.js';
import { checkErrorHandling } from './error-handling.js';
import { checkSecuritySecrets } from './security-secrets.js';
import { checkSecurityInjection } from './security-injection.js';
import { checkFileSize } from './file-size.js';

export const DEFAULT_SAI_CHECKLIST: SAIChecklistItem[] = [
  {
    id: 'unused-imports',
    name: 'Imports declarados usados',
    severity: 'MEDIUM',
    check: checkUnusedImports,
    enabled: true,
  },
  {
    id: 'unused-functions',
    name: 'Funciones declaradas llamadas',
    severity: 'MEDIUM',
    check: checkUnusedFunctions,
    enabled: true,
  },
  {
    id: 'duplication',
    name: 'Sin duplicacion obvia',
    severity: 'LOW',
    check: checkDuplication,
    enabled: true,
  },
  {
    id: 'consistency',
    name: 'Consistencia con patrones',
    severity: 'LOW',
    check: checkConsistency,
    enabled: true,
  },
  {
    id: 'error-handling',
    name: 'Manejo de errores presente',
    severity: 'HIGH',
    check: checkErrorHandling,
    enabled: true,
  },
  {
    id: 'security-secrets',
    name: 'Sin hardcoded secrets',
    severity: 'CRITICAL',
    check: checkSecuritySecrets,
    enabled: true,
  },
  {
    id: 'security-injection',
    name: 'Sin SQL/command injection',
    severity: 'CRITICAL',
    check: checkSecurityInjection,
    enabled: true,
  },
  {
    id: 'file-size',
    name: 'Tamano razonable (<500 LOC)',
    severity: 'MEDIUM',
    check: checkFileSize,
    enabled: true,
  },
];
