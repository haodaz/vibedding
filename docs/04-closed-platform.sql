-- 封闭平台：内容表 + 用户数据表。在 Supabase SQL Editor 里整段运行一次。
-- 1) 内容（课程/日志/提示词/硬件/知识库），只有登录用户能读，只有 service role 能写（同步脚本用）
create table if not exists content_docs (
  path text primary key,            -- 如 curriculum/01-blink/01-hello-led.md 或 knowledge/projects.json
  kind text not null,               -- curriculum / journal / prompts / hardware / knowledge / boards / art / projects
  body text not null,               -- markdown 原文或 JSON 字符串
  updated_at timestamptz default now()
);
alter table content_docs enable row level security;
drop policy if exists "authenticated read" on content_docs;
create policy "authenticated read" on content_docs for select to authenticated using (true);

-- 2) 用户数据（项目/库存/日志/固件/对话），每人只能读写自己的
create table if not exists visitor_kv (
  visitor_id uuid not null default auth.uid(),
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now(),
  primary key (visitor_id, key)
);
alter table visitor_kv enable row level security;
drop policy if exists "own rows" on visitor_kv;
create policy "own rows" on visitor_kv for all to authenticated using (visitor_id = auth.uid()) with check (visitor_id = auth.uid());
