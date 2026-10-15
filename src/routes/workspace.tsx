import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
  head: () => ({ meta: [{ title: "Arbetsyta – Proposo" }] }),
});

type Membership = { organization_id: string; role: string };
type Organization = { id: string; name: string };
type WorkspaceItem = Organization & { role: string };

function Workspace() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    const { data: memberships, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", auth.user.id);
    if (memberError) { setError(memberError.message); setLoading(false); return; }
    const entries = (memberships ?? []) as Membership[];
    if (!entries.length) { setWorkspaces([]); setLoading(false); return; }
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", entries.map((m) => m.organization_id));
    if (orgError) { setError(orgError.message); setLoading(false); return; }
    const roles = new Map(entries.map((m) => [m.organization_id, m.role]));
    setWorkspaces(((organizations ?? []) as Organization[]).map((org) => ({
      ...org, role: roles.get(org.id) ?? "seller",
    })));
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createOrganization(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError("");
    // The SQL migration introduces this RPC; generated database types are refreshed
    // when the migration is applied.
    const { error: createError } = await supabase.rpc(
      "create_organization", { p_name: name.trim() }
    );
    if (createError) setError(createError.message);
    else { setName(""); await load(); }
    setCreating(false);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div><p className="text-sm text-muted-foreground">Proposo</p><h1 className="text-3xl font-semibold">Din arbetsyta</h1></div>
        <Link to="/demo" className="text-sm underline">Öppna den gamla demon</Link>
      </header>
      {loading ? <p>Hämtar dina företagskonton…</p> : (
        <section className="space-y-5">
          {workspaces.length > 0 && <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((org) => <article key={org.id} className="rounded-xl border p-5">
              <h2 className="text-lg font-semibold">{org.name}</h2>
              <p className="text-sm text-muted-foreground">{org.role === "admin" ? "Administratör" : "Säljare"}</p>
              <Link to="/offers" className="mt-3 inline-block text-sm font-medium underline">Visa offerter</Link>
            </article>)}
          </div>}
          <form onSubmit={createOrganization} className="max-w-lg space-y-3 rounded-xl border p-5">
            <h2 className="text-lg font-semibold">Skapa företagskonto</h2>
            <label htmlFor="organization-name" className="block text-sm">Företagsnamn</label>
            <input id="organization-name" className="w-full rounded-md border bg-background p-3" maxLength={160}
              required value={name} onChange={(e) => setName(e.target.value)} placeholder="Exempel AB" />
            <button type="submit" disabled={creating || !name.trim()} className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
              {creating ? "Skapar…" : "Skapa företag"}
            </button>
          </form>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </section>
      )}
    </main>
  );
}
