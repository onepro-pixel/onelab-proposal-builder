import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { proposalSchema, type ProposalContent } from "./proposal-types";

export const generateProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, claims } = context;
    const { data: p, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !p) throw new Error("Förslaget hittades inte");
    const { data: s } = await supabase.from("app_settings").select("*").eq("id", 1).single();

    const system = `Du är en erfaren säljare och skribent på OneLab, ett svenskt företag inom företagshälsa.
Du skriver skräddarsydda kundförslag på svenska utifrån mötesanteckningar från Sales Kong.

TON: ${s?.tone ?? ""}

ONELABS TJÄNSTER OCH PRISER (använd endast dessa, hitta inte på tjänster eller priser):
${s?.services ?? ""}

STANDARDTEXTER (återanvänd och anpassa):
${s?.standard_texts ?? ""}

Regler:
- Anpassa innehållet efter kundens bransch, roller, exponeringar och behov enligt anteckningarna.
- Ta bara med medicinska kontroller och tillägg som är relevanta för kunden.
- Rekommendera det paket som passar bäst men visa båda paketen.
- Nämn kundens namn naturligt i texterna. Korta, konkreta meningar.
- Hitta inte på siffror om antal anställda om de inte finns i anteckningarna.`;

    const user = `Kund: ${p.customer_name}
Kontaktperson: ${p.contact_person}

Mötesanteckningar:
${p.notes}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "write_proposal",
              description: "Skriv kundförslaget",
              parameters: proposalSchema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "write_proposal" } },
      }),
    });
    if (res.status === 429) throw new Error("För många förfrågningar just nu, försök igen om en stund.");
    if (res.status === 402) throw new Error("AI-krediterna är slut. Fyll på i arbetsytans inställningar.");
    if (!res.ok) throw new Error(`AI-fel (${res.status})`);
    const json = (await res.json()) as {
      choices: { message: { tool_calls?: { function: { arguments: string } }[] } }[];
    };
    const args = json.choices[0]?.message.tool_calls?.[0]?.function.arguments;
    if (!args) throw new Error("AI:n returnerade inget förslag");
    const content = JSON.parse(args) as ProposalContent;
    const email = (claims as { email?: string }).email ?? "";
    const local = email.split("@")[0] ?? "";
    const name = local
      .split(/[._-]/)
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase() + w.slice(1))
      .join(" ");
    content.contact = { name, email, web: "onelab.se/kontakt" };

    const { error: upErr } = await supabase
      .from("proposals")
      .update({ content: content as never })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return content;
  });

export const getSharedProposal = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await sb.rpc("get_shared_proposal", { _token: data.token });
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    if (!row) return null;
    return { customer_name: row.customer_name, content: row.content as unknown as ProposalContent };
  });
