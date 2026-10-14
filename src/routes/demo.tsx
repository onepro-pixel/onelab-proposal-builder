import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeDemoMeeting, generateDemoProposal, type MeetingAnalysis } from "@/lib/demo-ai.functions";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Proposo – Interaktiv demo" }, { name: "description", content: "Testa offertredigering eller generera ett riktigt AI-förslag med testkod." }] }),
  component: Demo,
});

const exampleServices = `Nordform Studio erbjuder:
Webbstrategi och design: 25 000 kr per projekt.
Utveckling av responsiv webbplats med CMS, fastighetssidor och kontaktformulär: 60 000 kr per projekt.
Support och förvaltning: 1 500 kr per månad.
Inga andra tjänster eller priser får erbjudas.`;

const exampleNotes = `Möte med Berg & Dal Fastigheter, 13 oktober 2026.
Deltagare: Sofia Berg, marknadschef.
De förvaltar 18 fastigheter och vill modernisera sin webbplats.
Behov: ny responsiv webbplats, tydligare presentation av fastigheterna, bättre kontaktformulär och enkel redigering.
Önskad lansering: februari 2027.
Budgetdiskussion: 85 000 kr för webbprojektet. Löpande support 1 500 kr/mån.
Viktigt: tydlig tidsplan, utbildning för redaktörer och möjlighet att växa med fler fastigheter.
Nästa steg: skicka offert senast fredag.`;

type Item = { name: string; description: string; price: string };
const initialItems: Item[] = [
  { name: "Webbstrategi & design", description: "Workshop, struktur, wireframes och visuell design", price: "25 000 kr" },
  { name: "Utveckling & lansering", description: "Responsiv webbplats, fastighetssidor och kontaktformulär", price: "60 000 kr" },
  { name: "Support & förvaltning", description: "Uppdateringar och teknisk support", price: "1 500 kr/mån" },
];
const base: CSSProperties = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };
const demoField: CSSProperties = { width: "100%", border: "1px solid #d9dce3", borderRadius: 9, padding: "10px 12px", background: "white", color: "#1c2333" };

function Demo() {
  const [company, setCompany] = useState("Nordform Studio");
  const [client, setClient] = useState("Berg & Dal Fastigheter");
  const [notes, setNotes] = useState(exampleNotes);
  const [services, setServices] = useState(exampleServices);
  const [demoCode, setDemoCode] = useState("");
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [analysisApproved, setAnalysisApproved] = useState(false);
  const [approvedPricing, setApprovedPricing] = useState("");
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const analyzeAI = useServerFn(analyzeDemoMeeting);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const generateAI = useServerFn(generateDemoProposal);
  const [primary, setPrimary] = useState("#193b35");
  const [accent, setAccent] = useState("#c7a36b");
  const [font, setFont] = useState("Georgia, serif");
  const [logo, setLogo] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [customFont, setCustomFont] = useState<string | null>(null);
  const [title, setTitle] = useState("En digital närvaro som växer med er");
  const [intro, setIntro] = useState("Vi föreslår en modern och lättskött webbplats som presenterar fastigheterna tydligt och gör det enkelt för besökare att ta kontakt.");
  const [items, setItems] = useState<Item[]>(initialItems);
  const [showPreview, setShowPreview] = useState(true);
  const visualStyle = analysis?.designPlan.layout === "compact" ? "minimal" : analysis?.designPlan.layout === "detailed" ? "corporate" : "editorial";
  const [generated, setGenerated] = useState(true);
  useEffect(() => {
    return () => { [logo, photo, customFont].forEach(url => { if (url) URL.revokeObjectURL(url); }); };
  }, [logo, photo, customFont]);
  useEffect(() => {
    if (!customFont) return;
    const face = new FontFace("DemoBrandFont", `url("${customFont}")`);
    face.load().then(loaded => document.fonts.add(loaded)).catch(() => {});
  }, [customFont]);

  function upload(file: File | undefined, kind: "logo" | "photo" | "font") {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { window.alert("Max 10 MB per fil"); return; }
    const imageTypes = ["image/png", "image/jpeg", "image/webp"];
    if (kind === "font" ? !/\.(woff2|ttf|otf)$/i.test(file.name) : !imageTypes.includes(file.type)) {
      window.alert("Filtypen stöds inte"); return;
    }
    const url = URL.createObjectURL(file);
    if (kind === "logo") setLogo(url);
    else if (kind === "photo") setPhoto(url);
    else { setCustomFont(url); setFont("DemoBrandFont, Georgia, serif"); }
  }
  async function analyzeMeeting() {
    setAnalysisBusy(true);
    setAiError("");
    try {
      if (!demoCode.trim()) throw new Error("Ange testkoden för att analysera mötet.");
      const result = await analyzeAI({ data: { demoCode: demoCode.trim(), company, client, notes, services } });
      setAnalysis(result);
      setAnalysisApproved(false);
      setApprovedPricing("");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Kunde inte analysera mötet.");
    } finally { setAnalysisBusy(false); }
  }
  async function makeDemo() {
    setAiBusy(true);
    setAiError("");
    try {
      if (!demoCode.trim()) throw new Error("Ange testkoden för att använda AI.");
      if (!analysis || !analysisApproved) throw new Error("Analysera mötet och godkänn underlaget innan du skapar offerten.");
      if (demoCode.trim().length > 128) throw new Error("Testkoden är för lång. Klistra bara in själva testkoden, inte hela meddelandet.");
      const result = await generateAI({ data: { demoCode: demoCode.trim(), company, client, notes, services, approvedPricing } });
      setTitle(result.title);
      setIntro(result.intro);
      setItems(result.items);
      setGenerated(true);
      setShowPreview(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI-genereringen misslyckades. Försök igen.";
      setAiError(message.includes("demoCode") || message.includes("too_big") ? "Testkoden är för lång. Klistra bara in själva testkoden." : message);
    } finally { setAiBusy(false); }
  }
  function makeRuleBasedDemo() {
    const lower = notes.toLowerCase();
    const website = /webb|hemsida|fastighet/.test(lower);
    const customer = client.trim() || "Kunden";
    setTitle(website ? `En digital närvaro som växer med ${customer}` : `Ett skräddarsytt förslag till ${customer}`);
    setIntro(website
      ? `Utifrån vårt möte föreslår vi en responsiv, lättskött webbplats med tydlig presentation av ert erbjudande, enkel administration och ett smidigt kontaktflöde.`
      : `Tack för ett givande möte. Här är vårt förslag baserat på era mål och de behov som framkom i samtalet. Vi anpassar omfattning och tidplan tillsammans.`);
    setItems(website ? initialItems : [
      { name: "Analys och planering", description: "Behovskartläggning, prioriteringar och projektplan", price: "Pris enligt överenskommelse" },
      { name: "Genomförande", description: "Leverans anpassad efter mötets omfattning", price: "Pris enligt överenskommelse" },
    ]);
    setGenerated(true);
    setShowPreview(true);
  }
  useEffect(() => { setAnalysis(null); setAnalysisApproved(false); setApprovedPricing(""); }, [notes, services, company, client]);
  const updateItem = (i: number, key: keyof Item, value: string) => setItems(current => current.map((item, j) => j === i ? { ...item, [key]: value } : item));
  const label: CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#475569" };
  const card: CSSProperties = { background: "white", border: "1px solid #e3e7ee", borderRadius: 16, padding: 22, marginBottom: 16 };
  const btn: CSSProperties = { border: "none", background: primary, color: "white", borderRadius: 9, padding: "12px 18px", fontWeight: 700, cursor: "pointer" };

  return <main style={{ ...base, background: "#f3f5f8", minHeight: "100vh", color: "#17212d" }}>
    <style>{`
      @media print {
        body { background: white !important; }
        .demo-no-print { display: none !important; }
        .demo-paper { box-shadow: none !important; border: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; }
        .demo-page { break-after: page; min-height: 270mm !important; }
        .demo-page:last-child { break-after: auto; }
        @page { size: A4; margin: 0; }
        print-color-adjust: exact; -webkit-print-color-adjust: exact;
      }
      .demo-paper input, .demo-paper textarea { font: inherit; }
      .demo-edit { border: 1px dashed transparent; padding: 3px; width: 100%; background: transparent; color: inherit; }
      .demo-edit:focus { outline: 1px dashed #9aa7b7; }
      textarea.demo-edit { field-sizing: content; height: auto; min-height: 2.5em; overflow: hidden; overflow-wrap: anywhere; white-space: pre-wrap; }
      .demo-paper { overflow: visible !important; }
      .demo-page { box-sizing: border-box; overflow-wrap: anywhere; }
.demo-item { break-inside: avoid; page-break-inside: avoid; }
      .proposal-module { break-inside: avoid; page-break-inside: avoid; }
      .proposal-kicker { font: 700 11px Inter, ui-sans-serif, sans-serif; letter-spacing: 2px; text-transform: uppercase; }
      .proposal-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
      @media (max-width: 680px) { .proposal-grid { grid-template-columns: 1fr; } }
      @media print { .proposal-module { break-inside: avoid !important; } .proposal-grid { grid-template-columns: repeat(2,minmax(0,1fr)) !important; } }
      @media print {
        .demo-page { min-height: 0 !important; height: auto !important; break-after: auto !important; }
        .demo-page:first-child { min-height: 297mm !important; break-after: page !important; }
        .demo-paper { overflow: visible !important; }
        .demo-edit { border: none !important; }
        textarea.demo-edit { resize: none !important; }
      }
      .demo-print-text { display: none; white-space: pre-wrap; overflow-wrap: anywhere; }
      @media print {
        @page { size: A4; margin: 15mm 14mm; }
        body, main { background: white !important; }
        .demo-columns { display: block !important; padding: 0 !important; }
        .demo-paper { box-shadow: none !important; width: 100% !important; max-width: none !important; }
        .demo-page { padding: 0 !important; display: block !important; }
        .demo-page:first-child { margin: -15mm -14mm 0 !important; padding: 22mm !important; min-height: 297mm !important; box-sizing: border-box; break-after: page !important; display: flex !important; }
        .demo-page:not(:first-child) { padding-top: 12mm !important; }
        .demo-edit { display: none !important; }
        .demo-print-text { display: block !important; }
        .demo-item { break-inside: avoid !important; }
        h2, h3 { break-after: avoid !important; }
      }
      @media (max-width: 960px) { .demo-columns { grid-template-columns: 1fr !important; } }
    `}</style>
    <header className="demo-no-print" style={{ background: "#fff", borderBottom: "1px solid #e3e7ee", padding: "16px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div><strong style={{ fontSize: 24, letterSpacing: "-1px" }}>proposo<span style={{ color: "#b8874c" }}>.</span></strong><span style={{ marginLeft: 16, fontSize: 12, color: "#64748b" }}>INTERAKTIV DEMO</span></div>
      <button style={btn} onClick={() => window.print()}>Skriv ut / Spara som PDF</button>
    </header>
    <div className="demo-columns" style={{ display: "grid", gridTemplateColumns: "350px minmax(0,1fr)", gap: 26, maxWidth: 1480, margin: "0 auto", padding: "26px 22px" }}>
      <aside className="demo-no-print" style={{ minWidth: 0 }}>
        <div style={card}>
          <h1 style={{ fontSize: 23, fontWeight: 800, marginBottom: 7 }}>Testa Proposo</h1>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>Exempelföretaget är påhittat. AI-generering använder riktig AI och en privat testkod. Du kan redigera exempelofferten utan konto. Ändringar sparas inte.</p>
        </div>
        <div style={card}>
          <label style={label}>Privat testkod för AI</label>
          <input style={demoField} type="password" autoComplete="off" maxLength={128} placeholder="Ange testkod" value={demoCode} onChange={e => setDemoCode(e.target.value)} />
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>Koden används bara för AI-generering. Ingen inloggning behövs.</p>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18 }}>1. Ditt företag</h2>
          <label style={label}>Företagsnamn</label><input style={demoField} value={company} onChange={e => setCompany(e.target.value)} />
          <div style={{ display: "flex", gap: 15, marginTop: 16 }}>
            <label style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>Primärfärg<input type="color" value={primary} onChange={e => setPrimary(e.target.value)} style={{ display: "block", width: "100%", height: 43, marginTop: 6 }} /></label>
            <label style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>Accentfärg<input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ display: "block", width: "100%", height: 43, marginTop: 6 }} /></label>
          </div>
          <label style={{ ...label, marginTop: 15 }}>Typsnitt</label>
          <select style={demoField} value={font} onChange={e => setFont(e.target.value)}>
            <option value="Georgia, serif">Klassisk serif</option><option value="Arial, sans-serif">Modern sans-serif</option><option value="Trebuchet MS, sans-serif">Mjuk sans-serif</option>
            {customFont && <option value="DemoBrandFont, Georgia, serif">Uppladdat typsnitt</option>}
          </select>
          <label style={{ ...label, marginTop: 16 }}>Egen logotyp (PNG/JPG/WebP)</label><input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => upload(e.target.files?.[0], "logo")} />
          <label style={{ ...label, marginTop: 16 }}>Egen omslagsbild</label><input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => upload(e.target.files?.[0], "photo")} />
          <label style={{ ...label, marginTop: 16 }}>Eget typsnitt (WOFF2/TTF/OTF)</label><input type="file" accept=".woff2,.ttf,.otf" onChange={e => upload(e.target.files?.[0], "font")} />
        </div>
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 15 }}>2. Kundmöte</h2>
          <label style={label}>Kundens namn</label><input style={demoField} value={client} onChange={e => setClient(e.target.value)} />
          <label style={{ ...label, marginTop: 15 }}>Mötesanteckningar</label>
          <textarea style={{ ...demoField, minHeight: 235, resize: "vertical", fontSize: 12, lineHeight: 1.6 }} value={notes} onChange={e => setNotes(e.target.value)} />
          <label style={{ ...label, marginTop: 15 }}>Ditt företags tjänster och priser (AI-underlag)</label>
          <textarea style={{ ...demoField, minHeight: 160, fontSize: 12, lineHeight: 1.6 }} value={services} onChange={e => setServices(e.target.value)} />
          <button disabled={analysisBusy} style={{ ...btn, width: "100%", marginTop: 12, opacity: analysisBusy ? 0.6 : 1 }} onClick={() => void analyzeMeeting()}>{analysisBusy ? "Analyserar mötet…" : "1. Analysera kundmötet med AI"}</button>
          {analysis && <div style={{ marginTop: 14, padding: 15, border: "1px solid #b7c9c4", background: "#f3faf7", borderRadius: 10, fontSize: 13, lineHeight: 1.5 }}>
            <strong style={{ fontSize: 15 }}>Granska AI-analysen</strong>
            <p style={{ marginTop: 8 }}>{analysis.customerSituation}</p>
            <p><strong>Rekommenderat material:</strong> {analysis.recommendedFormat}</p>
            <p><strong>Köpstadium:</strong> {analysis.buyingStage}</p>
            <p><strong>Prisstatus:</strong> {analysis.priceStatus}</p>
            <p><strong>AI-vald offertdesign:</strong> {{compact:"Kompakt",editorial:"Redaktionell",detailed:"Detaljerad"}[analysis.designPlan.layout]} – {analysis.designPlan.rationale}</p>
            {([
              ["Kundens behov", analysis.needs],
              ["Relevanta tjänster", analysis.relevantServices],
              ["Bekräftade uppgifter", analysis.confirmedFacts],
              ["Prisuppgifter i mötet", analysis.pricingEvidence],
              ["Att kontrollera före utskick", analysis.uncertainties],
              ["Nästa steg", analysis.nextSteps],
            ] as [string, string[]][]).map(([heading, entries]) => <div key={heading} style={{ marginTop: 10 }}><strong>{heading}</strong><ul style={{ paddingLeft: 18, marginTop: 4 }}>{entries.map((entry, index) => <li key={index}>{entry}</li>)}</ul></div>)}
            <label style={label}>Kundspecifikt pris eller rabatt – bekräfta här</label>
            <textarea style={demoField} rows={3} maxLength={4000} value={approvedPricing} onChange={e => { setApprovedPricing(e.target.value); setAnalysisApproved(false); }} placeholder="Exempel: Bas 2 000 kr/person, överenskommet i mötet. Standardpris 2 690 kr gäller inte denna kund." />
            <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 12, cursor: "pointer" }}><input type="checkbox" checked={analysisApproved} onChange={e => setAnalysisApproved(e.target.checked)} style={{ marginTop: 3 }} /><span>Jag har granskat uppgifterna och vill skapa ett utkast. Oklara uppgifter ska inte presenteras som bekräftade.</span></label>
          </div>}
          <button disabled={aiBusy || !analysisApproved} style={{ ...btn, width: "100%", marginTop: 12, opacity: aiBusy || !analysisApproved ? 0.5 : 1 }} onClick={() => void makeDemo()}>{aiBusy ? "AI skriver offerten…" : "2. Skapa offertutkast med AI"}</button>
          {aiError && <p role="alert" style={{ fontSize: 12, color: "#b42318", marginTop: 10 }}>{aiError}</p>}
          <button style={{ width: "100%", marginTop: 12, padding: 10, border: "1px solid #d9dce3", borderRadius: 9, background: "white" }} onClick={makeRuleBasedDemo}>Visa exempel utan AI</button>
          <p style={{ fontSize: 11, color: "#64748b", marginTop: 10 }}>AI läser mötesanteckningarna och företagets tjänsteunderlag. Kontrollera alltid innehåll och priser före utskick.</p>
        </div>
      </aside>
      <section style={{ minWidth: 0 }}>
        <div className="demo-no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 }}>
          <div><strong>Offertförhandsvisning</strong><p style={{ fontSize: 12, color: "#64748b" }}>Klicka i rubriker och texter för att redigera.</p></div>
          <button onClick={() => setShowPreview(v => !v)} style={{ background: "white", border: "1px solid #ddd", borderRadius: 8, padding: 9 }}>{showPreview ? "Dölj" : "Visa"} offert</button>
        </div>
        {generated && showPreview && <div className="demo-paper" style={{ width: "100%", maxWidth: 820, margin: "0 auto", boxShadow: "0 12px 35px #17212d17", borderRadius: 4, overflow: "visible", background: "white", fontFamily: font }}>
          <section className="demo-page" style={{ background: visualStyle === "minimal" ? "#ffffff" : visualStyle === "corporate" ? "#edf2f0" : primary, color: visualStyle === "editorial" ? "white" : primary, minHeight: 910, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: visualStyle === "minimal" ? "12% 10%" : "8%", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {logo ? <img src={logo} alt="Logotyp" style={{ maxWidth: 185, maxHeight: 72, objectFit: "contain" }} /> : <strong style={{ fontSize: 24 }}>{company}</strong>}
              <span style={{ fontSize: 11, letterSpacing: 2, color: visualStyle === "minimal" ? primary : accent }}>KUNDFÖRSLAG / 2026</span>
            </div>
            {visualStyle === "corporate" && <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginTop: 36, height: 245 }}><div style={{ background: primary, padding: 25, color: "white", display: "flex", alignItems: "flex-end", fontSize: 24, fontWeight: 700 }}>Strategiskt förslag<br />för {client}</div><div style={{ background: accent, display: "flex", alignItems: "flex-end", padding: 22, color: primary, fontSize: 45, fontWeight: 800 }}>01.</div></div>}
            {visualStyle === "editorial" && (photo ? <img src={photo} alt="Företagets omslagsbild" style={{ width: "110%", marginLeft: "-5%", height: 380, objectFit: "cover", marginTop: 32 }} /> : <div style={{ width: "110%", marginLeft: "-5%", height: 300, marginTop: 32, background: `linear-gradient(135deg, ${accent} 0%, ${primary} 80%)`, borderTop: "1px solid #ffffff70", borderBottom: "1px solid #ffffff70" }} />)}
            {visualStyle === "minimal" && <div style={{ width: 70, height: 7, background: accent, marginTop: 90 }} />}
            {visualStyle === "corporate" && photo && <img src={photo} alt="Företagets bild" style={{ width: "100%", height: 120, objectFit: "cover", marginTop: 14 }} />}
            <div style={{ paddingTop: visualStyle === "minimal" ? 90 : 45, paddingBottom: visualStyle === "minimal" ? 135 : 65, maxWidth: visualStyle === "minimal" ? 620 : undefined }}>
              <p style={{ fontSize: 12, letterSpacing: 2, color: visualStyle === "minimal" ? primary : accent, marginBottom: 25 }}>FRAMTAGET FÖR {client.toUpperCase()}</p>
              <div><div className="demo-print-text" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.14 }}>{title}</div><textarea className="demo-edit" rows={1} value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: visualStyle === "editorial" ? "clamp(40px, 5vw, 68px)" : visualStyle === "minimal" ? "clamp(38px, 4.8vw, 64px)" : "clamp(30px, 4vw, 52px)", fontWeight: 700, lineHeight: 1.12, resize: "none", minHeight: 0, overflowWrap: "anywhere" }} /></div>
              <p style={{ fontSize: 18, marginTop: 18, opacity: 0.8 }}>Ett förslag från {company}</p>
            </div>
            <div style={{ borderTop: visualStyle === "editorial" ? "1px solid #ffffff55" : "1px solid #93a69d", paddingTop: 18, display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{company}</span><span>OFFERT</span></div>
          </section>
          <section className="demo-page" style={{ background: visualStyle === "corporate" ? "#f7f9f8" : "white", padding: visualStyle === "minimal" ? "12% 11%" : "9%", display: "block", fontFamily: visualStyle === "corporate" ? "Inter, ui-sans-serif, system-ui, sans-serif" : font }}>
            <div style={{ fontSize: 12, letterSpacing: 2, color: primary, marginBottom: 30 }}>VÅRT FÖRSLAG</div>
            <h2 style={{ fontSize: visualStyle === "editorial" ? 46 : visualStyle === "minimal" ? 42 : 32, lineHeight: 1.14, marginBottom: 25, color: primary }}>{visualStyle === "corporate" ? "Ett tydligt upplägg för er verksamhet." : visualStyle === "minimal" ? "Ert nästa steg." : "Tillsammans skapar vi nästa steg."}</h2>
            <div><div className="demo-print-text" style={{ fontSize: 17, lineHeight: 1.7, color: "#38424b" }}>{intro}</div><textarea className="demo-edit" value={intro} onChange={e => setIntro(e.target.value)} rows={1} style={{ fontSize: 17, lineHeight: 1.7, resize: "none", color: "#38424b", minHeight: 0 }} /></div>
            {photo && <div className="proposal-module" style={{ marginTop: 30, marginBottom: 30 }}><img src={photo} alt="Företagets bildmaterial" style={{ display: "block", width: "100%", height: 290, objectFit: "cover", borderRadius: 14 }} /></div>}
            {analysis && analysis.designPlan.showNeeds && <div className="proposal-module" style={{ marginTop: 34, padding: 25, background: visualStyle === "minimal" ? "#fff" : "#f3f6f4", borderLeft: visualStyle === "minimal" ? "0" : "5px solid " + accent, borderTop: visualStyle === "minimal" ? "2px solid " + primary : undefined }}>
              <div className="proposal-kicker" style={{ color: primary, marginBottom: 10 }}>Vår förståelse av ert behov</div>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "#334155", margin: 0 }}>{analysis.customerSituation}</p>
              {analysis.needs.length > 0 && <div className="proposal-grid" style={{ marginTop: 18 }}>{analysis.needs.slice(0, 4).map((need, i) => <div key={i} style={{ borderTop: "1px solid #ccd7d1", paddingTop: 11, fontSize: 14, lineHeight: 1.5 }}><span style={{ color: primary, fontWeight: 700, marginRight: 8 }}>0{i+1}</span>{need}</div>)}</div>}
            </div>}
            {analysis && analysis.designPlan.showSolution && analysis.relevantServices.length > 0 && <div className="proposal-module" style={{ marginTop: 35 }}>
              <div className="proposal-kicker" style={{ color: primary }}>Rekommenderat upplägg</div>
              <h3 style={{ fontSize: 26, color: primary, margin: "10px 0 15px" }}>En lösning utifrån era förutsättningar</h3>
              <div className="proposal-grid" style={{ gridTemplateColumns: analysis.designPlan.layout === "detailed" ? "1fr" : undefined }}>{analysis.relevantServices.slice(0,analysis.designPlan.layout === "compact" ? 2 : 4).map((service,i) => <div key={i} style={{ padding: 18, border: visualStyle === "minimal" ? "0" : "1px solid #dbe3de", borderBottom: visualStyle === "minimal" ? "1px solid #dbe3de" : undefined, background: visualStyle === "corporate" ? "#fff" : undefined, borderRadius: 4, minHeight: 90 }}><div style={{ color: accent, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>0{i+1}</div><div style={{ fontSize: 15, fontWeight: 700, color: primary, lineHeight: 1.4 }}>{service}</div></div>)}</div>
            </div>}
          </section>
          <section className="demo-page" style={{ background: "#fff", padding: "9% 10%", display: "block", fontFamily: font }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e4e4e4", paddingBottom: 18, marginBottom: 32, fontSize: 12 }}><strong>{company}</strong><span style={{ color: "#808080", letterSpacing: 1.5 }}>OFFERT / INVESTERING</span></div>
            <div className="proposal-module" style={{ marginTop: analysis?.designPlan.layout === "compact" ? 20 : 38, marginBottom: 18 }}>
              <div className="proposal-kicker" style={{ color: primary }}>Omfattning och investering</div>
              <h3 style={{ fontSize: 26, marginTop: 8, color: primary }}>Det här ingår i vårt förslag</h3>
            </div>
            <div>{items.map((item, i) => <div key={i} className="demo-item" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(110px, 180px)", gap: 22, border: visualStyle === "minimal" ? "0" : "1px solid #e0e8e2", borderBottom: visualStyle === "minimal" ? "1px solid #d6ded9" : undefined, borderLeft: visualStyle === "minimal" ? "0" : "4px solid " + accent, borderRadius: 4, padding: "20px", marginBottom: 12, background: "#fff" }}>
              <div style={{ minWidth: 0 }}><div className="demo-print-text" style={{ fontWeight: 700, fontSize: 16 }}>{item.name}</div><div className="demo-print-text" style={{ fontSize: 13, color: "#64748b", marginTop: 5 }}>{item.description}</div><textarea className="demo-edit" rows={1} value={item.name} onChange={e => updateItem(i, "name", e.target.value)} style={{ fontWeight: 700, fontSize: 16, resize: "none" }} /><textarea className="demo-edit" rows={1} value={item.description} onChange={e => updateItem(i, "description", e.target.value)} style={{ fontSize: 13, color: "#64748b", resize: "none" }} /></div>
              <div><div className="demo-print-text" style={{ fontWeight: 700, textAlign: "right", color: primary }}>{item.price}</div><textarea className="demo-edit" rows={1} aria-label="Pris" value={item.price} onChange={e => updateItem(i, "price", e.target.value)} style={{ width: "100%", fontWeight: 700, textAlign: "right", color: primary, resize: "none" }} /></div>
            </div>)}</div>
            <div className="demo-no-print" style={{ marginTop: 8 }}><button onClick={() => setItems(current => [...current, { name: "Ny tjänst", description: "Beskrivning", price: "0 kr" }])} style={{ border: "1px solid #ddd", background: "white", borderRadius: 8, padding: 8 }}>+ Lägg till rad</button></div>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 25 }}>Priser exklusive moms om inget annat anges. Bekräfta omfattning och villkor före utskick.</p>
            {analysis && analysis.designPlan.showNextSteps && analysis.nextSteps.length > 0 && <div className="proposal-module" style={{ marginTop: 36, padding: 25, background: primary, color: "white" }}>
              <div className="proposal-kicker" style={{ color: accent }}>Nästa steg</div>
              <h3 style={{ fontSize: 25, margin: "12px 0 17px", color: "white" }}>Så går vi vidare</h3>
              {analysis.nextSteps.slice(0, 4).map((step,i) => <div key={i} style={{ display: "flex", gap: 14, borderTop: "1px solid #ffffff35", padding: "13px 0", fontSize: 14, lineHeight: 1.5 }}><strong style={{ color: accent }}>0{i+1}</strong><span>{step}</span></div>)}
            </div>}
            <div className="proposal-module" style={{ marginTop: 35, borderTop: "2px solid", borderColor: accent, paddingTop: 20, display: "flex", justifyContent: "space-between", fontSize: 12 }}><strong>{company}</strong><span>PROPOSO</span></div><strong>{company}</strong><span>PROPOSO</span></div>
          </section>
        </div>}
      </section>
    </div>
  </main>;
}
