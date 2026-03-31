-- ============================================================
-- CourtBook — Supabase Setup SQL
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Create user_roles table
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.user_roles enable row level security;

-- 3. RLS Policies

-- Anyone authenticated can read their own role
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Authenticated users can insert their own role on sign-up
drop policy if exists "Users can insert own role" on public.user_roles;
create policy "Users can insert own role"
  on public.user_roles for insert
  with check (auth.uid() = user_id);

-- Only admins can update roles (optional, for future use)
-- create policy "Admins can update roles"
--   on public.user_roles for update
--   using (exists (
--     select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
--   ));

-- 4. (Optional) Manually promote a user to admin after they register:
--    Find their user_id in Authentication > Users, then run:
--
--    insert into public.user_roles (user_id, role)
--    values ('<paste-user-uuid-here>', 'admin')
--    on conflict (user_id) do update set role = 'admin';

-- ============================================================
-- DONE. The app reads roles from this table on every login.
-- ============================================================

-- ============================================================
-- 5. Create core application tables
-- ============================================================

-- Courts Table
create table if not exists public.courts (
  id          bigserial primary key,
  name        text not null,
  sport       text not null,
  base_rate   integer not null default 0,
  max_players integer not null default 1,
  team_size   integer not null default 1,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- Bookings Table
create table if not exists public.bookings (
  id          text primary key, -- Use custom ids like ev_1234 or auto-gen uuids
  court_id    bigint references public.courts(id) on delete cascade not null,
  court_name  text not null,
  sport       text,
  player      text not null,
  user_email  text not null,
  date        date not null,
  start_time  text not null,
  end_time    text not null,
  membership  text default 'none',
  equipment   jsonb default '[]'::jsonb,
  players     integer default 1,
  cost        integer default 0,
  status      text default 'confirmed',
  is_event    boolean default false,
  created_at  timestamptz default now()
);

-- App Settings (Central config)
create table if not exists public.app_settings (
  id               integer primary key,
  features         jsonb not null default '{}'::jsonb,
  time_slots       jsonb not null default '{}'::jsonb,
  pricing          jsonb not null default '{}'::jsonb,
  memberships      jsonb not null default '[]'::jsonb,
  equipment        jsonb not null default '[]'::jsonb,
  bundles          jsonb not null default '[]'::jsonb,
  promo_codes      jsonb not null default '[]'::jsonb,
  verified_members jsonb not null default '[]'::jsonb,
  updated_at       timestamptz default now()
);

-- Turn on Realtime for these tables
do $$
begin
  begin
    alter publication supabase_realtime add table public.courts;
  exception when duplicate_object then
    null;
  end;
  
  begin
    alter publication supabase_realtime add table public.bookings;
  exception when duplicate_object then
    null;
  end;
  
  begin
    alter publication supabase_realtime add table public.app_settings;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Set up Row Level Security
alter table public.courts enable row level security;
alter table public.bookings enable row level security;
alter table public.app_settings enable row level security;

-- RLS Policies for Courts (Everyone can read, admins can modify)
drop policy if exists "Everyone can view active courts" on public.courts;
create policy "Everyone can view active courts" on public.courts for select using (true);

drop policy if exists "Admins can insert courts" on public.courts;
create policy "Admins can insert courts" on public.courts for insert with check (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can update courts" on public.courts;
create policy "Admins can update courts" on public.courts for update using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can delete courts" on public.courts;
create policy "Admins can delete courts" on public.courts for delete using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

-- RLS Policies for Bookings (Everyone can read, users can insert their own, admins can do all)
drop policy if exists "Everyone can view bookings" on public.bookings;
create policy "Everyone can view bookings" on public.bookings for select using (true);

drop policy if exists "Users can insert own bookings" on public.bookings;
create policy "Users can insert own bookings" on public.bookings for insert with check (
  auth.email() = user_email or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings" on public.bookings for update using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings" on public.bookings for delete using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

-- RLS Policies for App Settings (Everyone can read, admins can modify)
drop policy if exists "Everyone can view settings" on public.app_settings;
create policy "Everyone can view settings" on public.app_settings for select using (true);

drop policy if exists "Admins can update settings" on public.app_settings;
create policy "Admins can update settings" on public.app_settings for update using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can insert settings" on public.app_settings;
create policy "Admins can insert settings" on public.app_settings for insert with check (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

-- Insert starting setup data if it doesn't exist
insert into public.app_settings (id, features, time_slots, pricing, memberships, equipment, bundles, promo_codes, verified_members)
values (
  1,
  '{"dynamicPricing":true,"memberships":true,"equipment":true,"bundles":true,"waitlist":true,"concurrencyLock":true,"promoCodes":true,"slotCapacity":true,"notifications":true,"events":true}',
  '{"open":"06:00","close":"22:00","slotDuration":60,"blocked":[]}',
  '{"peakHours":[{"end":"09:00","start":"07:00","label":"Morning Peak","multiplier":1.3},{"end":"21:00","start":"17:00","label":"Evening Peak","multiplier":1.5}]}',
  '[{"id":"none","name":"No Membership","discount":0,"priority":0},{"id":"Basic","name":"Basic","discount":0.05,"priority":1},{"id":"Premium","name":"Premium","discount":0.15,"priority":2},{"id":"Academy","name":"Academy","discount":0.25,"priority":3}]',
  '[{"id":"racket","name":"Racket","unit":"per session","price":50,"stock":10},{"id":"shuttle","name":"Shuttlecock","unit":"per session","price":30,"stock":20},{"id":"ball","name":"Sports Ball","unit":"per session","price":40,"stock":8},{"id":"shoes","name":"Court Shoes","unit":"per session","price":80,"stock":6},{"id":"knee_pad","name":"Knee Pads","unit":"per session","price":60,"stock":5}]',
  '[{"id":"b1","name":"Starter Pack","items":["racket","shuttle"],"price":70,"discount":10},{"id":"b2","name":"Pro Kit","items":["racket","ball","shoes"],"price":150,"discount":20}]',
  '[{"type":"percent","code":"WELCOME10","active":true,"value":10,"usesLeft":100},{"type":"fixed","code":"FLAT50","active":true,"value":50,"usesLeft":50}]',
  '[]'
) on conflict (id) do nothing;

-- Waitlist Table
create table if not exists public.waitlist (
  id          bigserial primary key,
  court_id    bigint references public.courts(id) on delete cascade not null,
  court_name  text not null,
  player      text not null,
  user_email  text not null,
  date        date not null,
  start_time  text not null,
  end_time    text not null,
  membership  text default 'none',
  priority    integer default 0,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- Policies
drop policy if exists "Everyone can view waitlist" on public.waitlist;
create policy "Everyone can view waitlist" on public.waitlist for select using (true);

drop policy if exists "Users can insert own waitlist" on public.waitlist;
create policy "Users can insert own waitlist" on public.waitlist for insert with check (
  auth.email() = user_email or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can delete from waitlist" on public.waitlist;
create policy "Admins can delete from waitlist" on public.waitlist for delete using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.waitlist;
  exception when others then
    null;
  end;
end $$;

-- Events Table
create table if not exists public.events (
  id          bigserial primary key,
  name        text not null,
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  type        text not null,
  courts      integer[] not null,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table public.events enable row level security;

-- Policies
drop policy if exists "Everyone can view events" on public.events;
create policy "Everyone can view events" on public.events for select using (true);

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events" on public.events for insert with check (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events" on public.events for update using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events" on public.events for delete using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.events;
  exception when others then
    null;
  end;
end $$;

