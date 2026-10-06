/**
 * Compare and push the agent tool list (src/lib/ai/dailzero-tools.ts) to
 * Dailzero. Shared by `pnpm ai:sync-tools` and the admin "Sync AI tools"
 * button so both report and push exactly the same way.
 *
 * Plain module (no "server-only") so the tsx script can import it; it holds no
 * secrets — the API key and tool token are passed in.
 */

import type { DailzeroTool } from "@/lib/ai/dailzero-tools";
import type { DailzeroAgent, DailzeroStoredTool, createDailzeroClient } from "@/lib/dailzero";

type Client = ReturnType<typeof createDailzeroClient>;

export interface ToolChange {
  name: string;
  kind: "added" | "changed" | "removed";
  /** What differs, for "changed" — e.g. ["description", "parameters +lga"]. */
  fields: string[];
}

export interface AgentPlan {
  agent: Pick<DailzeroAgent, "id" | "businessName">;
  current: DailzeroStoredTool[];
  changes: ToolChange[];
  /** Tools on the agent that aren't in our list. Pushing would drop them. */
  removed: string[];
}

/** The Bearer token an agent's tools currently send, if they all agree. */
export function currentToolToken(tools: DailzeroStoredTool[]): string | null {
  const tokens = new Set(
    tools
      .map((t) => t.headers?.Authorization ?? t.headers?.authorization ?? "")
      .filter((h) => h.toLowerCase().startsWith("bearer "))
      .map((h) => h.slice(7).trim()),
  );
  return tokens.size === 1 ? [...tokens][0]! : null;
}

/** Field-level differences between a stored tool and the one we'd push. */
export function diffTool(cur: DailzeroStoredTool, next: DailzeroTool): string[] {
  const out: string[] = [];
  for (const k of ["url", "method", "displayName", "description"] as const) {
    if ((cur[k] ?? "") !== next[k]) out.push(k);
  }
  // Fixed key order: Dailzero stores each param with its own key order
  // ({name, type, required, description}), which isn't a difference.
  const canon = (ps: DailzeroTool["parameters"] = []) =>
    JSON.stringify(
      [...ps]
        .map((p) => [p.name, p.type, p.description, !!p.required, p.enum ?? null])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );
  if (canon(cur.parameters) !== canon(next.parameters)) {
    const curNames = new Set((cur.parameters ?? []).map((p) => p.name));
    const nextNames = new Set(next.parameters.map((p) => p.name));
    const added = [...nextNames].filter((n) => !curNames.has(n));
    const dropped = [...curNames].filter((n) => !nextNames.has(n));
    out.push(
      "parameters" +
        (added.length ? ` +${added.join(",+")}` : "") +
        (dropped.length ? ` -${dropped.join(",-")}` : ""),
    );
  }
  // Compared by value but never printed: the header carries the token.
  if (JSON.stringify(cur.headers ?? {}) !== JSON.stringify(next.headers ?? {})) out.push("headers");
  return out;
}

export function planAgentSync(
  agent: AgentPlan["agent"],
  current: DailzeroStoredTool[],
  desired: DailzeroTool[],
): AgentPlan {
  const byName = new Map(current.map((t) => [t.name, t]));
  const desiredNames = new Set(desired.map((t) => t.name));
  const changes: ToolChange[] = [];
  for (const t of desired) {
    const cur = byName.get(t.name);
    if (!cur) {
      changes.push({ name: t.name, kind: "added", fields: [] });
      continue;
    }
    const fields = diffTool(cur, t);
    if (fields.length) changes.push({ name: t.name, kind: "changed", fields });
  }
  const removed = current.filter((t) => !desiredNames.has(t.name)).map((t) => t.name);
  for (const name of removed) changes.push({ name, kind: "removed", fields: [] });
  return { agent, current, changes, removed };
}

/**
 * Replace the agent's tools, then read them back. Returns what didn't stick
 * (empty = verified).
 */
export async function pushAndVerify(
  client: Client,
  agentId: string,
  desired: DailzeroTool[],
): Promise<string[]> {
  await client.putTools(agentId, desired);
  const after = await client.getTools(agentId);
  const afterByName = new Map(after.map((t) => [t.name, t]));
  const drift = desired.flatMap((t) => {
    const got = afterByName.get(t.name);
    if (!got) return [`${t.name} missing`];
    const d = diffTool(got, t);
    return d.length ? [`${t.name}: ${d.join("; ")}`] : [];
  });
  if (after.length !== desired.length) drift.push(`stored ${after.length} tools, sent ${desired.length}`);
  return drift;
}
