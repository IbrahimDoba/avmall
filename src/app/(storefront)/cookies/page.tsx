import type { Metadata } from "next";
import { ContentPageHeader } from "@/components/storefront/page-header";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookies",
  description: `Which cookies ${SITE.name} sets and why.`,
  alternates: { canonical: "/cookies" },
};

const COOKIES = [
  {
    name: "av_session",
    purpose: "Keeps you signed in after OTP verification.",
    duration: "30 days, renewed on activity",
    type: "Essential",
  },
  {
    name: "avmall-cart",
    purpose: "Stores your cart locally so it survives a page refresh.",
    duration: "Until you clear it",
    type: "Essential",
  },
  {
    name: "next-auth.session-token",
    purpose: "Admin staff session (only set on /admin login).",
    duration: "12 hours",
    type: "Essential",
  },
  {
    name: "_ph_*",
    purpose: "PostHog analytics — anonymised page views and events.",
    duration: "12 months",
    type: "Analytics",
  },
] as const;

export default function CookiesPage() {
  return (
    <>
      <ContentPageHeader
        eyebrow="Legal"
        title="Cookies"
        description="We keep cookies to a minimum. Here is the complete list."
        breadcrumb={[{ label: "Cookies" }]}
      />
      <div className="mx-auto max-w-4xl px-4 lg:px-6 py-10 lg:py-16">
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-[11px] font-bold uppercase tracking-wider text-fg-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3 hidden sm:table-cell">Duration</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {COOKIES.map((c) => (
                <tr key={c.name}>
                  <td className="px-4 py-3 font-mono text-xs">{c.name}</td>
                  <td className="px-4 py-3 text-fg-muted">{c.purpose}</td>
                  <td className="px-4 py-3 text-fg-muted hidden sm:table-cell">{c.duration}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        c.type === "Essential"
                          ? "bg-info-bg text-brand-primary"
                          : "bg-surface-2 text-fg"
                      }`}
                    >
                      {c.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 space-y-4 text-sm lg:text-base text-fg-muted leading-relaxed">
          <p>
            <strong className="text-fg font-semibold">Essential cookies</strong> are required for the
            site to work — checkout would not function without them. We do not ask consent for these
            because the law does not require it.
          </p>
          <p>
            <strong className="text-fg font-semibold">Analytics cookies</strong> help us see which
            pages are popular and where deliveries fail. They are anonymised at the source. You can
            disable analytics by clearing site data in your browser or sending a Do Not Track header
            — we honour both.
          </p>
          <p>
            Privacy questions: <a href={`mailto:${SITE.supportEmail}`} className="text-brand-primary underline">{SITE.supportEmail}</a>.
          </p>
        </div>
      </div>
    </>
  );
}
