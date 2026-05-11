"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { OTPInput } from "@/components/ui/otp-input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";

type Step = "identify" | "verify";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("identify");
  const [method, setMethod] = React.useState<"phone" | "email">("phone");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function startVerification() {
    setError(null);
    setLoading(true);
    // Phase 4 will wire OTP API. For now jump to verify step.
    setTimeout(() => {
      setLoading(false);
      setStep("verify");
      setResendIn(60);
    }, 500);
  }

  function verifyOtp(code: string) {
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (code === "123456") {
        router.push("/account");
      } else {
        setError("Incorrect code. Try again.");
        setOtp("");
      }
    }, 600);
  }

  if (step === "verify") {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
          Enter your code
        </h1>
        <p className="text-sm text-fg-muted mb-7">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-fg">
            {method === "phone" ? `+234 ${phone}` : email}
          </span>
          .{" "}
          <button
            onClick={() => setStep("identify")}
            className="text-brand-primary font-semibold hover:underline"
          >
            Wrong details?
          </button>
        </p>

        <OTPInput
          length={6}
          value={otp}
          onChange={setOtp}
          onComplete={verifyOtp}
          autoFocus
          invalid={!!error}
        />

        {error && (
          <Alert tone="danger" title={error} className="mt-4" />
        )}

        <p className="text-xs text-fg-muted mt-5">
          Didn&apos;t get it?{" "}
          {resendIn > 0 ? (
            <span>Resend in {resendIn}s</span>
          ) : (
            <button
              onClick={startVerification}
              className="text-brand-primary font-semibold hover:underline"
            >
              Resend code
            </button>
          )}
        </p>

        <p className="text-[11px] text-fg-subtle mt-2">
          Try <code className="font-mono">123456</code> as the code (mock).
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
        Sign in to Avmall
      </h1>
      <p className="text-sm text-fg-muted mb-7">
        We&apos;ll send you a 6-digit code. No password required.
      </p>

      <Tabs value={method} onValueChange={(v) => setMethod(v as "phone" | "email")} className="mb-5">
        <TabsList className="w-full">
          <TabsTrigger value="phone" className="flex-1">
            <MessageCircle className="size-3.5" /> Phone
          </TabsTrigger>
          <TabsTrigger value="email" className="flex-1">
            <Mail className="size-3.5" /> Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phone" className="mt-5">
          <Field id="phone" label="Phone number" hint="We'll send a code via SMS or WhatsApp">
            <PhoneInput
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </Field>
        </TabsContent>

        <TabsContent value="email" className="mt-5">
          <Field id="email" label="Email">
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </TabsContent>
      </Tabs>

      <Button
        size="lg"
        width="full"
        onClick={startVerification}
        loading={loading}
        disabled={method === "phone" ? !phone : !email}
      >
        Send code
      </Button>

      <p className="text-xs text-fg-muted mt-6 text-center">
        By continuing you agree to our{" "}
        <Link href="#" className="text-brand-primary hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="#" className="text-brand-primary hover:underline">
          Privacy
        </Link>
        .
      </p>

      <div className="mt-6 pt-6 border-t border-border text-center text-xs text-fg-muted">
        Avmall staff?{" "}
        <Link href="/admin-login" className="text-brand-primary font-semibold hover:underline">
          Sign in to admin
        </Link>
      </div>
    </div>
  );
}
