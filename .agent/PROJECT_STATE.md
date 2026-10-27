# PROJECT_STATE.md — PrepPilot AI

> Source of truth for architectural invariants and system state. Update when contracts or milestones change.

---

## 1. System Invariants & Tech Stack

| Area | Invariant |
|------|-----------|
| Framework | Next.js 14+ App Router only (no `pages/`) |
| Language | TypeScript `strict`; no `any` (use `unknown`) |
| Database | Supabase PostgreSQL + `pgvector`, accessed via `@supabase/ssr` cookie handler |
| LLM | Gemini 2.5 Flash via `@ai-sdk/google` |
| Embeddings | `gemini-embedding-001`, **768 dimensions** (`outputDimensionality: 768`) |
| AI SDK | Vercel AI SDK (`ai`): `generateObject` / `streamObject` with Zod schemas; never raw `JSON.parse()` on LLM text |

**Security boundaries**
- `GOOGLE_GENERATIVE_AI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only; never reach Client Components.
- All LLM/DB calls run in Server Actions or Route Handlers (`src/app/api/...`).
- All request payloads validated with Zod before backend logic.
- External async calls wrapped in `try/catch`; errors return `{ error: string }` (400 bad payload, 422 unresolvable query, 500 server/AI failure).
- Blueprints must include a `why` rationale and distinct `humanTask` vs `agenticPrompt` modules.
- Embedding dimension must stay 768 across the column, RPC, and query embedding.

---

## 2. Supabase Database Contracts

### Table `public.tech_terms`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `term` | `text` | Unique, not null |
| `canonical_key` | `text` | `GENERATED ALWAYS AS (lower(regexp_replace(term, '[^a-zA-Z0-9]', '', 'g'))) STORED` |
| `category` | `text` | Default `'general'` |
| `definition` | `text` | Not null |
| `interview_context` | `text` | Nullable |
| `analogy` | `text` | Nullable, default `''` |
| `tradeoffs` | `text[]` | Default `'{}'`; matches Zod `z.array(z.string())` |
| `common_pitfalls` | `text[]` | Default `'{}'`; matches Zod `z.array(z.string())` |
| `embedding` | `vector(768)` | Nullable |
| `created_at` / `updated_at` | `timestamptz` | Default `now()` |

> `canonical_key` is generated: never insert or update it directly.

### RPC `match_tech_terms`

Called from [route.ts](../src/app/api/search-terms/route.ts):

```sql
match_tech_terms(
  query_embedding vector(768),
  match_threshold float,
  match_count int
) RETURNS TABLE (
  id uuid,
  term text,
  category text,
  definition text,
  interview_context text,
  tradeoffs text[],
  common_pitfalls text[],
  analogy text,
  similarity double precision
)
```
Rows are filtered by `similarity >= match_threshold`, ordered by similarity descending, limited to `match_count`. The RPC does **not** return `canonical_key`, `embedding`, or timestamps.

---

## 3. Retrieval Pipeline Architecture (4-Tier Waterfall)

1. **Canonical Key** — query is normalized to an alphanumeric slug (`toCanonicalKey`) and matched exactly against `canonical_key`.
2. **Alias / Partial Match** (`findPartialMatch`) — only for queries with more than 1 word. Scans catalog rows, deriving aliases from each term: parenthetical acronyms (e.g. `RAG`), and `vs`-split phrases (e.g. SSR vs CSR). Acronyms match whole query tokens; the best-scoring row wins.
3. **Vector Cosine** — embed query (768-dim) and call `match_tech_terms` with `match_count: 1`.
   - Dynamic threshold: **0.72** (`SIMILARITY_THRESHOLD`) for short queries; **0.65** (`NATURAL_LANGUAGE_THRESHOLD`) when word count exceeds `NATURAL_LANGUAGE_WORD_COUNT`.
4. **Generative Fallback** — Gemini 2.5 Flash `generateObject` with a Zod schema produces a term entry. Non-technical or unresolvable queries are rejected by a guardrail returning **HTTP 422**.

### 3.1 Connected Agent Skill Registry & Diagnostic Escalation

| Skill | Role / Stage | Purpose |
|-------|--------------|---------|
| `code-review` | Stage 1 Gatekeeper | Adversarial pre-commit audit of schema drift, secret leaks, token bounds, and quality test gates. |
| `git-commit` | Stage 2 Atomic Committer | Atomic conventional commits, ensures `.agent/PROJECT_STATE.md` is synchronized and staged. |
| `ship-release` | Stage 3 Release Manager | Semantic versioning, build checks, client-bundle secret audits, GitHub release packaging. |
| `consultative-debugger` | Diagnostic Escalation | Consultative root-cause and blast-radius analysis (Option A Tactical vs Option B Architectural); hard stops for human approval on smoke/build/dev test failures. |

**Diagnostic Escalation Protocol:**
When automated verification gates (`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`), dev servers (`npm run dev`), or live smoke tests encounter unexpected failures or crashes:
1. Halt immediately — no speculative "yolo" code edits.
2. Invoke `consultative-debugger` to isolate root cause and map blast radius across schemas, API contracts, and dependent components.
3. Deliver 4-Part Diagnostic Report (**Root Cause**, **Blast Radius**, **Option A Tactical vs Option B Architectural**, **Recommendation**).
4. Strictly halt for explicit human approval before touching any files.
5. Apply the approved fix and re-verify quality gates (`tsc`, `lint`, `test`) to close the loop.

---

## 4. Completed Milestones & Changelog

- **v1.0.0 — MVP release.**
- **v1.1.0 Feature 1 — Dynamic RAG Fallback & schema drift resolution.**
- **Governance — Locked Lean v1.1.0 Product Pivot** in `AGENTS.md`, `PROJECT_STATE.md`, and `README.md` (docs only; no `src/` changes).
- **v1.1.0 Feature 2 / Step 1 — Project & JD Stress-Tester (Module 1 refactor).** Replaced `BlueprintSchema` with `projectDefenseSchema` (`projectTitle`, `elevatorPitch`, 3 `tradeoffTraps`, 2 `bottleneckTraps`) and added `projectDefenseRequestSchema` (`prompt` trimmed, 10–2500 chars) in `src/lib/schemas.ts`. `POST /api/generate-blueprint` now validates input (400 on failure) and uses `generateText` + `Output.object` with `gemini-2.5-flash` under a Staff Interviewer system prompt (banned AI clichés, first-person spoken output). UI tab renamed "Project & JD Stress-Tester" with example chips, pitch banner, trade-off cards, and bottleneck cards with copy buttons. Unit tests added in `src/__tests__/schemas.test.ts`. No DB/RAG contract changes.
- **v1.1.0 Feature 2 Resilience Patch (Smoke Test Issue & Resolution).** During live smoke testing of `POST /api/generate-blueprint`, Gemini 2.5 Flash generated senior defense answers and mitigation strategies that intermittently exceeded the initial 400-character upper bounds in `projectDefenseSchema`, triggering an unhandled Zod validation error (`too_big`) and HTTP 500 failure. Using the `consultative-debugger` protocol, assessed blast radius and implemented the architectural fix: relaxed `seniorDefenseAnswer` and `mitigationStrategy` limits from 400 to 700 characters in `src/lib/schemas.ts`, calibrated the system prompt in `src/app/api/generate-blueprint/route.ts` to enforce concise spoken phrasing (under 60 words, strictly under 700 chars), and added boundary validation tests in `src/__tests__/schemas.test.ts`. Verified 100% pass across all 16 unit tests, types, and linter.
- **Skill Governance — Registered `consultative-debugger` Skill.** Formalized `consultative-debugger` as our diagnostic escalation path across `AGENTS.md`, `.agent/skills/consultative-debugger/SKILL.md`, and `.agent/PROJECT_STATE.md` (Section 3.1) to enforce consultative diagnosis and zero yolo-fixing during test or build failures.
- **v1.1.0 Feature 3 / Step 2 — 3-Round Technical Grill & Senior Answer Rewrite Card (Module 3 refactor).** Added `technicalGrillInitSchema`, `technicalGrillTurnSchema`, `technicalGrillEvaluationSchema` (plus request validation schemas `technicalGrillQuestionRequestSchema` and `technicalGrillEvaluateRequestSchema`) in `src/lib/schemas.ts`. Implemented `POST /api/grill/question` (round-aware Staff Engineering Interviewer question generator using `generateText` with `gemini-2.5-flash` across Round 1 Trade-Offs, Round 2 Scale/Partition, and Round 3 Data Integrity/Edge Cases) and `POST /api/grill/evaluate` (hiring-committee evaluator using `generateText` + `Output.object` with `technicalGrillEvaluationSchema`, enforcing strict anti-buzzword and first-person spoken cadence rules). Refactored Module 3 UI in `src/app/page.tsx` from an open-ended chat into a 3-state machine (`IDLE` -> `ACTIVE` -> `EVALUATION`) featuring "3-Round Technical Grill & Articulation Diff", round indicators, character-counted defense answers, and side-by-side "What Was Missing" vs. "Senior Spoken Rewrite" comparison cards with per-card "Copy Script" buttons. Added unit tests in `src/lib/schemas.test.ts`. No DB/RAG contract changes.
- **v1.1.0 Feature 3 Resilience Patch (Smoke Test Issue & Resolution).** During live smoke testing of `POST /api/grill/evaluate`, Gemini 2.5 Flash exceeded the initial tight character bounds across the 13 string fields in `technicalGrillEvaluationSchema` (notably `whatWasMissing` at 250 chars), throwing `AI_NoObjectGeneratedError` and returning HTTP 500. Escalated via `consultative-debugger`, received human approval for Option B (Architectural Fix), and expanded schema upper-bound headroom (`summaryFeedback` 400 -> 600, `question` & `candidateAnswerSummary` 350 -> 500, `whatWasMissing` 250 -> 450, `seniorSpokenRewrite` 600 -> 800) while calibrating the system prompt with explicit word-count targets (`under 30–60 words`). Also added `suppressHydrationWarning` on `<body>` in `src/app/layout.tsx` to prevent extension-injected attribute hydration warnings.

---

## 5. Active Roadmap

**Lean v1.1.0 Pivot**

- **v1.1.0 Feature 1 (Completed):** Self-Populating Dynamic RAG Fallback (4-tier waterfall: Canonical Slug -> Alias Match -> pgvector Cosine [0.65/0.72] -> Generative Synthesis with HTTP 422 guardrail).
- **v1.1.0 Feature 2 (Completed — Step 1):** Project & JD Stress-Tester (pivoted from Architecture Co-Builder).
  - Instead of generating hypothetical app ideas, accepts a candidate's real project stack/summary or target Job Description.
  - Outputs deterministic interview defense cards via Zod schema:
    1. `elevatorPitch`: 30-second first-person spoken intro script.
    2. `tradeoffTraps`: 3 "Why X over Y?" comparative questions with senior first-person defense answers.
    3. `bottleneckTraps`: 2 realistic production failure scenarios under load with concrete mitigation strategies.
- **v1.1.0 Feature 3 (Completed — Step 2):** 3-Round Technical Grill & Senior Answer Rewrite Card (pivoted from open-ended Mock Studio). Next: Feature 4 (One-Click Pipeline Integration).
  - Replaces endless chat with a strict 3-question defense loop (`IDLE` -> `ACTIVE` [Rounds 1–3] -> `EVALUATION`).
  - Terminates after 3 answers and generates a structured evaluation card featuring a side-by-side diff: **"What Was Missing"** vs. **"Senior Spoken Rewrite"** (first-person, concise, <3 sentences).
- **v1.1.0 Feature 4 (Pending — Step 3):** One-Click Pipeline Integration.
  - Connects Module 1 (Stress-Tester) and Module 2 (RAG Explainer) directly into Module 3 (3-Round Grill) via one-click action buttons so users never have to copy-paste prompts.
- **v2.0.0** — Platform Scale.
