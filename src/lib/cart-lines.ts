/**
 * Build storefront cart lines (with their display snapshot) for a list of
 * products, from live data.
 *
 * Shared by the AI's checkout link (POST /api/v1/ai/tools/cart/prepare), which
 * checks the items, and by the cart page opening such a link (POST
 * /api/v1/cart/lines), which turns `?add=slug:qty` back into lines. The link
 * itself only carries slugs and quantities — the old one carried every line's
 * full snapshot as base64 (~1,000 characters), and the AI wouldn't paste it.
 */

import "server-only";

import { db } from "@/lib/db";
import { getMainStoreId } from "@/lib/store";
import { SITE } from "@/lib/site";
import { env } from "@/lib/env";
import { AppError, NotFoundError } from "@/lib/errors";
import type { CartLine, CartLineSnapshot } from "@/stores/cart-store";

export interface CartItemInput {
  productSlug: string;
  variantId?: string | undefined;
  quantity: number;
}

export interface BuiltCartLine {
  line: CartLine;
  name: string;
  unitKobo: number;
}

/**
 * Lines for `items`, priced and stock-checked against the Main store (the
 * storefront default). Throws NotFoundError / STOCK_UNAVAILABLE on the first
 * bad item.
 */
export async function buildCartLines(items: CartItemInput[]): Promise<BuiltCartLine[]> {
  const storeId = await getMainStoreId();
  const slugs = Array.from(new Set(items.map((i) => i.productSlug)));
  const products = await db.product.findMany({
    where: { slug: { in: slugs }, archivedAt: null, published: true },
    include: {
      variants: {
        orderBy: { position: "asc" },
        include: { storeStock: storeId ? { where: { storeId } } : true },
      },
      bulkTiers: true,
      images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
    },
  });
  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  // Match the same R2 → fallback chain that the storefront uses.
  const r2Base = env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "") ?? null;
  const imageUrlFor = (p: (typeof products)[number]) =>
    r2Base && p.images[0]
      ? `${r2Base}/${p.images[0].key}`
      : `https://picsum.photos/seed/${encodeURIComponent(p.slug)}/800/800`;

  return items.map((item) => {
    const product = productBySlug.get(item.productSlug);
    if (!product) throw new NotFoundError(`Product ${item.productSlug}`);

    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : (product.variants.find((v) => {
          const s = v.storeStock[0];
          return s && s.onHand - s.reserved > 0;
        }) ?? product.variants[0]);
    if (!variant) throw new NotFoundError(`Variant for ${item.productSlug}`);

    const vs = variant.storeStock[0];
    const available = vs ? vs.onHand - vs.reserved : 0;
    if (available < item.quantity && !product.preorder) {
      throw new AppError(
        "STOCK_UNAVAILABLE",
        `Only ${available} of ${product.name} available (requested ${item.quantity})`,
        409,
      );
    }

    const unitKobo = Number(
      variant.priceKobo ??
        (product.saleActive && product.saleKobo != null ? product.saleKobo : product.priceKobo),
    );
    const snapshot: CartLineSnapshot = {
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      imageUrl: imageUrlFor(product),
      bg: product.themeBg ?? "linear-gradient(135deg, #ece4d4 0%, #c4a87a 100%)",
      variantLabel: variant.label,
      unitKobo,
      stock: available,
      bulk: product.bulkTiers.map((t) => ({ min: t.min, max: t.max, type: t.type, value: t.value })),
    };
    return {
      line: { productId: product.id, variantId: variant.id, qty: item.quantity, snapshot },
      name: product.name,
      unitKobo,
    };
  });
}

/** `slug:qty[:variantId]`, comma-separated — the `?add=` format. */
export function encodeAddParam(items: CartItemInput[]): string {
  return items
    .map((i) => [i.productSlug, i.quantity, ...(i.variantId ? [i.variantId] : [])].join(":"))
    .join(",");
}

/** The short link that opens the cart with these items added. */
export function cartLinkFor(items: CartItemInput[]): string {
  const base = (env.NEXT_PUBLIC_APP_URL ?? SITE.url).replace(/\/+$/, "");
  return `${base}/cart?add=${encodeAddParam(items)}`;
}
