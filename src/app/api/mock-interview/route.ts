import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText, type ModelMessage } from "ai";
import { z } from "zod";

type StreamTextWithDataStream = ReturnType<typeof streamText> & {
  toDataStreamResponse: (init?: ResponseInit) => Response;
};

const MessagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const IncomingMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(12000).optional(),
  parts: z.array(MessagePartSchema).optional(),
});

const RequestBodySchema = z.object({
  messages: z.array(IncomingMessageSchema).min(1).max(100),
});

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

const SYSTEM_PROMPT = `You are a Senior Principal Software Engineer and hiring manager interviewing a candidate for a Junior/Mid-level Full-Stack and AI Developer role.
Your interview topics include Next.js, React, Supabase, APIs, RAG, and LLM integration.
When the candidate answers:
1. Provide constructive, brief feedback evaluating both their Technical Accuracy and English Articulation/Fluency.
2. If their explanation is weak or misses key points, provide a 2-sentence 'Senior Model Answer'.
3. Always end with ONE follow-up technical question to keep the interview flow realistic and conversational.
Keep your responses professional, encouraging, concise, and formatted with clean markdown bullet points.`;

export async function POST(req: NextRequest) {
  // TODO(security): Enforce user authentication and per-IP/per-user rate limiting in production.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error(
      "Google AI Error: GOOGLE_GENERATIVE_AI_API_KEY is not configured in environment variables."
    );
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
    console.error("Mock Interview Request Parse Error:", parseError);
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
          "Invalid request parameters. Please provide a non-empty messages array.",
      },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const normalizedMessages: ModelMessage[] = parsedBody.data.messages
    .map((msg): ModelMessage | null => {
      const textFromParts = Array.isArray(msg.parts)
        ? msg.parts
            .filter((part) => part.type === "text" && typeof part.text === "string")
            .map((part) => part.text)
            .join("")
        : "";
      const content = (msg.content ?? textFromParts).trim();
      if (!content) {
        return null;
      }
      if (msg.role === "system") {
        return { role: "system", content };
      }
      if (msg.role === "assistant") {
        return { role: "assistant", content };
      }
      return { role: "user", content };
    })
    .filter((msg): msg is ModelMessage => msg !== null);

  if (normalizedMessages.length === 0) {
    return NextResponse.json(
      { error: "Please provide at least one message with non-empty text." },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  try {
    const rawResult = streamText({
      model: google("gemini-2.5-flash"),
      system: SYSTEM_PROMPT,
      messages: normalizedMessages,
      temperature: 0.5,
    });

    const result: StreamTextWithDataStream = Object.assign(rawResult, {
      toDataStreamResponse: (init?: ResponseInit) =>
        rawResult.toTextStreamResponse(init),
    });

    return result.toDataStreamResponse({
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error("Mock Interview Stream Error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to stream the mock interview response. Please try again.";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
