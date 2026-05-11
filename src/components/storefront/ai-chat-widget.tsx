"use client";

import * as React from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Message = { from: "ai" | "user" | "staff"; text: string };

const SEED_MESSAGES: Message[] = [
  {
    from: "ai",
    text: "Hi! I'm Ada, Avmall's shopping assistant. Ask me about products, prices, or delivery.",
  },
  { from: "user", text: "Do you have the Aramide rose mask in 100ml?" },
  {
    from: "ai",
    text: "Yes — Aramide Rose & Clay Mask 100ml is in stock at ₦24,000. We have 12 units left. Want me to add it to your cart?",
  },
];

const SUGGESTIONS = ["Add it to my cart", "What about 200ml?", "Talk to a human"];

export function AiChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>(SEED_MESSAGES);
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function send(text: string = draft) {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [...m, { from: "user", text: t }]);
    setDraft("");
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        { from: "ai", text: "Got it — let me check that for you…" },
      ]);
    }, 600);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI chat"
        className="fixed bottom-5 right-5 z-30 flex items-center justify-center size-13 rounded-full bg-brand-primary text-brand-primary-fg shadow-lg hover:bg-brand-primary-hover transition-colors"
        style={{ width: 52, height: 52 }}
      >
        <MessageCircle className="size-5" />
        <span
          className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-brand-accent border-2 border-surface"
          aria-hidden
        />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col w-[calc(100vw-2.5rem)] sm:w-96 h-[min(36rem,calc(100vh-2.5rem))] rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="size-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white font-bold text-xs">
          Ada
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Ada · Avmall assistant</div>
          <div className="text-[11px] text-brand-accent flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-brand-accent" />
            <Sparkles className="size-3" /> AI · usually replies instantly
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="flex items-center justify-center size-8 rounded-md hover:bg-surface-2 text-fg-muted"
        >
          <X className="size-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[80%] px-3.5 py-2.5 text-sm leading-snug rounded-2xl",
              m.from === "user"
                ? "self-end bg-brand-primary text-brand-primary-fg rounded-br-sm"
                : "self-start bg-surface-2 text-fg rounded-bl-sm",
            )}
          >
            {m.text}
          </div>
        ))}
        <div className="flex gap-1.5 flex-wrap pt-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full bg-info-bg text-brand-primary px-3 py-1 text-xs font-medium border border-brand-primary/20 hover:bg-info-bg/80"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-border">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything…"
          className="flex-1"
        />
        <Button onClick={() => send()} size="icon" aria-label="Send">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
