/**
 * Money utilities — all values stored as integer kobo (1 Naira = 100 kobo).
 * Never use floats for money. See CLAUDE.md §2.2 + §9.
 */

/** Format kobo integer to ₦ display string (en-NG locale). */
export function formatMoney(kobo: number, showDecimals = false): string {
  const naira = kobo / 100;
  const force = showDecimals || kobo % 100 !== 0;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: force ? 2 : 0,
    maximumFractionDigits: force ? 2 : 0,
  })}`;
}

/** Parse a user-entered Naira string (may contain ₦, commas, spaces) to kobo. */
export function parseToKobo(input: string): number {
  const cleaned = input.replace(/[₦,\s]/g, "");
  const naira = parseFloat(cleaned);
  if (isNaN(naira)) {
    throw new Error("Invalid money value");
  }
  return Math.round(naira * 100);
}

/** Apply a percentage discount — always rounds down (favour the business). */
export function applyPercentageDiscount(amountKobo: number, percentOff: number): number {
  return Math.floor((amountKobo * percentOff) / 100);
}

/** Convenience: split kobo into naira + remaining kobo. */
export function splitKobo(kobo: number): { naira: number; kobo: number } {
  return {
    naira: Math.floor(kobo / 100),
    kobo: kobo % 100,
  };
}
