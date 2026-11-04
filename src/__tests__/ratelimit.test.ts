import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getClientIp,
  checkRateLimit,
  stressTestLimiter,
  ragExplainerLimiter,
  grillLimiter,
} from "@/lib/ratelimit";

describe("getClientIp", () => {
  it("extracts a single IP from x-forwarded-for", () => {
    const req = new Request("http://localhost/api/co-builder", {
      headers: {
        "x-forwarded-for": "203.0.113.195",
      },
    });
    expect(getClientIp(req)).toBe("203.0.113.195");
  });

  it("extracts the first trimmed client IP from multi-hop comma-separated x-forwarded-for", () => {
    const req = new Request("http://localhost/api/co-builder", {
      headers: {
        "x-forwarded-for": "  203.0.113.195 , 70.41.3.18, 150.172.238.178 ",
      },
    });
    expect(getClientIp(req)).toBe("203.0.113.195");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("http://localhost/api/search-terms", {
      headers: {
        "x-real-ip": "198.51.100.42",
      },
    });
    expect(getClientIp(req)).toBe("198.51.100.42");
  });

  it("falls back to 127.0.0.1 when no proxy IP headers exist", () => {
    const req = new Request("http://localhost/api/grill/question");
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});

describe("checkRateLimit (fail-open resilience)", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL;
    }
    if (originalToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
    vi.restoreAllMocks();
  });

  it("fails open and returns remaining: 999 when limiter is null or Redis credentials are omitted", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result1 = await checkRateLimit(stressTestLimiter, "203.0.113.195");
    expect(result1).toEqual({
      success: true,
      remaining: 999,
      resetInSeconds: 0,
    });

    const result2 = await checkRateLimit(ragExplainerLimiter, "203.0.113.195");
    expect(result2).toEqual({
      success: true,
      remaining: 999,
      resetInSeconds: 0,
    });

    const result3 = await checkRateLimit(grillLimiter, "203.0.113.195");
    expect(result3).toEqual({
      success: true,
      remaining: 999,
      resetInSeconds: 0,
    });

    // Warning is logged at most once across calls
    expect(warnSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("evaluates allowed and blocked responses with resetInSeconds when Redis is configured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://mock-upstash.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";

    vi.resetModules();
    const { checkRateLimit: activeCheckRateLimit } = await import(
      "@/lib/ratelimit"
    );

    const now = Date.now();
    const mockLimiter = {
      limit: vi.fn().mockResolvedValueOnce({
        success: false,
        limit: 5,
        remaining: 0,
        reset: now + 45_000,
        pending: Promise.resolve(),
      }),
    };

    const blockedResult = await activeCheckRateLimit(
      mockLimiter,
      "203.0.113.195"
    );

    expect(mockLimiter.limit).toHaveBeenCalledWith("203.0.113.195");
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.limit).toBe(5);
    expect(blockedResult.remaining).toBe(0);
    expect(blockedResult.resetInSeconds).toBeGreaterThanOrEqual(44);
    expect(blockedResult.resetInSeconds).toBeLessThanOrEqual(45);
  });
});
