import { TopNav } from "@/components/storefront/top-nav";
import { StorefrontFooter } from "@/components/storefront/footer";
import { AiChatWidget } from "@/components/storefront/ai-chat-widget";
import { Toaster } from "@/components/ui/toaster";
import { SITE } from "@/lib/site";

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

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }}
      />
      <TopNav />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
      <AiChatWidget />
      <Toaster />
    </div>
  );
}
