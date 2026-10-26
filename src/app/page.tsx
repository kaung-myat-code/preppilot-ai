"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import {
  Check,
  Copy,
  Search,
  Loader2,
  RotateCcw,
  Send,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

import type { ProjectDefense } from "@/lib/schemas";

export interface TechTermResult {
  id?: number | string;
  term: string;
  category?: "frontend" | "backend" | "devops" | "ai" | "general";
  definition?: string;
  interviewContext?: string;
  tradeoffs?: string[];
  commonPitfalls?: string[];
  analogy?: string;
  similarity?: number;
  autoIndexed?: boolean;
}

type ActiveTab = "co-builder" | "concept-explainer" | "mock-interview";

const PRESET_IDEAS = [
  {
    label: "Next.js + Supabase pgvector RAG App",
    prompt:
      "Next.js 14 App Router, Supabase PostgreSQL with pgvector, Gemini 2.5 Flash. A RAG-based technical interview prep platform with semantic search over a tech terms catalog, cookie-based auth, and dynamic generative fallback.",
  },
  {
    label: "Real-Time React + WebSockets Multiplayer Game",
    prompt:
      "React 18, Zustand, Node.js WebSocket server with Redis pub/sub. A real-time multiplayer browser game with 5,000 concurrent players, lobby matchmaking, and server-authoritative game state.",
  },
  {
    label: "Node.js + PostgreSQL FinTech Payment API",
    prompt:
      "Node.js with Express, PostgreSQL, Redis, Stripe webhooks. A FinTech payment API handling idempotent charges, double-entry ledger records, and reconciliation jobs at 500 requests per second.",
  },
];

const SEARCH_CHIPS = [
  "What is an API?",
  "How does RAG work?",
  "SSR vs CSR",
  "Vector Database",
];

const INTERVIEW_STARTERS = [
  {
    label: "Full-Stack System Design",
    prompt:
      "Hi! I'm ready to start my Full-Stack & AI Developer mock interview. Please ask me your first technical question about Next.js App Router or React architecture.",
  },
  {
    label: "RAG & pgvector Practice",
    prompt:
      "Let's practice RAG & Vector Embeddings. In my own words: RAG converts documents into vector embeddings stored in pgvector, retrieves semantically similar chunks for a user query, and passes them into the LLM context window to ground the answer and reduce hallucinations. How would you evaluate this explanation?",
  },
  {
    label: "Database & Security",
    prompt:
      "I'd like to practice system design for an AI Resume Analyzer built with Next.js, Supabase, and Gemini. Ask me how I would design the ingestion pipeline, structured output validation, and database security.",
  },
];

const INITIAL_INTERVIEW_MESSAGES = [
  {
    id: "welcome-interviewer-msg",
    role: "assistant" as const,
    content:
      "Welcome. I'll be conducting your technical mock interview today covering Next.js, React, Supabase, APIs, RAG, and LLM integrations.\n- After each response, I'll evaluate your Technical Accuracy and Communication, offer a concise Senior Model Answer when helpful, and ask a targeted follow-up.\n- Select a starter topic or introduce yourself to begin.",
  },
];

function renderInlineFormatting(text: string): React.ReactNode[] {
  const segments = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return segments.map((segment, idx) => {
    if (segment.startsWith("**") && segment.endsWith("**") && segment.length > 4) {
      return (
        <strong key={idx} className="font-medium text-zinc-100">
          {segment.slice(2, -2)}
        </strong>
      );
    }
    if (segment.startsWith("`") && segment.endsWith("`") && segment.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-xs text-zinc-200"
        >
          {segment.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{segment}</React.Fragment>;
  });
}

function renderFormattedMessage(content: string): React.ReactNode {
  const lines = content.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1" />;
        }
        if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
              <span className="flex-1 leading-relaxed text-zinc-300">
                {renderInlineFormatting(line.slice(2))}
              </span>
            </div>
          );
        }
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-500">
                {numberedMatch[1]}.
              </span>
              <span className="flex-1 leading-relaxed text-zinc-300">
                {renderInlineFormatting(numberedMatch[2])}
              </span>
            </div>
          );
        }
        return (
          <p key={idx} className="leading-relaxed text-zinc-300">
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function PrepPilotDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("co-builder");

  // Project & JD Stress-Tester State
  const [prompt, setPrompt] = useState<string>("");
  const [defense, setDefense] = useState<ProjectDefense | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Concept Explainer (RAG Search) State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<TechTermResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);

  // Technical Mock Interview State
  const {
    messages: interviewMessages,
    setMessages: setInterviewMessages,
    input: interviewInput,
    handleInputChange: handleInterviewInputChange,
    handleSubmit: handleInterviewSubmit,
    append: appendInterviewMessage,
    isLoading: isInterviewLoading,
    error: interviewError,
    stop: stopInterviewStream,
  } = useChat({
    api: "/api/mock-interview",
    initialMessages: INITIAL_INTERVIEW_MESSAGES,
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === "mock-interview") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [interviewMessages, activeTab]);

  // Shared Clipboard State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      if (activeTab === "co-builder") {
        setError("Unable to copy to clipboard.");
      } else {
        setSearchError("Unable to copy to clipboard.");
      }
    }
  };

  const handleGenerateDefense = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const targetPrompt = (customPrompt ?? prompt).trim();

    if (targetPrompt.length < 10) {
      setError("Please enter at least 10 characters describing your project or the job description.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-blueprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: targetPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Failed to generate defense kit. Please try again."
        );
        return;
      }

      setDefense(data as ProjectDefense);
    } catch {
      setError("Network error while connecting to PrepPilot server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchTerms = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = (customQuery ?? searchQuery).trim();

    if (!targetQuery) {
      setSearchError("Please enter a technical concept or question.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setRejectedReason(null);

    try {
      const response = await fetch("/api/search-terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: targetQuery }),
      });

      const data = await response.json();

      if (response.status === 422) {
        setRejectedReason(
          typeof data?.reason === "string"
            ? data.reason
            : "This query doesn't appear to be a recognized technical concept."
        );
        setSearchResults([]);
        setHasSearched(true);
        return;
      }

      if (!response.ok) {
        setSearchError(
          typeof data?.error === "string"
            ? data.error
            : "Failed to search technical terms. Please try again."
        );
        return;
      }

      const resolvedTerms: TechTermResult[] = Array.isArray(data)
        ? data
        : (data.results ??
            data.terms ??
            (typeof data?.data?.term === "string"
              ? [data.data as TechTermResult]
              : typeof data?.term === "string"
                ? [data as TechTermResult]
                : []));

      setSearchResults(resolvedTerms);
      setHasSearched(true);
    } catch {
      setSearchError("Network error while searching technical concepts.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand Mark */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-950 shadow-sm font-mono text-xs font-bold tracking-tight">
              P
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              PrepPilot
            </span>
          </div>

          {/* Segmented Pill Controller */}
          <nav
            aria-label="View Switcher"
            className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5 text-xs font-medium"
          >
            <button
              type="button"
              onClick={() => setActiveTab("co-builder")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "co-builder"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Project &amp; JD Stress-Tester
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("concept-explainer")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "concept-explainer"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Concept Explainer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mock-interview")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "mock-interview"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mock Interview
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {activeTab === "co-builder" ? (
          <div className="space-y-8">
            {/* Header Description */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                Project &amp; JD Stress-Tester
              </h1>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Defense prep for your real project or target role. Get a spoken pitch,
                skeptical trade-off questions, and production failure modes you can
                answer verbatim in a live interview.
              </p>
            </div>

            {/* Input Console */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm focus-within:border-zinc-700 transition">
              <form onSubmit={(e) => handleGenerateDefense(e)} className="space-y-3">
                <label htmlFor="project-prompt" className="sr-only">
                  Project stack or Job Description
                </label>
                <textarea
                  id="project-prompt"
                  rows={4}
                  maxLength={2500}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Paste your project stack & summary (e.g., 'Next.js 14, Supabase pgvector, Gemini 2.5 interview prep platform') or a target Job Description..."
                  className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
                  disabled={isLoading}
                />

                <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800/80 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-500 mr-1">Try:</span>
                    {PRESET_IDEAS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={isLoading}
                        onClick={() => setPrompt(preset.prompt)}
                        className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition disabled:opacity-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || prompt.trim().length < 10}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-950 transition hover:bg-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Stress-testing...</span>
                      </>
                    ) : (
                      <>
                        <span>Stress-Test My Project</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {error && (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-rose-900/40 bg-rose-950/20 px-3.5 py-2.5 text-xs text-rose-300"
                >
                  {error}
                </div>
              )}
            </section>

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4 animate-pulse pt-2" aria-busy="true">
                <div className="h-28 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5" />
                <div className="h-44 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5" />
              </div>
            )}

            {/* Defense Results */}
            {!isLoading && defense && (
              <div className="space-y-8 pt-2">
                {/* 1. Elevator Pitch */}
                <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-5 sm:p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <span className="font-mono text-[11px] tracking-wider uppercase text-emerald-400">
                        🎙️ 30-Second Spoken Elevator Pitch
                      </span>
                      <h2 className="text-lg font-semibold text-zinc-50 tracking-tight">
                        {defense.projectTitle}
                      </h2>
                      <p className="text-sm sm:text-base text-zinc-100 leading-relaxed">
                        {defense.elevatorPitch}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(defense.elevatorPitch, "defense-pitch")}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-900/40 px-2.5 py-1.5 text-xs text-emerald-100 hover:bg-emerald-900/70 transition"
                    >
                      {copiedId === "defense-pitch" ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Spoken Script</span>
                        </>
                      )}
                    </button>
                  </div>
                </section>

                {/* 2. Trade-Off Traps */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-zinc-100">
                    ⚔️ &quot;Why X Over Y?&quot; Trade-Off Traps
                  </h2>
                  {defense.tradeoffTraps.map((trap, index) => {
                    const copyKey = `defense-trap-${index}`;
                    return (
                      <article
                        key={`${trap.chosenTech}-${index}`}
                        className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-200 border border-zinc-600">
                            {trap.layer}
                          </span>
                          <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-xs text-amber-300 border border-amber-500/40">
                            {trap.chosenTech}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-100 leading-relaxed">
                          &ldquo;{trap.whyNotAlternativeQuestion}&rdquo;
                        </p>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                              Senior Defense Answer
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(trap.seniorDefenseAnswer, copyKey)}
                              className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-zinc-50 transition"
                            >
                              {copiedId === copyKey ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-sm text-zinc-200 leading-relaxed">
                            {trap.seniorDefenseAnswer}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </section>

                {/* 3. Production Bottlenecks */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-zinc-100">
                    💥 Production Bottlenecks &amp; Failure Modes
                  </h2>
                  {defense.bottleneckTraps.map((trap, index) => {
                    const copyKey = `defense-bottleneck-${index}`;
                    return (
                      <article
                        key={`bottleneck-${index}`}
                        className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 sm:p-5 space-y-3"
                      >
                        <div className="space-y-1">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-rose-400">
                            Failure Scenario
                          </span>
                          <p className="text-sm text-zinc-100 leading-relaxed">
                            {trap.failureScenario}
                          </p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                              Mitigation Strategy
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(trap.mitigationStrategy, copyKey)}
                              className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-zinc-50 transition"
                            >
                              {copiedId === copyKey ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-sm text-zinc-200 leading-relaxed">
                            {trap.mitigationStrategy}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </section>
              </div>
            )}
          </div>
        ) : activeTab === "concept-explainer" ? (
          <div className="space-y-8">
            {/* Header Description */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                Concept Explainer
              </h1>
              <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
                Semantic retrieval powered by Gemini embeddings and pgvector. Explore
                concepts structured into analogies, technical definitions, and interview
                scripts.
              </p>
            </div>

            {/* Search Console Input */}
            <section className="space-y-3">
              <form onSubmit={(e) => handleSearchTerms(e)} className="relative">
                <label htmlFor="concept-search-input" className="sr-only">
                  Search technical concept
                </label>
                <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 shadow-sm focus-within:border-zinc-700 transition">
                  <Search className="h-4 w-4 text-zinc-500 shrink-0 ml-1" />
                  <input
                    id="concept-search-input"
                    type="text"
                    maxLength={60}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search technical concepts (e.g., What is an API?, SSR vs CSR, RAG)..."
                    disabled={isSearching}
                    className="w-full bg-transparent px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
                  >
                    {isSearching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Search</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Search Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-zinc-500 mr-1">Suggestions:</span>
                {SEARCH_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={isSearching}
                    onClick={() => {
                      setSearchQuery(chip);
                      void handleSearchTerms(undefined, chip);
                    }}
                    className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Notifications */}
              {searchError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-900/40 bg-rose-950/20 px-3.5 py-2 text-xs text-rose-300"
                >
                  {searchError}
                </div>
              )}
            </section>

            {/* Non-technical Query Guidance */}
            {!isSearching && rejectedReason && (
              <section
                aria-live="polite"
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 space-y-3"
              >
                <h2 className="text-sm font-semibold text-zinc-200">
                  Concept Not Recognized
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {rejectedReason}
                </p>
                <p className="rounded-lg border border-zinc-800/80 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-400 leading-relaxed">
                  Try searching for concepts like &apos;WAL in SQLite&apos;,
                  &apos;Kafka Partitioning&apos;, &apos;RSC Hydration&apos;, or
                  &apos;eBPF&apos;.
                </p>
              </section>
            )}

            {/* Searching Skeleton */}
            {isSearching && (
              <div className="space-y-4 animate-pulse pt-2" aria-busy="true">
                <div className="h-44 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5" />
              </div>
            )}

            {/* Search Results */}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-6 pt-2">
                {searchResults.map((result, idx) => {
                  const copyKey = `interview-answer-${result.id ?? idx}`;
                  const isAnswerCopied = copiedId === copyKey;
                  const similarityPct =
                    typeof result.similarity === "number"
                      ? `${Math.round(result.similarity * 100)}% match`
                      : null;
                  const resolvedDefinition = result.definition ?? "";
                  const resolvedInterviewText = result.interviewContext ?? "";
                  const hasTradeoffsOrPitfalls =
                    (Array.isArray(result.tradeoffs) &&
                      result.tradeoffs.length > 0) ||
                    (Array.isArray(result.commonPitfalls) &&
                      result.commonPitfalls.length > 0);

                  return (
                    <section
                      key={`${result.term}-${result.id ?? idx}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-xs text-zinc-500">
                              0{idx + 1}
                            </span>
                            <h2 className="text-base font-semibold text-zinc-100">
                              {result.term}
                            </h2>
                            {result.category && (
                              <span className="rounded border border-zinc-700/60 bg-zinc-800/70 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                                {result.category}
                              </span>
                            )}
                            {result.autoIndexed === true && (
                              <span
                                title="Synthesized via Gemini & permanently cached in pgvector"
                                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300"
                              >
                                <Sparkles className="h-3 w-3 text-emerald-400" />
                                <span>✨ Auto-indexed Concept</span>
                              </span>
                            )}
                          </div>
                          {result.autoIndexed === true && (
                            <p className="pl-6 text-[11px] text-zinc-400">
                              Synthesized via Gemini &amp; permanently cached in pgvector
                            </p>
                          )}
                        </div>
                        {similarityPct && (
                          <span className="font-mono text-xs text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/50">
                            {similarityPct}
                          </span>
                        )}
                      </div>

                      {result.analogy && (
                        <div className="mt-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm">
                          <span className="font-semibold text-zinc-300">💡 Analogy: </span>
                          <span className="text-zinc-400">{result.analogy}</span>
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">

                        {/* Technical Definition */}
                        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-1.5">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                            Technical Definition
                          </span>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {resolvedDefinition}
                          </p>
                        </div>

                        {/* Interview Articulation */}
                        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950 p-4 space-y-2 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                                Interview Response
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(resolvedInterviewText, copyKey)
                                }
                                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition"
                              >
                                {isAnswerCopied ? (
                                  <>
                                    <Check className="h-3 w-3 text-zinc-300" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed italic">
                              &ldquo;{resolvedInterviewText}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>

                      {hasTradeoffsOrPitfalls && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {Array.isArray(result.tradeoffs) &&
                            result.tradeoffs.length > 0 && (
                              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-2">
                                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                                  Architectural Trade-offs
                                </span>
                                <ul className="space-y-1 text-xs text-zinc-300">
                                  {result.tradeoffs.map((item, tIdx) => (
                                    <li
                                      key={tIdx}
                                      className="flex items-start gap-2 leading-relaxed"
                                    >
                                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                          {Array.isArray(result.commonPitfalls) &&
                            result.commonPitfalls.length > 0 && (
                              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-2">
                                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                                  Common Pitfalls
                                </span>
                                <ul className="space-y-1 text-xs text-zinc-300">
                                  {result.commonPitfalls.map((item, pIdx) => (
                                    <li
                                      key={pIdx}
                                      className="flex items-start gap-2 leading-relaxed"
                                    >
                                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {/* Empty Search State */}
            {!isSearching && searchResults.length === 0 && !rejectedReason && (
              <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center space-y-2">
                <p className="text-sm font-medium text-zinc-300">
                  {hasSearched ? "No matching concepts found." : "Search technical concepts"}
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Type a concept above to explore the curated knowledge base.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header & Reset */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                  Technical Mock Interview
                </h1>
                <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
                  Real-time technical interview simulator with structured evaluation of
                  accuracy and communication fluency.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopInterviewStream();
                  setInterviewMessages(INITIAL_INTERVIEW_MESSAGES);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Session</span>
              </button>
            </div>

            {/* Quick Starters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-zinc-500 mr-1">Starters:</span>
              {INTERVIEW_STARTERS.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  disabled={isInterviewLoading}
                  onClick={() => {
                    void appendInterviewMessage({
                      role: "user",
                      content: starter.prompt,
                    });
                  }}
                  className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition disabled:opacity-50"
                >
                  {starter.label}
                </button>
              ))}
            </div>

            {/* Chat Container */}
            <section className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
              {/* Chat Feed */}
              <div
                className="space-y-5 p-5 max-h-[520px] min-h-[360px] overflow-y-auto"
                aria-live="polite"
              >
                {interviewMessages.map((msg) => {
                  const isCandidate = msg.role === "user";
                  const copyKey = `chat-${msg.id}`;
                  const isCopied = copiedId === copyKey;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-1.5 ${
                        isCandidate ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-2 px-1">
                        <span className="font-mono text-[11px] text-zinc-500">
                          {isCandidate ? "Candidate" : "Interviewer"}
                        </span>
                        {!isCandidate && msg.content && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, copyKey)}
                            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
                            title="Copy response"
                          >
                            {isCopied ? "Copied" : "Copy"}
                          </button>
                        )}
                      </div>

                      <div
                        className={`rounded-xl px-4 py-3 text-xs sm:text-sm leading-relaxed max-w-2xl ${
                          isCandidate
                            ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50"
                            : "bg-zinc-900/80 text-zinc-200 border border-zinc-800"
                        }`}
                      >
                        {msg.content ? (
                          isCandidate ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            renderFormattedMessage(msg.content)
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-zinc-400 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Evaluating response...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Error */}
              {interviewError && (
                <div
                  role="alert"
                  className="mx-5 mb-3 rounded-lg border border-rose-900/40 bg-rose-950/20 px-3.5 py-2 text-xs text-rose-300"
                >
                  {interviewError.message}
                </div>
              )}

              {/* Chat Input Console */}
              <form
                onSubmit={(e) => {
                  void handleInterviewSubmit(e);
                }}
                className="border-t border-zinc-800 bg-zinc-950 p-3 sm:p-4"
              >
                <div className="flex items-end gap-2">
                  <label htmlFor="mock-interview-input" className="sr-only">
                    Interview answer
                  </label>
                  <textarea
                    id="mock-interview-input"
                    rows={2}
                    value={interviewInput}
                    onChange={handleInterviewInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!isInterviewLoading && interviewInput.trim()) {
                          void handleInterviewSubmit();
                        }
                      }
                    }}
                    placeholder="Articulate your response (Press Enter to send, Shift+Enter for new line)..."
                    disabled={isInterviewLoading}
                    className="w-full resize-none bg-transparent p-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isInterviewLoading || !interviewInput.trim()}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-zinc-100 px-3.5 text-xs font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isInterviewLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
