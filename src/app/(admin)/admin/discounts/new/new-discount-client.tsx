"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { AdminTopBar } from "@/components/admin/topbar";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "@/components/ui/toaster";
import Image from "next/image";

type Kind = "coupon" | "automatic";
type ValueType = "percentage" | "fixed" | "free_shipping";
type ScopeType = "all" | "category" | "products";

interface ProductHit {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string;
  priceKobo: number;
}

export function NewDiscountClient() {
  const router = useRouter();

  const [kind, setKind] = React.useState<Kind>("coupon");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [valueType, setValueType] = React.useState<ValueType>("percentage");
  const [percentValue, setPercentValue] = React.useState(10);
  const [fixedKobo, setFixedKobo] = React.useState<number | null>(null);
  const [scopeType, setScopeType] = React.useState<ScopeType>("all");
  const [categorySlug, setCategorySlug] = React.useState("");
  const [selectedProducts, setSelectedProducts] = React.useState<ProductHit[]>([]);
  const [productQuery, setProductQuery] = React.useState("");
  const [productResults, setProductResults] = React.useState<ProductHit[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [usageLimit, setUsageLimit] = React.useState<number | null>(null);
  const [validFrom, setValidFrom] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Debounced product search
  React.useEffect(() => {
    if (scopeType !== "products" || productQuery.trim().length < 2) {
      setProductResults([]);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/admin/products/search?q=${encodeURIComponent(productQuery)}&limit=8`,
        );
        const json = await res.json();
        if (res.ok) {
          setProductResults((json.data?.products ?? []) as ProductHit[]);
        }
      } catch {
        // swallow — search is best-effort
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productQuery, scopeType]);

  function toggleProduct(p: ProductHit) {
    setSelectedProducts((prev) =>
      prev.some((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : [...prev, p],
    );
  }

  function buildScope(): string {
    if (scopeType === "category") return `category:${categorySlug.trim() || "all"}`;
    if (scopeType === "products" && selectedProducts.length > 0) {
      return `product:${selectedProducts.map((p) => p.id).join(",")}`;
    }
    return "all";
  }

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
    if (scopeType === "products" && selectedProducts.length === 0) {
      toast.error("Select at least one product or change scope to All Products.");
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
          scope: buildScope(),
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

              {/* Scope — what products this discount applies to */}
              <Card title="Applies to">
                <div className="flex gap-2 mb-4">
                  <ScopeRadio
                    label="All products"
                    selected={scopeType === "all"}
                    onSelect={() => setScopeType("all")}
                  />
                  <ScopeRadio
                    label="A category"
                    selected={scopeType === "category"}
                    onSelect={() => setScopeType("category")}
                  />
                  <ScopeRadio
                    label="Specific products"
                    selected={scopeType === "products"}
                    onSelect={() => setScopeType("products")}
                  />
                </div>

                {scopeType === "category" && (
                  <Field id="cat" label="Category slug" hint='e.g. "beauty", "home"'>
                    <Input
                      id="cat"
                      value={categorySlug}
                      onChange={(e) => setCategorySlug(e.target.value.toLowerCase())}
                      placeholder="beauty"
                    />
                  </Field>
                )}

                {scopeType === "products" && (
                  <div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fg-muted pointer-events-none" />
                      <Input
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                        placeholder="Search products by name or brand…"
                        className="pl-9"
                      />
                      {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-fg-muted" />
                      )}
                    </div>

                    {productResults.length > 0 && (
                      <div className="border border-border rounded-md overflow-hidden mb-3 divide-y divide-border">
                        {productResults.map((p) => {
                          const already = selectedProducts.some((x) => x.id === p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProduct(p)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-2 transition-colors"
                            >
                              <div className="size-10 rounded overflow-hidden flex-shrink-0 bg-surface-2">
                                <Image
                                  src={p.imageUrl}
                                  alt={p.name}
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{p.name}</div>
                                <div className="text-xs text-fg-muted">{p.brand}</div>
                              </div>
                              <span
                                className={
                                  already
                                    ? "text-xs font-bold text-brand-accent"
                                    : "text-xs font-semibold text-brand-primary"
                                }
                              >
                                {already ? "Added" : "Add"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedProducts.length > 0 && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                          Selected ({selectedProducts.length})
                        </div>
                        <div className="flex flex-col gap-2">
                          {selectedProducts.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-3 p-2 rounded-md bg-surface-2"
                            >
                              <div className="size-8 rounded overflow-hidden flex-shrink-0">
                                <Image
                                  src={p.imageUrl}
                                  alt={p.name}
                                  width={32}
                                  height={32}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{p.name}</div>
                                <div className="text-xs text-fg-muted">{p.brand}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleProduct(p)}
                                className="size-6 flex items-center justify-center rounded hover:bg-bg text-fg-muted"
                                aria-label="Remove"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProducts.length === 0 && (
                      <p className="text-xs text-fg-muted">
                        Search above and select the products this discount applies to.
                      </p>
                    )}
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

              <Card title="Scope preview">
                <div className="text-xs font-mono bg-surface-2 p-2 rounded border border-border break-all">
                  {buildScope() || "all"}
                </div>
                <p className="text-[11px] text-fg-muted mt-2">
                  {scopeType === "all" && "Applies to every product in the cart."}
                  {scopeType === "category" && "Applies to products in the specified category."}
                  {scopeType === "products" && selectedProducts.length > 0
                    ? `Applies only to the ${selectedProducts.length} selected product${selectedProducts.length > 1 ? "s" : ""}.`
                    : scopeType === "products"
                      ? "No products selected yet."
                      : ""}
                </p>
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

function ScopeRadio({
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
