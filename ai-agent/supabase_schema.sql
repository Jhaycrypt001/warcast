-- WARCAST Supabase Schema
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor → New query)

create table if not exists dispatches (
  id               bigserial primary key,
  dispatch_id      int unique not null,
  nft_token_id     int,
  tx_hash          text,
  fixture_id       int,
  home_team        text,
  away_team        text,
  minute           int,
  dispatch_text    text,
  confidence_tier  text check (confidence_tier in ('ALPHA','BRAVO','CHARLIE')),
  confidence_pct   int,
  prediction       text,
  x_post_url       text,
  status           text default 'PENDING' check (status in ('PENDING','CONFIRMED','BURNED')),
  created_at       timestamptz default now()
);

create table if not exists agents (
  wallet           text primary key,
  nation           text,
  rank             text default 'Recruit Scout',
  points           int default 0,
  joined_at        timestamptz default now()
);

create table if not exists nations (
  id               text primary key,
  name             text,
  member_count     int default 0,
  accuracy_score   int default 0
);

-- Enable Row Level Security (read-only public access)
alter table dispatches enable row level security;
alter table agents enable row level security;
alter table nations enable row level security;

create policy "Public read dispatches"
  on dispatches for select using (true);

create policy "Public read agents"
  on agents for select using (true);

create policy "Public read nations"
  on nations for select using (true);
