# DESIGN_DOC.md - SYNAPTIC_SAAS

## SYNAPTIC Protocol v3.0 - Architecture Document

---

## 1. PROJECT OVERVIEW

### 1.1 Project Name
SYNAPTIC_SAAS

### 1.2 Description
Cloud-native SaaS platform for AI-assisted software development. Users bring their own LLM API keys (BYOK) and SYNAPTIC provides the orchestration engine, governance framework (Protocol v3.0), quality enforcement, and tooling.

### 1.3 Project Type
Cloud SaaS Platform (Web Application)

### 1.4 Domain
AI-Assisted Software Development — Cloud Edition

### 1.5 Origin
Derived from `SYNAPTIC_EXPERT` feasibility analysis (DG-120, March 2026). Clean-room implementation in a new repository, reusing standalone packages and architectural patterns from the original project.

---

## 2. ARCHITECTURE DECISIONS

### Decision Log

| ID | Decision | Option Selected | Date | Rationale |
|----|----------|-----------------|------|-----------|
| DG-120 | SaaS implementation strategy | A (Cloud-First New Repo) | 2026-03-15 | Clean separation from working local product; avoids contaminating SYNAPTIC_EXPERT; independent evolution |

*Decisions will be logged here as they are made through Decision Gates*

---

## 3. TECHNOLOGY STACK

### 3.1 Frontend
- Next.js 15 + React 19
- TypeScript (strict mode)
- TailwindCSS
- SSE client for streaming responses

### 3.2 Backend
- Fastify 5 (API server)
- Node.js 22+ (runtime)
- TypeScript (strict mode)
- AgentLoopService (custom orchestrator)

### 3.3 Infrastructure
- Google Cloud Run (compute — scales to zero)
- Firebase Hosting (static assets)
- Firestore (database — flexible schema, serverless)
- Firebase Auth (authentication — Google/GitHub SSO)
- GCP Secret Manager (BYOK key storage)
- E2B or Docker (sandboxed tool execution)

### 3.4 LLM Providers (BYOK)
- Anthropic API (Claude models)
- OpenAI API (GPT models)
- Google Gemini API
- OpenRouter (200+ models aggregator)

### 3.5 Shared Packages (from SYNAPTIC_EXPERT)
- `@synaptic-sre/enforcement` — Protocol enforcement runtime (0 deps)
- `@synaptic-sre/workspace` — Workspace/director file management (0 deps)

---

## 4. SYSTEM COMPONENTS

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYNAPTIC CLOUD PLATFORM                       │
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  Web UI   │───>│  API Gateway  │───>│  Orchestrator Service │  │
│  │ (Next.js) │<───│  (Auth/Rate)  │<───│  (Agent Loop)         │  │
│  └──────────┘    └──────────────┘    └───────────┬───────────┘  │
│                                                   │              │
│                          ┌────────────────────────┤              │
│                          │                        │              │
│                          v                        v              │
│  ┌───────────────────────────┐    ┌─────────────────────────┐   │
│  │   LLM Provider Adapter    │    │   Tool Execution Engine  │   │
│  │                           │    │                          │   │
│  │  ┌─────────┐ ┌─────────┐ │    │  ┌────┐ ┌────┐ ┌─────┐ │   │
│  │  │Anthropic│ │ OpenAI  │ │    │  │Read│ │Edit│ │Bash │ │   │
│  │  │  API    │ │  API    │ │    │  └────┘ └────┘ └─────┘ │   │
│  │  └─────────┘ └─────────┘ │    │  ┌────┐ ┌────┐ ┌─────┐ │   │
│  │  ┌─────────┐ ┌─────────┐ │    │  │Glob│ │Grep│ │Write│ │   │
│  │  │ Gemini  │ │OpenRouter│ │    │  └────┘ └────┘ └─────┘ │   │
│  │  │  API    │ │  Proxy   │ │    └─────────────────────────┘   │
│  │  └─────────┘ └─────────┘ │                                   │
│  └───────────────────────────┘                                   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   SYNAPTIC PROTOCOL LAYER                  │  │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │Enforcement │ │Workspace │ │ Protocol │ │Intelligence│  │  │
│  │  │  Runtime   │ │ Manager  │ │  Loader  │ │  Manager   │  │  │
│  │  └────────────┘ └──────────┘ └──────────┘ └───────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  User Store   │  │ Project Store │  │  Sandbox (E2B/Docker) │  │
│  │  (Firestore)  │  │ (Firestore)   │  │  Per-user isolation   │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Source |
|-----------|---------------|--------|
| Web UI | Chat interface, Decision Gate UI, metrics dashboard | New (adapt from packages/web) |
| API Gateway | Auth, rate limiting, request validation | New |
| Orchestrator | Agent loop: prompt → LLM → tools → enforcement → response | New (replaces agent.ts + claude-spawner.ts) |
| LLM Provider Adapter | Unified interface to multiple LLM APIs | New (cherry-pick from cloud_byok) |
| Tool Execution Engine | Sandboxed Read/Write/Edit/Glob/Grep/Bash | New |
| Enforcement Runtime | Protocol validation, regeneration loop | Reuse from @synaptic-sre/enforcement |
| Workspace Manager | Director files, session, BITACORA per project | Reuse from @synaptic-sre/workspace |

---

## 5. DATA FLOW

### Request Flow
```
User Input
  → API Gateway (auth + rate limit)
    → Orchestrator.executePrompt()
      → buildSystemPrompt() (workspace + enforcement context)
      → ILLMProvider.streamMessage(request)
        → [LLM API Response Stream]
          → Parse: text | tool_use | stop
            → tool_use: ToolEngine.execute(tool, args) [sandboxed]
            → text: accumulate response
            → stop: enforcement.validate(response)
              → pass: emit via SSE to frontend
              → fail: regeneration loop (max 5)
```

---

## 6. SECURITY CONSIDERATIONS

- [x] Authentication method defined: Firebase Auth (Google/GitHub SSO)
- [ ] Authorization rules documented
- [ ] Data encryption requirements specified: BYOK keys AES-256 at rest
- [ ] API security measures planned: rate limiting, input validation
- [ ] Sandbox isolation: E2B or Docker per-user
- [ ] GDPR considerations: data residency options for Enterprise tier

---

## 7. PATTERNS & CONVENTIONS

### Patterns to Follow
- **Adapter Pattern**: ILLMProvider for all LLM integrations
- **Strategy Pattern**: Provider selection based on user config
- **Observer Pattern**: SSE streaming for real-time updates
- **Factory Pattern**: Provider instantiation from user config
- **Stateless Services**: All services are stateless; state lives in Firestore

### Anti-patterns to Avoid
- **No process spawning**: Direct API calls only (no child_process.spawn)
- **No local filesystem reliance**: All storage via Firestore or sandbox
- **No shared mutable state**: Each request is independent
- **No provider lock-in**: Every LLM interaction goes through ILLMProvider interface

---

## 8. EVOLUTION HISTORY

| Cycle | Change | Impact | Synaptic Strength |
|-------|--------|--------|-------------------|
| 0 | Project founded from DG-120 analysis | Baseline | 0% |

---

*Created: 2026-03-15*
*SYNAPTIC Protocol v3.0 - Architecture Evolution Tracking*
