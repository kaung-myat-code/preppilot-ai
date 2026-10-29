import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import {
  projectDefenseSchema,
  projectDefenseRequestSchema,
} from "@/lib/schemas";
import {
  getStressTestSystemPrompt,
  sanitizeCoBuilderPrompt,
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

  const parsedBody = projectDefenseRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error:
          "Invalid request. Provide a project stack summary or Job Description between 10 and 2500 characters.",
      },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const { prompt, mode } = parsedBody.data;
  const sanitizedPrompt = sanitizeCoBuilderPrompt(prompt);
  const systemPrompt = getStressTestSystemPrompt(mode);
  const userPrompt =
    mode === "jd"
      ? `Analyze the following target Job Description and generate a JD-tailored interview prep kit (30-second fit pitch, 3 technical questions the hiring team will probe based on required technologies, and 2 domain scalability/reliability challenges):\n\n"""\n${sanitizedPrompt}\n"""`
      : `Generate the project architecture defense kit focusing on defending the candidate's actual architecture and personal implementation decisions for:\n\n"""\n${sanitizedPrompt}\n"""`;

  try {
    const { output } = await runWithGeminiFallback(
      (model, _modelId, { maxRetries, abortSignal }) =>
        generateText({
          model,
          output: Output.object({ schema: projectDefenseSchema }),
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.4,
          maxRetries,
          abortSignal,
        })
    );

    return NextResponse.json(output, { status: 200, headers: SECURITY_HEADERS });
  } catch (error) {
    console.error("Google AI Error:", error);
    if (isQuotaOrRateLimitError(error)) {
      return NextResponse.json(
        { error: QUOTA_EXHAUSTED_ERROR_MESSAGE },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "Failed to generate the defense kit. Please try again in a moment." },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
