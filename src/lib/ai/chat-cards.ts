/**
 * Turn the product links in an assistant reply into live product cards.
 *
 * The assistant links products as markdown (`[name](https://…/product/<slug>)`).
 * We re-read each one from our own database, so a card's price, stock and "Add
 * to cart" are always the live ones, not whatever the model said.
 */

import "server-only";

import { getProductBySlug } from "@/lib/data/products";
import type { Product } from "@/lib/mock-data";
import type { ChatProductCard } from "@/lib/ai/chat-types";

/** Cards per reply — beyond this the chat turns into a catalogue page. */
const MAX_CARDS = 6;

/** Product slugs linked in `text`, in order of first appearance. */
export function productSlugsIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\/product\/([a-z0-9][a-z0-9-]*)/gi)) {
    const slug = m[1]!.toLowerCase();
    if (!out.includes(slug)) out.push(slug);
  }
  return out;
}

/**
 * The cart line the storefront would build for this variant. Mirrors
 * `snapshotFor` in stores/cart-store, which can't be imported here: it lives
 * in a "use client" module, and a server import of a value from one throws.
 */
function lineFor(p: Product, v: Product["variants"][number]): NonNullable<ChatProductCard["line"]> {
  const unitKobo = v.price ?? (p.saleActive && p.sale != null ? p.sale : p.price);
  return {
    productId: p.id,
    variantId: v.id,
    qty: 1,
    snapshot: {
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      imageUrl: p.imageUrl,
      bg: p.bg,
      variantLabel: v.label,
      unitKobo,
      stock: v.stock,
      bulk: p.bulk.map((t) => ({ min: t.min, max: t.max, type: t.type, value: t.value })),
    },
  };
}

function toCard(p: Product): ChatProductCard {
  const onSale = !!p.saleActive && p.sale != null;
  const purchasable = p.stock > 0 || !!p.preorder;
  const only = p.variants.length === 1 ? p.variants[0] : undefined;
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    imageUrl: p.imageUrl,
    bg: p.bg,
    priceKobo: onSale ? p.sale! : p.price,
    wasKobo: onSale ? p.price : null,
    inStock: p.stock > 0,
    preorder: !!p.preorder,
    hasOptions: p.variants.length > 1,
    line: only && purchasable ? lineFor(p, only) : null,
  };
}

export async function productCardsFor(reply: string): Promise<ChatProductCard[]> {
  const slugs = productSlugsIn(reply).slice(0, MAX_CARDS);
  const products = await Promise.all(slugs.map((s) => getProductBySlug(s).catch(() => null)));
  // A link to a draft or removed product gets no card (and the widget
  // renders that link as plain text).
  return products
    .filter((p): p is Product => !!p && p.published !== false && !p.archived)
    .map(toCard);
}
