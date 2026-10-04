/**
 * Shapes shared by the website chat route (/api/v1/chat) and the chat widget.
 * Plain module — no "use client" / "server-only" — so both sides import it.
 */

import type { CartLine } from "@/stores/cart-store";

export type ChatRole = "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/** Limits, enforced by the route and mirrored in the widget. */
export const CHAT_LIMITS = {
  /** Longest single customer message. */
  maxMessageChars: 1000,
  /** Most recent turns sent upstream (Dailzero allows 50). */
  maxHistory: 20,
  /** Total characters of history sent upstream (Dailzero allows 32k). */
  maxHistoryChars: 12_000,
} as const;

/**
 * A product the assistant linked to, re-read from OUR database at reply time —
 * so the price and stock on the card are always the live ones, whatever the
 * assistant's wording said.
 */
export interface ChatProductCard {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string;
  bg: string;
  /** Current selling price (sale price when a sale is on), kobo. */
  priceKobo: number;
  /** Regular price, kobo — only when on sale, for the strike-through. */
  wasKobo: number | null;
  inStock: boolean;
  preorder: boolean;
  /** More than one variant: the customer picks options on the product page. */
  hasOptions: boolean;
  /** Ready-to-add cart line for a single-variant, purchasable product. */
  line: CartLine | null;
}

export interface ChatReply {
  reply: string;
  products: ChatProductCard[];
}
