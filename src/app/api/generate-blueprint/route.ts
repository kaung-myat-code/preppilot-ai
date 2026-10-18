import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
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

const RequestBodySchema = z.object({
  prompt: z.string().trim().min(1).max(4000).optional(),
  idea: z.string().trim().min(1).max(4000).optional(),
  projectIdea: z.string().trim().min(1).max(4000).optional(),
  description: z.string().trim().min(1).max(4000).optional(),
});

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

export async function POST(req: NextRequest) {
  // TODO(security): Enforce user authentication and per-IP/per-user rate limiting in production.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const configError = new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not configured in environment variables."
    );
    console.error("Google AI Error:", configError);
    return NextResponse.json(
      {
        error:
          "Server configuration error: GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.",
      },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch (parseError) {
    console.error("Google AI Error:", parseError);
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const parsedBody = RequestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error:
          "Invalid request parameters. Please provide a valid project description.",
      },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const userIdea =
    parsedBody.data.prompt ??
    parsedBody.data.idea ??
    parsedBody.data.projectIdea ??
    parsedBody.data.description;

  if (!userIdea) {
    return NextResponse.json(
      { error: "Please provide a project prompt or idea to generate a blueprint." },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: BlueprintSchema,
      system: `You are PrepPilot AI, a Principal Systems Architect and Staff Full-Stack Engineer.
Given a user's project idea or requirements, design a production-grade system blueprint.
Include 4 to 6 comprehensive architectureLayers (covering Frontend, Backend/API, Database, Auth/Security, AI/Infrastructure as appropriate) with deep, specific engineering rationales in "why".
Include 4 to 6 sequential modules in executionPlan, pairing clear human developer setup tasks ("humanTask") with highly specific, ready-to-run AI coding assistant prompts ("agenticPrompt").`,
      prompt: `Generate a complete system architecture blueprint and agentic execution plan for the following project:\n\n${userIdea}`,
      temperature: 0.4,
    });

    return NextResponse.json(object, {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error("Google AI Error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to generate the system blueprint. Please try again in a moment.";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
