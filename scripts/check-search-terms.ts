/**
 * Regression checks for the search vocabulary (src/lib/search-terms.ts):
 * which brands a query names, and which products count as "what they asked
 * for". Every case here is a real query that once went wrong in production.
 *
 *   pnpm check:search
 *
 * No database: brands and product names are fixed samples, including the
 * junk brands imports left behind ("Power", "Earbuds", "Shower").
 */

import {
  detectBrands,
  expandSearchTerms,
  normalizeText,
  requiredWords,
  wordCoverage,
} from "@/lib/search-terms";

const BRANDS = [
  "ORAIMO", "Oraimo", "Power", "Shower", "Flower", "Banana", "Earbuds", "Ousimor", "Men", "Telexon", "Itel",
  "iPhone", "New Age", "Transparent", "Samsung", "Tecno", "Jamax", "Neepho", "Nivea", "Kenwood", "Airtel",
  // Junk brands as imports leave them: the product name's first word.
  "Face", "Ice", "Wireless", "Laptop", "Smart", "Gift", "Solar", "Iwin",
];

const CATALOGUE = [
  "ORAIMO Oraimo 20,000mAh 20w Powerbank", "Telexon Telexon PD 3 30,000mAh powerbank", "ORAIMO Oraimo Cable X93",
  "ORAIMO Oraimo Cannon 18s Iphone Chager", "Original Laptop Charging Head Cable", "Rexi Type C to iPhone Cable 27W",
  "Neepho Neepho L12 Face Tracking Tripod", "Table And 2 Chairs, MARBLE SURFACE", "Sokany 4 face cooking gas burner",
  "Kenwood Commercial Grinder Blender", "Wireless Controller for Ps4 P4-plus", "PS4 Camo Gamepad",
  "Men Gift Set With Powerbank", "ORAIMO Oraimo Conch Earpiece", "Itel Itel K9 Pro Earpiece", "Airtel Airtel Universal Mifi",
  "Itel Itel 10,000mah 12w powerpulse Powerbank", "Face Face Brush", "Ice Ice Cream Bottle",
  "Solar Solar Fan 16 inches With Panel and Bulb", "Iwin Iwin Rechargeable Fan Iw8038-S",
];

const BRAND_CASES: [string, string[]][] = [
  ["oraimo power banks", ["ORAIMO"]],
  ["orimo earbuds", ["ORAIMO"]],
  ["power bank", []],
  ["phone case", []],
  ["iphone charger", ["iPhone"]],
  ["new age powerbank", ["New Age"]],
  ["samsng phone", ["Samsung"]],
  ["techno phone", ["Tecno"]],
  ["earbuds", []],
  ["oraimo", ["ORAIMO"]],
];

// [query, products that should be kept, partial?, catalogue override]
const MATCH_CASES: [string, string[], boolean, string[]?][] = [
  ["face cream", ["Nivea Nivea Face Cream Dark Spot"], false, [...CATALOGUE, "Nivea Nivea Face Cream Dark Spot"]],
  // "13" is a bare number, so not required; "Chager" is a typo in the real
  // product name and still counts as "charger".
  ["iphone 13 charger", ["ORAIMO Oraimo Cannon 18s Iphone Chager"], false],
  // The brand they named is required: Oraimo power banks only, while one exists.
  ["oraimo power banks", ["ORAIMO Oraimo 20,000mAh 20w Powerbank"], false],
  ["orimo power bank", ["ORAIMO Oraimo 20,000mAh 20w Powerbank"], false],
  // "under 20k" is budget talk, not a product word.
  [
    "power bank under 20k",
    [
      "ORAIMO Oraimo 20,000mAh 20w Powerbank",
      "Telexon Telexon PD 3 30,000mAh powerbank",
      "Men Gift Set With Powerbank",
      "Itel Itel 10,000mah 12w powerpulse Powerbank",
    ],
    false,
  ],
  // "Face" is a junk brand; it must still be required, or this is just "cream".
  ["face cream", ["Neepho Neepho L12 Face Tracking Tripod", "Sokany 4 face cooking gas burner", "Face Face Brush", "Ice Ice Cream Bottle"], true],
  // Thousands separators: "10,000mah" in the name, "10000mah" as typed.
  ["itel 10000mah", ["Itel Itel 10,000mah 12w powerpulse Powerbank"], false],
  ["rechargeable fan 16 inch", ["Solar Solar Fan 16 inches With Panel and Bulb"], false],
  ["do u sell blender", ["Kenwood Commercial Grinder Blender"], false],
  ["ps4 pad dey wireless", ["Wireless Controller for Ps4 P4-plus"], false],
  ["ps4 pad", ["Wireless Controller for Ps4 P4-plus", "PS4 Camo Gamepad"], false],
  ["earpiece", ["ORAIMO Oraimo Conch Earpiece", "Itel Itel K9 Pro Earpiece"], false],
  ["i need mifi for internet", ["Airtel Airtel Universal Mifi"], false],
  ["men gift set with powerbank", ["Men Gift Set With Powerbank"], false],
];

let failed = 0;
const check = (ok: boolean, label: string) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
};

for (const [q, want] of BRAND_CASES) {
  const got = [...detectBrands(expandSearchTerms(q), BRANDS).requested.values()];
  check(JSON.stringify(got) === JSON.stringify(want), `brands  "${q}" → ${JSON.stringify(got)}`);
}

for (const [q, want, wantPartial, catalogue = CATALOGUE] of MATCH_CASES) {
  const e = expandSearchTerms(q);
  const need = requiredWords(e.tokens, e.tokenTerms, detectBrands(e, BRANDS).brandTokens);
  const scored = catalogue.map((p) => ({ p, c: wordCoverage(normalizeText(p), need) })).filter((x) => x.c > 0);
  const best = scored.reduce((m, x) => Math.max(m, x.c), 0);
  const kept = scored.filter((x) => x.c === best).map((x) => x.p).sort();
  const partial = need.length > 0 && best < need.length;
  check(
    JSON.stringify(kept) === JSON.stringify([...want].sort()) && partial === wantPartial,
    `matches "${q}" → ${kept.length} kept${partial ? " (partial)" : ""}`,
  );
}

if (failed) {
  console.error(`\n${failed} search check(s) failed`);
  process.exit(1);
}
console.log("\nall search checks passed");
