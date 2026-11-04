import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis: Redis | null =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

/**
 * Module 1: Project & JD Stress-Tester (`/api/co-builder`)
 * 5 requests per 1 hour per IP (heavy structural synthesis)
 */
export const stressTestLimiter: Ratelimit | null = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "ratelimit:stress-test",
    })
  : null;

/**
 * Module 2: RAG Explainer (`/api/search-terms`)
 * 15 requests per 1 minute per IP (lightweight vector RAG & exact match)
 */
export const ragExplainerLimiter: Ratelimit | null = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, "1 m"),
      prefix: "ratelimit:rag-explainer",
    })
  : null;

/**
 * Module 3: 3-Round Technical Grill (`/api/grill/question`)
 * 4 sessions per 1 hour per IP (deducted on round === 1 only)
 */
export const grillLimiter: Ratelimit | null = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(4, "1 h"),
      prefix: "ratelimit:grill-session",
    })
  : null;

/**
 * Extracts the client IP address from standard proxy headers with a local fallback.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}

export interface RateLimitCheckResult {
  success: boolean;
  limit?: number;
  remaining: number;
  reset?: number;
  resetInSeconds: number;
}

let hasLoggedMissingRedisWarning = false;

/**
 * Unified rate-limit checker with fail-open resilience when Redis is unconfigured.
 */
export async function checkRateLimit(
  limiter: Pick<Ratelimit, "limit"> | null,
  identifier: string
): Promise<RateLimitCheckResult> {
  if (!limiter || !redis) {
    if (!hasLoggedMissingRedisWarning) {
      console.warn(
        "[RateLimit] Upstash Redis credentials missing; failing open and bypassing rate limits."
      );
      hasLoggedMissingRedisWarning = true;
    }
    return {
      success: true,
      remaining: 999,
      resetInSeconds: 0,
    };
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
    resetInSeconds: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
  };
}
