import { z } from "zod";

export const BlueprintSchema = z.object({
  projectTitle: z
    .string()
    .describe("A concise, professional name for the software project"),
  summary: z
    .string()
    .describe(
      "A comprehensive executive summary of the system architecture, target use case, and technical strategy"
    ),
  architectureLayers: z
    .array(
      z.object({
        layerName: z
          .string()
          .describe(
            "The architectural layer (e.g., Frontend & UI, API & Backend Services, Database & Storage, AI & Orchestration, Auth & Security)"
          ),
        selectedTech: z
          .string()
          .describe("The specific technologies and frameworks chosen for this layer"),
        why: z
          .string()
          .describe(
            "Detailed architectural rationale explaining why this technology is ideal for this project"
          ),
      })
    )
    .describe("Core system architecture layers and technology choices"),
  executionPlan: z
    .array(
      z.object({
        module: z
          .string()
          .describe("The implementation phase or system module name"),
        humanTask: z
          .string()
          .describe(
            "Concrete setup, configuration, or review tasks that the human developer should perform"
          ),
        agenticPrompt: z
          .string()
          .describe(
            "A detailed, copy-paste-ready prompt designed for an AI coding assistant to build this module end-to-end"
          ),
      })
    )
    .describe("Step-by-step hybrid human + AI agent execution roadmap"),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;

export const techTermCategorySchema = z.enum([
  "frontend",
  "backend",
  "devops",
  "ai",
  "general",
]);

export const techTermSchema = z.object({
  term: z
    .string()
    .trim()
    .min(1)
    .describe("The canonical name of the technical concept or architectural pattern"),
  category: techTermCategorySchema.describe(
    "The primary engineering category for the concept"
  ),
  analogy: z.string().optional(),
  definition: z
    .string()
    .trim()
    .min(1)
    .describe(
      "A concise, senior-level architectural definition explaining how the concept works under the hood"
    ),
  interviewContext: z
    .string()
    .trim()
    .min(1)
    .describe(
      "A clear, senior-level interview articulation explaining why and when to use this concept in production"
    ),
  tradeoffs: z
    .array(z.string())
    .describe(
      "Key engineering trade-offs (latency, consistency, complexity, cost) associated with this concept"
    ),
  commonPitfalls: z
    .array(z.string())
    .describe(
      "Common production pitfalls, anti-patterns, or misconceptions engineers face"
    ),
});

export const dynamicSynthesisResultSchema = z.discriminatedUnion("isValidTerm", [
  z.object({
    isValidTerm: z.literal(true),
    term: z
      .string()
      .trim()
      .min(1)
      .describe("The canonical name of the technical concept"),
    category: techTermCategorySchema.describe(
      "The primary engineering category for the concept"
    ),
    analogy: z
      .string()
      .min(10)
      .describe("A concrete real-world analogy to help explain the concept in an interview"),
    definition: z
      .string()
      .trim()
      .min(20)
      .describe("A rigorous architectural definition of how the concept works"),
    interviewContext: z
      .string()
      .trim()
      .min(30)
      .describe("How a senior engineer should articulate this concept in an interview"),
    tradeoffs: z
      .array(z.string())
      .min(2)
      .describe("Concrete engineering trade-offs"),
    commonPitfalls: z
      .array(z.string())
      .min(1)
      .describe("Common production pitfalls or anti-patterns"),
  }),
  z.object({
    isValidTerm: z.literal(false),
    reason: z
      .string()
      .trim()
      .min(1)
      .describe(
        "Clear explanation of why the input is not a recognized computer science, software engineering, systems design, or cloud architecture concept"
      ),
  }),
]);

export const searchResultSchema = techTermSchema.extend({
  id: z.union([z.number(), z.string()]).optional(),
  analogy: z.string().optional(),
  similarity: z.number().optional(),
  autoIndexed: z.boolean(),
});

export const searchTermsRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Search query cannot be empty.")
    .max(60, "Search query must be 60 characters or fewer."),
});

export type TechTermCategory = z.infer<typeof techTermCategorySchema>;
export type TechTerm = z.infer<typeof techTermSchema>;
export type DynamicSynthesisResult = z.infer<typeof dynamicSynthesisResultSchema>;
export type ValidSynthesis = Extract<DynamicSynthesisResult, { isValidTerm: true }>;
export type RejectedSynthesis = Extract<DynamicSynthesisResult, { isValidTerm: false }>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchTermsRequest = z.infer<typeof searchTermsRequestSchema>;

