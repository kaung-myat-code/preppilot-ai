import { describe, it, expect } from "vitest";
import {
  projectDefenseSchema,
  projectDefenseRequestSchema,
  techTermSchema,
  searchResultSchema,
  searchTermsRequestSchema,
  dynamicSynthesisResultSchema,
} from "@/lib/schemas";

const validDefense = {
  projectTitle: "PrepPilot AI",
  elevatorPitch:
    "I built a RAG interview prep platform on Next.js and Supabase pgvector. I chose pgvector to keep embeddings next to relational data, cutting lookup latency to under 80ms.",
  tradeoffTraps: Array.from({ length: 3 }, (_, i) => ({
    layer: `Layer ${i}`,
    chosenTech: "Supabase pgvector",
    whyNotAlternativeQuestion: "Why pgvector over Pinecone or Qdrant?",
    seniorDefenseAnswer:
      "I chose pgvector to avoid a second datastore. The trade-off is lower scale; past tens of millions of vectors I would move to Qdrant.",
  })),
  bottleneckTraps: Array.from({ length: 2 }, () => ({
    failureScenario: "Embedding API spikes cause request pile-ups and timeouts.",
    mitigationStrategy:
      "To prevent this, I queue embedding calls with a concurrency cap and fall back to canonical lookups.",
  })),
};

describe("projectDefenseSchema", () => {
  it("accepts a valid defense payload", () => {
    expect(projectDefenseSchema.safeParse(validDefense).success).toBe(true);
  });

  it("rejects tradeoffTraps that are not exactly 3", () => {
    expect(
      projectDefenseSchema.safeParse({
        ...validDefense,
        tradeoffTraps: validDefense.tradeoffTraps.slice(0, 2),
      }).success
    ).toBe(false);
    expect(
      projectDefenseSchema.safeParse({
        ...validDefense,
        tradeoffTraps: [...validDefense.tradeoffTraps, validDefense.tradeoffTraps[0]],
      }).success
    ).toBe(false);
  });

  it("rejects bottleneckTraps that are not exactly 2", () => {
    expect(
      projectDefenseSchema.safeParse({
        ...validDefense,
        bottleneckTraps: validDefense.bottleneckTraps.slice(0, 1),
      }).success
    ).toBe(false);
  });

  it("enforces pitch and answer length limits", () => {
    expect(
      projectDefenseSchema.safeParse({ ...validDefense, elevatorPitch: "Too short." })
        .success
    ).toBe(false);
    expect(
      projectDefenseSchema.safeParse({
        ...validDefense,
        elevatorPitch: "x".repeat(451),
      }).success
    ).toBe(false);
    expect(
      projectDefenseSchema.safeParse({
        ...validDefense,
        tradeoffTraps: [
          { ...validDefense.tradeoffTraps[0], seniorDefenseAnswer: "x".repeat(450) },
          validDefense.tradeoffTraps[1],
          validDefense.tradeoffTraps[2],
        ],
      }).success
    ).toBe(true);
    expect(
      projectDefenseSchema.safeParse({
        ...validDefense,
        tradeoffTraps: [
          { ...validDefense.tradeoffTraps[0], seniorDefenseAnswer: "x".repeat(701) },
          validDefense.tradeoffTraps[1],
          validDefense.tradeoffTraps[2],
        ],
      }).success
    ).toBe(false);
    expect(
      projectDefenseSchema.safeParse({
        ...validDefense,
        bottleneckTraps: [
          { ...validDefense.bottleneckTraps[0], mitigationStrategy: "x".repeat(701) },
          validDefense.bottleneckTraps[1],
        ],
      }).success
    ).toBe(false);
  });

  it("rejects a tradeoff trap missing 'chosenTech'", () => {
    const { chosenTech, ...rest } = validDefense.tradeoffTraps[0];
    void chosenTech;
    expect(
      projectDefenseSchema.safeParse({
        ...validDefense,
        tradeoffTraps: [rest, validDefense.tradeoffTraps[1], validDefense.tradeoffTraps[2]],
      }).success
    ).toBe(false);
  });
});

describe("projectDefenseRequestSchema", () => {
  it("accepts and trims a valid prompt", () => {
    const result = projectDefenseRequestSchema.safeParse({
      prompt: "   Next.js 14, Supabase pgvector   ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.prompt).toBe("Next.js 14, Supabase pgvector");
  });

  it("rejects prompts under 10 characters (after trimming)", () => {
    expect(projectDefenseRequestSchema.safeParse({ prompt: "short" }).success).toBe(false);
    expect(
      projectDefenseRequestSchema.safeParse({ prompt: "   123456789   " }).success
    ).toBe(false);
  });

  it("rejects prompts over 2500 characters and accepts exactly 2500", () => {
    expect(
      projectDefenseRequestSchema.safeParse({ prompt: "a".repeat(2501) }).success
    ).toBe(false);
    expect(
      projectDefenseRequestSchema.safeParse({ prompt: "a".repeat(2500) }).success
    ).toBe(true);
  });
});

const validTechTerm = {
  term: "Idempotency Key",
  category: "backend" as const,
  analogy:
    "Like an elevator call button that only registers once even if pressed repeatedly.",
  definition:
    "A unique client-generated identifier attached to mutating requests so retries produce the same side effect only once.",
  interviewContext:
    "In distributed payment and webhook pipelines, I enforce idempotency keys stored in Redis or PostgreSQL with a unique constraint to prevent duplicate charges on network retries.",
  tradeoffs: [
    "Requires dedicated state storage and TTL eviction for seen keys",
    "Adds lookup latency on the write path",
  ],
  commonPitfalls: [
    "Reusing keys across different payload parameters without payload hash validation",
    "Failing to handle concurrent in-flight requests with the same key",
  ],
};

describe("techTermSchema & searchResultSchema", () => {
  it("accepts a valid techTerm object", () => {
    const result = techTermSchema.safeParse(validTechTerm);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid category enum value", () => {
    const result = techTermSchema.safeParse({
      ...validTechTerm,
      category: "mobile",
    });
    expect(result.success).toBe(false);
  });

  it("validates searchResultSchema with similarity and autoIndexed", () => {
    const result = searchResultSchema.safeParse({
      ...validTechTerm,
      similarity: 1.0,
      autoIndexed: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates searchTermsRequestSchema trimming and 60-char max limit", () => {
    expect(searchTermsRequestSchema.safeParse({ query: "  GraphQL  " }).success).toBe(
      true
    );
    expect(searchTermsRequestSchema.safeParse({ query: "   " }).success).toBe(false);
    expect(
      searchTermsRequestSchema.safeParse({ query: "a".repeat(61) }).success
    ).toBe(false);
  });
});

describe("dynamicSynthesisResultSchema", () => {
  it("accepts a valid technical term (isValidTerm: true)", () => {
    const result = dynamicSynthesisResultSchema.safeParse({
      ...validTechTerm,
      isValidTerm: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a valid variant with too-short definition or <2 tradeoffs", () => {
    expect(
      dynamicSynthesisResultSchema.safeParse({
        ...validTechTerm,
        isValidTerm: true,
        definition: "too short",
      }).success
    ).toBe(false);
    expect(
      dynamicSynthesisResultSchema.safeParse({
        ...validTechTerm,
        isValidTerm: true,
        tradeoffs: ["only one"],
      }).success
    ).toBe(false);
  });

  it("accepts a rejected non-technical term (isValidTerm: false)", () => {
    const result = dynamicSynthesisResultSchema.safeParse({
      isValidTerm: false,
      reason: "The query is a casual phrase, not a software engineering concept.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a rejection object missing a reason", () => {
    expect(
      dynamicSynthesisResultSchema.safeParse({ isValidTerm: false }).success
    ).toBe(false);
  });
});
