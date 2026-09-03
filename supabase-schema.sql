-- =========================================================
-- MTN MoMo Prize-Linked Savings (PLS) - Supabase SQL Schema
-- Run this script inside your Supabase Project -> SQL Editor
-- =========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS / PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  name text default 'MoMo User',
  wallet_balance numeric(12,2) default 2450.00 check (wallet_balance >= 0),
  referral_code text unique not null,
  created_at timestamptz default now()
);

-- 2. SAVINGS GOALS (Personal)
create table if not exists public.savings_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount >= 1000),
  current_balance numeric(12,2) default 0.00 check (current_balance >= 0),
  duration_months int not null check (duration_months in (3, 6, 12, 18, 24, 36)),
  monthly_contribution numeric(12,2) default 0.00,
  tier text check (tier in ('bronze', 'silver', 'gold', 'none')),
  start_date timestamptz default now(),
  end_date timestamptz not null,
  is_completed boolean default false,
  is_withdrawn_early boolean default false,
  accrued_interest numeric(12,2) default 0.00,
  created_at timestamptz default now()
);

-- 3. GROUPS / STOKVEL TABLE
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.profiles(id) on delete set null,
  name text not null,
  reason text not null,
  code text unique not null,
  target_pool numeric(12,2) not null check (target_pool >= 1000),
  pooled_balance numeric(12,2) default 0.00 check (pooled_balance >= 0),
  duration_months int not null check (duration_months in (3, 6, 12, 18, 24, 36)),
  tier text check (tier in ('bronze', 'silver', 'gold', 'none')),
  start_date timestamptz default now(),
  end_date timestamptz not null,
  is_completed boolean default false,
  is_withdrawn_early boolean default false,
  created_at timestamptz default now()
);

-- 4. GROUP MEMBERS TABLE
create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contribution numeric(12,2) default 0.00 check (contribution >= 0),
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

-- 5. TICKETS / SCRATCH CARDS TABLE
create table if not exists public.tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  source text not null check (source in ('personal_savings', 'group_savings', 'referral')),
  source_id text,
  tier text not null check (tier in ('bronze', 'silver', 'gold', 'flat')),
  group_meta jsonb,
  is_scratched boolean default false,
  reward jsonb,
  scratched_at timestamptz,
  created_at timestamptz default now()
);

-- 6. REFERRALS TABLE
create table if not exists public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referred_user_id uuid references public.profiles(id) on delete cascade not null,
  referral_code text not null,
  status text default 'pending' check (status in ('pending', 'active', 'verified')),
  deposit_qualified boolean default false,
  activated_at timestamptz,
  ticket_issued boolean default false,
  created_at timestamptz default now(),
  unique (referred_user_id)
);

-- 7. TRANSACTIONS / AUDIT LEDGER
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('credit', 'debit', 'interest', 'prize', 'referral')),
  amount numeric(12,2) not null,
  description text not null,
  goal_id uuid,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.savings_goals enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.tickets enable row level security;
alter table public.referrals enable row level security;
alter table public.transactions enable row level security;

-- Basic Policies for Authenticated Users (Read & Write their own records)
create policy "Users can view and edit own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users can access own savings goals" on public.savings_goals
  for all using (auth.uid() = user_id);

create policy "Users can view groups they belong to or public groups" on public.groups
  for select using (true);

create policy "Users can create groups" on public.groups
  for insert with check (auth.uid() = creator_id);

create policy "Group members can access membership info" on public.group_members
  for all using (auth.uid() = user_id);

create policy "Users can access own tickets" on public.tickets
  for all using (auth.uid() = user_id);

create policy "Users can view their referrals" on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

create policy "Users can view their transactions" on public.transactions
  for select using (auth.uid() = user_id);
