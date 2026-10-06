import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Download, Link2, Loader2, RefreshCw, Sparkles, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateProposal } from "@/lib/proposals.functions";
import type { ProposalContent } from "@/lib/proposal-types";
import { ProposalDocument } from "@/components/ProposalDocument";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/_authenticated/forslag/$id")({
  head: () => ({
    meta: [
      { title: "Förslag – OneLab" },
      { name: "description", content: "Redigera kundförslag." },
      { property: "og:title", content: "Förslag – OneLab" },
      { property: "og:description", content: "Redigera kundförslag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Editor,
});

function Editor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const generate = useServerFn(generateProposal);
  const { data: p, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("proposals").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const [content, setContent] = useState<ProposalContent | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [regen, setRegen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [instruction, setInstruction] = useState("");
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingSave = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (p) {
      setContent((p.content as unknown as ProposalContent) ?? null);
      setNotes(p.notes);
    }
  }, [p]);

  function onChange(next: ProposalContent) {
    if (regen) return;
    setContent(next);
    setSaving("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pendingSave.current = pendingSave.current.then(async () => {
        const { error } = await supabase.from("proposals").update({ content: next as never }).eq("id", id);
        if (error) toast.error("Kunde inte spara");
        setSaving(error ? "idle" : "saved");
      });
    }, 700);
  }

  async function regenerate(adjustment?: string) {
    if (regen) return;
    setRegen(true);
    clearTimeout(timer.current);
    try {
      await pendingSave.current;
      const { error } = await supabase.from("proposals").update({ notes, ...(content ? { content: content as never } : {}) }).eq("id", id);
      if (error) throw new Error("Kunde inte spara dina ändringar. Försök igen.");
      const c = await generate({ data: { id, ...(adjustment ? { instruction: adjustment } : {}) } });
      setContent(c);
      await qc.invalidateQueries({ queryKey: ["proposal", id] });
      setSaving("saved");
      if (adjustment) setInstruction("");
      toast.success(adjustment ? "Förslaget har justerats" : "Nytt förslag skrivet");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Något gick fel");
    }
    setRegen(false);
  }

  async function toggleShare(v: boolean) {
    await supabase.from("proposals").update({ is_shared: v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["proposal", id] });
  }

  async function del() {
    if (!confirm("Ta bort förslaget?")) return;
    await supabase.from("proposals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["proposals"] });
    navigate({ to: "/forslag" });
  }

  if (isLoading || !p) return <p className="p-16 text-muted-foreground">Laddar…</p>;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/dela/${p.share_token}` : "";

  return (
    <div>
      <div className="no-print sticky top-16 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-2">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/forslag" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="truncate font-medium">{p.customer_name}</span>
            <span className="hidden text-xs text-muted-foreground md:inline">
              {saving === "saving" ? "Sparar…" : saving === "saved" ? "Sparat" : content ? "Klicka på texten för att redigera" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNotes((s) => !s)}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Anteckningar
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full" disabled={!content}>
                  <Link2 className="mr-1.5 h-4 w-4" /> Dela
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Publik länk</p>
                    <p className="text-xs text-muted-foreground">Alla med länken kan läsa förslaget.</p>
                  </div>
                  <Switch checked={p.is_shared} onCheckedChange={toggleShare} />
                </div>
                {p.is_shared && <ShareLink url={shareUrl} />}
              </PopoverContent>
            </Popover>
            <Button size="sm" className="rounded-full" disabled={!content} onClick={() => window.print()}>
              <Download className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={del} aria-label="Ta bort">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {showNotes && (
        <div className="no-print mx-auto max-w-[900px] px-6 pt-8">
          <div className="rounded-2xl border bg-paper p-6">
            <p className="eyebrow mb-3">Mötesanteckningar</p>
             <Textarea value={notes} disabled={regen} onChange={(e) => setNotes(e.target.value)} className="min-h-48" />
             <Button className="mt-4 rounded-full" onClick={() => regenerate()} disabled={regen}>
              {regen ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Skriv om förslaget
            </Button>
            <span className="ml-3 text-xs text-muted-foreground">Ersätter nuvarande text.</span>
          </div>
        </div>
      )}

      {content && (
        <form aria-label="OneLab AI" className="no-print fixed inset-x-4 bottom-4 z-30 ml-auto max-w-[420px] rounded-lg border bg-paper p-4 shadow-lg xl:inset-x-auto xl:right-6 xl:bottom-auto xl:top-40 xl:w-80" onSubmit={(event) => {
          event.preventDefault();
          if (instruction.trim()) void regenerate(instruction.trim());
        }}>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="adjustment" className="font-medium">Justera förslaget med AI</label>
            <Button type="button" variant="ghost" size="icon" aria-label={assistantCollapsed ? "Öppna AI-rutan" : "Minimera AI-rutan"} aria-expanded={!assistantCollapsed} onClick={() => setAssistantCollapsed(!assistantCollapsed)}>
              {assistantCollapsed ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
          <div className={assistantCollapsed ? "hidden" : "mt-3"}>
          <Textarea id="adjustment" value={instruction} disabled={regen} maxLength={6000}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Till exempel: Korta inledningen och lyft fram stödet till HR."
            className="min-h-28 bg-paper" />
          <Button type="submit" disabled={regen || !instruction.trim()} className="mt-3 rounded-full">
            {regen ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {regen ? "Bearbetar förslaget…" : "Justera förslaget"}
          </Button>
          </div>
        </form>
      )}

      <div className={`px-6 py-10 print:p-0 ${content ? "pb-80 xl:pr-[370px] xl:pb-10" : ""}`} inert={regen}>
        {content ? (
          <ProposalDocument content={content} customerName={p.customer_name} editable onChange={onChange} />
        ) : (
          <div className="mx-auto max-w-xl py-20 text-center">
            <p className="display text-3xl">Inget förslag skrivet än</p>
            <Button className="mt-6 rounded-full" onClick={() => regenerate()} disabled={regen}>
              {regen && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Skriv förslag med AI
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary p-2 pl-3 text-xs">
      <span className="flex-1 truncate">{url}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
