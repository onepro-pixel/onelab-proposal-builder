import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/forslag/")({
  head: () => ({
    meta: [
      { title: "Mina förslag – OneLab" },
      { name: "description", content: "Dina sparade kundförslag." },
      { property: "og:title", content: "Mina förslag – OneLab" },
      { property: "og:description", content: "Dina sparade kundförslag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: List,
});

function List() {
  const { data, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, customer_name, contact_person, updated_at, is_shared, content")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow mb-3">Översikt</p>
          <h1 className="display text-5xl">Mina förslag</h1>
        </div>
        <Button asChild className="h-11 rounded-full px-6">
          <Link to="/forslag/ny">
            <Plus className="mr-1 h-4 w-4" /> Ny offert
          </Link>
        </Button>
      </div>

      <div className="mt-12 divide-y border-y">
        {isLoading && <p className="py-10 text-muted-foreground">Laddar…</p>}
        {data?.length === 0 && (
          <div className="py-20 text-center">
            <p className="display text-3xl">Inga förslag än</p>
            <p className="mt-2 text-muted-foreground">Klistra in dina anteckningar från Sales Kong så skriver AI:n ett första utkast.</p>
          </div>
        )}
        {data?.map((p) => (
          <Link
            key={p.id}
            to="/forslag/$id"
            params={{ id: p.id }}
            className="group grid grid-cols-[1fr_auto_auto] items-center gap-8 py-6 transition-colors hover:bg-paper"
          >
            <div>
              <p className="text-xl">{p.customer_name}</p>
              <p className="text-sm text-muted-foreground">{p.contact_person || "—"}</p>
            </div>
            <div className="flex gap-2 text-xs">
              {!p.content && <span className="rounded-full bg-secondary px-3 py-1">Utkast</span>}
              {p.is_shared && <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">Delad</span>}
              <span className="text-muted-foreground">
                {new Date(p.updated_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </main>
  );
}
