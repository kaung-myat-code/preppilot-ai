import { google } from "@ai-sdk/google";

export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
] as const;

export type GeminiModelId = (typeof GEMINI_FALLBACK_MODELS)[number];

export const MODEL_ATTEMPT_TIMEOUT_MS = 12_000;

export const QUOTA_EXHAUSTED_ERROR_MESSAGE =
  "Daily AI quota exhausted across all available model tiers. Please try again tomorrow or provide your own API key.";

export interface GeminiAttemptConfig {
  maxRetries: 0;
  abortSignal: AbortSignal;
}

/**
 * Creates a Gemini language model instance configured for zero-retry cascade execution.
 * Note: `@ai-sdk/google` LanguageModelV4 receives `maxRetries: 0` and `abortSignal` at the
 * `generateText` call site via `GeminiAttemptConfig`, while this helper provides a clean
 * factory that accepts `{ maxRetries: 0 }` for caller ergonomics.
 */
export function getZeroRetryModel(
  modelId: GeminiModelId | (string & {}),
  _options: { maxRetries: 0 } = { maxRetries: 0 }
): ReturnType<typeof google> {
  void _options;
  return google(modelId);
}

export function getErrorStatusOrName(error: unknown): string | number {
  if (!error || typeof error !== "object") {
    return "UnknownError";
  }

  const record = error as Record<string, unknown>;
  if (typeof record.status === "number" || typeof record.status === "string") {
    return record.status;
  }
  if (typeof record.statusCode === "number") {
    return record.statusCode;
  }
  if (
    "lastError" in record &&
    record.lastError &&
    typeof record.lastError === "object"
  ) {
    const inner = record.lastError as Record<string, unknown>;
    if (typeof inner.statusCode === "number") {
      return inner.statusCode;
    }
    if (typeof inner.status === "number" || typeof inner.status === "string") {
      return inner.status;
    }
  }
  if (typeof record.name === "string" && record.name.trim()) {
    return record.name;
  }
  return "Error";
}

export function isQuotaOrRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const statusCode =
    typeof record.statusCode === "number"
      ? record.statusCode
      : typeof record.status === "number"
        ? record.status
        : undefined;

  if (
    statusCode === 429 ||
    statusCode === 404 ||
    statusCode === 408 ||
    statusCode === 504
  ) {
    return true;
  }

  const name = typeof record.name === "string" ? record.name.toLowerCase() : "";
  if (name === "timeouterror" || name === "aborterror") {
    return true;
  }

  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";
  if (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("429") ||
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("not_found") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("aborted")
  ) {
    return true;
  }

  if ("lastError" in record && record.lastError) {
    return isQuotaOrRateLimitError(record.lastError);
  }

  if ("cause" in record && record.cause) {
    return isQuotaOrRateLimitError(record.cause);
  }

  return false;
}

function withAttemptTimeout<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  timeoutMs: number
): Promise<T> {
  if (signal.aborted) {
    const err = new Error(`Model attempt timed out after ${timeoutMs}ms`);
    err.name = "TimeoutError";
    return Promise.reject(err);
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const err = new Error(`Model attempt timed out after ${timeoutMs}ms`);
      err.name = "TimeoutError";
      reject(err);
    };

    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}

/**
 * Executes an AI SDK call across the ordered Google AI Studio rate-limit model cascade:
 * 1. `google('gemini-3.5-flash-lite', { maxRetries: 0 })` (Primary - 500 RPD free tier)
 * 2. `google('gemini-3.1-flash-lite', { maxRetries: 0 })` (Secondary - 500 RPD free tier)
 * 3. `google('gemini-3.8-flash', { maxRetries: 0 })` (20 RPD)
 * 4. `google('gemini-3.6-flash', { maxRetries: 0 })` (20 RPD)
 * 5. `google('gemini-3-flash-preview', { maxRetries: 0 })` (20 RPD)
 * 6. `google('gemini-2.5-flash', { maxRetries: 0 })` (Last fallback - 20 RPD)
 *
 * Each model attempt enforces `maxRetries: 0` and an `AbortSignal.timeout(12000)`
 * (12-second hard limit) so 429/404s or provider stalls fail over immediately without
 * exponential backoff or hanging.
 */
export async function runWithGeminiFallback<T>(
  operation: (
    model: ReturnType<typeof google>,
    modelId: GeminiModelId | string,
    config: GeminiAttemptConfig
  ) => Promise<T>,
  models: readonly (GeminiModelId | string)[] = GEMINI_FALLBACK_MODELS,
  timeoutMs: number = MODEL_ATTEMPT_TIMEOUT_MS
): Promise<T> {
  const candidateModels: Partial<Record<string, ReturnType<typeof google>>> = {
    "gemini-3.5-flash-lite": getZeroRetryModel("gemini-3.5-flash-lite", {
      maxRetries: 0,
    }),
    "gemini-3.1-flash-lite": getZeroRetryModel("gemini-3.1-flash-lite", {
      maxRetries: 0,
    }),
    "gemini-3.8-flash": getZeroRetryModel("gemini-3.8-flash", {
      maxRetries: 0,
    }),
    "gemini-3.6-flash": getZeroRetryModel("gemini-3.6-flash", {
      maxRetries: 0,
    }),
    "gemini-3-flash-preview": getZeroRetryModel("gemini-3-flash-preview", {
      maxRetries: 0,
    }),
    "gemini-2.5-flash": getZeroRetryModel("gemini-2.5-flash", {
      maxRetries: 0,
    }),
  };

  let lastError: unknown;
  let sawQuotaOrTimeoutError = false;

  for (let i = 0; i < models.length; i++) {
    const modelId = models[i];
    const model = candidateModels[modelId] ?? getZeroRetryModel(modelId, { maxRetries: 0 });
    const abortSignal = AbortSignal.timeout(timeoutMs);

    try {
      return await withAttemptTimeout(
        operation(model, modelId, { maxRetries: 0, abortSignal }),
        abortSignal,
        timeoutMs
      );
    } catch (error) {
      lastError = error;
      if (isQuotaOrRateLimitError(error)) {
        sawQuotaOrTimeoutError = true;
      }

      const reason = getErrorStatusOrName(error);
      console.warn(
        `[Gemini Fallback] Model ${modelId} failed (${reason}). Failing over to next candidate...`
      );
    }
  }

  if (sawQuotaOrTimeoutError && !isQuotaOrRateLimitError(lastError)) {
    const quotaError = new Error(QUOTA_EXHAUSTED_ERROR_MESSAGE) as Error & {
      status: number;
      cause?: unknown;
    };
    quotaError.name = "QuotaExhaustedError";
    quotaError.status = 429;
    quotaError.cause = lastError;
    throw quotaError;
  }

  throw lastError;
}
