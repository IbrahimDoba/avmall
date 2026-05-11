"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

/**
 * Phase-3 stub — a styled textarea with a visual toolbar. Real WYSIWYG
 * (Tiptap / Lexical) is deferred to a later phase since CLAUDE.md doesn't
 * specify which engine to use. The toolbar buttons are placeholders today
 * but the surface is in place so we can swap implementation without
 * touching consumers.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something…",
  rows = 8,
  className,
}: RichTextEditorProps) {
  const tools = [
    { Icon: Heading2, label: "Heading" },
    { Icon: Bold, label: "Bold" },
    { Icon: Italic, label: "Italic" },
    { Icon: Underline, label: "Underline" },
    { Icon: List, label: "Bulleted list" },
    { Icon: ListOrdered, label: "Numbered list" },
    { Icon: LinkIcon, label: "Link" },
  ];

  return (
    <div
      className={cn(
        "rounded-md border border-border-strong bg-surface focus-within:border-brand-primary focus-within:shadow-focus",
        className,
      )}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border">
        {tools.map(({ Icon, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            className="size-8 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-transparent px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-fg-subtle outline-none resize-y"
      />
    </div>
  );
}
