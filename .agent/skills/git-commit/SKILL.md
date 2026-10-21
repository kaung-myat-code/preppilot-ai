---
name: git-commit
description: Automates checking git status, verifying security boundaries, creating atomic conventional commits, updating roadmap progress, and pushing to remote. Use whenever the user asks to commit, push, or save progress.
---

# Git Commit & Push Workflow Skill

## When to Use
Trigger this skill whenever the user says "commit", "/commit", "commit my changes", "git push", or asks to save completed phase progress to GitHub.

## Execution Steps

1. **Security & Boundary Check (Strict):**
   - Run `git status` to see all modified/untracked files.
   - Verify that NO sensitive files (e.g., `.env`, `.env.local`, API keys, certificates) are unstaged or being committed.
   - If any secret or `.env` file is untracked or staged, immediately alert the user and abort the commit.
   - Check git status. If any files under `src/app/api/`, `src/lib/schemas.ts`, or database migrations were modified, verify that `.agent/PROJECT_STATE.md` was also staged. If not, prompt or update `PROJECT_STATE.md` before creating the commit.

2. **Inspect Diffs & Group Commits:**
   - Run `git diff` to understand code modifications.
   - Group related changes into clean, atomic commits following Conventional Commits format:
     - `feat(<scope>):` for new features or capabilities
     - `fix(<scope>):` for bug fixes or corrections
     - `docs:` for documentation updates (README, AGENTS)
     - `test:` for test additions or updates
     - `refactor:` for code restructuring without feature changes

3. **Roadmap Progress Sync:**
   - If a major feature or phase milestone was completed, check `README.md` and mark the corresponding task as completed `[x]` under the Roadmap section.

4. **Execute Commits & Push:**
   - Stage files intentionally per commit group (e.g., `git add src/app/api/... && git commit -m "..."`).
   - Never use `git add .` blindly if there are distinct logical features.
   - Run `git push origin main`.
   - Provide the user with a concise summary of the committed hashes and messages.
