"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Field } from "@/components/ui/field";

export function TrackOrderForm() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Validation is intentionally lenient — the server is the source of truth.
    // We just need *something* in both fields before we navigate.
    const trimmed = orderNumber.trim();
    if (!trimmed) {
      setError("Order number is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    const normalized = trimmed.toUpperCase().startsWith("AVM-")
      ? trimmed.toUpperCase()
      : `AVM-${trimmed.toUpperCase()}`;
    router.push(`/orders/${encodeURIComponent(normalized)}`);
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
      <Button type="submit" width="full" size="lg">
        Find my order <ChevronRight className="size-4" />
      </Button>
    </form>
  );
}
