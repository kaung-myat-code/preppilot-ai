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

export const stressTestModeSchema = z.enum(["project", "jd"]);
export type StressTestMode = z.infer<typeof stressTestModeSchema>;

export const projectDefenseRequestSchema = z.object({
  prompt: z.string().trim().min(10).max(2500),
  mode: stressTestModeSchema.default("project"),
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

export const grillTypeSchema = z.enum(["project", "concept", "jd"]);
export type GrillType = z.infer<typeof grillTypeSchema>;

export const technicalGrillInitSchema = z.object({
  context: z
    .string()
    .trim()
    .min(10)
    .max(2500)
    .describe("Project summary, stack, concept definition, or target Job Description"),
  focusTopic: z.string().trim().max(100).optional(),
  grillType: grillTypeSchema.default("project"),
});

export const technicalGrillMessageSchema = z.object({
  role: z.enum(["interviewer", "candidate"]),
  content: z.string().trim().min(1).max(2000),
});

export const technicalGrillTurnSchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(["interviewer", "candidate"]),
        content: z.string().max(2000),
      })
    )
    .min(1)
    .max(6),
  currentRound: z.number().int().min(1).max(3),
});

export const technicalGrillQuestionRequestSchema = technicalGrillInitSchema
  .extend({
    history: z
      .array(
        z.object({
          role: z.enum(["interviewer", "candidate"]),
          content: z.string().max(2000),
        })
      )
      .max(6)
      .default([]),
    currentRound: z.number().int().min(1).max(3),
  })
  .refine((data) => data.currentRound === 1 || data.history.length >= 1, {
    message: "Conversation history is required for rounds 2 and 3.",
    path: ["history"],
  });

export const technicalGrillEvaluateRequestSchema = z.object({
  context: z.string().trim().min(10).max(2500).optional(),
  focusTopic: z.string().trim().max(100).optional(),
  grillType: grillTypeSchema.default("project"),
  history: technicalGrillTurnSchema.shape.history,
});

export const technicalGrillEvaluationSchema = z.object({
  overallScore: z.number().int().min(1).max(10),
  hiringVerdict: z.enum([
    "Strong Hire",
    "Hire",
    "Lean Hire",
    "Needs Practice",
  ]),
  summaryFeedback: z.string().max(600),
  questionBreakdowns: z
    .array(
      z.object({
        round: z.number().int().min(1).max(3),
        question: z.string().max(500),
        candidateAnswerSummary: z.string().max(500),
        whatWasMissing: z
          .string()
          .max(450)
          .describe(
            "1-2 sentences pinpointing technical omissions or passive phrasing"
          ),
        seniorSpokenRewrite: z
          .string()
          .max(800)
          .describe(
            "2-3 sentences written in first-person spoken English demonstrating how a Senior/Staff engineer phrases the exact same answer using concrete trade-offs"
          ),
      })
    )
    .length(3),
});

export type TechnicalGrillInit = z.infer<typeof technicalGrillInitSchema>;
export type TechnicalGrillMessage = z.infer<typeof technicalGrillMessageSchema>;
export type TechnicalGrillTurn = z.infer<typeof technicalGrillTurnSchema>;
export type TechnicalGrillQuestionRequest = z.infer<
  typeof technicalGrillQuestionRequestSchema
>;
export type TechnicalGrillEvaluateRequest = z.infer<
  typeof technicalGrillEvaluateRequestSchema
>;
export type TechnicalGrillEvaluation = z.infer<
  typeof technicalGrillEvaluationSchema
>;


