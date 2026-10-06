import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExaminationContents } from "@/components/ExaminationContents";
import { basContents, plusContents, examinationRules } from "@/lib/examination-content";

describe("Examination contents", () => {
  it("includes all Bas markers and only the extra markers in Plus", () => {
    expect(basContents).toHaveLength(19);
    expect(plusContents).toHaveLength(25);
    expect(plusContents.slice(0, 19)).toEqual(basContents);
    expect(plusContents.join(" ")).not.toMatch(/natt/i);
    expect(examinationRules).toContain("ingår INTE i Bas eller Plus");
  });
  it("opens and closes both examination disclosures", () => {
    render(<ExaminationContents />);
    for (const name of ["OneLab Bas", "OneLab Plus"]) {
      const button = screen.getByRole("button", { name: `Innehåll i ${name}` });
      expect(button).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
  });
});