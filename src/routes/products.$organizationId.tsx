import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/products/$organizationId")({
  component: ProductCatalog,
  head: () => ({ meta: [{ title: "Produktbibliotek – Proposo" }] }),
});
type Product = { id: string; name: string; description: string; unit: string; price_sek: number | null; is_active: boolean };

function ProductCatalog() {
  const { organizationId } = Route.useParams();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("person");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const { data, error: fetchError } = await supabase.from("organization_products")
      .select("id,name,description,unit,price_sek,is_active")
      .eq("organization_id", organizationId).order("name");
    if (fetchError) setError(fetchError.message);
    else setProducts((data ?? []) as Product[]);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate({ to: "/auth", replace: true }); return; }
      const { data: member, error: memberError } = await supabase.from("organization_members")
        .select("role").eq("organization_id", organizationId).eq("user_id", auth.user.id).maybeSingle();
      if (!active) return;
      if (memberError || !member) { setError("Du saknar tillgång till företagets produktbibliotek."); setLoading(false); return; }
      setAdmin(member.role === "admin");
      await reload();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [organizationId, navigate]);

  async function addProduct() {
    if (!admin || !name.trim() || busy) return;
    const parsed = price.trim() ? Number(price.replace(",", ".")) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) { setError("Ange ett giltigt pris eller lämna prisfältet tomt."); return; }
    setBusy(true); setError("");
    const { error: insertError } = await supabase.from("organization_products").insert({
      organization_id: organizationId, name: name.trim(), description: description.trim(),
      price_sek: parsed, unit: unit.trim() || "st",
    });
    if (insertError) setError(insertError.message);
    else { setName(""); setDescription(""); setPrice(""); await reload(); }
    setBusy(false);
  }

  async function toggleProduct(product: Product) {
    if (!admin) return;
    const { error: updateError } = await supabase.from("organization_products")
      .update({ is_active: !product.is_active }).eq("id", product.id).eq("organization_id", organizationId);
    if (updateError) setError(updateError.message); else await reload();
  }

  return <main className="mx-auto max-w-4xl space-y-7 px-6 py-10">
    <Link to="/workspace" className="text-sm underline">Tillbaka till arbetsytan</Link>
    <div><h1 className="text-3xl font-semibold">Produkt- och prisbibliotek</h1>
      <p className="mt-2 text-sm text-muted-foreground">Företagets godkända tjänster och priser. Endast administratörer får ändra uppgifterna.</p></div>
    {error && <p role="alert" className="rounded-md border p-3 text-sm text-destructive">{error}</p>}
    {loading ? <p>Laddar bibliotek…</p> : <>
      {admin && <section className="space-y-3 rounded-xl border p-5">
        <h2 className="font-semibold">Lägg till tjänst</h2>
        <label className="block space-y-1 text-sm">Tjänstens namn<input value={name} maxLength={160} onChange={e => setName(e.target.value)} className="w-full rounded-md border bg-background p-2" /></label>
        <label className="block space-y-1 text-sm">Beskrivning<textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-md border bg-background p-2" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">Pris i SEK (valfritt)<input value={price} inputMode="decimal" onChange={e => setPrice(e.target.value)} placeholder="2490" className="w-full rounded-md border bg-background p-2" /></label>
          <label className="block space-y-1 text-sm">Prisenhet<input value={unit} maxLength={40} onChange={e => setUnit(e.target.value)} placeholder="person" className="w-full rounded-md border bg-background p-2" /></label>
        </div>
        <button type="button" disabled={!name.trim() || busy} onClick={() => { void addProduct(); }} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? "Sparar…" : "Spara tjänst"}</button>
      </section>}
      <section className="space-y-3"><h2 className="font-semibold">Tjänster ({products.length})</h2>
        {!products.length && <p className="text-sm text-muted-foreground">Inga tjänster tillagda ännu.</p>}
        {products.map(product => <article key={product.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
          <div><h3 className="font-medium">{product.name} {!product.is_active && <span className="text-xs text-muted-foreground">(inaktiv)</span>}</h3>
            {product.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{product.description}</p>}
            <p className="mt-2 text-sm font-semibold">{product.price_sek === null ? "Pris ej angivet" : `${Number(product.price_sek).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr / ${product.unit}`}</p></div>
          {admin && <button type="button" onClick={() => { void toggleProduct(product); }} className="rounded-md border px-3 py-1.5 text-xs">{product.is_active ? "Inaktivera" : "Aktivera"}</button>}
        </article>)}
      </section>
    </>}
  </main>;
}
