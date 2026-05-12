import type { Metadata } from "next";
import Link from "next/link";
import { ContentPageHeader } from "@/components/storefront/page-header";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${SITE.name} collects, uses, and protects your personal information under the Nigeria Data Protection Act 2023.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <ContentPageHeader
        eyebrow="Legal"
        title="Privacy policy"
        description="Last updated 1 May 2026. We follow the Nigeria Data Protection Act 2023 (NDPA)."
        breadcrumb={[{ label: "Privacy" }]}
      />
      <div className="mx-auto max-w-3xl px-4 lg:px-6 py-10 lg:py-16">
        <Section title="What we collect">
          <ul>
            <li><strong>Contact:</strong> name, phone number, email, delivery addresses.</li>
            <li><strong>Order data:</strong> items purchased, prices, payment method (we never store full card numbers — Nuqood handles those).</li>
            <li><strong>Device data:</strong> IP, browser, referrer, pages viewed — for analytics and fraud prevention.</li>
            <li><strong>Messages:</strong> WhatsApp, web chat, and email conversations with our team or AI agent.</li>
          </ul>
        </Section>

        <Section title="What we do with it">
          <ul>
            <li>Process and deliver your orders.</li>
            <li>Reach you about your order — confirmations, delivery updates, returns.</li>
            <li>Improve the storefront (which products surface, which deliveries fail).</li>
            <li>Detect fraud and protect customers and staff.</li>
            <li>Send marketing — only with your explicit opt-in. You can unsubscribe at any time.</li>
          </ul>
        </Section>

        <Section title="Who we share it with">
          <ul>
            <li><strong>Payments:</strong> Nuqood for card processing.</li>
            <li><strong>Delivery:</strong> the courier we use for your zone (GIG, Kwik, GoKada, or our own riders).</li>
            <li><strong>Communications:</strong> Termii (SMS), Resend (email), Meta (WhatsApp Business API).</li>
            <li><strong>Hosting:</strong> Vercel + Neon (PostgreSQL).</li>
          </ul>
          <p>We never sell your data. We share only what each provider needs to do their job.</p>
        </Section>

        <Section title="Your rights">
          <p>
            Under the NDPA you can ask us to: see what we have on you, correct it, delete it, or
            export it. Email <a href={`mailto:${SITE.supportEmail}`} className="text-brand-primary underline">{SITE.supportEmail}</a> and we will respond within 14 days.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use a small number of cookies to keep you signed in, remember your cart, and measure
            traffic. Full breakdown on the <Link href="/cookies" className="text-brand-primary underline">cookies page</Link>.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            Orders are kept for 7 years for tax and customer-service reasons. Marketing data is
            cleared 24 months after your last interaction. Account-level data is cleared on request.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Privacy questions or NDPA requests: <a href={`mailto:${SITE.supportEmail}`} className="text-brand-primary underline">{SITE.supportEmail}</a>.
            Our data protection officer responds within 14 days.
          </p>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-xl lg:text-2xl font-semibold tracking-tight mb-3">
        {title}
      </h2>
      <div className="text-sm lg:text-base text-fg-muted leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-fg [&_strong]:font-semibold">
        {children}
      </div>
    </section>
  );
}
