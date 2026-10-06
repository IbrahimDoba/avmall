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
  ["earphone", "earbud", "earbuds", "earpiece", "headphone", "headphones", "headset", "airpod", "airpods", "handsfree", "audio"],
  ["speaker", "bluetooth speaker", "sound", "soundbar", "boombox"],
  ["fan", "rechargeable fan", "standing fan", "table fan", "cooling fan", "cooler"],
  ["phone", "smartphone", "android", "mobile", "handset"],
  ["tablet", "tab", "ipad"],
  ["gamepad", "game pad", "pad", "controller", "joystick"],
  ["mifi", "router", "modem", "hotspot", "wifi", "internet"],
  ["cream", "lotion", "moisturizer", "moisturiser"],
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
  // Chat phrasing ("how much be that…", "u get am?") that names no product.
  "how", "much", "price", "cost", "u", "ur", "una", "dey", "wey", "hi", "hello", "kindly", "plz", "sir", "ma",
  // Budget phrasing ("under 20k") — the agent filters by price itself.
  "under", "below", "above", "over", "less", "than", "budget", "around", "about", "within", "range", "naira",
]);

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1") // "10,000mah" reads as "10000mah", as people type it
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export function expandSearchTerms(query: string): {
  tokens: string[];
  terms: string[];
  norm: string;
  /** Per token: the words that count as matching it — itself, its singular,
   *  and the synonym group(s) it triggered. Drives "did the product match
   *  everything they asked for" (see wordCoverage). */
  tokenTerms: string[][];
} {
  const norm = normalizeText(query);
  const tokens = norm.split(" ").filter((t) => t.length >= 2 && !SEARCH_STOPWORDS.has(t));
  const terms = new Set<string>();
  if (norm) terms.add(norm);
  const tokenTerms = tokens.map((t) => [...new Set([t, singular(t)])]);
  // "power banks" must trigger the "power bank" group like "power bank" does.
  const singularPhrase = (x: string) => x.split(" ").map(singular).join(" ");
  for (const t of tokens) {
    terms.add(t);
    const sg = singular(t);
    if (sg !== t) terms.add(sg); // "earphones" also matches an "Earphone" product
  }
  // Trigger a synonym group only on a real match: the group phrase appearing in
  // the query, or a token equal to a group term (singular-insensitive). Looser
  // substring matching wrongly pulled "earphones" into the phone group, etc.
  for (const group of SEARCH_SYNONYMS) {
    let triggered = group.some(
      (g) => g.includes(" ") && norm.length >= 3 && singularPhrase(norm).includes(singularPhrase(g)),
    );
    tokens.forEach((t, i) => {
      // Multi-word group terms ("power bank") match as a phrase and credit each
      // of their words; single words must equal a whole token, so "earphones"
      // can't trigger via "phone".
      const byWord = group.some((g) => g === t || singular(g) === singular(t));
      const byPhrase = group.some(
        (g) =>
          g.includes(" ") &&
          norm.length >= 3 &&
          singularPhrase(norm).includes(singularPhrase(g)) &&
          g.split(" ").some((w) => singular(w) === singular(t)),
      );
      if (byWord || byPhrase) {
        triggered = true;
        tokenTerms[i]!.push(...group);
      }
    });
    if (triggered) for (const g of group) terms.add(g);
  }
  const effectiveTokens = tokens.length ? tokens : norm ? [norm] : [];
  // Cap the term set so the OR query stays bounded.
  return {
    tokens: effectiveTokens,
    terms: [...terms].slice(0, 20),
    norm,
    // Index-aligned with `tokens` (callers filter both together).
    tokenTerms: tokens.length ? tokenTerms : norm ? [[norm]] : [],
  };
}

/**
 * Does `text` contain `term` as a word (or the start of one)? "power" matches
 * "powerbank" and "power bank", but "face" doesn't match "surface" — plain
 * substring matching put a marble table in the results for "face cream".
 * `text` should already be normalised (lowercase, spaces for punctuation).
 */
export function hasWord(text: string, term: string): boolean {
  if (!term) return false;
  let at = text.indexOf(term);
  while (at !== -1) {
    if (at === 0 || text[at - 1] === " ") return true;
    at = text.indexOf(term, at + 1);
  }
  return false;
}

/** A word in `text` that's a near-spelling of `term` ("chager" ~ "charger").
 *  Only for 5+ letter terms, same first letter — short words are too easy to
 *  confuse. */
function hasNearWord(text: string, term: string): boolean {
  if (term.length < 5 || term.includes(" ")) return false;
  return text
    .split(" ")
    .some((w) => w.length >= 4 && w[0] === term[0] && Math.abs(w.length - term.length) <= 2 && diceSim(w, term) >= 0.7);
}

/**
 * How many of the shopper's words (`tokenTerms`, from expandSearchTerms) a
 * product's text covers — each by the word itself, a synonym, or a near
 * spelling. Search keeps only the products that cover the most, so "face
 * cream" never answers with something that's only a "face" anything.
 */
/**
 * Words a product must match to count as "what they asked for". Bare numbers
 * and amounts ("13" in "iphone 13 charger", "20k") help ranking but aren't
 * required: a model number shouldn't hide the right charger.
 *
 * Brand words stay required, matched by the word or the brand it named
 * ("orimo" → oraimo). Imports set many brands to a product's first word
 * ("Face", "Wireless", "Laptop"), so dropping brand words made "face cream"
 * mean just "cream" — and return an ice-cream bottle.
 */
export function requiredWords(
  tokens: string[],
  tokenTerms: string[][],
  brandTokens: ReadonlyMap<string, string[]>,
): string[][] {
  return tokenTerms.flatMap((alts, i) => {
    const t = tokens[i];
    if (t === undefined || /^\d+[km]?$/.test(t)) return [];
    return [[...alts, ...(brandTokens.get(t) ?? [])]];
  });
}

export function wordCoverage(text: string, tokenTerms: string[][]): number {
  return tokenTerms.length - missingWords(text, tokenTerms).length;
}

/** The required words `text` doesn't cover, as the shopper typed them. */
export function missingWords(text: string, tokenTerms: string[][]): string[] {
  return tokenTerms
    .filter((alts) => !(alts.some((t) => hasWord(text, t)) || hasNearWord(text, alts[0]!)))
    .map((alts) => alts[0]!);
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
  /** Query words that named a brand → the brand(s) they named (normalised),
   *  e.g. "orimo" → ["oraimo"]. */
  brandTokens: Map<string, string[]>;
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
  const brandTokens = new Map<string, string[]>();
  const noteBrand = (t: string, bn: string) => brandTokens.set(t, [...(brandTokens.get(t) ?? []), bn]);
  for (const b of brands) {
    const bn = normalizeText(b);
    if (bn.length < 3 || PRODUCT_WORDS.has(bn) || PRODUCT_WORDS.has(singular(bn))) continue;
    const hit = brandable.filter((t) => t === bn || isTypoOf(t, bn));
    const phrase = bn.includes(" ") && norm.includes(bn);
    if (!hit.length && !phrase) continue;
    if (!requested.has(bn)) requested.set(bn, b);
    for (const t of hit) noteBrand(t, bn);
    if (phrase) for (const w of bn.split(" ")) noteBrand(w, bn);
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

  return { requested, brandTokens, mergedTerms, mergedTokens, typeTerms };
}

// ── Planning and scoring a search ────────────────────────────────────────────
// Everything about ranking that doesn't need the database lives here, so the
// live search (lib/data/products) and the offline checks run the same code.

export interface SearchPlan {
  /** The query, normalised. */
  norm: string;
  /** The shopper's words (stopwords dropped), plus corrected brand spellings. */
  tokens: string[];
  /** Everything worth matching: words, synonyms, corrected brands. */
  terms: string[];
  /** Brands the query named — normalised, and as stored. */
  brandNorms: Set<string>;
  brandNames: string[];
  /** Non-brand terms ("power bank" in "oraimo power bank"). */
  typeTerms: string[];
  /** Per required word, what counts as matching it (wordCoverage). */
  coverTerms: string[][];
}

export function planSearch(query: string, knownBrands: readonly string[]): SearchPlan | null {
  const { tokens, terms, norm, tokenTerms } = expandSearchTerms(query);
  if (terms.length === 0) return null;
  const { requested, brandTokens, mergedTerms, mergedTokens, typeTerms } = detectBrands(
    { tokens, terms, norm },
    knownBrands,
  );
  return {
    norm,
    tokens: mergedTokens,
    terms: mergedTerms,
    brandNorms: new Set(requested.keys()),
    brandNames: [...requested.values()],
    typeTerms,
    coverTerms: requiredWords(tokens, tokenTerms, brandTokens),
  };
}

export interface ScorableProduct {
  name: string;
  brand: string;
  shortDesc: string;
  longDesc: string;
  categoryName: string;
  categorySlug: string;
  tags: string[];
  inStock: boolean;
  featured: boolean;
}

/**
 * Relevance of one product. The shopper's own words weigh most, a hit in the
 * name beats one buried in the long description, synonyms count for less than
 * real words — all by whole word, so "face" never scores on "surface".
 * `covered` is how many of the required words it matches.
 */
export function scoreProduct(
  plan: SearchPlan,
  p: ScorableProduct,
): { s: number; covered: number; missing: string[] } {
  const name = normalizeText(`${p.name} ${p.brand}`);
  const short = normalizeText(p.shortDesc);
  const long = normalizeText(p.longDesc);
  const cat = normalizeText(`${p.categoryName} ${p.categorySlug}`);
  const tags = normalizeText(p.tags.join(" "));
  const { norm, tokens, terms } = plan;
  let s = 0;
  if (norm.length >= 3 && name.includes(norm)) s += 100; // whole phrase, in the name
  for (const t of tokens) {
    if (hasWord(name, t)) s += 10;
    if (hasWord(tags, t)) s += 8;
    if (hasWord(cat, t)) s += 6;
    if (hasWord(short, t)) s += 4;
    if (hasWord(long, t)) s += 2;
  }
  for (const term of terms) {
    if (term === norm || tokens.includes(term)) continue; // real words already scored
    if (hasWord(name, term)) s += 5;
    else if (hasWord(cat, term)) s += 4;
    else if (hasWord(tags, term)) s += 4;
    else if (hasWord(short, term)) s += 3;
    else if (hasWord(long, term)) s += 1;
  }
  const missing = missingWords(`${name} ${tags} ${cat} ${short} ${long}`, plan.coverTerms);
  const covered = plan.coverTerms.length - missing.length;
  // The brand they asked for outweighs everything below, stock included: an
  // out-of-stock Oraimo is the honest answer to "oraimo power bank", and the
  // in-stock boost would otherwise hand that slot to another brand. Only for
  // products that are also what they asked for — not an Oraimo cable.
  if (plan.brandNorms.has(normalizeText(p.brand)) && (plan.coverTerms.length === 0 || covered > 0)) {
    s += 30;
  }
  // Lead with what's in stock — a moderate boost, so a strong exact match that
  // happens to be out of stock still shows, just lower.
  if (p.inStock) s += 8;
  if (p.featured) s += 3;
  return { s, covered, missing };
}

/**
 * Pick the results: only the products covering the most of what was asked
 * (with "face cream", anything that's only a "face" something drops out as
 * soon as one real cream exists), best first. `partial` = none covered it all.
 */
export function selectHits<T extends { s: number; covered: number; missing: string[]; featured: boolean }>(
  plan: SearchPlan,
  scored: T[],
  limit: number,
): {
  kept: T[];
  partial: boolean;
  /** When partial: the asked-for words the best results don't mention. */
  missing: string[];
} {
  const relevant = scored.filter((x) => x.s > 0);
  const want = plan.coverTerms.length;
  const best = relevant.reduce((m, x) => Math.max(m, x.covered), 0);
  const kept = (want > 0 ? relevant.filter((x) => x.covered === best) : relevant)
    .sort((a, b) => b.s - a.s || Number(b.featured) - Number(a.featured))
    .slice(0, limit);
  const partial = want > 0 && best < want;
  return { kept, partial, missing: partial ? (kept[0]?.missing ?? []) : [] };
}
