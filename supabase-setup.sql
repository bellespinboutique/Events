create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  table_number text,
  name text not null,
  username text,
  logo_url text,
  website_url text,
  notes text,
  x numeric not null default 50,
  y numeric not null default 50,
  width numeric not null default 10,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors
add column if not exists table_number text;

alter table public.vendors enable row level security;

drop policy if exists "Public can read visible vendors" on public.vendors;
create policy "Public can read visible vendors"
on public.vendors for select
using (is_visible = true);

drop policy if exists "Authenticated users can read all vendors" on public.vendors;
create policy "Authenticated users can read all vendors"
on public.vendors for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert vendors" on public.vendors;
create policy "Authenticated users can insert vendors"
on public.vendors for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update vendors" on public.vendors;
create policy "Authenticated users can update vendors"
on public.vendors for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete vendors" on public.vendors;
create policy "Authenticated users can delete vendors"
on public.vendors for delete
to authenticated
using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendors_set_updated_at on public.vendors;
create trigger vendors_set_updated_at
before update on public.vendors
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('vendor-logos', 'vendor-logos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read vendor logos" on storage.objects;
create policy "Public can read vendor logos"
on storage.objects for select
using (bucket_id = 'vendor-logos');

drop policy if exists "Authenticated users can upload vendor logos" on storage.objects;
create policy "Authenticated users can upload vendor logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'vendor-logos');

drop policy if exists "Authenticated users can update vendor logos" on storage.objects;
create policy "Authenticated users can update vendor logos"
on storage.objects for update
to authenticated
using (bucket_id = 'vendor-logos')
with check (bucket_id = 'vendor-logos');

drop policy if exists "Authenticated users can delete vendor logos" on storage.objects;
create policy "Authenticated users can delete vendor logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'vendor-logos');
