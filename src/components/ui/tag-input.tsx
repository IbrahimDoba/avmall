"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  /** Set true to lowercase tags on add. */
  lowercase?: boolean;
  /** Max number of tags. */
  max?: number;
}

/**
 * Comma/Enter-separated tag input.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter…",
  suggestions = [],
  className,
  lowercase = false,
  max,
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  function commit(raw: string) {
    let t = raw.trim();
    if (!t) return;
    if (lowercase) t = t.toLowerCase();
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    if (max != null && value.length >= max) return;
    onChange([...value, t]);
    setDraft("");
  }

  function remove(t: string) {
    onChange(value.filter((v) => v !== t));
  }

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => s.toLowerCase().includes(draft.toLowerCase()))
    .slice(0, 5);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-10 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 focus-within:border-brand-primary focus-within:shadow-focus",
        )}
      >
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-2 rounded text-xs font-semibold"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              aria-label={`Remove ${t}`}
              className="hover:text-danger"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={value.length === 0 ? placeholder : ""}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          className="flex-1 min-w-32 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
        />
      </div>
      {draft && filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="px-2 py-0.5 rounded bg-info-bg text-brand-primary text-xs font-semibold hover:bg-brand-primary hover:text-brand-primary-fg"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
