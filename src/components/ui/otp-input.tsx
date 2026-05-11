"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

/** Auto-advancing 6-digit OTP input (for customer phone-OTP login). */
export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus,
  disabled,
  invalid,
  className,
}: OTPInputProps) {
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  function setCharAt(i: number, ch: string) {
    const next = chars.slice();
    next[i] = ch;
    const v = next.join("");
    onChange(v);
    if (v.replace(/\D/g, "").length === length && onComplete) {
      onComplete(v);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, i: number) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setCharAt(i, "");
      return;
    }
    // If user pasted multiple digits, distribute
    if (raw.length > 1) {
      const next = chars.slice();
      for (let k = 0; k < raw.length && i + k < length; k++) {
        next[i + k] = raw[k]!;
      }
      const v = next.join("");
      onChange(v);
      const targetIdx = Math.min(i + raw.length, length - 1);
      inputsRef.current[targetIdx]?.focus();
      if (v.replace(/\D/g, "").length === length && onComplete) onComplete(v);
      return;
    }
    setCharAt(i, raw[0]!);
    if (i < length - 1) inputsRef.current[i + 1]?.focus();
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      inputsRef.current[i + 1]?.focus();
    }
  }

  return (
    <div className={cn("flex gap-2", className)} aria-invalid={invalid || undefined}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={chars[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className={cn(
            "size-12 text-center text-2xl font-bold tabular rounded-md border bg-surface text-fg",
            "focus:outline-none focus:shadow-focus focus:border-brand-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            invalid ? "border-danger" : "border-border-strong",
          )}
        />
      ))}
    </div>
  );
}
