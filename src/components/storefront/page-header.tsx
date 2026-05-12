import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface ContentPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
}

/**
 * Standard hero for content pages (about, shipping, faq, legal etc.).
 * Keeps typography + spacing consistent across the storefront.
 */
export function ContentPageHeader({
  eyebrow,
  title,
  description,
  breadcrumb,
}: ContentPageHeaderProps) {
  return (
    <header className="border-b border-border bg-surface-2">
      <div className="mx-auto max-w-4xl px-4 lg:px-6 py-10 lg:py-16">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-fg-muted mb-5">
            <Link href="/" className="hover:text-fg">
              Home
            </Link>
            {breadcrumb.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <ChevronRight className="size-3" />
                {b.href ? (
                  <Link href={b.href} className="hover:text-fg">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-fg font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand-primary mb-3">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-base lg:text-lg text-fg-muted leading-relaxed mt-4 max-w-2xl">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
