---
name: ship-release
description: Automates pre-release verification, semantic version tagging, changelog generation, and GitHub release creation. Use when the user asks to "ship a release", "create a release", "tag version", or mentions "/release".
---

# Ship Release Workflow Skill

## When to Use
Trigger this skill whenever the user instructs to cut a release (e.g., "Ship v1.0.0", "create release v1.1.0", or "/release").

## Pre-requisites & Rules
- Never tag or ship if tests or typechecks fail.
- Enforce Semantic Versioning: `vMAJOR.MINOR.PATCH` (e.g., `v1.0.0`).
- Ensure the working tree is clean or properly committed before creating release tags.

## Execution Procedure

### Step 1: Quality Gate Verification
Execute the verification suite sequentially via terminal:
1. `npm run lint` — ensure zero lint errors.
2. `npx tsc --noEmit` — ensure clean TypeScript compilation.
3. `npm test` — ensure 100% passing unit tests.

If ANY check fails, abort immediately and report the error to the user. Do not proceed to tagging.

### Step 2: Working Tree & Sync Check
1. Run `git status`. Ensure all desired files are committed.
2. If uncommitted changes exist, inform the user or bundle them under a clean commit before tagging.
3. Verify that `README.md` has the intended version marked under "Roadmap & Milestones".

### Step 3: Git Tagging
1. Create an annotated git tag matching the requested version:
   `git tag -a <version> -m "Release <version>"`
   *(Example: `git tag -a v1.0.0 -m "Release v1.0.0"`)*
2. Push the commit and the tag to remote:
   `git push origin main --tags`

### Step 4: Publish GitHub Release
1. Check if `gh` CLI is authenticated (`gh auth status`).
2. If `gh` is available, create the release with auto-generated notes:
   `gh release create <version> --title "<version> — Production Release" --generate-notes`
3. If `gh` is not authenticated, generate a structured Release Notes Markdown snippet directly in the chat with:
   - Summary of key features added
   - Live demo link
   - Direct link to `https://github.com/kaung-myat-code/preppilot-ai/releases/new?tag=<version>` so the user can paste it in one click.

### Step 5: Final Report
Provide a clean summary:
- Tagged version: `<version>`
- Commit hash: `<HEAD hash>`
- Quality gate status: Lint ✅ | Types ✅ | Tests ✅
- Direct URL to the GitHub Release
