# CLAUDE.md — SYNAPTIC_SAAS

## Project Identity
- **Name**: SYNAPTIC_SAAS
- **Type**: Cloud SaaS Platform — AI-Assisted Development with BYOK
- **Protocol**: SYNAPTIC v3.0 STRICT
- **Created**: 2026-03-15
- **Origin**: Feasibility analysis DG-120 from SYNAPTIC_EXPERT

## What This Project Is

SYNAPTIC_SAAS is a cloud-native SaaS platform where users bring their own LLM API keys (BYOK) and get access to the SYNAPTIC governance framework: protocol enforcement, decision gates, quality auditing (SAI), workspace management, and multi-provider LLM orchestration.

**This is NOT a fork of SYNAPTIC_EXPERT.** It is a clean-room implementation that reuses architectural patterns and standalone packages from the original, but has its own codebase, git history, and evolution path.

## SYNAPTIC Protocol — MANDATORY

Before ANY work session:
1. Read `SYNAPTIC_MANTRA.md` — protocol alignment
2. Read `.synaptic/RULES.md` — project rules
3. Read `.synaptic/DESIGN_DOC.md` — architecture decisions
4. Check `SYNAPTIC_BITACORA.md` — last session state
5. Register your session in BITACORA before starting work

## Architecture Overview

```
Web UI (Next.js) → API Gateway (Fastify) → Orchestrator (AgentLoopService)
                                               ├── LLM Provider Adapter (BYOK)
                                               │   ├── Anthropic API
                                               │   ├── OpenAI API
                                               │   ├── Gemini API
                                               │   └── OpenRouter
                                               ├── Tool Execution Engine (Sandboxed)
                                               └── SYNAPTIC Protocol Layer
                                                   ├── Enforcement Runtime
                                                   ├── Workspace Manager
                                                   └── Intelligence Manager
```

## Key Design Decisions

1. **No Claude Code CLI**: Users interact with LLM APIs directly. Claude Code's license prohibits SaaS use.
2. **BYOK Model**: Users provide their own API keys. We provide orchestration and governance.
3. **Sandboxed Execution**: All tool execution (Read, Write, Edit, Bash) runs in E2B or Docker sandboxes.
4. **Multi-Tenant**: User/project isolation via Firestore scoping and sandbox isolation.
5. **SSE Streaming**: Server-Sent Events for real-time response streaming (not WebSocket, not NDJSON).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS |
| Backend | Fastify 5, Node.js 22+, TypeScript |
| Database | Firestore (GCP) |
| Auth | Firebase Auth (Google/GitHub SSO) |
| Secrets | GCP Secret Manager |
| Sandbox | E2B or Docker |
| Hosting | Google Cloud Run + Firebase Hosting |
| LLM | Anthropic, OpenAI, Gemini, OpenRouter (via ILLMProvider) |

## Reference: SYNAPTIC_EXPERT

The original local version lives at `d:\GoLAB\PROYECTOS\SYNAPTIC_EXPERT\`. Key files to consult when needed:

| What | Where |
|------|-------|
| Feasibility report | `DG-120-SAAS-BYOK-FEASIBILITY-REPORT.md` |
| System prompt builder | `packages/agent/src/agent.ts` lines 1710-2120 |
| Enforcement wrapping | `packages/agent/src/agent.ts` lines 2228-2304 |
| Enforcement package | `packages/enforcement/` (standalone, 0 deps) |
| Workspace package | `packages/workspace/` (standalone, 0 deps) |
| Multi-provider code | Branch `feature/cloud_byok` — `packages/vscode-extension/src/llm/` |
| SAI audit system | `packages/agent/src/services/micro-audit.service.ts` |
| Intelligence manager | `packages/agent/src/services/intelligence-manager.ts` |
| Shared types | `packages/shared/src/types/` |

**Important**: SYNAPTIC_EXPERT is the WORKING local product. Do NOT modify it from this project. Read-only reference.

## Build & Run (once scaffolded)

```bash
npm install          # Install all dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Lint check
```

## Commit Convention

```
[SYNAPTIC] <phase>: <description>

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Critical Rules

1. **No process spawning** for LLM interaction — direct API calls only
2. **No local filesystem** reliance — everything via Firestore or sandbox
3. **API keys never in plaintext** — encrypted at rest and in transit
4. **All endpoints authenticated** — no public endpoints except health check
5. **ILLMProvider interface** is the ONLY way to interact with LLMs
6. **Decision Gates** for ALL architectural choices — no autonomous decisions
