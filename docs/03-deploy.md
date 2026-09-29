# 部署：Vercel + Supabase（封闭平台）

## 封闭是什么意思
- 没登录只看到登录页。账号邀请制：公开注册关闭，用 `node tools/add-user.mjs 邮箱` 建（密码从剪贴板取）。
- 课程、日志、提示词、五个知识库都存在 Supabase 的 `content_docs` 表，只有登录用户能读；前端代码里**不包含**任何内容（封闭构建 `VITE_CLOSED=1` 会去掉内容打包，已验证）。本地改完内容用 `node tools/sync-content.mjs` 推上云。
- AI 接口（/api/agent/step）验证登录令牌，没登录调不了。
- 每个用户的项目、库存、日志、固件存 `visitor_kv`，只能读写自己的行。
- 贴图（/art/*.png）是静态文件，不在门内；不含知识，只是零件的图。

## 管理后台（用户 + 用量）
- 运行 `docs/06-admin.sql`（profiles、usage_log 两张表，并把 haoz214@gmail.com 设为管理员）。
- Vercel 环境变量加 `SUPABASE_SERVICE_ROLE_KEY`（`bash tools/vercel-env.sh` 已包含；它只给服务端函数用，没有 VITE_ 前缀，不会进前端）。
- 登录后管理员的侧栏会多一项"管理"：用量（今天/7 天/30 天成本、按天/按用户/按模型、最近调用）和用户（建账号、禁用、设管理员）。
- 每次 AI 调用记一行 usage_log：输入/输出/缓存/推理 token、工具调用数、按模型单价算的美元成本（单价表在 platform/shared/spec.mjs 的 PRICING_PER_1M，口径同 datasquare）。

## 一次性配置
1. Supabase SQL Editor 运行 `docs/04-closed-platform.sql`（两张表 + 权限）。
2. Supabase → Authentication → Sign In / Providers → Email：保持开启，**关掉 "Allow new users to sign up"**；Anonymous 不用开。
3. 建第一个账号：把密码复制到剪贴板，然后 `node tools/add-user.mjs 你的邮箱`。
4. 同步内容：`node tools/sync-content.mjs`。以后每次改了 content/ 再跑一次。
5. Vercel 环境变量多一条 `VITE_CLOSED=1`（`bash tools/vercel-env.sh` 已包含）。本地开发不设它，仍是开放模式读本地文件。


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
   - `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`：访客数据云端保存（可选，不填存浏览器）
   - `DASHSCOPE_API_KEY`：不需要（图已经生成好在仓库里）
   一键把这些从本地 .env 复制到剪贴板：`bash tools/vercel-env.sh`，然后在 Vercel 的环境变量页面直接粘贴（它认 .env 格式，会自动拆成多条）。
3. Deploy。打开网址，顶部状态条应显示"网页体验模式"，AI 那盏灯是绿的。
4. 试一句"要有光"。

## 费用与限流
每一步是一次模型调用。`api/agent/step.js` 里有个按 IP 的简单限流（内存计数，够挡住无意刷）。要认真控成本：在 Vercel 的 Firewall 里加速率规则，或者把密钥换成有月度上限的。

## Supabase
已接入：`platform/src/workshop/storage.ts` 配了 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 就走 Supabase（匿名登录，每个访客一个 id），否则退回 localStorage。**需要在 Supabase 后台开启匿名登录**：Authentication → Sign In / Providers → Anonymous sign-ins → 开。没开的话前端会自动退回浏览器存储，控制台有提示。建表：

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

Vercel 上要加 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（构建时打进前端）。

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
