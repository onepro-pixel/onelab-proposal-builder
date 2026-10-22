// Single source of truth for OneLab standard prices. Browser-safe (no imports).
// The offer template, the AI prompt rules and the pre-send checks all read from
// here, so a price change is made in exactly one place.

export function formatKr(amount: number): string {
  return `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kr`;
}

export const PACKAGE_NAMES = {
  digital: "Hälsoundersökning Digital",
  bas: "Hälsoundersökning Bas",
  plus: "Hälsoundersökning Plus",
} as const;

export const STANDARD_PACKAGE_PRICES: Record<string, number> = {
  [PACKAGE_NAMES.digital]: 1290,
  [PACKAGE_NAMES.bas]: 2690,
  [PACKAGE_NAMES.plus]: 3190,
};

export type StandardExtra = {
  /** Name as the AI is told to write it. */
  name: string;
  /** Lower-case fragment used to recognise the extra in generated offers. */
  match: string;
  price: number;
  /** Text used in the prompt, e.g. "kr/person". */
  unit: string;
  /** Minimum number of people per occasion, when the service has one. */
  minPersons?: number;
};

export const STANDARD_EXTRAS: StandardExtra[] = [
  { name: "PSA-test (via remiss)", match: "psa", price: 490, unit: "kr/person" },
  { name: "Hörseltest", match: "hörsel", price: 990, unit: "kr/person" },
  { name: "Spirometri", match: "spirometri", price: 990, unit: "kr/person" },
  { name: "Screening för vibration", match: "screening för vibration", price: 490, unit: "kr/person" },
  { name: "Vibrationstester", match: "vibrationstest", price: 1490, unit: "kr/person", minPersons: 10 },
  { name: "Sjuk- och friskanmälan verktyg", match: "sjuk- och friskanmälan", price: 490, unit: "kr/år/person" },
];

export function findStandardExtra(name: string): StandardExtra | undefined {
  const n = name.toLowerCase();
  // "Screening för vibration" must win over the shorter "vibrationstest" match.
  return [...STANDARD_EXTRAS].sort((a, b) => b.match.length - a.match.length).find((e) => n.includes(e.match));
}

const shortPackageLabel: Record<string, string> = {
  [PACKAGE_NAMES.digital]: "Digital",
  [PACKAGE_NAMES.bas]: "Bas",
  [PACKAGE_NAMES.plus]: "Plus",
};

/** "Digital 1 290 kr/person; Bas 2 690 kr/person; Plus 3 190 kr/person." */
export const packagePriceText = `${Object.entries(STANDARD_PACKAGE_PRICES)
  .map(([name, price]) => `${shortPackageLabel[name] ?? name} ${formatKr(price)}/person`)
  .join("; ")}.`;

/** "PSA-test (via remiss) 490 kr/person; ...; Vibrationstester 1 490 kr/person (MINST 10 ...)" */
export const extraPriceText = STANDARD_EXTRAS.map((e) => {
  const amount = formatKr(e.price).replace(/ kr$/, "");
  const min = e.minPersons ? ` (MINST ${e.minPersons} personer per tillfälle, skriv alltid detta i condition)` : "";
  return `${e.name} ${amount} ${e.unit}${min}`;
}).join("; ");

/** Added to every AI prompt so stale prices in the editable service text never win. */
export const pricePrecedenceRule =
  "Standardpriserna i denna prompt (paketpriser och tillvalspriser) gäller framför äldre eller avvikande prisuppgifter i tjänsteunderlaget. Bara ett pris som uttryckligen står i mötesanteckningarna för just den här kunden får gå före dem.";

export const standardPriceBlock = `STANDARDPRISER (aktuella):
Paket: ${packagePriceText}
Tillval: ${extraPriceText}.
${pricePrecedenceRule}`;
