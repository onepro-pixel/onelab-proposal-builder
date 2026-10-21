-- Proposo SaaS foundation. Apply only after reviewing the target Supabase project.
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
  role text not null check (role in ('admin','seller')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  customer_name text not null default '',
  title text not null default 'Ny offert',
  status text not null default 'draft' check (status in ('draft','completed')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proposals_org_owner_idx on public.proposals(organization_id,owner_id,updated_at desc);

create or replace function public.member_role(p_org uuid)
returns text language sql stable security definer set search_path = ''
as $$ select m.role from public.organization_members m where m.organization_id = p_org and m.user_id = (select auth.uid()) limit 1 $$;
revoke all on function public.member_role(uuid) from public;
grant execute on function public.member_role(uuid) to authenticated;

create or replace function public.create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 160 then raise exception 'Invalid organization name'; end if;
  insert into public.organizations(name, created_by) values (trim(p_name), auth.uid()) returning id into v_org;
  insert into public.organization_members(organization_id,user_id,role) values(v_org,auth.uid(),'admin');
  return v_org;
end $$;
revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.proposals enable row level security;

create policy organizations_read on public.organizations for select to authenticated
using (public.member_role(id) is not null);
create policy members_read on public.organization_members for select to authenticated
using (public.member_role(organization_id) is not null);
-- Membership changes require a separately authenticated server-side admin operation.
create policy proposals_read on public.proposals for select to authenticated
using (public.member_role(organization_id) = 'admin' or
       (public.member_role(organization_id) = 'seller' and owner_id = (select auth.uid())));
create policy proposals_insert on public.proposals for insert to authenticated
with check (owner_id = (select auth.uid()) and public.member_role(organization_id) in ('admin','seller'));
create policy proposals_update on public.proposals for update to authenticated
using (owner_id = (select auth.uid()) and public.member_role(organization_id) in ('admin','seller'))
with check (owner_id = (select auth.uid()) and public.member_role(organization_id) in ('admin','seller'));
create policy proposals_delete on public.proposals for delete to authenticated
using (owner_id = (select auth.uid()) and public.member_role(organization_id) in ('admin','seller'));

-- Prevent owners from moving proposals to another organization, and keep timestamps server-managed.
create or replace function public.proposal_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id or new.owner_id is distinct from old.owner_id then
      raise exception 'Proposal ownership cannot change';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger proposal_guard_before_write before insert or update on public.proposals
for each row execute function public.proposal_guard();
