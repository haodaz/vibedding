#!/usr/bin/env bash
# 把 Vercel 需要的环境变量从 platform/.env 取出来复制到剪贴板（不在屏幕上显示密钥）。
# 用法： bash tools/vercel-env.sh   然后去 Vercel → Settings → Environment Variables，粘贴到 Key 输入框，它会自动拆成多条。
cd "$(dirname "$0")/.." || exit 1
{
  grep -E '^(OPENAI_API_KEY|VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)=' platform/.env
  grep -q '^AGENT_MODEL=' platform/.env && grep '^AGENT_MODEL=' platform/.env || echo 'AGENT_MODEL=gpt-5.6-luna'
  echo 'RATE_PER_MIN=12'
} | pbcopy
n=$(pbpaste | wc -l | tr -d ' ')
echo "已复制 $n 条到剪贴板：$(pbpaste | cut -d= -f1 | tr '\n' ' ')"
