import { describe, it, expect } from "vitest";
import {
  technicalGrillInitSchema,
  technicalGrillTurnSchema,
  technicalGrillEvaluationSchema,
} from "@/lib/schemas";

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
