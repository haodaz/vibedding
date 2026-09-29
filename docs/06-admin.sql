-- 管理后台：用户档案（角色/禁用）+ 用量日志。在 Supabase SQL Editor 整段运行一次。
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',        -- user / admin
  display_name text,
  disabled boolean not null default false,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select to authenticated using (user_id = auth.uid());

create table if not exists usage_log (
  id bigserial primary key,
  user_id uuid,
  email text,
  ts timestamptz default now(),
  mode text,                                -- static / local
  lang text,
  model text,
  input_tokens int default 0,
  output_tokens int default 0,
  cached_tokens int default 0,
  reasoning_tokens int default 0,
  tool_calls int default 0,
  cost_usd numeric(12,6) default 0
);
create index if not exists usage_log_ts on usage_log (ts desc);
create index if not exists usage_log_user on usage_log (user_id, ts desc);
alter table usage_log enable row level security;
drop policy if exists "own usage" on usage_log;
create policy "own usage" on usage_log for select to authenticated using (user_id = auth.uid());
-- 写入只有 service role（Vercel 函数）能做

-- 第一个管理员
insert into profiles (user_id, email, role)
select id, email, 'admin' from auth.users where email = 'haoz214@gmail.com'
on conflict (user_id) do update set role = 'admin', email = excluded.email;

-- 名片：头像图案、一句话介绍；用户可改自己的
alter table profiles add column if not exists avatar text default 'bolt';
alter table profiles add column if not exists bio text default '';
drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- 新用户登录时自动建档案（没有档案就插一条）
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into public.profiles (user_id, email) values (new.id, new.email) on conflict (user_id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
insert into profiles (user_id, email) select id, email from auth.users on conflict (user_id) do nothing;
