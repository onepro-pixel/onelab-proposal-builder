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
type ProposalTheme = "midnight" | "ocean" | "forest";
type ContentBlock = { id: string; heading: string; body: string };
type Draft = {
  theme: ProposalTheme;
  sender_name: string;
  logo_url: string;
  blocks: ContentBlock[];
  title: string;
  customer_name: string;
  introduction: string;
  scope: string;
  pricing_notes: string;
};
const toDraft = (offer: Offer): Draft => ({
  theme: offer.content?.theme === "ocean" || offer.content?.theme === "forest" ? offer.content.theme : "midnight",
  sender_name: typeof offer.content?.sender_name === "string" ? offer.content.sender_name : "",
  logo_url: typeof offer.content?.logo_url === "string" ? offer.content.logo_url : "",
  title: offer.title,
  customer_name: offer.customer_name,
  introduction: offer.content?.introduction ?? "",
  scope: offer.content?.scope ?? "",
  pricing_notes: offer.content?.pricing_notes ?? "",
  blocks: Array.isArray(offer.content?.blocks) ? (offer.content.blocks as ContentBlock[]).filter((b) => b && typeof b.id === "string" && typeof b.heading === "string" && typeof b.body === "string") : [],
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
          blocks: payload.blocks,
          theme: payload.theme,
          sender_name: payload.sender_name,
          logo_url: payload.logo_url,
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


  function focusSection(field: "introduction" | "scope" | "pricing_notes") {
    document.getElementById(`offer-field-${field}`)?.focus();
    document.getElementById(`offer-field-${field}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function changeTheme(theme: ProposalTheme) {
    setDraft((current) => current ? { ...current, theme } : current);
  }

  function addBlock() {
    setDraft((current) => current ? { ...current, blocks: [...current.blocks, { id: crypto.randomUUID(), heading: "Nytt avsnitt", body: "" }] } : current);
  }

  function updateBlock(id: string, field: "heading" | "body", value: string) {
    setDraft((current) => current ? { ...current, blocks: current.blocks.map((block) => block.id === id ? { ...block, [field]: value } : block) } : current);
  }

  function moveBlock(index: number, offset: number) {
    setDraft((current) => { if (!current || index + offset < 0 || index + offset >= current.blocks.length) return current;
      const blocks = [...current.blocks]; [blocks[index], blocks[index + offset]] = [blocks[index + offset], blocks[index]]; return { ...current, blocks }; });
  }

  function removeBlock(id: string) {
    setDraft((current) => current ? { ...current, blocks: current.blocks.filter((block) => block.id !== id) } : current);
  }

  function change(field: "title" | "customer_name" | "introduction" | "scope" | "pricing_notes" | "sender_name" | "logo_url", value: string) {
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
    {draft && <div className="grid gap-8 lg:grid-cols-2"><div className="space-y-5"><nav aria-label="Offertens avsnitt" className="flex flex-wrap gap-2">{([["introduction","Inledning"],["scope","Omfattning"],["pricing_notes","Priser och villkor"]] as const).map(([field,label]) => <button key={field} type="button" onClick={() => focusSection(field)} className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted">{label}</button>)}</nav>
      <fieldset className="space-y-2 rounded-lg border p-4"><legend className="px-1 text-sm font-semibold">Designprofil</legend>
        <div className="flex flex-wrap gap-2">{([["midnight","Midnight","#17243d"],["ocean","Ocean","#0d6b86"],["forest","Forest","#24634d"]] as const).map(([theme,label,color]) => <button type="button" key={theme} disabled={!editable} aria-pressed={draft.theme === theme} onClick={() => changeTheme(theme)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition disabled:opacity-50 ${draft.theme === theme ? "border-slate-900 ring-2 ring-slate-300" : "hover:bg-muted"}`}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{label}</button>)}</div>
        <p className="text-xs text-muted-foreground">Färgprofilen sparas automatiskt med offerten.</p>
      </fieldset>
      <fieldset className="space-y-3 rounded-lg border p-4"><legend className="px-1 text-sm font-semibold">Avsändare och logotyp</legend>
        <label className="block space-y-1"><span className="text-xs font-medium">Företagsnamn på offerten</span><input disabled={!editable} maxLength={120} value={draft.sender_name} onChange={(e) => change("sender_name", e.target.value)} placeholder="Ditt företag AB" className="w-full rounded-md border bg-background p-2" /></label>
        <label className="block space-y-1"><span className="text-xs font-medium">Logotyp (bildadress, HTTPS)</span><input disabled={!editable} type="url" value={draft.logo_url} onChange={(e) => change("logo_url", e.target.value)} placeholder="https://exempel.se/logotyp.png" className="w-full rounded-md border bg-background p-2" /></label>
        <p className="text-xs text-muted-foreground">Inställningarna gäller denna offert. Gemensam företagsprofil byggs separat.</p>
      </fieldset>
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
          <textarea id={`offer-field-${key}`} disabled={!editable} rows={6} value={draft[key]} onChange={(e) => change(key, e.target.value)}
            className="w-full resize-y rounded-md border bg-background p-3 disabled:opacity-70" /><span className="block text-right text-xs text-muted-foreground">{draft[key].trim() ? draft[key].trim().split(/\s+/).length : 0} ord</span></label>)}
      <div className="space-y-4 border-t pt-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Egna innehållsblock</h2><p className="text-xs text-muted-foreground">Lägg till och ordna avsnitt i offerten.</p></div><button type="button" disabled={!editable} onClick={addBlock} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">+ Lägg till block</button></div>
        {draft.blocks.map((block, index) => <section key={block.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Block {index + 1}</span><div className="flex gap-2">
            <button type="button" disabled={!editable || index === 0} onClick={() => moveBlock(index, -1)} className="rounded border px-2 py-1 text-xs disabled:opacity-30" aria-label="Flytta upp">↑</button>
            <button type="button" disabled={!editable || index === draft.blocks.length - 1} onClick={() => moveBlock(index, 1)} className="rounded border px-2 py-1 text-xs disabled:opacity-30" aria-label="Flytta ned">↓</button>
            <button type="button" disabled={!editable} onClick={() => removeBlock(block.id)} className="rounded border px-2 py-1 text-xs text-destructive disabled:opacity-30">Ta bort</button>
          </div></div>
          <label className="block space-y-1"><span className="text-xs font-medium">Rubrik</span><input disabled={!editable} value={block.heading} maxLength={120} onChange={(e) => updateBlock(block.id, "heading", e.target.value)} className="w-full rounded-md border bg-background p-2" /></label>
          <label className="block space-y-1"><span className="text-xs font-medium">Text</span><textarea disabled={!editable} value={block.body} rows={4} onChange={(e) => updateBlock(block.id, "body", e.target.value)} className="w-full resize-y rounded-md border bg-background p-2" /></label>
        </section>)}
      </div>
    </div><ProposalPreview draft={draft} onEdit={focusSection} /></div>}
  </main>;
}


function ProposalPreview({ draft, onEdit }: { draft: Draft; onEdit: (field: "introduction" | "scope" | "pricing_notes") => void }) {
  const accent = draft.theme === "ocean" ? "#0d6b86" : draft.theme === "forest" ? "#24634d" : "#17243d";
  return <section className="space-y-3 lg:sticky lg:top-6">
    <div className="flex justify-between"><h2 className="font-semibold">Förhandsvisning</h2><span className="text-xs text-muted-foreground">Liggande A4 · Live</span></div>
    <div className="aspect-[297/210] overflow-auto rounded-lg border bg-white text-slate-900 shadow-lg">
      <div className="h-2 w-full" style={{ backgroundColor: accent }} /><div className="p-7">
      <header className="flex justify-between border-b pb-3 text-xs uppercase tracking-widest"><div className="flex min-w-0 items-center gap-2">{/^https:\/\/[^\s]+$/i.test(draft.logo_url) && <img src={draft.logo_url} alt="Företagslogotyp" className="h-8 max-w-20 object-contain" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} />}<strong className="truncate" style={{ color: accent }}>{draft.sender_name || "Proposo"}</strong></div><span>Affärsförslag</span></header>
      <p className="mt-6 text-xs uppercase tracking-widest text-slate-500">Till {draft.customer_name || "Kund"}</p>
      <h3 className="mt-3 break-words text-2xl font-semibold" style={{ color: accent }}>{draft.title || "Offerttitel"}</h3>
      <div className="my-5 h-1 w-12" style={{ backgroundColor: accent }} />
      <div className="grid grid-cols-2 gap-6 text-xs leading-relaxed">
        <button type="button" onClick={() => onEdit("introduction")} className="w-full whitespace-pre-wrap break-words text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2" title="Redigera inledning">{draft.introduction || "Din inledning visas här. Klicka för att redigera."}</button>
        <div className="space-y-4 border-l pl-5">
          <section><h4 className="font-semibold">Omfattning och upplägg</h4><button type="button" onClick={() => onEdit("scope")} className="mt-2 w-full whitespace-pre-wrap break-words text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2">{draft.scope || "Beskriv erbjudandet. Klicka för att redigera."}</button></section>
          <section><h4 className="font-semibold">Priser och villkor</h4><button type="button" onClick={() => onEdit("pricing_notes")} className="mt-2 w-full whitespace-pre-wrap break-words text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2">{draft.pricing_notes || "Ange priser och villkor. Klicka för att redigera."}</button></section>
        </div>
      </div>
      {draft.blocks.length > 0 && <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5">{draft.blocks.map((block) => <section key={block.id} className="min-w-0"><h4 className="break-words text-xs font-semibold">{block.heading || "Avsnitt"}</h4><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">{block.body || "Skriv innehåll i blocket."}</p></section>)}</div>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Liveförhandsvisning. PDF-export och sidbrytning tillkommer senare.</p>
  </section>;
}
