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
