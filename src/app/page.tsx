"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Layers,
  Terminal,
  UserCheck,
  Copy,
  Check,
  Cpu,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileCode2,
  Wand2,
  Search,
  BookOpen,
  Database,
} from "lucide-react";

export interface ArchitectureLayer {
  layerName: string;
  selectedTech: string;
  why: string;
}

export interface ExecutionStep {
  module: string;
  humanTask: string;
  agenticPrompt: string;
}

export interface SystemBlueprint {
  projectTitle: string;
  summary: string;
  architectureLayers: ArchitectureLayer[];
  executionPlan: ExecutionStep[];
}

export interface TechTermResult {
  id?: number | string;
  term: string;
  analogy: string;
  technical_definition: string;
  interview_answer: string;
  similarity?: number;
}

type ActiveTab = "co-builder" | "concept-explainer";

const PRESET_IDEAS = [
  {
    label: "AI Interview Coach",
    prompt:
      "A real-time technical interview coaching platform with live coding workspaces, voice feedback, and personalized study roadmaps.",
  },
  {
    label: "Multi-Tenant SaaS Billing & Analytics",
    prompt:
      "A B2B usage-based billing and real-time product analytics dashboard with webhook ingestion, role-based access control, and automated invoicing.",
  },
  {
    label: "Autonomous Code Review Agent",
    prompt:
      "A GitHub-integrated security and architecture review bot that scans pull requests, generates inline fixes, and tracks technical debt.",
  },
];

const SEARCH_CHIPS = [
  "What is an API?",
  "How does RAG work?",
  "SSR vs CSR",
  "What is an LLM?",
  "Why use a Vector Database?",
];

export default function PrepPilotDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("co-builder");

  // AI Co-Builder State
  const [prompt, setPrompt] = useState<string>("");
  const [blueprint, setBlueprint] = useState<SystemBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Concept Explainer (RAG Search) State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<TechTermResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

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
        setError("Unable to copy text to clipboard. Please check browser permissions.");
      } else {
        setSearchError("Unable to copy text to clipboard. Please check browser permissions.");
      }
    }
  };

  const handleGenerateBlueprint = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const targetPrompt = (customPrompt ?? prompt).trim();

    if (!targetPrompt) {
      setError("Please describe your project idea before generating a blueprint.");
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
            : "Failed to generate blueprint. Please try again."
        );
        return;
      }

      const resolvedBlueprint: SystemBlueprint = data.blueprint ?? data;
      setBlueprint(resolvedBlueprint);
    } catch {
      setError("Network error while communicating with PrepPilot AI server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchTerms = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = (customQuery ?? searchQuery).trim();

    if (!targetQuery) {
      setSearchError("Please enter a technical concept or question to search.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSeedMessage(null);

    try {
      const response = await fetch("/api/search-terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: targetQuery }),
      });

      const data = await response.json();

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
        : (data.results ?? data.terms ?? []);

      setSearchResults(resolvedTerms);
      setHasSearched(true);
    } catch {
      setSearchError("Network error while searching technical concepts.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSearchError(null);
    setSeedMessage(null);

    try {
      const response = await fetch("/api/seed-terms", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setSearchError(
          typeof data?.error === "string"
            ? data.error
            : "Failed to seed technical terms."
        );
        return;
      }

      setSeedMessage(
        data?.message ?? `Successfully seeded ${data?.seededCount ?? 5} technical terms.`
      );
    } catch {
      setSearchError("Network error while seeding technical terms.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white">
                    PrepPilot AI
                  </span>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                    Gemini 2.5 Flash
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  System Architecture &amp; Technical Interview Studio
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle Navigation */}
          <nav
            aria-label="Workspace Mode Navigation"
            className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setActiveTab("co-builder")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === "co-builder"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="h-4 w-4" />
              AI Co-Builder
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("concept-explainer")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === "concept-explainer"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Concept Explainer
            </button>
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Gemini + pgvector Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === "co-builder" ? (
          <>
            {/* Prompt Input Card */}
            <section className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <div className="max-w-3xl">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Architect your next software system
                </h1>
                <p className="mt-2 text-sm text-slate-400 sm:text-base">
                  Describe your product vision or technical requirements. PrepPilot AI
                  generates a validated architecture stack with engineering rationales
                  and copy-ready prompts for your AI coding agents.
                </p>
              </div>

              <form onSubmit={(e) => handleGenerateBlueprint(e)} className="mt-6 space-y-4">
                <div className="relative">
                  <label htmlFor="project-prompt" className="sr-only">
                    Project Requirements or Idea
                  </label>
                  <textarea
                    id="project-prompt"
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Build a real-time collaborative markdown knowledge base with vector search, role-based workspaces, and automated AI meeting summaries..."
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 p-4 text-sm text-slate-100 placeholder-slate-500 shadow-inner transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:text-base"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Preset Starter Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
                      Try preset:
                    </span>
                    {PRESET_IDEAS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          setPrompt(preset.prompt);
                        }}
                        className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-200 disabled:opacity-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !prompt.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Synthesizing Blueprint...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Blueprint
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Error Banner */}
              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                  <div className="flex-1">{error}</div>
                </div>
              )}
            </section>

            {/* Loading Skeleton */}
            {isLoading && (
              <section className="space-y-6 animate-pulse" aria-busy="true">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                  <div className="h-7 w-1/3 rounded-lg bg-slate-800" />
                  <div className="mt-4 h-4 w-full rounded bg-slate-800/70" />
                  <div className="mt-2 h-4 w-4/5 rounded bg-slate-800/70" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="h-44 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Blueprint Results Display */}
            {!isLoading && blueprint && (
              <div className="space-y-10">
                {/* Project Overview Banner */}
                <section className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6 shadow-xl sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3 max-w-4xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                        <FileCode2 className="h-3.5 w-3.5" />
                        Validated System Blueprint
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {blueprint.projectTitle}
                      </h2>
                      <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
                        {blueprint.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          `# ${blueprint.projectTitle}\n\n${blueprint.summary}`,
                          "blueprint-summary"
                        )
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-indigo-500/50 hover:bg-slate-800"
                    >
                      {copiedId === "blueprint-summary" ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied Overview</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy Overview</span>
                        </>
                      )}
                    </button>
                  </div>
                </section>

                {/* Architecture Layers Section */}
                <section className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Architecture Layers
                        </h3>
                        <p className="text-xs text-slate-400">
                          Recommended technology stack and engineering rationale per layer
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
                      {blueprint.architectureLayers.length} Layers
                    </span>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {blueprint.architectureLayers.map((layer, index) => {
                      const whyCopyKey = `why-${index}`;
                      const isCopied = copiedId === whyCopyKey;

                      return (
                        <article
                          key={`${layer.layerName}-${index}`}
                          className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-slate-900/50 p-6 transition hover:border-slate-700"
                        >
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                                  Layer {index + 1}
                                </span>
                                <h4 className="text-base font-semibold text-white">
                                  {layer.layerName}
                                </h4>
                              </div>
                              <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                                {layer.selectedTech}
                              </span>
                            </div>

                            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  Why This Tech
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(layer.why, whyCopyKey)}
                                  aria-label={`Copy why rationale for ${layer.layerName}`}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-indigo-500/50 hover:text-white"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                      <span className="text-emerald-300">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Copy &ldquo;Why&rdquo;</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-sm leading-relaxed text-slate-300">
                                {layer.why}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                {/* Execution Plan Section */}
                <section className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Terminal className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Execution Plan &amp; Agentic Prompts
                        </h3>
                        <p className="text-xs text-slate-400">
                          Step-by-step developer workflow paired with ready-to-run AI agent prompts
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
                      {blueprint.executionPlan.length} Modules
                    </span>
                  </div>

                  <div className="space-y-5">
                    {blueprint.executionPlan.map((step, index) => {
                      const promptCopyKey = `prompt-${index}`;
                      const isPromptCopied = copiedId === promptCopyKey;

                      return (
                        <article
                          key={`${step.module}-${index}`}
                          className="rounded-2xl border border-slate-800/90 bg-slate-900/50 p-6 transition hover:border-slate-700"
                        >
                          <div className="mb-4 flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/40 text-xs font-bold text-indigo-300">
                              {index + 1}
                            </span>
                            <h4 className="text-base font-semibold text-white sm:text-lg">
                              {step.module}
                            </h4>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-12">
                            {/* Human Task Column */}
                            <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                                  <UserCheck className="h-4 w-4 text-amber-400" />
                                  Human Developer Task
                                </div>
                                <p className="text-sm leading-relaxed text-slate-200">
                                  {step.humanTask}
                                </p>
                              </div>
                            </div>

                            {/* Agentic Prompt Column */}
                            <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/90 p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                    <Terminal className="h-4 w-4" />
                                    Agentic Prompt
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopy(step.agenticPrompt, promptCopyKey)
                                    }
                                    aria-label={`Copy agentic prompt for ${step.module}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                                  >
                                    {isPromptCopied ? (
                                      <>
                                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Copied Prompt!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Copy Prompt</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-300 sm:text-sm">
                                  {step.agenticPrompt}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !blueprint && (
              <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                  <Layers className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Ready to generate your system blueprint
                </h2>
                <p className="mt-1 max-w-md text-sm text-slate-400">
                  Enter a project idea above or pick a preset to generate architecture
                  layers, rationale explanations, and agentic coding prompts.
                </p>
              </section>
            )}
          </>
        ) : (
          <>
            {/* Concept Explainer Search Card */}
            <section className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-3">
                    <Database className="h-3.5 w-3.5" />
                    RAG Semantic Concept Search (pgvector)
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Master technical concepts for interviews
                  </h1>
                  <p className="mt-2 text-sm text-slate-400 sm:text-base">
                    Search by meaning using 768-dimensional Gemini vector embeddings.
                    Every concept breaks down into a simple analogy, a rigorous
                    technical definition, and an interview-ready script.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-500/50 hover:text-indigo-200 disabled:opacity-50"
                >
                  {isSeeding ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                      Seeding Vector DB...
                    </>
                  ) : (
                    <>
                      <Database className="h-3.5 w-3.5 text-indigo-400" />
                      Seed Core Terms
                    </>
                  )}
                </button>
              </div>

              <form onSubmit={(e) => handleSearchTerms(e)} className="mt-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <label htmlFor="concept-search-input" className="sr-only">
                      Search technical concepts
                    </label>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="concept-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ask about a technical concept (e.g., What is an API?, How does RAG reduce hallucinations?, SSR vs CSR)..."
                      disabled={isSearching}
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 py-3.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 shadow-inner transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:text-base"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Search Concepts
                      </>
                    )}
                  </button>
                </div>

                {/* Pre-made Search Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
                    Quick search:
                  </span>
                  {SEARCH_CHIPS.map((chipText) => (
                    <button
                      key={chipText}
                      type="button"
                      disabled={isSearching}
                      onClick={() => {
                        setSearchQuery(chipText);
                        void handleSearchTerms(undefined, chipText);
                      }}
                      className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-200 disabled:opacity-50"
                    >
                      {chipText}
                    </button>
                  ))}
                </div>
              </form>

              {/* Seed Confirmation Banner */}
              {seedMessage && (
                <div
                  role="status"
                  className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-200 sm:text-sm"
                >
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{seedMessage}</span>
                </div>
              )}

              {/* Search Error Banner */}
              {searchError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                  <div className="flex-1">{searchError}</div>
                </div>
              )}
            </section>

            {/* Searching Skeleton */}
            {isSearching && (
              <section className="space-y-6 animate-pulse" aria-busy="true">
                <div className="h-8 w-1/3 rounded-lg bg-slate-800" />
                <div className="grid gap-5 lg:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-56 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Search Results */}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-10">
                {searchResults.map((result, idx) => {
                  const copyKey = `interview-answer-${result.id ?? idx}`;
                  const isAnswerCopied = copiedId === copyKey;
                  const similarityPct =
                    typeof result.similarity === "number"
                      ? `${Math.round(result.similarity * 100)}% Semantic Match`
                      : null;

                  return (
                    <section
                      key={`${result.term}-${result.id ?? idx}`}
                      className="space-y-5 rounded-2xl border border-slate-800/90 bg-slate-900/40 p-6 shadow-lg sm:p-8"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-xs font-bold text-indigo-300">
                            #{idx + 1}
                          </span>
                          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                            {result.term}
                          </h2>
                        </div>
                        {similarityPct && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            {similarityPct}
                          </span>
                        )}
                      </div>

                      {/* 3 Clean Concept Explanation Cards */}
                      <div className="grid gap-5 lg:grid-cols-3">
                        {/* Card 1: Simple Analogy */}
                        <article className="flex flex-col justify-between rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
                          <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                              <span aria-hidden="true">👶</span>
                              <span>Simple Analogy</span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-200">
                              {result.analogy}
                            </p>
                          </div>
                        </article>

                        {/* Card 2: Technical Definition */}
                        <article className="flex flex-col justify-between rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-5">
                          <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                              <span aria-hidden="true">💻</span>
                              <span>Technical Definition</span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-200">
                              {result.technical_definition}
                            </p>
                          </div>
                        </article>

                        {/* Card 3: Interview-Ready Script */}
                        <article className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                <span aria-hidden="true">🎙️</span>
                                <span>Interview-Ready Script</span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(result.interview_answer, copyKey)
                                }
                                aria-label={`Copy interview answer for ${result.term}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                              >
                                {isAnswerCopied ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy for Interview</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="text-sm leading-relaxed text-slate-100">
                              &ldquo;{result.interview_answer}&rdquo;
                            </p>
                          </div>
                        </article>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {/* Empty / No Match State */}
            {!isSearching && searchResults.length === 0 && (
              <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {hasSearched
                    ? "No direct matches found in our curated knowledge base."
                    : "Explore technical concepts with RAG semantic search"}
                </h2>
                <p className="mt-1 max-w-md text-sm text-slate-400">
                  {hasSearched
                    ? "Try one of these curated interview topics below:"
                    : "No direct matches found in our curated knowledge base. Try one of these curated interview topics:"}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  {["What is an API?", "Explain RAG", "SSR vs CSR"].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        disabled={isSearching}
                        onClick={() => {
                          setSearchQuery(suggestion);
                          void handleSearchTerms(undefined, suggestion);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400/60 hover:bg-indigo-500/20 hover:text-white disabled:opacity-50"
                      >
                        <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
                        {suggestion}
                      </button>
                    )
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

