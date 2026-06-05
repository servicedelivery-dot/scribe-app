-- Run this in your Supabase SQL editor

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('image', 'note')) not null,
  content text,
  storage_path text,
  public_url text,
  order_index integer default 0,
  created_at timestamptz default now()
);

create table if not exists generated_content (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  format text check (format in ('course', 'guide', 'article')) not null,
  title text not null,
  body text not null,
  created_at timestamptz default now()
);

-- RLS
alter table projects enable row level security;
alter table content_items enable row level security;
alter table generated_content enable row level security;

create policy "users manage own projects" on projects for all using (auth.uid() = user_id);
create policy "users manage own content" on content_items for all using (auth.uid() = user_id);
create policy "users manage own generated" on generated_content for all using (auth.uid() = user_id);

-- Storage bucket (run separately or create in dashboard)
insert into storage.buckets (id, name, public) values ('scribe-assets', 'scribe-assets', true)
on conflict do nothing;

create policy "users upload own assets" on storage.objects for insert
  with check (bucket_id = 'scribe-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "public read assets" on storage.objects for select
  using (bucket_id = 'scribe-assets');

create policy "users delete own assets" on storage.objects for delete
  using (bucket_id = 'scribe-assets' and auth.uid()::text = (storage.foldername(name))[1]);
