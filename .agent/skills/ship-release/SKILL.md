---
name: ship-release
description: Automates pre-release verification, semantic version tagging, changelog generation, and GitHub release creation. Use when the user asks to "ship a release", "create a release", "tag version", or mentions "/release".
---

# Ship Release Workflow Skill — Stage 3 Milestone Release Manager

## Role & Pipeline Position
Stage 3 of the pipeline defined in `AGENTS.md` Section 3. Run only when completing a version milestone (e.g., `v1.1.0`), after all changes have passed `code-review` and been committed via `git-commit`.

## When to Use
Trigger whenever the user instructs to cut a release (e.g., "Ship v1.0.0", "create release v1.1.0", or "/release").

## Rules
- Never tag or ship if tests, typechecks, lint, build, or the secret audit fail.
- Enforce Semantic Versioning: `vMAJOR.MINOR.PATCH`.

## Workflow

### Step 1: Working Tree & Milestone Check
1. Run `git status`; the working tree must be clean. If not, route changes through `code-review` -> `git-commit` first.
2. Verify all milestone items in `.agent/PROJECT_STATE.md` (Sections 4 and 5) are marked complete.

### Step 2: README Sync
Synchronize the `README.md` roadmap checkboxes with `.agent/PROJECT_STATE.md`. (This is the one workflow where editing `README.md` is permitted, per `AGENTS.md` Section 4.)

### Step 3: Full Verification
Run sequentially; abort and report on any failure:
1. `npx tsc --noEmit`
2. `npm test`
3. `npm run lint`
4. `npm run build`

### Step 4: DevSecOps Client Bundle Audit
Run `grep -rn "SUPABASE_SERVICE_ROLE_KEY" .next/static/` — it **must return empty**. Any match aborts the release.

### Step 5: Commit, Tag & Push
1. Commit any release doc updates (e.g., `docs: sync README roadmap for <version>`).
2. Create an annotated tag: `git tag -a <version> -m "Release <version>"`
3. Push commits and tags: `git push origin main --tags`

### Step 6: Publish GitHub Release
1. Check `gh auth status`. If authenticated: `gh release create <version> --title "<version> — Production Release" --generate-notes`
2. Otherwise, output a structured Release Notes snippet (key features, live demo link) and the link `https://github.com/kaung-myat-code/preppilot-ai/releases/new?tag=<version>`.

### Step 7: Final Report
- Tagged version: `<version>`
- Commit hash: `<HEAD hash>`
- Quality gate status: Types ✅ | Tests ✅ | Lint ✅ | Build ✅ | Bundle audit ✅
- Direct URL to the GitHub Release
