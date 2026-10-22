import { createFileRoute, notFound } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { getSharedProposal } from "@/lib/proposals.functions";
import { ProposalDocument } from "@/components/ProposalDocument";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { offerFileTitle, printDocument } from "@/lib/print";

export const Route = createFileRoute("/dela/$token")({
  loader: async ({ params }) => {
    const ok = /^[0-9a-f-]{36}$/i.test(params.token);
    const p = ok ? await getSharedProposal({ data: { token: params.token } }) : null;
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [
      { title: "Förslaget är inte tillgängligt – OneLab" },
      { name: "description", content: "Detta kundförslag från OneLab är inte tillgängligt." },
      { property: "og:title", content: "Förslaget är inte tillgängligt – OneLab" },
      { property: "og:description", content: "Detta kundförslag från OneLab är inte tillgängligt." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ] };
    const t = loaderData.content.title || `Förslag för ${loaderData.customer_name}`;
    return {
      meta: [
        { title: `${t} – OneLab` },
        { name: "description", content: loaderData.content.subtitle },
        { property: "og:title", content: `${t} – OneLab` },
        { property: "og:description", content: loaderData.content.subtitle },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="display text-4xl">Förslaget är inte tillgängligt</p>
        <p className="mt-3 text-muted-foreground">Länken kan ha stängts. Kontakta din kontaktperson på OneLab.</p>
      </div>
    </div>
  ),
  errorComponent: () => <div className="p-16 text-center">Något gick fel. Försök igen senare.</div>,
  component: Shared,
});

function Shared() {
  const p = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <header className="no-print mx-auto flex max-w-[900px] items-center justify-between px-6 py-6">
        <Wordmark className="h-5" />
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => printDocument(offerFileTitle(p.customer_name))}>
          <Download className="mr-1.5 h-4 w-4" /> Ladda ner PDF
        </Button>
      </header>
      <div className="px-6 pb-16 print:p-0">
        <ProposalDocument content={p.content} customerName={p.customer_name} contactPerson={p.contact_person} />
      </div>
    </div>
  );
}
