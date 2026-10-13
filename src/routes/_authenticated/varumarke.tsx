import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brandAssetPath, type BrandProfile } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/varumarke")({
  component: BrandSettings,
  head: () => ({ meta: [{ title: "Varumärke – Proposo" }] }),
});

const defaults = {
  primary_color: "#172554", accent_color: "#0ea5e9",
  background_color: "#ffffff", text_color: "#111827",
};
const colors = [
  ["primary_color", "Primärfärg"], ["accent_color", "Accentfärg"],
  ["background_color", "Bakgrund"], ["text_color", "Textfärg"],
] as const;

function BrandSettings() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data: memberships, error } = await supabase.from("organization_members")
          .select("organization_id").eq("user_id", auth.user.id).limit(1);
        if (error) throw error;
        const orgId = memberships?.[0]?.organization_id;
        if (!orgId) return;
        const { data: profile, error: profileError } = await supabase.from("brand_profiles")
          .select("*").eq("organization_id", orgId).single();
        if (profileError) throw profileError;
        if (active) { setOrganizationId(orgId); setBrand(profile); }
      } catch (e) { if (active) toast.error(e instanceof Error ? e.message : "Kunde inte läsa varumärkesprofilen"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!brand?.logo_path) { setLogoUrl(null); return; }
    let active = true;
    supabase.storage.from("proposo-brand-assets").createSignedUrl(brand.logo_path, 600)
      .then(({ data }) => { if (active) setLogoUrl(data?.signedUrl ?? null); });
    return () => { active = false; };
  }, [brand?.logo_path]);

  async function createOrganization() {
    const name = window.prompt("Vad heter ditt företag?");
    if (!name?.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("create_organization", { org_name: name.trim() });
    setBusy(false);
    if (error) toast.error(error.message);
    else window.location.reload();
  }

  async function save() {
    if (!brand || !organizationId) return;
    setBusy(true);
    const { error } = await supabase.from("brand_profiles").update({
      company_name: brand.company_name,
      primary_color: brand.primary_color, accent_color: brand.accent_color,
      background_color: brand.background_color, text_color: brand.text_color,
    }).eq("organization_id", organizationId);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Varumärkesprofilen sparad");
  }

  async function upload(file: File, kind: "logo" | "image" | "font") {
    if (!brand || !organizationId) return;
    const mimeTypes: Record<typeof kind, string[]> = {
      logo: ["image/png", "image/jpeg", "image/webp"],
      image: ["image/png", "image/jpeg", "image/webp"],
      font: ["font/woff2", "font/ttf", "font/otf", "application/octet-stream"],
    };
    if (!mimeTypes[kind].includes(file.type) || file.size > 10 * 1024 * 1024) {
      toast.error("Fel filformat eller filen är större än 10 MB");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["png", "jpg", "jpeg", "webp", "woff2", "ttf", "otf"].includes(ext)) {
      toast.error("Filtypen stöds inte"); return;
    }
    const path = brandAssetPath(organizationId, `${crypto.randomUUID()}.${ext}`);
    setBusy(true);
    const { error: uploadError } = await supabase.storage.from("proposo-brand-assets").upload(path, file, { upsert: false });
    if (uploadError) { toast.error(uploadError.message); setBusy(false); return; }
    const { error: assetError } = await supabase.from("brand_assets").insert({
      organization_id: organizationId, storage_path: path, asset_type: kind, label: file.name,
    });
    if (assetError) { toast.error(assetError.message); setBusy(false); return; }
    if (kind === "logo") {
      const { error } = await supabase.from("brand_profiles").update({ logo_path: path }).eq("organization_id", organizationId);
      if (!error) setBrand({ ...brand, logo_path: path });
      else toast.error(error.message);
    }
    toast.success("Filen är uppladdad");
    setBusy(false);
  }

  if (loading) return <main className="mx-auto max-w-4xl p-8">Laddar varumärkesprofil…</main>;
  if (!brand) return <main className="mx-auto max-w-4xl space-y-6 p-8">
    <h1 className="display text-4xl">Ditt varumärke</h1>
    <p>Skapa en företagsprofil för att samla din logotyp, dina färger och ditt bildmaterial.</p>
    <Button disabled={busy} onClick={createOrganization}>Skapa företagsprofil</Button>
  </main>;

  return <main className="mx-auto max-w-4xl space-y-10 px-6 py-12">
    <div className="flex items-center justify-between gap-4">
      <div><p className="eyebrow">Proposo backoffice</p><h1 className="display text-4xl">Ditt varumärke</h1></div>
      <Button onClick={save} disabled={busy}>Spara profil</Button>
    </div>
    <section className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="company-name">Företagsnamn</label>
      <Input id="company-name" value={brand.company_name} onChange={e => setBrand({ ...brand, company_name: e.target.value })} />
    </section>
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Färger</h2>
      <div className="grid gap-4 sm:grid-cols-2">{colors.map(([key, label]) =>
        <label key={key} className="flex items-center gap-4 rounded-lg border p-3">
          <input aria-label={label} type="color" value={brand[key] || defaults[key]} onChange={e => setBrand({ ...brand, [key]: e.target.value })} className="h-10 w-12 cursor-pointer" />
          <span>{label}<small className="block text-muted-foreground">{brand[key]}</small></span>
        </label>
      )}</div>
    </section>
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Logotyp</h2>
      {logoUrl && <img src={logoUrl} alt="Företagets logotyp" className="max-h-24 max-w-64 object-contain" />}
      <input aria-label="Ladda upp logotyp" type="file" accept=".png,.jpg,.jpeg,.webp" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f, "logo"); }} />
    </section>
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Bildbibliotek och typsnitt</h2>
      <p className="text-sm text-muted-foreground">Ladda upp företagets bilder och typsnitt. Nästa steg är att välja vilka filer som används i varje offertmall.</p>
      <label className="block">Bilder <input className="mt-2 block" type="file" accept=".png,.jpg,.jpeg,.webp" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f, "image"); }} /></label>
      <label className="block">Typsnitt <input className="mt-2 block" type="file" accept=".woff2,.ttf,.otf" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f, "font"); }} /></label>
    </section>
    <p className="text-sm text-muted-foreground">Profilen och filerna är privata för din organisation. PDF-mallarna kopplas till profilen i nästa utvecklingssteg.</p>
  </main>;
}
