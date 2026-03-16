# RULES.md - SYNAPTIC_SAAS

## SYNAPTIC Protocol v3.0 - Project Rules

---

## 1. CODE QUALITY RULES

### 1.1 General Standards
- All code must follow consistent formatting (Prettier enforced)
- No commented-out code in production
- Clear, descriptive variable and function names
- Maximum function length: 50 lines
- Maximum file length: 300 lines
- TypeScript strict mode mandatory — no `any` without justification

### 1.2 Documentation
- All public functions must have JSDoc/docstrings
- README.md must be updated with each major feature
- CHANGELOG must be maintained

### 1.3 Error Handling
- All async operations must have error handling
- User-facing errors must be clear and actionable
- Log all errors with context (but NEVER log API keys or secrets)

---

## 2. ARCHITECTURE RULES

### 2.1 Structure
- Separation of concerns is mandatory
- No circular dependencies allowed
- Clear module boundaries

### 2.2 Dependencies
- All dependencies must be justified
- No duplicate functionality
- Regular security audits required

### 2.3 BYOK Security Rules
- API keys encrypted AES-256-GCM at rest via GCP Secret Manager
- TLS 1.3 mandatory for all key transmission
- Keys NEVER appear in logs (application, server, or cloud logging)
- Keys NEVER stored in plaintext — not in Firestore, not in env vars, not in memory longer than needed
- Server-side validation only — keys never sent to frontend after initial submission
- Key rotation: user-initiated, old key invalidated immediately
- Failed validation attempts rate-limited (max 5/minute per user)

### 2.4 Multi-Tenancy Rules
- All data scoped by `tenantId` — no cross-tenant data access
- No shared mutable state between tenants
- Resource limits enforced per pricing tier (cycles, projects, sandbox time)
- Workspace isolation: each project has independent director files
- Firestore security rules enforce tenant boundary at database level
- Sandbox instances are per-session, never shared

---

## 3. SYNAPTIC PROTOCOL RULES

### 3.1 Decision Gates
- ALL architectural decisions require a Decision Gate
- MINIMUM 3 options must be presented
- NO implementation before user approval

### 3.2 Documentation Requirements
- Every cycle must update BITACORA.md
- Every decision must be recorded
- All trade-offs must be documented

### 3.3 Validation
- Code must pass all existing tests before submission
- New features require new tests
- Compliance score must stay above 70%

---

## 4. PROJECT-SPECIFIC RULES

### 4.1 LLM Provider Rules
- ALL providers MUST implement the `ILLMProvider` interface — no exceptions
- Provider-specific code isolated in adapter modules (`src/providers/<name>.ts`)
- Streaming MUST use SSE (Server-Sent Events) — NOT WebSocket, NOT NDJSON
- Cost estimation is mandatory before execution (`estimateCost()`)
- Provider selection is user-driven (per-session), not hardcoded
- Graceful degradation: if a provider doesn't support tool use, inform user — don't fail silently
- No direct imports of provider SDKs outside adapter modules

### 4.2 Tool Execution Rules
- ALL tool execution happens inside a sandbox (E2B or Docker) — no host filesystem access
- No direct filesystem operations on the server host
- Timeout: 30 seconds per tool call (configurable per tier)
- Memory limit: 512MB per sandbox instance
- Tool results must be sanitized before returning to LLM
- Supported tools: Read, Write, Edit, Glob, Grep, Bash (sandboxed)

### 4.3 API Rules
- ALL endpoints authenticated via Firebase Auth — except `GET /health`
- Rate limiting enforced per pricing tier
- Request validation with Zod schemas — no unvalidated input reaches business logic
- API versioned from day 1 — all routes under `/v1/`
- Response format: JSON with consistent error schema
- SSE endpoints use proper `text/event-stream` content type

---

## 5. ENFORCEMENT

- Mode: STRICT
- Auto-rejection: Enabled
- Compliance threshold: 70%

---

## 6. REFERENCE

SYNAPTIC_EXPERT (`d:\GoLAB\PROYECTOS\SYNAPTIC_EXPERT\`) is the READ-ONLY reference repository.

| What | Where in SYNAPTIC_EXPERT |
|------|--------------------------|
| Enforcement package | `packages/enforcement/` (standalone, 0 deps) |
| Workspace package | `packages/workspace/` (standalone, 0 deps) |
| System prompt builder | `packages/agent/src/agent.ts` lines 1710-2120 |
| Enforcement wrapping | `packages/agent/src/agent.ts` lines 2228-2304 |
| Multi-provider code | Branch `feature/cloud_byok` |
| SAI audit system | `packages/agent/src/services/micro-audit.service.ts` |
| Intelligence manager | `packages/agent/src/services/intelligence-manager.ts` |
| Shared types | `packages/shared/src/types/` |

**Rule**: NEVER modify SYNAPTIC_EXPERT from this project. Read-only consultation only.

---

*Last Updated: 2026-03-15*
*SYNAPTIC Protocol v3.0*
