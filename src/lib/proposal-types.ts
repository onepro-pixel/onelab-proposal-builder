export type Item = { name: string; text: string };

export type ProposalContent = {
  title: string;
  subtitle: string;
  intro: { lead: string; body: string };
  steps: { title: string; text: string }[];
  highlight: { title: string; text: string };
  exams: { heading: string; intro: string; items: Item[]; note: string };
  program: { heading: string; intro: string; body: string; cost_note: string };
  hr: { heading: string; intro: string; items: Item[] };
  pricing: {
    heading: string;
    intro: string;
    packages: { name: string; price: string; features: string[] }[];
    addons: { name: string; price: string }[];
    note: string;
  };
  cost_control: { heading: string; intro: string; items: Item[]; formula: string };
  closing: { heading: string; text: string };
  contact: { name: string; email: string; web: string };
};

const item = {
  type: "object",
  properties: { name: { type: "string" }, text: { type: "string" } },
  required: ["name", "text"],
};

export const proposalSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "T.ex. 'Företagshälsa för Kundnamn'" },
    subtitle: { type: "string" },
    intro: {
      type: "object",
      properties: { lead: { type: "string" }, body: { type: "string" } },
      required: ["lead", "body"],
    },
    steps: {
      type: "array",
      description: "3-4 steg i upplägget, t.ex. Kartlägg, Följ upp, Fördjupa, Agera organisatoriskt",
      items: {
        type: "object",
        properties: { title: { type: "string" }, text: { type: "string" } },
        required: ["title", "text"],
      },
    },
    highlight: {
      type: "object",
      description: "Vad upplägget innebär specifikt för kunden",
      properties: { title: { type: "string" }, text: { type: "string" } },
      required: ["title", "text"],
    },
    exams: {
      type: "object",
      properties: {
        heading: { type: "string" },
        intro: { type: "string" },
        items: { type: "array", items: item },
        note: { type: "string" },
      },
      required: ["heading", "intro", "items", "note"],
    },
    program: {
      type: "object",
      properties: {
        heading: { type: "string" },
        intro: { type: "string" },
        body: { type: "string" },
        cost_note: { type: "string" },
      },
      required: ["heading", "intro", "body", "cost_note"],
    },
    hr: {
      type: "object",
      properties: {
        heading: { type: "string" },
        intro: { type: "string" },
        items: { type: "array", items: item },
      },
      required: ["heading", "intro", "items"],
    },
    pricing: {
      type: "object",
      properties: {
        heading: { type: "string" },
        intro: { type: "string" },
        packages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              price: { type: "string", description: "t.ex. '1 990 kr'" },
              features: { type: "array", items: { type: "string" } },
            },
            required: ["name", "price", "features"],
          },
        },
        addons: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, price: { type: "string" } },
            required: ["name", "price"],
          },
        },
        note: { type: "string" },
      },
      required: ["heading", "intro", "packages", "addons", "note"],
    },
    cost_control: {
      type: "object",
      properties: {
        heading: { type: "string" },
        intro: { type: "string" },
        items: { type: "array", items: item },
        formula: { type: "string" },
      },
      required: ["heading", "intro", "items", "formula"],
    },
    closing: {
      type: "object",
      properties: { heading: { type: "string" }, text: { type: "string" } },
      required: ["heading", "text"],
    },
  },
  required: [
    "title",
    "subtitle",
    "intro",
    "steps",
    "highlight",
    "exams",
    "program",
    "hr",
    "pricing",
    "cost_control",
    "closing",
  ],
} as const;
