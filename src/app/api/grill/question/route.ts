import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import {
  technicalGrillQuestionRequestSchema,
  technicalGrillTurnSchema,
} from "@/lib/schemas";
import {
  getGrillQuestionSystemPrompt,
  PROJECT_ROUND_DIRECTIVES,
  CONCEPT_ROUND_DIRECTIVES,
  JD_ROUND_DIRECTIVES,
} from "@/lib/prompts";
import {
  isQuotaOrRateLimitError,
  QUOTA_EXHAUSTED_ERROR_MESSAGE,
  runWithGeminiFallback,
} from "@/lib/gemini";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

export async function POST(req: NextRequest) {
  // TODO(security): Enforce user authentication and per-IP/per-user rate limiting in production.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
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
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const parsedBody = technicalGrillQuestionRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error:
          "Invalid request parameters. Provide a valid context (10-2500 chars), currentRound (1-3), and turn history.",
      },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const { context, focusTopic, grillType, history, currentRound } =
    parsedBody.data;

  if (history.length > 0) {
    const turnValidation = technicalGrillTurnSchema.safeParse({
      history,
      currentRound,
    });
    if (!turnValidation.success) {
      return NextResponse.json(
        { error: "Invalid turn history or round number." },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
  }

  const roundKey = currentRound as 1 | 2 | 3;
  const roundDirective =
    grillType === "concept"
      ? CONCEPT_ROUND_DIRECTIVES[roundKey]
      : grillType === "jd"
        ? JD_ROUND_DIRECTIVES[roundKey]
        : PROJECT_ROUND_DIRECTIVES[roundKey];

  const formattedHistory =
    history.length > 0
      ? history
          .map(
            (entry, idx) =>
              `[${idx + 1}] ${entry.role.toUpperCase()}: ${entry.content}`
          )
          .join("\n")
      : "No prior turns (this is Round 1).";

  const contextHeading =
    grillType === "concept"
      ? `Core Engineering Concept Context:\n"""\n${context}\n"""`
      : grillType === "jd"
        ? `Target Job Description / Role Context:\n"""\n${context}\n"""`
        : `Candidate Project Context:\n"""\n${context}\n"""`;

  const prompt = [
    `Active Round: Round ${currentRound} of 3`,
    `Grill Mode: ${
      grillType === "concept"
        ? "CONCEPT DRILL (Do NOT say 'in your project')"
        : grillType === "jd"
          ? "ROLE / JD INTERVIEW (Do NOT assume the candidate built a project called this)"
          : "PROJECT DEFENSE"
    }`,
    roundDirective,
    focusTopic ? `Focus Topic: """${focusTopic}"""` : null,
    contextHeading,
    `Prior Interview Transcript:\n"""\n${formattedHistory}\n"""`,
    `Generate the Round ${currentRound} interviewer question now (<= 2 sentences, no filler):`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { text } = await runWithGeminiFallback(
      (model, _modelId, { maxRetries, abortSignal }) =>
        generateText({
          model,
          system: getGrillQuestionSystemPrompt(grillType),
          prompt,
          temperature: 0.4,
          maxRetries,
          abortSignal,
        })
    );

    const cleanedQuestion = text.trim().slice(0, 350);
    if (!cleanedQuestion) {
      return NextResponse.json(
        { error: "Failed to generate an interview question. Please retry." },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { question: cleanedQuestion, currentRound, grillType },
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("Technical Grill Question Generation Error:", error);
    if (isQuotaOrRateLimitError(error)) {
      return NextResponse.json(
        { error: QUOTA_EXHAUSTED_ERROR_MESSAGE },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }
    return NextResponse.json(
      {
        error:
          "Failed to generate the technical grill question. Please try again in a moment.",
      },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
