import { useEffect, useRef, type ElementType } from "react";
import { X } from "lucide-react";
import type { ProposalContent } from "@/lib/proposal-types";
import cover from "@/assets/cover.jpg";
import exam from "@/assets/exam.jpg";
import program from "@/assets/program.jpg";

type Path = (string | number)[];
type Props = {
  content: ProposalContent;
  customerName: string;
  editable?: boolean;
  onChange?: (next: ProposalContent) => void;
};

function setIn<T>(obj: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [k, ...rest] = path;
  const clone: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
  clone[k as any] = setIn((obj as any)?.[k as any], rest, value);
  return clone;
}
function removeIn<T>(obj: T, path: Path, index: number): T {
  let arr: any = obj;
  for (const k of path) arr = arr[k as any];
  return setIn(obj, path, (arr as unknown[]).filter((_, i) => i !== index));
}

export function ProposalDocument({ content, customerName, editable = false, onChange }: Props) {
  const c = content;
  const update = (path: Path, v: string) => onChange?.(setIn(c, path, v));
  const remove = (path: Path, i: number) => onChange?.(removeIn(c, path, i));

  const T = ({ path, as = "span", className }: { path: Path; as?: ElementType; className?: string }) => {
    let v: any = c;
    for (const k of path) v = v?.[k as any];
    return <Editable value={String(v ?? "")} editable={editable} as={as} className={className} onCommit={(s) => update(path, s)} />;
  };
  const Del = ({ path, i }: { path: Path; i: number }) =>
    editable ? (
      <button
        type="button"
        onClick={() => remove(path, i)}
        className="no-print absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-ink text-ink-foreground group-hover:flex"
        aria-label="Ta bort"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    ) : null;

  const Footer = ({ n }: { n: number }) => (
    <div className="absolute inset-x-16 bottom-8 flex items-end justify-between border-t pt-4 text-xs print:inset-x-[16mm] print:bottom-[10mm]">
      <span className="text-sm">
        OneLab<sup>®</sup>
      </span>
      <span>
        {customerName} × OneLab · Företagshälsa
      </span>
      <span>{String(n).padStart(2, "0")}</span>
    </div>
  );

  return (
    <div className="doc-wrap mx-auto flex max-w-[900px] flex-col gap-8">
      {/* Cover */}
      <section className="doc-page flex min-h-[1100px] flex-col overflow-hidden !p-0 print:min-h-[297mm]">
        <img src={cover} alt="" width={1600} height={1104} className="h-[55%] max-h-[620px] w-full object-cover object-right" />
        <div className="flex flex-1 flex-col justify-between p-16 print:p-[16mm]">
          <div>
            <p className="eyebrow mb-6">Kundförslag · {customerName}</p>
            <T path={["title"]} as="h1" className="display block text-6xl print:text-5xl" />
            <T path={["subtitle"]} as="p" className="mt-6 block max-w-xl text-xl text-muted-foreground" />
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl">
              OneLab<sup className="text-xs">®</sup>
            </span>
            <span className="h-3 w-3 rounded-full bg-brand" />
          </div>
        </div>
      </section>

      {/* Intro + steps */}
      <section className="doc-page min-h-[1100px] pb-28 print:min-h-[297mm]">
        <p className="eyebrow mb-10">Upplägg</p>
        <T path={["intro", "lead"]} as="p" className="display block text-3xl leading-snug" />
        <T path={["intro", "body"]} as="p" className="mt-6 block max-w-2xl text-lg text-muted-foreground" />
        <h2 className="display mt-16 mb-6 text-4xl">Så fungerar det</h2>
        <div className="divide-y border-y">
          {c.steps.map((s, i) => (
            <div key={i} className="group relative grid grid-cols-[3rem_12rem_1fr] gap-6 py-6">
              <span className="text-sm text-brand">{String(i + 1).padStart(2, "0")}</span>
              <T path={["steps", i, "title"]} className="font-medium" />
              <T path={["steps", i, "text"]} className="text-muted-foreground" />
              <Del path={["steps"]} i={i} />
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl bg-ink p-10 text-ink-foreground">
          <p className="eyebrow mb-4 !text-ink-foreground/60">För {customerName} innebär det</p>
          <T path={["highlight", "title"]} as="p" className="display block text-2xl leading-snug" />
          <T path={["highlight", "text"]} as="p" className="mt-4 block opacity-70" />
        </div>
        <Footer n={2} />
      </section>

      {/* Exams */}
      <section className="doc-page min-h-[1100px] pb-28 print:min-h-[297mm]">
        <p className="eyebrow mb-10">Hälsoundersökningar</p>
        <div className="grid grid-cols-2 gap-10">
          <T path={["exams", "heading"]} as="h2" className="display block text-5xl print:text-4xl" />
          <T path={["exams", "intro"]} as="p" className="block text-lg" />
        </div>
        <img src={exam} alt="" loading="lazy" width={1408} height={1008} className="mt-10 h-64 w-full rounded-2xl object-cover" />
        <div className="mt-10 divide-y border-y">
          {c.exams.items.map((it, i) => (
            <div key={i} className="group relative grid grid-cols-[14rem_1fr] gap-6 py-5">
              <T path={["exams", "items", i, "name"]} className="font-medium" />
              <T path={["exams", "items", i, "text"]} className="text-muted-foreground" />
              <Del path={["exams", "items"]} i={i} />
            </div>
          ))}
        </div>
        <T path={["exams", "note"]} as="p" className="mt-6 block text-sm text-muted-foreground" />
        <Footer n={3} />
      </section>

      {/* Program */}
      <section className="doc-page min-h-[1100px] pb-28 print:min-h-[297mm]">
        <p className="eyebrow mb-10">Hälsoprogram</p>
        <T path={["program", "heading"]} as="h2" className="display block max-w-2xl text-5xl print:text-4xl" />
        <T path={["program", "intro"]} as="p" className="mt-8 block max-w-2xl text-lg" />
        <div className="mt-10 grid grid-cols-2 gap-10">
          <img src={program} alt="" loading="lazy" width={1408} height={1008} className="h-80 w-full rounded-2xl object-cover" />
          <T path={["program", "body"]} as="p" className="block text-muted-foreground" />
        </div>
        <div className="mt-12 rounded-3xl bg-sand p-10">
          <p className="eyebrow mb-3 !text-brand">Kostnadskontroll</p>
          <T path={["program", "cost_note"]} as="p" className="block text-lg" />
        </div>
        <Footer n={4} />
      </section>

      {/* HR */}
      <section className="doc-page min-h-[1100px] pb-28 print:min-h-[297mm]">
        <p className="eyebrow mb-10">HR-portalen</p>
        <div className="grid grid-cols-2 gap-10">
          <T path={["hr", "heading"]} as="h2" className="display block text-5xl print:text-4xl" />
          <T path={["hr", "intro"]} as="p" className="block text-lg" />
        </div>
        <div className="mt-14 grid grid-cols-2 gap-4">
          {c.hr.items.map((it, i) => (
            <div key={i} className="group relative rounded-2xl bg-sand p-7">
              <span className="mb-4 block h-2 w-2 rounded-full bg-brand" />
              <T path={["hr", "items", i, "name"]} as="p" className="block font-medium" />
              <T path={["hr", "items", i, "text"]} as="p" className="mt-2 block text-sm text-muted-foreground" />
              <Del path={["hr", "items"]} i={i} />
            </div>
          ))}
        </div>
        <Footer n={5} />
      </section>

      {/* Pricing */}
      <section className="doc-page min-h-[1100px] pb-28 print:min-h-[297mm]">
        <p className="eyebrow mb-10">Prismodell</p>
        <div className="grid grid-cols-2 gap-10">
          <T path={["pricing", "heading"]} as="h2" className="display block text-5xl print:text-4xl" />
          <T path={["pricing", "intro"]} as="p" className="block text-lg" />
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4">
          {c.pricing.packages.map((p, i) => (
            <div key={i} className={`group relative rounded-3xl p-8 ${i % 2 ? "bg-ink text-ink-foreground" : "bg-sand"}`}>
              <T path={["pricing", "packages", i, "name"]} as="p" className="eyebrow block !text-current opacity-60" />
              <p className="mt-4 flex items-baseline gap-3">
                <T path={["pricing", "packages", i, "price"]} className="display text-5xl print:text-4xl" />
                <span className="text-sm opacity-60">från, per person</span>
              </p>
              <ul className="mt-8 divide-y divide-current/15 border-t border-current/15">
                {p.features.map((_, j) => (
                  <li key={j} className="py-3 text-sm">
                    <T path={["pricing", "packages", i, "features", j]} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {c.pricing.addons.length > 0 && (
          <div className="mt-12">
            <div className="flex justify-between border-b pb-3">
              <span>Tillägg</span>
              <span className="eyebrow">Pris / person</span>
            </div>
            {c.pricing.addons.map((a, i) => (
              <div key={i} className="group relative flex items-baseline justify-between border-b py-4">
                <T path={["pricing", "addons", i, "name"]} className="text-lg" />
                <T path={["pricing", "addons", i, "price"]} className="display text-2xl" />
                <Del path={["pricing", "addons"]} i={i} />
              </div>
            ))}
          </div>
        )}
        <T path={["pricing", "note"]} as="p" className="mt-4 block text-sm text-muted-foreground" />
        <Footer n={6} />
      </section>

      {/* Cost control + contact */}
      <section className="doc-page min-h-[1100px] pb-28 print:min-h-[297mm]">
        <p className="eyebrow mb-10">Kostnadskontroll</p>
        <div className="grid grid-cols-2 gap-10">
          <T path={["cost_control", "heading"]} as="h2" className="display block text-5xl print:text-4xl" />
          <T path={["cost_control", "intro"]} as="p" className="block text-lg" />
        </div>
        <div className="mt-10 divide-y border-y">
          {c.cost_control.items.map((it, i) => (
            <div key={i} className="group relative grid grid-cols-[14rem_1fr] gap-6 py-5">
              <T path={["cost_control", "items", i, "name"]} className="font-medium" />
              <T path={["cost_control", "items", i, "text"]} className="text-muted-foreground" />
              <Del path={["cost_control", "items"]} i={i} />
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-3xl bg-sand p-10">
          <p className="eyebrow mb-3 !text-brand">Så räknar ni</p>
          <T path={["cost_control", "formula"]} as="p" className="display block text-3xl" />
        </div>
        <div className="mt-14 grid grid-cols-2 gap-10">
          <div>
            <T path={["closing", "heading"]} as="h3" className="display block text-4xl" />
            <T path={["closing", "text"]} as="p" className="mt-4 block text-muted-foreground" />
          </div>
          <div className="divide-y border-y text-sm">
            {c.contact?.name && (
              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Kontakt</span>
                <T path={["contact", "name"]} />
              </div>
            )}
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground">Mail</span>
              <T path={["contact", "email"]} />
            </div>
            <div className="flex justify-between py-3">
              <span className="text-muted-foreground">Web</span>
              <T path={["contact", "web"]} />
            </div>
          </div>
        </div>
        <Footer n={7} />
      </section>
    </div>
  );
}

function Editable({
  value,
  editable,
  as: Tag = "span",
  className,
  onCommit,
}: {
  value: string;
  editable: boolean;
  as?: ElementType;
  className?: string | undefined;
  onCommit: (v: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value && document.activeElement !== ref.current) {
      ref.current.innerText = value;
    }
  }, [value]);
  if (!editable) return <Tag className={`whitespace-pre-line ${className ?? ""}`}>{value}</Tag>;
  return (
    <Tag
      ref={ref}
      data-editable="true"
      contentEditable
      suppressContentEditableWarning
      className={`whitespace-pre-line ${className ?? ""}`}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = e.currentTarget.innerText;
        if (v !== value) onCommit(v);
      }}
    >
      {value}
    </Tag>
  );
}
