import { PACKAGE_NAMES, STANDARD_PACKAGE_PRICES, extraPriceText, formatKr, packagePriceText, pricePrecedenceRule } from "./pricing-catalog";
export type OfferItem = { name: string; text: string };
export type OfferPackage = { name: string; price: string; billing: string; caption: string; features: string[] };
export type OfferExtra = { name: string; price: string; billing: string; description: string; condition: string };
export type OfferContent = {
  title: string; subtitle: string; badge: string; selectedPackage: string;
  metrics: { value: string; label: string }[];
  steps: OfferItem[];
  packageHeading: string; packageIntro: string; packages: OfferPackage[];
  reasons: OfferItem[]; arrangement: OfferItem[];
  followupHeading: string; followupIntro: string; followups: OfferItem[]; employer: OfferItem[];
  practicalHeading: string; practicalIntro: string; practical: OfferItem[]; pricingNote: string;
  extrasHeading: string; extrasIntro: string; extras: OfferExtra[];
};

export function defaultOffer(customer: string): OfferContent {
  return {
    title: `Hälsoundersökning för ${customer}`,
    subtitle: `En hälsoundersökning på plats hos er som ger varje medarbetare koll på sin hälsa, och ${customer} ett konkret beslutsunderlag för det fortsatta arbetet med hälsa, välmående och arbetsmiljö.`,
    badge: "Offert · Hälsoundersökning Bas", selectedPackage: "Hälsoundersökning Bas",
    metrics: [{ value: formatKr(STANDARD_PACKAGE_PRICES[PACKAGE_NAMES.bas] ?? 0), label: "Bas, per medarbetare" }, { value: formatKr(STANDARD_PACKAGE_PRICES[PACKAGE_NAMES.plus] ?? 0), label: "Plus, per medarbetare" }, { value: "10–15 min", label: "per medarbetare på plats" }],
    steps: [
      { name: "Digital hälsoundersökning", text: "Dynamiska frågebatterier om hälsa, livsstil och arbete i app eller webb." },
      { name: "Mätningar och prover", text: "Blodtryck, puls, syremättnad och blodprov. Plus för den som vill." },
      { name: "Återkoppling och analys", text: `Personligt resultat till alla och en analys till ${customer}.` },
      { name: "Vi tar ansvar för det vi hittar", text: "Uppföljning av identifierade risker ingår utan extra kostnad." },
    ],
    packageHeading: "En gemensam grund, med möjlighet till fördjupning",
    packageIntro: "Välj den undersökningsnivå som passar er. Bas inkluderar Digital, och Plus inkluderar allt i Bas.",
    packages: [
      { name: PACKAGE_NAMES.digital, price: formatKr(STANDARD_PACKAGE_PRICES[PACKAGE_NAMES.digital] ?? 0), billing: "per medarbetare", caption: "DIGITAL KARTLÄGGNING", features: ["Hälsa, livsstil och arbetsmiljö", "Digital screening i app eller webb", "Personligt resultat och uppföljning", "Rapport och analys till er"] },
      { name: PACKAGE_NAMES.bas, price: formatKr(STANDARD_PACKAGE_PRICES[PACKAGE_NAMES.bas] ?? 0), billing: "per medarbetare", caption: "EN GEMENSAM GRUND", features: ["Hela Digital ingår", "Blodtryck, puls och syremättnad", "Blodfetter, HbA1c och hsCRP", "Personligt resultat och uppföljning", "Rapport och analys till er"] },
      { name: PACKAGE_NAMES.plus, price: formatKr(STANDARD_PACKAGE_PRICES[PACKAGE_NAMES.plus] ?? 0), billing: "per medarbetare", caption: "FÖRDJUPAD UNDERSÖKNING", features: ["Allt som ingår i Bas", "TSH, hemoglobin och kreatinin", "ALAT och transferrin", "Auskultation", "Vid samma undersökningstillfälle"] },
    ],
    reasons: [
      { name: "Något för alla ger högt deltagande", text: "En gemensam grund gör det enkelt att delta och ger ett bredare underlag för er rapport." },
      { name: "Rätt nivå för era behov", text: "Digital ger en kartläggning. Bas kompletterar med mätningar och prover. Plus ger ytterligare fördjupning." },
      { name: "Förutsägbar kostnad", text: "Ett fast pris per medarbetare gör det enkelt att planera och följa upp kostnaden." },
    ],
    arrangement: [{ name: "Välj upplägg", text: "Vi kommer överens om undersökningsnivå och eventuella tillval." }, { name: "Vi planerar och bokar", text: "Medarbetarna gör den digitala delen i förväg." }, { name: "Resultat och nästa steg", text: "Medarbetarna får stöd och ni får ett underlag att agera på." }],
    followupHeading: "Efter undersökningen tar vi ansvar för det vi hittar",
    followupIntro: `Undersökningen är bara början. Identifierade risker följs upp och ${customer} får ett underlag för det fortsatta arbetsmiljöarbetet.`,
    followups: [
      { name: "Personligt resultat", text: "Resultat med medicinsk bedömning och personliga rekommendationer, i app eller på webben." },
      { name: "Vi hör av oss vid risk", text: "Alla med en identifierad risk kontaktas aktivt. Medarbetaren behöver inte ta initiativet." },
      { name: "Rådgivning och samtalsstöd", text: "Via video eller chatt, även akut samtalsstöd vid tecken på psykisk ohälsa." },
      { name: "Plan och rätt vårdnivå", text: "Personliga råd, övningar och hälsoplaner, och vägledning vidare när det behövs." },
      { name: "Digitalt återbesök", text: "Vill medarbetaren prata med läkaren igen ingår det, utan nytt besök på plats." },
    ],
    employer: [
      { name: "Anonymiserad rapport", text: "En aggregerad rapport som kan segmenteras per grupp med bibehållen sekretess." },
      { name: "Analys, inte bara statistik", text: "Vilka riskområden som sticker ut och vad de beror på." },
      { name: "Prioriterade rekommendationer", text: "Förbättringsområden och konkreta nästa steg för ert arbetsmiljöarbete." },
      { name: "Genomgång med HR och ledning", text: "Vi presenterar resultatet, med stöd av er Customer Success Manager." },
      { name: "Underlag för arbetsmiljöarbetet", text: "Resultatet stöttar ert systematiska arbetsmiljöarbete (SAM)." },
      { name: "Sekretess", text: "Individens hälsouppgifter delas aldrig med arbetsgivaren." },
    ],
    practicalHeading: "Praktiskt upplägg och pris",
    practicalIntro: "Enkelt för er och för medarbetarna. Vi sköter planering, bokning och genomförande på plats hos er.",
    practical: [
      { name: "Tidsåtgång", text: "10–15 minuter på plats. Den digitala hälsoundersökningen görs i förväg. Cirka 30 medarbetare per dag och sjuksköterska." },
      { name: "Bokning", text: "Vi bokar in varje medarbetare. Därefter kan medarbetaren själv boka om eller boka av sin tid. Om många missat sin tid planerar vi ett uppsamlingstillfälle." },
      { name: "Lokaler", text: "Ett avskilt rum med bord, två stolar och eluttag, nära arbetsplatsen. Sjuksköterskan tar med all utrustning." },
      { name: "Tidplan", text: "Planering och kickoff → bokning → digital hälsoundersökning → undersökningsdagar → resultat och uppföljning → genomgång med HR." },
      { name: "Person- och hälsouppgifter", text: "Registrerad vårdgivare hos IVO. Uppgifterna hanteras enligt patientdatalagen och GDPR." },
      { name: "Kvalitet och referensvärden", text: "Ackrediterat laboratorium och CE-märkta instrument. Resultaten bedöms mot kliniska referensintervall." },
    ],
    pricingNote: "Fast pris per medarbetare för vald undersökningsnivå. Uppföljning och digitala återbesök ingår. Tillval avtalas separat. Samtliga priser i SEK.",
    extrasHeading: "Tillval och kompletterande undersökningar",
    extrasIntro: "Komplettera ert upplägg utifrån arbetsmiljö, exponeringar och medarbetarnas behov.", extras: [],
  };
}

// Derive a strict wire schema from the template so every editable field is represented.
function schemaOf(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return { type: "array", items: schemaOf(value[0] ?? "") };
  if (typeof value === "object" && value !== null) {
    const properties = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, schemaOf(entry)]));
    return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
  }
  return { type: "string" };
}
export const offerSchema = schemaOf({ ...defaultOffer("Kundnamn"), extras: [{ name: "", price: "", billing: "", description: "", condition: "" }] });

// The AI never rewrites the fixed template. It only returns these adaptable
// fields, which are merged into defaultOffer deterministically.
export type OfferAdaptation = {
  title: string; subtitle: string; badge: string;
  packageIntro: string; followupIntro: string; practicalIntro: string; pricingNote: string;
  selectedPackage: string;
  packagePrices: { name: string; price: string; billing: string }[];
  extras: OfferExtra[];
};

export const offerAdaptationSchema = schemaOf({
  title: "", subtitle: "", badge: "", packageIntro: "", followupIntro: "", practicalIntro: "", pricingNote: "",
  selectedPackage: "",
  packagePrices: [{ name: "", price: "", billing: "" }],
  extras: [{ name: "", price: "", billing: "", description: "", condition: "" }],
});

export function applyAdaptation(customer: string, a: OfferAdaptation): OfferContent {
  const offer = defaultOffer(customer);
  if (a.title?.trim()) offer.title = a.title.trim();
  if (a.subtitle?.trim()) offer.subtitle = a.subtitle.trim();
  if (a.badge?.trim()) offer.badge = a.badge.trim();
  if (a.packageIntro?.trim()) offer.packageIntro = a.packageIntro.trim();
  if (a.followupIntro?.trim()) offer.followupIntro = a.followupIntro.trim();
  if (a.practicalIntro?.trim()) offer.practicalIntro = a.practicalIntro.trim();
  if (a.pricingNote?.trim()) offer.pricingNote = a.pricingNote.trim();
  for (const override of a.packagePrices ?? []) {
    const pkg = offer.packages.find((p) => p.name === override.name);
    if (!pkg) continue;
    if (override.price?.trim()) pkg.price = override.price.trim();
    if (override.billing?.trim()) pkg.billing = override.billing.trim();
  }
  if (offer.packages.some((p) => p.name === a.selectedPackage)) offer.selectedPackage = a.selectedPackage;
  const metricFor = (name: string) => offer.packages.find((p) => p.name === name)?.price;
  const bas = metricFor("Hälsoundersökning Bas");
  const plus = metricFor("Hälsoundersökning Plus");
  const basMetric = offer.metrics[0];
  const plusMetric = offer.metrics[1];
  if (bas && basMetric) offer.metrics[0] = { value: bas, label: basMetric.label };
  if (plus && plusMetric) offer.metrics[1] = { value: plus, label: plusMetric.label };
  offer.extras = (a.extras ?? []).filter((e) => e.name?.trim());
  return offer;
}

export const adaptationRules = `
Du ska INTE skriva en ny offert. Grundmallen är fast och färdigskriven. Du returnerar bara de fält som ska anpassas efter mötesanteckningarna; allt annat i mallen lämnas orört.
Anpassa: title och subtitle (nämn kundens namn naturligt), badge (t.ex. "Offert · Hälsoundersökning Bas"), packageIntro, followupIntro, practicalIntro och pricingNote (korta, konkreta, anpassade efter kundens bransch och behov), selectedPackage (huvudupplägget, Bas om inget annat framgår), packagePrices (endast priser som avviker från standardpriserna, matcha paketnamnen exakt) och extras (relevanta tillval, tom lista när inga tillval är relevanta).
Standardpriser: ${packagePriceText} Kundspecifika priser som uttryckligen finns i anteckningarna har företräde inom den offerten. ${pricePrecedenceRule} Ange bara priser i packagePrices som ska ändras.
Tillvalspriser: ${extraPriceText}. Screening för vibration och Vibrationstester är olika tjänster.
Prisfält bara belopp och kr (t.ex. "2 490 kr"), aldrig "från" eller "/person"; enheten/perioden/betalaren hör till billing. Inget standardpris är per år om inte anteckningarna anger årsavtal; undantag sjuk- och friskanmälan som är per år/person.
Medicinska kontroller bara vid relevant exponering; nattarbete separat tillval med "Pris enligt offert" om pris saknas. Lägg inte till andra tjänster utan stöd i källunderlaget. Varje extras-description högst 55 ord. Hitta inte på garantier, kundresultat eller medicinska påståenden.
`;

export const offerRules = `
Använd grundmallen som FAST textunderlag. Kopiera dess formuleringar i huvudsak, inte en helt nyskriven offert. Anpassa kundnamn, introduktion, erbjudande, betalare, priser och relevanta tillval efter mötesanteckningarna.
Vanligtvis fyra sidor: introduktion, undersökningsupplägg, rapport/uppföljning och praktiskt/pris. Extra tjänster läggs i extras, som ger extra sidor. Extras ska vara tom när inga tillval är relevanta.
Standardpriser: ${packagePriceText} Kundspecifika priser som uttryckligen finns i anteckningarna har företräde inom den offerten. ${pricePrecedenceRule} Uppdatera alla upprepade prisuppgifter konsekvent: metrics, packages och extras.
Tillvalspriser: ${extraPriceText}. Screening för vibration och Vibrationstester är olika tjänster.
Behåll Digital/Bas/Plus-alternativen om kunden inte uttryckligen önskar enbart vissa nivåer. selectedPackage är huvudupplägget (Bas om inget annat framgår). Om Plus är en egenbetald uppgradering: beskriv detta endast när anteckningarna anger det. Använd uttrycklig uppgraderingskostnad om angiven, annars skillnaden mellan avtalade Bas- och Plus-priser. Hitta aldrig på att företaget betalar Bas för alla eller att Plus är egenbetalt utan stöd.
Inget standardpris är per år om inte anteckningarna anger årsavtal; undantag sjuk- och friskanmälan som är per år/person. Prisfält bara belopp och kr; enheten/perioden/betalaren hör till billing.
Behåll 4 steps, högst 3 packages, 3 reasons, 3 arrangement, 5 followups, 6 employer och 6 practical. Korta fält så att sidlayouten passar (vanligen högst 35 ord per text, 8 ord per rubrik; titel högst 12 ord). extras kan innehålla många tjänster; varje description högst 55 ord. Medicinska kontroller bara vid relevant exponering; nattarbete separat tillval med Pris enligt offert om pris saknas. Lägg inte till andra tjänster utan stöd i källunderlaget. Följ lagkrav och skriv inte att en screening automatiskt ersätter lagstadgad medicinsk kontroll.
`;