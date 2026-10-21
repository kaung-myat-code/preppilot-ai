import { NextResponse } from "next/server";
import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@/utils/supabase/server";

export interface SeedTechTerm {
  term: string;
  analogy: string;
  definition: string;
  interview_context: string;
}

const SEED_TERMS: SeedTechTerm[] = [
  {
    term: "API (Application Programming Interface)",
    analogy:
      "Think of an API like a waiter in a restaurant. You (the client) look at the menu and give your order to the waiter (the API), who takes it to the kitchen (the server/database) and brings the prepared dish (the response) back to your table without you needing to know how the kitchen operates.",
    definition:
      "An Application Programming Interface (API) is a formal set of rules, protocols, and data contracts (such as REST over HTTP or GraphQL) that enables distinct software components, microservices, or external client applications to communicate and exchange data securely.",
    interview_context:
      "An API is a contract-driven interface that decouples client applications from backend services. In production systems, I design RESTful or GraphQL APIs with strict schema validation (like Zod), predictable HTTP status codes, authentication middleware, and rate limiting so frontend and backend teams can scale and deploy independently.",
  },
  {
    term: "LLM (Large Language Model)",
    analogy:
      "An LLM is like a seasoned scholar who has read virtually every book, article, and code repository in a massive library, learning the statistical patterns of human language and reasoning so well that they can draft essays, write code, or summarize complex topics on demand.",
    definition:
      "A Large Language Model (LLM) is a deep-learning neural network—typically built on the Transformer architecture with self-attention mechanisms—trained on massive corpora of text and code to predict token sequences and perform natural language understanding, reasoning, and generation.",
    interview_context:
      "LLMs are Transformer-based foundation models trained on vast datasets to predict next tokens based on context. When integrating LLMs into production apps, I focus on deterministic structured outputs using Zod schemas, prompt engineering, token budget management, and grounding responses with RAG to prevent hallucinations.",
  },
  {
    term: "RAG (Retrieval-Augmented Generation)",
    analogy:
      "RAG is like taking an open-book exam instead of relying purely on memory. Before answering a question, the student first looks up the exact relevant pages in an authoritative textbook and quotes those facts to construct an accurate, up-to-date answer.",
    definition:
      "Retrieval-Augmented Generation (RAG) is an AI architecture pattern that enhances LLM responses by first converting a user query into a vector embedding, retrieving semantically relevant documents from an external vector database, and injecting that context into the model's prompt prior to generation.",
    interview_context:
      "RAG solves two major LLM limitations: hallucinations and static training cutoffs. Instead of fine-tuning a model for every data update, we embed domain documents into a vector store like Supabase pgvector, perform cosine similarity search at query time, and pass the retrieved context to the LLM so its answers are grounded in verifiable data.",
  },
  {
    term: "SSR vs CSR (Server-Side Rendering vs Client-Side Rendering)",
    analogy:
      "SSR is like ordering a fully assembled meal delivered hot to your door ready to eat immediately, whereas CSR is like receiving a meal-kit box with raw ingredients and a recipe card where your own kitchen (the browser) has to cook and assemble the meal before you can eat.",
    definition:
      "Server-Side Rendering (SSR) generates the complete HTML for a web page on the server per request before sending it to the client, improving First Contentful Paint (FCP) and SEO. Client-Side Rendering (CSR) ships a minimal HTML shell and JavaScript bundle to the browser, which fetches data and renders the DOM dynamically on the client.",
    interview_context:
      "The choice between SSR and CSR comes down to SEO, initial load performance, and interactivity. In Next.js App Router, I default to React Server Components (SSR) for fast initial paint, zero client bundle overhead, and secure server-side data fetching, while selectively opting into Client Components ('use client') only for interactive UI state and browser APIs.",
  },
  {
    term: "Vector Database",
    analogy:
      "While a traditional database organizes books alphabetically by exact title or ISBN, a Vector Database arranges books on a 3D map by their underlying meaning and themes—so a query for 'cosmic exploration' automatically finds books about 'interstellar travel' even if they share zero exact keywords.",
    definition:
      "A Vector Database is a specialized storage and indexing system designed to store high-dimensional numerical arrays (vector embeddings) and execute fast Approximate Nearest Neighbor (ANN) similarity searches using distance metrics such as cosine similarity, Euclidean distance (L2), or inner product.",
    interview_context:
      "Traditional relational databases excel at exact keyword and B-tree lookups, but struggle with semantic similarity. A vector database—or PostgreSQL with the pgvector extension—stores high-dimensional embeddings generated by models like Gemini Embedding and uses HNSW or IVFFlat indexes to retrieve semantically related records in milliseconds for RAG pipelines.",
  },
];

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

async function handleSeedTerms() {
  // TODO(security): Restrict seed endpoint to authenticated admin users and enforce rate limiting in production.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Server configuration error: GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.",
      },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  try {
    const supabase = await createClient();

    const recordsWithEmbeddings = await Promise.all(
      SEED_TERMS.map(async (item) => {
        const combinedText = `Term: ${item.term}\nTechnical Definition: ${item.definition}\nInterview Answer: ${item.interview_context}`;

        const { embedding } = await embed({
          model: google.textEmbeddingModel("gemini-embedding-001"),
          value: combinedText,
          dimensions: 768,
          providerOptions: {
            google: {
              outputDimensionality: 768,
            },
          },
        });

        return {
          term: item.term,
          analogy: item.analogy,
          definition: item.definition,
          interview_context: item.interview_context,
          ["interview_" + "answer"]: item.interview_context,
          embedding,
        };
      })
    );

    const { data, error: dbError } = await supabase
      .from("tech_terms")
      .upsert(recordsWithEmbeddings, { onConflict: "term" })
      .select("id, term");

    if (dbError) {
      console.error("Supabase upsert error while seeding tech_terms:", dbError.message);
      return NextResponse.json(
        {
          error: "Failed to seed technical terms into the database.",
        },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    const seededCount = data?.length ?? recordsWithEmbeddings.length;

    return NextResponse.json(
      {
        message: `Successfully seeded ${seededCount} technical terms.`,
        seededCount,
        terms: data ?? recordsWithEmbeddings.map((r) => ({ term: r.term })),
      },
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error: unknown) {
    console.error(
      "Error seeding technical terms:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      {
        error: "An unexpected error occurred while generating embeddings and seeding terms.",
      },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

export async function POST() {
  return handleSeedTerms();
}

export async function GET() {
  return handleSeedTerms();
}
