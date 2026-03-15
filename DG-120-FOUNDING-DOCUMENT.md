# DG-120: Documento Fundacional — SYNAPTIC_SAAS

**Fecha de fundación**: 2026-03-15
**Decisión**: Opción A — Cloud-First New Repository
**Origen**: Análisis de factibilidad DG-120 en SYNAPTIC_EXPERT

---

## 1. POR QUÉ EXISTE ESTE PROYECTO

SYNAPTIC_EXPERT es una plataforma local de desarrollo asistido por IA que funciona ejecutando `npm run dev:api`, `npm run dev:agent`, `npm run dev:web` y accediendo a `localhost:3000`. Es un producto funcional y maduro.

Se identificó la oportunidad de llevar SYNAPTIC a la nube como SaaS, pero con restricciones fundamentales:

1. **Claude Code CLI no puede usarse en SaaS** — su licencia prohibe uso comercial tipo SaaS
2. **El motor de ejecución actual** (`claude-spawner.ts`) está 100% acoplado a Claude Code CLI
3. **No existe multi-tenancy** — la arquitectura actual es single-user
4. **El modelo debe ser BYOK** — los usuarios traen sus propias API keys

### Decisión del usuario
> "Quiero mantener, limpiar y purificar solamente la versión local en SYNAPTIC_EXPERT. Para el SaaS quiero un arranque completamente limpio, en un repositorio completamente nuevo, aun cuando esto signifique mayor esfuerzo."

Esta decisión es **arquitecturalmente correcta**: el producto local y el SaaS son productos fundamentalmente distintos. Forzarlos en un mismo repo genera acoplamiento artificial.

---

## 2. QUÉ SE TRAE DE SYNAPTIC_EXPERT

### Reutilizable tal cual (copiar/adaptar)
| Componente | Ubicación en SYNAPTIC_EXPERT | % Reutilizable |
|------------|------------------------------|---------------|
| Enforcement Runtime | `packages/enforcement/` | 100% |
| Workspace Management | `packages/workspace/` | 85% |
| Tipos compartidos | `packages/shared/src/types/` | 95% |
| Protocol Loader | `packages/shared/src/protocol-loader.ts` | 90% |
| SAI (auditoría) | `packages/agent/src/services/micro-audit.service.ts` | 80% |
| Intelligence Manager | `packages/agent/src/services/intelligence-manager.ts` | 80% |

### Reutilizable con adaptación
| Componente | Cambio requerido |
|------------|-----------------|
| `buildSystemPrompt()` (agent.ts:1710-2120) | Extraer a módulo independiente |
| `wrapPromptWithEnforcement()` (agent.ts:2228-2304) | Extraer a módulo independiente |
| Director Files pattern | Adaptar PathResolver para cloud storage |
| Session Management | Migrar de archivo local a Firestore |
| Multi-provider code (branch cloud_byok) | Cherry-pick y adaptar para server-side |

### NO reutilizable (reescritura completa)
| Componente | Razón |
|------------|-------|
| `claude-spawner.ts` | 100% Claude Code CLI, child_process.spawn |
| Agent Loop (agent.ts) | Basado en spawn → wait → parse NDJSON |
| Tool System | Claude Code maneja tools internamente |
| File System Operations | Delega a Claude Code local |
| Streaming (NDJSON) | Específico de Claude Code output format |

---

## 3. QUÉ SE CONSTRUYE DESDE CERO

### Nuevos componentes core
1. **AgentLoopService** — Orquestador que usa APIs directas de LLM (no CLI spawn)
2. **ILLMProvider Adapter** — Interface unificada: Anthropic, OpenAI, Gemini, OpenRouter
3. **Tool Execution Engine** — Sandboxed (E2B/Docker) Read, Write, Edit, Glob, Grep, Bash
4. **BYOK Key Manager** — Encrypted storage, validation, rotation
5. **Multi-tenant Auth** — Firebase Auth con user/project isolation
6. **API Gateway** — Fastify con rate limiting, validation, auth middleware
7. **Web UI** — Next.js chat interface con SSE streaming

### Interface central del proyecto
```typescript
interface ILLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: LLMCapabilities;
  sendMessage(request: LLMRequest): Promise<LLMResponse>;
  streamMessage(request: LLMRequest): AsyncGenerator<LLMStreamChunk>;
  validateApiKey(key: string): Promise<boolean>;
  estimateCost(request: LLMRequest): CostEstimate;
}
```

---

## 4. MODELO DE NEGOCIO

### BYOK — "Trae tu propia API key, nosotros ponemos la inteligencia de proceso"

El usuario paga por:
- Framework SYNAPTIC (protocol enforcement, quality gates, decision gates)
- Workspace management (director files, BITACORA, intelligence)
- UI/UX (dashboard, métricas, historial)
- Orquestación multi-provider
- Sistema SAI (auditoría incremental)
- Sandboxed execution

El usuario NO paga por:
- Tokens de LLM (usa su propia API key)

### Tiers sugeridos
| Tier | Precio/mes | Target |
|------|-----------|--------|
| Free | $0 | 1 proyecto, 50 ciclos/mes |
| Pro | $19-29 | 10 proyectos, ciclos ilimitados |
| Team | $49-79/seat | Proyectos compartidos, SSO |
| Enterprise | Custom | Self-hosted, SLA, compliance |

---

## 5. RIESGOS CONOCIDOS (SIN OPTIMISMO ILUSORIO)

1. **El agent loop es el componente más complejo** — reescribirlo tomará semanas, no días
2. **Tool execution en sandbox tiene latencia** — benchmark temprano es obligatorio
3. **No todos los modelos soportan tool use** — graceful degradation necesario
4. **BYOK key security es crítico** — una filtración destruye la confianza
5. **El mercado está saturado** — la diferenciación es gobernanza, no "mejor autocompletado"
6. **Multi-tenancy en workspace/enforcement** — los packages son stateless, pero necesitan tenant context

---

## 6. ROADMAP DE ALTO NIVEL

| Fase | Descripción | Estimación |
|------|------------|-----------|
| 0 - Foundation | ILLMProvider + AnthropicProvider + AgentLoopService | 2-3 semanas |
| 1 - Minimal Cloud Agent | Tool execution + enforcement + workspace + API | 2-3 semanas |
| 2 - Multi-Provider + BYOK | OpenAI, Gemini, OpenRouter + key management | 2 semanas |
| 3 - Web UI | Chat, Decision Gates, dashboard, streaming | 3-4 semanas |
| 4 - Sandbox & Security | E2B/Docker, isolation, rate limiting, audit | 2-3 semanas |
| 5 - Polish & Launch | Onboarding, billing (Stripe), docs, beta | 2 semanas |

**Total estimado: 13-17 semanas** con un desarrollador dedicado.

---

## 7. REFERENCIA CRUZADA

- **Reporte completo**: `d:\GoLAB\PROYECTOS\SYNAPTIC_EXPERT\DG-120-SAAS-BYOK-FEASIBILITY-REPORT.md`
- **Repo original**: `d:\GoLAB\PROYECTOS\SYNAPTIC_EXPERT\` (READ-ONLY reference)
- **Branch con multi-provider**: `feature/cloud_byok` en SYNAPTIC_EXPERT
- **Branch cloud fallido**: `cloud/hybrid` en SYNAPTIC_EXPERT (NO usar como base)

---

*Documento fundacional — SYNAPTIC_SAAS*
*SYNAPTIC Protocol v3.0 STRICT*
*2026-03-15*
