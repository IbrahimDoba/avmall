import type { Metadata } from "next";
import { Suspense } from "react";
import { Package } from "lucide-react";
import { ContentPageHeader } from "@/components/storefront/page-header";
import { SITE } from "@/lib/site";
import { TrackOrderForm } from "./track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: `Track an ${SITE.name} order without signing in — enter your order number and phone.`,
  alternates: { canonical: "/track-order" },
};

export default function TrackOrderPage() {
  return (
    <>
      <ContentPageHeader
        eyebrow="Help"
        title="Track your order"
        description="Enter the order number and the phone number you placed the order with."
        breadcrumb={[{ label: "Track order" }]}
      />

      <div className="mx-auto max-w-xl px-4 lg:px-6 py-10 lg:py-16">
        <div className="rounded-lg border border-border bg-surface p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-10 rounded-md bg-info-bg text-brand-primary flex items-center justify-center">
              <Package className="size-5" />
            </div>
            <div className="text-sm font-semibold">No sign-in required</div>
          </div>
          <Suspense fallback={null}>
            <TrackOrderForm />
          </Suspense>
        </div>

        <p className="text-xs text-fg-muted text-center mt-5">
          Lost your order number? Check your confirmation email or WhatsApp message — it starts
          with <span className="font-mono">AVM-</span>.
        </p>
      </div>
    </>
  );
}
