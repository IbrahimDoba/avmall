/**
 * Signed-cookie grants that let unauthenticated visitors view an order they
 * just placed (or that they've successfully proven they own via
 * /api/v1/track-order). Without this, the order detail page would 404 for
 * guest checkouts — see CLAUDE.md §19.
 *
 * The grant is an HMAC-signed `${orderNumber}.${exp}.${sig}` string. The
 * cookie holds a comma-separated list so a customer can track multiple
 * orders. Anyone with the secret can mint them; anyone without it can only
 * present grants we already issued.
 */

import "server-only";

import crypto from "node:crypto";
import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export const GRANT_COOKIE = "track-grants";
const GRANT_TTL_HOURS = 24;
const MAX_GRANTS = 10;

function secret(): string {
  const s = env.NEXTAUTH_SECRET ?? env.CUSTOMER_SESSION_SECRET;
  if (!s) {
    throw new AppError(
      "TRACK_NOT_CONFIGURED",
      "Order tracking requires NEXTAUTH_SECRET to be set",
      503,
    );
  }
  return s;
}

function signGrant(orderNumber: string, exp: number): string {
  const payload = `${orderNumber}.${exp}`;
  const sig = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * Merge a new grant into an existing cookie value. Caps at MAX_GRANTS so
 * the cookie doesn't bloat indefinitely.
 */
export function mintGrant(
  orderNumber: string,
  existingCookieValue: string | undefined,
): { cookieValue: string; maxAgeSec: number } {
  const exp = Date.now() + GRANT_TTL_HOURS * 60 * 60 * 1000;
  const newGrant = signGrant(orderNumber, exp);
  const grants = (existingCookieValue ? existingCookieValue.split(",") : [])
    .filter((g) => g && !g.startsWith(orderNumber + "."))
    .concat(newGrant)
    .slice(-MAX_GRANTS);
  return {
    cookieValue: grants.join(","),
    maxAgeSec: GRANT_TTL_HOURS * 60 * 60,
  };
}

/**
 * Server-side check used by /orders/[number] for unauthenticated visitors.
 */
export function hasTrackGrant(
  cookieValue: string | undefined,
  orderNumber: string,
): boolean {
  if (!cookieValue) return false;
  let s: string;
  try {
    s = secret();
  } catch {
    return false;
  }
  for (const grant of cookieValue.split(",")) {
    const segments = grant.split(".");
    if (segments.length !== 3) continue;
    const [num, expStr, sig] = segments;
    if (num !== orderNumber) continue;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Date.now()) continue;
    const expected = crypto
      .createHmac("sha256", s)
      .update(`${num}.${expStr}`)
      .digest("base64url");
    if (sig && timingSafeEqualStrings(sig, expected)) return true;
  }
  return false;
}

/** Apply a freshly minted grant onto a Next response's cookies. */
export function setGrantCookie(
  cookies: ResponseCookies,
  orderNumber: string,
  existing: string | undefined,
): void {
  const { cookieValue, maxAgeSec } = mintGrant(orderNumber, existing);
  cookies.set(GRANT_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  });
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
