import type { OfferContent } from "./offer-template";
import { findStandardExtra, STANDARD_PACKAGE_PRICES, PACKAGE_NAMES, formatKr } from "./pricing-catalog";

export type OfferWarning = { level: "error" | "warn"; message: string };

const PRICE_FORMAT = /^\d{1,3}( \d{3})* kr$/;
const PRICE_ON_REQUEST = /^pris enligt offert$/i;
const PLACEHOLDER = /\[[^\]]{1,40}\]|\bTBD\b|lorem ipsum|\bXXX\b/i;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** True when the number written in `price` appears somewhere in the meeting notes. */
function priceInNotes(price: string, notes: string): boolean {
  const wanted = digitsOnly(price);
  if (!wanted) return false;
  // Remove spaces, non-breaking spaces and thousands dots so "2 490", "2490" and "2.490" all match.
  const flat = notes.replace(/[\s .]/g, "");
  return flat.includes(wanted);
}

function collectStrings(value: unknown, path: string, out: { path: string; text: string }[]) {
  if (typeof value === "string") out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectStrings(v, path ? `${path}.${k}` : k, out);
  }
}

/**
 * Deterministic sanity checks run before a proposal is sent. They never block
 * anything; they only tell the salesperson what to double-check.
 */
export function checkOffer(offer: OfferContent, customerName: string, notes: string): OfferWarning[] {
  const warnings: OfferWarning[] = [];

  // 1. Leftover placeholders anywhere in the document.
  const strings: { path: string; text: string }[] = [];
  collectStrings(offer, "", strings);
  const placeholder = strings.find((s) => PLACEHOLDER.test(s.text));
  if (placeholder) {
    warnings.push({ level: "error", message: `Texten innehåller en platshållare ("${placeholder.text.slice(0, 60)}"). Ersätt den innan du skickar.` });
  }

  // 2. Customer name should appear on the cover.
  const name = customerName.trim().toLowerCase();
  if (name && !`${offer.title} ${offer.subtitle}`.toLowerCase().includes(name)) {
    warnings.push({ level: "warn", message: `Kundnamnet "${customerName}" saknas i rubrik och ingress.` });
  }

  // 3. Selected package must exist.
  if (!offer.packages.some((p) => p.name === offer.selectedPackage)) {
    warnings.push({ level: "error", message: `Valt paket "${offer.selectedPackage}" finns inte bland paketen.` });
  }

  // 4. Package prices: format, deviation from standard, and support in the notes.
  for (const pkg of offer.packages) {
    const price = pkg.price.trim();
    if (!PRICE_FORMAT.test(price)) {
      warnings.push({ level: "warn", message: `Priset "${price}" för ${pkg.name} har oväntat format. Skriv t.ex. "2 690 kr".` });
      continue;
    }
    const standard = STANDARD_PACKAGE_PRICES[pkg.name];
    if (standard !== undefined && digitsOnly(price) !== String(standard) && !priceInNotes(price, notes)) {
      warnings.push({ level: "warn", message: `${pkg.name} kostar ${price}, men standardpriset är ${formatKr(standard)} och beloppet finns inte i anteckningarna. Kontrollera priset.` });
    }
  }

  // 5. The cover metrics must match the package prices they quote.
  const priceOf = (name: string) => offer.packages.find((p) => p.name === name)?.price.trim();
  const basMetric = offer.metrics[0]?.value.trim();
  const plusMetric = offer.metrics[1]?.value.trim();
  const bas = priceOf(PACKAGE_NAMES.bas);
  const plus = priceOf(PACKAGE_NAMES.plus);
  if (bas && basMetric && bas !== basMetric) warnings.push({ level: "warn", message: `Försättsbladet visar Bas ${basMetric}, men pakettabellen visar ${bas}.` });
  if (plus && plusMetric && plus !== plusMetric) warnings.push({ level: "warn", message: `Försättsbladet visar Plus ${plusMetric}, men pakettabellen visar ${plus}.` });

  // 6. Extras: known service, price, mandatory conditions.
  for (const extra of offer.extras) {
    const label = extra.name.trim() || "(namnlöst tillval)";
    const price = extra.price.trim();
    const onRequest = PRICE_ON_REQUEST.test(price);
    const standard = findStandardExtra(extra.name);

    if (!onRequest && !PRICE_FORMAT.test(price)) {
      warnings.push({ level: "warn", message: `Priset "${price}" för tillvalet ${label} har oväntat format. Skriv t.ex. "490 kr" eller "Pris enligt offert".` });
    }
    if (!extra.billing.trim()) warnings.push({ level: "warn", message: `Tillvalet ${label} saknar enhet (t.ex. "per person").` });

    if (!standard) {
      if (!onRequest) warnings.push({ level: "warn", message: `Tillvalet ${label} finns inte i standardlistan. Kontrollera pris och innehåll.` });
      continue;
    }
    if (!onRequest && PRICE_FORMAT.test(price) && digitsOnly(price) !== String(standard.price) && !priceInNotes(price, notes)) {
      warnings.push({ level: "warn", message: `${label} kostar ${price}, men standardpriset är ${formatKr(standard.price)} och beloppet finns inte i anteckningarna.` });
    }
    if (standard.minPersons && !new RegExp(`\\b${standard.minPersons}\\b`).test(extra.condition)) {
      warnings.push({ level: "error", message: `${label} måste ange villkoret "minst ${standard.minPersons} personer per tillfälle".` });
    }
  }

  return warnings;
}
