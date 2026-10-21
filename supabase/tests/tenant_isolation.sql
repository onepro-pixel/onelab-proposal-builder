-- Proposo RLS regression tests. Run in a disposable test database.
-- Never run this script against a database with real customers.
-- This script is intentionally NOT applied as a migration.
begin;

-- Create four test identities. A dedicated test DB is required.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000','authenticated','authenticated','proposo-admin-a@example.invalid','',now(),now(),now()),
('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000','authenticated','authenticated','proposo-seller-a@example.invalid','',now(),now(),now()),
('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000','authenticated','authenticated','proposo-admin-b@example.invalid','',now(),now(),now()),
('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000','authenticated','authenticated','proposo-seller-b@example.invalid','',now(),now(),now());

do $$
declare a uuid; b uuid; pa uuid; pb uuid;
begin
  insert into public.organizations(name,created_by) values ('TEST A','11111111-1111-4111-8111-111111111111') returning id into a;
  insert into public.organizations(name,created_by) values ('TEST B','33333333-3333-4333-8333-333333333333') returning id into b;
  insert into public.organization_members(organization_id,user_id,role) values
  (a,'11111111-1111-4111-8111-111111111111','admin'),
  (a,'22222222-2222-4222-8222-222222222222','seller'),
  (b,'33333333-3333-4333-8333-333333333333','admin'),
  (b,'44444444-4444-4444-8444-444444444444','seller');
  insert into public.proposals(organization_id,owner_id,customer_name) values (a,'22222222-2222-4222-8222-222222222222','Customer A') returning id into pa;
  insert into public.proposals(organization_id,owner_id,customer_name) values (b,'44444444-4444-4444-8444-444444444444','Customer B') returning id into pb;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare n integer;
begin
  select count(*) into n from public.proposals;
  if n <> 1 then raise exception 'Seller A sees % proposals, expected 1',n; end if;
  select count(*) into n from public.organizations;
  if n <> 1 then raise exception 'Seller A sees % organizations, expected 1',n; end if;
  select count(*) into n from public.proposals p where p.customer_name = 'Customer B';
  if n <> 0 then raise exception 'Cross-tenant proposal leaked'; end if;
end $$;

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare n integer;
begin
  select count(*) into n from public.proposals;
  if n <> 1 then raise exception 'Admin A sees % proposals, expected 1',n; end if;
end $$;

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$
declare n integer;
begin
  select count(*) into n from public.proposals;
  if n <> 1 then raise exception 'Admin B sees % proposals, expected 1',n; end if;
end $$;
rollback;
