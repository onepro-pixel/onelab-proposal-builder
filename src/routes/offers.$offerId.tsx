import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  content: (Record<string, unknown> & { introduction?: string; scope?: string; pricing_notes?: string }) | null;
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
  const draftRef = useRef<Draft | null>(null);
  const ownerRef = useRef("");
  const originalContent = useRef<Record<string, unknown>>({});
  const savingRef = useRef(false);

  useEffect(() => {
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
      originalContent.current = offer.content ?? {};
      const initial = toDraft(offer);
      lastSaved.current = JSON.stringify(initial);
      ownerRef.current = auth.user.id;
      setEditable(offer.owner_id === auth.user.id);
      setDraft(initial);
      setSaveState("saved");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [offerId, navigate]);

  // Keep the latest form available to explicit saves and navigation guards.
  draftRef.current = draft;

  async function persist(snapshot: string): Promise<boolean> {
    if (snapshot === lastSaved.current) return true;
    if (savingRef.current) {
      await saveSequence.current;
      if (snapshot === lastSaved.current) return true;
    }
    let succeeded = false;
    savingRef.current = true;
    setSaveState("saving");
    const payload = JSON.parse(snapshot) as Draft;
    const job = saveSequence.current.catch(() => {}).then(async () => {
      const { data, error: saveError } = await supabase.from("proposals").update({
        title: payload.title,
        customer_name: payload.customer_name,
        content: {
          ...originalContent.current,
          introduction: payload.introduction,
          scope: payload.scope,
          pricing_notes: payload.pricing_notes,
        },
      }).eq("id", offerId).eq("owner_id", ownerRef.current).select("id").maybeSingle();
      if (saveError || !data) {
        setError(saveError?.message ?? "Offerten kunde inte sparas. Kontrollera behörigheten.");
        setSaveState("error");
      } else {
        lastSaved.current = snapshot;
        succeeded = true;
        setError("");
        setSaveState(draftRef.current && JSON.stringify(draftRef.current) !== snapshot ? "pending" : "saved");
      }
    }).finally(() => { savingRef.current = false; });
    saveSequence.current = job;
    await job;
    return succeeded;
  }

  useEffect(() => {
    if (!draft || !editable) return;
    const snapshot = JSON.stringify(draft);
    if (snapshot === lastSaved.current) return;
    setSaveState("pending");
    const timer = setTimeout(() => { void persist(snapshot); }, 900);
    return () => clearTimeout(timer);
  }, [draft, editable, offerId]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (editable && draftRef.current && JSON.stringify(draftRef.current) !== lastSaved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [editable]);

  async function leaveEditor() {
    if (editable && draftRef.current) {
      const snapshot = JSON.stringify(draftRef.current);
      if (!(await persist(snapshot))) return;
    }
    navigate({ to: "/offers" });
  }


  function change(field: keyof Draft, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  return <main className="mx-auto max-w-7xl space-y-7 px-6 py-10">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={() => { void leaveEditor(); }} className="text-sm underline">Tillbaka till offerter</button>
      <div className="flex items-center gap-4"><span role="status" className="text-sm text-muted-foreground">
        {loading ? "Hämtar…" : !editable ? "Endast läsning" :
          saveState === "pending" ? "Ändringar väntar på sparning…" :
          saveState === "saving" ? "Sparar…" :
          saveState === "error" ? "Kunde inte spara" : "Alla ändringar sparade"}
      </span>
      {editable && draft && <button type="button" onClick={() => { void persist(JSON.stringify(draft)); }} className="rounded-md border px-3 py-2 text-sm">Spara nu</button>}</div>
    </header>
    <div><p className="text-sm text-muted-foreground">Proposo / Offertutkast</p>
      <h1 className="text-3xl font-semibold">Redigera offert</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ändringar sparas automatiskt när du slutar skriva.</p>
    </div>
    {error && <p role="alert" className="rounded-md border p-3 text-sm text-destructive">{error}</p>}
    {draft && <div className="grid gap-8 lg:grid-cols-2"><div className="space-y-5">
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
    </div><ProposalPreview draft={draft} /></div>}
  </main>;
}
