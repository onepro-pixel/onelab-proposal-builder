import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExaminationContents } from "@/components/ExaminationContents";
import { digitalContents, basContents, plusContents, examinationRules } from "@/lib/examination-content";

describe("Examination contents", () => {
  it("includes all Bas markers and only the extra markers in Plus", () => {
    expect(digitalContents).toHaveLength(10);
    expect(basContents).toHaveLength(20);
    expect(plusContents).toHaveLength(26);
    expect(basContents.slice(0, 10)).toEqual(digitalContents);
    expect(plusContents.slice(0, 20)).toEqual(basContents);
    expect(digitalContents.join(" ")).not.toMatch(/blodtryck|kolesterol|HbA1c/);
    expect(plusContents.join(" ")).not.toMatch(/natt/i);
    expect(examinationRules).toContain("ingår INTE i Bas eller Plus");
  });
  it("opens and closes both examination disclosures", () => {
    render(<ExaminationContents />);
    for (const name of ["OneLab Digital", "OneLab Bas", "OneLab Plus"]) {
      const button = screen.getByRole("button", { name: `Innehåll i ${name}` });
      expect(button).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
  });
});