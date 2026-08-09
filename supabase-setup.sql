create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  table_number text,
  marker_type text not null default 'vendor',
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

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Pin Trading Event',
  presented_by text default '@bellespinboutique91 & @ghosthost86 Present',
  summary text,
  event_date date,
  date_label text,
  venue_name text,
  address text,
  vendor_time text,
  public_time text,
  admission text,
  parking text,
  food_policy text,
  vendor_tables_note text,
  flyer_url text,
  flyer_link text,
  is_featured boolean not null default false,
  is_upcoming boolean not null default true,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors
add column if not exists table_number text;

alter table public.vendors
add column if not exists marker_type text not null default 'vendor';

alter table public.vendors enable row level security;
alter table public.events enable row level security;

drop policy if exists "Public can read visible vendors" on public.vendors;
create policy "Public can read visible vendors"
on public.vendors for select
using (is_visible = true);

drop policy if exists "Public can read visible events" on public.events;
create policy "Public can read visible events"
on public.events for select
using (is_visible = true);

drop policy if exists "Authenticated users can read all events" on public.events;
create policy "Authenticated users can read all events"
on public.events for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert events" on public.events;
create policy "Authenticated users can insert events"
on public.events for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update events" on public.events;
create policy "Authenticated users can update events"
on public.events for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete events" on public.events;
create policy "Authenticated users can delete events"
on public.events for delete
to authenticated
using (true);

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

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('vendor-logos', 'vendor-logos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('event-flyers', 'event-flyers', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read vendor logos" on storage.objects;
create policy "Public can read vendor logos"
on storage.objects for select
using (bucket_id in ('vendor-logos', 'event-flyers'));

drop policy if exists "Authenticated users can upload vendor logos" on storage.objects;
create policy "Authenticated users can upload vendor logos"
on storage.objects for insert
to authenticated
with check (bucket_id in ('vendor-logos', 'event-flyers'));

drop policy if exists "Authenticated users can update vendor logos" on storage.objects;
create policy "Authenticated users can update vendor logos"
on storage.objects for update
to authenticated
using (bucket_id in ('vendor-logos', 'event-flyers'))
with check (bucket_id in ('vendor-logos', 'event-flyers'));

drop policy if exists "Authenticated users can delete vendor logos" on storage.objects;
create policy "Authenticated users can delete vendor logos"
on storage.objects for delete
to authenticated
using (bucket_id in ('vendor-logos', 'event-flyers'));

insert into public.events (
  title,
  presented_by,
  summary,
  date_label,
  venue_name,
  address,
  vendor_time,
  public_time,
  admission,
  parking,
  food_policy,
  vendor_tables_note,
  flyer_url,
  flyer_link,
  is_featured,
  is_upcoming,
  is_visible,
  sort_order
)
select
  'Pin Trading Event',
  '@bellespinboutique91 & @ghosthost86 Present',
  'We are excited to host our first big trade event. We love to trade, so join us, stop by, meet the community, and check back for future event announcements coming soon.',
  'Sunday, August 23',
  'DoubleTree by Hilton - Buena Park',
  '7000 Beach Blvd, Buena Park, CA 90620',
  '9:00 AM - 11:00 AM',
  '11:00 AM - 5:00 PM',
  '$5 or Disney pin donation',
  'Free general public parking is available.',
  'No outside food or beverages allowed.',
  'Vendor tables are sold out for this event. Message @bellespinboutique91 to be added to the wait list and notified about future events.',
  'assets/event-flyer.png',
  'https://www.instagram.com/p/DbWM2I8PP3l/',
  true,
  true,
  true,
  0
where not exists (select 1 from public.events where is_featured = true);
