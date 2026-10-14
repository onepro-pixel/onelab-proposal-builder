-- Proposo: organization-owned branding and private media.
-- Apply only after reviewing existing auth/RLS policies. Does not migrate legacy app_settings.
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.brand_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  company_name text not null default '',
  primary_color text not null default '#172554' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text not null default '#0ea5e9' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  background_color text not null default '#ffffff' check (background_color ~ '^#[0-9a-fA-F]{6}$'),
  text_color text not null default '#111827' check (text_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_path text,
  cover_image_path text,
  heading_font_path text,
  body_font_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique,
  asset_type text not null check (asset_type in ('logo','image','font')),
  label text not null default '',
  created_at timestamptz not null default now(),
  constraint org_asset_path check (storage_path like organization_id::text || '/%')
);

create or replace function public.is_organization_member(org_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.organization_members m where m.organization_id = org_id and m.user_id = (select auth.uid())) $$;

create or replace function public.is_organization_admin(org_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.organization_members m where m.organization_id = org_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin')) $$;

create or replace function public.create_organization(org_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(org_name)) not between 1 and 160 then raise exception 'Invalid organization name'; end if;
  insert into public.organizations(name, created_by) values(trim(org_name),auth.uid()) returning id into new_id;
  insert into public.organization_members(organization_id,user_id,role) values(new_id,auth.uid(),'owner');
  insert into public.brand_profiles(organization_id,company_name) values(new_id,trim(org_name));
  return new_id;
end $$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.brand_assets enable row level security;

create policy "members read organizations" on public.organizations for select to authenticated using (public.is_organization_member(id));
create policy "members read membership" on public.organization_members for select to authenticated using (public.is_organization_member(organization_id));
create policy "members read branding" on public.brand_profiles for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins update branding" on public.brand_profiles for update to authenticated using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "members read assets" on public.brand_assets for select to authenticated using (public.is_organization_member(organization_id));
create policy "admins insert assets" on public.brand_assets for insert to authenticated with check (public.is_organization_admin(organization_id));
create policy "admins delete assets" on public.brand_assets for delete to authenticated using (public.is_organization_admin(organization_id));

-- Private storage bucket. Upload paths must start with organization UUID.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('proposo-brand-assets','proposo-brand-assets',false,10485760,
  array['image/png','image/jpeg','image/webp','image/svg+xml','font/woff2','font/ttf','font/otf'])
on conflict (id) do nothing;

create policy "members view own brand files" on storage.objects for select to authenticated
using (bucket_id = 'proposo-brand-assets' and public.is_organization_member((split_part(name,'/',1))::uuid));
create policy "admins upload own brand files" on storage.objects for insert to authenticated
with check (bucket_id = 'proposo-brand-assets' and public.is_organization_admin((split_part(name,'/',1))::uuid));
create policy "admins remove own brand files" on storage.objects for delete to authenticated
using (bucket_id = 'proposo-brand-assets' and public.is_organization_admin((split_part(name,'/',1))::uuid));

-- IMPORTANT: Existing proposals/app_settings still require organization-scoped migration
-- and policy review before enabling multi-company production use.
