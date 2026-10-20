import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const link = "rounded-full px-4 py-2 text-sm transition-colors hover:bg-secondary";
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/forslag" className="flex items-center">
              <span className="text-lg font-semibold tracking-tight">Proposo</span>
              <span className="ml-2 text-sm text-muted-foreground">Förslag</span>
            </Link>
            <nav className="flex gap-1">
              <Link to="/forslag" className={link} activeOptions={{ exact: true }} activeProps={{ className: "bg-secondary" }}>
                Mina förslag
              </Link>
              <Link to="/forslag/ny" className={link} activeProps={{ className: "bg-secondary" }}>
                Ny offert
              </Link>
              <Link to="/varumarke" className={link} activeProps={{ className: "bg-secondary" }}>Varumärke</Link>
              <Link to="/installningar" className={link} activeProps={{ className: "bg-secondary" }}>
                Inställningar
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground md:inline">{user.email}</span>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground">
              Logga ut
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
