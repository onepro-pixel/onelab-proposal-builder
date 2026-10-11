import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { defaultOffer, offerSchema } from "@/lib/offer-template";
import { ProposalDocument } from "@/components/ProposalDocument";
import type { ProposalContent } from "@/lib/proposal-types";

describe("reference offer", () => {
  it("uses standard prices and four pages without extras", () => {
    const offer = defaultOffer("Testkund");
    expect(offer.packages.map((p) => p.price)).toEqual(["1 290 kr", "2 690 kr", "3 190 kr"]);
    const content = { offer, title: offer.title, subtitle: offer.subtitle, contact: { name: "", email: "", web: "" } } as ProposalContent;
    const { container } = render(<ProposalDocument content={content} customerName="Testkund" />);
    expect(container.querySelectorAll(".offer-page")).toHaveLength(4);
    expect(screen.getByText("Hälsoundersökning för Testkund")).toBeDefined();
  });
  it("adds pages for extras with visible mandatory conditions", () => {
    const offer = defaultOffer("Industrikund");
    offer.extras = Array.from({ length: 5 }, (_, i) => ({ name: `Test ${i}`, price: "1 490 kr", billing: "per person", description: "Beskrivning", condition: "Minst 10 personer per tillfälle" }));
    const { container } = render(<ProposalDocument content={{ offer, title: offer.title, subtitle: offer.subtitle, contact: { name: "", email: "", web: "" } } as ProposalContent} customerName="Industrikund" />);
    expect(container.querySelectorAll(".offer-page")).toHaveLength(6);
    expect(container.querySelectorAll(".offer-condition")).toHaveLength(5);
  });
  it("has a strict structured-output schema", () => {
    function check(schema: Record<string, unknown>) {
      if (schema["type"] === "object") {
        const props = schema["properties"] as Record<string, Record<string, unknown>>;
        expect(schema["additionalProperties"]).toBe(false);
        expect(schema["required"]).toEqual(Object.keys(props));
        Object.values(props).forEach(check);
      } else if (schema["type"] === "array") check(schema["items"] as Record<string, unknown>);
    }
    check(offerSchema);
  });
});
describe("applyAdaptation", () => {
  it("keeps the fixed template and only applies adaptable fields", () => {
    const offer = applyAdaptation("Byggbolaget AB", {
      title: "", subtitle: "", badge: "", packageIntro: "", followupIntro: "", practicalIntro: "", pricingNote: "",
      selectedPackage: "Hälsoundersökning Bas",
      packagePrices: [{ name: "Hälsoundersökning Bas", price: "2 490 kr", billing: "per medarbetare" }],
      extras: [
        { name: "Vibrationstester", price: "1 490 kr", billing: "per person", description: "För exponerade yrkesgrupper.", condition: "Minst 10 personer per tillfälle." },
      ],
    });
    // Fast malltext finns kvar
    expect(offer.followupHeading).toBe(defaultOffer("Byggbolaget AB").followupHeading);
    expect(offer.steps).toEqual(defaultOffer("Byggbolaget AB").steps);
    // Anpassade fält
    expect(offer.packages.find((p) => p.name === "Hälsoundersökning Bas")?.price).toBe("2 490 kr");
    expect(offer.metrics[0].value).toBe("2 490 kr");
    expect(offer.packages.find((p) => p.name === "Hälsoundersökning Digital")?.price).toBe("1 290 kr");
    expect(offer.extras).toHaveLength(1);
    expect(offer.selectedPackage).toBe("Hälsoundersökning Bas");
  });

  it("ignores unknown package names and invalid selectedPackage", () => {
    const offer = applyAdaptation("Kund AB", {
      title: "", subtitle: "", badge: "", packageIntro: "", followupIntro: "", practicalIntro: "", pricingNote: "",
      selectedPackage: "Hittepåpaket",
      packagePrices: [{ name: "Hittepåpaket", price: "1 kr", billing: "" }],
      extras: [],
    });
    expect(offer.selectedPackage).toBe("Hälsoundersökning Bas");
    expect(offer.packages.map((p) => p.price)).toEqual(["1 290 kr", "2 690 kr", "3 190 kr"]);
  });
});
