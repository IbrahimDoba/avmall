"use client";

/**
 * Settings card: keep the Dailzero agents' tools in step with the code
 * (src/lib/ai/dailzero-tools.ts). "Check" is a dry run; "Sync now" pushes and
 * verifies. Talks to POST /api/v1/admin/ai/sync-tools.
 */

import * as React from "react";
import { Bot, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface ToolChange {
  name: string;
  kind: "added" | "changed" | "removed";
  fields: string[];
}

interface AgentResult {
  agentId: string;
  name: string;
  status: "up_to_date" | "pending" | "pushed" | "blocked" | "drift";
  changes: ToolChange[];
  removed: string[];
  drift: string[];
}

const STATUS: Record<AgentResult["status"], { label: string; className: string }> = {
  up_to_date: { label: "Up to date", className: "bg-success-bg text-success" },
  pending: { label: "Changes to sync", className: "bg-warning-bg text-warning" },
  pushed: { label: "Synced", className: "bg-success-bg text-success" },
  blocked: { label: "Not synced", className: "bg-danger-bg text-danger" },
  drift: { label: "Synced with differences", className: "bg-warning-bg text-warning" },
};

export function AiToolsSync() {
  const [busy, setBusy] = React.useState<"check" | "sync" | null>(null);
  const [agents, setAgents] = React.useState<AgentResult[] | null>(null);

  async function run(apply: boolean) {
    setBusy(apply ? "sync" : "check");
    try {
      const res = await fetch("/api/v1/admin/ai/sync-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply }),
      });
      const json = (await res.json()) as
        | { data: { agents: AgentResult[] } }
        | { error: { message: string } };
      if (!res.ok || "error" in json) {
        throw new Error("error" in json ? json.error.message : `HTTP ${res.status}`);
      }
      setAgents(json.data.agents);
      if (apply) {
        const ok = json.data.agents.every((a) => a.status === "pushed" || a.status === "up_to_date");
        if (ok) toast.success("AI tools synced");
        else toast.warning("Some agents weren't fully synced — see below");
      }
    } catch (err) {
      toast.error(apply ? "Sync failed" : "Couldn't check the AI tools", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  }

  const pending = agents?.some((a) => a.status === "pending") ?? false;

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="px-4 py-3 border-b border-border flex items-start gap-3">
        <div className="size-9 rounded-md bg-info-bg text-brand-primary flex items-center justify-center flex-shrink-0">
          <Bot className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold">AI assistant tools</div>
          <div className="text-xs text-fg-muted mt-0.5">
            How the WhatsApp and website assistants look up products, prices, delivery and orders.
            Check after an update; sync if anything changed.
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => run(false)} disabled={busy !== null}>
            {busy === "check" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Check
          </Button>
          <Button onClick={() => run(true)} disabled={busy !== null || !pending}>
            {busy === "sync" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </Button>
        </div>

        {agents && (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {agents.map((a) => (
              <li key={a.agentId} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{a.name}</span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap",
                      STATUS[a.status].className,
                    )}
                  >
                    {STATUS[a.status].label}
                  </span>
                </div>
                {a.status === "pending" && a.changes.length > 0 && (
                  <ul className="mt-2 text-xs text-fg-muted flex flex-col gap-0.5">
                    {a.changes.map((c) => (
                      <li key={c.name} className="break-words">
                        <span className="font-mono text-fg">{c.name}</span>{" "}
                        {c.kind === "added" ? "new" : c.kind === "removed" ? "will be removed" : c.fields.join(", ")}
                      </li>
                    ))}
                  </ul>
                )}
                {a.status === "blocked" && (
                  <p className="mt-2 text-xs text-danger">
                    This agent has tools that aren&apos;t ours ({a.removed.join(", ")}). Syncing would delete
                    them, so it was skipped. Ask a developer.
                  </p>
                )}
                {a.status === "drift" && (
                  <p className="mt-2 text-xs text-warning break-words">Dailzero stored: {a.drift.join("; ")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

AiToolsSync.displayName = "AiToolsSync";
