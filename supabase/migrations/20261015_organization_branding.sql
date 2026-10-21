-- Organization-wide proposal branding. One profile per tenant.
create table if not exists public.organization_branding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  logo_url text not null default '' check (length(logo_url) <= 2048 and (logo_url = '' or logo_url ~ '^https://')),
  theme text not null default 'midnight' check (theme in ('midnight', 'ocean', 'forest')),
  updated_at timestamptz not null default now()
);
alter table public.organization_branding enable row level security;
create policy branding_read on public.organization_branding for select to authenticated
  using (public.member_role(organization_id) in ('admin','seller'));
create policy branding_insert on public.organization_branding for insert to authenticated
  with check (public.member_role(organization_id) = 'admin');
create policy branding_update on public.organization_branding for update to authenticated
  using (public.member_role(organization_id) = 'admin')
  with check (public.member_role(organization_id) = 'admin');
create policy branding_delete on public.organization_branding for delete to authenticated
  using (public.member_role(organization_id) = 'admin');
