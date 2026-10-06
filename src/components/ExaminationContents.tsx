import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { digitalContents, basContents, plusContents } from "@/lib/examination-content";

export function ExaminationContents() {
  return (
    <div className="mt-8 divide-y border-y">
      <Examination name="OneLab Digital" items={digitalContents} />
      <Examination name="OneLab Bas" items={basContents} />
      <Examination name="OneLab Plus" items={plusContents} />
    </div>
  );
}

function Examination({ name, items }: { name: string; items: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="examination-disclosure">
      <Button type="button" variant="ghost" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(!open)} className="no-print h-auto w-full justify-between whitespace-normal rounded-none py-5 text-left">
        <span>Innehåll i {name}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </Button>
      <div id={id} className={`examination-panel px-4 pb-6 ${open ? "block" : "hidden"}`}>
        <h3 className="mb-3 hidden font-medium print:block">Innehåll i {name}</h3>
        <ul className="grid list-disc gap-x-8 gap-y-2 pl-4 text-sm text-muted-foreground sm:grid-cols-2 print:grid-cols-2">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}