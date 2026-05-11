"use client";

import { Check, CheckCheck, Phone, Video, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppMessagePreviewProps {
  /** Phone number / contact name to show in the header. */
  contact: string;
  /** Template text with optional {{variable}} placeholders. */
  template: string;
  /** Variables to substitute (e.g. { name: "Tolu" }). */
  variables?: Record<string, string>;
  /** Optional time string. */
  time?: string;
  className?: string;
}

/**
 * Preview of an outbound WhatsApp message — used in the admin
 * notification/template editor to show what the customer will see.
 */
export function WhatsAppMessagePreview({
  contact,
  template,
  variables = {},
  time = "12:34",
  className,
}: WhatsAppMessagePreviewProps) {
  const rendered = renderTemplate(template, variables);

  return (
    <div
      className={cn(
        "max-w-sm rounded-2xl overflow-hidden border border-border bg-[#ECE5DD]",
        "shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center gap-3">
        <div className="size-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
          AV
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">Avmall</div>
          <div className="text-[11px] opacity-80 truncate">{contact}</div>
        </div>
        <Video className="size-5" aria-hidden />
        <Phone className="size-4" aria-hidden />
        <MoreVertical className="size-4" aria-hidden />
      </div>

      {/* Conversation */}
      <div className="p-3 min-h-32 flex flex-col gap-2">
        <div className="self-start max-w-[80%] bg-white rounded-lg px-3 py-2 shadow-sm relative">
          <div
            className="absolute top-0 -left-1.5 w-2 h-3 bg-white"
            style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
            aria-hidden
          />
          <div className="text-[13.5px] leading-snug text-fg whitespace-pre-wrap">
            {rendered}
          </div>
          <div className="text-[10px] text-fg-muted mt-1 text-right inline-flex items-center gap-0.5 justify-end w-full">
            <span>{time}</span>
            <CheckCheck className="size-3 text-[#34B7F1]" strokeWidth={2.4} />
          </div>
        </div>
      </div>

      {/* Footer (faux input) */}
      <div className="bg-[#F0F2F5] px-3 py-2 flex items-center gap-2">
        <div className="flex-1 h-7 rounded-full bg-white" />
        <Check className="size-5 text-[#075E54]" />
      </div>
    </div>
  );
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}
