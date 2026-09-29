// 把 content/ 下的全部内容同步到 Supabase 的 content_docs 表（封闭平台的内容源）。
// 需要 platform/.env 里的 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY（service role 才有写权限）。
// 用法：node tools/sync-content.mjs          全量 upsert
//       node tools/sync-content.mjs --prune  同时删掉云端有、本地没有的
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(here, '..')
const { createClient } = createRequire(path.join(ROOT, 'platform', 'package.json'))('@supabase/supabase-js')

const env = Object.fromEntries((await fs.readFile(path.join(ROOT, 'platform', '.env'), 'utf8')).split('\n').map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) { console.error('缺 VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function walk(dir, base = '') {
  const out = []
  for (const d of await fs.readdir(dir, { withFileTypes: true })) {
    const rel = path.posix.join(base, d.name)
    if (d.isDirectory()) out.push(...(await walk(path.join(dir, d.name), rel)))
    else if (/\.(md|json)$/.test(d.name) && !d.name.startsWith('_')) out.push(rel)
  }
  return out
}
const rows = []
const files = []
for (const [dir, lang] of [['content', 'zh'], ['content-en', 'en']]) {
  const list = await walk(path.join(ROOT, dir)).catch(() => [])
  for (const rel of list) {
    const kind = rel.startsWith('hardware/boards/') ? 'boards' : rel.split('/')[0]
    rows.push({ lang, path: rel, kind, body: await fs.readFile(path.join(ROOT, dir, rel), 'utf8'), updated_at: new Date().toISOString() })
    files.push(lang + ':' + rel)
  }
}
for (let i = 0; i < rows.length; i += 50) {
  const { error } = await sb.from('content_docs').upsert(rows.slice(i, i + 50))
  if (error) { console.error('写入失败：', error.message); process.exit(1) }
}
console.log(`已同步 ${rows.length} 个文件（zh ${rows.filter((r) => r.lang === 'zh').length} / en ${rows.filter((r) => r.lang === 'en').length}）（${(rows.reduce((n, r) => n + r.body.length, 0) / 1024).toFixed(0)} KB）`)
if (process.argv.includes('--prune')) {
  const { data } = await sb.from('content_docs').select('path,lang')
  const stale = (data ?? []).filter((r) => !files.includes(r.lang + ':' + r.path))
  for (const r of stale) await sb.from('content_docs').delete().eq('lang', r.lang).eq('path', r.path)
  if (stale.length) console.log('删掉云端多余的', stale.length, '个')
}
