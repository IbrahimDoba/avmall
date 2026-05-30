"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Field } from "@/components/ui/field";

export function TrackOrderForm() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = orderNumber.trim();
    if (!trimmed || !phone.trim()) {
      setError("Order number and phone number are required.");
      return;
    }
    const normalized = trimmed.toUpperCase().startsWith("AVM-")
      ? trimmed.toUpperCase()
      : `AVM-${trimmed.toUpperCase()}`;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: normalized, phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Couldn't find that order.");
        return;
      }
      router.push(json.data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="order-number" label="Order number">
        <Input
          id="order-number"
          placeholder="AVM-2026-00001234"
          autoComplete="off"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
      </Field>
      <Field id="phone" label="Phone number">
        <PhoneInput
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" width="full" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Looking up…
          </>
        ) : (
          <>
            Find my order <ChevronRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
