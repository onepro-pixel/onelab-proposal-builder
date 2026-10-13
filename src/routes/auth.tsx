import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";




export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logga in – Proposo" },
      { name: "description", content: "Inloggning för användare." },
      { property: "og:title", content: "Logga in – Proposo" },
      { property: "og:description", content: "Inloggning för användare." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      
      navigate({ to: "/forslag", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === "SIGNED_IN" && session) {
        navigate({ to: "/forslag", replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Ange en giltig e-postadress.");
      return;
    }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Fel e-post eller lösenord.");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
      extraParams: { prompt: "select_account" },
    });
    if (r.error) toast.error("Kunde inte logga in med Google.");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between p-10 lg:p-16">
        <span className="text-3xl font-bold tracking-tight">proposo.</span>
        <div className="mx-auto w-full max-w-sm">
          <p className="eyebrow mb-4">Förslagsverktyget</p>
          <h1 className="display text-5xl">{mode === "in" ? "Välkommen tillbaka" : "Skapa konto"}</h1>
          <p className="mt-4 text-muted-foreground">Logga in med din e-postadress eller testa demon utan konto.</p>
          {sent ? (
            <div className="mt-10 rounded-2xl bg-sand p-6">
              Kolla din inkorg och bekräfta e-postadressen för att komma igång.
            </div>
          ) : (
            <>
              <Button variant="outline" className="mt-10 h-12 w-full rounded-full" onClick={google}>
                Fortsätt med Google
              </Button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                eller
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="namn@foretag.se" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw">Lösenord</Label>
                  <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
                </div>
                <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
                  {mode === "in" ? "Logga in" : "Skapa konto"}
                </Button>
              </form>
              <button type="button" className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                {mode === "in" ? "Inget konto? Skapa ett" : "Har du redan konto? Logga in"}
              </button>
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">Internt verktyg · OneLab</span>
      </div>
      <img src={cover} alt="" width={1920} height={1280} className="hidden h-screen w-full object-cover object-[65%_center] lg:block" />
    </div>
  );
}
