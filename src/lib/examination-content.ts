export const basContents = [
  "Stress och utmattning (PSS)",
  "Sömn och återhämtning (ISI)",
  "Depressionsrisk (PHQ-9)",
  "Ångest och oro (GAD-7)",
  "Fysisk aktivitet (SGPALS)",
  "Alkohol och riskbruk (AUDIT)",
  "Matvanor", "Kvinnohälsa", "Arbetsmiljö",
  "Systoliskt blodtryck", "Diastoliskt blodtryck", "Total kolesterol",
  "LDL (onda kolesterolet)", "HDL (goda kolesterolet)",
  "Triglycerider (blodfetter)", "HbA1c (långtidsblodsocker)",
  "hsCRP (infektion och inflammation)", "Puls", "Syremättnad",
] as const;

export const plusContents = [
  ...basContents,
  "TSH (sköldkörtelfunktion)", "Hemoglobin (blodvärde)",
  "Kreatinin (njurfunktion)", "ALAT (leverfunktion)",
  "Transferrin (järnbalans)", "Auskultation",
] as const;

export const examinationRules = `
OneLab Bas innehåller exakt: ${basContents.join("; ")}.
OneLab Plus innehåller exakt: ${plusContents.join("; ")}.
Nattarbetsundersökning ingår INTE i Bas eller Plus. Det är ett separat tillval endast när kundens bransch/anteckningar visar behov av nattarbete. Om pris saknas: ange "Pris enligt offert", hitta inte på ett pris.
Dessa paketregler gäller även om äldre standardtexter eller ett befintligt utkast säger något annat.
`;