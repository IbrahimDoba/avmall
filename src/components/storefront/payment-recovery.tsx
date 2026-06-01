"use client";

/**
 * Runs on every storefront page. If the user paid but navigated away before
 * the modal could redirect them, this catches it on the next page load and
 * sends them straight to their order confirmation.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart-store";

const SESSION_KEY = "avmall-pending-checkout-session";

export function PaymentRecovery() {
  const router = useRouter();
  const clearCart = useCart((s) => s.clear);

  React.useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    let cancelled = false;

    fetch(`/api/v1/checkout/status/${sessionId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const data = json?.data;
        if (!data) return;

        if (data.status === "paid" && data.orderNumber) {
          localStorage.removeItem(SESSION_KEY);
          clearCart();
          router.push(`/orders/${data.orderNumber}`);
        } else if (data.status === "expired") {
          localStorage.removeItem(SESSION_KEY);
        }
        // "pending" → leave it; the checkout page will reopen the modal
      })
      .catch(() => {
        // Network blip — leave localStorage intact, try again next page load
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
