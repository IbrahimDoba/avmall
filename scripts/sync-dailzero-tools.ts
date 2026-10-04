/**
 * Push the agent tool list in src/lib/ai/dailzero-tools.ts to Dailzero.
 *
 *   pnpm ai:sync-tools                 dry run: show what would change, touch nothing
 *   pnpm ai:sync-tools --apply         replace the tools on every agent
 *   pnpm ai:sync-tools --apply --agent <id>   one agent only (repeatable)
 *
 * Needs DAILZERO_API_KEY (scope "manage") in .env.local.
 *
 * Which token the tools send: our AI_AGENT_TOKEN as PRODUCTION has it, which is
 * not necessarily what .env.local has. So the script reuses the Bearer token the
 * agent's tools already carry, or DAILZERO_TOOL_TOKEN if you set it (to rotate).
 * Either way it calls the live site with that token first and refuses to push
 * one prod rejects — a wrong token would break every order/payment tool at once.
 *
 * Every run saves each agent's current tools to tmp/dailzero/ (gitignored) before
 * changing anything; those files hold the token, so keep them local.
 *
 * Removing a tool that isn't in our list needs --allow-remove, so a tool someone
 * added in the dashboard is never dropped silently.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildAvmallTools, DAILZERO_MAX_TOOLS, type DailzeroTool } from "@/lib/ai/dailzero-tools";
import { createDailzeroClient, type DailzeroStoredTool } from "@/lib/dailzero";
import { SITE } from "@/lib/site";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const allowRemove = args.includes("--allow-remove");
const onlyAgents = args.flatMap((a, i) => (a === "--agent" && args[i + 1] ? [args[i + 1]!] : []));
const baseArg = args.includes("--base") ? args[args.indexOf("--base") + 1] : undefined;
const baseUrl = (baseArg ?? SITE.url).replace(/\/+$/, "");

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

/** The Bearer token an agent's tools currently send, if they all agree. */
function currentToken(tools: DailzeroStoredTool[]): string | null {
  const tokens = new Set(
    tools
      .map((t) => t.headers?.Authorization ?? t.headers?.authorization ?? "")
      .filter((h) => h.toLowerCase().startsWith("bearer "))
      .map((h) => h.slice(7).trim()),
  );
  return tokens.size === 1 ? [...tokens][0]! : null;
}

/** Prod must accept the token: 404 on a made-up reference = authorised. */
async function checkTokenOnProd(token: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/v1/ai/tools/payments/sync-check-${Date.now()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 503) {
    fail(
      `${baseUrl} rejected the tool token (HTTP ${res.status}). Not pushing — every order and payment tool would break. Set DAILZERO_TOOL_TOKEN to the AI_AGENT_TOKEN value from Vercel.`,
    );
  }
  if (res.status !== 404) fail(`Unexpected HTTP ${res.status} while checking the token on ${baseUrl}.`);
}

/**
 * The tool list sends Naira (`offer`, `amount`, `subtotal`), which only the
 * endpoints from the same change understand. Pushing it at an older deploy
 * would break negotiate/payments, so probe first: a new endpoint answers a
 * made-up product with 404, an old one with 400 "offerKobo: Required".
 */
async function siteHasNairaInputs(): Promise<boolean> {
  const res = await fetch(`${baseUrl}/api/v1/ai/tools/negotiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productSlug: `sync-check-${Date.now()}`, offer: 1000 }),
  });
  return res.status === 404;
}

/** Field-level differences between what's stored and what we'd push. */
function diffTool(cur: DailzeroStoredTool, next: DailzeroTool): string[] {
  const out: string[] = [];
  for (const k of ["url", "method", "displayName", "description"] as const) {
    if ((cur[k] ?? "") !== next[k]) out.push(k);
  }
  const params = (ps: DailzeroTool["parameters"] = []) =>
    JSON.stringify(
      [...ps]
        .map((p) => ({ ...p, required: !!p.required }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  if (params(cur.parameters) !== params(next.parameters)) {
    const curNames = new Set((cur.parameters ?? []).map((p) => p.name));
    const nextNames = new Set(next.parameters.map((p) => p.name));
    const added = [...nextNames].filter((n) => !curNames.has(n));
    const removed = [...curNames].filter((n) => !nextNames.has(n));
    out.push(
      "parameters" +
        (added.length ? ` +${added.join(",+")}` : "") +
        (removed.length ? ` -${removed.join(",-")}` : ""),
    );
  }
  if (JSON.stringify(cur.headers ?? {}) !== JSON.stringify(next.headers ?? {})) out.push("headers");
  return out;
}

async function main() {
  const apiKey = process.env.DAILZERO_API_KEY?.trim();
  if (!apiKey) fail("DAILZERO_API_KEY is not set (.env.local).");

  const dz = createDailzeroClient(apiKey);
  const agents = await dz.listAgents();
  const targets = onlyAgents.length ? agents.filter((a) => onlyAgents.includes(a.id)) : agents;
  const missing = onlyAgents.filter((id) => !agents.some((a) => a.id === id));
  if (missing.length) fail(`Not found on this key: ${missing.join(", ")}`);
  if (!targets.length) fail("This key has no agents.");

  console.log(`Site: ${baseUrl}`);
  console.log(`Mode: ${apply ? "APPLY" : "dry run (add --apply to push)"}`);

  if (!(await siteHasNairaInputs())) {
    const msg = `${baseUrl} is still running the older tool endpoints (they want kobo, these tools send Naira). Deploy this change first, then sync.`;
    if (apply) fail(msg);
    console.log(`⚠ ${msg}`);
  }
  console.log("");

  const backupDir = join(process.cwd(), "tmp", "dailzero");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const checkedTokens = new Set<string>();
  let blocked = false;

  for (const agent of targets) {
    console.log(`── ${agent.businessName} (${agent.id})`);
    const current = await dz.getTools(agent.id);
    const backup = join(backupDir, `${agent.id}-${stamp}.json`);
    writeFileSync(backup, JSON.stringify({ tools: current }, null, 2));
    console.log(`   backup: ${backup}`);

    const token = process.env.DAILZERO_TOOL_TOKEN?.trim() || currentToken(current);
    if (!token) {
      fail(
        `${agent.businessName}: can't tell which token its tools use (none, or several). Set DAILZERO_TOOL_TOKEN to the AI_AGENT_TOKEN value from Vercel.`,
      );
    }
    if (!checkedTokens.has(token)) {
      await checkTokenOnProd(token);
      checkedTokens.add(token);
    }
    console.log("   token: accepted by the live site");

    const desired = buildAvmallTools(baseUrl, token);
    if (desired.length > DAILZERO_MAX_TOOLS) fail(`${desired.length} tools; Dailzero allows ${DAILZERO_MAX_TOOLS}.`);

    const byName = new Map(current.map((t) => [t.name, t]));
    const desiredNames = new Set(desired.map((t) => t.name));
    const removed = current.filter((t) => !desiredNames.has(t.name));

    let changes = 0;
    for (const t of desired) {
      const cur = byName.get(t.name);
      if (!cur) {
        console.log(`   + ${t.name}  (new)`);
        changes++;
        continue;
      }
      const d = diffTool(cur, t);
      if (d.length) {
        console.log(`   ~ ${t.name}: ${d.join("; ")}`);
        changes++;
      }
    }
    for (const t of removed) {
      console.log(`   - ${t.name}  (not in our list — ${allowRemove ? "will be removed" : "blocks --apply unless --allow-remove"})`);
      changes++;
    }
    if (!changes) {
      console.log("   ✓ already up to date\n");
      continue;
    }

    if (!apply) {
      console.log("");
      continue;
    }
    if (removed.length && !allowRemove) {
      console.log(
        `   ✖ skipped: would remove ${removed.map((t) => t.name).join(", ")}. Add it to dailzero-tools.ts, or re-run with --allow-remove.\n`,
      );
      blocked = true;
      continue;
    }

    await dz.putTools(agent.id, desired);

    // Read back and confirm Dailzero kept what we sent.
    const after = await dz.getTools(agent.id);
    const afterByName = new Map(after.map((t) => [t.name, t]));
    const drift = desired.flatMap((t) => {
      const got = afterByName.get(t.name);
      if (!got) return [`${t.name} missing`];
      const d = diffTool(got, t);
      return d.length ? [`${t.name}: ${d.join("; ")}`] : [];
    });
    if (after.length !== desired.length) drift.push(`stored ${after.length} tools, sent ${desired.length}`);
    if (drift.length) {
      console.log(`   ⚠ pushed, but read-back differs:\n     ${drift.join("\n     ")}\n`);
      blocked = true;
    } else {
      console.log(`   ✓ pushed ${desired.length} tools and verified\n`);
    }
  }

  if (blocked) process.exit(1);
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
