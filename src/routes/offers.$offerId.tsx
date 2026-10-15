import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/offers/$offerId")({
  component: OfferEditor,
  head: () => ({ meta: [{ title: "Redigera offert – Proposo" }] }),
});

type Offer = {
  id: string;
  owner_id: string;
  title: string;
  customer_name: string;
  status: "draft" | "completed";
  content: { introduction?: string; scope?: string; pricing_notes?: string };
};
type Draft = {
  title: string;
  customer_name: string;
  introduction: string;
  scope: string;
  pricing_notes: string;
};
const toDraft = (offer: Offer): Draft => ({
  title: offer.title,
  customer_name: offer.customer_name,
  introduction: offer.content?.introduction ?? "",
  scope: offer.content?.scope ?? "",
  pricing_notes: offer.content?.pricing_notes ?? "",
});

function OfferEditor() {
  const { offerId } = Route.useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editable, setEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "pending" | "saving" | "error">("saved");
  const lastSaved = useRef("");
  const saveSequence = useRef(Promise.resolve());
  const revision = useRef(0);
  const isCurrent = useRef(true);

  useEffect(() => {
    isCurrent.current = true;
    let active = true;
    setLoading(true);
    setDraft(null);
    setError("");
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate({ to: "/auth", replace: true }); return; }
      const { data, error: loadError } = await supabase.from("proposals")
        .select("id, owner_id, title, customer_name, status, content")
        .eq("id", offerId).maybeSingle();
      if (!active) return;
      if (loadError) { setError(loadError.message); setLoading(false); return; }
      if (!data) { setError("Offerten finns inte eller så saknar du behörighet."); setLoading(false); return; }
      const offer = data as Offer;
      const initial = toDraft(offer);
      lastSaved.current = JSON.stringify(initial);
      setEditable(offer.owner_id === auth.user.id);
      setDraft(initial);
      setSaveState("saved");
      setLoading(false);
    })();
    return () => { active = false; isCurrent.current = false; };
  }, [offerId, navigate]);

  useEffect(() => {
    if (!draft || !editable) return;
    const snapshot = JSON.stringify(draft);
    if (snapshot === lastSaved.current) return;
    setSaveState("pending");
    const currentRevision = ++revision.current;
    const timer = setTimeout(() => {
      // Serialize writes so an older response cannot overwrite a newer draft.
      saveSequence.current = saveSequence.current.catch(() => {}).then(async () => {
        if (!isCurrent.current || currentRevision !== revision.current) return;
        setSaveState("saving");
        const payload = JSON.parse(snapshot) as Draft;
        const { error: saveError } = await supabase.from("proposals").update({
          title: payload.title,
          customer_name: payload.customer_name,
          content: {
            introduction: payload.introduction,
            scope: payload.scope,
            pricing_notes: payload.pricing_notes,
          },
        }).eq("id", offerId).eq("owner_id", (await supabase.auth.getUser()).data.user?.id ?? "");
        if (!isCurrent.current || currentRevision !== revision.current) return;
        if (saveError) { setSaveState("error"); setError(saveError.message); }
        else { lastSaved.current = snapshot; setSaveState("saved"); setError(""); }
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [draft, editable, offerId]);

  function change(field: keyof Draft, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  return <main className="mx-auto max-w-4xl space-y-7 px-6 py-10">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/offers" className="text-sm underline">Tillbaka till offerter</Link>
      <span role="status" className="text-sm text-muted-foreground">
        {loading ? "Hämtar…" : !editable ? "Endast läsning" :
          saveState === "pending" ? "Ändringar väntar på sparning…" :
          saveState === "saving" ? "Sparar…" :
          saveState === "error" ? "Kunde inte spara" : "Alla ändringar sparade"}
      </span>
    </header>
    <div><p className="text-sm text-muted-foreground">Proposo / Offertutkast</p>
      <h1 className="text-3xl font-semibold">Redigera offert</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ändringar sparas automatiskt när du slutar skriva.</p>
    </div>
    {error && <p role="alert" className="rounded-md border p-3 text-sm text-destructive">{error}</p>}
    {draft && <div className="space-y-5">
      <label className="block space-y-2"><span className="text-sm font-medium">Offerttitel</span>
        <input disabled={!editable} maxLength={160} value={draft.title} onChange={(e) => change("title", e.target.value)}
          className="w-full rounded-md border bg-background p-3 disabled:opacity-70" /></label>
      <label className="block space-y-2"><span className="text-sm font-medium">Kund</span>
        <input disabled={!editable} maxLength={160} value={draft.customer_name} onChange={(e) => change("customer_name", e.target.value)}
          className="w-full rounded-md border bg-background p-3 disabled:opacity-70" /></label>
      {([
        ["introduction", "Inledning"],
        ["scope", "Omfattning och upplägg"],
        ["pricing_notes", "Priser och villkor"],
      ] as const).map(([key, label]) =>
        <label key={key} className="block space-y-2"><span className="text-sm font-medium">{label}</span>
          <textarea disabled={!editable} rows={6} value={draft[key]} onChange={(e) => change(key, e.target.value)}
            className="w-full resize-y rounded-md border bg-background p-3 disabled:opacity-70" /></label>)}
    </div>}
  </main>;
}
