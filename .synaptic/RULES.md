# RULES.md - SYNAPTIC_SAAS

## SYNAPTIC Protocol v3.0 - Project Rules

---

## 1. CODE QUALITY RULES

### 1.1 General Standards
- All code must follow consistent formatting (Prettier)
- No commented-out code in production
- Clear, descriptive variable and function names
- Maximum function length: 50 lines
- Maximum file length: 300 lines
- TypeScript strict mode mandatory

### 1.2 Documentation
- All public functions must have JSDoc/docstrings
- README.md must be updated with each major feature
- CHANGELOG must be maintained
- API endpoints must be documented with OpenAPI/Swagger

### 1.3 Error Handling
- All async operations must have error handling
- User-facing errors must be clear and actionable
- Log all errors with context (structured logging)
- Never expose internal errors to end users

---

## 2. ARCHITECTURE RULES

### 2.1 Structure
- Separation of concerns is mandatory
- No circular dependencies allowed
- Clear module boundaries between packages
- Cloud-native patterns: stateless services, externalized config

### 2.2 Dependencies
- All dependencies must be justified
- No duplicate functionality
- Regular security audits required (npm audit)
- Prefer well-maintained packages with active communities

### 2.3 BYOK Security
- API keys MUST be encrypted at rest (AES-256 minimum)
- API keys MUST be encrypted in transit (TLS 1.3)
- API keys MUST NEVER appear in logs
- API keys MUST NEVER be stored in plaintext
- API key validation must happen server-side only
- Failed key validation must not reveal key content

### 2.4 Multi-Tenancy
- All data access must be scoped by tenant/user
- No shared state between tenants
- Resource limits enforced per-tier
- Workspace isolation is mandatory

---

## 3. SYNAPTIC PROTOCOL RULES

### 3.1 Decision Gates
- ALL architectural decisions require a Decision Gate
- MINIMUM 3 options must be presented (A/B/C)
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

### Project: SYNAPTIC_SAAS
### Description: Cloud SaaS platform for AI-assisted development with BYOK model

### 4.1 LLM Provider Rules
- All providers must implement `ILLMProvider` interface
- Provider-specific code must be isolated in adapter modules
- Streaming must use SSE (Server-Sent Events)
- Cost estimation must be provided before execution
- Model fallback chain must be configurable per-user

### 4.2 Tool Execution Rules
- All tool execution must happen inside sandboxed environments
- No direct filesystem access on host
- Sandbox timeout: 30 seconds per tool call
- Sandbox memory limit: 512MB per session

### 4.3 API Rules
- All endpoints must require authentication
- Rate limiting must be enforced per-tier
- Request/response must be validated with Zod schemas
- Versioned API (v1, v2...) from day one

---

## 5. ENFORCEMENT

- Mode: STRICT
- Auto-rejection: Enabled
- Compliance threshold: 70%

---

## 6. REFERENCE: SYNAPTIC_EXPERT

This project is derived from analysis of `SYNAPTIC_EXPERT` (local version).
When in doubt about protocol implementation, consult:
- `d:\GoLAB\PROYECTOS\SYNAPTIC_EXPERT\` — original codebase
- `DG-120-SAAS-BYOK-FEASIBILITY-REPORT.md` in SYNAPTIC_EXPERT — founding analysis

---

*Last Updated: 2026-03-15*
*SYNAPTIC Protocol v3.0*
