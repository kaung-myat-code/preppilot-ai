---
name: git-commit
description: Automates checking git status, verifying security boundaries, creating atomic conventional commits, updating roadmap progress, and pushing to remote. Use whenever the user asks to commit, push, or save progress.
---

# Git Commit & Push Workflow Skill — Stage 2 Atomic Committer

## Role & Pipeline Position
Stage 2 of the pipeline defined in `AGENTS.md` Section 3. Run only after the `code-review` skill has returned `✅ APPROVED TO COMMIT`. If no approval exists for the current changes, run `code-review` first.

## When to Use
Trigger whenever the user says "commit", "/commit", "commit my changes", "git push", or asks to save completed phase progress to GitHub.

## Pre-Condition Check (Strict)

1. Run `git status --short`. If `src/lib/schemas.ts`, `src/app/api/`, or database migrations are modified, verify `.agent/PROJECT_STATE.md` is also modified/staged. If not, **halt** and update `.agent/PROJECT_STATE.md` first.
2. Scan the staged diff (`git diff --cached`) to guarantee no hardcoded API keys or `.env` files are staged (e.g., `.env`, `.env.local`, certificates, `GOOGLE_GENERATIVE_AI_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY` values). If any are found, alert the user and abort.
3. Stage files and commit using Conventional Commits.

## Execution Steps

1. **Inspect diffs & group commits:**
   - Run `git diff HEAD` to understand modifications.
   - Group related changes into atomic commits:
     - `feat(<scope>):` new features or capabilities
     - `fix(<scope>):` bug fixes
     - `refactor:` restructuring without feature changes
     - `docs:` documentation updates (AGENTS, PROJECT_STATE)
     - `test:` test additions or updates

2. **Stage & commit:**
   - Stage files intentionally per commit group (e.g., `git add src/app/api/... .agent/PROJECT_STATE.md && git commit -m "..."`), always including `.agent/PROJECT_STATE.md` when the pre-condition applies.
   - Never use `git add .` blindly if there are distinct logical features.

3. **Push:** Run `git push origin main`.

4. **Report:** Provide a concise summary of committed hashes and messages.

> `README.md` is not touched here; roadmap checkbox sync belongs to the `ship-release` skill (see `AGENTS.md` Section 4).
