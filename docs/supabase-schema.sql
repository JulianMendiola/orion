-- ============================================================
-- ORION — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Users extend Supabase auth.users
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  display_name text,
  plan        text default 'free',   -- 'free' | 'pro'
  created_at  timestamptz default now()
);

-- Portfolio positions per user
create table public.positions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles on delete cascade not null,
  ticker      text not null,
  name        text,
  type        text not null,          -- 'stock' | 'crypto' | 'etf' | 'bond' | 'forex'
  shares      numeric not null,
  entry_price numeric not null,
  entry_date  date,
  sector      text,
  color       text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Watchlist per user
create table public.watchlist (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references public.profiles on delete cascade not null,
  ticker   text not null,
  added_at timestamptz default now(),
  unique(user_id, ticker)
);

-- Signal history log
create table public.signals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles on delete cascade not null,
  ticker      text not null,
  signal      text not null,          -- 'COMPRAR' | 'MANTENER' | 'PRECAUCIÓN' | 'ESPERAR'
  price       numeric,
  pct_change  numeric,
  analysis    text,
  catalyst    text,
  generated_at timestamptz default now()
);

-- RLS Policies (Row Level Security)
alter table public.profiles  enable row level security;
alter table public.positions enable row level security;
alter table public.watchlist enable row level security;
alter table public.signals   enable row level security;

create policy "Own profile" on public.profiles  for all using (auth.uid() = id);
create policy "Own positions" on public.positions for all using (auth.uid() = user_id);
create policy "Own watchlist" on public.watchlist for all using (auth.uid() = user_id);
create policy "Own signals"   on public.signals   for all using (auth.uid() = user_id);
