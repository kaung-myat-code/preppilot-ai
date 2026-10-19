import { NextRequest, NextResponse } from "next/server";
import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

const SearchRequestSchema = z.object({
  query: z.string().trim().min(1, "Search query cannot be empty").max(1000),
});

export interface MatchedTechTerm {
  id: number | string;
  term: string;
  analogy: string;
  technical_definition: string;
  interview_answer: string;
  similarity?: number;
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

export async function POST(req: NextRequest) {
  // TODO(security): Enforce user authentication and per-IP/per-user rate limiting in production.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
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

  const parsedBody = SearchRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload. Please provide a non-empty search query.",
      },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const { query } = parsedBody.data;

  try {
    const { embedding } = await embed({
      model: google.textEmbeddingModel("gemini-embedding-001"),
      value: query,
      dimensions: 768,
      providerOptions: {
        google: {
          outputDimensionality: 768,
        },
      },
    });

    const supabase = await createClient();

    const { data, error: rpcError } = await supabase.rpc("match_tech_terms", {
      query_embedding: embedding,
      match_threshold: 0.55,
      match_count: 3,
    });

    if (rpcError) {
      console.error("Supabase RPC match_tech_terms error:", rpcError.message);
      return NextResponse.json(
        {
          error: "Failed to search technical terms in the vector database.",
        },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    const matchedTerms = (data ?? []) as MatchedTechTerm[];

    return NextResponse.json(
      {
        results: matchedTerms,
        terms: matchedTerms,
      },
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error: unknown) {
    console.error(
      "Error searching technical terms:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      {
        error: "Failed to generate query embedding or execute semantic search.",
      },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
