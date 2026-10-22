import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { OfferWarning } from "@/lib/offer-checks";

export function OfferChecks({ warnings }: { warnings: OfferWarning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-paper px-4 py-3 text-sm text-muted-foreground" role="status">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Kontroll före utskick: inga avvikelser hittades. Läs ändå igenom offerten en sista gång.</span>
      </div>
    );
  }
  const errors = warnings.filter((w) => w.level === "error").length;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      <p className="font-medium">
        Kontrollera innan du skickar ({warnings.length} {warnings.length === 1 ? "punkt" : "punkter"}
        {errors > 0 ? `, varav ${errors} måste åtgärdas` : ""})
      </p>
      <ul className="mt-2 space-y-1.5">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-2">
            {w.level === "error" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-label="Måste åtgärdas" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-label="Kontrollera" />}
            <span>{w.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
