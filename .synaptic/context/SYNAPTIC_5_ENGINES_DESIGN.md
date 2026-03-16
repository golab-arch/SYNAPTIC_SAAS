# SYNAPTIC 5 Engines — Technical Design Document

## Cloud SaaS Architecture for SYNAPTIC_SAAS

**Version**: 1.0
**Fecha**: 2026-03-16
**Origen**: Analisis exhaustivo de SYNAPTIC_EXPERT (Chapters I, II, III) + DG-120
**Proposito**: Guia tecnica para implementar los 5 motores diferenciadores de SYNAPTIC como modulos desacoplados en arquitectura cloud

---

## INDICE

1. [Vision General](#1-vision-general)
2. [Motor 1: Enforcement Engine](#2-motor-1-enforcement-engine)
3. [Motor 2: SAI Engine](#3-motor-2-sai-engine)
4. [Motor 3: Intelligence Engine](#4-motor-3-intelligence-engine)
5. [Motor 4: Guidance Engine](#5-motor-4-guidance-engine)
6. [Motor 5: Protocol Engine](#6-motor-5-protocol-engine)
7. [Orquestador: AgentLoopService](#7-orquestador-agentloopservice)
8. [Storage Abstraction Layer](#8-storage-abstraction-layer)
9. [Estructura de Directorios](#9-estructura-de-directorios)
10. [Interfaces Compartidas](#10-interfaces-compartidas)
11. [Roadmap de Implementacion](#11-roadmap-de-implementacion)

---

## 1. VISION GENERAL

### 1.1 Que hace SYNAPTIC diferente

SYNAPTIC no es "otro coding assistant". Es un **sistema de gobernanza para desarrollo asistido por IA** que opera sobre 5 principios universales:

| # | Principio | Motor que lo implementa |
|---|-----------|------------------------|
| P1 | Deterministic Output Validation | Enforcement Engine |
| P2 | Continuous Quality Audit | SAI Engine |
| P3 | Persistent Learning Context | Intelligence Engine |
| P4 | Guided Development (Waze) | Guidance Engine |
| P5 | Protocol-Driven Behavior | Protocol Engine |

La **Ganancia Sinaptica** es el efecto compuesto: cada ciclo exitoso mejora los ciclos futuros mediante learnings reforzados, compliance creciente, y contexto acumulado.

### 1.2 Arquitectura de Motores

```
┌─────────────────────────────────────────────────────────────────┐
│                    AgentLoopService (Orquestador)                │
│                                                                  │
│  1. User Prompt                                                  │
│     ↓                                                            │
│  2. Protocol Engine → buildSystemPrompt() + wrapUserPrompt()     │
│     ↓                                                            │
│  3. Intelligence Engine → inject learnings + decisions + context  │
│     ↓                                                            │
│  4. ILLMProvider.streamMessage() → LLM genera respuesta          │
│     ↓                                                            │
│  5. Enforcement Engine → validate() → regenerate() si falla      │
│     ↓                                                            │
│  6. SAI Engine → audit(changedFiles)                             │
│     ↓                                                            │
│  7. Intelligence Engine → persist(decision, learnings, bitacora) │
│     ↓                                                            │
│  8. Guidance Engine → recalculate(suggestions)                   │
│     ↓                                                            │
│  9. Response → SSE → Frontend                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Principios de Diseño

1. **Cada motor es un modulo independiente** con interface publica clara
2. **Storage es abstracto** — cada motor define una interface de storage, el adaptador concreto (Firestore, filesystem, memory) se inyecta
3. **Zero acoplamiento entre motores** — solo el orquestador los conecta
4. **Testeable aislado** — cada motor se testea con mocks de los demas
5. **Extensible** — agregar un Motor 6 no toca los existentes

---

## 2. MOTOR 1: ENFORCEMENT ENGINE

### 2.1 Proposito

Transforma output probabilistico del LLM en resultado deterministico validado. Es el "sistema inmunologico" que garantiza que cada respuesta cumple el protocolo SYNAPTIC.

### 2.2 Referencia en SYNAPTIC_EXPERT

| Archivo origen | LOC | Funcion |
|----------------|-----|---------|
| `packages/core/src/enforcement/enforcement-runtime.ts` | 766 | Orquestador de 4 capas |
| `packages/core/src/enforcement/response-validator.ts` | 449 | 7 checks regex estructurales |
| `packages/core/src/enforcement/template-checker.ts` | 502 | 8 secciones del template |
| `packages/core/src/enforcement/compliance-scorer.ts` | 405 | 5 metricas ponderadas + trend |
| `packages/core/src/enforcement/regeneration-engine.ts` | 414 | 4 templates reformulacion |
| `packages/core/src/enforcement/decision-gate-utils.ts` | 369 | Deteccion/validacion de DG |
| `packages/core/src/enforcement/enforcement-constants.ts` | 195 | Constantes y thresholds |
| `packages/core/src/enforcement/interfaces/` | ~324 | IResponseValidator, ITemplateChecker, IComplianceScorer |

### 2.3 Arquitectura de 4 Capas

```
Layer 1: Session Initialization
  → createSessionInitializationPrompt()
  → Establece el contrato SYNAPTIC en el system prompt

Layer 2: Prompt Wrapper
  → [ENFORCE-SYNAPTIC-PROTOCOL] tags around user prompt
  → Checklist de validacion (checkboxes) para self-check del LLM

Layer 3: Post-Response Validation
  → ResponseValidator: 7 requerimientos estructurales via regex
  → TemplateChecker: 8 secciones × regex patterns → score 0-100
  → ComplianceScorer: 5 metricas ponderadas → grade A-F

Layer 4: Regeneration Loop (Self-Healing)
  → 4 templates: NO_CODE, DECISION_GATE, MISSING_SECTIONS, GENERIC
  → Max 5 retries con feedback especifico
  → Escalate a humano si todos fallan
```

### 2.4 Interface Publica para SYNAPTIC_SAAS

```typescript
interface IEnforcementEngine {
  // Lifecycle
  initialize(config: EnforcementConfig): Promise<void>;
  dispose(): Promise<void>;

  // Layer 1: Session init prompt
  getSessionInitPrompt(): string;

  // Layer 2: Prompt wrapping
  wrapPrompt(userPrompt: string, cycle: number, loadedFiles: string[]): string;

  // Layer 3: Validation
  validate(response: string): EnforcementValidationResult;

  // Layer 4: Regeneration
  buildRegenerationMessage(
    violations: Violation[],
    attempt: number,
    maxAttempts: number
  ): string;

  // Metrics
  getComplianceReport(): ComplianceReport;
  getComplianceHistory(): ComplianceHistoryEntry[];
}

interface EnforcementConfig {
  mode: 'STRICT' | 'BALANCED' | 'ADAPTIVE';
  thresholds: { minScore: number; rejectBelow: number };
  weights: { template: number; decisionGate: number; memory: number; bitacora: number; session: number };
  maxRegenerationAttempts: number;
  templateSections: TemplateSectionDefinition[];  // CONFIGURABLE por proyecto
}

interface EnforcementValidationResult {
  valid: boolean;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  violations: Violation[];
  templateCheck: TemplateCheckResult;
  complianceMetrics: ComplianceMetrics;
}

interface Violation {
  id: string;
  section: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  penalty: number;
}
```

### 2.5 Archivos a Crear en SYNAPTIC_SAAS

```
src/engines/enforcement/
├── types.ts                    ← IEnforcementEngine, configs, results
├── enforcement-engine.ts       ← Clase principal (orquesta las 4 capas)
├── response-validator.ts       ← 7 checks regex (adaptar de EXPERT)
├── template-checker.ts         ← Secciones configurables (adaptar de EXPERT)
├── compliance-scorer.ts        ← 5 metricas + trend (adaptar de EXPERT)
├── regeneration-engine.ts      ← 4 templates reformulacion (adaptar de EXPERT)
├── decision-gate-utils.ts      ← Deteccion y validacion de Decision Gates
├── constants.ts                ← Thresholds, penalties, grades
└── index.ts                    ← Re-export publico
```

### 2.6 Adaptaciones para Cloud

| Aspecto | SYNAPTIC_EXPERT (local) | SYNAPTIC_SAAS (cloud) |
|---------|------------------------|----------------------|
| Storage de compliance history | En memoria (session) | Firestore via IEnforcementStorage |
| Template sections | Hardcoded (8 secciones fijas) | Configurable por proyecto |
| Enforcement modes | 3 modos fijos | 3 modos + custom profiles |
| Regeneration callback | Llama a LLM via bridge | Llama a ILLMProvider.sendMessage() |
| Multi-tenancy | N/A (single user) | Scoped por tenantId + projectId |

### 2.7 Decision: Template configurable

En SYNAPTIC_EXPERT las 8 secciones del template son fijas. Para SaaS, las secciones deben ser **configurables por proyecto**:

```typescript
interface TemplateSectionDefinition {
  id: string;
  name: string;
  pattern: RegExp;           // Para validacion
  required: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  subsections?: { pattern: RegExp; required: boolean }[];
}

// Default SYNAPTIC template (las 8 secciones clasicas)
const SYNAPTIC_DEFAULT_TEMPLATE: TemplateSectionDefinition[] = [
  { id: 'HEADER', name: 'Protocol Header', pattern: /SYNAPTIC PROTOCOL v[\d.]+/i, required: true, severity: 'CRITICAL' },
  { id: 'SYSTEM_STATE', name: 'System State', pattern: /SYSTEM STATE/i, required: true, severity: 'HIGH',
    subsections: [
      { pattern: /Project[:\s]+[\w-]+/i, required: true },
      { pattern: /Cycle[:\s]+\d+/i, required: true },
      { pattern: /Synaptic\s+Strength[:\s]+\d+%/i, required: true }
    ]
  },
  // ... etc
];
```

Esto permite que en el futuro un usuario configure su propio template de respuesta sin modificar el motor.

---

## 3. MOTOR 2: SAI ENGINE

### 3.1 Proposito

Sistema de Auditoria Incremental que ejecuta micro-auditorias en cada ciclo sobre archivos modificados. Detecta dead code, duplicacion, problemas de seguridad, y mantenibilidad. Persiste findings con resolucion automatica.

### 3.2 Referencia en SYNAPTIC_EXPERT

| Archivo origen | LOC | Funcion |
|----------------|-----|---------|
| `packages/core/src/enforcement/sai-constants.ts` | 210 | 8-item checklist, security patterns, scoring |
| `packages/agent/src/services/sai-persistence.service.ts` | 714 | Persistencia, finding tracking, auto-resolution |
| `packages/shared/src/types/sai.types.ts` | 154 | MicroAuditResult, AuditFinding types |
| `packages/shared/src/types/sai-persistence.types.ts` | 265 | PersistentFinding, SAIAuditState |

### 3.3 8-Item Checklist

| # | Check | Severity | Penalty | Metodo |
|---|-------|----------|---------|--------|
| 1 | Imports declarados usados | MEDIUM | -10 | Regex: extract imports → verify usage in body |
| 2 | Funciones declaradas llamadas | MEDIUM | -10 | Regex: extract func decls → verify calls |
| 3 | Sin duplicacion obvia | LOW | -5 | Pattern matching de bloques similares |
| 4 | Consistencia con patrones | LOW | -5 | Verificar naming conventions |
| 5 | Manejo de errores presente | HIGH | -15 | Detect async sin try/catch |
| 6 | Sin hardcoded secrets | CRITICAL | -25 | 7 regex patterns (apiKey, secret, token, etc) |
| 7 | Sin SQL injection patterns | CRITICAL | -25 | Template literal + SQL keyword detection |
| 8 | Tamano razonable (<500 LOC) | MEDIUM | -10 | Line count |

### 3.4 Interface Publica para SYNAPTIC_SAAS

```typescript
interface ISAIEngine {
  // Lifecycle
  initialize(config: SAIConfig): Promise<void>;
  dispose(): Promise<void>;

  // Core audit
  audit(changedFiles: FileContent[]): Promise<SAIAuditResult>;

  // Finding management
  getActiveFindings(): Promise<Finding[]>;
  getResolvedFindings(): Promise<Finding[]>;
  detectResolutions(currentFindings: Finding[]): Promise<ResolvedFinding[]>;

  // Metrics
  getAuditHistory(limit?: number): Promise<SAICycleEntry[]>;
  getScoreTrend(): Promise<TrendAnalysis>;
  getSummary(): Promise<SAIAuditSummary>;
}

interface SAIConfig {
  checklist: SAIChecklistItem[];        // Extensible: agregar checks custom
  severityPenalties: Record<Severity, number>;
  passThreshold: number;                // Default: 70
  maxFileSize: number;                  // Default: 500KB
  timeout: number;                      // Default: 5000ms
  extensionWhitelist: string[];         // ['.ts', '.tsx', '.js', etc]
  excludePatterns: string[];            // ['node_modules', 'dist', etc]
  storage: ISAIStorage;                 // Inyectable
}

interface SAIChecklistItem {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  check: (fileContent: string, filePath: string) => Finding[];
  enabled: boolean;                     // Permite desactivar checks
}

interface FileContent {
  path: string;
  content: string;
  previousContent?: string;             // Para diff-based analysis
}

interface SAIAuditResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passed: boolean;
  findings: Finding[];
  filesAudited: number;
  filesSkipped: number;
  duration: number;
}

interface Finding {
  id: string;                           // UUID estable para tracking
  type: 'dead_code' | 'duplication' | 'security' | 'maintainability' | 'consistency' | 'error_handling';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  file: string;
  line?: number;
  description: string;
  suggestion?: string;
  status: 'OPEN' | 'RESOLVED';
  detectedInCycle: number;
  resolvedInCycle?: number;
}
```

### 3.5 Archivos a Crear en SYNAPTIC_SAAS

```
src/engines/sai/
├── types.ts                    ← ISAIEngine, configs, results, findings
├── sai-engine.ts               ← Clase principal (orquesta audit pipeline)
├── checklist/
│   ├── unused-imports.ts       ← Check 1: imports no usados
│   ├── unused-functions.ts     ← Check 2: funciones no llamadas
│   ├── duplication.ts          ← Check 3: bloques duplicados
│   ├── consistency.ts          ← Check 4: naming patterns
│   ├── error-handling.ts       ← Check 5: try/catch en async
│   ├── security-secrets.ts     ← Check 6: hardcoded secrets
│   ├── security-injection.ts   ← Check 7: SQL/command injection
│   ├── file-size.ts            ← Check 8: LOC limit
│   └── index.ts                ← Registry de todos los checks
├── finding-tracker.ts          ← Tracking + auto-resolution de findings
├── constants.ts                ← Patterns, thresholds, grades
└── index.ts                    ← Re-export publico
```

### 3.6 Adaptaciones para Cloud

| Aspecto | SYNAPTIC_EXPERT (local) | SYNAPTIC_SAAS (cloud) |
|---------|------------------------|----------------------|
| File access | Lee archivos del filesystem | Recibe FileContent[] del sandbox |
| Persistence | JSON files en SYNAPTIC_AUDIT/ | Firestore via ISAIStorage |
| Checklist | 8 items fijos | Extensible: users pueden agregar checks custom |
| Finding IDs | Hash-based | UUID estable cross-session |
| Concurrent audits | Single-user | Multi-tenant: scoped por project |

### 3.7 Extensibilidad futura

1. **Custom checks**: Los usuarios pueden definir checks adicionales como funciones `(content, path) => Finding[]`
2. **AST analysis**: Integrar con TypeScript compiler API para checks semanticos (no solo regex)
3. **External linter bridge**: Mapear findings de ESLint/Prettier a findings SAI
4. **Severity weighting por proyecto**: Un proyecto puede ponderar "security" mas alto que "duplication"

---

## 4. MOTOR 3: INTELLIGENCE ENGINE

### 4.1 Proposito

Es la **memoria a largo plazo** de SYNAPTIC. Acumula decisiones, learnings con sistema de confianza, notas de contexto, y estado de implementacion. Persiste entre ciclos y sesiones. Alimenta al Protocol Engine con contexto relevante.

### 4.2 Referencia en SYNAPTIC_EXPERT

| Archivo origen | LOC | Funcion |
|----------------|-----|---------|
| `packages/agent/src/services/intelligence-manager.ts` | 1040 | Hub central: decisions, learnings, bitacora, session |
| `packages/agent/src/services/confidence-system.ts` | 344 | Scoring, reinforcement, decay, filtering |
| `packages/agent/src/services/contradiction-detector.ts` | 257 | 9 categorias excluyentes, negation detection |

### 4.3 Sub-modulos (descomposicion del "god object" de 1040 LOC)

El `intelligence-manager.ts` original mezcla demasiadas responsabilidades. Para SaaS se descompone en 5 sub-modulos:

```
Intelligence Engine
├── Decision Recorder      ← Registra decisiones de Decision Gates
├── Learning Manager        ← CRUD de learnings con confidence
│   ├── Confidence System   ← Scoring, reinforcement, decay
│   └── Contradiction Detector ← Deteccion de conflictos
├── Bitacora Manager        ← Append/read/fragment bitacora
├── Context Manager         ← Lee/escribe context/ (REQUIREMENTS, ROADMAP)
└── Session Manager         ← session.json: cycle, strength, compliance
```

### 4.4 Sistema de Confianza de Learnings

```
OBSERVATION → INITIAL SCORE → REINFORCEMENT → DECAY → ARCHIVE

Fuentes de confianza:
  EXPLICIT (0.9)  ← El usuario lo afirmo directamente
  REPEATED (0.7)  ← Observado 3+ veces independientemente
  INFERRED (0.3)  ← Deducido de una sola observacion

Reinforcement (por re-observacion):
  EXPLICIT: +0.05 per observation
  REPEATED: +0.10 per observation
  INFERRED: +0.15 per observation

Auto-promotion:
  INFERRED con 3+ observations y score >= 0.7 → se promueve a REPEATED

Temporal Decay:
  Grace period: 20 ciclos sin refuerzo
  Decay rate: -0.1/ciclo despues del grace period
  Archive threshold: score < 0.2 → learning se archiva (no se elimina)

Injection threshold:
  Solo learnings con confidence >= 0.5 se inyectan al prompt
  Max 5-10 items, ordenados por score descendente
```

### 4.5 Deteccion de Contradicciones

9 categorias mutuamente excluyentes:

```
state-management: [redux, zustand, mobx, jotai, recoil, valtio]
styling:          [tailwind, styled-components, css-modules, emotion, sass]
testing:          [jest, vitest, mocha, cypress, playwright]
package-manager:  [npm, yarn, pnpm, bun]
framework:        [next, remix, gatsby, nuxt, sveltekit]
database:         [postgresql, mysql, mongodb, sqlite, dynamodb]
orm:              [prisma, drizzle, typeorm, sequelize, mongoose]
bundler:          [webpack, vite, esbuild, turbopack, rollup]
runtime:          [node, deno, bun]
```

Resolucion: si confianza difiere >0.2, el de menor confianza pierde. Si son similares, se marca como conflicto.

### 4.6 BITACORA Fragmentada (NUEVA FUNCIONALIDAD)

En SYNAPTIC_EXPERT la BITACORA crece ilimitadamente (~50-100 lineas/ciclo, 11K+ lineas en produccion). Para SaaS:

```
Fragmentacion:
  - Max 500 lineas por fragmento
  - Formato: BITACORA_001.md, BITACORA_002.md, ...
  - Indice: BITACORA_INDEX.json con metadata por fragmento
  - El fragmento activo (el ultimo) es el unico que se modifica
  - Fragmentos anteriores son read-only (inmutables)

Acceso:
  - Para inyeccion al prompt: leer ultimos 15 ciclos del fragmento activo
  - Para busqueda historica: consultar indice → leer fragmento relevante
  - Para guidance: escanear indice de fragmentos para completitud

Estructura del indice:
  {
    "fragments": [
      { "id": "001", "startCycle": 1, "endCycle": 47, "lines": 498, "closed": true },
      { "id": "002", "startCycle": 48, "endCycle": null, "lines": 234, "closed": false }
    ],
    "totalCycles": 52,
    "lastUpdated": "2026-03-16T..."
  }
```

### 4.7 Interface Publica para SYNAPTIC_SAAS

```typescript
interface IIntelligenceEngine {
  // Lifecycle
  initialize(config: IntelligenceConfig): Promise<void>;
  dispose(): Promise<void>;

  // Decisions
  recordDecision(decision: DecisionRecord): Promise<void>;
  getDecisions(limit?: number): Promise<DecisionRecord[]>;

  // Learnings
  addLearning(learning: LearningEntry): Promise<void>;
  getLearnings(options?: { minConfidence?: number; limit?: number }): Promise<LearningEntry[]>;
  reinforceLearning(learningId: string, source: ConfidenceSource): Promise<void>;
  applyDecay(currentCycle: number): Promise<number>;  // Returns archived count
  detectContradictions(newLearning: LearningEntry): Promise<Contradiction[]>;

  // Bitacora
  appendBitacora(entry: BitacoraCycleEntry): Promise<void>;
  getRecentBitacora(limit?: number): Promise<BitacoraCycleEntry[]>;
  getBitacoraFragment(fragmentId: string): Promise<string>;
  getBitacoraIndex(): Promise<BitacoraIndex>;

  // Context
  getContextDocuments(): Promise<ContextDocument[]>;
  getIntelligenceSummary(): Promise<IntelligenceSummary>;  // Para inyeccion al prompt

  // Session
  getSession(): Promise<SynapticSession>;
  updateSession(updates: Partial<SynapticSession>): Promise<void>;
  incrementCycle(): Promise<number>;
}

interface IntelligenceConfig {
  storage: IIntelligenceStorage;        // Inyectable
  confidence: {
    injectionThreshold: number;         // Default: 0.5
    gracePeriod: number;                // Default: 20 cycles
    decayRate: number;                  // Default: 0.1/cycle
    archiveThreshold: number;           // Default: 0.2
    maxInjected: number;                // Default: 10
  };
  bitacora: {
    maxLinesPerFragment: number;        // Default: 500
    recentCyclesForPrompt: number;      // Default: 15
  };
  contradictionCategories: ContradictionCategory[];
}

interface DecisionRecord {
  decisionId: string;                   // "DG-047"
  cycle: number;
  timestamp: string;
  decisionPoint: string;
  options: {
    optionA: DecisionOption;
    optionB: DecisionOption;
    optionC: DecisionOption;
  };
  selectedOption: 'A' | 'B' | 'C';
  userRationale?: string;
  outcome?: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
}

interface LearningEntry {
  id: string;
  content: string;
  category: string;
  confidence: {
    score: number;
    source: 'EXPLICIT' | 'REPEATED' | 'INFERRED';
    evidenceCount: number;
    lastReinforced: string;
    lastReinforcedCycle: number;
  };
  createdAt: string;
  createdInCycle: number;
}

interface BitacoraCycleEntry {
  cycleId: number;
  traceId: string;
  timestamp: string;
  phase: string;
  result: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  duration: string;
  promptOriginal: string;
  decisionGate: { optionA: string; optionB: string; optionC: string } | null;
  optionSelected: { option: string; title: string } | null;
  artifacts: string[];
  metrics: {
    protocolCompliance: number;
    decisionGatePresented: boolean;
    memoryUpdated: boolean;
    reformulationsNeeded: number;
  };
  lessonsLearned: string[];
  synapticStrength: number;
  saiAudit?: { score: number; grade: string; findingsCount: number };
}

interface SynapticSession {
  sessionId: string;
  currentCycle: number;
  synapticStrength: number;             // min(cycle * 3, 100)
  enforcement: { mode: string };
  agentState: {
    complianceScore: number;
    violationsCount: number;
    successfulCycles: number;
  };
}
```

### 4.8 Archivos a Crear en SYNAPTIC_SAAS

```
src/engines/intelligence/
├── types.ts                    ← IIntelligenceEngine, todos los types
├── intelligence-engine.ts      ← Clase principal (facade sobre sub-modulos)
├── decision-recorder.ts        ← CRUD de decisiones
├── learning-manager.ts         ← CRUD de learnings
├── confidence-system.ts        ← Scoring, reinforcement, decay (adaptar de EXPERT)
├── contradiction-detector.ts   ← 9 categorias + negation (adaptar de EXPERT)
├── bitacora-manager.ts         ← Fragmentacion + append + read
├── context-manager.ts          ← Lee context/ documents
├── session-manager.ts          ← session state tracking
├── constants.ts                ← Categories, thresholds, defaults
└── index.ts                    ← Re-export publico
```

### 4.9 Adaptaciones para Cloud

| Aspecto | SYNAPTIC_EXPERT (local) | SYNAPTIC_SAAS (cloud) |
|---------|------------------------|----------------------|
| INTELLIGENCE.json | Archivo local | Firestore document per project |
| BITACORA.md | Archivo unico creciente | Fragmentado: max 500 lineas/fragmento |
| session.json | Archivo local | Firestore document per session |
| Backups | Archivos rotados (max 10) | Firestore versioning / subcollection |
| Learnings injection | Top 5 por score | Top N configurable + futuro RLM |
| Multi-tenancy | N/A | Scoped por tenantId + projectId |

### 4.10 Extensibilidad futura

1. **RLM (Retrieval-augmented Learning Memory)**: Reemplazar getLearnings() con retrieval semantico via embeddings. La interface no cambia — solo la implementacion interna.
2. **Cross-project learnings**: Learnings de alta confianza (>0.8) pueden ser "sugeridos" en proyectos nuevos del mismo tenant.
3. **Decision graph**: Visualizar arbol de decisiones con dependencias.
4. **BITACORA search**: Full-text search sobre fragmentos historicos.

---

## 5. MOTOR 4: GUIDANCE ENGINE

### 5.1 Proposito

El "Waze del desarrollo" — analiza el ROADMAP, los context/ documents, y la BITACORA para generar sugerencias priorizadas de "que hacer ahora". Reduce la carga cognitiva del usuario.

### 5.2 Referencia en SYNAPTIC_EXPERT

| Archivo origen | LOC | Funcion |
|----------------|-----|---------|
| `packages/agent/src/services/synaptic-guidance.ts` | 626 | Escaneo de context/, matching contra BITACORA, generacion de sugerencias |

### 5.3 Mecanismo de Funcionamiento

```
1. SCAN: Leer context/ROADMAP.md + context/REQUIREMENTS.md + otros context/*.md
2. PARSE: Extraer items del roadmap (features, tasks, milestones)
3. MATCH: Comparar contra BITACORA para detectar items completados (regex matching)
4. CALCULATE: Calcular progreso por fase/milestone
5. PRIORITIZE: Ordenar pendientes por prioridad + dependencias
6. SUGGEST: Generar NextStepSuggestion[] con prompts listos para ejecutar
```

### 5.4 Interface Publica para SYNAPTIC_SAAS

```typescript
interface IGuidanceEngine {
  // Lifecycle
  initialize(config: GuidanceConfig): Promise<void>;
  dispose(): Promise<void>;

  // Core
  generateGuidance(): Promise<RoadmapGuidance>;
  getSuggestions(limit?: number): Promise<NextStepSuggestion[]>;

  // Progress tracking
  markCompleted(suggestionId: string, cycle: number): Promise<void>;
  getProgress(): Promise<ProjectProgress>;

  // Roadmap management
  getRoadmapItems(): Promise<RoadmapItem[]>;
  updateRoadmapItem(itemId: string, updates: Partial<RoadmapItem>): Promise<void>;
}

interface GuidanceConfig {
  storage: IGuidanceStorage;
  intelligenceEngine: IIntelligenceEngine;  // Para leer bitacora y context
  maxSuggestions: number;                   // Default: 5
  priorityWeights: {
    urgency: number;       // Peso de urgencia temporal
    dependency: number;    // Peso de dependencias resueltas
    complexity: number;    // Peso inverso de complejidad (simple primero)
  };
}

interface NextStepSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'fix' | 'refactor' | 'test' | 'docs' | 'config';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedPrompt: string;             // Prompt listo para copiar/pegar al LLM
  effort: 'small' | 'medium' | 'large';
  status: 'pending' | 'completed' | 'in_progress';
  completedInCycle?: number;
  dependsOn?: string[];                // IDs de items prerequisito
}

interface RoadmapGuidance {
  orientation: string;                 // Resumen textual del estado
  progress: ProjectProgress;
  nextSteps: NextStepSuggestion[];
  blockers: string[];
  generatedAt: string;
}

interface ProjectProgress {
  totalItems: number;
  completedItems: number;
  percentage: number;
  byPhase: { phase: string; total: number; completed: number; percentage: number }[];
}
```

### 5.5 Archivos a Crear en SYNAPTIC_SAAS

```
src/engines/guidance/
├── types.ts                    ← IGuidanceEngine, suggestions, progress
├── guidance-engine.ts          ← Clase principal
├── roadmap-analyzer.ts         ← Parsea ROADMAP.md → RoadmapItem[]
├── progress-tracker.ts         ← Compara roadmap vs bitacora
├── suggestion-generator.ts     ← Genera suggestions priorizadas
├── constants.ts                ← Priority weights, categories
└── index.ts                    ← Re-export publico
```

### 5.6 Adaptaciones para Cloud

| Aspecto | SYNAPTIC_EXPERT (local) | SYNAPTIC_SAAS (cloud) |
|---------|------------------------|----------------------|
| Context files | Lee filesystem directo | Lee via Intelligence Engine (context manager) |
| BITACORA scan | Regex sobre archivo local | Consulta bitacora fragmentada via Intelligence |
| Suggestions | Generadas on-demand | Cacheadas + recalculadas post-ciclo |
| Dependencies | No tracked | Dependency graph entre roadmap items |
| Progress UI | Solo texto | Dashboard interactivo con progress bars |

### 5.7 Extensibilidad futura

1. **Roadmap interactivo**: UI donde usuario drag-and-drop reordena items
2. **LLM-assisted estimation**: Pedir al LLM que estime effort de cada step
3. **Dependency tracking**: Grafo de dependencias entre items, no sugerir bloqueados
4. **Smart prioritization**: Considerar velocity del equipo (ciclos/dia) para priorizar
5. **Milestone deadlines**: Integrar fechas y alertar si hay riesgo de retraso

---

## 6. MOTOR 5: PROTOCOL ENGINE

### 6.1 Proposito

Carga, cachea, dosifica y construye el protocolo SYNAPTIC. Controla cuantos tokens de protocolo se inyectan segun el ciclo actual. Construye el system prompt completo y envuelve los user prompts.

### 6.2 Referencia en SYNAPTIC_EXPERT

| Archivo origen | LOC | Funcion |
|----------------|-----|---------|
| `packages/shared/src/protocol-loader.ts` | 557 | Singleton, cache TTL 60s, 3 modos de inyeccion |
| `packages/agent/src/agent.ts` (lineas 1710-2120) | ~410 | buildSystemPrompt(): 6 secciones concatenadas |
| `packages/agent/src/agent.ts` (lineas 2228-2304) | ~76 | wrapPromptWithEnforcement(): markers + checklist |

### 6.3 Cycle-Aware Injection

```
Ciclo 1 (FULL):      [===== CORE =====][========== EXTENDED ==========]  ~7,300 tokens
Ciclos 2-5 (PARTIAL): [===== CORE =====][== EXTENDED parcial ==]          ~4,500 tokens
Ciclos 6+ (CORE_ONLY): [===== CORE =====]                                 ~2,800 tokens
```

Rationale: En ciclo 1 el LLM necesita todo el contexto. A partir del ciclo 6, el conversation history ya contiene ejemplos del formato esperado.

### 6.4 System Prompt Construction (6 secciones)

| Seccion | Fuente | Budget tokens | Control |
|---------|--------|---------------|---------|
| Master Protocol | SYNAPTIC_CORE + EXTENDED | 2,800-7,300 | Cycle-aware mode |
| Director Files | MANTRA + RULES + DESIGN_DOC | ~3,500 max | Truncation: RULES@2000, DESIGN@1500 |
| Intelligence Summary | INTELLIGENCE (decisions + learnings) | ~1,000 | Top 10 decisions + top 5 learnings (confidence >= 0.5) |
| Bitacora History | BITACORA (ultimos 15 ciclos) | ~800 | Summarized |
| Language Directive | User language detection | ~200 | Solo si no-ingles |
| Mode Covenant | Hardcoded | ~500 | Full covenant o suffix minimal |

Total estimado: ~5,000-13,000 tokens de system prompt.

### 6.5 Interface Publica para SYNAPTIC_SAAS

```typescript
interface IProtocolEngine {
  // Lifecycle
  initialize(config: ProtocolConfig): Promise<void>;
  dispose(): Promise<void>;

  // Protocol content
  getProtocolContent(cycle: number): ProtocolContent;
  getInjectionMode(cycle: number): 'FULL' | 'PARTIAL' | 'CORE_ONLY';

  // System prompt
  buildSystemPrompt(context: SystemPromptContext): Promise<string>;

  // User prompt wrapping
  wrapUserPrompt(params: PromptWrapParams): string;

  // Token management
  estimateTokenUsage(cycle: number): TokenEstimate;
}

interface ProtocolConfig {
  protocolVersion: string;              // "3.0"
  coreProtocol: string;                 // Content of SYNAPTIC_CORE.md
  extendedProtocol?: string;            // Content of SYNAPTIC_EXTENDED.md
  covenant: string;                     // The SYNAPTIC Covenant text
  tokenBudgets: {
    masterProtocol: { full: number; partial: number; coreOnly: number };
    directorFiles: { rules: number; designDoc: number; mantra: number };
    intelligence: { decisions: number; learnings: number };
    bitacora: number;
    language: number;
    covenant: number;
  };
  cacheTTL: number;                     // Default: 60s
}

interface SystemPromptContext {
  cycle: number;
  mode: 'SYNAPTIC' | 'ARCHITECT' | 'IMMEDIATE';
  directorFiles: { mantra: string; rules: string; designDoc: string };
  intelligenceSummary: IntelligenceSummary;
  bitacoraHistory: string;
  userLanguage?: string;
  modelId: string;                      // Para ajustar budget segun capacidad del modelo
}

interface PromptWrapParams {
  userPrompt: string;
  cycle: number;
  loadedFiles: string[];
  enforcementMode: string;
}

interface TokenEstimate {
  protocol: number;
  directorFiles: number;
  intelligence: number;
  bitacora: number;
  total: number;
  remainingForUser: number;             // Context window - total
}
```

### 6.6 Archivos a Crear en SYNAPTIC_SAAS

```
src/engines/protocol/
├── types.ts                    ← IProtocolEngine, configs, contexts
├── protocol-engine.ts          ← Clase principal
├── protocol-loader.ts          ← Carga y cachea CORE + EXTENDED (adaptar de EXPERT)
├── prompt-builder.ts           ← Construye system prompt (6 secciones)
├── prompt-wrapper.ts           ← Envuelve user prompts con enforcement markers
├── token-estimator.ts          ← Estima uso de tokens por seccion
├── constants.ts                ← Budgets, modes, defaults
└── index.ts                    ← Re-export publico
```

### 6.7 Adaptaciones para Cloud

| Aspecto | SYNAPTIC_EXPERT (local) | SYNAPTIC_SAAS (cloud) |
|---------|------------------------|----------------------|
| Protocol files | Lee de filesystem | Almacenados en Firestore o bundled con la app |
| Token budgets | Fijos | Dinamicos segun modelo elegido (Haiku < Opus) |
| Language detection | Basada en prompt history | Configurable por usuario |
| Mode selection | 3 modos fijos | Configurable por proyecto |
| Cache | In-memory singleton | Redis/in-memory per-instance |

### 6.8 Extensibilidad futura

1. **Protocol versioning**: Soportar v3.0, v4.0 simultaneamente
2. **Custom protocols**: Usuarios definen su propio template de respuesta
3. **Model-aware budgets**: Ajustar inyeccion segun context window del modelo
4. **Protocol marketplace**: Templates SYNAPTIC especializados por industria
5. **A/B testing**: Experimentar con diferentes protocol configs por proyecto

---

## 7. ORQUESTADOR: AgentLoopService

### 7.1 Proposito

Es el "director de orquesta" que llama a los 5 motores en secuencia correcta para procesar cada ciclo. NO contiene logica de negocio — solo orquesta.

### 7.2 Flujo de Ejecucion

```typescript
class AgentLoopService {
  constructor(
    private protocolEngine: IProtocolEngine,
    private intelligenceEngine: IIntelligenceEngine,
    private enforcementEngine: IEnforcementEngine,
    private saiEngine: ISAIEngine,
    private guidanceEngine: IGuidanceEngine,
    private llmProvider: ILLMProvider,
    private toolExecutor: IToolExecutor,
  ) {}

  async execute(request: ExecutionRequest): AsyncGenerator<SSEEvent> {
    const cycle = await this.intelligenceEngine.incrementCycle();

    // STEP 1: Build system prompt (Protocol + Intelligence)
    const systemPrompt = await this.protocolEngine.buildSystemPrompt({
      cycle,
      directorFiles: await this.getDirectorFiles(),
      intelligenceSummary: await this.intelligenceEngine.getIntelligenceSummary(),
      bitacoraHistory: await this.getBitacoraForPrompt(),
      modelId: request.modelId,
    });

    // STEP 2: Wrap user prompt with enforcement
    const wrappedPrompt = this.protocolEngine.wrapUserPrompt({
      userPrompt: request.prompt,
      cycle,
      loadedFiles: ['MANTRA', 'RULES', 'DESIGN_DOC', 'INTELLIGENCE'],
      enforcementMode: 'STRICT',
    });

    // STEP 3: LLM interaction loop (stream + tool use)
    let response = '';
    for await (const chunk of this.llmProvider.streamMessage({
      systemPrompt,
      messages: [...request.history, { role: 'user', content: wrappedPrompt }],
      tools: this.toolExecutor.getToolDefinitions(),
      model: request.modelId,
    })) {
      if (chunk.type === 'text') {
        response += chunk.text;
        yield { event: 'message', data: chunk.text };
      } else if (chunk.type === 'tool_use') {
        const result = await this.toolExecutor.execute(chunk.tool, chunk.args);
        yield { event: 'tool_result', data: result };
        // Feed result back to LLM (next iteration)
      }
    }

    // STEP 4: Enforcement validation
    let validationResult = this.enforcementEngine.validate(response);
    let attempts = 1;

    while (!validationResult.valid && attempts < 5) {
      const feedback = this.enforcementEngine.buildRegenerationMessage(
        validationResult.violations, attempts, 5
      );
      response = await this.regenerate(feedback, request);
      validationResult = this.enforcementEngine.validate(response);
      attempts++;
      yield { event: 'regeneration', data: { attempt: attempts, score: validationResult.score } };
    }

    // STEP 5: SAI audit (if files changed)
    const changedFiles = this.extractChangedFiles(response);
    if (changedFiles.length > 0) {
      const auditResult = await this.saiEngine.audit(changedFiles);
      yield { event: 'sai_audit', data: auditResult };
    }

    // STEP 6: Persist intelligence
    await this.intelligenceEngine.appendBitacora(this.buildBitacoraEntry(cycle, response, validationResult));
    await this.intelligenceEngine.updateSession({
      currentCycle: cycle,
      synapticStrength: Math.min(cycle * 3, 100),
    });

    // STEP 7: Recalculate guidance
    const guidance = await this.guidanceEngine.generateGuidance();

    yield { event: 'done', data: { cycle, compliance: validationResult.score, guidance: guidance.nextSteps.slice(0, 3) } };
  }
}
```

### 7.3 Principio clave

El orquestador **NO tiene logica de enforcement, ni de scoring, ni de learnings**. Solo llama a los motores en orden y pasa los resultados entre ellos. Si manana se agrega un Motor 6 (e.g., Cost Estimation), solo se modifica el orquestador para invocarlo en el paso correcto.

---

## 8. STORAGE ABSTRACTION LAYER

### 8.1 Principio

Cada motor define una interface de storage. El adaptador concreto se inyecta en el constructor:

```typescript
// Interface abstracta (en el motor)
interface IIntelligenceStorage {
  // Decisions
  saveDecision(tenantId: string, projectId: string, decision: DecisionRecord): Promise<void>;
  getDecisions(tenantId: string, projectId: string, limit?: number): Promise<DecisionRecord[]>;

  // Learnings
  saveLearning(tenantId: string, projectId: string, learning: LearningEntry): Promise<void>;
  getLearnings(tenantId: string, projectId: string): Promise<LearningEntry[]>;
  updateLearning(tenantId: string, projectId: string, learningId: string, updates: Partial<LearningEntry>): Promise<void>;

  // Bitacora
  appendBitacora(tenantId: string, projectId: string, entry: BitacoraCycleEntry): Promise<void>;
  getRecentBitacora(tenantId: string, projectId: string, limit: number): Promise<BitacoraCycleEntry[]>;

  // Session
  getSession(tenantId: string, projectId: string): Promise<SynapticSession>;
  updateSession(tenantId: string, projectId: string, session: Partial<SynapticSession>): Promise<void>;
}

// Adaptador concreto (fuera del motor)
class FirestoreIntelligenceStorage implements IIntelligenceStorage {
  constructor(private db: Firestore) {}
  // ... implementacion con db.collection('tenants/{tenantId}/projects/{projectId}/decisions')
}

// Para testing
class InMemoryIntelligenceStorage implements IIntelligenceStorage {
  private store = new Map();
  // ... implementacion en memoria
}
```

### 8.2 Storage interfaces por motor

| Motor | Storage Interface | Colecciones Firestore |
|-------|------------------|----------------------|
| Enforcement | IEnforcementStorage | compliance_history, violations |
| SAI | ISAIStorage | audit_history, findings |
| Intelligence | IIntelligenceStorage | decisions, learnings, bitacora, sessions |
| Guidance | IGuidanceStorage | suggestions, roadmap_items, progress |
| Protocol | IProtocolStorage | protocol_configs (o bundled) |

---

## 9. ESTRUCTURA DE DIRECTORIOS

```
src/
├── engines/
│   ├── enforcement/              ← Motor 1
│   │   ├── types.ts
│   │   ├── enforcement-engine.ts
│   │   ├── response-validator.ts
│   │   ├── template-checker.ts
│   │   ├── compliance-scorer.ts
│   │   ├── regeneration-engine.ts
│   │   ├── decision-gate-utils.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── sai/                      ← Motor 2
│   │   ├── types.ts
│   │   ├── sai-engine.ts
│   │   ├── checklist/
│   │   │   ├── unused-imports.ts
│   │   │   ├── unused-functions.ts
│   │   │   ├── duplication.ts
│   │   │   ├── consistency.ts
│   │   │   ├── error-handling.ts
│   │   │   ├── security-secrets.ts
│   │   │   ├── security-injection.ts
│   │   │   ├── file-size.ts
│   │   │   └── index.ts
│   │   ├── finding-tracker.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── intelligence/             ← Motor 3
│   │   ├── types.ts
│   │   ├── intelligence-engine.ts
│   │   ├── decision-recorder.ts
│   │   ├── learning-manager.ts
│   │   ├── confidence-system.ts
│   │   ├── contradiction-detector.ts
│   │   ├── bitacora-manager.ts
│   │   ├── context-manager.ts
│   │   ├── session-manager.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── guidance/                 ← Motor 4
│   │   ├── types.ts
│   │   ├── guidance-engine.ts
│   │   ├── roadmap-analyzer.ts
│   │   ├── progress-tracker.ts
│   │   ├── suggestion-generator.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── protocol/                 ← Motor 5
│   │   ├── types.ts
│   │   ├── protocol-engine.ts
│   │   ├── protocol-loader.ts
│   │   ├── prompt-builder.ts
│   │   ├── prompt-wrapper.ts
│   │   ├── token-estimator.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   └── index.ts                  ← Re-export de todos los motores
├── storage/
│   ├── interfaces.ts             ← Todas las I*Storage interfaces
│   ├── firestore/                ← Adaptadores Firestore
│   │   ├── firestore-enforcement.ts
│   │   ├── firestore-sai.ts
│   │   ├── firestore-intelligence.ts
│   │   ├── firestore-guidance.ts
│   │   └── index.ts
│   └── memory/                   ← Adaptadores in-memory (para tests)
│       ├── memory-enforcement.ts
│       ├── memory-sai.ts
│       ├── memory-intelligence.ts
│       ├── memory-guidance.ts
│       └── index.ts
├── providers/                    ← (ya existe del ciclo 1)
├── orchestrator/                 ← (ya existe del ciclo 1, refactorizar)
├── tools/                        ← (ya existe del ciclo 1)
├── auth/                         ← (ya existe del ciclo 1)
├── keys/                         ← (ya existe del ciclo 1)
├── api/                          ← (ya existe del ciclo 1)
└── index.ts
```

---

## 10. INTERFACES COMPARTIDAS

```typescript
// Todos los motores comparten este patron base
interface IEngine {
  initialize(config: unknown): Promise<void>;
  dispose(): Promise<void>;
}

// Todos los motores soportan multi-tenancy
interface TenantScope {
  tenantId: string;
  projectId: string;
}

// Severidades compartidas
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Grades compartidos
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

// Trend analysis compartido
type Trend = 'IMPROVING' | 'STABLE' | 'DECLINING';
```

---

## 11. ROADMAP DE IMPLEMENTACION

### Fase 0: Foundation (ya completada en ciclo 1)
- [x] ILLMProvider interface + stubs de 4 providers
- [x] AgentLoopService stub
- [x] API routes stubs
- [x] TypeScript + ESLint + Prettier

### Fase 1: Core Engines (proxima)
- [ ] Enforcement Engine (adaptar de EXPERT: ~3,400 LOC)
- [ ] Protocol Engine (adaptar de EXPERT: ~1,040 LOC)
- [ ] Intelligence Engine types + session manager
- [ ] Refactorizar AgentLoopService para usar engines

### Fase 2: Functional Agent Loop
- [ ] AnthropicProvider funcional (primer provider)
- [ ] AgentLoopService ejecutando: prompt → LLM → enforcement → response
- [ ] Intelligence Engine: bitacora + decisions
- [ ] In-memory storage (para desarrollo)

### Fase 3: Full Intelligence + SAI
- [ ] Intelligence Engine completo: learnings + confidence + contradiction
- [ ] SAI Engine con 8 checks
- [ ] BITACORA fragmentada
- [ ] Guidance Engine basico

### Fase 4: Cloud Storage + Multi-Provider
- [ ] Firestore storage adapters
- [ ] OpenAI + Gemini + OpenRouter providers
- [ ] BYOK key management
- [ ] Multi-tenancy scoping

### Fase 5: Web UI + Production
- [ ] Chat interface con SSE streaming
- [ ] Decision Gate UI interactivo
- [ ] Dashboard de metricas (compliance, SAI, strength)
- [ ] Guidance panel (sugerencias, roadmap progress)

---

## REFERENCIA CRUZADA

| Motor | Archivos en SYNAPTIC_EXPERT | LOC |
|-------|---------------------------|-----|
| Enforcement | `packages/core/src/enforcement/` (16 files) | ~3,400 |
| SAI | `sai-constants.ts` + `sai-persistence.service.ts` + types | ~1,340 |
| Intelligence | `intelligence-manager.ts` + `confidence-system.ts` + `contradiction-detector.ts` | ~1,680 |
| Guidance | `synaptic-guidance.ts` | 626 |
| Protocol | `protocol-loader.ts` + agent.ts sections | ~1,040 |
| **Total** | | **~8,080** |

Consultar implementaciones en: `d:\GoLAB\PROYECTOS\SYNAPTIC_EXPERT\`

**IMPORTANTE**: SYNAPTIC_EXPERT es READ-ONLY reference. No modificar desde este proyecto.

---

*SYNAPTIC 5 Engines Design — v1.0*
*Documento tecnico para SYNAPTIC_SAAS*
*2026-03-16*
