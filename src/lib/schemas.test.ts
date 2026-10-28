import { describe, it, expect } from "vitest";
import {
  technicalGrillInitSchema,
  technicalGrillQuestionRequestSchema,
  technicalGrillEvaluateRequestSchema,
  technicalGrillTurnSchema,
  technicalGrillEvaluationSchema,
} from "@/lib/schemas";
import {
  getStressTestSystemPrompt,
  sanitizeCoBuilderPrompt,
} from "@/app/api/co-builder/route";
import { getGrillQuestionSystemPrompt } from "@/app/api/grill/question/route";
import {
  GEMINI_FALLBACK_MODELS,
  isQuotaOrRateLimitError,
  QUOTA_EXHAUSTED_ERROR_MESSAGE,
  runWithGeminiFallback,
} from "@/lib/gemini";

const validEvaluation = {
  overallScore: 8,
  hiringVerdict: "Hire" as const,
  summaryFeedback:
    "Strong architectural reasoning on pgvector indexing and connection pooling, though Round 3 missed explicit idempotency key expiration mechanics.",
  questionBreakdowns: [
    {
      round: 1,
      question:
        "Why did you choose Supabase pgvector over a dedicated vector database like Qdrant or Pinecone?",
      candidateAnswerSummary:
        "Explained keeping relational metadata and vector embeddings in PostgreSQL to avoid dual-write sync issues.",
      whatWasMissing:
        "Omitted HNSW index memory overhead and the specific vector count threshold where single-node Postgres degrades.",
      seniorSpokenRewrite:
        "I chose pgvector to colocate embeddings with relational user state in a single ACID transaction, eliminating dual-write drift. The trade-off is HNSW memory pressure on the primary instance, so past 10 million vectors I would shard or migrate to Qdrant.",
    },
    {
      round: 2,
      question:
        "When traffic spikes to 1,000 concurrent RAG queries, how do you prevent PostgreSQL connection exhaustion?",
      candidateAnswerSummary:
        "Mentioned using Supabase's built-in connection pooler.",
      whatWasMissing:
        "Used passive phrasing and did not distinguish PgBouncer transaction mode from session mode or timeout backpressure.",
      seniorSpokenRewrite:
        "In production, the risk is serverless functions exhausting Postgres max_connections during embedding bursts. To mitigate this, I route queries through Supavisor in transaction pooling mode with a strict 3-second statement timeout.",
    },
    {
      round: 3,
      question:
        "If two identical generative fallback requests arrive simultaneously for an unindexed term, how do you prevent duplicate rows or race conditions?",
      candidateAnswerSummary:
        "Said the database has a unique constraint on the term column.",
      whatWasMissing:
        "Missed how `canonical_key` conflict resolution (`ON CONFLICT DO NOTHING`) avoids throwing 500 errors to concurrent callers.",
      seniorSpokenRewrite:
        "I rely on a generated `canonical_key` unique index and execute an idempotent upsert so concurrent writers never corrupt state. If a race occurs, the losing transaction catches the unique constraint code and returns the winning row.",
    },
  ],
};

describe("technicalGrillInitSchema", () => {
  it("accepts valid context and optional focusTopic", () => {
    expect(
      technicalGrillInitSchema.safeParse({
        context: "Next.js 14 App Router, Supabase pgvector, Gemini 2.5 Flash.",
        focusTopic: "HNSW indexing and connection pooling",
      }).success
    ).toBe(true);
    expect(
      technicalGrillInitSchema.safeParse({
        context: "Next.js 14 App Router, Supabase pgvector, Gemini 2.5 Flash.",
      }).success
    ).toBe(true);
  });

  it("rejects context shorter than 10 characters or longer than 2500 characters", () => {
    expect(
      technicalGrillInitSchema.safeParse({ context: "Too short" }).success
    ).toBe(false);
    expect(
      technicalGrillInitSchema.safeParse({ context: "a".repeat(2501) }).success
    ).toBe(false);
  });

  it("rejects focusTopic longer than 100 characters", () => {
    expect(
      technicalGrillInitSchema.safeParse({
        context: "Valid project context for technical grill session.",
        focusTopic: "x".repeat(101),
      }).success
    ).toBe(false);
  });

  it("defaults grillType to 'project' and accepts 'concept' and 'jd'", () => {
    const defaultParsed = technicalGrillQuestionRequestSchema.safeParse({
      context: "Concept: Idempotency Key in distributed systems.",
      currentRound: 1,
    });
    expect(defaultParsed.success).toBe(true);
    if (defaultParsed.success) {
      expect(defaultParsed.data.grillType).toBe("project");
    }

    const conceptParsed = technicalGrillQuestionRequestSchema.safeParse({
      context: "Concept: Idempotency Key in distributed systems.",
      focusTopic: "Idempotency Key",
      grillType: "concept",
      currentRound: 1,
    });
    expect(conceptParsed.success).toBe(true);
    if (conceptParsed.success) {
      expect(conceptParsed.data.grillType).toBe("concept");
    }

    const jdInitParsed = technicalGrillInitSchema.safeParse({
      context: "Target Role: Senior Backend Engineer Interview Prep",
      focusTopic: "Senior Backend Engineer Interview Prep",
      grillType: "jd",
    });
    expect(jdInitParsed.success).toBe(true);
    if (jdInitParsed.success) {
      expect(jdInitParsed.data.grillType).toBe("jd");
    }

    const jdQuestionParsed = technicalGrillQuestionRequestSchema.safeParse({
      context: "Target Role: Senior Backend Engineer Interview Prep",
      focusTopic: "Senior Backend Engineer Interview Prep",
      grillType: "jd",
      currentRound: 1,
    });
    expect(jdQuestionParsed.success).toBe(true);
    if (jdQuestionParsed.success) {
      expect(jdQuestionParsed.data.grillType).toBe("jd");
    }

    const jdEvaluateParsed = technicalGrillEvaluateRequestSchema.safeParse({
      context: "Target Role: Senior Backend Engineer Interview Prep",
      focusTopic: "Senior Backend Engineer Interview Prep",
      grillType: "jd",
      history: [
        { role: "interviewer", content: "Q1" },
        { role: "candidate", content: "A1" },
      ],
    });
    expect(jdEvaluateParsed.success).toBe(true);
    if (jdEvaluateParsed.success) {
      expect(jdEvaluateParsed.data.grillType).toBe("jd");
    }

    const invalidParsed = technicalGrillQuestionRequestSchema.safeParse({
      context: "Concept: Idempotency Key in distributed systems.",
      grillType: "behavioral",
      currentRound: 1,
    });
    expect(invalidParsed.success).toBe(false);
  });

  it("separates system prompts for project vs jd and concept vs project vs jd grill", () => {
    expect(getStressTestSystemPrompt("project")).toContain(
      "defending the candidate's actual architecture and personal implementation decisions"
    );
    const jdPrompt = getStressTestSystemPrompt("jd");
    expect(jdPrompt).toContain(
      "interview coach analyzing a company's hiring requirements"
    );
    expect(jdPrompt).toContain(
      "IGNORE non-technical company fluff, perks, benefits, and DEI disclaimers."
    );
    expect(jdPrompt).toContain("[Extracted Role Name] Interview Prep");
    expect(jdPrompt).toContain("STRICTLY FORBID phrases like 'I built this project/platform'");

    expect(getGrillQuestionSystemPrompt("concept")).toContain(
      "Do NOT say 'in your project'"
    );
    expect(getGrillQuestionSystemPrompt("project")).toContain(
      "The candidate is defending their own project"
    );
    const jdGrillPrompt = getGrillQuestionSystemPrompt("jd");
    expect(jdGrillPrompt).toContain(
      "The candidate is interviewing for a specific Job Description / Role."
    );
    expect(jdGrillPrompt).toContain(
      "DO NOT assume the candidate built a project called this."
    );
    expect(jdGrillPrompt).toContain(
      "Act as the hiring manager / tech lead interviewing the candidate for this target role."
    );
  });

  it("clamps co-builder input prompt to 1,500 characters after trimming", () => {
    const rawJd = `   ${"x".repeat(2200)}   `;
    const clamped = sanitizeCoBuilderPrompt(rawJd);
    expect(clamped.length).toBe(1500);
    expect(sanitizeCoBuilderPrompt("  Short valid JD  ")).toBe("Short valid JD");
  });
});

describe("Gemini Fallback Cascade & Quota Detection", () => {
  it("cascades from gemini-3.5-flash-lite to gemini-3.1-flash-lite with maxRetries: 0 and abortSignal", async () => {
    const attemptedModels: string[] = [];
    const seenMaxRetries: number[] = [];
    const result = await runWithGeminiFallback(
      async (_model, modelId, config) => {
        attemptedModels.push(modelId);
        seenMaxRetries.push(config.maxRetries);
        expect(config.abortSignal).toBeInstanceOf(AbortSignal);
        if (modelId === "gemini-3.5-flash-lite") {
          const err = new Error(
            "AI_APICallError: You exceeded your current quota, limit: 500, model: gemini-3.5-flash-lite"
          ) as Error & { status: number };
          err.status = 429;
          throw err;
        }
        return `success-from-${modelId}`;
      }
    );

    expect(result).toBe("success-from-gemini-3.1-flash-lite");
    expect(attemptedModels).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]);
    expect(seenMaxRetries).toEqual([0, 0]);
  });

  it("fails over immediately on 404 (deprecated model) and 429 (quota exceeded)", async () => {
    const attemptedModels: string[] = [];
    const result = await runWithGeminiFallback(
      async (_model, modelId) => {
        attemptedModels.push(modelId);
        if (modelId === "gemini-3.5-flash-lite") {
          const err = new Error(
            "models/gemini-3.5-flash-lite is not found for API version v1beta"
          ) as Error & { status: number };
          err.status = 404;
          throw err;
        }
        if (modelId === "gemini-3.1-flash-lite") {
          const err = new Error(
            "Resource has been exhausted (e.g. check quota)."
          ) as Error & { status: number };
          err.status = 429;
          throw err;
        }
        return `recovered-by-${modelId}`;
      }
    );

    expect(result).toBe("recovered-by-gemini-3.8-flash");
    expect(attemptedModels).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
    ]);
  });

  it("aborts a hanging model attempt on timeout and fails over to the next candidate", async () => {
    const attemptedModels: string[] = [];
    const result = await runWithGeminiFallback(
      async (_model, modelId) => {
        attemptedModels.push(modelId);
        if (modelId === "gemini-3.5-flash-lite") {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return `fast-from-${modelId}`;
      },
      ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
      30
    );

    expect(result).toBe("fast-from-gemini-3.1-flash-lite");
    expect(attemptedModels).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]);
  });

  it("identifies 429, 404, quota, and timeout errors accurately via isQuotaOrRateLimitError", () => {
    expect(
      isQuotaOrRateLimitError(
        new Error("You exceeded your current quota (RESOURCE_EXHAUSTED)")
      )
    ).toBe(true);
    expect(isQuotaOrRateLimitError({ statusCode: 429, message: "Too many requests" })).toBe(
      true
    );
    expect(
      isQuotaOrRateLimitError({
        statusCode: 404,
        message: "models/gemini-2.5-flash-lite is not found",
      })
    ).toBe(true);
    expect(
      isQuotaOrRateLimitError({
        name: "TimeoutError",
        message: "Model attempt timed out after 12000ms",
      })
    ).toBe(true);
    expect(
      isQuotaOrRateLimitError({
        message: "AI_RetryError",
        lastError: new Error("Quota exceeded for metric"),
      })
    ).toBe(true);
    expect(isQuotaOrRateLimitError(new Error("Invalid JSON syntax"))).toBe(
      false
    );
    expect(QUOTA_EXHAUSTED_ERROR_MESSAGE).toBe(
      "Daily AI quota exhausted across all available model tiers. Please try again tomorrow or provide your own API key."
    );
    expect(GEMINI_FALLBACK_MODELS).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3-flash-preview",
      "gemini-2.5-flash",
    ]);
  });
});

describe("technicalGrillTurnSchema", () => {
  const validTurn = {
    history: [
      {
        role: "interviewer" as const,
        content: "Why did you choose pgvector over Pinecone?",
      },
      {
        role: "candidate" as const,
        content: "I wanted to keep embeddings in the same database as our relational tables.",
      },
    ],
    currentRound: 2,
  };

  it("accepts valid turn history and currentRound (1-3)", () => {
    expect(technicalGrillTurnSchema.safeParse(validTurn).success).toBe(true);
  });

  it("rejects empty history or history exceeding 6 messages", () => {
    expect(
      technicalGrillTurnSchema.safeParse({
        ...validTurn,
        history: [],
      }).success
    ).toBe(false);

    expect(
      technicalGrillTurnSchema.safeParse({
        ...validTurn,
        history: Array.from({ length: 7 }, () => validTurn.history[0]),
      }).success
    ).toBe(false);
  });

  it("rejects invalid role enum or message content over 2000 characters", () => {
    expect(
      technicalGrillTurnSchema.safeParse({
        ...validTurn,
        history: [{ role: "system", content: "Invalid role" }],
      }).success
    ).toBe(false);

    expect(
      technicalGrillTurnSchema.safeParse({
        ...validTurn,
        history: [{ role: "candidate", content: "x".repeat(2001) }],
      }).success
    ).toBe(false);
  });

  it("rejects currentRound outside 1..3 or non-integers", () => {
    expect(
      technicalGrillTurnSchema.safeParse({ ...validTurn, currentRound: 0 }).success
    ).toBe(false);
    expect(
      technicalGrillTurnSchema.safeParse({ ...validTurn, currentRound: 4 }).success
    ).toBe(false);
    expect(
      technicalGrillTurnSchema.safeParse({ ...validTurn, currentRound: 1.5 }).success
    ).toBe(false);
  });
});

describe("technicalGrillEvaluationSchema", () => {
  it("accepts a valid 3-round evaluation payload", () => {
    expect(technicalGrillEvaluationSchema.safeParse(validEvaluation).success).toBe(
      true
    );
  });

  it("enforces overallScore integer bounds (1-10) and hiringVerdict enum", () => {
    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        overallScore: 0,
      }).success
    ).toBe(false);
    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        overallScore: 11,
      }).success
    ).toBe(false);
    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        hiringVerdict: "No Hire",
      }).success
    ).toBe(false);
  });

  it("rejects questionBreakdowns when length is not exactly 3", () => {
    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        questionBreakdowns: validEvaluation.questionBreakdowns.slice(0, 2),
      }).success
    ).toBe(false);
  });

  it("enforces character bounds on summaryFeedback, question, candidateAnswerSummary, whatWasMissing, and seniorSpokenRewrite", () => {
    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        summaryFeedback: "x".repeat(550),
      }).success
    ).toBe(true);

    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        summaryFeedback: "x".repeat(601),
      }).success
    ).toBe(false);

    const [first, second, third] = validEvaluation.questionBreakdowns;

    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        questionBreakdowns: [
          {
            ...first,
            whatWasMissing: "x".repeat(350),
            seniorSpokenRewrite: "x".repeat(700),
          },
          second,
          third,
        ],
      }).success
    ).toBe(true);

    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        questionBreakdowns: [
          { ...first, question: "x".repeat(501) },
          second,
          third,
        ],
      }).success
    ).toBe(false);

    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        questionBreakdowns: [
          { ...first, candidateAnswerSummary: "x".repeat(501) },
          second,
          third,
        ],
      }).success
    ).toBe(false);

    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        questionBreakdowns: [
          { ...first, whatWasMissing: "x".repeat(451) },
          second,
          third,
        ],
      }).success
    ).toBe(false);

    expect(
      technicalGrillEvaluationSchema.safeParse({
        ...validEvaluation,
        questionBreakdowns: [
          { ...first, seniorSpokenRewrite: "x".repeat(801) },
          second,
          third,
        ],
      }).success
    ).toBe(false);
  });
});
