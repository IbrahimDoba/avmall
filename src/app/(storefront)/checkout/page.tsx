"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Field } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart, resolveCart, computeTotals } from "@/stores/cart-store";
import { NIGERIAN_STATES, LAGOS_LGAS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type PaymentMethod = "nuqood" | "transfer" | "pod";

const PAYMENT_OPTIONS: { id: PaymentMethod; name: string; sub: string }[] = [
  { id: "nuqood", name: "Card · Nuqood", sub: "Pay with Visa, Mastercard, Verve" },
  { id: "transfer", name: "Bank transfer", sub: "Pay to our verified account" },
  { id: "pod", name: "Pay on delivery", sub: "Cash or POS · Lagos only" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);

  const resolved = React.useMemo(() => resolveCart(lines), [lines]);
  const totals = computeTotals(resolved, { shippingKobo: 0 }); // Free Lagos > 25k

  const [step, setStep] = React.useState(1);
  const [phone, setPhone] = React.useState("803 421 7790");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("Tolu Adeniyi");
  const [state, setState] = React.useState("Lagos");
  const [city, setCity] = React.useState("Ikoyi");
  const [address, setAddress] = React.useState("14 Bourdillon Road, Apt 3B");
  const [pay, setPay] = React.useState<PaymentMethod>("nuqood");

  return (
    <div className="px-4 py-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Checkout</h1>

      <Section
        step={1}
        title="Contact & delivery"
        active={step === 1}
        done={step > 1}
        onEdit={() => setStep(1)}
      >
        {step === 1 ? (
          <div className="flex flex-col gap-3">
            <Field id="phone" label="Phone number">
              <PhoneInput id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field id="email" label="Email" optional>
              <Input
                id="email"
                type="email"
                placeholder="for receipts"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field id="name" label="Recipient name">
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field id="state" label="State">
                <Select id="state" value={state} onChange={(e) => setState(e.target.value)}>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="lga" label="LGA">
                <Select id="lga" value={city} onChange={(e) => setCity(e.target.value)}>
                  {(state === "Lagos" ? LAGOS_LGAS : ["—"]).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field id="address" label="Street address">
              <Textarea
                id="address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
            <Button width="full" onClick={() => setStep(2)}>
              Continue to shipping
            </Button>
          </div>
        ) : (
          <div className="text-sm text-fg-muted">
            <div className="text-fg font-semibold">
              {name} · +234 {phone}
            </div>
            <div>
              {address}, {city}, {state}
            </div>
          </div>
        )}
      </Section>

      <Section
        step={2}
        title="Shipping"
        active={step === 2}
        done={step > 2}
        onEdit={() => setStep(2)}
      >
        {step === 2 ? (
          <div>
            <div className="flex items-start gap-2.5 p-3.5 rounded-md bg-success-bg mb-3">
              <Check className="size-4 text-success flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[13px] text-success">Free shipping unlocked</div>
                <div className="text-xs text-fg-muted mt-0.5">Lagos zone · arrives in 24 hours</div>
              </div>
            </div>
            <Button width="full" onClick={() => setStep(3)}>
              Continue to payment
            </Button>
          </div>
        ) : step > 2 ? (
          <div className="text-sm text-fg-muted">
            Lagos zone · 24h ·{" "}
            <span className="text-success font-bold">FREE</span>
          </div>
        ) : null}
      </Section>

      <Section step={3} title="Payment" active={step === 3} done={false}>
        {step === 3 && (
          <div className="flex flex-col gap-2">
            <RadioGroup
              value={pay}
              onValueChange={(v) => setPay(v as PaymentMethod)}
              className="flex flex-col gap-2"
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-md border cursor-pointer transition-colors",
                    pay === opt.id
                      ? "border-brand-primary bg-info-bg"
                      : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <RadioGroupItem value={opt.id} id={`pay-${opt.id}`} />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold">{opt.name}</div>
                    <div className="text-xs text-fg-muted mt-0.5">{opt.sub}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
            <Button
              size="lg"
              width="full"
              className="mt-3"
              onClick={() => router.push("/orders/AVM-2841")}
            >
              Place order · <Money kobo={totals.totalKobo} />
            </Button>
            <p className="text-[11px] text-fg-muted text-center mt-1">
              You&apos;ll be redirected to Nuqood to complete payment.
            </p>
          </div>
        )}
      </Section>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-surface p-4 mt-3.5 shadow-sm">
        <div className="flex items-baseline justify-between py-1 text-[13px]">
          <span className="text-fg-muted">Subtotal</span>
          <Money kobo={totals.subtotalKobo - totals.bulkDiscountKobo} className="font-semibold" />
        </div>
        <div className="flex items-baseline justify-between py-1 text-[13px]">
          <span className="text-fg-muted">Shipping</span>
          <span className="text-brand-accent font-semibold">Free</span>
        </div>
        <div className="h-px bg-border my-2.5" />
        <div className="flex items-baseline justify-between py-1 text-base font-bold">
          <span>Total</span>
          <Money kobo={totals.totalKobo} className="font-bold" />
        </div>
      </div>
    </div>
  );
}

function Section({
  step,
  title,
  active,
  done,
  children,
  onEdit,
}: {
  step: number;
  title: string;
  active: boolean;
  done: boolean;
  children?: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm mb-3 overflow-hidden">
      <div className="px-3.5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "size-6 rounded-full flex items-center justify-center text-[11px] font-bold",
              done
                ? "bg-brand-accent text-white"
                : active
                  ? "bg-fg text-bg"
                  : "bg-surface-2 text-fg-muted",
            )}
          >
            {done ? <Check className="size-3.5" strokeWidth={3} /> : step}
          </span>
          <span className="text-sm font-bold">{title}</span>
        </div>
        {done && onEdit && (
          <button
            onClick={onEdit}
            className="text-[13px] font-semibold text-brand-primary hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {(active || done) && children && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}
