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
  const [printWarning, setPrintWarning] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [priceWarnings, setPriceWarnings] = useState<string[]>([]);
  const [catalogPrices, setCatalogPrices] = useState<{ name: string; price_sek: number | null; unit: string }[]>([]);
  const [notesPreview, setNotesPreview] = useState<{ introduction: string; scope: string; pricing_notes: string } | null>(null);
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
        .select("id, owner_id, organization_id, title, customer_name, status, content")
        .eq("id", offerId).maybeSingle();
      if (!active) return;
      if (loadError) { setError(loadError.message); setLoading(false); return; }
      if (!data) { setError("Offerten finns inte eller så saknar du behörighet."); setLoading(false); return; }
      const offer = data as Offer & { organization_id: string };
      const { data: products } = await supabase.from("organization_products").select("name,price_sek,unit").eq("organization_id", offer.organization_id).eq("is_active", true).order("name").limit(100);
      if (!active) return;
      setCatalogPrices((products ?? []) as { name: string; price_sek: number | null; unit: string }[]);
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

  async function printOffer() {
    if (editable && draftRef.current) {
      const saved = await persist(JSON.stringify(draftRef.current));
      if (!saved) return;
    }
    const contentLength = [draftRef.current?.introduction, draftRef.current?.scope, draftRef.current?.pricing_notes, ...(draftRef.current?.blocks.map((b) => b.body) ?? [])].join(" ").length;
    setPrintWarning(contentLength > 2200 ? "Lång offert: kontrollera sidbrytningar i utskriftsförhandsvisningen innan du sparar PDF." : "Kontrollera formatet Liggande A4 och aktivera bakgrundsgrafik i utskriftsdialogen.");
    window.print();
  }

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

  async function generateWithAI() {
    if (!meetingNotes.trim() || generating) return;
    setGenerating(true); setGenerationError(""); setPriceWarnings([]); setNotesPreview(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Logga in igen för att använda AI.");
      const response = await fetch("/api/proposal-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ offerId, notes: meetingNotes }),
      });
      const result = await response.json() as { error?: string; introduction?: string; scope?: string; pricing_notes?: string; price_warnings?: string[] };
      if (!response.ok) throw new Error(result.error || "Kunde inte generera utkast.");
      if (typeof result.introduction !== "string" || typeof result.scope !== "string" || typeof result.pricing_notes !== "string") throw new Error("AI:n gav ett ogiltigt svar.");
      setNotesPreview({ introduction: result.introduction, scope: result.scope, pricing_notes: result.pricing_notes });
      setPriceWarnings(Array.isArray(result.price_warnings) ? result.price_warnings.filter((warning): warning is string => typeof warning === "string") : []);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Kunde inte generera utkast.");
    } finally { setGenerating(false); }
  }

  function prepareNotes() {
    const lines = meetingNotes.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    const priceLines = lines.filter((line) => /(?:\bpris\b|\bkr\b|\bsek\b|\bavgift\b|\bbudget\b)/i.test(line));
    const scopeLines = lines.filter((line) => /(?:\bbehov\b|\bönskar\b|\bupplägg\b|\bleverans\b|\btjänst\b|\bomfattning\b)/i.test(line));
    setNotesPreview({
      introduction: lines.slice(0, 4).join("\n"),
      scope: scopeLines.length ? scopeLines.join("\n") : lines.slice(4).join("\n"),
      pricing_notes: priceLines.join("\n"),
    });
  }

  function applyNotes() {
    if (!notesPreview) return;
    setDraft((current) => current ? {
      ...current,
      introduction: current.introduction || notesPreview.introduction,
      scope: current.scope || notesPreview.scope,
      pricing_notes: current.pricing_notes || notesPreview.pricing_notes,
    } : current);
    setNotesPreview(null);
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

  return <main className="proposal-editor mx-auto max-w-7xl space-y-7 px-6 py-10">
    <style>{`@media print { @page { size: A4 landscape; margin: 0; } body { background: white !important; } body * { visibility: hidden !important; } .proposal-print-page, .proposal-print-page * { visibility: visible !important; } .proposal-print-page { position: absolute !important; top: 0 !important; left: 0 !important; width: 297mm !important; min-height: 210mm !important; height: auto !important; aspect-ratio: auto !important; max-height: none !important; overflow: visible !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; } .proposal-print-page > div:last-child { padding: 18mm !important; } .proposal-print-page section { break-inside: avoid; page-break-inside: avoid; } .proposal-print-page button { appearance: none; border: 0; background: transparent; color: inherit; } .proposal-print-page footer { break-inside: avoid; } .proposal-print-page .proposal-placeholder { visibility: hidden !important; } }`}</style>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={() => { void leaveEditor(); }} className="text-sm underline">Tillbaka till offerter</button>
      <div className="flex items-center gap-4"><span role="status" className="text-sm text-muted-foreground">
        {loading ? "Hämtar…" : !editable ? "Endast läsning" :
          saveState === "pending" ? "Ändringar väntar på sparning…" :
          saveState === "saving" ? "Sparar…" :
          saveState === "error" ? "Kunde inte spara" : "Alla ändringar sparade"}
      </span>
      {draft && <button type="button" onClick={() => { void printOffer(); }} className="rounded-md border px-3 py-2 text-sm">Skriv ut / Spara som PDF</button>}
      {editable && draft && <button type="button" onClick={() => { void persist(JSON.stringify(draft)); }} className="rounded-md border px-3 py-2 text-sm">Spara nu</button>}</div>
    </header>
    <div><p className="text-sm text-muted-foreground">Proposo / Offertutkast</p>
      <h1 className="text-3xl font-semibold">Redigera offert</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ändringar sparas automatiskt när du slutar skriva.</p>
    </div>
    {error && <p role="alert" className="rounded-md border p-3 text-sm text-destructive">{error}</p>}
    {printWarning && <p role="status" className="rounded-md border p-3 text-sm">{printWarning}</p>}
    {draft && <div className="grid gap-8 lg:grid-cols-2"><div className="space-y-5"><nav aria-label="Offertens avsnitt" className="flex flex-wrap gap-2">{([["introduction","Inledning"],["scope","Omfattning"],["pricing_notes","Priser och villkor"]] as const).map(([field,label]) => <button key={field} type="button" onClick={() => focusSection(field)} className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted">{label}</button>)}</nav>
      {editable && <section className="space-y-3 rounded-xl border p-4">
        <div><h2 className="font-semibold">Mötesanteckningar</h2><p className="mt-1 text-xs text-muted-foreground">Förbered ett utkast från anteckningar. AI skapar ett förslag från dina anteckningar. Granska alltid text och priser innan du använder förslaget.</p></div>
        <textarea value={meetingNotes} onChange={(event) => { setMeetingNotes(event.target.value); setNotesPreview(null); setPriceWarnings([]); }} rows={6} maxLength={20000} placeholder="Klistra in kundens behov, överenskommet upplägg och priser..." className="w-full resize-y rounded-md border bg-background p-3 text-sm" />
        <div className="flex flex-wrap gap-2"><button type="button" disabled={!meetingNotes.trim() || generating} onClick={() => { void generateWithAI(); }} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">{generating ? "AI skriver utkast…" : "Generera med AI"}</button><button type="button" disabled={!meetingNotes.trim() || generating} onClick={prepareNotes} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">Sortera utan AI</button></div>
        {generationError && <p role="alert" className="text-xs text-destructive">{generationError}</p>}
        {notesPreview && <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">Granska förslaget innan du använder det</p>
          <p><strong>Inledning:</strong> {notesPreview.introduction || "Saknas"}</p>
          <p><strong>Omfattning:</strong> {notesPreview.scope || "Saknas"}</p>
          <p><strong>Priser:</strong> {notesPreview.pricing_notes || "Inga uttryckliga prisuppgifter hittades"}</p>
          {priceWarnings.length > 0 && <div role="alert" className="rounded-md border border-amber-500 p-3"><p className="font-semibold">Prisuppgifter behöver kontrolleras</p>{priceWarnings.map((warning, index) => <p key={index} className="mt-1 text-xs">{warning}</p>)}</div>}
          <p className="text-xs text-muted-foreground">Endast tomma offertfält fylls i. Befintlig text skrivs inte över. Kontrollera att alla belopp och enheter stämmer.</p>
          <div className="rounded-md border bg-background p-3"><p className="font-medium">Prisgranskning mot företagets bibliotek</p>
            {!catalogPrices.length ? <p className="mt-1 text-xs text-muted-foreground">Inga aktiva katalogpriser finns. Kontrollera priser manuellt.</p> :
              <div className="mt-2 space-y-1">{catalogPrices.filter((product) => {
                const name = product.name.toLocaleLowerCase("sv-SE");
                return meetingNotes.toLocaleLowerCase("sv-SE").includes(name) || notesPreview.scope.toLocaleLowerCase("sv-SE").includes(name) || notesPreview.pricing_notes.toLocaleLowerCase("sv-SE").includes(name);
              }).map((product) => <p key={product.name} className="text-xs"><strong>{product.name}:</strong> {product.price_sek === null ? "Inget katalogpris" : `${Number(product.price_sek).toLocaleString("sv-SE")} kr / ${product.unit}`}</p>)}
                <p className="text-xs text-muted-foreground">Katalogpriser visas som jämförelse. Priser från mötet kan avvika och måste granskas.</p>
              </div>}
          </div>
          <button type="button" onClick={applyNotes} className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Använd i offerten</button>
        </div>}
      </section>}
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
    <div className="proposal-print-page aspect-[297/210] overflow-auto rounded-lg border bg-white text-slate-900 shadow-lg">
      <div className="h-2 w-full" style={{ backgroundColor: accent }} /><div className="p-7">
      <header className="flex justify-between border-b pb-3 text-xs uppercase tracking-widest"><div className="flex min-w-0 items-center gap-2">{/^https:\/\/[^\s]+$/i.test(draft.logo_url) && <img src={draft.logo_url} alt="Företagslogotyp" className="h-8 max-w-20 object-contain" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} />}<strong className="truncate" style={{ color: accent }}>{draft.sender_name || "Proposo"}</strong></div><span>Affärsförslag</span></header>
      <p className="mt-6 text-xs uppercase tracking-widest text-slate-500">Framtaget för {draft.customer_name || "Kund"}</p>
      <h3 className="mt-3 break-words text-2xl font-semibold tracking-tight" style={{ color: accent }}>{draft.title || "Offerttitel"}</h3>
      <div className="my-5 h-1 w-12" style={{ backgroundColor: accent }} />
      <div className="grid grid-cols-2 gap-6 text-xs leading-relaxed">
        <button type="button" onClick={() => onEdit("introduction")} className={`w-full whitespace-pre-wrap break-words text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 ${!draft.introduction ? "proposal-placeholder" : ""}`} title="Redigera inledning">{draft.introduction || "Din inledning visas här. Klicka för att redigera."}</button>
        <div className="space-y-4 border-l pl-5">
          <section><h4 className="font-semibold" style={{ color: accent }}>Omfattning och upplägg</h4><button type="button" onClick={() => onEdit("scope")} className={`mt-2 w-full whitespace-pre-wrap break-words text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 ${!draft.scope ? "proposal-placeholder" : ""}`}>{draft.scope || "Beskriv erbjudandet. Klicka för att redigera."}</button></section>
          <section><h4 className="font-semibold" style={{ color: accent }}>Priser och villkor</h4><button type="button" onClick={() => onEdit("pricing_notes")} className={`mt-2 w-full whitespace-pre-wrap break-words text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 ${!draft.pricing_notes ? "proposal-placeholder" : ""}`}>{draft.pricing_notes || "Ange priser och villkor. Klicka för att redigera."}</button></section>
        </div>
      </div>
      {draft.blocks.length > 0 && <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5">{draft.blocks.map((block) => <section key={block.id} className="min-w-0"><h4 className="break-words text-xs font-semibold" style={{ color: accent }}>{block.heading || "Avsnitt"}</h4><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">{block.body || "Skriv innehåll i blocket."}</p></section>)}</div>}
      <footer className="mt-8 flex justify-between border-t pt-3 text-[10px] uppercase tracking-widest text-slate-500"><span>{draft.sender_name || "Proposo"}</span><span>Affärsförslag</span></footer>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Liveförhandsvisning. Använd Skriv ut / Spara som PDF för en första PDF-version. Automatisk sidbrytning för längre offerter återstår.</p>
  </section>;
}
