-- 内容表加语言列（zh / en）。在 Supabase SQL Editor 运行一次。
alter table content_docs add column if not exists lang text not null default 'zh';
alter table content_docs drop constraint if exists content_docs_pkey;
alter table content_docs add primary key (lang, path);
