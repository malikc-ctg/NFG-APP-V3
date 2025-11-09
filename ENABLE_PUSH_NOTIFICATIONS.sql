-- ============================================
-- Enable Push Notifications for NFG App
-- ============================================
-- 1. Creates push_subscriptions table
-- 2. Adds RLS policies so users can manage their own subscriptions
-- Run this in Supabase SQL editor before deploying the edge functions
-- ============================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "Users manage own subscriptions" on push_subscriptions;
create policy "Users manage own subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table push_subscriptions is 'Stores browser push subscriptions for each authenticated user.';

