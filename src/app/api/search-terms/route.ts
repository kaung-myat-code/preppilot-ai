import { NextRequest, NextResponse } from "next/server";
import { embed, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import {
  searchTermsRequestSchema,
  techTermSchema,
  type SearchResult,
  type TechTermCategory,
} from "@/lib/schemas";

export interface MatchedTechTerm {
  id: number | string;
  term: string;
  analogy?: string;
  technical_definition?: string;
  interview_answer?: string;
  category?: TechTermCategory;
  definition?: string;
  interviewContext?: string;
  tradeoffs?: string[];
  commonPitfalls?: string[];
  similarity?: number;
}

const SIMILARITY_THRESHOLD = 0.55;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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

  const parsedBody = searchTermsRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const firstIssue = parsedBody.error.issues[0]?.message;
    return NextResponse.json(
      {
        error:
          firstIssue ??
          "Invalid request payload. Query must be a non-empty string up to 60 characters.",
      },
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const { query } = parsedBody.data;

  try {
    const { embedding: queryEmbedding } = await embed({
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
      query_embedding: queryEmbedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: 1,
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

    const matches = (data ?? []) as MatchedTechTerm[];

    // Hit Branch: Semantic match found in pgvector above threshold
    if (
      matches.length > 0 &&
      typeof matches[0].similarity === "number" &&
      matches[0].similarity >= SIMILARITY_THRESHOLD
    ) {
      const topMatch = matches[0];
      const hitRecord: SearchResult = {
        id: topMatch.id,
        term: topMatch.term,
        category: topMatch.category ?? "general",
        definition:
          topMatch.definition ?? topMatch.technical_definition ?? topMatch.term,
        interviewContext:
          topMatch.interviewContext ?? topMatch.interview_answer ?? "",
        tradeoffs: Array.isArray(topMatch.tradeoffs) ? topMatch.tradeoffs : [],
        commonPitfalls: Array.isArray(topMatch.commonPitfalls)
          ? topMatch.commonPitfalls
          : [],
        analogy: topMatch.analogy ?? "",
        technical_definition:
          topMatch.technical_definition ?? topMatch.definition ?? "",
        interview_answer:
          topMatch.interview_answer ?? topMatch.interviewContext ?? "",
        similarity: topMatch.similarity,
        autoIndexed: false,
      };

      return NextResponse.json(
        {
          ...hitRecord,
          results: [hitRecord],
          terms: [hitRecord],
        },
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    // Miss / Dynamic Fallback Branch: Synthesize via Gemini 2.5 Flash & index in pgvector
    const { object: synthesized } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: techTermSchema,
      system: `You are a Principal Systems Architect and Staff Engineer preparing software engineers for senior technical interviews.
Synthesize the requested technical concept with concise, senior-level architectural depth:
- "term": Canonical technical name of the concept.
- "category": Select one of "frontend", "backend", "devops", "ai", or "general".
- "definition": Clear, rigorous architectural definition covering underlying mechanics and protocols.
- "interviewContext": How a senior engineer should articulate this concept, its system design role, and production impact during an interview.
- "tradeoffs": 2 to 4 concrete engineering trade-offs (e.g., latency vs. consistency, operational complexity, memory overhead).
- "commonPitfalls": 2 to 4 frequent production pitfalls or anti-patterns to avoid.`,
      prompt: `Synthesize a comprehensive, senior-level technical reference for the concept: "${query}"`,
      temperature: 0.3,
    });

    const combinedText = `${synthesized.term}: ${synthesized.definition}`;

    const { embedding: conceptEmbedding } = await embed({
      model: google.textEmbeddingModel("gemini-embedding-001"),
      value: combinedText,
      dimensions: 768,
      providerOptions: {
        google: {
          outputDimensionality: 768,
        },
      },
    });

    const synthesizedAnalogy = `Trade-offs: ${synthesized.tradeoffs.join(" • ")} | Common Pitfalls: ${synthesized.commonPitfalls.join(" • ")}`;

    const supabaseAdmin = createAdminSupabaseClient();

    const { data: upsertedRows, error: upsertError } = await supabaseAdmin
      .from("tech_terms")
      .upsert(
        {
          term: synthesized.term,
          analogy: synthesizedAnalogy,
          technical_definition: synthesized.definition,
          interview_answer: synthesized.interviewContext,
          embedding: conceptEmbedding,
        },
        { onConflict: "term" }
      )
      .select("id, term");

    if (upsertError) {
      console.error(
        "Supabase admin upsert error in search-terms fallback:",
        upsertError.message
      );
      return NextResponse.json(
        {
          error: "Failed to index synthesized technical concept into the vector database.",
        },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    const fallbackRecord: SearchResult = {
      ...(upsertedRows?.[0]?.id !== undefined ? { id: upsertedRows[0].id } : {}),
      ...synthesized,
      analogy: synthesizedAnalogy,
      technical_definition: synthesized.definition,
      interview_answer: synthesized.interviewContext,
      similarity: 1.0,
      autoIndexed: true,
    };

    return NextResponse.json(
      {
        ...fallbackRecord,
        results: [fallbackRecord],
        terms: [fallbackRecord],
      },
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error: unknown) {
    console.error(
      "Error in /api/search-terms:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      {
        error:
          "Failed to execute semantic search or synthesize fallback technical concept.",
      },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
