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