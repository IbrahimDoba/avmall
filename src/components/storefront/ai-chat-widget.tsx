"use client";

/**
 * Website chat with the Avmall assistant.
 *
 * Talks to POST /api/v1/chat, which runs the Dailzero widget agent (and its
 * tools) server-side. Replies are markdown; every product the assistant links
 * comes back as a card re-read from our database, so price, stock and "Add to
 * cart" are live even if the assistant's wording is off.
 *
 * The conversation is kept in localStorage so it survives page navigation —
 * a per-visitor convenience only; losing it just starts a fresh chat.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, MessageCircle, RotateCcw, Send, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductVisual } from "@/components/ui/product-visual";
import { toast } from "@/components/ui/toaster";
import { useCart } from "@/stores/cart-store";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CHAT_LIMITS, type ChatProductCard, type ChatReply } from "@/lib/ai/chat-types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Customer turns: the idempotency key, reused on retry. */
  turnId?: string;
  /** Customer turns that didn't get an answer: why. */
  failed?: string;
  products?: ChatProductCard[];
}

interface Stored {
  conversationId: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = "avmall-chat-v1";
const MAX_STORED = 40;
const SITE_HOSTS = new Set(["www.avmall.com.ng", "avmall.com.ng"]);

const STARTERS = [
  "Do you have power banks?",
  "How much is delivery to Abuja?",
  "Where is my order?",
];

const GREETING =
  "Hi! I'm the Avmall assistant. Ask me about products, prices, delivery or your order.";

/** crypto.randomUUID is missing on some older Android browsers. */
function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    return s && typeof s.conversationId === "string" && Array.isArray(s.messages) ? s : null;
  } catch {
    return null;
  }
}

function save(s: Stored) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...s, messages: s.messages.slice(-MAX_STORED) }),
    );
  } catch {
    // Private mode / storage full: the chat still works, it just won't persist.
  }
}

// ── Markdown (the small subset the assistant uses) ───────────────────────────

const INLINE =
  /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|(https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/g;

/** Where a link should go: a site path (in-app), an external https URL, or nowhere. */
function resolveHref(url: string): { internal: string } | { external: string } | null {
  if (url.startsWith("/")) return { internal: url };
  try {
    const u = new URL(url);
    if (SITE_HOSTS.has(u.hostname)) return { internal: `${u.pathname}${u.search}` };
    if (u.protocol === "https:") return { external: u.toString() };
  } catch {
    // Not a URL.
  }
  return null;
}

function Inline({ text, cardSlugs }: { text: string; cardSlugs: Set<string> }) {
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    const i = m.index ?? 0;
    if (i > at) out.push(text.slice(at, i));
    const [whole, label, url, bold, bare] = m;
    if (bold) {
      out.push(<strong key={i}>{bold}</strong>);
    } else {
      const href = resolveHref((url ?? bare)!);
      const shown = label ?? bare!;
      // A product we couldn't load (draft, removed) would 404: show its name only.
      const deadProduct =
        href && "internal" in href && href.internal.startsWith("/product/") &&
        !cardSlugs.has(href.internal.slice("/product/".length).split(/[?#/]/)[0]!.toLowerCase());
      if (!href || deadProduct) out.push(label ?? whole);
      else if ("internal" in href)
        out.push(
          <Link key={i} href={href.internal} className="font-semibold text-brand-primary underline underline-offset-2 break-words">
            {shown}
          </Link>,
        );
      else
        out.push(
          <a key={i} href={href.external} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-primary underline underline-offset-2 break-all">
            {shown}
          </a>,
        );
    }
    at = i + whole.length;
  }
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

function Markdown({ text, cardSlugs }: { text: string; cardSlugs: Set<string> }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`l${blocks.length}`} className="list-disc pl-4 flex flex-col gap-1">
        {list.map((item, i) => (
          <li key={i}>
            <Inline text={item} cardSlugs={cardSlugs} />
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      list.push(item[1]!);
      continue;
    }
    flush();
    if (line) {
      blocks.push(
        <p key={`p${blocks.length}`}>
          <Inline text={line} cardSlugs={cardSlugs} />
        </p>,
      );
    }
  }
  flush();
  return <div className="flex flex-col gap-2">{blocks}</div>;
}

// ── Product card ─────────────────────────────────────────────────────────────

function ProductCardRow({ card, onNavigate }: { card: ChatProductCard; onNavigate: () => void }) {
  const addLines = useCart((s) => s.addLines);
  const router = useRouter();
  const [added, setAdded] = React.useState(false);

  function add() {
    if (!card.line) return;
    addLines([card.line]);
    setAdded(true);
    toast.success(`${card.name} added to your cart`, {
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
  }

  return (
    <div className="flex gap-3 rounded-lg border border-border bg-surface p-2">
      <Link href={`/product/${card.slug}`} onClick={onNavigate} className="w-16 flex-shrink-0">
        <ProductVisual product={card} aspect="square" sizes="64px" className="rounded-md" />
      </Link>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <Link
          href={`/product/${card.slug}`}
          onClick={onNavigate}
          className="text-[13px] font-semibold leading-snug line-clamp-2 break-words hover:underline"
        >
          {card.name}
        </Link>
        <div className="flex items-baseline gap-1.5 tabular-nums">
          <span className="text-sm font-bold">{formatMoney(card.priceKobo)}</span>
          {card.wasKobo != null && (
            <span className="text-xs text-fg-muted line-through">{formatMoney(card.wasKobo)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[11px] font-semibold",
              card.inStock ? "text-success" : card.preorder ? "text-warning" : "text-danger",
            )}
          >
            {card.inStock ? "In stock" : card.preorder ? "Pre-order" : "Out of stock"}
          </span>
          {card.line ? (
            <button
              type="button"
              onClick={add}
              disabled={added}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 min-h-[32px] text-xs font-semibold transition-colors",
                added
                  ? "bg-success-bg text-success"
                  : "bg-brand-primary text-brand-primary-fg hover:bg-brand-primary-hover",
              )}
            >
              {added ? <Check className="size-3.5" /> : <ShoppingBag className="size-3.5" />}
              {added ? "Added" : "Add to cart"}
            </button>
          ) : card.hasOptions && (card.inStock || card.preorder) ? (
            <Link
              href={`/product/${card.slug}`}
              onClick={onNavigate}
              className="text-xs font-semibold text-brand-primary underline underline-offset-2"
            >
              Choose options
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Widget ───────────────────────────────────────────────────────────────────

export function AiChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<Stored | null>(null);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load after mount: localStorage doesn't exist during SSR.
  React.useEffect(() => {
    setState(load() ?? { conversationId: uuid(), messages: [] });
  }, []);

  React.useEffect(() => {
    if (state) save(state);
  }, [state]);

  React.useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [state?.messages.length, busy, open]);

  React.useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // On phones the panel covers the page, so following a link should reveal it.
  const closeOnMobile = React.useCallback(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  }, []);

  async function ask(history: ChatMessage[], turn: ChatMessage) {
    if (!state) return;
    setBusy(true);
    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: state.conversationId,
          turnId: turn.turnId,
          messages: history
            .filter((m) => !m.failed || m.id === turn.id)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { data: ChatReply }
        | { error: { message: string } }
        | null;
      if (!res.ok || !json || "error" in json) {
        throw new Error(
          json && "error" in json ? json.error.message : "Couldn't reach the assistant. Check your connection.",
        );
      }
      const answer: ChatMessage = {
        id: uuid(),
        role: "assistant",
        content: json.data.reply,
        products: json.data.products,
      };
      setState((s) =>
        s && {
          ...s,
          messages: [
            ...s.messages.map((m) => {
              if (m.id !== turn.id) return m;
              const { failed: _cleared, ...rest } = m;
              return rest;
            }),
            answer,
          ],
        },
      );
    } catch (err) {
      const why = err instanceof Error ? err.message : "Something went wrong.";
      setState((s) =>
        s && { ...s, messages: s.messages.map((m) => (m.id === turn.id ? { ...m, failed: why } : m)) },
      );
    } finally {
      setBusy(false);
    }
  }

  function send(text: string = draft) {
    const content = text.trim().slice(0, CHAT_LIMITS.maxMessageChars);
    if (!content || busy || !state) return;
    setDraft("");
    const turn: ChatMessage = { id: uuid(), role: "user", content, turnId: uuid() };
    const history = [...state.messages.filter((m) => !m.failed), turn];
    setState({ ...state, messages: history });
    void ask(history, turn);
  }

  function retry(turn: ChatMessage) {
    if (busy || !state) return;
    // Same turnId: if the first attempt did reach the assistant, this replays
    // that answer instead of paying for a new one.
    const upTo = state.messages.slice(0, state.messages.findIndex((m) => m.id === turn.id) + 1);
    void ask(upTo, turn);
  }

  function reset() {
    setState({ conversationId: uuid(), messages: [] });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Chat with the Avmall assistant"
        className="fixed bottom-5 right-5 z-30 flex items-center justify-center size-[52px] rounded-full bg-brand-primary text-brand-primary-fg shadow-lg hover:bg-brand-primary-hover transition-colors"
      >
        <MessageCircle className="size-5" />
      </button>
    );
  }

  const messages = state?.messages ?? [];

  return (
    <div
      role="dialog"
      aria-label="Avmall assistant"
      className="fixed z-40 inset-0 h-[100dvh] sm:inset-auto sm:bottom-5 sm:right-5 sm:w-96 sm:h-[min(38rem,calc(100dvh-2.5rem))] flex flex-col bg-surface sm:rounded-xl sm:border sm:border-border shadow-lg overflow-hidden"
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="size-9 rounded-full bg-brand-primary text-brand-primary-fg flex items-center justify-center">
          <MessageCircle className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Avmall assistant</div>
          <div className="text-[11px] text-fg-muted">AI. Prices and stock are live from the store.</div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            aria-label="Start a new chat"
            title="New chat"
            className="flex items-center justify-center size-11 rounded-md hover:bg-surface-2 text-fg-muted"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="flex items-center justify-center size-11 rounded-md hover:bg-surface-2 text-fg-muted"
        >
          <X className="size-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" aria-live="polite">
        <div className="self-start max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl rounded-bl-sm bg-surface-2">
          {GREETING}
        </div>

        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="self-end max-w-[85%] flex flex-col items-end gap-1">
                <div className="px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl rounded-br-sm bg-brand-primary text-brand-primary-fg whitespace-pre-wrap break-words">
                  {m.content}
                </div>
                {m.failed && (
                  <div className="text-xs text-danger flex items-center gap-2">
                    <span>{m.failed}</span>
                    <button
                      onClick={() => retry(m)}
                      disabled={busy}
                      className="font-semibold underline underline-offset-2 min-h-[32px]"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            );
          }
          const slugs = new Set((m.products ?? []).map((p) => p.slug));
          return (
            <div key={m.id} className="self-start w-full flex flex-col gap-2">
              <div className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl rounded-bl-sm bg-surface-2 break-words">
                <Markdown text={m.content} cardSlugs={slugs} />
              </div>
              {m.products && m.products.length > 0 && (
                <div className="flex flex-col gap-2 max-w-[95%]">
                  {m.products.map((p) => (
                    <ProductCardRow key={p.productId} card={p} onNavigate={closeOnMobile} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {busy && (
          <div className="self-start flex items-center gap-2 px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-surface-2 text-sm text-fg-muted">
            <Loader2 className="size-4 animate-spin" /> Checking the store…
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full px-3 min-h-[36px] text-xs font-medium border bg-info-bg text-brand-primary border-brand-primary/20 hover:bg-info-bg/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 p-3 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about a product, delivery, an order…"
          maxLength={CHAT_LIMITS.maxMessageChars}
          aria-label="Message"
          className="flex-1"
          enterKeyHint="send"
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={busy || !draft.trim()} className="size-11">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

AiChatWidget.displayName = "AiChatWidget";
