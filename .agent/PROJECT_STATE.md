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

---

## 4. Completed Milestones & Changelog

- **v1.0.0 — MVP release.**
- **v1.1.0 Feature 1 — Dynamic RAG Fallback & schema drift resolution.**

---

## 5. Active Roadmap

- **v1.1.0 Feature 2** — Role Tracks.
- **v1.1.0 Feature 3** — Scorecard.
- **v2.0.0** — Platform Scale.
