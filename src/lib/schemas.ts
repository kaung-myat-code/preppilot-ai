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
