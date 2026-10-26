# 🤖 AGENTS.md — Development Guidelines for AI Coding Agents

> This document is the central orchestrator for AI agents (Antigravity, Cursor, Claude Code, Cline) collaborating on the **PrepPilot AI** repository. It defines the pipeline: **Pre-Flight → Implement → Post-Flight → `code-review` → `git-commit` → `ship-release` (with `consultative-debugger` for diagnostic escalation)**.

---

## 1. Ground Truth Invariant (Pre-Flight)
Before writing or refactoring any code, schemas, or tests:
- You MUST read `.agent/PROJECT_STATE.md`. It is the single source of truth.
- Never violate its database column contracts: `definition`, `interview_context`, `analogy`, `canonical_key` (generated; never written directly). Never re-introduce deprecated names `technical_definition` or `interview_answer`.
- Never change the vector dimension (`768`) or the calibrated dynamic retrieval thresholds (`0.65` for queries over 2 words, `0.72` for 2 words or fewer) without explicit authorization.
- Respect the retrieval waterfall (Canonical -> Alias -> Vector -> Generative Fallback) and the security boundaries (service role key strictly server-side).

---

## 2. Living Memory Invariant (Post-Flight)
Whenever any of the following change:
- Zod schemas (`src/lib/schemas.ts`)
- API routes (`src/app/api/`)
- Database objects (columns, types, constraints, RPC signatures) or retrieval thresholds
- Milestone deliverables or notable bug resolutions

You MUST update `.agent/PROJECT_STATE.md` in the same working tree before finishing:
- Append deliverables to **Section 4: Completed Milestones & Changelog**.
- Update **Section 5: Active Roadmap** with current focus and next tasks.
- Update **Section 2** / **Section 3** immediately if columns or retrieval rules changed.

---

## 3. Connected Skill Workflow (How Skills Chain Together)
Shipping code follows a mandatory 3-step lifecycle. Each stage gates the next.

1. **`code-review`** (`.agent/skills/code-review/SKILL.md`) — Stage 1 Gatekeeper.
   Run after implementation. Audits `git diff` against `.agent/PROJECT_STATE.md`, security boundaries, and the test suites (`npx tsc --noEmit`, `npm test` (vitest), `npm run lint`). Resolve all P0 findings before moving on.
2. **`git-commit`** (`.agent/skills/git-commit/SKILL.md`) — Stage 2 Atomic Committer.
   Run only after `code-review` returns `✅ APPROVED TO COMMIT`. Ensures `.agent/PROJECT_STATE.md` is staged alongside code changes.
3. **`ship-release`** (`.agent/skills/ship-release/SKILL.md`) — Stage 3 Milestone Release Manager.
   Run only when completing a version milestone (e.g., `v1.1.0`). Syncs `README.md`, runs `npm run build` plus the static secret scan, tags, and pushes.

```
implement -> code-review (✅ APPROVED) -> git-commit -> [milestone?] -> ship-release
```

### Diagnostic Escalation Path: `consultative-debugger`
When automated verification gates (`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`), dev-server runs (`npm run dev`), or live smoke tests encounter unexpected failures or crashes, do NOT guess or blindly patch code ("no yolo-fixing").

Escalate immediately to **`consultative-debugger`** (`.agent/skills/consultative-debugger/SKILL.md`):
1. **Trace & Map Blast Radius:** Isolate the failing stack trace or runtime crash and evaluate blast radius across schemas, API contracts, and dependent components.
2. **Deliver 4-Part Diagnostic Report:** Present Root Cause Analysis, Blast Radius Assessment, Solution Options (**Option A: Tactical Patch** vs. **Option B: Architectural Fix**), and explicit recommendation with trade-offs.
3. **Strict Halt for Approval:** Stop execution completely and request explicit human sign-off before modifying any source code.
4. **Verified Remediation:** Implement only the approved solution and verify across quality gates (`tsc`, `test`, `lint`) before re-entering `code-review`.

```
[Gate / Smoke Test Failure]
       │
       ▼
consultative-debugger ──► 4-Part Report (Option A vs B) ──► Human Approval ──► Fix & Verify ──► code-review
```

---

## 4. README Policy
- Do not modify `README.md` during incremental feature work, bug fixes, or minor tasks.
- Update it only during the `ship-release` skill, on direct changes to required environment variables or local setup instructions, or on explicit user instruction.

---

# Appendix — Engineering Reference (Strict)

## A. Project Overview & Boundaries
* **Project Name:** PrepPilot AI
* **Framework:** Next.js 14+ (App Router only, no `pages/` directory allowed)
* **Directory Root:** All application logic resides inside `src/app/`, `src/components/`, `src/utils/`, and `src/lib/`.
* **Primary AI Engine:** `@ai-sdk/google` using model identifier `gemini-2.5-flash` (or `gemini-flash-latest`).
* **Database & Auth:** Supabase PostgreSQL with `@supabase/ssr` cookies handler.

## B. Core Architectural Rules

### Server/Client Component Separation
* Default to **React Server Components (RSC)** where data fetching or static presentation occurs.
* Mark interactive UI files with `'use client'` only when state (`useState`), effects (`useEffect`), or browser events are required.
* Never import server-only utilities (like `next/headers` or secret API keys) into Client Components.

### LLM Integrations & Structured Output
* Never use raw `JSON.parse()` on unstructured LLM text strings.
* Always enforce structured responses using `generateObject` (or `streamObject`) with explicit **Zod (`zod`) schemas**.
* Every blueprint generated must include the architectural rationale (`why`) field and cleanly distinct `humanTask` vs `agenticPrompt` modules.
* Never expose API keys (`GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) to the client. All LLM calls must run inside Server Actions or Route Handlers (`src/app/api/...`).

### Type Safety & Linting
* TypeScript `strict` mode is enabled. Never use `any` unless explicitly required for edge-case error wrapping (`error: unknown` preferred).
* Run `npm run lint` and verify zero ESLint errors before completing a task.
* All API request payloads must be validated using Zod before invoking backend logic.

## C. Human vs. Agent Role Conventions
1. **Human Tasks:** Tasks related to architectural decisions, DB schema policies (RLS), security reviews, and verbal interview articulation must be highlighted for human execution.
2. **Agent Tasks:** Routine boilerplate, UI styling (Tailwind CSS), unit tests (Vitest/Jest), and type definitions should be automated cleanly by the agent.

## D. Standard Commands

```bash
# Start local development server
npm run dev

# Check TypeScript types without emitting
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Run unit tests
npm test

# Production build check
npm run build
```

## E. Error Handling & Resilience
* Wrap all external asynchronous API calls (Supabase queries, AI SDK calls) inside `try/catch` blocks.
* Return standardized JSON error responses: `{ error: string }` with appropriate HTTP status codes (400 for bad payloads, 500 for server/AI failure).
* When handling API model updates, never guess model identifiers; inspect active model capabilities via the provider's official catalog.

## F. Quality & Verification Gates
Run `npx tsc --noEmit`, `npm test`, and `npm run lint` after every code implementation step, and ensure no secrets (like `SUPABASE_SERVICE_ROLE_KEY`) are exposed in client-accessible paths or prefixed with `NEXT_PUBLIC_`. If any gate or smoke test fails, escalate to `consultative-debugger` rather than making speculative edits.
