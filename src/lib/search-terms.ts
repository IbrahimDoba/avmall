/**
 * Search vocabulary: turning a shopper's words into catalogue search terms —
 * synonyms, stopwords, typo similarity, and which brands a query names.
 *
 * Pure (no database, no React) so the matching rules can be checked directly;
 * lib/data/products runs the queries and ranking on top of it.
 */

/**
 * Synonym / alias groups for catalogue search. If any member of a group shows
 * up in the shopper's query, the whole group joins the search — so "power bank"
 * also finds an item that only says so in its description or is tagged a
 * "charger" / "battery pack", and "earphones" finds "earbuds" / "headphones".
 * Tuned for this store's mix (phones, audio, power, fans, home & kitchen);
 * extend freely — order within a group doesn't matter.
 */
const SEARCH_SYNONYMS: readonly (readonly string[])[] = [
  ["power bank", "powerbank", "portable charger", "battery pack", "backup battery", "power"],
  ["charger", "adapter", "adaptor", "charging", "fast charger", "wall charger"],
  ["cable", "cord", "usb cable", "charging cable", "type c", "lightning cable"],
  ["earphone", "earbud", "earbuds", "headphone", "headphones", "headset", "airpod", "airpods", "handsfree", "audio"],
  ["speaker", "bluetooth speaker", "sound", "soundbar", "boombox"],
  ["fan", "rechargeable fan", "standing fan", "table fan", "cooling fan", "cooler"],
  ["phone", "smartphone", "android", "mobile", "handset"],
  ["tablet", "tab", "ipad"],
  ["smartwatch", "smart watch", "watch", "fitness band"],
  ["television", "tv", "smart tv"],
  ["blender", "mixer", "grinder", "smoothie maker"],
  ["kettle", "electric kettle"],
  ["iron", "pressing iron", "steam iron"],
  ["torch", "flashlight", "rechargeable light", "rechargeable lamp", "lantern"],
  ["generator", "inverter", "power station"],
  ["memory card", "sd card", "flash drive", "pendrive", "usb drive"],
];

/** Filler words dropped from a query before matching, so "do you have a good
 *  power bank" searches on {power, bank}, not the whole sentence. */
/** Every word in the synonym groups — words that name a KIND of product, so
 *  they're never read as a brand (see searchProductsDetailed). */
const PRODUCT_WORDS: ReadonlySet<string> = new Set(
  SEARCH_SYNONYMS.flat().flatMap((g) => g.split(" ")).flatMap((w) => [w, singular(w)]),
);

const SEARCH_STOPWORDS = new Set([
  "the", "a", "an", "of", "for", "to", "and", "or", "with", "in", "on", "my", "me", "i", "is", "are", "am", "be",
  "do", "you", "have", "need", "needed", "want", "get", "got", "looking", "look", "show", "find", "buy", "sell",
  "some", "any", "good", "best", "new", "cheap", "affordable", "quality", "original", "genuine", "please", "pls",
  "abeg", "this", "that", "your", "their", "there", "it", "can", "could", "would", "like", "one", "ones", "us", "we",
  "product", "products", "item", "items", "available", "stock",
]);

export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Expand a raw query into terms to match against the catalogue: the full
 * phrase, its non-stopword tokens, and every triggered synonym-group member.
 */
/** Crude singular: drop a trailing "s" from words of 4+ chars so "earphones"
 *  matches "earphone". Good enough for retail nouns; avoids a stemmer dep. */
export function singular(w: string): string {
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}

export function expandSearchTerms(query: string): { tokens: string[]; terms: string[]; norm: string } {
  const norm = normalizeText(query);
  const tokens = norm.split(" ").filter((t) => t.length >= 2 && !SEARCH_STOPWORDS.has(t));
  const terms = new Set<string>();
  if (norm) terms.add(norm);
  for (const t of tokens) {
    terms.add(t);
    const sg = singular(t);
    if (sg !== t) terms.add(sg); // "earphones" also matches an "Earphone" product
  }
  // Trigger a synonym group only on a real match: the group phrase appearing in
  // the query, or a token equal to a group term (singular-insensitive). Looser
  // substring matching wrongly pulled "earphones" into the phone group, etc.
  for (const group of SEARCH_SYNONYMS) {
    const triggered = group.some(
      (g) =>
        // Multi-word group terms ("power bank") match as a phrase; single words
        // must equal a whole token, so "earphones" can't trigger via "phone".
        (g.includes(" ") && norm.length >= 3 && norm.includes(g)) ||
        tokens.some((t) => g === t || singular(g) === singular(t)),
    );
    if (triggered) for (const g of group) terms.add(g);
  }
  const effectiveTokens = tokens.length ? tokens : norm ? [norm] : [];
  // Cap the term set so the OR query stays bounded.
  return { tokens: effectiveTokens, terms: [...terms].slice(0, 20), norm };
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** Dice coefficient over character bigrams — a cheap typo-similarity in [0,1].
 *  "orimo" vs "oraimo" ≈ 0.67, so a misspelled brand still matches. */
export function diceSim(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

/**
 * Which brands a search names, and what's left once they're taken out.
 * Pure (the brand list is passed in) so it can be tested without a database.
 */
export function detectBrands(
  { tokens, terms, norm }: { tokens: string[]; terms: string[]; norm: string },
  brands: readonly string[],
): {
  requested: Map<string, string>;
  mergedTerms: string[];
  mergedTokens: string[];
  typeTerms: string[];
} {
  // Brands named in the query — exactly, as a phrase ("new age"), or misspelled
  // ("orimo" → Oraimo). Two guards, both learned from live data:
  //  - Words that describe a product ("power", "bank", "earbuds") are never
  //    brands, even though imports left products with brands like "Power" and
  //    "Earbuds" — otherwise "oraimo power bank" reads as five brands.
  //  - A typo shares the first letter, is within 2 letters in length, isn't a
  //    substring ("phone" in "iPhone" means any phone) and is close (Dice ≥
  //    0.65): "orimo" → Oraimo yes; "power" → Shower no.
  const isTypoOf = (t: string, bn: string) =>
    t.length >= 4 &&
    t[0] === bn[0] &&
    Math.abs(t.length - bn.length) <= 2 &&
    !bn.includes(t) &&
    !t.includes(bn) &&
    diceSim(t, bn) >= 0.65;
  const brandable = tokens.filter((t) => !PRODUCT_WORDS.has(t) && !PRODUCT_WORDS.has(singular(t)));
  const requested = new Map<string, string>(); // normalised → as stored
  const brandTokens = new Set<string>();
  for (const b of brands) {
    const bn = normalizeText(b);
    if (bn.length < 3 || PRODUCT_WORDS.has(bn) || PRODUCT_WORDS.has(singular(bn))) continue;
    const hit = brandable.filter((t) => t === bn || isTypoOf(t, bn));
    const phrase = bn.includes(" ") && norm.includes(bn);
    if (!hit.length && !phrase) continue;
    if (!requested.has(bn)) requested.set(bn, b);
    for (const t of hit) brandTokens.add(t);
    if (phrase) for (const w of bn.split(" ")) brandTokens.add(w);
  }
  const brandNorms = new Set(requested.keys());

  // Misspelled brands also become search terms, or the candidate query (a
  // substring match) would never find them at all.
  const corrections = [...brandNorms].filter((bn) => !tokens.includes(bn) && !norm.includes(bn));
  const mergedTerms = [...new Set([...terms, ...corrections])].slice(0, 24);
  const mergedTokens = [...new Set([...tokens, ...corrections])];
  // What they want, minus the brand: "power bank" in "oraimo power bank".
  const typeTerms = terms.filter(
    (t) => t !== norm && !brandTokens.has(t) && !brandTokens.has(singular(t)),
  );

  return { requested, mergedTerms, mergedTokens, typeTerms };
}
