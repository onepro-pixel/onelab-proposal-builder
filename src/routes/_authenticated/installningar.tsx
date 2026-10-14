import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/installningar")({
  head: () => ({
    meta: [
      { title: "Inställningar – Proposo" },
      { name: "description", content: "Tjänstebeskrivningar och standardtexter för AI:n." },
      { property: "og:title", content: "Inställningar – Proposo" },
      { property: "og:description", content: "Tjänstebeskrivningar och standardtexter för AI:n." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

const fields = [
  { key: "services", label: "Tjänster och priser", hint: "Allt AI:n får erbjuda. Uppdatera när tjänster eller priser ändras.", rows: 22 },
  { key: "standard_texts", label: "Standardtexter", hint: "Formuleringar som AI:n återanvänder, t.ex. kostnadskontroll och avslutning.", rows: 8 },
  { key: "tone", label: "Ton och stil", hint: "Hur förslagen ska låta.", rows: 4 },
] as const;

function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({ services: "", standard_texts: "", tone: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setForm({ services: data.services, standard_texts: data.standard_texts, tone: data.tone });
  }, [data]);

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("app_settings").update(form).eq("id", 1);
    setBusy(false);
    if (error) {
      toast.error("Kunde inte spara");
      return;
    }
    toast.success("Inställningarna är sparade");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow mb-3">Inställningar</p>
          <h1 className="display text-5xl">Det AI:n vet om ditt företag</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">Inställningarna styr hur nya förslag skrivs. Företagsseparering behöver införas innan tjänsten öppnas för flera organisationer.</p>
        </div>
        <Button onClick={save} disabled={busy} className="h-11 rounded-full px-6">
          Spara
        </Button>
      </div>
      <div className="mt-12 space-y-10">
        {fields.map((f) => (
          <div key={f.key} className="grid gap-6 border-t pt-8 md:grid-cols-[14rem_1fr]">
            <div>
              <p className="font-medium">{f.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.hint}</p>
            </div>
            <Textarea
              rows={f.rows}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="bg-paper font-sans text-sm leading-relaxed"
            />
          </div>
        ))}
      </div>
    </main>
  );
}
