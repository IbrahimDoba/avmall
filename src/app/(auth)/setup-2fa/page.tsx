"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Copy, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OTPInput } from "@/components/ui/otp-input";
import { Alert } from "@/components/ui/alert";
import { Stepper } from "@/components/ui/stepper";

// Fake but stable secret for the mock
const FAKE_SECRET = "JBSW Y3DP EHPK 3PXP JBSW Y3DP";
const FAKE_OTPAUTH = encodeURIComponent(
  `otpauth://totp/Avmall:funmi@avmall.ng?secret=JBSWY3DPEHPK3PXPJBSWY3DP&issuer=Avmall`,
);
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${FAKE_OTPAUTH}`;

const STEPS = [
  { id: "scan", label: "Scan" },
  { id: "verify", label: "Verify" },
  { id: "backup", label: "Save codes" },
];

const BACKUP_CODES = [
  "7K2P-9XQT",
  "M3R5-4FYC",
  "8VH1-WK7D",
  "Q9B3-5JNA",
  "RX2L-7FPM",
  "DT4G-N8K9",
  "C5HW-3PJB",
  "L9MR-Y2KX",
];

export default function Setup2FAPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"scan" | "verify" | "backup">("scan");
  const [copied, setCopied] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function verify(c: string) {
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (c === "123456") {
        setStep("backup");
      } else {
        setError("Incorrect code. Make sure your phone clock is correct.");
        setCode("");
      }
    }, 500);
  }

  const completed = step === "verify" ? ["scan"] : step === "backup" ? ["scan", "verify"] : [];

  return (
    <div>
      <div className="size-12 rounded-md bg-info-bg text-brand-primary flex items-center justify-center mb-4">
        <ShieldCheck className="size-6" />
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
        Set up two-factor auth
      </h1>
      <p className="text-sm text-fg-muted mb-6">
        We&apos;ll require a 6-digit code every time you sign in.
      </p>

      <Stepper steps={STEPS} current={step} completed={completed} className="mb-7" />

      {step === "scan" && (
        <div>
          <div className="flex items-start gap-2.5 mb-4">
            <Smartphone className="size-5 text-fg-muted flex-shrink-0 mt-0.5" />
            <p className="text-sm text-fg-muted leading-relaxed">
              Open your authenticator app (Google Authenticator, 1Password, Authy) and scan this QR
              code.
            </p>
          </div>

          <div className="rounded-md border border-border bg-white p-4 flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={QR_URL} alt="QR code" width={180} height={180} />
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-brand-primary font-semibold hover:underline">
              Can&apos;t scan? Enter the key manually
            </summary>
            <div className="mt-3 p-3 bg-surface-2 rounded-md flex items-center gap-2 font-mono text-sm tabular">
              <code className="flex-1 break-all">{FAKE_SECRET}</code>
              <button
                onClick={() => copy(FAKE_SECRET.replace(/\s/g, ""))}
                aria-label="Copy secret"
                className="p-1.5 hover:text-brand-primary"
              >
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </button>
            </div>
          </details>

          <Button size="lg" width="full" onClick={() => setStep("verify")} className="mt-6">
            I&apos;ve scanned the code
          </Button>
        </div>
      )}

      {step === "verify" && (
        <div>
          <p className="text-sm text-fg-muted mb-5">
            Enter the 6-digit code your authenticator is showing.
          </p>

          <OTPInput
            length={6}
            value={code}
            onChange={setCode}
            onComplete={verify}
            autoFocus
            invalid={!!error}
          />

          {error && <Alert tone="danger" title={error} className="mt-4" />}

          <div className="flex gap-2 mt-6">
            <Button variant="ghost" onClick={() => setStep("scan")}>
              ← Back
            </Button>
            <Button
              loading={loading}
              onClick={() => verify(code)}
              disabled={code.length !== 6}
              className="flex-1"
            >
              Verify and continue
            </Button>
          </div>

          <p className="text-[11px] text-fg-subtle mt-3">
            Try <code className="font-mono">123456</code> as the code (mock).
          </p>
        </div>
      )}

      {step === "backup" && (
        <div>
          <Alert
            tone="warning"
            title="Save these backup codes"
            description="If you lose your phone you'll need these to sign in. Each code works once. Store them somewhere safe — we won't show them again."
          />

          <div className="mt-5 grid grid-cols-2 gap-2 p-4 rounded-md bg-surface-2 font-mono text-sm tabular">
            {BACKUP_CODES.map((c) => (
              <code key={c}>{c}</code>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(BACKUP_CODES.join("\n"))}
            >
              <Copy className="size-3.5" />
              {copied ? "Copied!" : "Copy codes"}
            </Button>
            <Button variant="ghost" size="sm">
              Download .txt
            </Button>
          </div>

          <Button
            size="lg"
            width="full"
            className="mt-6"
            onClick={() => router.push("/admin")}
          >
            I&apos;ve saved them — finish setup
          </Button>
        </div>
      )}
    </div>
  );
}
