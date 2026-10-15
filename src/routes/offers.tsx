import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/offers")({
  component: OffersDashboard,
  head: () => ({ meta: [{ title: "Mina offerter – Proposo" }] }),
});

type Org = { id: string; name: string; role: "admin" | "seller" };
type Offer = {
  id: string; organization_id: string; owner_id: string;
  title: string; customer_name: string; status: "draft" | "completed";
  updated_at: string;
};

function OffersDashboard() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selected, setSelected] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [userId, setUserId] = useState("");
  const [customer, setCustomer] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate({ to: "/auth", replace: true }); return; }
      if (!active) return;
      setUserId(auth.user.id);
      const { data: members, error: memberError } = await supabase
        .from("organization_members").select("organization_id, role").eq("user_id", auth.user.id);
      if (memberError) { setError(memberError.message); setLoading(false); return; }
      const m = (members ?? []) as { organization_id: string; role: "admin" | "seller" }[];
      if (!m.length) { navigate({ to: "/workspace", replace: true }); return; }
      const { data: companies, error: orgError } = await supabase.from("organizations")
        .select("id, name").in("id", m.map((x) => x.organization_id));
      if (!active) return;
      if (orgError) { setError(orgError.message); setLoading(false); return; }
      const roleMap = new Map(m.map((x) => [x.organization_id, x.role]));
      const all = ((companies ?? []) as { id: string; name: string }[]).map((x) => ({
        ...x, role: roleMap.get(x.id) ?? "seller",
      }));
      setOrgs(all);
      setSelected(all[0]?.id ?? "");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  async function refresh(orgId: string) {
    if (!orgId) return;
    setError("");
    // RLS enforces: admin sees all company proposals; seller only their own.
    const { data, error: fetchError } = await supabase.from("proposals")
      .select("id, organization_id, owner_id, title, customer_name, status, updated_at")
      .eq("organization_id", orgId).order("updated_at", { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setOffers((data ?? []) as Offer[]);
  }
  useEffect(() => { void refresh(selected); }, [selected]);

  async function addOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !userId || !customer.trim() || busy) return;
    setBusy(true);
    setError("");
    const { error: insertError } = await supabase.from("proposals").insert({
      organization_id: selected, owner_id: userId,
      customer_name: customer.trim(), title: title.trim() || "Ny offert",
      status: "draft", content: {},
    });
    if (insertError) setError(insertError.message);
    else { setCustomer(""); setTitle(""); await refresh(selected); }
    setBusy(false);
  }

  const org = orgs.find((x) => x.id === selected);
  return <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm text-muted-foreground">Proposo</p><h1 className="text-3xl font-semibold">Offerter</h1></div>
      <Link to="/workspace" className="text-sm underline">Hantera företagskonton</Link>
    </header>
    {loading ? <p>Hämtar arbetsytan…</p> : <>
      <label className="block max-w-md space-y-2 text-sm">
        <span>Företag</span>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-md border bg-background p-3">
          {orgs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        {org?.role === "admin" ? "Som administratör ser du alla företagets offerter." : "Som säljare ser du endast dina egna offerter."}
      </p>
      <form onSubmit={addOffer} className="space-y-3 rounded-xl border p-5">
        <h2 className="font-semibold">Skapa offertutkast</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input aria-label="Kundnamn" required maxLength={160} value={customer}
            onChange={(e) => setCustomer(e.target.value)} placeholder="Kundnamn"
            className="rounded-md border bg-background p-3" />
          <input aria-label="Offerttitel" maxLength={160} value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="Offerttitel"
            className="rounded-md border bg-background p-3" />
        </div>
        <button disabled={busy || !selected || !customer.trim()} type="submit"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
          {busy ? "Sparar…" : "Skapa utkast"}
        </button>
      </form>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Sparade offerter</h2>
        {offers.length === 0 ? <p className="text-muted-foreground">Inga offerter ännu.</p> :
          offers.map((offer) => <article key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div><h3 className="font-medium">{offer.title}</h3><p className="text-sm text-muted-foreground">{offer.customer_name}</p></div>
            <div className="flex items-center gap-5">
              <Link to="/offers/$offerId" params={{ offerId: offer.id }} className="text-sm font-medium underline">
                {offer.owner_id === userId ? "Redigera" : "Visa"}
              </Link>
              <div className="text-right text-sm">
              <p>{offer.status === "completed" ? "Färdig" : "Utkast"}</p>
              <p className="text-muted-foreground">{new Date(offer.updated_at).toLocaleDateString("sv-SE")}</p>
              </div>
            </div>
          </article>)}
      </section>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </main>;
}
