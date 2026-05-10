-- Migration: PRD history persistence (replace localStorage-only storage)
-- Run this once in Supabase Dashboard → SQL Editor.

create table if not exists projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  mode text not null default 'Pro',
  language text not null default 'zh-TW',
  is_unlocked boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_projects_user_created on projects(user_id, created_at desc);

alter table projects enable row level security;

drop policy if exists "Users can view own projects" on projects;
create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own projects" on projects;
create policy "Users can insert own projects"
  on projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on projects;
create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on projects;
create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);
