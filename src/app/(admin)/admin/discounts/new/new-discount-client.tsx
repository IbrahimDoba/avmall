"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AdminTopBar } from "@/components/admin/topbar";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "@/components/ui/toaster";

type Kind = "coupon" | "automatic";
type ValueType = "percentage" | "fixed" | "free_shipping";

export function NewDiscountClient() {
  const router = useRouter();

  const [kind, setKind] = React.useState<Kind>("coupon");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [valueType, setValueType] = React.useState<ValueType>("percentage");
  const [percentValue, setPercentValue] = React.useState(10);
  const [fixedKobo, setFixedKobo] = React.useState<number | null>(null);
  const [scope, setScope] = React.useState("all");
  const [usageLimit, setUsageLimit] = React.useState<number | null>(null);
  const [validFrom, setValidFrom] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (kind === "coupon" && !code.trim()) {
      toast.error("Coupons must have a code.");
      return;
    }
    if (valueType === "fixed" && (fixedKobo == null || fixedKobo <= 0)) {
      toast.error("Fixed amount must be greater than zero.");
      return;
    }

    const value =
      valueType === "percentage"
        ? percentValue
        : valueType === "fixed"
          ? (fixedKobo ?? 0)
          : 0;

    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          ...(kind === "coupon" && { code: code.trim().toUpperCase() }),
          name: name.trim(),
          valueType,
          value,
          scope: scope.trim() || "all",
          usageLimit: usageLimit ?? null,
          validFrom: validFrom ? new Date(validFrom).toISOString() : null,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          active,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not create discount");
        return;
      }
      toast.success(`Discount "${name.trim()}" created`);
      router.push("/admin/discounts");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminTopBar
        breadcrumbs={[
          { label: "Discounts", href: "/admin/discounts" },
          { label: "New discount" },
        ]}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1000px] mx-auto pb-20">
          <PageHeader
            title="New discount"
            subtitle="Create a coupon customers can redeem or an automatic site-wide rule"
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/discounts")}
              >
                Cancel
              </Button>
            }
          />

          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            <div className="flex flex-col gap-4">
              <Card title="Type">
                <div className="grid grid-cols-2 gap-2">
                  <KindRadio
                    label="Coupon"
                    sub="Customer enters a code"
                    selected={kind === "coupon"}
                    onSelect={() => setKind("coupon")}
                  />
                  <KindRadio
                    label="Automatic"
                    sub="Applied without a code"
                    selected={kind === "automatic"}
                    onSelect={() => setKind("automatic")}
                  />
                </div>
              </Card>

              <Card title="Basics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field id="name" label="Name" required hint="Internal label">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Welcome 10% off"
                    />
                  </Field>
                  {kind === "coupon" && (
                    <Field id="code" label="Code" required hint="Uppercased automatically">
                      <Input
                        id="code"
                        value={code}
                        onChange={(e) =>
                          setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
                        }
                        placeholder="WELCOME10"
                        className="font-mono"
                      />
                    </Field>
                  )}
                  <Field id="scope" label="Scope" hint='"all", "category:beauty", "segment:wholesale"'>
                    <Input
                      id="scope"
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      placeholder="all"
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Value">
                <div className="flex gap-2 mb-3">
                  <ValueTypeRadio
                    label="Percentage"
                    selected={valueType === "percentage"}
                    onSelect={() => setValueType("percentage")}
                  />
                  <ValueTypeRadio
                    label="Fixed amount"
                    selected={valueType === "fixed"}
                    onSelect={() => setValueType("fixed")}
                  />
                  <ValueTypeRadio
                    label="Free shipping"
                    selected={valueType === "free_shipping"}
                    onSelect={() => setValueType("free_shipping")}
                  />
                </div>
                {valueType === "percentage" && (
                  <Field id="pct" label="Percentage off" required>
                    <NumberInput
                      value={percentValue}
                      onChange={(n) => setPercentValue(Math.max(0, Math.min(100, n)))}
                      min={0}
                      max={100}
                    />
                  </Field>
                )}
                {valueType === "fixed" && (
                  <Field id="amt" label="Amount" required>
                    <CurrencyInput
                      id="amt"
                      {...(fixedKobo != null ? { valueKobo: fixedKobo } : {})}
                      onValueChange={(v) => setFixedKobo(v)}
                    />
                  </Field>
                )}
                {valueType === "free_shipping" && (
                  <div className="text-xs text-fg-muted">
                    Shipping is set to zero for any cart this discount applies to.
                  </div>
                )}
              </Card>

              <Card title="Limits & validity">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field id="limit" label="Usage limit" hint="Optional. Unlimited if blank.">
                    <NumberInput
                      value={usageLimit ?? 0}
                      onChange={(n) => setUsageLimit(n > 0 ? n : null)}
                      min={0}
                    />
                  </Field>
                  <div />
                  <Field id="from" label="Valid from" hint="Optional">
                    <Input
                      id="from"
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                    />
                  </Field>
                  <Field id="until" label="Valid until" hint="Optional">
                    <Input
                      id="until"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card title="Status">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="size-4 mt-1 accent-brand-primary"
                  />
                  <div>
                    <div className="text-sm font-semibold">Active</div>
                    <div className="text-xs text-fg-muted">
                      Inactive discounts are rejected at checkout. You can flip
                      this later without losing the configuration.
                    </div>
                  </div>
                </label>
              </Card>

              <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                <Button width="full" disabled={saving} onClick={save}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? "Saving…" : "Create discount"}
                </Button>
                <p className="text-[11px] text-fg-muted mt-2 leading-relaxed">
                  Once a discount has been redeemed, its value, scope, and code
                  become locked — only validity and active flag stay editable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-sm font-bold">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KindRadio({
  label,
  sub,
  selected,
  onSelect,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? "text-left p-3 rounded-md border-2 border-brand-primary bg-info-bg"
          : "text-left p-3 rounded-md border border-border hover:bg-surface-2"
      }
    >
      <div className="text-sm font-bold">{label}</div>
      <div className="text-xs text-fg-muted">{sub}</div>
    </button>
  );
}

function ValueTypeRadio({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? "text-xs font-semibold px-3 py-1.5 rounded-md bg-brand-primary text-brand-primary-fg"
          : "text-xs font-semibold px-3 py-1.5 rounded-md bg-surface-2 hover:bg-bg"
      }
    >
      {label}
    </button>
  );
}
