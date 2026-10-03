-- Apply once in the Supabase SQL editor. Safe to re-run: product rows are never overwritten.
-- All application access goes through the server's service-role client.
begin;
create table if not exists public.app_records (
  kind text not null,
  id text not null,
  data jsonb not null,
  primary key (kind, id),
  constraint allowed_record_kind check (kind in ('products','carts','orders','sessions','rate_limits','email_jobs'))
);
create table if not exists public.shop_revision (
  id integer primary key check (id = 1),
  version bigint not null default 0
);
insert into public.shop_revision (id) values (1) on conflict do nothing;
alter table public.app_records enable row level security;
alter table public.shop_revision enable row level security;
revoke all on public.app_records, public.shop_revision from public, anon, authenticated;
grant all on public.app_records, public.shop_revision to service_role;

-- One statement returns a consistent snapshot of the records and revision.
create or replace function public.shop_snapshot() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('version', r.version, 'state', (
    select jsonb_object_agg(c.kind, coalesce((
      select jsonb_object_agg(a.id, a.data) from public.app_records a where a.kind = c.kind
    ), '{}'::jsonb))
    from unnest(array['products','carts','orders','sessions','rate_limits','email_jobs']) c(kind)
  )) from public.shop_revision r where r.id = 1;
$$;

-- Optimistic concurrency: only commit if no other request changed the snapshot.
-- Inventory reservation, order creation, cart changes and email jobs commit atomically.
create or replace function public.shop_commit(expected_version bigint, new_state jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare current_version bigint;
begin
  select version into current_version from public.shop_revision where id = 1 for update;
  if current_version <> expected_version then return false; end if;
  if jsonb_typeof(new_state) <> 'object' or not (new_state ?& array['products','carts','orders','sessions','rate_limits','email_jobs']) then
    raise exception 'Invalid state';
  end if;
  delete from public.app_records;
  insert into public.app_records(kind, id, data)
    select category.key, record.key, record.value
    from jsonb_each(new_state) category cross join lateral jsonb_each(category.value) record;
  update public.shop_revision set version = version + 1 where id = 1;
  return true;
end;
$$;
revoke all on function public.shop_snapshot() from public, anon, authenticated;
revoke all on function public.shop_commit(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.shop_snapshot() to service_role;
grant execute on function public.shop_commit(bigint, jsonb) to service_role;

-- Catalog seed. Edit product data in this table only while the application is stopped.
-- For a larger shop, use normalized tables and dedicated admin/checkout RPCs.
insert into public.app_records(kind,id,data) values
('products','lagos-essential','{"id":"lagos-essential","name":"The Lagos Essential","category":"EVERYDAY CLASSIC","description":"A clean white tee with an easy, relaxed silhouette. Your everyday starting point.","price":1800000,"stock":30,"sizes":["S","M","L","XL"],"image":"/images/essential.jpg"}'),
('products','weekend-hoodie','{"id":"weekend-hoodie","name":"The Weekend Hoodie","category":"OFF-DUTY UNIFORM","description":"Keep your weekend rotation simple with this laid-back wardrobe staple.","price":2200000,"stock":25,"sizes":["S","M","L","XL"],"image":"/images/weekend.jpg"}'),
('products','signature-tee','{"id":"signature-tee","name":"The Signature Tee","category":"LESS, BUT BETTER","description":"An understated essential. Style it your way, from a slow morning to a night out.","price":2000000,"stock":20,"sizes":["S","M","L","XL"],"image":"/images/signature.jpg"}')
on conflict do nothing;
commit;
