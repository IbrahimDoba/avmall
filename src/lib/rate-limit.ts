/**
 * Minimal in-memory rate limiter. Works inside a single serverless function
 * instance — good enough to stop casual enumeration / brute-force. When
 * Upstash Redis is wired (CLAUDE.md §17), swap the storage for the @upstash
 * /ratelimit token-bucket without changing call sites.
 *
 * Keys should embed both the route and the client identifier:
 *   `track-order:${ip}`     — per-IP per-route
 *   `otp-start:${phone}`    — per-identifier per-route
 */

import { NextRequest } from "next/server";

interface Bucket {
  count: number;
  /** Epoch ms when the current window started. */
  windowStart: number;
}

const BUCKETS = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfterSec: number;
}

/**
 * Sliding-window-ish limiter. Resets the counter once the window passes
 * since the first hit. Returns ok=false when the limit is exceeded.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = BUCKETS.get(key);
  if (!existing || now - existing.windowStart >= opts.windowMs) {
    BUCKETS.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: opts.limit - 1, retryAfterSec: 0 };
  }
  existing.count += 1;
  if (existing.count > opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil(
        (existing.windowStart + opts.windowMs - now) / 1000,
      ),
    };
  }
  return {
    ok: true,
    remaining: opts.limit - existing.count,
    retryAfterSec: 0,
  };
}

/**
 * Best-effort client IP. Trusts Vercel's x-forwarded-for header; falls back
 * to "unknown" so the limiter still works in dev (all anonymous traffic
 * shares a bucket, which is fine).
 */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
