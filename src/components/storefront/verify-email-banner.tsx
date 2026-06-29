"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

/**
 * Shown across the account area until the customer confirms their email with a
 * code. Sends the code on demand (reusing the OTP /start endpoint) and verifies
 * via /verify-email; refreshes to dismiss itself once verified.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const router = useRouter();
  const [sent, setSent] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function sendCode() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/customer/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Couldn't send a code");
        return;
      }
      setSent(true);
      toast.success(`Code sent to ${email}`);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/customer/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? "Couldn't verify the code");
        return;
      }
      toast.success("Email verified ✓");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-warning/30 bg-warning-bg p-4">
      <div className="flex items-start gap-3">
        <MailWarning className="size-5 flex-shrink-0 text-warning mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Verify your email</div>
          <p className="text-xs text-fg-muted mt-0.5">
            Confirm <span className="font-medium text-fg">{email}</span> to secure
            your account and receive order updates.
          </p>

          {!sent ? (
            <Button size="sm" className="mt-3" onClick={sendCode} loading={busy}>
              Send verification code
            </Button>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-36 text-center tracking-[0.2em] font-semibold tabular"
              />
              <Button
                size="sm"
                onClick={verify}
                loading={busy}
                disabled={code.length < 6}
              >
                Verify
              </Button>
              <button
                type="button"
                onClick={sendCode}
                disabled={busy}
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                Resend
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
