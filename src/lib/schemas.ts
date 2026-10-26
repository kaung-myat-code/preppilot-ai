import { z } from "zod";

export const projectDefenseSchema = z.object({
  projectTitle: z
    .string()
    .min(2)
    .max(80)
    .describe("Concise canonical name of the project or role"),
  elevatorPitch: z
    .string()
    .min(40)
    .max(450)
    .describe(
      "Strictly 2-3 first-person sentences ('I built/architected...') to be spoken aloud in 30 seconds, emphasizing engineering trade-offs and measurable impact"
    ),
  tradeoffTraps: z
    .array(
      z.object({
        layer: z
          .string()
          .describe(
            "Architectural layer (e.g., Database & Indexing, Frontend & Rendering, API & Concurrency)"
          ),
        chosenTech: z
          .string()
          .describe("The specific technology identified from the user's input"),
        whyNotAlternativeQuestion: z
          .string()
          .describe(
            "Skeptical interviewer question comparing chosenTech against a realistic competing alternative"
          ),
        seniorDefenseAnswer: z
          .string()
          .max(700)
          .describe(
            "Concise 2-3 sentence first-person spoken defense citing concrete trade-offs and acknowledging when the alternative would be required"
          ),
      })
    )
    .length(3)
    .describe("Exactly 3 'Why X over Y?' trade-off traps"),
  bottleneckTraps: z
    .array(
      z.object({
        failureScenario: z
          .string()
          .describe(
            "Concrete production failure mode under load, network partition, or spike specific to the stack"
          ),
        mitigationStrategy: z
          .string()
          .max(700)
          .describe(
            "First-person explanation of the exact production mechanism used to prevent or mitigate this failure"
          ),
      })
    )
    .length(2)
    .describe("Exactly 2 production bottleneck failure scenarios"),
});

export const projectDefenseRequestSchema = z.object({
  prompt: z.string().trim().min(10).max(2500),
});

export type ProjectDefense = z.infer<typeof projectDefenseSchema>;
export type ProjectDefenseRequest = z.infer<typeof projectDefenseRequestSchema>;

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

