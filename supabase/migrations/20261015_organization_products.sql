-- Organization-scoped catalog for products and explicitly approved prices.
create table if not exists public.organization_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text not null default '',
  unit text not null default 'st' check (char_length(unit) between 1 and 40),
  price_sek numeric(12,2) check (price_sek is null or price_sek >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organization_products_org_idx on public.organization_products(organization_id);
alter table public.organization_products enable row level security;
create policy "members can read organization products" on public.organization_products for select to authenticated using (
  exists(select 1 from public.organization_members m where m.organization_id = organization_products.organization_id and m.user_id = auth.uid())
);
create policy "admins can insert organization products" on public.organization_products for insert to authenticated with check (
  exists(select 1 from public.organization_members m where m.organization_id = organization_products.organization_id and m.user_id = auth.uid() and m.role = 'admin')
);
create policy "admins can update organization products" on public.organization_products for update to authenticated using (
  exists(select 1 from public.organization_members m where m.organization_id = organization_products.organization_id and m.user_id = auth.uid() and m.role = 'admin')
) with check (
  exists(select 1 from public.organization_members m where m.organization_id = organization_products.organization_id and m.user_id = auth.uid() and m.role = 'admin')
);
create policy "admins can delete organization products" on public.organization_products for delete to authenticated using (
  exists(select 1 from public.organization_members m where m.organization_id = organization_products.organization_id and m.user_id = auth.uid() and m.role = 'admin')
);
