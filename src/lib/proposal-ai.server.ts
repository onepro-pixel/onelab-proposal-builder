import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema, Output, streamText } from "ai";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./ai-run-id.server.ts";
import { proposalSchema, type ProposalContent } from "./proposal-types";
import { applyAdaptation, offerAdaptationSchema, offerSchema, type OfferAdaptation, type OfferContent } from "./offer-template";

function strictSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strictSchema);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const next = Object.fromEntries(Object.entries(source).map(([key, v]) => [key, strictSchema(v)]));
  if (source["type"] === "object") next["additionalProperties"] = false;
  return next;
}

async function callAI<T>(system: string, user: string, schema: unknown): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI-tjänsten är inte konfigurerad.");
  const request = getRequest();
  const run = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const response = await run.fetch(input, init);
      response.headers.forEach((value, name) => {
        if (name.toLowerCase().startsWith("x-lovable-aig-")) setResponseHeader(name, value);
      });
      if (!response.ok) {
        const body = await response.clone().json().catch(() => null);
        const message = body?.message ?? body?.error?.message;
        throw new Error(typeof message === "string" ? message : `AI-tjänsten kunde inte svara (${response.status}).`);
      }
      return response;
    },
  });
  let streamError: Error | null = null;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"), system,
    messages: [{ role: "user", content: user }], maxRetries: 0,
    abortSignal: request.signal,
    onError: ({ error }) => {
      streamError = error instanceof Error ? error : new Error(String(error));
    },
    providerOptions: { openai: {
      forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto",
      store: false, include: ["reasoning.encrypted_content"],
    } },
    output: Output.object({ schema: jsonSchema<T>(strictSchema(schema) as Parameters<typeof jsonSchema>[0]) }),
  });
  try {
    return await result.output;
  } catch (error) {
    const captured = streamError as Error | null;
    if (captured) throw new Error(captured.message);
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("AI:n kunde inte skriva ett komplett förslag. Din text finns kvar.");
  }
}

export async function writeProposal(system: string, user: string, useOffer = false): Promise<ProposalContent> {
  const output = await callAI<Omit<ProposalContent, "contact"> | OfferContent>(system, user, useOffer ? offerSchema : proposalSchema);
  const contact = { name: "", email: "", web: "onelab.se/kontakt" };
  if (useOffer) {
    const offer = output as OfferContent;
    return { offer, title: offer.title, subtitle: offer.subtitle, contact } as ProposalContent;
  }
  return { ...output, contact } as ProposalContent;
}

// Initial generation: the AI only adapts the fixed template's variable fields.
export async function writeOfferAdaptation(system: string, user: string, customer: string): Promise<ProposalContent> {
  const adaptation = await callAI<OfferAdaptation>(system, user, offerAdaptationSchema);
  const offer = applyAdaptation(customer, adaptation);
  return { offer, title: offer.title, subtitle: offer.subtitle, contact: { name: "", email: "", web: "onelab.se/kontakt" } } as ProposalContent;
}