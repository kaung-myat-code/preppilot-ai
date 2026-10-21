import { describe, it, expect } from "vitest";
import {
  BlueprintSchema,
  techTermSchema,
  searchResultSchema,
  searchTermsRequestSchema,
  dynamicSynthesisResultSchema,
} from "@/lib/schemas";

const validBlueprint = {
  projectTitle: "TaskFlow",
  summary: "A collaborative task management platform.",
  architectureLayers: [
    {
      layerName: "Frontend & UI",
      selectedTech: "Next.js, Tailwind CSS",
      why: "Server components and fast iteration on UI.",
    },
  ],
  executionPlan: [
    {
      module: "Auth",
      humanTask: "Configure Supabase project and RLS policies.",
      agenticPrompt: "Implement Supabase auth with @supabase/ssr.",
    },
  ],
};

describe("BlueprintSchema", () => {
  it("accepts a valid blueprint", () => {
    const result = BlueprintSchema.safeParse(validBlueprint);
    expect(result.success).toBe(true);
  });

  it("rejects a layer missing the 'why' rationale", () => {
    const { why, ...layerWithoutWhy } = validBlueprint.architectureLayers[0];
    void why;
    const result = BlueprintSchema.safeParse({
      ...validBlueprint,
      architectureLayers: [layerWithoutWhy],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a layer missing 'selectedTech'", () => {
    const { selectedTech, ...layerWithoutTech } =
      validBlueprint.architectureLayers[0];
    void selectedTech;
    const result = BlueprintSchema.safeParse({
      ...validBlueprint,
      architectureLayers: [layerWithoutTech],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an execution step missing 'agenticPrompt'", () => {
    const result = BlueprintSchema.safeParse({
      ...validBlueprint,
      executionPlan: [{ module: "Auth", humanTask: "Do it" }],
    });
    expect(result.success).toBe(false);
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
