# Chapter I: Anatomy of the Synaptic Heart

## Anatomía del Corazón Sináptico

---

## 1. System Identity — Identidad del Sistema

SYNAPTIC es un **protocol-enforced AI development system** — un sistema que transforma la naturaleza probabilística de los Large Language Models en outputs deterministas, gobernados y trazables para asistir el ciclo de vida completo de un proyecto de software.

### The Synaptic Equation

```
Setup Inteligente + Enforcement Nativo + Control Persistente = Evolución Garantizada
```

Esta ecuación, definida en `SYNAPTIC_CORE.md` línea 14, captura la esencia del sistema: la combinación de una configuración inteligente inicial, un sistema de enforcement que no requiere recordatorios manuales, y un control que persiste entre ciclos, produce una evolución medible y garantizada del proyecto.

### The SYNAPTIC Acronym

Cada letra define un pilar funcional del sistema (`SYNAPTIC_CORE.md` líneas 37-44):

| Letra | Pilar | Función |
|-------|-------|---------|
| **S**etup | Configuración inteligente | Inicialización de workspace con archivos directores |
| **Y**ielding | Control de cumplimiento | Enforcement que no cede ante desviaciones |
| **N**eural | Arquitectura auto-generada | Decisiones que generan estructura |
| **A**daptive | Inicialización adaptada | Contexto personalizado por proyecto |
| **P**ersistent | Protocolo sin degradación | El protocolo no se debilita con el tiempo |
| **T**raceable | Evolución medible | Synaptic Strength, Compliance Score, SAI Score |
| **I**ntelligent | Agentes con memoria | INTELLIGENCE.json acumula conocimiento |
| **C**ontrolled | Ciclos con enforcement | Cada ciclo pasa por validación |

---

## 2. Monorepo Architecture — Arquitectura del Monorepo

SYNAPTIC se organiza como un monorepo con 8 packages (más 2 standalone). Cada package tiene una responsabilidad clara y dependencias unidireccionales.

```
                    ┌──────────────┐
                    │   @shared    │  Tipos, constantes, protocol-loader
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴────┐ ┌────┴─────┐
        │   @core   │ │  @mcp  │ │@workspace │
        │ Enforce   │ │ Tools  │ │ Persist   │
        └─────┬─────┘ └────────┘ └──────────┘
              │
        ┌─────┴─────┐
        │  @agent   │  Orchestration: Claude ↔ Protocol ↔ Tools
        └─────┬─────┘
              │
       ┌──────┼──────┐
       │             │
  ┌────┴───┐   ┌────┴───┐
  │  @api  │   │  @web  │
  │ HTTP   │   │ Next.js│
  └────────┘   └────────┘
```

| Package | Rol | Dependencias |
|---------|-----|--------------|
| `@synaptic-sre/shared` | Tipos TypeScript, constantes, protocol-loader | Ninguna |
| `@synaptic-sre/core` | Enforcement engine, template checker, compliance scorer, SAI constants | shared |
| `@synaptic-sre/agent` | Orquestación del ciclo: Claude API ↔ protocol enforcement ↔ tools | core, shared |
| `@synaptic-sre/api` | HTTP server (Fastify), endpoints REST, persistencia SQLite | core, shared |
| `@synaptic-sre/web` | Dashboard web (Next.js), UI interactiva para el usuario | shared |
| `@synaptic-sre/mcp` | Model Context Protocol tools (decision-gate, guidance) | shared |
| `@synaptic-sre/enforcement` | Standalone enforcement (para VSCode extension) | Ninguna (pure TS) |
| `@synaptic-sre/workspace` | Standalone workspace persistence (para VSCode extension) | Ninguna (pure TS) |

**Principio de diseño**: Los packages `enforcement` y `workspace` tienen **cero dependencias runtime** — son TypeScript puro portátil, diseñados para ser consumidos tanto por el web agent como por la extensión VSCode.

---

## 3. Director Files System — Sistema de Archivos Directores

El directorio `.synaptic/` es el **sistema nervioso central** del proyecto. Se crea al inicializar un workspace y persiste entre sesiones.

### Directory Layout

```
project-root/
└── .synaptic/
    ├── MANTRA.md            # Identidad: "quién soy" del proyecto
    ├── RULES.md             # Restricciones: "qué NO debo hacer"
    ├── DESIGN_DOC.md        # Arquitectura: "cómo está construido"
    ├── ENFORCEMENT.md       # Configuración de enforcement
    ├── session.json         # Estado del ciclo actual (machine-readable)
    ├── INTELLIGENCE.json    # Memoria acumulada del proyecto
    ├── BITACORA.md          # Registro cronológico de todos los ciclos
    ├── context/
    │   ├── REQUIREMENTS.md  # Requerimientos (del Discovery Wizard)
    │   └── ROADMAP.md       # Roadmap acordado con el usuario
    ├── backups/
    │   └── INTELLIGENCE.*.json  # Backups rotados (max 10)
    └── SYNAPTIC_AUDIT/
        ├── .audit-state.json    # Estado global de auditoría SAI
        ├── history/             # Un JSON por ciclo auditado
        ├── findings/
        │   └── active.json      # Registry de findings abiertos/resueltos
        └── REGISTRY.md          # Resumen human-readable de auditoría
```

### Cada Director File y su Propósito

| Archivo | Tipo | Propósito | Inyección al Prompt |
|---------|------|-----------|---------------------|
| **MANTRA.md** | Identidad | Define la filosofía, el covenant, y las reglas de enforcement del proyecto | Full content |
| **RULES.md** | Restricciones | Reglas específicas del proyecto (naming, patterns, stack) | Truncated a 2,000 chars |
| **DESIGN_DOC.md** | Arquitectura | Decisiones técnicas, estructura del proyecto, stack aprobado | Truncated a 1,500 chars |
| **session.json** | Estado | Ciclo actual, synapticStrength, complianceScore, violations | Inline en SYSTEM STATE |
| **INTELLIGENCE.json** | Memoria | Decisions, learnings, roadmap, implementationState | Summary (top 10 decisions + top 5 learnings) |
| **BITACORA.md** | Registro | Historial completo de todos los ciclos ejecutados | Summary (últimos 15 ciclos) |
| **REQUIREMENTS.md** | Contexto | Output del Discovery Wizard — requerimientos del usuario | Truncated a 3,000 chars |
| **ROADMAP.md** | Contexto | Plan acordado con milestones y prioridades | Truncated a 2,000 chars |

**Principio clave**: Cada archivo tiene un **budget de tokens** para evitar que el contexto colapse la ventana del LLM. Los archivos grandes se truncan, los resúmenes se filtran por relevancia.

---

## 4. Protocol System — Sistema de Protocolo

El protocolo SYNAPTIC 3.0 es el **ADN** del sistema. Es un documento maestro (`SYNAPTIC_3_0.md`) que define:
- La estructura obligatoria de cada respuesta del LLM
- Las reglas del Decision Gate
- El sistema de scoring y compliance
- Las consecuencias de violaciones

### Protocol Optimization (DG-026)

Para optimizar el uso de tokens, el protocolo se divide en dos archivos:

| Archivo | Tokens | Contenido |
|---------|--------|-----------|
| `SYNAPTIC_CORE.md` | ~2,800 | Principios, template obligatorio, ciclo de vida, scoring, decision gates |
| `SYNAPTIC_EXTENDED.md` | ~4,500 | Sistema de agentes, evolución sináptica, guías avanzadas |

### Cycle-Aware Injection

La cantidad de protocolo inyectado depende del ciclo actual (`protocol-loader.ts` líneas 65-73):

| Ciclo | Modo | Contenido | Tokens | Rationale |
|-------|------|-----------|--------|-----------|
| 1 | `FULL` | CORE + EXTENDED completo | ~7,300 | Primera exposición: el LLM necesita todo el contexto |
| 2-5 | `PARTIAL` | CORE + Secciones 3,5 de EXTENDED | ~4,500 | El LLM ya "conoce" el template; refuerzo selectivo |
| 6+ | `CORE_ONLY` | Solo CORE | ~2,800 | El conversation history ya contiene ejemplos del formato |

**ProtocolLoader** (`packages/shared/src/protocol-loader.ts`): Carga, cachea (TTL 60s), y extrae secciones del protocolo. Provee `getProtocolForMode(mode)` que retorna el contenido apropiado según el ciclo.

### Mandatory Response Template (8 Sections)

Toda respuesta del LLM en modo SYNAPTIC **DEBE** contener estas secciones, en este orden:

| # | Section | Emoji | Required | Contenido |
|---|---------|-------|----------|-----------|
| 1 | HEADER | `🧠` | Yes | `SYNAPTIC PROTOCOL v3.0 - RESPONSE` |
| 2 | SYSTEM STATE | `📊` | Yes | Project, Cycle, Phase, Synaptic Strength |
| 3 | CONTEXT VERIFICATION | `🔍` | Yes | Confirmación de archivos directores cargados |
| 4 | REQUIREMENT ANALYSIS | `📝` | No | Análisis del requerimiento del usuario |
| 5 | PHASE SECTION | `🎯` | Yes | Ejecución de la fase actual |
| 6 | DECISION GATE | `🚨` | Yes | 3 opciones (A, B, C) con pros/cons/risk |
| 7 | AWAITING DECISION | `⏸️` | Yes | Halt marker esperando input del usuario |
| 8 | END MARKER | — | No | `[END OF RESPONSE - ENFORCEMENT ACTIVE]` |

---

## 5. Enforcement Runtime — Runtime de Enforcement

El enforcement es el **sistema inmunológico** de SYNAPTIC. Opera en 4 capas defensivas que validan cada respuesta del LLM.

### 4-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Session Initialization                            │
│  initializeSession() → establece el contrato                │
│  Fuente: enforcement-runtime.ts líneas 172-201              │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: Prompt Wrapper                                    │
│  [ENFORCE-SYNAPTIC-PROTOCOL] tags around user prompt        │
│  Fuente: agent.ts wrapPromptWithEnforcement()               │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: Post-Response Validation                          │
│  processResponse() → ResponseValidator + TemplateChecker    │
│  Fuente: enforcement-runtime.ts líneas 244-380              │
├─────────────────────────────────────────────────────────────┤
│  LAYER 4: Regeneration Loop (Self-Healing)                  │
│  processWithRegeneration() → LLM retry with feedback        │
│  Fuente: enforcement-runtime.ts líneas 394-439              │
└─────────────────────────────────────────────────────────────┘
```

### 4 Core Components

| Componente | Archivo | Función |
|------------|---------|---------|
| **ResponseValidator** | `response-validator.ts` | Valida 7 requerimientos estructurales via regex. Convierte probabilidad → binario. |
| **TemplateChecker** | `template-checker.ts` | Valida las 8 secciones del template con regex patterns. Score 0-100. |
| **ComplianceScorer** | `compliance-scorer.ts` | 5 métricas ponderadas. Trend analysis (IMPROVING/STABLE/DECLINING). Grades A-F. |
| **RegenerationEngine** | `regeneration-engine.ts` | 4 templates de reformulación. Max 5 retries antes de ESCALATE. |

### Enforcement Modes

| Mode | Min Score | Reject Below | Pesos (Template/DG/Memory/Bitácora/Session) |
|------|-----------|-------------|----------------------------------------------|
| **STRICT** | 90 | 70 | 25% / 25% / 20% / 20% / 10% |
| **BALANCED** | 80 | 60 | 30% / 25% / 15% / 15% / 15% |
| **ADAPTIVE** | 70 | 50 | 35% / 20% / 15% / 15% / 15% |

---

## 6. Intelligence System — Sistema de Inteligencia

El sistema de inteligencia es la **memoria a largo plazo** de SYNAPTIC. Persiste conocimiento entre ciclos en `INTELLIGENCE.json`.

### INTELLIGENCE.json Structure

```typescript
interface ProjectIntelligence {
  projectSummary: { name, description, currentPhase, overallProgress }
  decisions: DecisionRecord[]       // Historial de decisiones del usuario
  roadmap: RoadmapItem[]            // Plan de trabajo acordado
  learnings: LearningEntry[]        // Patrones acumulados (con confianza)
  implementationState: {
    lastCompletedTask, currentTask, pendingTasks[], blockers[]
  }
  contextNotes: string[]            // Notas de contexto del usuario
  deletedItems?: DeletedItem[]      // DG-024: Soft-delete (1 ciclo antes de eliminar)
  archivedLearnings?: LearningEntry[] // DG-025: Learnings de baja confianza
  saiAuditSummary?: SAIAuditSummary // DG-094: Resumen de auditorías SAI
}
```

### Learning Confidence System (DG-025)

Los learnings no son iguales — cada uno tiene un **confidence score** que determina si es inyectado al prompt:

| Source | Initial Confidence | Descripción |
|--------|-------------------|-------------|
| `EXPLICIT` | 0.9 | El usuario lo afirmó directamente |
| `REPEATED` | 0.7 | Observado 3+ veces en ciclos diferentes |
| `INFERRED` | 0.3 | Inferido de una sola observación |

**Temporal Decay**: Después de 20 ciclos sin refuerzo, la confianza decrece 0.1/ciclo. Cuando baja de 0.2, el learning se archiva (no se elimina).

**Injection Threshold**: Solo learnings con confidence ≥ 0.5 se inyectan al prompt. Top 5 por score.

**Contradiction Detection**: Antes de almacenar un learning, se verifica contra 9 categorías de tecnología mutuamente excluyentes (e.g., Redux vs Zustand, Jest vs Vitest).

---

## 7. SAI (Sistema de Auditoría Incremental)

El SAI es el **sistema de calidad continua** que ejecuta micro-auditorías en cada ciclo sobre los archivos modificados.

### 8-Item Checklist

| # | Check | Severity | Penalidad |
|---|-------|----------|-----------|
| 1 | Imports declarados usados | MEDIUM | -10 |
| 2 | Funciones declaradas llamadas | MEDIUM | -10 |
| 3 | Sin duplicación obvia | LOW | -5 |
| 4 | Consistencia con patrones | LOW | -5 |
| 5 | Manejo de errores presente | HIGH | -15 |
| 6 | Sin hardcoded secrets | CRITICAL | -25 |
| 7 | Sin SQL injection patterns | CRITICAL | -25 |
| 8 | Tamaño razonable (<500 LOC) | MEDIUM | -10 |

### Scoring

- Score inicial: 100
- Se restan penalidades por cada finding
- **Pass**: Score ≥ 70 (Grade C+)
- **Grade Scale**: A(≥90), B(≥80), C(≥70), D(≥60), F(<60)
- **Timeout**: 5,000ms (no bloquea el ciclo si es lento)
- **Max file size**: 500KB (archivos más grandes se skipean)

### SAI Persistence (DG-094)

Los resultados se persisten en `SYNAPTIC_AUDIT/`:
- `history/cycle-NNNN.json` — resultado detallado por ciclo
- `findings/active.json` — registry de findings abiertos/resueltos
- `.audit-state.json` — métricas globales, score history, trends
- `REGISTRY.md` — resumen human-readable auto-generado

Los findings se rastrean con resolución automática: si un finding desaparece del código en un ciclo posterior, se marca como `RESOLVED` automáticamente.

---

## 8. Decision Gates — Compuertas de Decisión

Los Decision Gates son los **puntos de control humano** del sistema. Son halt points obligatorios donde el LLM DEBE detenerse y presentar opciones al usuario antes de implementar.

### Reglas Mandatorias

1. Presentar **exactamente 3 opciones** (A, B, C) — nunca 2, nunca 4
2. Cada opción requiere: Description, Pros, Cons, Risk, Confidence
3. El sistema **HALT** — no genera código hasta recibir "Proceed with Option [A/B/C]"
4. La decisión se registra en `INTELLIGENCE.json` con contexto completo
5. Los Decision Gates NO aplican en modo Architect ni en Immediate Execution ("Now!" button)

### Option Template

```
📦 OPTION A: [Conservative Approach]
- Description: [detalles]
- Pros: [lista de ventajas]
- Cons: [lista de desventajas]
- Risk: LOW
- Confidence: [X]%

🚀 OPTION B: [Balanced Approach]       ⚡ OPTION C: [Innovative Approach]
  Risk: MEDIUM                           Risk: HIGH
```

### Validation Penalties

| Violación | Penalidad |
|-----------|-----------|
| Decision Gate ausente | -25 puntos |
| Solo 2 opciones | -10 puntos |
| Campo faltante por opción | -5 puntos |
| AWAITING DECISION ausente | -15 puntos |
| Código generado sin aprobación | CRITICAL VIOLATION → Full Reset |

---

## 9. Guidance System — Sistema de Guía

El Guidance System es el **"Waze" para el desarrollo** — analiza el estado del proyecto y sugiere los próximos pasos más relevantes.

**Fuente**: `packages/agent/src/services/synaptic-guidance.ts`

### Funcionamiento

1. **Escanea** archivos de contexto (`context/REQUIREMENTS.md`, `context/ROADMAP.md`, `BITACORA.md`)
2. **Detecta** qué ítems del roadmap están completos (pattern matching en BITACORA)
3. **Calcula** el progreso de cada fase
4. **Genera** sugerencias priorizadas con prompts listos para ejecutar

### Output

```typescript
interface GuidanceSuggestion {
  id: string;
  title: string;             // "Implement user authentication"
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  prompt: string;            // Prompt listo para enviar al LLM
  category: 'ROADMAP' | 'IMPROVEMENT' | 'MAINTENANCE';
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

El sistema de guidance conecta el roadmap acordado con el estado real del proyecto, reduciendo la carga cognitiva del usuario para decidir "¿qué hago ahora?".

---

## 10. Component Interaction Map — Mapa de Interacciones

### Full Cycle Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER SENDS REQUIREMENT                           │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 1. PROTOCOL INJECTION (ProtocolLoader)                              │
│    ├─ getInjectionMode(cycle) → FULL / PARTIAL / CORE_ONLY         │
│    └─ Load SYNAPTIC_CORE.md + SYNAPTIC_EXTENDED.md                 │
└──────────────────────────┬───────────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. SYSTEM PROMPT CONSTRUCTION (agent.ts buildSystemPrompt)          │
│    ├─ Section 1: Master Protocol (cycle-aware)                      │
│    ├─ Section 2: Director Files (MANTRA + RULES + DESIGN_DOC)       │
│    ├─ Section 2.5: Intelligence Summary (decisions + learnings)     │
│    ├─ Section 2.6: Bitácora History (últimos 15 ciclos)             │
│    ├─ Section 3: Language Directive (DG-078)                        │
│    └─ Section 4: Mode-Specific Covenant (SYNAPTIC/ARCHITECT/NOW!)   │
└──────────────────────────┬───────────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. PROMPT WRAPPING (wrapPromptWithEnforcement)                      │
│    ├─ [ENFORCE-SYNAPTIC-PROTOCOL] markers                           │
│    ├─ Loaded files checklist (✅/⚠️)                                │
│    ├─ Mandatory actions reminder                                     │
│    └─ Validation checkpoint (□ checkboxes)                           │
└──────────────────────────┬───────────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. LLM GENERATES RESPONSE (Claude API)                              │
└──────────────────────────┬───────────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 5. ENFORCEMENT VALIDATION                                            │
│    ├─ ResponseValidator: 7 structural requirements                   │
│    ├─ TemplateChecker: 8 sections × regex patterns → score 0-100    │
│    ├─ ComplianceScorer: 5 weighted metrics → grade A-F              │
│    └─ If score < threshold → RegenerationEngine (max 5 retries)     │
└──────────────────────────┬───────────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 6. POST-CYCLE PRESERVATION                                           │
│    ├─ IntelligenceManager: record decision + extract learnings       │
│    ├─ BITACORA: append cycle entry (14 campos)                       │
│    ├─ session.json: update cycle, synapticStrength, compliance       │
│    ├─ SAI: micro-audit on changed files → persist to SYNAPTIC_AUDIT │
│    └─ Guidance: recalculate suggestions for next cycle               │
└──────────────────────────────────────────────────────────────────────┘
```

### The 6 Interaction Patterns

Estos 6 patrones son los mecanismos fundamentales que producen la consistencia del sistema:

| Patrón | Componentes Involucrados | Función |
|--------|-------------------------|---------|
| **PREVENTION** | Protocol Injection + Covenant + Prompt Wrapper | Guiar al LLM a producir el formato correcto ANTES de generar |
| **CORRECTION** | ResponseValidator + TemplateChecker + RegenerationEngine | Detectar y corregir desviaciones DESPUÉS de generar |
| **MEMORY** | IntelligenceManager + Confidence System + BITACORA | Acumular conocimiento que persiste entre ciclos |
| **AUDIT** | SAI Micro-Audit + Persistence Service | Monitorear calidad de código continuamente |
| **CONTROL** | Decision Gates + SynapticValidatorHook | Mantener al humano en el loop en puntos críticos |
| **CONTINUITY** | session.json + Synaptic Strength + Compliance Score | Mantener coherencia cross-cycle con métricas compuestas |

> **El insight fundamental**: La consistencia de SYNAPTIC no proviene de un solo componente, sino de la **interacción entre los 6 patrones**. La prevención reduce la necesidad de corrección, la memoria mejora la prevención en ciclos futuros, la auditoría alimenta los learnings, y la continuidad asegura que nada de esto se pierda entre sesiones.

---

*Chapter I de la serie "Ganancia Sináptica" — SYNAPTIC v3.0 STRICT Protocol*
*Next: Chapter II — "La Ganancia Sináptica" (mecanismos detallados)*
