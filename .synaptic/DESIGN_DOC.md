# DESIGN_DOC.md - SYNAPTIC_SAAS

## SYNAPTIC Protocol v3.0 - Architecture Document

---

## 1. PROJECT OVERVIEW

### 1.1 Project Name
SYNAPTIC_SAAS

### 1.2 Description
Cloud-native SaaS platform for AI-assisted software development. Users bring their own LLM API keys (BYOK) and get access to the SYNAPTIC governance framework: protocol enforcement, decision gates, quality auditing (SAI), workspace management, and multi-provider LLM orchestration.

### 1.3 Project Type
Cloud SaaS Platform

### 1.4 Domain
AI-Assisted Software Development

### 1.5 Origin
Feasibility analysis DG-120 from SYNAPTIC_EXPERT. Clean-room implementation — NOT a fork.

---

## 2. ARCHITECTURE DECISIONS

### Decision Log

| ID | Decision | Option Selected | Date | Rationale |
|----|----------|-----------------|------|-----------|
| DG-120 | SaaS implementation strategy | A: Cloud-First New Repository | 2026-03-15 | Clean separation from local product (SYNAPTIC_EXPERT). Independent evolution. Avoids contaminating working local product. ~60% code reuse via standalone packages. |

*Decisions will be logged here as they are made through Decision Gates*

---

## 3. TECHNOLOGY STACK

### 3.1 Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15 | Full-stack React framework |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 4.x | Utility-first styling |

### 3.2 Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Fastify | 5 | HTTP server / API Gateway |
| Node.js | 22+ | Runtime |
| TypeScript | 5.x | Type safety |

### 3.3 Infrastructure
| Technology | Purpose |
|-----------|---------|
| Firestore (GCP) | Primary database — multi-tenant document store |
| Firebase Auth | Authentication — Google/GitHub SSO |
| GCP Secret Manager | Server-side secrets storage |
| E2B / Docker | Sandboxed tool execution per-user |
| Google Cloud Run | Backend hosting (containerized) |
| Firebase Hosting | Frontend hosting (CDN) |

### 3.4 LLM Providers (via ILLMProvider interface)
| Provider | API |
|----------|-----|
| Anthropic | Messages API |
| OpenAI | Chat Completions API |
| Google Gemini | Generative Language API |
| OpenRouter | Unified gateway (fallback/routing) |

### 3.5 Streaming
Server-Sent Events (SSE) — NOT WebSocket, NOT NDJSON.

---

## 4. SYSTEM COMPONENTS

### Component Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        Web UI (Next.js 15)                      │
│              Chat · Decision Gates · Dashboard · SSE            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Gateway (Fastify 5)                        │
│         Auth Middleware · Rate Limiting · Zod Validation         │
│         Routes: /health, /v1/sessions, /v1/execute, /v1/keys    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Orchestrator (AgentLoopService)                  │
│          Session Management · Turn Execution · Streaming        │
├────────────┬─────────────────────────────┬──────────────────────┤
│            │                             │                      │
│            ▼                             ▼                      ▼
│  ┌──────────────────┐  ┌──────────────────────┐  ┌────────────────────┐
│  │ LLM Provider     │  │ Tool Execution       │  │ SYNAPTIC Protocol  │
│  │ Adapter (BYOK)   │  │ Engine (Sandboxed)   │  │ Layer              │
│  │                  │  │                      │  │                    │
│  │ · Anthropic API  │  │ · Read / Write / Edit│  │ · Enforcement      │
│  │ · OpenAI API     │  │ · Glob / Grep        │  │ · Workspace Mgr    │
│  │ · Gemini API     │  │ · Bash (sandboxed)   │  │ · Intelligence Mgr │
│  │ · OpenRouter     │  │ · E2B / Docker       │  │ · SAI Audit        │
│  └──────────────────┘  └──────────────────────┘  └────────────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firestore (Multi-Tenant)                      │
│        Users · Projects · Sessions · Keys · Audit Logs          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Responsibility | Phase |
|-----------|---------------|-------|
| AgentLoopService | Core orchestration — receives user input, calls LLM, dispatches tools, enforces protocol | Phase 0 |
| ILLMProvider Adapters | Unified interface to multiple LLM APIs with BYOK keys | Phase 0 |
| ToolExecutor | Dispatches tool calls to sandbox, collects results | Phase 1 |
| SandboxManager | Manages E2B/Docker sandbox lifecycle per-session | Phase 4 |
| KeyManager | BYOK key encryption, storage, validation, rotation | Phase 2 |
| EnforcementRuntime | Protocol compliance checking (reused from SYNAPTIC_EXPERT) | Phase 1 |
| WorkspaceManager | Director files, project context management | Phase 1 |
| IntelligenceManager | Cross-session learning and memory | Phase 1 |
| SAI Auditor | Incremental code quality auditing | Phase 1 |

---

## 5. DATA FLOW

### Request Flow
```
User Input (Web UI)
    │
    ▼
API Gateway (Fastify)
    │ Authenticate (Firebase Auth)
    │ Validate (Zod schema)
    │ Rate limit check
    ▼
AgentLoopService.execute(request)
    │
    ├──► Decrypt user's API key (KeyManager)
    │
    ├──► Build system prompt (Enforcement + Workspace context)
    │
    ├──► Send to LLM (ILLMProvider.streamMessage())
    │       │
    │       ├──► Text chunks → SSE → Frontend (real-time)
    │       │
    │       └──► Tool use request → ToolExecutor
    │               │
    │               ├──► Execute in Sandbox (E2B/Docker)
    │               │
    │               └──► Return ToolResult → back to LLM
    │
    ├──► Enforcement validation on LLM response
    │
    └──► Final response → SSE → Frontend
              │
              └──► Log to Firestore (audit trail)
```

### Streaming Protocol
- Transport: Server-Sent Events (SSE)
- Events: `message`, `tool_use`, `tool_result`, `error`, `done`
- Encoding: JSON per event

---

## 6. SECURITY CONSIDERATIONS

- [x] Authentication method defined — Firebase Auth (Google/GitHub SSO)
- [x] Authorization rules documented — tenant-scoped Firestore rules
- [x] Data encryption requirements specified — see below
- [x] API security measures planned — rate limiting, Zod validation, auth middleware

### BYOK Key Security
| Requirement | Implementation |
|------------|---------------|
| Encryption at rest | AES-256-GCM via GCP Secret Manager |
| Encryption in transit | TLS 1.3 mandatory |
| Key exposure | Never in logs, never in plaintext responses |
| Validation | Server-side only, validated before first use |
| Rotation | User-initiated, old key invalidated immediately |
| Scope | Per-provider, per-user |

### Multi-Tenancy Isolation
| Layer | Isolation Method |
|-------|-----------------|
| Data | Firestore document paths scoped by `tenantId` |
| Execution | Per-session sandbox (E2B/Docker) |
| Keys | Per-user encrypted storage |
| Resources | Rate limits and quotas per pricing tier |

---

## 7. PATTERNS & CONVENTIONS

### Patterns to Follow
| Pattern | Where | Why |
|---------|-------|-----|
| Adapter | ILLMProvider implementations | Unified interface over heterogeneous LLM APIs |
| Strategy | Provider selection at runtime | User chooses provider per-session |
| Observer | SSE streaming pipeline | Decouple response generation from delivery |
| Factory | ProviderFactory | Instantiate correct provider from config |
| Stateless Services | All backend services | Cloud Run scales to zero; no in-memory state |

### Anti-patterns to Avoid
| Anti-pattern | Why |
|-------------|-----|
| Process spawning for LLM | Claude Code CLI license prohibits SaaS use |
| Direct local filesystem access | Cloud deployment has no persistent local FS |
| Shared mutable state between requests | Cloud Run instances are ephemeral |
| Provider lock-in | BYOK model requires multi-provider support |
| NDJSON streaming | Specific to Claude Code output; we use SSE |

---

## 8. EVOLUTION HISTORY

| Cycle | Change | Impact | Synaptic Strength |
|-------|--------|--------|-------------------|
| 0 | Project foundation — DG-120 decision, repo creation | Baseline | 0% |
| 1 | Director enrichment + technical scaffolding | Structure established | 5% |

---

## 9. REFERENCE

| Resource | Location |
|----------|----------|
| Founding document | `DG-120-FOUNDING-DOCUMENT.md` |
| Original repo (read-only) | `d:\GoLAB\PROYECTOS\SYNAPTIC_EXPERT\` |
| Multi-provider branch | `feature/cloud_byok` in SYNAPTIC_EXPERT |
| Feasibility report | `DG-120-SAAS-BYOK-FEASIBILITY-REPORT.md` in SYNAPTIC_EXPERT |

---

*Created: 2026-03-15T23:56:12.514Z*
*Updated: 2026-03-15*
*SYNAPTIC Protocol v3.0 - Architecture Evolution Tracking*
