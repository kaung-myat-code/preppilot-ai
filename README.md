# 🚀 PrepPilot AI

> **An Agentic Full-Stack Platform for Generating Production Architecture Blueprints, Interview Justifications ("Why"), and Human vs. AI Task Allocations.**

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

### Blueprint Builder
![Blueprint Builder](./public/screenshots/blueprint-builder.png)

### Concept Explainer
![Concept Explainer](./public/screenshots/concept-explainer.png)

### Mock Interview
![Mock Interview](./public/screenshots/mock-interview.png)

---

## 📌 Problem & Motivation

Fresh Computer Science and Information Technology graduates frequently encounter common bottlenecks when transitioning into the industry:
1. **The "Why" Gap in Interviews:** Junior developers often struggle to explain *why* a specific architecture or technology was selected over alternatives under interview conditions.
2. **AI Dependency vs. Human Ownership:** With the rise of AI coding agents, developers frequently fall into copy-paste habits without internalizing core system design, data flows, and security boundaries.
3. **Tutorial Hell & Unstructured Roadmaps:** Lacking clear, production-grade blueprints that divide human engineering decisions from machine boilerplate.

**PrepPilot AI** bridges this gap by automatically converting software concepts into comprehensive system designs, interview-ready architectural rationales, and executable agentic prompts.

---

## ✨ Core Features

* **🧠 AI Co-Builder & Blueprint Engine:** Converts rough product concepts into structured system architecture layers (Frontend, Backend, AI Integration, DevOps).
* **💡 Architectural Rationale ("Why" Generator):** Provides clear, defensible justifications for each technology choice with one-click **"Copy for Interview"** snippets.
* **🤖 Agentic Task Separation:** Cleanly divides work modules into **Human Tasks** (architecture, security, verification) and **Agentic AI Prompts** (Cursor / Claude Code boilerplate generation).
* **⚡ High-Throughput Structured Output:** Uses Vercel AI SDK paired with Google Gemini 2.5 Flash and Zod schemas for type-safe JSON output.
* **🔍 Concept Explainer & RAG Module:** Vector semantic search powered by `pgvector` in Supabase for mastering technical terms (LLMs, APIs, Microservices).
* **🎙️ AI Technical Mock Interviewer (Roadmap):** Real-time streaming interview sessions evaluating technical accuracy and English delivery.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PREPPILOT AI ARCHITECTURE                       │
├───────────────────┬────────────────────────────┬───────────────────────┤
│ Frontend (Next.js)│     Backend & Storage      │      AI Services      │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ • App Router      │ • Next.js Route Handlers   │ • Gemini 2.5 Flash    │
│ • Tailwind CSS    │ • Supabase SSR Client      │ • Vercel AI SDK (Zod) │
│ • Shadcn UI       │ • PostgreSQL + pgvector    │ • Structured Outputs  │
│ • Lucide Icons    │ • Row Level Security (RLS) │ • Agentic Prompts     │
└───────────────────┴────────────────────────────┴───────────────────────┘
```

---

## 🛠️ Tech Stack

* **Framework:** Next.js 14+ (App Router, React Server Components, Server Actions)
* **Language:** TypeScript
* **Styling:** Tailwind CSS, Lucide React
* **AI & LLM Services:** Google Gemini 2.5 Flash via `@ai-sdk/google` and `ai` (Vercel AI SDK)
* **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, `pgvector`)
* **Validation:** Zod Schema Validation
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

### Upcoming Enhancements (v1.1.0 — Dynamic Knowledge Base & Interview Controls)
- [ ] **Self-Populating Dynamic RAG Fallback:**
  - Read-Through generative cache for the Concept Explainer: if Supabase cosine similarity falls below `0.55`, dynamically synthesize missing terms with Gemini via Zod schema.
  - Automated 768-dimensional embedding generation and PostgreSQL `UPSERT` to permanently index new concepts for future users.
  - UI indicator ("✨ Auto-indexed Concept") notifying candidates when a fresh term is indexed.
- [ ] **Expanded Track Selector & Custom Topics:**
  - Specialized starter chips: Frontend (React rendering, hydration), Backend (auth, indexing), and AI Engineering.
  - Free-form custom topic input field for practicing niche or specialized technologies.
- [ ] **Interactive Mock Interview Controls:**
  - Configurable interview session limits (e.g., 5-question or 10-question rounds).
  - Countdown session timer per response to simulate real interview pressure.
- [ ] **Interview Performance Scorecard:**
  - End-of-session evaluation report summarizing technical depth, terminology usage, and communication fluency.
  - Downloadable or copyable Markdown feedback report for candidate self-review.
- [ ] **UI/UX Polish:**
  - Micro-interactions and toast notifications for copy-to-clipboard actions.
  - Mobile responsiveness tuning for code blocks and streaming chat layouts.

---

### Production Scale & Platform Roadmap (v2.0.0)
- [ ] **User Persistence & Dashboards (Supabase Auth):**
  - GitHub & Google OAuth login integration.
  - Persist generated blueprints and mock interview logs to user accounts in the `projects` table.
  - Searchable personal library of saved architectural designs and interview notes.
- [ ] **Voice-to-Voice Mock Interviews:**
  - Web Speech API (or Whisper STT) for verbal audio response input.
  - Text-to-Speech (TTS) streaming for the AI interviewer voice.
- [ ] **Rate Limiting & Abuse Prevention:**
  - IP-based rate limiting via Upstash Redis (`@upstash/ratelimit`) on public endpoints to protect API quotas.
- [ ] **Community Blueprint Sharing:**
  - Public shareable URLs for generated architectures.
  - Community feed showcasing popular full-stack and AI project blueprints.

---

## 📄 License
This project is licensed under the MIT License.