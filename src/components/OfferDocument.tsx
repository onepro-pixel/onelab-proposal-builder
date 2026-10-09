import { useRef, type ReactNode } from "react";
import { ClipboardList, Stethoscope, ChartNoAxesCombined, ShieldCheck, Check, Clock3, CalendarDays, Building2, Route, LockKeyhole, FlaskConical } from "lucide-react";
import type { ProposalContent } from "@/lib/proposal-types";
import type { OfferContent, OfferItem } from "@/lib/offer-template";
import { Wordmark } from "./Wordmark";
import { ExaminationContents } from "./ExaminationContents";
import cover from "@/assets/brand/cover.jpg.asset.json";

type Props = { content: ProposalContent; customerName: string; editable?: boolean; onChange?: (next: ProposalContent) => void };
type Path = (string | number)[];

function Field({ value, editable, onCommit, className = "" }: { value: string; editable: boolean; onCommit: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  return <span ref={ref} className={`offer-field ${className}`} data-editable={editable || undefined} contentEditable={editable} suppressContentEditableWarning onBlur={(e) => {
    if (editable && e.currentTarget.innerText !== value) onCommit(e.currentTarget.innerText);
  }}>{value}</span>;
}

export function OfferDocument({ content, customerName, editable = false, onChange }: Props) {
  const offer = content.offer;
  if (!offer) return null;
  function update(path: Path, value: string) {
    const next = structuredClone(content);
    let target: unknown = next.offer;
    for (const key of path.slice(0, -1)) target = (target as Record<string | number, unknown>)[key];
    const last = path.at(-1);
    if (last === undefined || !target) return;
    (target as Record<string | number, unknown>)[last] = value;
    if (next.offer) { next.title = next.offer.title; next.subtitle = next.offer.subtitle; }
    onChange?.(next);
  }
  function text(path: Path, className?: string) {
    let value: unknown = offer;
    for (const key of path) value = (value as Record<string | number, unknown>)[key];
    return <Field key={path.join(".")} value={String(value ?? "")} editable={editable} onCommit={(v) => update(path, v)} className={className} />;
  }
  const selected = offer.packages.find((p) => p.name === offer.selectedPackage) ?? offer.packages[0];
  const extraPages = Array.from({ length: Math.ceil(offer.extras.length / 4) }, (_, i) => offer.extras.slice(i * 4, i * 4 + 4));
  const stageIcons = [ClipboardList, Stethoscope, ChartNoAxesCombined, ShieldCheck];
  const practicalIcons = [Clock3, CalendarDays, Building2, Route, LockKeyhole, FlaskConical];
  function footer(n: number) {
    return <footer className="offer-footer"><span>OneLab · Offert till {customerName} · Hälsoundersökning</span><span>{n}</span></footer>;
  }
  function page(n: number, label: string, children: ReactNode) {
    return <section className="offer-page" aria-label={`Offertsida ${n}`}><header className="offer-page-header"><span className="offer-label">{label}</span><span className="offer-customer">{customerName}</span></header>{children}{footer(n)}</section>;
  }
  function items(values: OfferItem[], field: keyof OfferContent, className = "") {
    return values.map((_, i) => <div key={i} className={className}><h3>{text([field, i, "name"])}</h3><p>{text([field, i, "text"])}</p></div>);
  }
  return <div className="offer-wrap">
    <section className="offer-page offer-cover" aria-label="Offertsida 1">
      <div className="offer-cover-left">
        <Wordmark color="white" className="h-7" />
        <div className="offer-cover-copy"><p className="offer-badge">{text(["badge"])}</p><h1>{text(["title"])}</h1><p>{text(["subtitle"])}</p></div>
        <div className="offer-metrics">{offer.metrics.map((_, i) => <div key={i}><strong>{text(["metrics", i, "value"])}</strong><p>{text(["metrics", i, "label"])}</p></div>)}</div>
      </div>
      <div className="offer-cover-right"><p className="offer-customer">{customerName}</p><img className="offer-cover-image" src={cover.url} alt="OneLabs sjuksköterska mäter en medarbetares blodtryck" />
        <div className="offer-stages">{offer.steps.map((_, i) => {
          const Icon = stageIcons[i % stageIcons.length] ?? ClipboardList;
          return <div key={i} className={`offer-stage ${i === 3 ? "offer-stage-dark" : ""}`}><div className="offer-stage-top"><span>{["01 FÖRE", "02 PÅ PLATS", "03 RESULTAT", "04 EFTERÅT"][i]}</span><Icon aria-hidden="true" /></div><h3>{text(["steps", i, "name"])}</h3><p>{text(["steps", i, "text"])}</p></div>;
        })}</div>
      </div>
    </section>
    {page(2, "Undersökningsupplägg", <>
      <h2>{text(["packageHeading"])}</h2><p className="offer-intro">{text(["packageIntro"])}</p>
      <div className="offer-package-layout"><div className="offer-package-main">
        <div className="offer-packages">{offer.packages.map((p, i) => <article key={i} className="offer-package"><p className="offer-label">{text(["packages", i, "caption"])}</p><h3>{text(["packages", i, "name"])}</h3><strong className="offer-price">{text(["packages", i, "price"])}</strong><p className="offer-billing">{text(["packages", i, "billing"])}</p><ul>{p.features.map((_, j) => <li key={j}><Check aria-hidden="true" />{text(["packages", i, "features", j])}</li>)}</ul></article>)}</div>
        <div className="offer-disclosures no-print"><ExaminationContents /></div>
        <div className="offer-arrangement"><p className="offer-label">Så går det till</p><div>{offer.arrangement.map((_, i) => <div key={i}><span className="offer-number">{i + 1}</span><div><h3>{text(["arrangement", i, "name"])}</h3><p>{text(["arrangement", i, "text"])}</p></div></div>)}</div></div>
      </div><aside className="offer-reasons"><p className="offer-label">Varför upplägget fungerar</p>{items(offer.reasons, "reasons")}</aside></div>
    </>)}
    {page(3, "Rapport och uppföljning", <>
      <h2>{text(["followupHeading"])}</h2><p className="offer-intro">{text(["followupIntro"])}</p>
      <div className="offer-followup"><div className="offer-section-label"><span className="offer-label">För medarbetaren</span><span>Ingår i priset utan extra kostnad</span></div><h3>Från resultat till rätt stöd</h3><div className="offer-followup-steps">{offer.followups.map((_, i) => <div key={i}><span className="offer-number">{i + 1}</span><h3>{text(["followups", i, "name"])}</h3><p>{text(["followups", i, "text"])}</p></div>)}</div></div>
      <div className="offer-employer"><p className="offer-label">För {customerName}</p><div>{offer.employer.map((_, i) => <div key={i}><Check aria-hidden="true" /><div><h3>{text(["employer", i, "name"])}</h3><p>{text(["employer", i, "text"])}</p></div></div>)}</div></div>
    </>)}
    {page(4, "Praktiskt · Pris och tidsåtgång", <>
      <h2>{text(["practicalHeading"])}</h2><p className="offer-intro">{text(["practicalIntro"])}</p>
      <div className="offer-practical-layout"><div className="offer-practical">{offer.practical.map((_, i) => {
        const Icon = practicalIcons[i % practicalIcons.length] ?? ClipboardList;
        return <div key={i}><Icon aria-hidden="true" /><div><h3>{text(["practical", i, "name"])}</h3><p>{text(["practical", i, "text"])}</p></div></div>;
      })}</div><aside className="offer-summary"><p className="offer-label">{selected?.name}</p><strong className="offer-price">{selected?.price}</strong><p>{selected?.billing}</p><div className="offer-summary-lines">{offer.packages.filter((p) => p !== selected).map((p, i) => <div key={i}><span>{p.name}<small>{p.billing}</small></span><strong>{p.price}</strong></div>)}<div><span>Uppföljning och återbesök<small>Aktiv uppföljning och digitala läkarsamtal</small></span><strong>Ingår</strong></div>{offer.extras.length > 0 && <div><span>Tillval och kompletterande tester<small>Specificeras på följande sidor</small></span><strong>Se tillval</strong></div>}</div><p>{text(["pricingNote"])}</p>{content.contact?.email && <p className="offer-contact">{content.contact.name}<br />{content.contact.email}</p>}</aside></div>
    </>)}
    {extraPages.map((extras, pageIndex) => page(5 + pageIndex, "Tillval · Tester och priser", <>
      <h2>{text(["extrasHeading"])}</h2><p className="offer-intro">{text(["extrasIntro"])}</p><div className="offer-extras">{extras.map((extra, localIndex) => {
        const i = pageIndex * 4 + localIndex;
        return <article key={i}><div className="offer-extra-title"><h3>{text(["extras", i, "name"])}</h3><div><strong>{text(["extras", i, "price"])}</strong><p>{text(["extras", i, "billing"])}</p></div></div><p>{text(["extras", i, "description"])}</p>{extra.condition && <p className="offer-condition">{text(["extras", i, "condition"])}</p>}</article>;
      })}</div>
    </>))}
  </div>;
}