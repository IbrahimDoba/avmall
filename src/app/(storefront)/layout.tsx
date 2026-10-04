import { TopNav } from "@/components/storefront/top-nav";
import { StorefrontFooter } from "@/components/storefront/footer";
import { Toaster } from "@/components/ui/toaster";
import { PaymentRecovery } from "@/components/storefront/payment-recovery";
import { SITE } from "@/lib/site";
import { listActiveStores, getStorefrontStore } from "@/lib/store";
import { listStoreCategories } from "@/lib/data/products";
import { getStoreContact, storeWaLink } from "@/lib/data/settings";
import { AiChatWidget } from "@/components/storefront/ai-chat-widget";
import { env } from "@/lib/env";

// The layout reads the active store (cookie/header) to render per-store nav +
// footer categories, so it must render dynamically — never statically cached,
// or a stale store's nav can be served against a different store's page
// (causing a hydration mismatch).
export const dynamic = "force-dynamic";

// Organisation JSON-LD — Google reads this once for the whole site.
// Lives on the storefront layout so it appears on every customer-facing page.
const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: SITE.legalName,
  alternateName: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/icon-512.png`,
  description: SITE.description,
  email: SITE.email,
  telephone: SITE.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.state,
    addressCountry: SITE.address.country,
  },
  sameAs: [
    SITE.social.instagram,
    SITE.social.twitter,
    SITE.social.whatsapp,
    SITE.social.tiktok,
  ],
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE.url}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  // Stores + the customer's selected store drive the per-store storefront.
  const [stores, current] = await Promise.all([
    listActiveStores(),
    getStorefrontStore(),
  ]);
  // Nav categories are fetched per store — each store shows only its own.
  const categories = await listStoreCategories(current?.id ?? undefined);
  // Support/WhatsApp number is admin-editable at /admin/settings.
  const contact = await getStoreContact();
  const whatsappHref = storeWaLink(contact.whatsapp);
  const chatEnabled = !!env.DAILZERO_API_KEY && !!env.DAILZERO_WIDGET_AGENT_ID;

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }}
      />
      <TopNav
        key={current?.slug ?? "main"}
        stores={stores}
        currentStoreSlug={current?.slug ?? null}
        categories={categories}
        whatsappHref={whatsappHref}
      />
      <PaymentRecovery />
      <main className="flex-1">{children}</main>
      <StorefrontFooter
        key={`footer-${current?.slug ?? "main"}`}
        categories={categories}
        stores={stores}
        currentStoreSlug={current?.slug ?? null}
        whatsappHref={whatsappHref}
      />
      <Toaster />
      {/* Our own chat widget, backed by /api/v1/chat (the Dailzero widget
          agent, server-side). Until DAILZERO_API_KEY and
          DAILZERO_WIDGET_AGENT_ID are set, fall back to Dailzero's hosted
          embed so the site is never without a chat. */}
      {chatEnabled ? (
        <AiChatWidget />
      ) : (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html:
                "window.dz=window.dz||function(...a){(window.dz.q=window.dz.q||[]).push(a)};dz('init',{publicKey:'pk_live_f292c150e39cbce2ea8200a9'})",
            }}
          />
          <script async src="https://www.dailzero.com/embed/v1.js" />
        </>
      )}
    </div>
  );
}
