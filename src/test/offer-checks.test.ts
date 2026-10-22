import { describe, it, expect } from "vitest";
import { applyAdaptation, defaultOffer, type OfferAdaptation, type OfferContent } from "@/lib/offer-template";
import { checkOffer } from "@/lib/offer-checks";
import { extraPriceText, findStandardExtra, formatKr, packagePriceText, STANDARD_EXTRAS } from "@/lib/pricing-catalog";

const emptyAdaptation: OfferAdaptation = {
  title: "", subtitle: "", badge: "", packageIntro: "", followupIntro: "", practicalIntro: "", pricingNote: "",
  selectedPackage: "Hälsoundersökning Bas", packagePrices: [], extras: [],
};

function offerWith(change: (o: OfferContent) => void, customer = "Testkund AB"): OfferContent {
  const offer = defaultOffer(customer);
  change(offer);
  return offer;
}

describe("pricing catalog", () => {
  it("formats kronor with plain-space thousands separators", () => {
    expect(formatKr(1290)).toBe("1 290 kr");
    expect(formatKr(490)).toBe("490 kr");
    expect(formatKr(12500)).toBe("12 500 kr");
  });
  it("generates the prompt price text from the catalog", () => {
    expect(packagePriceText).toBe("Digital 1 290 kr/person; Bas 2 690 kr/person; Plus 3 190 kr/person.");
    expect(extraPriceText).toContain("Vibrationstester 1 490 kr/person (MINST 10 personer per tillfälle");
    expect(extraPriceText).toContain("Sjuk- och friskanmälan verktyg 490 kr/år/person");
    expect(STANDARD_EXTRAS).toHaveLength(6);
  });
  it("tells screening and vibration tests apart", () => {
    expect(findStandardExtra("Screening för vibration")?.price).toBe(490);
    expect(findStandardExtra("Vibrationstester med läkarintyg")?.price).toBe(1490);
    expect(findStandardExtra("Okänd tjänst")).toBeUndefined();
  });
});

describe("checkOffer", () => {
  it("is quiet for the untouched standard offer", () => {
    expect(checkOffer(defaultOffer("Testkund AB"), "Testkund AB", "")).toEqual([]);
  });

  it("flags a package price that deviates from standard and is not in the notes", () => {
    const offer = applyAdaptation("Testkund AB", { ...emptyAdaptation, packagePrices: [{ name: "Hälsoundersökning Bas", price: "2 190 kr", billing: "per medarbetare" }] });
    const warnings = checkOffer(offer, "Testkund AB", "Vi pratade om hälsoundersökning för 30 personer.");
    expect(warnings.some((w) => w.message.includes("2 190 kr") && w.message.includes("standardpriset"))).toBe(true);
  });

  it("accepts a deviating price that the notes actually mention, in any spacing", () => {
    const offer = applyAdaptation("Testkund AB", { ...emptyAdaptation, packagePrices: [{ name: "Hälsoundersökning Bas", price: "2 190 kr", billing: "per medarbetare" }] });
    for (const notes of ["Överenskommet pris: 2190 kr per person", "Pris 2 190 kr", "Pris 2.190 kr", "Pris 2 190 kr"]) {
      expect(checkOffer(offer, "Testkund AB", notes)).toEqual([]);
    }
  });

  it("requires the minimum-persons condition on vibration tests", () => {
    const offer = offerWith((o) => {
      o.extras = [{ name: "Vibrationstester", price: "1 490 kr", billing: "per person", description: "Läkarledda tester.", condition: "" }];
    });
    const warnings = checkOffer(offer, "Testkund AB", "");
    expect(warnings.some((w) => w.level === "error" && w.message.includes("minst 10 personer"))).toBe(true);
    offer.extras[0]!.condition = "Minst 10 personer per tillfälle.";
    expect(checkOffer(offer, "Testkund AB", "")).toEqual([]);
  });

  it("flags leftover placeholders, missing customer name and unknown extras", () => {
    const offer = offerWith((o) => {
      o.pricingNote = "Vi berättar gärna mer för [kund].";
      o.title = "Hälsoundersökning";
      o.subtitle = "Ingen namnnämning här.";
      o.extras = [{ name: "Ögonbottenfoto", price: "800 kr", billing: "per person", description: "Test", condition: "" }];
    });
    const warnings = checkOffer(offer, "Testkund AB", "");
    expect(warnings.some((w) => w.level === "error" && w.message.includes("platshållare"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("Kundnamnet"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("Ögonbottenfoto") && w.message.includes("standardlistan"))).toBe(true);
  });

  it("flags bad price formats, inconsistent cover metrics and an invalid selected package", () => {
    const offer = offerWith((o) => {
      const plus = o.packages.find((p) => p.name === "Hälsoundersökning Plus");
      if (plus) plus.price = "från 3 190 kr";
      const bas = o.packages.find((p) => p.name === "Hälsoundersökning Bas");
      if (bas) bas.price = "2 690 kr";
      o.metrics[0]!.value = "2 490 kr";
      o.selectedPackage = "Hittepå";
    });
    const warnings = checkOffer(offer, "Testkund AB", "");
    expect(warnings.some((w) => w.message.includes("oväntat format"))).toBe(true);
    expect(warnings.some((w) => w.message.includes("Försättsbladet"))).toBe(true);
    expect(warnings.some((w) => w.level === "error" && w.message.includes("Valt paket"))).toBe(true);
  });

  it("accepts 'Pris enligt offert' for extras such as night work", () => {
    const offer = offerWith((o) => {
      o.extras = [{ name: "Nattarbete", price: "Pris enligt offert", billing: "per person", description: "Undersökning för nattarbetare.", condition: "" }];
    });
    expect(checkOffer(offer, "Testkund AB", "")).toEqual([]);
  });
});
