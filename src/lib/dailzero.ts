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

export const DAILZERO_API_BASE = "https://www.dailzero.com/api/v1";

export interface DailzeroAgent {
  id: string;
  businessName: string;
  status: string;
}

/** A tool as Dailzero stores it — ours plus the id it assigns. */
export type DailzeroStoredTool = DailzeroTool & { id?: string };

export class DailzeroError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
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

    /** Replaces the agent's ENTIRE tool list. The response shape isn't
     *  documented, so callers should read the list back with getTools. */
    putTools: (agentId: string, tools: DailzeroTool[]) =>
      call<unknown>(apiKey, `/agents/${agentId}/tools`, {
        method: "PUT",
        body: JSON.stringify({ tools }),
      }),
  };
}
