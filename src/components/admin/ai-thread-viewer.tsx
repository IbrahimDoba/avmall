"use client";

import * as React from "react";
import { Sparkles, MessageCircle, UserCircle, Send, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface AiMessage {
  id: string;
  role: "user" | "ai" | "staff";
  text: string;
  /** ISO-ish timestamp or display string. */
  time: string;
  /** Tool calls embedded by the LLM. */
  tools?: { name: string; result?: string }[];
}

interface AiThreadViewerProps {
  customer: { name: string; phone: string; channel: "WhatsApp" | "Web" };
  messages: AiMessage[];
  /** When true, a human staff member has claimed the handoff. */
  staffClaimed?: boolean;
  onClaim?: () => void;
  onSendStaff?: (text: string) => void;
  className?: string;
}

export function AiThreadViewer({
  customer,
  messages,
  staffClaimed,
  onClaim,
  onSendStaff,
  className,
}: AiThreadViewerProps) {
  const [draft, setDraft] = React.useState("");

  return (
    <div className={cn("flex flex-col h-full rounded-lg border border-border bg-surface overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Avatar size="sm">
          <AvatarFallback>
            {customer.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{customer.name}</div>
          <div className="text-[11px] text-fg-muted font-mono tabular">{customer.phone}</div>
        </div>
        <Badge tone={customer.channel === "WhatsApp" ? "success" : "info"}>
          <MessageCircle className="size-2.5" />
          {customer.channel}
        </Badge>
        {!staffClaimed && onClaim && (
          <Button size="sm" onClick={onClaim}>
            Claim handoff <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex items-start gap-2.5",
              m.role === "user" && "flex-row-reverse",
            )}
          >
            <div
              className={cn(
                "size-7 rounded-full flex items-center justify-center flex-shrink-0",
                m.role === "ai"
                  ? "bg-gradient-to-br from-brand-primary to-[hsl(262_60%_48%)] text-white"
                  : m.role === "staff"
                    ? "bg-brand-accent text-white"
                    : "bg-surface-2 text-fg-muted",
              )}
            >
              {m.role === "ai" ? (
                <Sparkles className="size-3.5" />
              ) : m.role === "staff" ? (
                <UserCircle className="size-3.5" />
              ) : (
                customer.name[0]
              )}
            </div>
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2.5 text-sm",
                m.role === "user"
                  ? "bg-brand-primary text-brand-primary-fg rounded-tr-sm"
                  : m.role === "staff"
                    ? "bg-brand-accent-hover/15 text-fg rounded-tl-sm border border-brand-accent/20"
                    : "bg-surface-2 text-fg rounded-tl-sm",
              )}
            >
              <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
              {m.tools && m.tools.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.tools.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono"
                    >
                      <Sparkles className="size-2.5" /> {t.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-[10px] opacity-70 mt-1.5">{m.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Composer (only when claimed) */}
      {staffClaimed && onSendStaff && (
        <div className="p-3 border-t border-border flex items-center gap-2 flex-shrink-0">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                onSendStaff(draft.trim());
                setDraft("");
              }
            }}
            placeholder="Type as Avmall staff…"
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={() => {
              if (draft.trim()) {
                onSendStaff(draft.trim());
                setDraft("");
              }
            }}
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
