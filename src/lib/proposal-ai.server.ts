import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema, Output, streamText } from "ai";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./ai-run-id.server.ts";
import { proposalSchema, type ProposalContent } from "./proposal-types";

function strictSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strictSchema);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const next = Object.fromEntries(Object.entries(source).map(([key, v]) => [key, strictSchema(v)]));
  if (source["type"] === "object") next["additionalProperties"] = false;
  return next;
}

export async function writeProposal(system: string, user: string): Promise<ProposalContent> {
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
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"), system,
    messages: [{ role: "user", content: user }], maxRetries: 0,
    abortSignal: request.signal,
    providerOptions: { openai: {
      forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto",
      store: false, include: ["reasoning.encrypted_content"],
    } },
    output: Output.object({ schema: jsonSchema<Omit<ProposalContent, "contact">>(strictSchema(proposalSchema) as Parameters<typeof jsonSchema>[0]) }),
  });
  try {
    const output = await result.output;
    return { ...output, contact: { name: "", email: "", web: "onelab.se/kontakt" } };
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw new Error("AI:n kunde inte skriva ett komplett förslag. Din text finns kvar.");
  }
}