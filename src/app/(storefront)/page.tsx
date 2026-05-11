import Link from "next/link";
import { Truck, Shield, Package, MessageCircle, Heart, Home as HomeIcon, Sparkles, Droplet, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { PRODUCTS, CATEGORIES } from "@/lib/mock-data";

const TRUST_ITEMS = [
  { icon: Truck, t: "Fast delivery", s: "24h Lagos · 2–5d nationwide" },
  { icon: Shield, t: "Secure checkout", s: "Nuqood, transfer, POS" },
  { icon: Package, t: "Easy returns", s: "14 days, no questions" },
  { icon: MessageCircle, t: "Real humans", s: "WhatsApp 8am–9pm" },
];

const CATEGORY_ICONS: Record<string, typeof Heart> = {
  beauty: Sparkles,
  home: HomeIcon,
  fashion: Heart,
  tech: Package,
  food: Droplet,
};

export default function HomePage() {
  const newArrivals = PRODUCTS.slice(0, 4);
  const bestsellers = [PRODUCTS[1]!, PRODUCTS[4]!, PRODUCTS[5]!, PRODUCTS[7]!];

  return (
    <div className="pb-6">
      {/* Hero */}
      <section className="mx-4 mt-4 p-7 rounded-xl text-white relative overflow-hidden bg-gradient-to-br from-brand-primary to-[hsl(262_60%_48%)]">
        <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10 pointer-events-none" />
        <span className="text-[11px] font-bold uppercase tracking-widest opacity-85">
          Curated · Made in Nigeria
        </span>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight mt-2.5 mb-2 max-w-[14ch]">
          Beautifully made things, delivered nationwide.
        </h1>
        <p className="text-sm opacity-90 leading-relaxed mb-4 max-w-[40ch]">
          Free delivery in Lagos over ₦25,000. Pay with card, transfer, or on delivery.
        </p>
        <div className="flex gap-2">
          <Link href="/category/beauty">
            <Button className="bg-white text-brand-primary hover:bg-white/90">Shop now</Button>
          </Link>
          <Button variant="ghost" className="bg-white/15 text-white backdrop-blur-sm hover:bg-white/25">
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
        </div>
      </section>

      {/* Categories rail */}
      <section className="pt-6">
        <div className="px-4 flex items-baseline justify-between mb-2.5">
          <h2 className="text-base font-bold">Shop by category</h2>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.id}`}
              className="flex-shrink-0 inline-flex items-center gap-2 border border-border bg-surface rounded-full px-3.5 py-2.5 text-sm font-semibold hover:border-border-strong"
            >
              {c.name}
              <span className="text-xs font-medium text-fg-subtle tabular">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured collection */}
      <section className="px-4 pt-5">
        <div className="relative overflow-hidden rounded-lg p-5 bg-gradient-to-br from-[hsl(38_75%_88%)] to-[hsl(38_60%_78%)] text-[#3a2410]">
          <div
            className="absolute -right-5 -bottom-8 text-[120px] font-display font-bold opacity-10 leading-none pointer-events-none"
            aria-hidden
          >
            H
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">
            Limited collection
          </span>
          <h3 className="text-2xl font-bold mt-1.5 mb-1 tracking-tight">Harmattan Essentials</h3>
          <p className="text-sm opacity-80 leading-snug mb-3.5">
            Twelve products to ease the dry season.
          </p>
          <Link href="/category/beauty">
            <Button size="sm" className="bg-[#3a2410] text-white hover:bg-[#3a2410]/90">
              Explore <ChevronRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* New arrivals */}
      <section className="pt-7 px-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-bold">New arrivals</h2>
          <Link href="/category/beauty" className="text-sm font-semibold text-brand-primary">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Trust band */}
      <section className="mx-4 my-5 p-4 rounded-lg bg-surface-2 border border-border">
        <div className="grid grid-cols-2 gap-3">
          {TRUST_ITEMS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.t} className="flex items-start gap-2.5">
                <div className="size-8 rounded-md bg-info-bg text-brand-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-[13px]">{t.t}</div>
                  <div className="text-xs text-fg-muted leading-snug">{t.s}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual category swatches */}
      <section className="pt-2">
        <div className="px-4 mb-2.5">
          <h2 className="text-base font-bold">Shop by collection</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4">
          {CATEGORIES.slice(0, 4).map((c) => {
            const Icon = CATEGORY_ICONS[c.id] ?? Package;
            return (
              <Link
                key={c.id}
                href={`/category/${c.id}`}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="size-14 rounded-2xl bg-info-bg text-brand-primary flex items-center justify-center">
                  <Icon className="size-5" />
                </div>
                <span className="text-[11px] font-medium text-center text-fg">{c.name.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Best sellers */}
      <section className="pt-7 px-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-bold">Best sellers</h2>
          <Link href="/category/home" className="text-sm font-semibold text-brand-primary">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {bestsellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
