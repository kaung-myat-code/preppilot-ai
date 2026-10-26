# 🚀 PrepPilot AI

> **An Autonomous Technical Interview Preparation & Architecture Defense Platform powered by Google Gemini 2.5 Flash & Supabase pgvector.**

[![Live on Vercel](https://img.shields.io/badge/Vercel-Live_Demo-black?style=flat&logo=vercel)](https://preppilot-ai-eight.vercel.app/)
[![CI](https://github.com/kaung-myat-code/preppilot-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/kaung-myat-code/preppilot-ai/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Gemini API](https://img.shields.io/badge/Google-Gemini_2.5_Flash-orange?style=flat&logo=google)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🖼️ Application Preview & Screenshots

🔗 **Live demo:** [https://preppilot-ai-eight.vercel.app/](https://preppilot-ai-eight.vercel.app/)

<!-- ### Blueprint Builder
![Blueprint Builder](./public/screenshots/blueprint-builder.png)

### Concept Explainer
![Concept Explainer](./public/screenshots/concept-explainer.png)

### Mock Interview
![Mock Interview](./public/screenshots/mock-interview.png) -->

---

## 📌 Problem & Motivation

Engineers preparing for technical interviews frequently hit these bottlenecks:
1. **The "Why Not X?" Trap in Interviews:** Engineers often build working projects but freeze when probed on why they chose a specific database or pattern over alternatives.
2. **Generic AI Chat Fatigue:** Standard LLM chats ask endless generic questions without providing structured hiring rubrics or concise spoken rewrites.
3. **Cold-Start Concept Gaps:** Static flashcard tools lack deep production trade-offs and fail on newly emerging system design terminology.

**PrepPilot AI** closes these gaps by stress-testing real projects, explaining concepts with a self-populating knowledge base, and coaching concise spoken answers.

---

## 🧩 Core Modules

1. **Module 1: Project & JD Stress-Tester (Defense Prep)** — Analyzes a candidate's project stack or target JD to surface "Why X over Y?" trade-off traps, production bottlenecks, and a 30-second spoken elevator pitch.
2. **Module 2: Autonomous RAG Concept Explainer** — 4-tier hybrid retrieval engine backed by Supabase `pgvector` and Gemini 2.5 Flash read-through indexing.
3. **Module 3: 3-Round Technical Grill & Articulation Diff** — Focused 3-question technical defense simulator that outputs side-by-side "What You Said vs. How a Senior Engineer Says It" spoken rewrites.

---

## ✨ Core Features

* **🛡️ Project & JD Stress-Tester:** Transforms project stacks or Job Descriptions into a 30-second spoken elevator pitch, "Why X over Y?" trade-off traps, and production bottleneck failure modes.
* **🔍 4-Tier Self-Populating RAG Engine:** Combines canonical slug matching, lexical acronym resolution, calibrated `pgvector` cosine search (`0.65` / `0.72`), and schema-guarded generative synthesis with automatic database indexing.
* **🎙️ 3-Round Technical Grill & Senior Rewrite:** Replaces endless chat with a focused 3-question defense loop and side-by-side "What You Said vs. Senior Spoken Rewrite" evaluation cards.
* **🔒 Shift-Left DevSecOps Secret Guardrail:** Enforces strict client/server boundary isolation (`server-only`) backed by an automated GitHub Actions build audit scanning `.next/static/` bundles.

---

## 🏗️ System Architecture

```text
┌──────────────────────┬────────────────────────────────────┬────────────────────────────┐
│                               PREPPILOT AI ARCHITECTURE                                │
├──────────────────────┬────────────────────────────────────┬────────────────────────────┤
│ Frontend (Next.js)   │ Backend & Storage                  │ AI Services                │
├──────────────────────┼────────────────────────────────────┼────────────────────────────┤
│ • App Router         │ • Next.js Route Handlers           │ • Gemini 2.5 Flash         │
│ • Tailwind CSS       │ • Supabase Admin/Anon Split        │ • gemini-embedding-001     │
│ • Lucide Icons       │ • PostgreSQL + pgvector (768-dim)  │ • Vercel AI SDK + Zod      │
│ • Streaming UI       │ • Canonical Key Indexing           │   Discriminated Unions     │
└──────────────────────┴────────────────────────────────────┴────────────────────────────┘
```

---

## 🧠 Production Engineering Highlights

* **High-Dimensional Semantic Cross-Talk Calibration:** Replaced naive static vector thresholds (`0.55`) with a dynamic 4-tier waterfall (`0.72` for concise terms, `0.65` for natural-language queries) to prevent false-positive cache hits in dense conceptual clusters.
* **Idempotent Entity Resolution (`canonical_key`):** Implemented a PostgreSQL `GENERATED ALWAYS AS` alphanumeric slug index to eliminate near-duplicate LLM synthesis caused by hyphenation or punctuation variance.
* **Zero-Trust Client Bundle Auditing:** Segregated `SUPABASE_SERVICE_ROLE_KEY` exclusively for server-side read-through vector indexing, verified on every push via CI static bundle inspection.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 14+ (App Router, React Server Components, Server Actions)
* **Language:** TypeScript
* **Styling:** Tailwind CSS, Lucide React
* **AI & LLM Services:** Google Gemini 2.5 Flash via `@ai-sdk/google` and `ai` (Vercel AI SDK)
* **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, `pgvector`)
* **Validation:** Zod Schema Validation
* **Testing & Quality Gates:** Vitest, ESLint, TypeScript `strict`
* **DevOps & CI/CD:** GitHub Actions, Vercel

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js v18.17+ or v20+
* Free Google AI Studio API Key ([Google AI Studio](https://aistudio.google.com/))
* Free Supabase Account ([Supabase](https://supabase.com/))

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/kaung-myat-code/preppilot-ai.git
cd preppilot-ai

# Install dependencies
npm install
```

### 3. Environment Variables Setup
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Server-only (never prefix with NEXT_PUBLIC_): used for read-through vector indexing
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗺️ Roadmap & Milestones

### Completed MVP (v1.0.0)
- [x] **Phase 1: Foundation & Auth Setup**
  - Next.js 14 App Router, TypeScript, and Tailwind CSS architecture.
  - Supabase client integration (`@supabase/ssr`) with PostgreSQL database and `pgvector` extension.
- [x] **Phase 2: AI Co-Builder & Blueprint Engine**
  - Deterministic structured JSON generation via Gemini 2.5 Flash and strict Zod schemas.
  - Architectural Rationale ("Why this tech?") generator with one-click interview defense snippets.
  - Clear task separation: Human engineering responsibilities vs. Agentic prompts (Cursor/Claude Code).
- [x] **Phase 3: RAG Concept Explainer (`pgvector`)**
  - High-dimensional vector embeddings with Gemini.
  - Sub-second cosine similarity search powered by a custom Supabase PostgreSQL RPC function.
  - Tuned similarity threshold (`0.55`) to eliminate mathematical false positives.
  - Idempotent database seeding using PostgreSQL `UPSERT` to guarantee data integrity.
- [x] **Phase 4: Real-Time Technical Mock Interview Studio**
  - Streaming token responses via Vercel AI SDK (`useChat`, `streamText`).
  - Dual evaluation criteria: Technical Accuracy and English Articulation/Fluency.
  - Senior model answer generation and dynamic conversational follow-up questioning.
- [x] **Phase 5: DevOps, Quality Gates & Deployment**
  - Automated CI pipeline with GitHub Actions enforcing linting, clean-room TypeScript checks, and Vitest unit testing.
  - Isolated dependency overrides in `package.json` to mitigate dev-time advisories without forced downgrades.
  - Production deployment to Vercel with zero-downtime automated builds.

---

### Lean v1.1.0 Pivot — Interview Defense Prep
- [x] **Feature 1 — Self-Populating Dynamic RAG Fallback:**
  - 4-tier waterfall: Canonical Slug → Alias Match → `pgvector` Cosine (`0.65` for >2 words / `0.72` for <=2 words) → Generative Synthesis with an HTTP 422 guardrail.
  - New concepts are embedded (768 dimensions) and indexed for future users.
- [ ] **Feature 2 (Up Next) — Project & JD Stress-Tester:**
  - Accepts a real project stack/summary or target Job Description.
  - Outputs an `elevatorPitch`, 3 `tradeoffTraps` ("Why X over Y?"), and 2 `bottleneckTraps` (production failures under load with mitigations).
- [ ] **Feature 3 — 3-Round Technical Grill & Senior Answer Rewrite Card:**
  - Strict 3-question defense loop that ends with an evaluation card showing "What Was Missing" vs. "Senior Spoken Rewrite".
- [ ] **Feature 4 — One-Click Pipeline Integration:**
  - Sends output from the Stress-Tester and Concept Explainer straight into the 3-Round Grill, with no copy-pasting.

---

### Production Scale & Platform Roadmap (v2.0.0)

- [ ] **User Persistence & Candidate Dashboard (Supabase Auth):**
  - GitHub & Google OAuth login integration.
  - Persist saved project defense prep sheets, JD interview profiles, and drill scorecards to user accounts.
  - Historical progress tracker highlighting recurring technical gaps, articulation improvements, and indexed terms.

- [ ] **Voice-to-Voice Mock Defense Studio:**
  - In-browser Web Speech API (and Whisper STT fallback) for real-time verbal answers.
  - Low-latency Text-to-Speech (TTS) audio streaming for the interviewer voice to simulate realistic phone screens.

- [ ] **Rate Limiting & Abuse Prevention:**
  - IP-based and user-based token bucket rate limiting via Upstash Redis (`@upstash/ratelimit`) on generative endpoints (`/api/chat`, `/api/search-terms`).
  - Quota management to protect Gemini 2.5 Flash and embedding API consumption.

- [ ] **Community Interview Defense Packets:**
  - Public shareable URLs for candidate interview scorecards and project defense summaries.
  - Community repository of vetted tech-stack defense templates (e.g., "Defending Next.js App Router & Server Actions in Big Tech Loops").

---

## 📄 License
This project is licensed under the MIT License.