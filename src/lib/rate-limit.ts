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
import { Redis } from "@upstash/redis";

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

// ── Distributed limiter (Upstash) ──────────────────────────────────────────

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

/**
 * Rate limit across ALL serverless instances using Upstash Redis when it's
 * configured; otherwise falls back to the per-instance in-memory limiter. Use
 * this (awaited) for anything that needs real protection — login, signup, etc.
 * Fails open to the in-memory limiter if Redis is unreachable.
 */
export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return rateLimit(key, opts);
  try {
    const windowSec = Math.ceil(opts.windowMs / 1000);
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSec);
    if (count > opts.limit) {
      const ttl = await redis.ttl(redisKey);
      return { ok: false, remaining: 0, retryAfterSec: ttl > 0 ? ttl : windowSec };
    }
    return { ok: true, remaining: opts.limit - count, retryAfterSec: 0 };
  } catch {
    return rateLimit(key, opts);
  }
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
