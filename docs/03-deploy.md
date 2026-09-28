# 部署：Vercel + Supabase

## 形态
| 模式 | 谁 | 有什么 |
|---|---|---|
| 网页体验（Vercel） | 任何人打开网址 | 课程、实验台、知识库、虚拟板子、"直接做"（出方案、采购清单、写代码、虚拟跑）。数据存访客浏览器（将来 Supabase） |
| 本地动手（克隆仓库） | 买了板子的人 | 以上全部 + 真编译、烧录、串口 |

前端一套代码。运行时问 `/api/status`：本地服务答 `mode: local`，Vercel 函数答 `mode: static`，都没有就是 `direct`（访客自己填密钥，浏览器直连模型）。

## Vercel 一步步
1. 在 Vercel 新建项目，导入 `haodaz/vibedding`。**Root Directory 留空（仓库根）**，Framework 选 Other。`vercel.json` 已写好构建命令和输出目录（platform/dist）；`api/` 里的两个函数会自动成为 `/api/status` 和 `/api/agent/step`。
2. 环境变量（Settings → Environment Variables）：
   - `OPENAI_API_KEY`：必填，AI 用
   - `AGENT_MODEL`：可选，默认 `gpt-5.6-luna`
   - `RATE_PER_MIN`：可选，每个 IP 每分钟最多几步，默认 12
   - `DASHSCOPE_API_KEY`：不需要（图已经生成好在仓库里）
3. Deploy。打开网址，顶部状态条应显示"网页体验模式"，AI 那盏灯是绿的。
4. 试一句"要有光"。

## 费用与限流
每一步是一次模型调用。`api/agent/step.js` 里有个按 IP 的简单限流（内存计数，够挡住无意刷）。要认真控成本：在 Vercel 的 Firewall 里加速率规则，或者把密钥换成有月度上限的。

## Supabase（明天）
现在访客数据在 `platform/src/workshop/storage.ts`，一个 get/set 的小接口，后面是 localStorage。换成 Supabase 只改这一个文件：

```sql
-- 一张表就够：按匿名 id 分区的 KV
create table visitor_kv (
  visitor_id text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now(),
  primary key (visitor_id, key)
);
alter table visitor_kv enable row level security;
-- 匿名访客只能读写自己的行（visitor_id 由前端生成并存在 localStorage，或用 supabase 匿名登录）
create policy "own rows" on visitor_kv for all using (visitor_id = current_setting('request.jwt.claims', true)::json->>'sub');
```

存的 key：`projects`、`inventory`、`journal`、`firmware`、`parts_added`、`troubleshooting_added`、`ws:session`（对话）。

前端要加的环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。用 `@supabase/supabase-js` 的匿名登录拿 `sub` 当 visitor_id。

## 本地模式不变
```bash
git clone git@github.com:haodaz/vibedding.git && cd vibedding/platform && npm install && npm run dev
```
`platform/.env` 里放 `OPENAI_API_KEY`（和 Vercel 上同一个即可）。

## 目录对照
| 路径 | 作用 |
|---|---|
| `platform/shared/spec.mjs` | 系统提示、工具 schema、OpenAI 翻译。本地服务、Vercel 函数、浏览器三处共用 |
| `platform/server/` | 本地服务：真工具（pio、文件）+ agent 一步 |
| `api/` | Vercel 函数：agent 一步（体验模式工具集）+ 状态 |
| `platform/src/workshop/local-tools.ts` | 体验模式下服务端工具的浏览器实现（localStorage + 打包的 JSON） |
| `platform/src/workshop/knowledge.ts` | 五个知识库的检索，任何模式都在浏览器里 |
