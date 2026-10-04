/**
 * Minimal client for the Dailzero developer API (https://www.dailzero.com/api/v1).
 *
 * Auth is a `dz_live_…` key; agent/tool management needs the "manage" scope,
 * chat completions the "chat" scope. The key is a secret: never ship it to the
 * browser, never log it.
 *
 * The key is passed in rather than read from env so the sync script (plain
 * tsx, no Next runtime) can use this module too.
 */

import type { DailzeroTool } from "@/lib/ai/dailzero-tools";
import { AppError } from "@/lib/errors";

export const DAILZERO_API_BASE = "https://www.dailzero.com/api/v1";

export interface DailzeroAgent {
  id: string;
  businessName: string;
  status: string;
}

/** A tool as Dailzero stores it — ours plus the id it assigns. */
export type DailzeroStoredTool = DailzeroTool & { id?: string };

/** An upstream Dailzero failure. Surfaces from our API as 502 with the
 *  upstream code (e.g. DAILZERO_INSUFFICIENT_CREDITS) instead of a bare 500. */
export class DailzeroError extends AppError {
  constructor(
    /** Dailzero's HTTP status. */
    public readonly status: number,
    /** Dailzero's error code, e.g. RATE_LIMITED, INSUFFICIENT_CREDITS. */
    public readonly upstreamCode: string,
    message: string,
  ) {
    super(`DAILZERO_${upstreamCode}`, `Dailzero: ${message}`, 502);
    this.name = "DailzeroError";
  }
}

async function call<T>(apiKey: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DAILZERO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON error page; surfaced below via the status code.
  }
  if (!res.ok) {
    const err =
      body && typeof body === "object" && "error" in body
        ? (body as { error: { code?: string; message?: string } }).error
        : null;
    throw new DailzeroError(
      res.status,
      err?.code ?? "HTTP_" + res.status,
      err?.message ?? (text.slice(0, 200) || res.statusText),
    );
  }
  return body as T;
}

export function createDailzeroClient(apiKey: string) {
  return {
    listAgents: () =>
      call<{ agents: DailzeroAgent[] }>(apiKey, "/agents").then((r) => r.agents),

    getTools: (agentId: string) =>
      call<{ tools: DailzeroStoredTool[] }>(apiKey, `/agents/${agentId}/tools`).then(
        (r) => r.tools,
      ),

    /**
     * One agent turn (runs its webhook tools). `messages` is the conversation
     * so far, oldest first, ending with the user's message — Dailzero caps it
     * at 50 messages / 32k chars. Billed per call; `idempotencyKey` makes a
     * retry replay the first answer instead of running (and charging) again.
     */
    chat: (input: {
      agentId: string;
      messages: { role: "user" | "assistant"; content: string }[];
      conversationId?: string;
      idempotencyKey?: string;
    }) =>
      call<{
        message: { role: "assistant"; content: string };
        usage?: { input_tokens: number; output_tokens: number; credits?: number };
        remaining_credits?: number;
      }>(apiKey, "/chat/completions", {
        method: "POST",
        headers: input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {},
        body: JSON.stringify({
          agentId: input.agentId,
          messages: input.messages,
          ...(input.conversationId && { metadata: { conversation_id: input.conversationId } }),
        }),
      }),

    /** Replaces the agent's ENTIRE tool list. The response shape isn't
     *  documented, so callers should read the list back with getTools. */
    putTools: (agentId: string, tools: DailzeroTool[]) =>
      call<unknown>(apiKey, `/agents/${agentId}/tools`, {
        method: "PUT",
        body: JSON.stringify({ tools }),
      }),
  };
}
