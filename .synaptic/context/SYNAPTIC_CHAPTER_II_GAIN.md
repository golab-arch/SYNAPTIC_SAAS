# Chapter II: The Synaptic Gain

## La Ganancia Sináptica — Cómo las Partes Generan Valor Diferenciador

---

## 1. From Components to System Intelligence

El Capítulo I mapeó la anatomía — los componentes y sus conexiones. Este capítulo responde la pregunta más profunda: **¿cómo genera SYNAPTIC un valor que supera la suma de sus partes?**

La tesis central:

> SYNAPTIC transforma outputs probabilísticos en resultados deterministas mediante **tres fuerzas**: enforcement preventivo que moldea el comportamiento del LLM antes de generar, validación correctiva que atrapa desviaciones después de generar, y memoria persistente que mejora ambas fuerzas con cada ciclo completado. El resultado compuesto de estas tres fuerzas es la **Ganancia Sináptica** — una mejora medible y acumulativa en la calidad, consistencia y coherencia del asistente de desarrollo.

---

## 2. Prevention Layer — La Capa de Prevención

Esta es la capa más importante del sistema. La prevención es responsable de que el LLM produzca respuestas correctas **en el primer intento** — sin necesidad de corrección posterior.

### 2.1 The Covenant as Behavioral Constraint

El Covenant SYNAPTIC (`SYNAPTIC_CORE.md` líneas 18-34) es un contrato de 30 líneas que se inyecta en el system prompt del LLM. No es una sugerencia — es un contrato vinculante con consecuencias explícitas:

```
=== SYNAPTIC COVENANT (BINDING CONTRACT) ===

From this moment until the end of this session:

1. EVERY response MUST follow the SYNAPTIC template
2. EVERY requirement MUST generate a Decision Gate with 3 options
3. NEVER proceed without "Proceed with Option [A/B/C]" confirmation
4. ALWAYS update BITACORA.md after each cycle completion
5. MAINTAIN protocol compliance without reminders

VALIDATION CHECKSUM:
Your response is ONLY valid if it contains:
- Header: "🧠 SYNAPTIC PROTOCOL v3.0 - RESPONSE"
- System State section with session ID
- Context Verification section confirming files loaded
- Decision Gate with 3 options (A, B, C)
- "AWAITING DECISION" text
- No direct code generation before approval

CONTRACT ENFORCEMENT:
ANY response not following this protocol will be:
- Automatically REJECTED
- Must be reformulated
- Cannot proceed until compliant
- Session may be terminated after 3 violations
```

**Por qué funciona**: El LLM no es "obligado" por código — es condicionado por instrucciones. El Covenant funciona porque:
1. Define reglas con lenguaje absoluto ("EVERY", "NEVER", "MUST")
2. Incluye un **VALIDATION CHECKSUM** que el LLM usa como self-check antes de producir output
3. Amenaza con consecuencias progresivas (rejection → reset → session termination)
4. Se inyecta en CADA ciclo, sin importar el número de ciclo

### 2.2 Cycle-Aware Token Optimization

No todo el protocolo se inyecta siempre. El sistema optimiza tokens según el ciclo:

**Fuente**: `protocol-loader.ts` función `getInjectionMode()` (líneas 65-73)

```
Ciclo 1 (FULL):     [===== CORE =====][========== EXTENDED ==========]  ~7,300 tokens
                     Principios        Agentes, Evolución, Guías avanzadas

Ciclos 2-5 (PARTIAL): [===== CORE =====][== EXTENDED parcial ==]          ~4,500 tokens
                       Principios        Solo Agentes + Evolución

Ciclos 6+ (CORE_ONLY): [===== CORE =====]                                 ~2,800 tokens
                        Principios básicos
```

**Rationale**: En el ciclo 1, el LLM no tiene historial — necesita todo el contexto. A partir del ciclo 6, el conversation history ya contiene ejemplos concretos del formato esperado, haciendo redundante la inyección completa del protocolo.

**Función extractPartialExtended()**: Extrae solo las secciones de "Sistema de Agentes" y "Evolución Sináptica" del EXTENDED protocol, que son las más relevantes para mantener coherencia sin inyectar 4,500 tokens adicionales.

### 2.3 Context Injection Pipeline

El system prompt se construye en `agent.ts buildSystemPrompt()` (líneas 1710-2118) con 6 secciones concatenadas. Cada sección tiene un **budget de tokens** controlado:

| Sección | Fuente | Budget | Cómo se Controla |
|---------|--------|--------|-------------------|
| Master Protocol | `SYNAPTIC_CORE.md` + `EXTENDED.md` | 2,800-7,300 | Cycle-aware injection mode |
| Director Files | `.synaptic/MANTRA.md`, `RULES.md`, `DESIGN_DOC.md` | ~3,500 max | Truncation: RULES@2000, DESIGN@1500 |
| Intelligence Summary | `INTELLIGENCE.json` | ~1,000 | Top 10 decisions + top 5 learnings (filtered by confidence ≥0.5) |
| Bitácora History | `BITACORA.md` | ~800 | Últimos 15 ciclos (summarized) |
| Language Directive | User language detection | ~200 | Solo si el usuario habla no-inglés |
| Mode Covenant | Hardcoded constants | ~500 | Covenant completo o suffix minimal |

**Total estimado**: ~5,000-13,000 tokens de system prompt, dejando espacio para 4,000-8,000 tokens de user context en la ventana del LLM.

### 2.4 The Prompt Wrapper

Cada prompt del usuario se envuelve con markers de enforcement antes de enviarse al LLM:

```
[ENFORCE-SYNAPTIC-PROTOCOL]

=== SYNAPTIC CYCLE 7 ===

REQUIREMENT FROM USER:
"Implementar sistema de autenticación con JWT"

=== PROTOCOL ENFORCEMENT ACTIVE ===
✅ Master Protocol: LOADED
✅ MANTRA.md: LOADED
✅ RULES.md: LOADED
✅ Session State: ACTIVE

MANDATORY ACTIONS:
1. Follow the Response Template from Master Protocol
2. Present Decision Gate with 3 options (A, B, C)
3. Wait for "Proceed with Option [X]" before implementation

VALIDATION CHECKPOINT:
□ Header "🧠 SYNAPTIC PROTOCOL v3.0 - RESPONSE" present
□ System State section included
□ Decision Gate with 3 options present
□ "AWAITING DECISION" text included
□ NO code generated before approval

[END-ENFORCE-SYNAPTIC-PROTOCOL]
```

**Por qué funciona**: Cada prompt refuerza el contrato. El LLM recibe un "recordatorio" implícito en cada mensaje, no solo al inicio de la sesión. Los checkboxes (□) actúan como un self-check que el LLM puede validar internamente antes de producir output.

---

## 3. Correction Layer — La Capa de Corrección

Cuando la prevención falla, la corrección actúa como segunda línea de defensa.

### 3.1 ResponseValidator: Probability → Binary

**Fuente**: `response-validator.ts` líneas 268-321

El ResponseValidator transforma la respuesta probabilística del LLM en una decisión binaria: **VALID** o **INVALID**. Lo hace verificando 7 requerimientos estructurales con regex:

| Requerimiento | Pattern | Severity si Falta |
|---------------|---------|-------------------|
| Protocol header | `/SYNAPTIC PROTOCOL v\d+\.\d+/i` | CRITICAL (-50) |
| System State section | `/SYSTEM STATE/i` | HIGH (-25) |
| Context Verification | `/CONTEXT VERIFICATION/i` | HIGH (-25) |
| Decision Gate section | `/DECISION GATE/i` | CRITICAL (-50) |
| 3 options (A, B, C) | `/OPTION [ABC]/i` × 3 | HIGH (-25 each) |
| Awaiting Decision marker | `/AWAITING DECISION/i` | HIGH (-25) |
| No premature code | Heuristic: code blocks before DG | CRITICAL (-50) |

**Score calculation**: Starts at 100, deducts severity penalties. If score < 70 (STRICT mode) → REJECT.

**El principio clave**: No se usa otro LLM para validar — se usan **regex deterministas**. Esto elimina la variabilidad: el mismo input siempre produce el mismo resultado de validación.

### 3.2 TemplateChecker: 8-Section Structural Compliance

**Fuente**: `template-checker.ts` líneas 60-159

El TemplateChecker valida la **estructura** de la respuesta — que tenga las secciones correctas, en el orden correcto, con los subcampos requeridos:

**8 secciones validadas con regex exactos**:

```typescript
// Ejemplo del patrón para HEADER (sección 1):
{ pattern: /🧠\s*SYNAPTIC\s+PROTOCOL\s+v3\.0\s*[-–]\s*RESPONSE/i }

// Ejemplo del patrón para SYSTEM_STATE (sección 2):
{ pattern: /📊?\s*SYSTEM\s+STATE/i,
  subsections: [
    { pattern: /Project[:\s]+[\w-]+/i },         // Project name
    { pattern: /Cycle[:\s]+\d+/i },              // Cycle number
    { pattern: /Phase[:\s]+\d+\/\d+/i },         // Phase N/M
    { pattern: /Synaptic\s+Strength[:\s]+\d+%/i } // Strength %
  ]
}
```

**Penalidades**:
- Sección requerida faltante: **-15 puntos**
- Subsección faltante: **-5 puntos**
- Sección fuera de orden: **-5 puntos**
- Decision Gate faltante: **-25 puntos**
- AWAITING DECISION faltante: **-15 puntos**
- Campo de opción faltante (Description/Pros/Cons/Time/Risk): **-5 puntos** cada uno

### 3.3 ComplianceScorer: Weighted Multi-Metric Scoring

**Fuente**: `compliance-scorer.ts` líneas 65-380

El ComplianceScorer no solo valida — **cuantifica** la adherencia al protocolo con 5 métricas ponderadas:

| Métrica | Peso (STRICT) | Qué Mide |
|---------|---------------|----------|
| Template Compliance | 25% | Respuesta sigue la estructura de 8 secciones |
| Decision Gate | 25% | 3 opciones con campos completos + AWAITING |
| Memory Update | 20% | Actualiza INTELLIGENCE.json con learnings |
| Bitácora Log | 20% | Registra ciclo en BITACORA.md |
| Session Persistence | 10% | Mantiene session.json actualizado |

**Trend Analysis**: Calcula tendencia sobre los últimos 5 ciclos:
- `IMPROVING`: Score promedio subió >5 puntos
- `STABLE`: Variación dentro de ±5 puntos
- `DECLINING`: Score promedio bajó >5 puntos

**Grade Scale**: A(≥95), B(≥85), C(≥70), D(≥50), F(<50)

---

## 4. Regeneration Loop — El Loop de Regeneración

Cuando la validación detecta una respuesta non-compliant, el sistema no la descarta — la **reformula**.

### 4.1 The 4 Reformulation Templates

**Fuente**: `regeneration-engine.ts` líneas 72-118

El RegenerationEngine selecciona el template más apropiado según el tipo de violación:

| Template | Trigger | Enfoque |
|----------|---------|---------|
| **NO_CODE** | Código generado antes de aprobación | "CRITICAL VIOLATION: Remove code, present options first" |
| **DECISION_GATE** | Decision Gate incompleto o ausente | "Must have EXACTLY 3 options with all 5 fields" |
| **MISSING_SECTIONS** | Secciones del template faltantes | "Add these sections: {lista de secciones}" |
| **GENERIC** | Violaciones mixtas | Lista completa de violaciones + requerimientos |

### 4.2 The Reformulation Message

Cada intento de reformulación envía al LLM un mensaje estructurado (`líneas 269-299`):

```
═══════════════════════════════════════════════════════════════
⚠️  SYNAPTIC ENFORCEMENT - RESPONSE REJECTED (Attempt 2/5)
═══════════════════════════════════════════════════════════════

VIOLATIONS:
❌ [CRITICAL] Decision Gate Missing
❌ [HIGH] Missing Section: SYSTEM STATE

REQUIRED FIXES:
✓ Add MANDATORY DECISION GATE with 3 options
✓ Add SYSTEM STATE section with Project, Cycle, Phase, Strength

REFORMULATE YOUR RESPONSE NOW
═══════════════════════════════════════════════════════════════
```

### 4.3 The Retry Lifecycle

```
Attempt 1: LLM response → validate → REJECT (score 45)
    ↓ reformulation message (template: DECISION_GATE)
Attempt 2: LLM response → validate → REJECT (score 65)
    ↓ reformulation message (template: MISSING_SECTIONS)
Attempt 3: LLM response → validate → ACCEPT (score 85) ✅
```

**Límites**:
- Max 5 intentos antes de ESCALATE (escalar a humano)
- Max 3 violations por sesión antes de TERMINATE_SESSION
- Cada intento reutiliza el conversation history completo

---

## 5. Memory Layer — La Capa de Memoria

La memoria es lo que convierte a SYNAPTIC de un "prompt mejorado" a un **sistema que aprende**.

### 5.1 Decision Persistence

Cuando el usuario selecciona una opción en un Decision Gate, se registra:

```typescript
// intelligence-manager.ts recordDecision() líneas 352-372
{
  decisionId: "DG-047",
  cycle: 12,
  timestamp: "2026-02-08T14:30:00Z",
  decisionPoint: "Authentication system architecture",
  options: {
    optionA: { title: "JWT Stateless", description: "...", risk: "LOW" },
    optionB: { title: "Session-based", description: "...", risk: "MEDIUM" },
    optionC: { title: "OAuth2 + JWT hybrid", description: "...", risk: "HIGH" }
  },
  selectedOption: "A",
  userRationale: "Prefer stateless for scalability",
  outcome: "SUCCESS"
}
```

**Inyección al prompt**: Las últimas 10 decisiones se inyectan con un warning explícito:
```
"These are decisions the user has ALREADY MADE. Do NOT ask again."
```

Esto evita que el LLM re-proponga opciones que el usuario ya rechazó.

### 5.2 Learning Confidence Lifecycle

```
OBSERVATION → INITIAL SCORE → REINFORCEMENT → DECAY → ARCHIVE
     ↓              ↓                ↓           ↓          ↓
 Detected       EXPLICIT=0.9     Same pattern   After 20   Below 0.2
 in cycle       REPEATED=0.7     re-observed    cycles     → archived
                INFERRED=0.3     score += Δ     score -= 0.1/cycle
```

**Reinforcement increments** (`confidence-system.ts` líneas 97-159):
- EXPLICIT source: +0.05 per observation
- REPEATED source: +0.10 per observation
- INFERRED source: +0.15 per observation (más agresivo, busca promover a REPEATED)

**Auto-promotion**: Un learning INFERRED con 3+ observations y score ≥ 0.7 se promueve a REPEATED.

**El efecto compuesto**: Con cada ciclo exitoso, los learnings correctos se refuerzan y los incorrectos decaen. Después de 20-30 ciclos, el set de learnings inyectados es un **filtrado natural** de los patrones más robustos del proyecto.

### 5.3 Contradiction Detection

**Fuente**: `contradiction-detector.ts` líneas 47-190

Antes de almacenar un learning, se verifica contra el conocimiento existente:

**9 categorías mutuamente excluyentes**:
```
state-management: [redux, zustand, mobx, jotai, recoil, valtio]
styling:          [tailwind, styled-components, css-modules, emotion, sass]
testing:          [jest, vitest, mocha, cypress, playwright]
package-manager:  [npm, yarn, pnpm, bun]
framework:        [next, remix, gatsby, nuxt, sveltekit]
database:         [postgresql, mysql, mongodb, sqlite, dynamodb]
orm:              [prisma, drizzle, typeorm, sequelize, mongoose]
bundler:          [webpack, vite, esbuild, turbopack, rollup]
```

**Detección de preferencias opuestas**: Usando negation detection + Jaccard similarity (threshold > 0.3) para detectar learnings como "always use tabs" vs "always use spaces".

**Resolución**: Si la confianza difiere >0.2, el learning de menor confianza pierde. Si son similares, se marca como conflicto y se notifica.

---

## 6. Audit Layer — La Capa de Auditoría

### 6.1 SAI Micro-Audit Mechanics

**Fuente**: `micro-audit.service.ts` líneas 190-530

El SAI ejecuta un análisis liviano sobre cada archivo modificado en el ciclo:

**Import Analysis** (3 extraction patterns):
```typescript
// Named imports: import { foo, bar } from 'module'
// Default imports: import Foo from 'module'
// Namespace imports: import * as Foo from 'module'
```
Cada import se verifica contra el cuerpo del archivo (excluyendo la línea de import y comentarios).

**Function Analysis** (4 extraction patterns):
```typescript
// function declaration: function foo() {}
// arrow const: const foo = () => {}
// function const: const foo = function() {}
// method: foo() {} (inside class/object)
```
Cada función se verifica contra llamadas en el código (excluyendo su propia declaración).

**Security Pattern Detection** (7 patterns en `sai-constants.ts` líneas 125-148):

| Pattern | Regex | Severity |
|---------|-------|----------|
| apiKey | `/apiKey\s*[:=]\s*['"][^'"]{8,}/i` | CRITICAL |
| secret | `/secret\s*[:=]\s*['"][^'"]{8,}/i` | CRITICAL |
| token | `/token\s*[:=]\s*['"][^'"]{8,}/i` | CRITICAL |
| sqlInjection | `/\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE)/i` | CRITICAL |
| evalUsage | `/\beval\s*\(/` | HIGH |
| dangerousHtml | `/dangerouslySetInnerHTML/` | MEDIUM |

### 6.2 Finding Resolution Tracking

Los findings del SAI no son efímeros — se rastrean con IDs únicos y resolución automática:

```
Cycle 10: Finding SAI-a1b2c3d4 detected (unused import in auth.ts)
Cycle 11: auth.ts modified → SAI re-checks → import now used → RESOLVED (auto)
```

**Fuente**: `sai-persistence.service.ts detectResolvedFindings()` — compara findings activos contra los del ciclo actual, marcando como resueltos aquellos que desaparecieron de archivos modificados.

---

## 7. Control Layer — La Capa de Control

### 7.1 Decision Gates as Governance

Los Decision Gates no son una feature cosmética — son un **mecanismo de gobernanza** que previene:
- Que el AI tome decisiones arquitectónicas autónomas
- Que el usuario pierda visibilidad sobre trade-offs
- Que las decisiones no queden documentadas

**El ciclo de gobernanza**:
```
Requirement → Analysis → 3 Options → HALT → User Decides → Implementation
                                       ↑
                              No code until here
```

### 7.2 Pre-Execution Validation (SynapticValidatorHook)

**Fuente**: `synaptic-validator.ts` líneas 42-73

Antes de que el prompt llegue al LLM, el SynapticValidatorHook detecta patrones peligrosos:

| Categoría | Patterns | Acción |
|-----------|----------|--------|
| Skip validation | "skip validation", "ignore checks" | BLOCK |
| Bypass decision | "bypass decision", "skip gate" | BLOCK |
| Dangerous deletion | "rm -rf", "del /s" | BLOCK |
| Privilege escalation | "sudo", "runas" | BLOCK |
| Remote execution | "curl \| sh", "wget \| bash" | BLOCK |

**Phase-specific blocking**: En fase VALIDATION, patterns como "skip tests" son bloqueados. En fase IMPLEMENTATION, patterns como "delete all" son bloqueados.

---

## 8. Continuity Layer — La Capa de Continuidad

### 8.1 Session State Machine

`session.json` mantiene el estado entre ciclos:

```typescript
{
  sessionId: "sess-abc123",
  currentCycle: 12,
  synapticStrength: 36,      // min(12 * 3, 100) = 36%
  enforcement: { mode: "STRICT" },
  agentState: {
    complianceScore: 92,
    violationsCount: 0,
    successfulCycles: 11
  }
}
```

**Synaptic Strength Formula**: `Math.min(cycle * 3, 100)`

| Ciclo | Strength | Significado |
|-------|----------|-------------|
| 1-5 | 3-15% | Fase de aprendizaje — protocolo nuevo, contexto mínimo |
| 6-15 | 18-45% | Fase de consolidación — learnings acumulándose |
| 16-30 | 48-90% | Fase de madurez — contexto rico, decisiones históricas |
| 33+ | 99-100% | Fase de autonomía — el sistema "conoce" el proyecto |

La Synaptic Strength no es solo una métrica — se **inyecta en el system prompt**, comunicándole al LLM cuánto contexto tiene disponible. Un strength de 85% le indica al LLM que puede ser más asertivo en sus recomendaciones.

### 8.2 BITACORA as Audit Trail

La BITACORA es el **registro inmutable** de todos los ciclos:

```typescript
interface BitacoraCycleEntry {
  cycleId: number;
  traceId: string;           // UUID para trazabilidad
  timestamp: string;
  agent: string;
  phase: 'ANALISIS' | 'DISEÑO' | 'IMPLEMENTACION' | 'VALIDACION' | 'DOCUMENTACION';
  result: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  duration: string;
  promptOriginal: string;    // El prompt COMPLETO del usuario
  decisionGate: { optionA, optionB, optionC } | null;
  optionSelected: { option: 'A'|'B'|'C', title } | null;
  artifacts: string[];       // Archivos creados/modificados
  metrics: { protocolCompliance, decisionGatePresented, memoryUpdated, testsGenerated, reformulationsNeeded };
  lessonsLearned: string[];
  notes: string;
  synapticStrength: number;
  saiAudit?: { executed, passed, score, grade, findingsCount, ... };  // DG-094
}
```

**14 campos** por ciclo, cada uno aportando una dimensión de trazabilidad. La BITACORA crece ~50-100 líneas por ciclo, y su resumen (últimos 15 ciclos) se inyecta al prompt para que el LLM sepa qué se ha hecho antes.

### 8.3 Backup System

**Fuente**: `intelligence-manager.ts` líneas 657-701

- Antes de cada write a `INTELLIGENCE.json`, se crea un backup
- Max 10 backups rotados (FIFO)
- Throttle de 2,000ms entre backups para evitar file handle exhaustion
- Naming: `INTELLIGENCE.{timestamp}.json`

---

## 9. Emergent Properties — Propiedades Emergentes

Las propiedades emergentes son los comportamientos del sistema que **no están programados explícitamente** sino que surgen de la interacción entre componentes.

### 9.1 Feedback Loop 1: Self-Improving Compliance

```
Enforcement rejection
    → Regeneration con feedback específico
    → LLM aprende el formato correcto en-context
    → Próximos ciclos: menos rejections
    → Compliance score trending IMPROVING
```

En los primeros 3-5 ciclos, el LLM puede necesitar 1-2 reformulaciones. Hacia el ciclo 10+, la tasa de regeneración cae a <5% porque el conversation history ya contiene múltiples ejemplos exitosos.

### 9.2 Feedback Loop 2: Compounding Knowledge

```
Ciclo exitoso
    → Learnings extraídos (confidence INFERRED=0.3)
    → Próximo ciclo: learning re-observado → confidence +0.15 → now 0.45
    → Siguiente re-observación → 0.60 → cruza threshold 0.5 → INJECTED al prompt
    → LLM usa learning → produce mejor resultado → más learnings detectados
```

Este loop es **geométrico**: cada learning exitoso mejora los ciclos futuros, que a su vez generan más learnings de alta confianza.

### 9.3 Feedback Loop 3: Guided Development

```
BITACORA registra ciclos completados
    → Guidance System escanea BITACORA vs ROADMAP
    → Detecta "auth module complete, payment module pending"
    → Genera sugerencia: "Implement payment processing (ROADMAP item #3)"
    → Usuario ejecuta → BITACORA se actualiza → Guidance recalcula
```

### 9.4 Synaptic Strength as Compound Trust

La Synaptic Strength (0-100%) representa la **confianza acumulada** del sistema en su propio contexto:

```
Strength = 0%:   "Soy nuevo. No sé nada del proyecto."
Strength = 25%:  "Tengo algunas decisiones. Contexto básico."
Strength = 50%:  "Conozco el proyecto. Puedo ser más específico."
Strength = 75%:  "Entiendo profundamente. Mis sugerencias son informadas."
Strength = 100%: "Domino el proyecto. Máxima autonomía contextual."
```

**El efecto compuesto**: A mayor strength, el LLM recibe más contexto relevante (learnings de alta confianza, decisiones pasadas, roadmap actualizado), lo que produce respuestas de mayor calidad, que generan más learnings confiables, que incrementan aún más la calidad. Este loop es la esencia de la **Ganancia Sináptica**.

### 9.5 The 6 Patterns — Reinforcement Dynamics

| Patrón | Alimenta | Se Alimenta De |
|--------|----------|----------------|
| PREVENTION | CORRECTION (reduce su carga) | MEMORY (mejores learnings = mejor prevención) |
| CORRECTION | MEMORY (findings → learnings) | PREVENTION (menos trabajo cuando prevención es fuerte) |
| MEMORY | PREVENTION + CONTINUITY | CORRECTION + AUDIT (ambos generan learnings) |
| AUDIT | MEMORY (findings → learnings técnicos) | CONTINUITY (métricas históricas) |
| CONTROL | MEMORY (decisiones registradas) | PREVENTION (covenant define cuándo detenerse) |
| CONTINUITY | Todo (session state persiste todo) | Todo (todos los componentes persisten estado) |

> **La Ganancia Sináptica es el efecto acumulativo de estos 6 patrones reforzándose mutuamente ciclo tras ciclo.** No es una mejora lineal — es exponencial en los primeros 20 ciclos, estabilizándose después cuando el sistema alcanza madurez contextual.

---

*Chapter II de la serie "Ganancia Sináptica" — SYNAPTIC v3.0 STRICT Protocol*
*Previous: Chapter I — "Anatomía del Corazón Sináptico"*
*Next: Chapter III — "Manual de Implementación"*
