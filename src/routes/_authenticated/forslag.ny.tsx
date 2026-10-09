import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateProposal } from "@/lib/proposals.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/forslag/ny")({
  head: () => ({
    meta: [
      { title: "Ny offert – OneLab" },
      { name: "description", content: "Skapa ett nytt kundförslag från mötesanteckningar." },
      { property: "og:title", content: "Ny offert – OneLab" },
      { property: "og:description", content: "Skapa ett nytt kundförslag från mötesanteckningar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewProposal,
});

function NewProposal() {
  const navigate = useNavigate();
  const generate = useServerFn(generateProposal);
  const [customer, setCustomer] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      toast.error("Logga in igen för att skapa förslaget.");
      return;
    }
    const { data, error } = await supabase
      .from("proposals")
      .insert({ customer_name: customer, contact_person: contact, notes, user_id: u.user.id })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(false);
      toast.error("Kunde inte spara förslaget.");
      return;
    }
    try {
      await generate({ data: { id: data.id } });
      navigate({ to: "/forslag/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI:n kunde inte skriva förslaget.");
      navigate({ to: "/forslag/$id", params: { id: data.id } });
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow mb-3">Ny offert</p>
      <h1 className="display text-5xl">Från anteckningar till förslag</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Klistra in anteckningarna från Sales Kong. AI:n skriver ett skräddarsytt förslag utifrån OneLabs tjänster – du kan redigera allt efteråt.
      </p>

      <form onSubmit={submit} className="mt-12 space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="c">Kundnamn</Label>
            <Input id="c" required value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="t.ex. Exeger" className="h-12 bg-paper" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p">Kontaktperson</Label>
            <Input id="p" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Namn, roll" className="h-12 bg-paper" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="n">Mötesanteckningar</Label>
          <Textarea
            id="n"
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Klistra in anteckningarna från Sales Kong här…"
            className="min-h-[360px] bg-paper p-5 text-base leading-relaxed"
          />
        </div>
        <Button type="submit" disabled={busy} className="h-12 rounded-full px-8">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Skriver förslaget…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Skapa förslag
            </>
          )}
        </Button>
      </form>
    </main>
  );
}
