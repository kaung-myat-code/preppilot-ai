# 🤖 AGENTS.md — Development Guidelines for AI Coding Agents

> This document defines operational standards, architectural constraints, and engineering rules for AI agents (Antigravity, Cursor, Claude Code, Cline) collaborating on the **PrepPilot AI** repository.

---

## 1. Project Overview & Boundaries
* **Project Name:** PrepPilot AI
* **Framework:** Next.js 14+ (App Router only, no `pages/` directory allowed)
* **Directory Root:** All application logic resides inside `src/app/`, `src/components/`, `src/utils/`, and `src/lib/`.
* **Primary AI Engine:** `@ai-sdk/google` using model identifier `gemini-2.5-flash` (or `gemini-flash-latest`).
* **Database & Auth:** Supabase PostgreSQL with `@supabase/ssr` cookies handler.

---

## 2. Core Architectural Rules (Strict)

### A. Server/Client Component Separation
* Default to **React Server Components (RSC)** where data fetching or static presentation occurs.
* Mark interactive UI files with `'use client'` only when state (`useState`), effects (`useEffect`), or browser events are required.
* Never import server-only utilities (like `next/headers` or secret API keys) into Client Components.

### B. LLM Integrations & Structured Output
* Never use raw `JSON.parse()` on unstructured LLM text strings.
* Always enforce structured responses using `generateObject` (or `streamObject`) with explicit **Zod (`zod`) schemas**.
* Every blueprint generated must include the architectural rationale (`why`) field and cleanly distinct `humanTask` vs `agenticPrompt` modules.
* Never expose API keys (`GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) to the client. All LLM calls must run inside Server Actions or Route Handlers (`src/app/api/...`).

### C. Type Safety & Linting
* TypeScript `strict` mode is enabled. Never use `any` unless explicitly required for edge-case error wrapping (`error: unknown` preferred).
* Run `npm run lint` and verify zero ESLint errors before completing a task.
* All API request payloads must be validated using Zod before invoking backend logic.

### D. README.md Policy
* Never modify `README.md` during incremental feature implementation or bug fixing.
* Update `README.md` only upon:
  * Formal milestone releases (e.g., shipping v1.1.0).
  * Direct changes to required environment variables or local setup instructions.
  * Explicit human command.

---

## 3. Human vs. Agent Role Conventions

When assisting with code generation or roadmap progression:
1. **Human Tasks:** Tasks related to architectural decisions, DB schema policies (RLS), security reviews, and verbal interview articulation must be highlighted for human execution.
2. **Agent Tasks:** Routine boilerplate, UI styling (Tailwind CSS), unit tests (Vitest/Jest), and type definitions should be automated cleanly by the agent.

---

## 4. Standard Commands

```bash
# Start local development server
npm run dev

# Check TypeScript types without emitting
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Production build check
npm run build
```

---

## 5. Error Handling & Resilience
* Wrap all external asynchronous API calls (Supabase queries, AI SDK calls) inside `try/catch` blocks.
* Return standardized JSON error responses: `{ error: string }` with appropriate HTTP status codes (400 for bad payloads, 500 for server/AI failure).
* When handling API model updates, never guess model identifiers; inspect active model capabilities via the provider's official catalog.
---

# Agent Operating Rules & System Governance

## 6. Ground Truth First (Pre-Execution Invariant)
Before writing or refactoring any code, schemas, or tests:
- You MUST inspect `.agent/PROJECT_STATE.md`.
- Treat `.agent/PROJECT_STATE.md` as the definitive single source of truth for:
  - Database schema column names (e.g., `definition`, not `technical_definition`; `interview_context`, not `interview_answer`).
  - Table types (e.g., `id uuid`, vector dimensions strictly 768).
  - Retrieval waterfall rules (Canonical -> Alias -> Vector [0.65/0.72] -> Generative Fallback).
  - Security boundaries (Service role key strictly on server, CI grep verification).
- Never re-introduce deprecated column names or overwrite calibrated vector thresholds without explicit authorization.

## 7. Living State Sync (Post-Execution Invariant)
Whenever your changes involve ANY of the following:
- Database schema changes (columns, types, constraints, RPC signatures)
- Retrieval logic or threshold adjustments
- New API routes or Zod schema extensions
- Completing a milestone task or resolving a notable bug

You MUST update `.agent/PROJECT_STATE.md` as part of your file changes BEFORE declaring the task complete:
- Append completed deliverables to **Section 4: Completed Milestones & Changelog**.
- Update **Section 5: Active Roadmap** to reflect current focus and next tasks.
- If database columns or retrieval rules changed, update **Section 2** or **Section 3** immediately to maintain synchronization.

## 8. Quality & Verification Gates
Before finishing any task:
1. Run `npx tsc --noEmit` and ensure 0 type errors.
2. Run `npm test` and ensure all test suites pass.
3. Ensure no secrets (like `SUPABASE_SERVICE_ROLE_KEY`) are exposed in client-accessible paths or prefixed with `NEXT_PUBLIC_`.

---

## 9. Lean v1.1.0 Operating Rules (Strict)

### Rule 1 — Pre-Flight Audit (Ground Truth First)
Before modifying any schemas, API routes, or UI components, always inspect `.agent/PROJECT_STATE.md`. Never re-introduce deprecated column names (`technical_definition`, `interview_answer`) or alter the calibrated retrieval thresholds (`0.65` for >2 words, `0.72` for <=2 words) or the vector dimension (`768`).

### Rule 2 — Post-Flight Sync (Living State Ledger)
Whenever a task updates schemas, API routes, or completes a milestone step, synchronously update `.agent/PROJECT_STATE.md` (Sections 4 and 5) in the exact same diff before finishing.

### Rule 3 — README Discipline
Do not modify `README.md` during incremental bug fixes or minor code tasks unless explicitly instructed or finalizing a release milestone.

### Rule 4 — Verification Gate
Run `npx tsc --noEmit`, `npm test`, and `npm run lint` after every code implementation step.
