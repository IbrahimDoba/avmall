import Link from "next/link";

const COLUMNS: { heading: string; items: { label: string; href: string }[] }[] = [
  {
    heading: "Shop",
    items: [
      { label: "New arrivals", href: "/" },
      { label: "Bestsellers", href: "/" },
      { label: "Sale", href: "/" },
      { label: "Beauty", href: "/category/beauty" },
      { label: "Home", href: "/category/home" },
      { label: "Fashion", href: "/category/fashion" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", href: "#" },
      { label: "Makers", href: "#" },
      { label: "Journal", href: "#" },
      { label: "Careers", href: "#" },
    ],
  },
  {
    heading: "Help",
    items: [
      { label: "Contact", href: "#" },
      { label: "Shipping", href: "#" },
      { label: "Returns", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Track order", href: "#" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
];

export function StorefrontFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-10 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-1.5 font-bold text-lg mb-3">
            <span className="inline-flex items-center justify-center size-6 rounded-md bg-brand-primary text-brand-primary-fg text-xs font-bold">
              av
            </span>
            <span>mall</span>
          </div>
          <p className="text-xs text-fg-muted leading-relaxed max-w-xs">
            Goods made by Nigerian hands, delivered across the country. Avmall Ltd · RC 1842901 · Lagos.
          </p>
          <div className="flex gap-2 mt-4">
            {["IG", "TW", "WA", "TT"].map((s) => (
              <span
                key={s}
                className="inline-flex items-center justify-center size-8 rounded-full border border-border text-[10px] font-bold text-fg-muted"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3">{col.heading}</div>
            <div className="flex flex-col gap-2 text-sm text-fg-muted">
              {col.items.map((i) => (
                <Link key={i.label} href={i.href} className="hover:text-fg">
                  {i.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-fg-muted">
          <span>© 2026 Avmall Ltd. All rights reserved.</span>
          <span>Powered by Nuqood · Made in Lagos.</span>
        </div>
      </div>
    </footer>
  );
}
