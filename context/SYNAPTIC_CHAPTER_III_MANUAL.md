# Chapter III: The Implementation Manual

## Manual de Implementación — Adaptando la Filosofía SYNAPTIC a Otros Proyectos

---

## 1. The 5 Universal Principles — Los 5 Principios Universales

De la anatomía (Cap I) y los mecanismos (Cap II) se extraen **5 principios portátiles** que pueden implementarse en cualquier sistema de software asistido por IA:

| # | Principio | Esencia | Referencia SYNAPTIC |
|---|-----------|---------|---------------------|
| P1 | **Deterministic Output Validation** | Validar outputs probabilísticos con checks deterministas | ResponseValidator + TemplateChecker |
| P2 | **Mandatory Decision Points** | Forzar decisiones humanas antes de acciones irreversibles | Decision Gates |
| P3 | **Persistent Learning Context** | Acumular conocimiento que mejora con cada interacción | INTELLIGENCE.json + Confidence System |
| P4 | **Continuous Quality Audit** | Auditar calidad de forma automatizada en cada ciclo | SAI Micro-Audit |
| P5 | **Self-Healing Through Reformulation** | Auto-corregir outputs fallidos con feedback específico | RegenerationEngine |

---

## 2. Principle 1: Deterministic Output Validation

### 2.1 The Abstract Pattern

Todo sistema que usa LLMs para generar output estructurado necesita una capa de validación que sea **determinista** — el mismo input siempre produce el mismo resultado de validación, independientemente del estado del LLM.

```
LLM Output (probabilistic)
    ↓
Deterministic Validator (regex/structural checks)
    ↓
Binary Result: VALID or INVALID + score + violations list
```

**Axioma**: Nunca uses otro LLM para validar al primer LLM. Usa regex, parsers, o checks estructurales.

### 2.2 Implementation Guide (5 Steps)

**Step 1: Define your Response Template**

Decidir qué secciones son obligatorias en cada respuesta. SYNAPTIC usa 8 secciones con emojis como markers; tu sistema puede usar headers, JSON keys, XML tags, o cualquier delimitador parseable.

```
// Ejemplo para un Code Review Bot:
Required sections: [SUMMARY, FILES_REVIEWED, FINDINGS, SEVERITY_ASSESSMENT, RECOMMENDATIONS]
```

**Step 2: Create Regex Validators for Each Section**

Para cada sección, definir un regex que detecte su presencia:

```typescript
const sections = [
  { id: 'SUMMARY', pattern: /##?\s*Summary/i, required: true },
  { id: 'FINDINGS', pattern: /##?\s*Findings/i, required: true },
  { id: 'SEVERITY', pattern: /Severity[:\s]+(CRITICAL|HIGH|MEDIUM|LOW)/i, required: true },
];
```

**Step 3: Define a Severity Scale**

Asignar penalidades proporcionales al impacto de cada violación:

| Severity | Penalty | Cuándo Usar |
|----------|---------|-------------|
| CRITICAL | -50 | La violación invalida todo el output |
| HIGH | -25 | Sección importante faltante |
| MEDIUM | -10 | Subcampo o detalle faltante |
| LOW | -5 | Issue cosmético o de formato |

**Step 4: Set Mode-Specific Thresholds**

No todos los contextos requieren la misma rigurosidad:

```typescript
const thresholds = {
  strict:   { minScore: 90, rejectBelow: 70 },
  balanced: { minScore: 80, rejectBelow: 60 },
  adaptive: { minScore: 70, rejectBelow: 50 },
};
```

**Step 5: Build the validate() Function**

```typescript
function validate(response: string): { valid: boolean; score: number; violations: Violation[] } {
  let score = 100;
  const violations: Violation[] = [];

  for (const section of sections) {
    if (section.required && !section.pattern.test(response)) {
      score -= SEVERITY_PENALTIES[section.severity];
      violations.push({ section: section.id, severity: section.severity });
    }
  }

  return { valid: violations.length === 0 && score >= threshold, score, violations };
}
```

### 2.3 Adaptation Examples

**Code Review Bots**: Validar presencia de secciones de review, clasificación de severidad, referencias a archivos específicos, y suggestion count.

**Document Generators**: Validar estructura de documento (TOC, sections, citations), formato de bibliografía, y longitud de secciones.

**Chatbots con Compliance**: Validar presencia de disclosures legales, tone markers, y límites de longitud de respuesta.

---

## 3. Principle 2: Mandatory Decision Points

### 3.1 The Abstract Pattern

En cualquier sistema donde un AI puede tomar acciones con consecuencias (crear código, enviar emails, modificar datos), debe existir un **halt point** que:
1. Presenta opciones estructuradas al humano
2. Se DETIENE hasta recibir confirmación
3. Registra la decisión con contexto completo

```
AI Analysis → Structured Options → HALT → Human Decides → AI Executes → Record Decision
```

### 3.2 Implementation Guide (5 Steps)

**Step 1: Define Gate-Worthy Actions**

No todo requiere un gate — solo las acciones que son difíciles de revertir o tienen trade-offs significativos:

| Requiere Gate | No Requiere Gate |
|--------------|-----------------|
| Arquitectura nueva | Bug fix trivial |
| Dependencia nueva | Typo correction |
| Schema migration | Comment addition |
| API contract change | Formatting change |

**Step 2: Design Your Option Schema**

Mínimo requerido por opción:

```typescript
interface DecisionOption {
  id: string;           // 'A', 'B', 'C'
  title: string;        // "Conservative: Use existing auth"
  description: string;  // Detailed explanation
  pros: string[];       // Advantages
  cons: string[];       // Disadvantages
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

**Step 3: Build a Consistent Formatter**

El formato debe ser idéntico en cada gate para que el humano desarrolle muscle memory:

```markdown
## 🚨 DECISION REQUIRED

### Option A: [Title]
- **What**: [description]
- **Pros**: [list]
- **Cons**: [list]
- **Risk**: LOW

### Option B: [Title] ...
### Option C: [Title] ...

**Action Required**: Reply with "Proceed with Option [A/B/C]"
```

**Step 4: Create a Recording Mechanism**

Cada decisión debe persistirse con:
- Timestamp y cycle/context ID
- Las 3 opciones presentadas (no solo la elegida)
- La opción seleccionada + rationale del usuario
- El outcome después de implementar (SUCCESS/FAILURE/PARTIAL)

**Step 5: Wire the Gate into Your AI Loop**

El gate debe ser un **blocking step** — el loop se pausa hasta que el humano responde. No usar timeouts que procedan automáticamente.

### 3.3 Adaptation Examples

**CI/CD Pipelines**: Gate antes de deployment con opciones: canary (5% traffic), staged rollout (25%→50%→100%), full deploy. Registra quién aprobó y el resultado.

**Content Moderation**: Gate antes de acciones sobre contenido flaggeado: approve (with note), flag for review (senior), remove (with reason). Audit trail completo.

**Data Migration**: Gate antes de schema changes: conservative (additive only), balanced (add + rename), aggressive (add + rename + drop). Cada opción con estimación de downtime.

---

## 4. Principle 3: Persistent Learning Context

### 4.1 The Abstract Pattern

Un sistema que olvida entre interacciones es un sistema que repite errores. La persistencia de contexto requiere:

```
Interaction → Extract Knowledge → Score Confidence → Store → Filter → Inject into Next Interaction
```

### 4.2 Implementation Guide (6 Steps)

**Step 1: Define Your Knowledge Schema**

Separar tipos de conocimiento para diferentes tratamientos:

```typescript
interface KnowledgeBase {
  decisions: Decision[];      // Irreversible choices made
  learnings: Learning[];      // Patterns observed
  preferences: Preference[];  // User/system preferences
  context: ContextNote[];     // Temporal observations
}
```

**Step 2: Implement Confidence Sources**

No todo conocimiento tiene la misma certeza:

| Source | Initial Score | Cuándo Usar |
|--------|--------------|-------------|
| EXPLICIT (0.9) | El usuario lo afirmó: "Siempre usamos TypeScript" |
| REPEATED (0.7) | Observado 3+ veces independientemente |
| INFERRED (0.3) | Deducido de una sola observación |

**Step 3: Build Reinforcement Logic**

Cuando un learning se re-observa, incrementar su confianza:

```typescript
function reinforce(learning: Learning, source: Source): void {
  const increments = { EXPLICIT: 0.05, REPEATED: 0.10, INFERRED: 0.15 };
  learning.confidence.score = Math.min(1.0, learning.confidence.score + increments[source]);
  learning.confidence.evidenceCount++;
  learning.confidence.lastReinforced = new Date().toISOString();
}
```

**Step 4: Implement Temporal Decay**

Sin decay, el knowledge base se llena de patrones obsoletos:

```typescript
function applyDecay(learning: Learning, currentCycle: number): void {
  const cyclesSinceReinforced = currentCycle - learning.lastReinforcedCycle;
  if (cyclesSinceReinforced > GRACE_PERIOD) { // 20 cycles
    learning.confidence.score -= DECAY_RATE * (cyclesSinceReinforced - GRACE_PERIOD); // 0.1/cycle
  }
  if (learning.confidence.score < ARCHIVE_THRESHOLD) { // 0.2
    moveTo(archivedLearnings);  // Don't delete — archive
  }
}
```

**Step 5: Set Injection Threshold and Limits**

- Threshold: Solo learnings con confidence ≥ 0.5 (recomendado)
- Max items: Top 5-10 por score (evitar context bloat)
- Sort: Descendente por confidence score

**Step 6: Add Contradiction Detection**

Antes de almacenar, verificar si contradice conocimiento existente:
- Categorías mutuamente excluyentes (React vs Vue, tabs vs spaces)
- Negation patterns ("always X" vs "never X")
- Resolución: higher confidence wins (si diferencia > 0.2)

### 4.3 Backup Strategy

- Backup ANTES de cada write (no después)
- Rotación de N backups (10 recomendado)
- Throttle entre backups (2s mínimo para evitar file handle exhaustion)
- Naming con timestamp para fácil recovery

### 4.4 Adaptation Examples

**Customer Support Bots**: Learnings = preferencias del cliente (canal preferido, horario, productos frecuentes). Decay después de 6 meses sin interacción.

**Development Assistants**: Learnings = coding style, architecture patterns, error resolution patterns. Decisiones = tech stack, library choices.

**Educational Tutors**: Learnings = ritmo de aprendizaje, conceptos dominados, áreas difíciles. Decay más lento (conocimiento pedagógico es más estable).

---

## 5. Principle 4: Continuous Quality Audit

### 5.1 The Abstract Pattern

No esperar a code review para detectar problemas — auditar en cada ciclo, de forma automatizada, con resultados acumulativos.

```
Cycle Completes → Identify Changed Files → Run Checklist → Score → Persist Findings → Track Trends
```

### 5.2 Implementation Guide (6 Steps)

**Step 1: Define Your Checklist**

8 items es un buen número — suficientes para ser útiles, pocos para mantener velocidad:

```typescript
const checklist = [
  { id: 'unused_imports', severity: 'MEDIUM', check: checkUnusedImports },
  { id: 'unused_functions', severity: 'MEDIUM', check: checkUnusedFunctions },
  { id: 'no_hardcoded_secrets', severity: 'CRITICAL', check: checkNoSecrets },
  { id: 'error_handling', severity: 'HIGH', check: checkErrorHandling },
  { id: 'file_size', severity: 'MEDIUM', check: checkFileSize },
  { id: 'duplication', severity: 'LOW', check: checkDuplication },
  { id: 'consistency', severity: 'LOW', check: checkPatternConsistency },
  { id: 'security_patterns', severity: 'CRITICAL', check: checkSecurityPatterns },
];
```

**Step 2: Set Severity-Based Penalties**

```typescript
const penalties = { CRITICAL: -25, HIGH: -15, MEDIUM: -10, LOW: -5 };
```

**Step 3: Implement File Filtering**

- Extensions whitelist: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, etc.
- Exclude patterns: `node_modules`, `dist`, `build`, `*.test.*`, `*.spec.*`
- Max file size: 500KB (skip larger files)

**Step 4: Build Analysis Functions**

Mantener los checks simples y rápidos — regex-based, no AST-based (para velocidad):

```typescript
function checkUnusedImports(fileContent: string): Finding[] {
  const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from/g;
  // Extract imported names, check if each is referenced in the body
}
```

**Step 5: Set Pass/Warn/Block Thresholds**

| Threshold | Score | Acción |
|-----------|-------|--------|
| Pass | ≥ 70 | Continuar normalmente |
| Warn | 50-69 | Log warning, no bloquear |
| Block | < 50 | Bloquear (solo en modo strict) |

**Step 6: Persist Results for Trend Analysis**

Almacenar score por ciclo para detectar tendencias: IMPROVING (subiendo), STABLE, DECLINING (bajando).

### 5.3 Adaptation Examples

**API Gateways**: Auditar request/response schemas, rate limit compliance, authentication patterns, response time thresholds.

**Infrastructure-as-Code**: Auditar resource naming conventions, tagging compliance, security group rules, encryption at rest.

**Documentation Systems**: Auditar broken links, outdated API references, formatting consistency, missing required sections.

---

## 6. Principle 5: Self-Healing Through Reformulation

### 6.1 The Abstract Pattern

Cuando un output falla validación, no descartarlo — **reformular** con feedback específico sobre qué falló y cómo corregirlo.

```
Output → Validate → FAIL → Build Specific Feedback → Re-Request → Validate Again → ...
                                                                    ↓
                                                              Max N retries → ESCALATE
```

### 6.2 Implementation Guide (5 Steps)

**Step 1: Define Reformulation Templates**

Mínimo 4 templates — uno genérico y 3 específicos para violaciones comunes:

| Template | Trigger | Contenido |
|----------|---------|-----------|
| GENERIC | Violaciones mixtas | Lista completa de violations + requirements |
| STRUCTURE | Secciones faltantes | "Add these specific sections: {list}" |
| FORMAT | Formato incorrecto de componente clave | "Fix: must have exactly N items with fields X,Y,Z" |
| CRITICAL | Violación de seguridad o lógica | "CRITICAL: {specific violation}. Must fix before proceeding" |

**Step 2: Build a Template Selector**

Elegir el template más específico posible — feedback genérico converge más lento:

```typescript
function selectTemplate(violations: Violation[]): ReformulationTemplate {
  if (violations.some(v => v.severity === 'CRITICAL')) return CRITICAL;
  if (violations.every(v => v.type === 'missing_section')) return STRUCTURE;
  if (violations.every(v => v.type === 'format_error')) return FORMAT;
  return GENERIC;
}
```

**Step 3: Set Max Retries and Escalation**

- Max retries: 5 (recomendado — suficientes para convergencia, no tantos para loops infinitos)
- Escalation behavior: Notificar al humano con el historial de intentos
- No incrementar agresividad del feedback — mantener profesional

**Step 4: Construct the Reformulation Message**

Estructura recomendada:

```
═══════════════════════════════════════════
⚠️  RESPONSE REJECTED (Attempt {N}/{MAX})
═══════════════════════════════════════════

VIOLATIONS FOUND:
❌ [{SEVERITY}] {violation description}
❌ [{SEVERITY}] {violation description}

REQUIRED FIXES:
✓ {specific action to fix violation 1}
✓ {specific action to fix violation 2}

{template-specific instructions}

REFORMULATE YOUR RESPONSE NOW
═══════════════════════════════════════════
```

**Step 5: Wire into Validation Loop**

```typescript
let response = await llm.generate(prompt);
let result = validate(response);
let attempts = 1;

while (!result.valid && attempts < MAX_RETRIES) {
  const feedback = buildReformulationMessage(result.violations, attempts, MAX_RETRIES);
  response = await llm.generate(feedback);
  result = validate(response);
  attempts++;
}

if (!result.valid) escalateToHuman(response, result);
```

### 6.3 Adaptation Examples

**Form Validators**: Mensajes de error específicos por campo con instrucciones de corrección, progressive disclosure de requirements.

**Code Generators**: Feedback basado en errores de compilación/lint con sugerencias de fix específicas.

**Translation Systems**: Feedback basado en terminología incorrecta, estilo inconsistente, o formato roto.

---

## 7. Integration Patterns — Patrones de Integración

### 7.1 Minimal Viable Protocol (MVP)

**Componentes**: Protocol injection + Template validation + Decision Gates

**Esfuerzo estimado**: 2-3 días

**Qué incluye**:
- Un system prompt con template obligatorio y covenant
- Una función `validate()` con regex para las secciones requeridas
- Un mecanismo de halt-and-wait para decision points
- Persistence básica (archivo JSON con decisiones)

**Recomendado para**: Prototipos, equipos pequeños, proof-of-concept.

### 7.2 Standard Implementation

**Componentes**: MVP + Compliance scoring + Regeneration loop + Session persistence

**Esfuerzo estimado**: 1-2 semanas

**Qué agrega sobre MVP**:
- ComplianceScorer con métricas ponderadas y trend analysis
- RegenerationEngine con 4 templates de reformulación
- session.json con cycle tracking y synaptic strength
- Backup system para knowledge base

**Recomendado para**: AI assistants en producción, environments regulados.

### 7.3 Full Implementation

**Componentes**: Standard + Learning system + SAI audit + Contradiction detection + Guidance

**Esfuerzo estimado**: 3-4 semanas

**Qué agrega sobre Standard**:
- INTELLIGENCE.json con confidence scoring y temporal decay
- Contradiction detector con categorías mutuamente excluyentes
- SAI micro-audit con 8-item checklist y finding persistence
- Guidance system que sugiere próximos pasos

**Recomendado para**: Enterprise AI platforms, long-running project assistants.

### 7.4 Architecture Decision: Monolith vs Packages

SYNAPTIC usa un monorepo con packages standalone para enforcement y workspace (zero dependencies). Esta decisión permite:

| Aspecto | Monolith | Packages Separados |
|---------|----------|-------------------|
| Setup time | Rápido | Requiere monorepo tooling |
| Type sharing | Implicit | Explicit exports/imports |
| Testability | Todo junto | Isolated unit tests |
| Reusability | Baja | Alta (otros consumers) |
| Build complexity | Simple | Dependency-aware builds |

**Recomendación**: Empezar monolith, extraer packages cuando tengas >1 consumer (e.g., web + VSCode extension).

---

## 8. Anti-Patterns and Lessons — Anti-Patrones y Lecciones

### 8.1 Lessons from SYNAPTIC Development

Estas 14 lecciones se aprendieron durante el desarrollo de SYNAPTIC y son transferibles a cualquier implementación similar:

1. **System prompt MUST mention tools** — Si el LLM tiene API tools disponibles, el system prompt debe mencionarlos explícitamente. De lo contrario, el LLM los ignora.

2. **Streaming events create messages** — Cada par `streamingStart`/`streamingEnd` crea un nuevo mensaje en la UI. NUNCA emitas estos en callbacks que se ejecutan múltiples veces (como regeneration loops).

3. **Severity type mismatches at boundaries** — Si tu enforcement usa `'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'` pero tu UI usa `'critical' | 'warning'`, siempre mapea en el boundary. No asumas igualdad.

4. **ESM/CJS interop** — Si usas packages ESM consumidos por una aplicación CJS, tools como esbuild resuelven esto automáticamente. No hagas workarounds manuales.

5. **Context injection limits** — Archivos grandes (10K+ líneas de BITACORA) colapsarán la ventana de contexto. Siempre trunca o resume.

6. **Workspace requires folder** — Si tu sistema depende de un workspace path, no funcionará sin un folder abierto. Detecta esto early.

7. **UI render order matters** — Si tu UI tiene approval cards y result blocks, el card DEBE renderizar ANTES del block. Race conditions en la UI generan confusión.

8. **Two competing systems will conflict** — Si tanto el enforcement template como un decision gate service generan gates, habrá duplicación. Define una sola autoridad.

9. **globalState for volatile data** — Usa persistent state (no instance variables) para datos que deben sobrevivir a dispose/recreate cycles del componente.

10. **Enforcement has ZERO deps on LLM SDK** — Mantén el enforcement package independiente del SDK del LLM. Importa solo tipos, no runtime code.

11. **RegenerationCallback type must be precise** — Define el tipo exacto de tu callback de regeneración y envuélvelo en el bridge. No lo pases raw.

12. **Backup throttling is essential** — Sin throttle, writes frecuentes al knowledge base causan file handle exhaustion en Windows.

13. **Confidence filtering prevents noise** — Sin threshold de confianza, learnings de baja calidad contaminan el prompt y degradan las respuestas del LLM.

14. **Soft-delete before permanent** — Nunca borres inmediatamente. Marca como deleted, espera 1 ciclo, luego elimina. Permite recovery.

### 8.2 Common Implementation Mistakes

| Error | Consecuencia | Solución |
|-------|-------------|----------|
| **Validación demasiado estricta** | 80%+ de respuestas rechazadas, loops infinitos | Empezar con threshold bajo (60), subir gradualmente |
| **Reformulation prompts genéricos** | No convergen, 5/5 retries fallidos | Usar templates específicos por tipo de violación |
| **Context injection ilimitada** | Context window agotada, respuestas truncadas | Definir budget de tokens por sección |
| **Learnings sin decay** | Knowledge base llena de patrones obsoletos | Implementar decay temporal desde el día 1 |
| **Decision gates en decisiones triviales** | User fatigue, sistema abandonado | Definir criterios claros de gate-worthiness |

---

## 9. Metrics and Observability — Métricas y Observabilidad

### 9.1 What to Measure

| Métrica | Cómo Calcular | Qué Indica |
|---------|---------------|------------|
| **Compliance Score** | Weighted average de template + DG + memory + bitácora + session | Salud general del protocolo |
| **Regeneration Rate** | % de respuestas que necesitaron retry | Efectividad de la prevención |
| **Decision Resolution Time** | Tiempo entre gate presentado y decisión del usuario | Engagement del humano |
| **Learning Confidence Distribution** | Histograma de scores de confianza | Salud del knowledge base |
| **SAI Score Trend** | Rolling average de scores de auditoría | Trayectoria de calidad del código |
| **Synaptic Strength** | min(cycle * 3, 100) | Madurez del contexto |

### 9.2 Dashboard Design Reference

SYNAPTIC usa el ComplianceScorer para generar un dashboard de texto:

```
╔══════════════════════════════════════════════╗
║         SYNAPTIC COMPLIANCE DASHBOARD        ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Overall Score: 87/100 (Grade: B)            ║
║  Trend: IMPROVING ↑                          ║
║                                              ║
║  Template:  ████████░░ 85%                   ║
║  DG:        █████████░ 90%                   ║
║  Memory:    ████████░░ 80%                   ║
║  Bitácora:  █████████░ 95%                   ║
║  Session:   ████████░░ 85%                   ║
║                                              ║
║  Cycles: 12 | Violations: 1 | Success: 92%  ║
╚══════════════════════════════════════════════╝
```

Adaptable a cualquier sistema de métricas — los 5 componentes cambian según el dominio pero la estructura (score + trend + per-metric bars) es universal.

---

## 10. Conclusion — Conclusión

### La Filosofía SYNAPTIC Resumida

SYNAPTIC no es un prompt mejorado — es un **sistema de gobernanza para IA generativa**. Su valor no está en un solo componente sino en la **interacción compuesta** de:

1. **Prevención** que reduce la necesidad de corrección
2. **Corrección** que atrapa lo que la prevención no pudo
3. **Memoria** que mejora ambas fuerzas con cada ciclo
4. **Auditoría** que detecta degradación antes de que sea visible
5. **Control** que mantiene al humano como decisor final

### El Insight Fundamental

> **La consistencia de un AI assistant no se logra con post-hoc enforcement — se logra con system prompt coaching que le dice al LLM EXACTAMENTE qué producir, reforzado por validación determinista, y mejorado por memoria persistente que aprende de cada interacción.**

Cualquier sistema que implemente estos 5 principios — con la profundidad que su contexto requiera — experimentará la misma Ganancia Sináptica: **una mejora acumulativa y medible en calidad, consistencia y coherencia** con cada ciclo completado.

---

*Chapter III de la serie "Ganancia Sináptica" — SYNAPTIC v3.0 STRICT Protocol*
*Previous: Chapter II — "La Ganancia Sináptica" (mecanismos detallados)*
*Previous: Chapter I — "Anatomía del Corazón Sináptico" (componentes)*

---

## Appendix: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SYNAPTIC IMPLEMENTATION REFERENCE                   │
├──────────────┬──────────────────────────────────────────────────────┤
│ Principle    │ Key Files in SYNAPTIC Codebase                      │
├──────────────┼──────────────────────────────────────────────────────┤
│ P1 Validate  │ core/enforcement/response-validator.ts              │
│              │ core/enforcement/template-checker.ts                 │
│              │ core/enforcement/enforcement-constants.ts            │
├──────────────┼──────────────────────────────────────────────────────┤
│ P2 Decide    │ mcp/tools/decision-gate.tool.ts                     │
│              │ agent/services/intelligence-manager.ts (record)      │
├──────────────┼──────────────────────────────────────────────────────┤
│ P3 Remember  │ agent/services/intelligence-manager.ts               │
│              │ agent/services/confidence-system.ts                   │
│              │ agent/services/contradiction-detector.ts              │
├──────────────┼──────────────────────────────────────────────────────┤
│ P4 Audit     │ agent/services/micro-audit.service.ts                │
│              │ core/enforcement/sai-constants.ts                     │
│              │ agent/services/sai-persistence.service.ts             │
├──────────────┼──────────────────────────────────────────────────────┤
│ P5 Heal      │ core/enforcement/regeneration-engine.ts              │
│              │ core/enforcement/enforcement-runtime.ts               │
├──────────────┼──────────────────────────────────────────────────────┤
│ Protocol     │ shared/src/protocol-loader.ts                        │
│              │ SYNAPTIC_CORE.md / SYNAPTIC_EXTENDED.md              │
├──────────────┼──────────────────────────────────────────────────────┤
│ Persistence  │ workspace/src/workspace-writer.ts                    │
│              │ workspace/src/workspace-reader.ts                     │
│              │ workspace/src/types.ts (all interfaces)               │
└──────────────┴──────────────────────────────────────────────────────┘
```
