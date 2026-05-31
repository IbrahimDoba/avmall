/**
 * Nuqood client — typed wrapper around the REST endpoints we use.
 *
 * Docs: https://nuqood.ng/documentation
 *
 * Auth: two custom headers
 *   api-key:    APIKEY-...   (env NUQOOD_API_KEY)
 *   secret-key: SECKEY-...   (env NUQOOD_SECRET_KEY)
 *
 * Every request body also carries `business_code` (env NUQOOD_BUSINESS_CODE).
 *
 * Currency note: the API takes `amount` in whole Naira (NOT kobo).
 * We convert kobo → naira before sending. See amountForNuqood().
 *
 * Only PALMPAY (bank code 100033) is supported for dynamic accounts.
 */

import "server-only";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

const DEFAULT_BASE = "https://nuqood.ng";

/** True when every required Nuqood env var is set. */
export const nuqoodConfigured: boolean =
  !!env.NUQOOD_API_KEY && !!env.NUQOOD_SECRET_KEY && !!env.NUQOOD_BUSINESS_CODE;

function baseUrl(): string {
  return env.NUQOOD_API_BASE ?? DEFAULT_BASE;
}

function authHeaders(): Record<string, string> {
  if (!env.NUQOOD_API_KEY || !env.NUQOOD_SECRET_KEY) {
    throw new AppError(
      "NUQOOD_NOT_CONFIGURED",
      "Nuqood credentials missing — set NUQOOD_API_KEY, NUQOOD_SECRET_KEY and NUQOOD_BUSINESS_CODE.",
      503,
    );
  }
  return {
    "Content-Type": "application/json",
    "api-key": env.NUQOOD_API_KEY,
    "secret-key": env.NUQOOD_SECRET_KEY,
  };
}

/** Convert our internal kobo to Nuqood's Naira amount field. */
export function amountForNuqood(kobo: number): number {
  return Math.floor(kobo / 100);
}

/** Convert a webhook payload's `amount` (Naira) back to our internal kobo. */
export function amountFromNuqood(value: number | string): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/**
 * Parse Nuqood's `time_left` string into seconds.
 * Docs return "30 minutes." — handles minutes, seconds, hours.
 * Falls back to 1800s (30 min) if unparseable.
 */
export function parseTimeLeft(timeLeft: string): number {
  const cleaned = timeLeft.toLowerCase().replace(/\./g, "").trim();
  const match = cleaned.match(/(\d+)\s*(hour|hr|minute|min|second|sec)/);
  if (!match || !match[1] || !match[2]) return 30 * 60;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  if (unit.startsWith("hour") || unit === "hr") return n * 3600;
  if (unit.startsWith("minute") || unit === "min") return n * 60;
  return n;
}

export interface NuqoodDynamicAccount {
  ref: string;
  number: string;
  name: string;
  bank: string;
  /** e.g. "30 minutes." — use parseTimeLeft() to convert */
  time_left: string;
}

export interface CreateDynamicAccountInput {
  email: string;
  amountKobo: number;
  callbackUrl?: string;
}

/**
 * Spin up a one-shot virtual account (PalmPay) for a specific amount.
 * The customer is shown the bank details and must transfer the exact amount.
 * Nuqood POSTs our callback when the transfer lands.
 */
export async function createDynamicAccount(
  input: CreateDynamicAccountInput,
): Promise<NuqoodDynamicAccount> {
  const body: Record<string, unknown> = {
    business_code: env.NUQOOD_BUSINESS_CODE,
    email: input.email,
    amount: amountForNuqood(input.amountKobo),
    ...(input.callbackUrl && { callback: input.callbackUrl }),
  };

  const res = await fetch(`${baseUrl()}/api/v1/get_dynamic_account`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });

  let json: { status?: boolean; desc?: string; account?: NuqoodDynamicAccount };
  try {
    json = await res.json();
  } catch {
    throw new AppError(
      "NUQOOD_BAD_RESPONSE",
      `Nuqood returned a non-JSON response (status ${res.status})`,
      502,
    );
  }

  if (!res.ok || !json.status || !json.account) {
    throw new AppError(
      "NUQOOD_REQUEST_FAILED",
      json.desc ?? `Nuqood rejected the request (status ${res.status})`,
      502,
    );
  }

  return json.account;
}

/** Shape of the inbound webhook payload. Field names match Nuqood exactly. */
export interface NuqoodWebhookPayload {
  email?: string;
  phone?: string;
  business_code?: string;
  account_number?: string;
  customer_account_name?: string;
  customer_account_bank?: string;
  amount: number | string;
  date?: string;
  transaction_reference: string;
  customer_senderbankname?: string;
  customer_senderaccountnumber?: string;
  customer_sendername?: string;
}
