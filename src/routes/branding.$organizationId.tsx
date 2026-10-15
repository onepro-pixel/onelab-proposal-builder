import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/branding/$organizationId")({
  component: BrandingSettings,
  head: () => ({ meta: [{ title: "Företagsprofil – Proposo" }] }),
});

type Theme = "midnight" | "ocean" | "forest";
type Profile = { display_name: string; logo_url: string; theme: Theme };
const initial: Profile = { display_name: "", logo_url: "", theme: "midnight" };

function BrandingSettings() {
  const { organizationId } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(initial);
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate({ to: "/auth", replace: true }); return; }
      const { data: membership, error: memberError } = await supabase.from("organization_members")
        .select("role").eq("organization_id", organizationId).eq("user_id", auth.user.id).maybeSingle();
      if (!active) return;
      if (memberError || membership?.role !== "admin") { setError("Endast företagets administratörer kan ändra profilen."); setLoading(false); return; }
      const [org, branding] = await Promise.all([
        supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
        supabase.from("organization_branding" as never).select("display_name, logo_url, theme").eq("organization_id", organizationId).maybeSingle(),
      ]);
      if (!active) return;
      if (org.error || branding.error) { setError(org.error?.message || branding.error?.message || "Kunde inte läsa företagsprofilen."); setLoading(false); return; }
      setCompany(org.data?.name ?? "");
      if (branding.data) setProfile(branding.data as Profile);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [organizationId, navigate]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(""); setSuccess(false);
    const url = profile.logo_url.trim();
    if (url && !/^https:\/\/[^\s]+$/i.test(url)) { setError("Logotypen måste ha en giltig HTTPS-adress."); setSaving(false); return; }
    const { error: saveError } = await supabase.from("organization_branding" as never).upsert({
      organization_id: organizationId, display_name: profile.display_name.trim(), logo_url: url, theme: profile.theme,
    } as never, { onConflict: "organization_id" });
    if (saveError) setError(saveError.message); else setSuccess(true);
    setSaving(false);
  }

  return <main className="mx-auto max-w-2xl space-y-7 px-6 py-10">
    <Link to="/workspace" className="text-sm underline">Tillbaka till arbetsytan</Link>
    <div><p className="text-sm text-muted-foreground">Proposo / Företagsinställningar</p><h1 className="text-3xl font-semibold">Grafisk profil</h1>
      <p className="mt-2 text-sm text-muted-foreground">{company || "Företag"} · Administratörsinställningar</p></div>
    {error && <p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{error}</p>}
    {loading ? <p>Hämtar företagsprofil…</p> : !company ? null : <form onSubmit={save} className="space-y-5">
      <label className="block space-y-2"><span className="text-sm font-medium">Avsändarnamn</span>
        <input maxLength={120} value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} placeholder={company} className="w-full rounded-md border bg-background p-3" /></label>
      <label className="block space-y-2"><span className="text-sm font-medium">Logotypens bildadress (HTTPS)</span>
        <input type="url" maxLength={2048} value={profile.logo_url} onChange={(e) => setProfile({ ...profile, logo_url: e.target.value })} placeholder="https://exempel.se/logo.png" className="w-full rounded-md border bg-background p-3" /></label>
      <fieldset className="space-y-3"><legend className="text-sm font-medium">Färgprofil</legend>
        <div className="flex flex-wrap gap-3">{([["midnight","Midnight","#17243d"],["ocean","Ocean","#0d6b86"],["forest","Forest","#24634d"]] as const).map(([theme,label,color]) =>
          <label key={theme} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="theme" checked={profile.theme === theme} onChange={() => setProfile({ ...profile, theme })} /><span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />{label}</label>)}</div>
      </fieldset>
      <button type="submit" disabled={saving} className="rounded-md bg-primary px-5 py-3 text-sm text-primary-foreground disabled:opacity-50">{saving ? "Sparar…" : "Spara företagsprofil"}</button>
      {success && <p role="status" className="text-sm">Företagsprofilen är sparad.</p>}
      <p className="text-xs text-muted-foreground">Profilen används som standard för nya offerter. Enskilda offerter kan anpassas separat.</p>
    </form>}
  </main>;
}
