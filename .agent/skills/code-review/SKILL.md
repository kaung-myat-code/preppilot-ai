---
name: code-review
description: Adversarial pre-commit code review auditing schema drift, client/server secret boundaries, LLM token safety, and PROJECT_STATE.md synchronization.
---

# Code Review Skill — Stage 1 Gatekeeper (Adversarial Staff Auditor)

## Role & Pipeline Position
Stage 1 of the pipeline defined in `AGENTS.md` Section 3: **`code-review` -> `git-commit` -> `ship-release`**. Run after implementation and before any commit. Assume the diff is broken until proven otherwise. A commit may only proceed after this skill returns `✅ APPROVED TO COMMIT`.

## Workflow

1. **Gather the diff & ground truth.**
   - Run `git status --short` and `git diff HEAD`; read untracked files directly.
   - Read `.agent/PROJECT_STATE.md` and `AGENTS.md`.

2. **Cross-check changes against `.agent/PROJECT_STATE.md`:**
   - **🔴 P0** — Deprecated column names (`technical_definition`, `interview_answer`) are used, or raw `embedding` vectors are selected unnecessarily (`.select()` must list explicit columns).
   - **🔴 P0** — `SUPABASE_SERVICE_ROLE_KEY` or `createAdminSupabaseClient` leaks into `"use client"` components or a `NEXT_PUBLIC_` variable.
   - **🔴 P0** — `src/lib/schemas.ts` or `src/app/api/` changed without a matching update to `.agent/PROJECT_STATE.md` in the working tree.
   - **🔴 P0** — Request bodies reach the database or LLM without Zod validation; vector dimension (`768`) or thresholds (`0.65`/`0.72`) altered without authorization.
   - **🟡 P1** — LLM inputs (`embed()`, `generateText()`/`streamText()`, `generateObject()`) lack length bounds, or structured outputs lack concise Zod constraints / anti-fluff system instructions.
   - **🟡 P1** — `any` casts, unhandled promise rejections, missing unit tests for new core logic, weak error handling.
   - **🟢 P2** — Minor readability or style notes.

3. **Run automated quality gates:** `npx tsc --noEmit`, `npm test`, `npm run lint`. Any failure is a 🔴 P0.

4. **Output a structured report:**
   - **Files Audited:** all touched files (modified, staged, untracked).
   - **Findings by Severity:** `🔴 P0 (Blocker - Must fix before commit)`, `🟡 P1 (Warning - Should fix)`, `🟢 P2 (Nitpick - Optional)`, each with `file:line` and a concrete fix.
   - **Gate Status:** end with exactly one of:
     - `✅ APPROVED TO COMMIT (Ready for git-commit skill)` — only if zero P0s and all gates pass.
     - `❌ CHANGES REQUIRED`
